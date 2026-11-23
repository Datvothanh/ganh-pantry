/**
 * One shared offscreen WebGL renderer that draws a jar label wrapped on a cylinder.
 * Every jar on screen owns only a 2D canvas: render the label at a rotation offset,
 * then `blit` the result into that canvas. `three` is loaded on first use.
 */
import type * as THREE_NS from "three";
import { FRONT_OFFSET, JAR_IMAGE, LABEL_GEOMETRY, LABEL_LIGHT } from "./geometry";

type Three = typeof THREE_NS;

export interface LabelMaterial {
  /** Resolves once the label texture is loaded (rejects on load error). */
  ready: Promise<void>;
  /** Label rotation as a fraction of a turn; `FRONT_OFFSET` shows the front. */
  setOffset: (offset: number) => void;
  dispose: () => void;
  /** @internal */
  readonly material: THREE_NS.Material;
}

export interface JarLabelRenderer {
  createMaterial: (url: string) => LabelMaterial;
  /** Draw `material` at `offset` (fraction of a turn) into the shared drawing buffer. */
  render: (material: LabelMaterial, offset?: number) => void;
  /** Copy the last render into a 2D canvas, stretched to its size. */
  blit: (ctx: CanvasRenderingContext2D) => void;
  /** Size of the drawing buffer in device pixels (jar-image aspect expected). */
  resize: (width: number, height: number) => void;
  readonly width: number;
  readonly height: number;
}

let shared: Promise<JarLabelRenderer> | null = null;

/** The shared renderer, created on first call. Rejects when WebGL is unavailable. */
export function getJarLabelRenderer(): Promise<JarLabelRenderer> {
  if (!shared) {
    shared = import("three").then(create);
    shared.catch(() => {
      shared = null;
    });
  }
  return shared;
}

function create(T: Three): JarLabelRenderer {
  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2") && !probe.getContext("webgl")) throw new Error("WebGL unavailable");

  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new T.TextureLoader();

  const aspect = JAR_IMAGE.width / JAR_IMAGE.height;
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-aspect / 2, aspect / 2, 0.5, -0.5, 0.01, 10);
  camera.position.z = 5;

  scene.add(new T.AmbientLight(0xffffff, LABEL_LIGHT.ambient));
  const spot = new T.SpotLight(0xffffff, LABEL_LIGHT.spot);
  spot.distance = 6;
  spot.angle = Math.PI / 4;
  spot.penumbra = 0.7;
  spot.decay = 1.2;
  spot.position.set(LABEL_LIGHT.spotX, 0.5, 0.6);
  scene.add(spot, spot.target);
  spot.target.updateMatrixWorld();

  const g = LABEL_GEOMETRY;
  const h = g.bottom - g.top;
  const radius = (g.width * aspect) / 2;
  const profile: THREE_NS.Vector2[] = [];
  for (let i = 0; i <= g.heightSegments; i++) profile.push(new T.Vector2(radius, (i / g.heightSegments - 0.5) * h));
  const mesh = new T.Mesh(new T.LatheGeometry(profile, g.radialSegments));
  mesh.position.x = (g.centerX - 0.5) * aspect;
  mesh.position.y = 0.5 - (g.top + g.bottom) / 2;
  mesh.rotation.x = (g.tilt * Math.PI) / 180;
  scene.add(mesh);

  let width = 0;
  let height = 0;

  const createMaterial = (url: string): LabelMaterial => {
    const gap = { value: g.gap };
    const offset = { value: FRONT_OFFSET };
    let texture!: THREE_NS.Texture;
    const ready = new Promise<void>((resolve, reject) => {
      texture = loader.load(url, () => resolve(), undefined, reject);
    });
    ready.catch(() => {});
    texture.wrapS = T.RepeatWrapping;
    texture.wrapT = T.ClampToEdgeWrapping;
    texture.colorSpace = T.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.magFilter = T.LinearFilter;
    texture.anisotropy = maxAniso;

    const material = new T.MeshStandardMaterial({
      map: texture,
      side: T.FrontSide,
      roughness: LABEL_LIGHT.roughness,
      metalness: 0,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uGap = gap;
      shader.uniforms.uOffset = offset;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uGap;\nuniform float uOffset;")
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
  float labelU = fract(vMapUv.x + uOffset);
  if (labelU >= 1.0 - uGap) discard;
  vec4 sampledDiffuseColor = texture2D(map, vec2(labelU / max(1.0 - uGap, 0.001), vMapUv.y));
  diffuseColor *= sampledDiffuseColor;
#endif`,
        );
    };
    return {
      ready,
      material,
      setOffset: (v) => {
        offset.value = v;
      },
      dispose: () => {
        material.dispose();
        texture.dispose();
      },
    };
  };

  const api: JarLabelRenderer = {
    createMaterial,
    render: (m, off) => {
      if (off !== undefined) m.setOffset(off);
      mesh.material = m.material;
      renderer.render(scene, camera);
    },
    blit: (ctx) => {
      const c = ctx.canvas;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(renderer.domElement, 0, 0, c.width, c.height);
    },
    resize: (w, hgt) => {
      w = Math.max(1, Math.round(w));
      hgt = Math.max(1, Math.round(hgt));
      if (w === width && hgt === height) return;
      width = w;
      height = hgt;
      renderer.setSize(w, hgt, false);
    },
    get width() {
      return width;
    },
    get height() {
      return height;
    },
  };
  return api;
}
