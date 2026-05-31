export type Modifier = { id: string; ar: string; en: string; price?: number };
export type Product = {
  id: string;
  ar: string;
  en: string;
  price: number;
  cal?: number;
  size?: string;
  category: string;
  requiresSpice?: boolean;
};

export const COMPANY = {
  brandAr: "يلو تشكن",
  brandEn: "Yellow Chicken",
  branchAr: "مكة المكرمة - حي الشوقية",
  branchEn: "Makkah — Al-Shawqiyyah",
  vatNumber: "300000000000003",
};

export const CASHIERS = [
  { id: "u1", username: "cashier1", pin: "1234", name: "أحمد العتيبي", role: "cashier" as const },
  { id: "u2", username: "manager", pin: "9999", name: "خالد الحربي", role: "manager" as const },
];

export const CATEGORIES = [
  { id: "broasted", ar: "بروستد", en: "Broasted" },
  { id: "clubs", ar: "كلوب", en: "Clubs" },
  { id: "burger", ar: "برجر", en: "Burger" },
  { id: "sandwich", ar: "ساندوتش", en: "Sandwich" },
  { id: "special", ar: "أطباق خاصة", en: "Special Dishes" },
];

export const ORDER_TYPES = [
  { id: "dine_in", ar: "داخل المحل", en: "Dine-in" },
  { id: "takeaway", ar: "سفري", en: "Takeaway" },
  { id: "delivery", ar: "تطبيقات التوصيل", en: "Delivery Apps" },
] as const;
export type OrderTypeId = (typeof ORDER_TYPES)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "cash", ar: "نقدي", en: "Cash" },
  { id: "mada", ar: "مدى / شبكة", en: "Mada / Network" },
  { id: "apple_pay", ar: "Apple Pay", en: "Apple Pay" },
  { id: "visa", ar: "Visa / Mastercard", en: "Visa / Mastercard" },
  { id: "mixed", ar: "دفع مختلط", en: "Mixed Payment" },
] as const;
export type PaymentId = (typeof PAYMENT_METHODS)[number]["id"];

export const SPICE_OPTIONS: Modifier[] = [
  { id: "normal", ar: "عادي", en: "Regular" },
  { id: "spicy", ar: "حار", en: "Spicy" },
];

/* Sandwich / Burger / Club removals — things actually inside the sandwich */
export const REMOVALS_SANDWICH: Modifier[] = [
  { id: "no_lettuce", ar: "بدون خس", en: "No lettuce" },
  { id: "no_tomato", ar: "بدون طماطم", en: "No tomato" },
  { id: "no_pickle", ar: "بدون مخلل", en: "No pickle" },
  { id: "no_chili", ar: "بدون شطة", en: "No chili" },
  { id: "no_ketchup", ar: "بدون كاتشب", en: "No ketchup" },
  { id: "no_sauce", ar: "بدون صوص", en: "No sauce" },
];

/* Broasted removals — broasted has no veggies, only sauce can be removed */
export const REMOVALS_BROASTED: Modifier[] = [
  { id: "no_sauce", ar: "بدون صوص", en: "No sauce" },
];

/* Fries / Special dishes removals */
export const REMOVALS_FRIES: Modifier[] = [
  { id: "no_sauce", ar: "بدون صوص", en: "No sauce" },
];

/* Sandwich / Burger / Club paid add-ons */
export const ADDONS_SANDWICH: Modifier[] = [
  { id: "extra_cheese", ar: "زيادة جبن", en: "Extra cheese", price: 2 },
  { id: "extra_sauce", ar: "زيادة صوص", en: "Extra sauce", price: 1 },
  { id: "extra_chicken", ar: "زيادة دجاج", en: "Extra chicken", price: 5 },
  { id: "extra_meat", ar: "زيادة لحم", en: "Extra meat", price: 6 },
];

/* Broasted-specific add-ons (sauces only) */
export const ADDONS_BROASTED: Modifier[] = [
  { id: "garlic_sauce", ar: "صوص ثوم إضافي", en: "Extra garlic sauce", price: 1 },
  { id: "spicy_sauce", ar: "صوص سبايسي إضافي", en: "Extra spicy sauce", price: 1 },
  { id: "extra_ketchup", ar: "كاتشب إضافي", en: "Extra ketchup", price: 1 },
];

/* Fries / Special dishes add-ons */
export const ADDONS_FRIES: Modifier[] = [
  { id: "extra_cheese", ar: "زيادة جبن", en: "Extra cheese", price: 2 },
  { id: "extra_sauce", ar: "زيادة صوص", en: "Extra sauce", price: 1 },
  { id: "extra_jalapeno", ar: "زيادة هالبينو", en: "Extra jalapeño", price: 2 },
  { id: "side_sauce", ar: "صوص إضافي", en: "Side sauce", price: 1 },
];

/* Master list — used by cart/order serialization to resolve any modifier by id */
export const ALL_REMOVALS: Modifier[] = [
  ...REMOVALS_SANDWICH,
];
export const ALL_ADDONS: Modifier[] = [
  ...ADDONS_SANDWICH,
  ...ADDONS_BROASTED,
  ...ADDONS_FRIES,
];

/* Backwards-compat aliases (older imports) */
export const REMOVALS = ALL_REMOVALS;
export const PAID_ADDONS = ALL_ADDONS;

export function getModifierGroups(category: string): {
  removals: Modifier[];
  addons: Modifier[];
} {
  switch (category) {
    case "broasted":
      return { removals: REMOVALS_BROASTED, addons: ADDONS_BROASTED };
    case "burger":
    case "sandwich":
    case "clubs":
      return { removals: REMOVALS_SANDWICH, addons: ADDONS_SANDWICH };
    case "special":
      return { removals: REMOVALS_FRIES, addons: ADDONS_FRIES };
    default:
      return { removals: [], addons: [] };
  }
}

export const PRODUCTS: Product[] = [
  // Broasted
  { id: "br_4", ar: "بروست 4 قطع", en: "Broasted 4 pcs", price: 17, cal: 1170, size: "4 قطع", category: "broasted", requiresSpice: true },
  { id: "br_4h", ar: "بروست 4 قطع حراق", en: "Broasted 4 pcs spicy", price: 17, cal: 1170, size: "4 قطع", category: "broasted", requiresSpice: true },
  { id: "br_8", ar: "بروست 8 قطع", en: "Broasted 8 pcs", price: 34, cal: 2400, size: "8 قطع", category: "broasted", requiresSpice: true },
  { id: "br_8h", ar: "بروست 8 قطع حراق", en: "Broasted 8 pcs spicy", price: 34, cal: 2400, size: "8 قطع", category: "broasted", requiresSpice: true },
  { id: "ms_8", ar: "مسحب دجاج 8 قطع", en: "Chicken strips 8 pcs", price: 16, cal: 1252, size: "8 قطع", category: "broasted", requiresSpice: true },
  { id: "ms_8h", ar: "مسحب دجاج 8 قطع حراق", en: "Chicken strips 8 pcs spicy", price: 16, cal: 1250, size: "8 قطع", category: "broasted", requiresSpice: true },
  { id: "br_ms10", ar: "بروست مسحب 10 قطع", en: "Broasted strips 10 pcs", price: 20, cal: 1287, size: "10 قطع", category: "broasted" },
  { id: "br_zinger", ar: "بروست زنجر", en: "Zinger broasted", price: 18, cal: 1250, category: "broasted" },
  { id: "br_kids", ar: "وجبة أطفال", en: "Kids meal", price: 14, cal: 1279, category: "broasted" },
  { id: "br_family10", ar: "وجبة البروست العائلية 10 قطع", en: "Family broasted meal 10 pcs", price: 50, cal: 2000, size: "10 قطع", category: "broasted", requiresSpice: true },
  // Clubs
  { id: "cl_chicken", ar: "دجاج كلوب", en: "Chicken club", price: 13, cal: 259, category: "clubs" },
  { id: "cl_fish", ar: "سمك كلوب", en: "Fish club", price: 13, cal: 331, category: "clubs" },
  { id: "cl_zinger", ar: "زنجر كلوب", en: "Zinger club", price: 13, cal: 350, category: "clubs" },
  { id: "cl_shrimp", ar: "جمبري كلوب", en: "Shrimp club", price: 14, cal: 321, category: "clubs" },
  { id: "cl_zinger_ar", ar: "زنجر عربي", en: "Arabic zinger", price: 14, cal: 1279, category: "clubs" },
  // Burger
  { id: "bg_ch", ar: "برجر دجاج", en: "Chicken burger", price: 5, cal: 312, category: "burger" },
  { id: "bg_ch_d", ar: "برجر دجاج دبل", en: "Chicken burger double", price: 10, cal: 572, size: "دبل", category: "burger" },
  { id: "bg_m", ar: "برجر لحم", en: "Beef burger", price: 6, cal: 355, category: "burger" },
  { id: "bg_m_d", ar: "برجر لحم دبل", en: "Beef burger double", price: 12, cal: 590, size: "دبل", category: "burger" },
  { id: "bg_fish", ar: "برجر سمك", en: "Fish burger", price: 7, cal: 428, category: "burger" },
  { id: "bg_z", ar: "برجر زنجر", en: "Zinger burger", price: 7, cal: 584, category: "burger" },
  { id: "bg_meal", ar: "وجبة برجر", en: "Burger meal", price: 15, cal: 520, category: "burger" },
  { id: "bg_meal_d", ar: "وجبة برجر دبل", en: "Burger meal double", price: 18, cal: 770, size: "دبل", category: "burger" },
  { id: "bg_crispy", ar: "برجر دجاج كرسبي", en: "Crispy chicken burger", price: 14, cal: 489, category: "burger" },
  { id: "bg_crispy_p", ar: "بطاطس كرسبي برجر", en: "Crispy burger fries", price: 17, cal: 451, category: "burger" },
  // Sandwich
  { id: "sw_rs", ar: "مسحب راب صغير", en: "Strips wrap small", price: 4, cal: 350, size: "صغير", category: "sandwich" },
  { id: "sw_rn", ar: "مسحب راب عادي", en: "Strips wrap regular", price: 7, cal: 350, size: "عادي", category: "sandwich" },
  { id: "sw_ms", ar: "ساندوتش مسحب", en: "Strips sandwich", price: 8, cal: 490, category: "sandwich" },
  { id: "sw_zr", ar: "زنجر راب", en: "Zinger wrap", price: 7, cal: 510, category: "sandwich" },
  { id: "sw_fish", ar: "ساندوتش سمك", en: "Fish sandwich", price: 8, cal: 440, category: "sandwich" },
  { id: "sw_fr", ar: "سمك راب", en: "Fish wrap", price: 7, cal: 345, category: "sandwich" },
  { id: "sw_kudo", ar: "ساندوتش كودو", en: "Kudo sandwich", price: 8, cal: 520, category: "sandwich" },
  { id: "sw_sr", ar: "جمبري راب", en: "Shrimp wrap", price: 10, cal: 375, category: "sandwich" },
  { id: "sw_kudo_l", ar: "كودو ساندوتش كبير", en: "Kudo sandwich large", price: 14, cal: 720, size: "كبير", category: "sandwich" },
  // Special
  { id: "sp_fries", ar: "بطاطس فرايز", en: "Potato fries", price: 12, cal: 280, category: "special" },
  { id: "sp_sf_s", ar: "فرايز جمبري صغير", en: "Shrimp fries small", price: 20, cal: 480, size: "صغير", category: "special" },
  { id: "sp_sf_l", ar: "فرايز جمبري كبير", en: "Shrimp fries large", price: 28, cal: 480, size: "كبير", category: "special" },
  { id: "sp_dyn", ar: "ديناميت شرمب", en: "Dynamite shrimp", price: 18, cal: 800, category: "special" },
  { id: "sp_yc_s", ar: "يلو تشكن فرايز صغير", en: "Yellow Chicken fries small", price: 20, cal: 600, size: "صغير", category: "special" },
  { id: "sp_yc_l", ar: "يلو تشكن فرايز كبير", en: "Yellow Chicken fries large", price: 26, cal: 600, size: "كبير", category: "special" },
  { id: "sp_cb", ar: "بطاطس كرسبي برجر", en: "Crispy burger fries", price: 17, cal: 450, category: "special" },
  { id: "sp_jal", ar: "بوتاتو فرايز دجاج هالبينو", en: "Jalapeño chicken fries", price: 28, cal: 333, category: "special" },
  { id: "sp_moj", ar: "موهيتو", en: "Mojito", price: 10, cal: 100, category: "special" },
  { id: "sp_shr_s", ar: "شرمب فرايز صغير", en: "Shrimp fries small", price: 20, cal: 480, size: "صغير", category: "special" },
  { id: "sp_shr_l", ar: "شرمب فرايز كبير", en: "Shrimp fries large", price: 28, cal: 480, size: "كبير", category: "special" },
  { id: "sp_ff_s", ar: "فرنش فرايز صغير", en: "French fries small", price: 4, cal: 460, size: "صغير", category: "special" },
  { id: "sp_ff_m", ar: "فرنش فرايز وسط", en: "French fries medium", price: 7, cal: 460, size: "وسط", category: "special" },
  { id: "sp_ff_l", ar: "فرنش فرايز كبير", en: "French fries large", price: 15, cal: 460, size: "كبير", category: "special" },
];

export const VAT_RATE = 0.15;
