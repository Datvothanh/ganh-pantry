export type Locale = "en" | "vi";
export type Localized = Record<Locale, string>;

export type CategoryId = "preserves" | "sauces" | "pickles" | "honey";

export type Motif =
  | "ginger"
  | "kumquat"
  | "pineapple"
  | "chili"
  | "shrimp"
  | "lime"
  | "eggplant"
  | "coffee-blossom";

export interface Variant {
  /** Stable id used as Shopify variant option value too. */
  id: string;
  weight: string;
  /** USD price used by the mock commerce adapter; Shopify prices win when connected. */
  price: number;
}

export interface Product {
  handle: string;
  category: CategoryId;
  /** Vietnamese name, used as the display title on every locale. */
  nameVi: string;
  nameEn: string;
  subtitle: Localized;
  description: Localized;
  ingredients: Localized;
  pairing: Localized;
  storage: Localized;
  shelfLife: string;
  variants: Variant[];
  motif: Motif;
  colors: {
    /** Main label field colour. */
    label: string;
    /** Secondary colour for shapes on the label and hover accents. */
    accent: string;
    /** Pastel card background in product grids. */
    card: string;
    /** Text colour on the label. */
    text: string;
  };
  /** Unlabelled cut-out jar photo, 630x1013 RGBA. */
  jar: string;
  /** Flat wrap-around label texture, 1600x607. */
  label: string;
}

export const categories: { id: CategoryId; name: Localized; intro: Localized }[] = [
  {
    id: "preserves",
    name: { en: "Preserves", vi: "Mứt" },
    intro: {
      en: "Fruit and roots cooked slowly with cane sugar, the way grandmothers make them before Tết.",
      vi: "Trái cây và củ sên chậm với đường mía, như cách bà vẫn làm mỗi dịp Tết.",
    },
  },
  {
    id: "sauces",
    name: { en: "Sauces", vi: "Tương & Sa tế" },
    intro: {
      en: "Fire from fresh chilies, garlic and lemongrass, ground and fried in small batches.",
      vi: "Vị cay từ ớt tươi, tỏi và sả, xay và phi từng mẻ nhỏ.",
    },
  },
  {
    id: "pickles",
    name: { en: "Pickles", vi: "Đồ muối" },
    intro: {
      en: "Brined for weeks until bright, sour and crunchy — the quiet hero of every Vietnamese table.",
      vi: "Ngâm hàng tuần cho tới khi giòn, chua và thơm — món không thể thiếu của mâm cơm Việt.",
    },
  },
  {
    id: "honey",
    name: { en: "Honey", vi: "Mật ong" },
    intro: {
      en: "Raw honey from coffee farms in the Central Highlands, harvested once a year.",
      vi: "Mật ong nguyên chất từ vườn cà phê Tây Nguyên, mỗi năm chỉ một mùa.",
    },
  },
];

export const products: Product[] = [
  {
    handle: "mut-gung",
    category: "preserves",
    nameVi: "Mứt Gừng",
    nameEn: "Candied Ginger",
    subtitle: { en: "Candied ginger with cane sugar", vi: "Gừng sên đường mía" },
    description: {
      en: "Young ginger sliced by hand, simmered in cane syrup and dried until each strip turns translucent and frosted with sugar. Warm, sweet, with a gentle bite that lingers.",
      vi: "Gừng non thái tay, sên trong nước đường mía rồi phơi cho tới khi từng lát trong và phủ lớp đường mịn. Ngọt ấm, cay nhẹ, đọng lại lâu.",
    },
    ingredients: {
      en: "Young ginger (70%), cane sugar, lime juice.",
      vi: "Gừng non (70%), đường mía, nước cốt chanh.",
    },
    pairing: {
      en: "With hot green tea, on yoghurt, or chopped into cookies.",
      vi: "Dùng với trà xanh nóng, rắc lên sữa chua hoặc trộn vào bánh quy.",
    },
    storage: {
      en: "Keep dry and away from sunlight. Close tightly after opening.",
      vi: "Bảo quản nơi khô ráo, tránh ánh nắng. Đậy kín sau khi mở.",
    },
    shelfLife: "12",
    variants: [
      { id: "220g", weight: "220 g", price: 9 },
      { id: "314g", weight: "314 g", price: 12 },
    ],
    motif: "ginger",
    colors: { label: "#E9B949", accent: "#8A4B12", card: "#F7E6B8", text: "#5E1B14" },
    jar: "/jars/mut-gung.webp",
    label: "/labels/mut-gung.png",
  },
  {
    handle: "mut-quat",
    category: "preserves",
    nameVi: "Mứt Quất",
    nameEn: "Kumquat Marmalade",
    subtitle: { en: "Whole kumquats in syrup", vi: "Quất nguyên trái ngâm đường" },
    description: {
      en: "Whole kumquats pressed flat to release their seeds, then candied for three days. Bright, bittersweet and glossy — the jar every Hanoi family opens at Tết.",
      vi: "Quất nguyên trái được ép dẹt để bỏ hạt rồi sên ba ngày. Tươi, ngọt đắng, bóng mật — hũ mứt mà nhà nào ở Hà Nội cũng mở dịp Tết.",
    },
    ingredients: { en: "Kumquats (65%), cane sugar, a pinch of salt.", vi: "Quất (65%), đường mía, một chút muối." },
    pairing: {
      en: "On toast with butter, with roast duck, or dropped into iced tea.",
      vi: "Phết bánh mì bơ, ăn kèm vịt quay, hoặc thả vào trà đá.",
    },
    storage: {
      en: "Keep in a cool place. Refrigerate after opening and use within 4 weeks.",
      vi: "Bảo quản nơi thoáng mát. Sau khi mở cất tủ lạnh, dùng trong 4 tuần.",
    },
    shelfLife: "18",
    variants: [
      { id: "220g", weight: "220 g", price: 10 },
      { id: "314g", weight: "314 g", price: 13 },
    ],
    motif: "kumquat",
    colors: { label: "#E8641B", accent: "#F2B33D", card: "#FBD9BF", text: "#FFF4E2" },
    jar: "/jars/mut-quat.webp",
    label: "/labels/mut-quat.png",
  },
  {
    handle: "mut-dua",
    category: "preserves",
    nameVi: "Mứt Dứa",
    nameEn: "Pineapple & Lime Jam",
    subtitle: { en: "Pineapple jam with lime zest", vi: "Mứt dứa vỏ chanh" },
    description: {
      en: "Queen pineapples from Tiền Giang cooked down with their own fibres and finished with lime zest. Chunky, tropical and just sharp enough.",
      vi: "Dứa Queen Tiền Giang sên cùng thớ dứa, thêm vỏ chanh ở cuối. Dày cùi, thơm nhiệt đới và chua vừa đủ.",
    },
    ingredients: { en: "Pineapple (68%), cane sugar, lime zest, lime juice.", vi: "Dứa (68%), đường mía, vỏ chanh, nước cốt chanh." },
    pairing: {
      en: "With cheese, on pancakes, or as a glaze for grilled pork.",
      vi: "Ăn với phô mai, rưới bánh pancake, hoặc làm sốt phết thịt nướng.",
    },
    storage: {
      en: "Keep in a cool place. Refrigerate after opening and use within 3 weeks.",
      vi: "Bảo quản nơi thoáng mát. Sau khi mở cất tủ lạnh, dùng trong 3 tuần.",
    },
    shelfLife: "18",
    variants: [
      { id: "220g", weight: "220 g", price: 9 },
      { id: "314g", weight: "314 g", price: 12 },
    ],
    motif: "pineapple",
    colors: { label: "#F2C230", accent: "#3E7D3A", card: "#FBEBB0", text: "#2E4A1F" },
    jar: "/jars/mut-dua.webp",
    label: "/labels/mut-dua.png",
  },
  {
    handle: "tuong-ot-toi",
    category: "sauces",
    nameVi: "Tương Ớt Tỏi",
    nameEn: "Garlic Chili Sauce",
    subtitle: { en: "Fresh red chili and garlic", vi: "Ớt đỏ tươi và tỏi" },
    description: {
      en: "Bird's eye and long red chilies ground with Lý Sơn garlic and a splash of rice vinegar. Bright heat, deep garlic, no shortcuts.",
      vi: "Ớt hiểm và ớt sừng xay cùng tỏi Lý Sơn và chút giấm gạo. Cay tươi, đậm tỏi, không chất bảo quản.",
    },
    ingredients: {
      en: "Red chilies (60%), garlic (18%), rice vinegar, cane sugar, salt.",
      vi: "Ớt đỏ (60%), tỏi (18%), giấm gạo, đường mía, muối.",
    },
    pairing: {
      en: "With phở, spring rolls, fried eggs and anything grilled.",
      vi: "Ăn với phở, nem rán, trứng ốp la và mọi món nướng.",
    },
    storage: {
      en: "Refrigerate after opening and use within 2 months.",
      vi: "Sau khi mở cất tủ lạnh, dùng trong 2 tháng.",
    },
    shelfLife: "12",
    variants: [
      { id: "220g", weight: "220 g", price: 8 },
      { id: "314g", weight: "314 g", price: 10 },
    ],
    motif: "chili",
    colors: { label: "#C8261E", accent: "#F28C28", card: "#F6C6BC", text: "#FFF4E2" },
    jar: "/jars/tuong-ot-toi.webp",
    label: "/labels/tuong-ot-toi.png",
  },
  {
    handle: "sa-te-tom",
    category: "sauces",
    nameVi: "Sa Tế Tôm",
    nameEn: "Shrimp Chili Oil",
    subtitle: { en: "Lemongrass chili oil with dried shrimp", vi: "Sa tế sả ớt tôm khô" },
    description: {
      en: "Dried shrimp, lemongrass and chili flakes fried slowly in peanut oil until crisp and fragrant. Spoon it over noodles and watch it disappear.",
      vi: "Tôm khô, sả và ớt khô phi chậm trong dầu đậu phộng tới khi giòn thơm. Rưới lên bún, mì là hết veo.",
    },
    ingredients: {
      en: "Peanut oil, chili flakes (22%), dried shrimp (15%), lemongrass, garlic, shallots, salt.",
      vi: "Dầu đậu phộng, ớt khô (22%), tôm khô (15%), sả, tỏi, hành tím, muối.",
    },
    pairing: {
      en: "With bún bò Huế, hot pot, dumplings and plain rice.",
      vi: "Ăn với bún bò Huế, lẩu, sủi cảo hoặc cơm trắng.",
    },
    storage: {
      en: "Keep in a cool place. Stir before use. Use within 3 months of opening.",
      vi: "Bảo quản nơi thoáng mát. Khuấy đều trước khi dùng. Dùng trong 3 tháng sau khi mở.",
    },
    shelfLife: "12",
    variants: [
      { id: "220g", weight: "220 g", price: 10 },
      { id: "314g", weight: "314 g", price: 13 },
    ],
    motif: "shrimp",
    colors: { label: "#7A1F12", accent: "#E8641B", card: "#EBC2B4", text: "#F6EDDF" },
    jar: "/jars/sa-te-tom.webp",
    label: "/labels/sa-te-tom.png",
  },
  {
    handle: "chanh-muoi",
    category: "pickles",
    nameVi: "Chanh Muối",
    nameEn: "Salted Limes",
    subtitle: { en: "Whole limes cured in brine", vi: "Chanh nguyên trái ngâm muối" },
    description: {
      en: "Whole limes packed in sea salt brine and left for months until the skins soften and turn olive-gold. Mash one with sugar and soda for the classic soda chanh muối.",
      vi: "Chanh nguyên trái ngâm nước muối biển hàng tháng tới khi vỏ mềm và ngả vàng ô liu. Dầm một trái với đường và soda là có ly soda chanh muối kinh điển.",
    },
    ingredients: { en: "Limes (75%), water, sea salt.", vi: "Chanh (75%), nước, muối biển." },
    pairing: {
      en: "In soda, in dressings, or chopped into braised fish.",
      vi: "Pha soda, làm nước trộn gỏi, hoặc băm vào cá kho.",
    },
    storage: {
      en: "Keep the limes covered by brine. Refrigerate after opening.",
      vi: "Giữ chanh ngập nước muối. Cất tủ lạnh sau khi mở.",
    },
    shelfLife: "24",
    variants: [
      { id: "314g", weight: "314 g", price: 9 },
      { id: "500g", weight: "500 g", price: 13 },
    ],
    motif: "lime",
    colors: { label: "#9BBF3B", accent: "#F2C230", card: "#E3EDC0", text: "#2E4A1F" },
    jar: "/jars/chanh-muoi.webp",
    label: "/labels/chanh-muoi.png",
  },
  {
    handle: "ca-phao",
    category: "pickles",
    nameVi: "Cà Pháo Muối",
    nameEn: "Pickled Eggplant",
    subtitle: { en: "Crunchy white eggplant in brine", vi: "Cà pháo muối xổi giòn" },
    description: {
      en: "Tiny white eggplants brined with garlic, galangal and red chili. Crunchy, salty and sour — the bite that cuts through every rich northern dish.",
      vi: "Cà pháo trắng muối cùng tỏi, riềng và ớt đỏ. Giòn, mặn, chua — miếng cà không thể thiếu bên mâm cơm miền Bắc.",
    },
    ingredients: {
      en: "White eggplant (70%), water, sea salt, garlic, galangal, red chili.",
      vi: "Cà pháo (70%), nước, muối biển, tỏi, riềng, ớt đỏ.",
    },
    pairing: {
      en: "With braised pork, mắm tôm, or a bowl of rice and soup.",
      vi: "Ăn với thịt kho, mắm tôm, hoặc bát cơm canh.",
    },
    storage: {
      en: "Refrigerate after opening and use within 3 weeks.",
      vi: "Sau khi mở cất tủ lạnh, dùng trong 3 tuần.",
    },
    shelfLife: "6",
    variants: [
      { id: "314g", weight: "314 g", price: 8 },
      { id: "500g", weight: "500 g", price: 11 },
    ],
    motif: "eggplant",
    colors: { label: "#6B3C7D", accent: "#9BBF3B", card: "#DCCBE3", text: "#F6EDDF" },
    jar: "/jars/ca-phao.webp",
    label: "/labels/ca-phao.png",
  },
  {
    handle: "mat-ong-ca-phe",
    category: "honey",
    nameVi: "Mật Ong Hoa Cà Phê",
    nameEn: "Coffee Blossom Honey",
    subtitle: { en: "Raw honey from the Central Highlands", vi: "Mật ong nguyên chất Tây Nguyên" },
    description: {
      en: "Gathered when the coffee farms of Đắk Lắk flower for a few weeks each spring. Dark, malty and floral, with a soft roasted finish.",
      vi: "Thu hoạch khi vườn cà phê Đắk Lắk trổ hoa vài tuần mỗi mùa xuân. Sẫm màu, thơm mạch nha và hoa, hậu vị rang dịu.",
    },
    ingredients: { en: "Raw coffee blossom honey (100%).", vi: "Mật ong hoa cà phê nguyên chất (100%)." },
    pairing: {
      en: "In black coffee, with ginger tea, or drizzled on fresh cheese.",
      vi: "Pha cà phê đen, trà gừng, hoặc rưới lên phô mai tươi.",
    },
    storage: {
      en: "Keep at room temperature. Crystallising is natural: warm gently to melt.",
      vi: "Bảo quản ở nhiệt độ phòng. Mật kết tinh là tự nhiên: ngâm ấm để tan.",
    },
    shelfLife: "24",
    variants: [
      { id: "314g", weight: "314 g", price: 14 },
      { id: "500g", weight: "500 g", price: 20 },
    ],
    motif: "coffee-blossom",
    colors: { label: "#3B2418", accent: "#D9A441", card: "#E9D3B0", text: "#F2D49A" },
    jar: "/jars/mat-ong-ca-phe.webp",
    label: "/labels/mat-ong-ca-phe.png",
  },
];

export const productByHandle = (handle: string): Product | undefined =>
  products.find((p) => p.handle === handle);
