import type { Locale } from "@/content/products";

export const pdpStrings = {
  en: {
    madeIn: ["Made in", "Việt Nam"],
    ingredients: "Ingredients",
    storage: "Storage",
    pairing: "Pairing tips",
    weights: "Available weights",
    shelfLife: "Shelf life",
    months: (n: string) => `${n} months`,
    photoGallery: "Photo gallery",
    photoHint: "Drag to look around",
    drag: "Drag",
    otherTitle: ["The other", "products"],
    quickAddLabel: (name: string, weight: string, price: string) => `Add ${name} ${weight}, ${price}`,
    jarAlt: (name: string) => `Jar of ${name}`,
    photoAlt: (name: string, i: number) => `${name}, photo ${i}`,
  },
  vi: {
    madeIn: ["Sản xuất tại", "Việt Nam"],
    ingredients: "Thành phần",
    storage: "Bảo quản",
    pairing: "Gợi ý dùng",
    weights: "Khối lượng",
    shelfLife: "Hạn dùng",
    months: (n: string) => `${n} tháng`,
    photoGallery: "Thư viện ảnh",
    photoHint: "Kéo để xem thêm",
    drag: "Kéo",
    otherTitle: ["Sản phẩm", "khác"],
    quickAddLabel: (name: string, weight: string, price: string) => `Thêm ${name} ${weight}, ${price}`,
    jarAlt: (name: string) => `Hũ ${name}`,
    photoAlt: (name: string, i: number) => `${name}, ảnh ${i}`,
  },
} satisfies Record<Locale, unknown>;

export type PdpStrings = (typeof pdpStrings)["en"];
