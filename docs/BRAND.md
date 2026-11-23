# GÁNH — Vietnamese Pantry (concept brand)

Fictional brand for a portfolio piece. Not a real company. Every page footer carries the credit line in `src/content/site.ts`.

## Idea
A *gánh* is the shoulder pole Vietnamese street vendors use to carry two baskets of goods. The brand sells small-batch preserves, sauces, pickles and honey "carried by hand from Vietnamese kitchens". The jars are the hero, like the reference site: each label has a flat colour field, cut-paper fruit shapes and a tall display serif.

## Logo
- Mark: a vendor in a conical hat (nón lá) carrying a shoulder pole with two baskets, drawn as a single-colour flat vector, readable at 24 px.
- Wordmark: `GÁNH` in the display face, small italic `Vietnamese Pantry` under it.
- Files: `public/brand/logo.svg` (mark + wordmark, `currentColor`), `public/brand/mark.svg`.

## Colour tokens
| Token | Hex | Use |
|---|---|---|
| `--c-paper` | `#F6EDDF` | page background (giấy dó paper) |
| `--c-red` | `#C8361D` | display type, buttons, links (đỏ son) |
| `--c-lacquer` | `#5E1B14` | hero back shape, footer, dark sections (sơn mài brown-red) |
| `--c-ink` | `#2B1A14` | body text |
| `--c-gold` | `#D9A441` | small accents only |
Product colours live in `src/content/products.ts` (`colors.label`, `colors.accent`, `colors.card`).

## Type
- Display: **Noto Serif Display** (Google Fonts, has Vietnamese), weight 300–400, uppercase for titles, tight leading (0.9), slight negative tracking; italic for the small "Vietnamese Pantry" / "Farm"-style lines.
- Text: **Be Vietnam Pro** 400/600, 13–16 px, generous line height.
- Load with `next/font/google` including the `vietnamese` subset. Never use a face without Vietnamese glyphs: names like "Mứt Gừng" must render with real diacritics.

## Voice
Short, warm, sensory. English is the default locale; Vietnamese (`/vi`) is a full translation. Product names keep the Vietnamese name as the hero title on both locales, with the English name as subtitle.

## Products (8)
See `src/content/products.ts`. Categories: Preserves (mứt), Sauces (tương & sa tế), Pickles (đồ muối), Honey (mật ong).
