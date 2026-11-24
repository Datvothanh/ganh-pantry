import type { Locale } from "@/content/products";

export const pantryStrings = {
  en: {
    title: "Pantry",
    heroLine: ["From our kitchens,", "one jar at a time."],
    heroAlt: "The eight GÁNH jars side by side",
    intro:
      "We cook in small batches with the people who grow our fruit, chilies and honey. The pantry gathers everything we make — preserves for Tết, fiery sauces, slow pickles and raw honey — each one carried from a Vietnamese kitchen to yours.",
    weights: "Available weights",
    nav: "Pantry categories",
    tableTitle: ["Shelf life", "& weights"],
    tableIntro:
      "Every jar is sealed by hand and dated. Unopened, it keeps for months; once opened, close it tightly and keep it cool.",
    product: "Product",
    shelfLife: "Shelf life",
    weight: "Weight",
    months: (n: string) => `${n} months`,
    outroAlt: "GÁNH jars on a lacquer-red table",
    categoryAlt: (name: string) => `${name} jars`,
  },
  vi: {
    title: "Gian bếp",
    heroLine: ["Từ gian bếp Việt,", "từng hũ một."],
    heroAlt: "Tám hũ GÁNH xếp cạnh nhau",
    intro:
      "Chúng tôi nấu từng mẻ nhỏ cùng những người trồng trái cây, ớt và nuôi ong. Gian bếp gom tất cả những gì chúng tôi làm — mứt Tết, tương cay, đồ muối chua và mật ong nguyên chất — gánh từ gian bếp Việt tới nhà bạn.",
    weights: "Khối lượng",
    nav: "Danh mục gian bếp",
    tableTitle: ["Hạn dùng", "& khối lượng"],
    tableIntro:
      "Mỗi hũ đều được đóng nắp bằng tay và ghi ngày. Chưa mở thì giữ được nhiều tháng; sau khi mở, đậy kín và để nơi mát.",
    product: "Sản phẩm",
    shelfLife: "Hạn dùng",
    weight: "Khối lượng",
    months: (n: string) => `${n} tháng`,
    outroAlt: "Các hũ GÁNH trên bàn sơn mài đỏ",
    categoryAlt: (name: string) => `Các hũ ${name}`,
  },
} satisfies Record<Locale, unknown>;

export type PantryStrings = (typeof pantryStrings)["en"];
