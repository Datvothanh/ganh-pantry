import type { Locale } from "@/content/products";

export const buyCopy = {
  en: {
    weight: "Weight",
    price: "Price",
    quantity: "Quantity",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    soldOut: "Sold out",
    quickAdd: (name: string) => `Quick add ${name}`,
  },
  vi: {
    weight: "Khối lượng",
    price: "Giá",
    quantity: "Số lượng",
    decrease: "Giảm số lượng",
    increase: "Tăng số lượng",
    soldOut: "Hết hàng",
    quickAdd: (name: string) => `Thêm nhanh ${name}`,
  },
} satisfies Record<Locale, unknown>;
