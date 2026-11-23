import type { Locale } from "@/content/products";

const en = {
  meta: {
    title: "GÁNH — Vietnamese Pantry",
    description:
      "Small-batch preserves, sauces, pickles and honey carried by hand from Vietnamese kitchens. A concept brand.",
  },
  nav: { home: "Home", pantry: "Pantry" },
  header: { home: "GÁNH — home", languages: "Language" },
  menu: {
    open: "Menu",
    openLabel: "Open menu",
    close: "Close",
    closeLabel: "Close menu",
    title: "Site menu",
    products: "The jars",
    language: "Language",
  },
  lang: { en: "English", vi: "Tiếng Việt" },
  footer: {
    explore: "Explore",
    studio: "Studio",
    address: ["14 Nguyễn Thái Học", "Hội An, Quảng Nam — Việt Nam"],
    follow: "Follow us",
    social: "@ganh.pantry",
    contact:
      "A question, a wholesale idea or a family recipe to share? Write to us — we answer between batches.",
    email: "hello@ganh.example",
    copyright: "© 2026 GÁNH",
    note: "Fictional studio address",
    top: "Back to top",
  },
  loader: { label: "Loading GÁNH" },
  notFound: {
    title: "Nothing in this jar",
    body: "The page you are looking for was eaten, moved or never made.",
    back: "Back to the pantry",
  },
  placeholder: {
    home: "Carried by hand from Vietnamese kitchens.",
    pantry: "Pantry",
  },
  cursor: { discover: "Discover the product" },
};

export type Dict = typeof en;

const vi: Dict = {
  meta: {
    title: "GÁNH — Đặc sản Việt",
    description:
      "Mứt, tương, đồ muối và mật ong làm từng mẻ nhỏ, gánh bằng tay từ những gian bếp Việt. Một thương hiệu concept.",
  },
  nav: { home: "Trang chủ", pantry: "Gian bếp" },
  header: { home: "GÁNH — trang chủ", languages: "Ngôn ngữ" },
  menu: {
    open: "Menu",
    openLabel: "Mở menu",
    close: "Đóng",
    closeLabel: "Đóng menu",
    title: "Menu trang",
    products: "Các hũ",
    language: "Ngôn ngữ",
  },
  lang: { en: "English", vi: "Tiếng Việt" },
  footer: {
    explore: "Khám phá",
    studio: "Xưởng",
    address: ["14 Nguyễn Thái Học", "Hội An, Quảng Nam — Việt Nam"],
    follow: "Theo dõi",
    social: "@ganh.pantry",
    contact:
      "Có câu hỏi, ý tưởng hợp tác hay công thức gia đình muốn chia sẻ? Viết cho chúng tôi — chúng tôi trả lời giữa những mẻ nấu.",
    email: "hello@ganh.example",
    copyright: "© 2026 GÁNH",
    note: "Địa chỉ xưởng hư cấu",
    top: "Lên đầu trang",
  },
  loader: { label: "Đang tải GÁNH" },
  notFound: {
    title: "Hũ này trống rỗng",
    body: "Trang bạn tìm đã bị ăn mất, dời đi hoặc chưa từng được làm.",
    back: "Về gian bếp",
  },
  placeholder: {
    home: "Gánh bằng tay từ những gian bếp Việt.",
    pantry: "Gian bếp",
  },
  cursor: { discover: "Khám phá sản phẩm" },
};

export const dict: Record<Locale, Dict> = { en, vi };

export const getDict = (locale: Locale): Dict => dict[locale];
