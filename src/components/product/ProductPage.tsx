import {
  categories,
  products,
  type Locale,
  type Product,
} from "@/content/products";
import { getDict } from "@/content/dict";
import { href } from "@/lib/i18n";
import { commerce, formatMoney } from "@/lib/commerce";
import { money } from "@/lib/commerce/format";
import { productPhotos } from "@/lib/photos";
import {
  BuyBlock,
  BuyProvider,
  StickyBuyBar,
  WeightPills,
  buyCopy,
  type BuyVariant,
} from "./buy";
import { OtherProducts, type OtherCard } from "./OtherProducts";
import { PhotoRow, type PhotoSlide } from "./PhotoRow";
import { ProductHero } from "./ProductHero";
import styles from "./ProductPage.module.css";
import { RevealText } from "./RevealText";
import { pdpStrings } from "./strings";

const composite = (handle: string) => `/products/${handle}.webp`;

/** Other products: same category first, then the rest in catalogue order. */
function others(product: Product): Product[] {
  const rest = products.filter((p) => p.handle !== product.handle);
  return [
    ...rest.filter((p) => p.category === product.category),
    ...rest.filter((p) => p.category !== product.category),
  ];
}

export async function ProductPage({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const t = pdpStrings[locale];
  const category = categories.find((c) => c.id === product.category)!;
  const name = locale === "en" ? product.nameEn : product.subtitle.vi;

  const live = await commerce.getProduct(product.handle).catch(() => null);
  const buyVariants: BuyVariant[] = product.variants.map((v) => {
    const found = live?.variants.find((x) => x.id === v.id);
    return {
      id: v.id,
      weight: v.weight,
      price: formatMoney(found?.price ?? money(v.price), locale),
      available: found?.availableForSale ?? true,
    };
  });
  const quickAdd = buyCopy[locale].quickAdd;

  const photos = productPhotos(product.handle);
  const slides: PhotoSlide[] = photos.length
    ? photos.map((src, i) => ({ src, alt: t.photoAlt(product.nameVi, i + 1) }))
    : [
        product.colors.accent,
        product.colors.card,
        product.colors.accent,
        product.colors.card,
      ].map((tile, i) => ({
        src: composite(product.handle),
        alt: t.photoAlt(product.nameVi, i + 1),
        tile,
      }));

  const cards: OtherCard[] = others(product).map((p) => ({
    handle: p.handle,
    href: href(locale, `/products/${p.handle}`),
    name: p.nameVi,
    sub: locale === "en" ? p.nameEn : p.subtitle.vi,
    image: composite(p.handle),
    card: p.colors.card,
    accent: p.colors.accent,
    motif: p.motif,
    quickAdd: { variantId: p.variants[0].id, label: quickAdd(p.nameVi) },
  }));

  return (
    <main className={styles.page} data-product={product.handle}>
      <ProductHero
        key={product.handle}
        handle={product.handle}
        title={product.nameVi}
        category={category.name[locale]}
        categoryHref={href(locale, `/pantry#${category.id}`)}
        madeIn={t.madeIn}
        jar={product.jar}
        label={product.label}
        jarAlt={t.jarAlt(`${product.nameVi} — ${name}`)}
      />

      <section className={styles.intro} key={`intro-${product.handle}`}>
        <span className={styles.rhombus} aria-hidden="true" />
        <RevealText
          className={styles.description}
          text={product.description[locale]}
        />
        <div className={styles.after}>
          <RevealText
            lead={`${t.ingredients}:`}
            text={product.ingredients[locale]}
          />
          <RevealText
            lead={`${t.storage}:`}
            text={product.storage[locale]}
            className={styles.small}
          />
        </div>
        <span className={styles.rhombus} aria-hidden="true" />
      </section>

      <BuyProvider
        key={`buy-${product.handle}`}
        handle={product.handle}
        name={product.nameVi}
        variants={buyVariants}
      >
        <section className={styles.meta} aria-label={name}>
          <div className={styles.metaInner}>
            <div className={styles.col}>
              <p className={styles.label}>{t.pairing}</p>
              <p className={styles.value}>{product.pairing[locale]}</p>
            </div>
            <div className={`${styles.col} ${styles.colTight}`}>
              <p className={styles.label}>{t.weights}</p>
              <WeightPills />
            </div>
            <div className={styles.col}>
              <p className={styles.label}>{t.shelfLife}</p>
              <p className={styles.value}>{t.months(product.shelfLife)}</p>
            </div>
          </div>
        </section>
        <BuyBlock />
        <StickyBuyBar />
      </BuyProvider>

      <PhotoRow
        key={`photos-${product.handle}`}
        slides={slides}
        label={t.photoGallery}
        hint={t.photoHint}
        drag={t.drag}
      />

      <OtherProducts
        key={`others-${product.handle}`}
        title={t.otherTitle}
        cards={cards}
        discover={getDict(locale).cursor.discover}
      />
    </main>
  );
}
