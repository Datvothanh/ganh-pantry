import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import { getDict } from "@/content/dict";
import {
  categories,
  products,
  type CategoryId,
  type Locale,
  type Motif,
  type Product,
} from "@/content/products";
import { MotifSvg } from "@/components/motifs";
import type { OtherCard } from "@/components/product/OtherProducts";
import { buyCopy } from "@/components/product/buy";
import { TextReveal } from "@/components/reveal";
import { getLiveProduct } from "@/lib/commerce/live";
import { quickAddTarget } from "@/lib/commerce/variants";
import { href } from "@/lib/i18n";
import styles from "./Pantry.module.css";
import { HeroGrow } from "./HeroGrow";
import { PantryGrid } from "./PantryGrid";
import { PantryNav } from "./PantryNav";
import { Reveal } from "./Reveal";
import { pantryStrings, type PantryStrings } from "./strings";

const composite = (handle: string) => `/products/${handle}.webp`;

/** Public URL of `public/photos/<name>.webp`, or null when the photo is missing. */
function photo(name: string): string | null {
  const file = path.join(process.cwd(), "public", "photos", `${name}.webp`);
  return existsSync(file) ? `/photos/${name}.webp` : null;
}

/** Decorative motif scattered on a composite tile. */
interface Scatter {
  motif: Motif;
  x: number;
  y: number;
  s: number;
  r: number;
  color: string;
}

function Jar({
  product,
  className,
  style,
  eager,
}: {
  product: Product;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static composite, sized by CSS
    <img
      src={composite(product.handle)}
      alt=""
      width={1260}
      height={2026}
      className={`${styles.compJar} ${className ?? ""}`}
      style={style}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}

function Scattered({ items }: { items: Scatter[] }) {
  return (
    <>
      {items.map((m, i) => (
        <span
          key={i}
          className={styles.scatter}
          aria-hidden="true"
          style={
            {
              "--x": `${m.x}%`,
              "--y": `${m.y}%`,
              "--s": m.s,
              "--r": `${m.r}deg`,
              color: m.color,
            } as CSSProperties
          }
        >
          <MotifSvg motif={m.motif} />
        </span>
      ))}
    </>
  );
}

/** Rounded tile with the category's jars standing on it (used when no photo exists). */
function CategoryComposite({ list, alt }: { list: Product[]; alt: string }) {
  const lead = list[0];
  const scatter: Scatter[] = list.flatMap((p, i) => [
    { motif: p.motif, x: 12 + i * 34, y: 22 + (i % 2) * 8, s: 1, r: -20 + i * 30, color: p.colors.accent },
    { motif: p.motif, x: 88 - i * 30, y: 70 - (i % 2) * 12, s: 0.8, r: 30 - i * 25, color: p.colors.label },
  ]);
  return (
    <div
      className={styles.compTile}
      role="img"
      aria-label={alt}
      style={{ "--tile": lead.colors.card } as CSSProperties}
    >
      <Scattered items={scatter} />
      <div className={styles.compJars} data-count={list.length}>
        {list.map((p) => (
          <Jar key={p.handle} product={p} />
        ))}
      </div>
    </div>
  );
}

function Media({ src, alt, ratio }: { src: string; alt: string; ratio?: string }) {
  return (
    <figure className={styles.cover} style={ratio ? { aspectRatio: ratio } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- optional local photo */}
      <img src={src} alt={alt} className={styles.coverImg} loading="lazy" />
    </figure>
  );
}

function Weights({ list, t, center }: { list: Product[]; t: PantryStrings; center?: boolean }) {
  const weights = [...new Set(list.flatMap((p) => p.variants.map((v) => v.weight)))];
  return (
    <div
      className={`${styles.weightsBlock}${center ? ` ${styles.weightsCenter}` : ""}`}
      data-pantry-weights=""
    >
      <TextReveal className={styles.weightsLabel} text={t.weights} />
      <ul className={styles.weights}>
        {weights.map((w) => (
          <li key={w} className={styles.weight}>
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function PantryPage({ locale }: { locale: Locale }) {
  const t = pantryStrings[locale];
  const dict = getDict(locale);
  // Quick-add takes the first weight that can be bought (cached commerce reads).
  const live = await Promise.all(products.map((p) => getLiveProduct(p.handle)));
  const quickTarget = new Map(products.map((p, i) => [p.handle, quickAddTarget(p, live[i])]));

  const byCategory = (id: CategoryId) => products.filter((p) => p.category === id);
  const cardsFor = (list: Product[]): OtherCard[] =>
    list.map((p) => {
      const target = quickTarget.get(p.handle);
      return {
        handle: p.handle,
        href: href(locale, `/products/${p.handle}`),
        name: p.nameVi,
        sub: locale === "en" ? p.nameEn : p.subtitle.vi,
        image: composite(p.handle),
        card: p.colors.card,
        accent: p.colors.accent,
        motif: p.motif,
        quickAdd: target ? { ...target, label: buyCopy[locale].quickAdd(p.nameVi) } : undefined,
      };
    });

  const heroPhoto = photo("pantry-hero");
  const outroPhoto = photo("pantry-outro");
  const heroScatter: Scatter[] = products.map((p, i) => ({
    motif: p.motif,
    x: 6 + i * 12.5,
    y: i % 2 ? 30 : 58,
    s: 0.9 + (i % 3) * 0.25,
    r: (i % 2 ? 1 : -1) * (14 + i * 7),
    color: i % 2 ? "var(--c-red)" : "var(--c-flame)",
  }));

  return (
    <main className={styles.page} data-pantry="">
      <header className={styles.hero}>
        <TextReveal
          as="h1"
          mode="chars"
          trigger="load"
          className={styles.heroTitle}
          text={t.title}
        />
        <HeroGrow>
          {heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- optional local photo
            <img
              src={heroPhoto}
              alt={t.heroAlt}
              className={styles.heroImg}
              loading="eager"
              fetchPriority="high"
            />
          ) : (
            <div className={styles.heroComp} role="img" aria-label={t.heroAlt}>
              <Scattered items={heroScatter} />
              <div className={styles.heroJars}>
                {products.map((p, i) => (
                  <Jar
                    key={p.handle}
                    product={p}
                    eager
                    style={{ "--i": i } as CSSProperties}
                  />
                ))}
              </div>
            </div>
          )}
          <p className={styles.heroLine} data-pantry-hero-line="">
            <span>{t.heroLine[0]}</span> <span>{t.heroLine[1]}</span>
          </p>
        </HeroGrow>
      </header>

      <section className={styles.intro}>
        <span className={styles.rhombus} aria-hidden="true" />
        <TextReveal className={styles.introText} text={t.intro} />
        <span className={styles.rhombus} aria-hidden="true" />
      </section>

      {categories.map((c, index) => {
        const list = byCategory(c.id);
        const name = c.name[locale];
        // Feature panel: the lead jar's lifestyle photo.
        const lead = list[0]?.handle;
        const sectionPhoto = lead ? photo(`${lead}/00-${lead}-jar-1`) : null;

        if (c.id === "sauces") {
          const [big, ...rest] = list;
          return (
            <section
              key={c.id}
              id={c.id}
              className={`${styles.section} ${styles.dark}`}
              data-pantry-section=""
              data-dark=""
              data-header-dark=""
              aria-labelledby={`${c.id}-title`}
            >
              <div className={styles.darkStage}>
                <TextReveal
                  as="h2"
                  mode="chars"
                  id={`${c.id}-title`}
                  className={styles.darkTitle}
                  style={{ "--chars": [...name].length } as CSSProperties}
                  text={name}
                />
                <Scattered
                  items={list.flatMap((p, i) => [
                    { motif: p.motif, x: i ? 80 : 18, y: 52, s: 2.2, r: i ? 18 : -22, color: p.colors.accent },
                    { motif: p.motif, x: i ? 92 : 8, y: 84, s: 1.3, r: i ? -30 : 34, color: p.colors.label },
                  ])}
                />
                <div className={styles.darkJars} role="img" aria-label={t.categoryAlt(name)}>
                  {rest.map((p) => (
                    <Jar key={p.handle} product={p} className={styles.darkSide} />
                  ))}
                  <Jar product={big} className={styles.darkBig} />
                </div>
              </div>
              <div className={styles.darkDetails}>
                <TextReveal className={styles.text} text={c.intro[locale]} />
                <Weights list={list} t={t} center />
              </div>
              <PantryGrid cards={cardsFor(list)} discover={dict.cursor.discover} locale={locale} />
            </section>
          );
        }

        const asideFirst = index === 2;
        return (
          <section
            key={c.id}
            id={c.id}
            className={styles.section}
            data-pantry-section=""
            aria-labelledby={`${c.id}-title`}
          >
            <TextReveal
              as="h2"
              mode="chars"
              id={`${c.id}-title`}
              className={styles.title}
              text={name}
            />
            <div className={`${styles.body} ${asideFirst ? styles.asideFirst : ""}`}>
              <div className={styles.media} data-pantry-feature="">
                {sectionPhoto ? (
                  <Media src={sectionPhoto} alt={t.categoryAlt(name)} ratio="875 / 631" />
                ) : (
                  <CategoryComposite list={list} alt={t.categoryAlt(name)} />
                )}
              </div>
              <div className={styles.aside}>
                <TextReveal className={styles.text} text={c.intro[locale]} />
                <Weights list={list} t={t} />
              </div>
            </div>
            <PantryGrid cards={cardsFor(list)} discover={dict.cursor.discover} locale={locale} />
          </section>
        );
      })}

      <section className={styles.specs} aria-labelledby="pantry-specs" data-pantry-end="">
        <TextReveal
          as="h2"
          mode="chars"
          id="pantry-specs"
          className={styles.title}
          text={t.tableTitle}
        />
        <TextReveal className={styles.specsText} text={t.tableIntro} />
        <table className={styles.table}>
          <thead>
            <tr className={styles.headRow}>
              <th scope="col">{t.product}</th>
              <th scope="col">{t.shelfLife}</th>
              <th scope="col" className={styles.right}>
                {t.weight}
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.handle} className={styles.row} data-spec-row="">
                <td>
                  <span lang="vi" className={styles.specName}>
                    {p.nameVi}
                  </span>{" "}
                  <span className={styles.specSub}>
                    {locale === "en" ? p.nameEn : p.subtitle.vi}
                  </span>
                </td>
                <td className={styles.nowrap} data-spec-shelf="">
                  {t.months(p.shelfLife)}
                </td>
                <td className={styles.right}>
                  {p.variants.map((v, i) => (
                    <span key={v.id} className={styles.specWeight}>
                      {i ? <span className={styles.specSep}> · </span> : null}
                      {v.weight}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Reveal className={styles.outro} data-pantry-outro="">
        {outroPhoto ? (
          <div className={styles.outroCover}>
            {/* eslint-disable-next-line @next/next/no-img-element -- optional local photo */}
            <img src={outroPhoto} alt={t.outroAlt} className={styles.outroImg} loading="lazy" />
          </div>
        ) : (
          <div className={styles.outroCover} role="img" aria-label={t.outroAlt}>
            <div className={styles.outroImg}>
              <Scattered
                items={products.map((p, i) => ({
                  motif: p.motif,
                  x: 8 + i * 12,
                  y: i % 2 ? 22 : 40,
                  s: 1.6,
                  r: (i % 2 ? 1 : -1) * 20,
                  color: i % 2 ? "var(--c-gold)" : "var(--c-flame)",
                }))}
              />
              <div className={styles.outroJars}>
                {["mut-quat", "tuong-ot-toi", "mat-ong-ca-phe"].map((h) => (
                  <Jar key={h} product={products.find((p) => p.handle === h)!} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Reveal>

      <PantryNav
        label={t.nav}
        items={categories.map((c) => ({ id: c.id, label: c.name[locale] }))}
      />
    </main>
  );
}
