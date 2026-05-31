/* Phase 3 — Suppliers, Purchases, Inventory, Recipes, Adjustments, Waste.
   Frontend / local-state only. No backend, no DB, no accounting posting. */

export type Supplier = {
  id: string;
  name: string;
  mobile: string;
  rep: string;
  vat: string;
  email: string;
  address: string;
  terms: "cash" | "net15" | "net30";
  openingBalance: number;
  outstanding: number;
  lastPurchaseAt?: number;
};

export type PurchaseItem = {
  id: string;
  inventoryId: string;
  qty: number;
  unit: string;
  unitCost: number;
  vat: number; // line vat amount
  total: number; // line total inc vat
};

export type PurchaseInvoice = {
  id: string;
  number: string; // internal
  supplierInvoiceNo: string;
  supplierId: string;
  date: number;
  items: PurchaseItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: "cash" | "bank" | "credit";
  status: "paid" | "partial" | "unpaid";
  paid: number;
  attachment?: string; // local filename label only
};

export type InventoryCategory =
  | "chicken" | "potatoes" | "oil" | "bread" | "sauces"
  | "drinks" | "packaging" | "other";

export const INVENTORY_CATEGORIES: { id: InventoryCategory; ar: string; en: string }[] = [
  { id: "chicken", ar: "دجاج", en: "Chicken" },
  { id: "potatoes", ar: "بطاطس", en: "Potatoes" },
  { id: "oil", ar: "زيت", en: "Oil" },
  { id: "bread", ar: "خبز", en: "Bread" },
  { id: "sauces", ar: "صوصات", en: "Sauces" },
  { id: "drinks", ar: "مشروبات", en: "Drinks" },
  { id: "packaging", ar: "تغليف", en: "Packaging" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export const UNITS: { id: string; ar: string; en: string }[] = [
  { id: "carton", ar: "كرتون", en: "Carton" },
  { id: "liter", ar: "لتر", en: "Liter" },
  { id: "tin", ar: "تنكة", en: "Tin" },
  { id: "bag", ar: "كيس", en: "Bag" },
  { id: "pack", ar: "علبة", en: "Pack" },
  { id: "piece", ar: "حبة", en: "Piece" },
];

export type InventoryItem = {
  id: string;
  ar: string;
  en: string;
  category: InventoryCategory;
  unit: string; // unit id
  qty: number;
  minLevel: number;
  avgCost: number;
  notes?: string;
  updatedAt: number;
};

export type MovementType = "purchase" | "sale" | "adjustment" | "waste" | "manual";
export type InventoryMovement = {
  id: string;
  inventoryId: string;
  date: number;
  type: MovementType;
  ref: string;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  user: string;
  notes?: string;
};

export type RecipeIngredient = {
  inventoryId: string;
  qty: number;
  unit: string;
};
export type Recipe = {
  productId: string;
  ingredients: RecipeIngredient[];
};

export type StockAdjustment = {
  id: string;
  number: string;
  date: number;
  inventoryId: string;
  oldQty: number;
  newQty: number;
  diff: number;
  reason: "count" | "damage" | "loss" | "entry_error" | "other";
  notes?: string;
  user: string;
};

export type WasteRecord = {
  id: string;
  number: string;
  date: number;
  inventoryId: string;
  qty: number;
  unit: string;
  reason: "damage" | "expired" | "prep_error" | "daily_waste" | "broken" | "other";
  estCost: number;
  notes?: string;
  user: string;
};

/* ───── Seeds ───── */

const now = Date.now();
const hours = (h: number) => now - h * 3600 * 1000;
const days = (d: number) => now - d * 86400 * 1000;

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "sup_chicken", name: "مورد الدجاج الطازج",
    mobile: "0551112233", rep: "عبدالله الشهري",
    vat: "300123456700003", email: "fresh.chicken@suppliers.sa",
    address: "جدة - المنطقة الصناعية", terms: "net15",
    openingBalance: 0, outstanding: 4800, lastPurchaseAt: days(2),
  },
  {
    id: "sup_potatoes", name: "مورد البطاطس والزيوت",
    mobile: "0554445566", rep: "ماجد الغامدي",
    vat: "300223344500003", email: "potoil@suppliers.sa",
    address: "مكة - الكعكية", terms: "net30",
    openingBalance: 0, outstanding: 1320, lastPurchaseAt: days(5),
  },
  {
    id: "sup_drinks", name: "مورد المشروبات",
    mobile: "0557778899", rep: "سعد القحطاني",
    vat: "300334455600003", email: "drinks@suppliers.sa",
    address: "مكة - العزيزية", terms: "cash",
    openingBalance: 0, outstanding: 0, lastPurchaseAt: days(7),
  },
  {
    id: "sup_packaging", name: "مورد التغليف والصوصات",
    mobile: "0552223344", rep: "فهد الزهراني",
    vat: "300445566700003", email: "pack.sauce@suppliers.sa",
    address: "مكة - الشوقية", terms: "net15",
    openingBalance: 0, outstanding: 980, lastPurchaseAt: days(3),
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "inv_chicken", ar: "دجاج بروست", en: "Chicken Broast", category: "chicken", unit: "carton", qty: 1, minLevel: 2, avgCost: 420, updatedAt: hours(6) },
  { id: "inv_fries", ar: "بطاطس مجمدة", en: "Frozen Fries", category: "potatoes", unit: "carton", qty: 8, minLevel: 3, avgCost: 95, updatedAt: hours(30) },
  { id: "inv_oil", ar: "زيت قلي", en: "Frying Oil", category: "oil", unit: "liter", qty: 4, minLevel: 5, avgCost: 11, updatedAt: hours(12) },
  { id: "inv_burger_bun", ar: "خبز برجر", en: "Burger Buns", category: "bread", unit: "bag", qty: 10, minLevel: 4, avgCost: 18, updatedAt: hours(20) },
  { id: "inv_wrap_bread", ar: "خبز راب", en: "Wrap Bread", category: "bread", unit: "bag", qty: 6, minLevel: 3, avgCost: 14, updatedAt: hours(20) },
  { id: "inv_cheese", ar: "جبن شرائح", en: "Cheese Slices", category: "sauces", unit: "pack", qty: 12, minLevel: 4, avgCost: 22, updatedAt: hours(28) },
  { id: "inv_garlic", ar: "صوص ثوم", en: "Garlic Sauce", category: "sauces", unit: "pack", qty: 15, minLevel: 5, avgCost: 9, updatedAt: hours(40) },
  { id: "inv_spicy", ar: "صوص سبايسي", en: "Spicy Sauce", category: "sauces", unit: "pack", qty: 9, minLevel: 4, avgCost: 9, updatedAt: hours(40) },
  { id: "inv_cups", ar: "أكواب مشروبات", en: "Drink Cups", category: "drinks", unit: "carton", qty: 5, minLevel: 2, avgCost: 65, updatedAt: hours(50) },
  { id: "inv_pack", ar: "علب تغليف", en: "Packaging Boxes", category: "packaging", unit: "carton", qty: 1, minLevel: 3, avgCost: 80, updatedAt: hours(8) },
  { id: "inv_napkins", ar: "مناديل", en: "Napkins", category: "packaging", unit: "carton", qty: 4, minLevel: 2, avgCost: 45, updatedAt: hours(60) },
];

export const INITIAL_PURCHASES: PurchaseInvoice[] = [
  {
    id: "P-1001", number: "P-1001", supplierInvoiceNo: "FC-22841",
    supplierId: "sup_chicken", date: days(2),
    items: [
      { id: "pi1", inventoryId: "inv_chicken", qty: 10, unit: "carton", unitCost: 420, vat: 630, total: 4830 },
    ],
    subtotal: 4200, vat: 630, total: 4830, paymentMethod: "credit", status: "unpaid", paid: 0,
    attachment: "fc-22841.pdf",
  },
  {
    id: "P-1002", number: "P-1002", supplierInvoiceNo: "PO-5512",
    supplierId: "sup_potatoes", date: days(5),
    items: [
      { id: "pi1", inventoryId: "inv_fries", qty: 5, unit: "carton", unitCost: 95, vat: 71.25, total: 546.25 },
      { id: "pi2", inventoryId: "inv_oil", qty: 20, unit: "liter", unitCost: 11, vat: 33, total: 253 },
    ],
    subtotal: 695, vat: 104.25, total: 799.25, paymentMethod: "bank", status: "paid", paid: 799.25,
  },
  {
    id: "P-1003", number: "P-1003", supplierInvoiceNo: "DR-7720",
    supplierId: "sup_drinks", date: days(7),
    items: [
      { id: "pi1", inventoryId: "inv_cups", qty: 4, unit: "carton", unitCost: 65, vat: 39, total: 299 },
    ],
    subtotal: 260, vat: 39, total: 299, paymentMethod: "cash", status: "paid", paid: 299,
  },
  {
    id: "P-1004", number: "P-1004", supplierInvoiceNo: "PK-3380",
    supplierId: "sup_packaging", date: days(3),
    items: [
      { id: "pi1", inventoryId: "inv_pack", qty: 6, unit: "carton", unitCost: 80, vat: 72, total: 552 },
      { id: "pi2", inventoryId: "inv_garlic", qty: 24, unit: "pack", unitCost: 9, vat: 32.4, total: 248.4 },
      { id: "pi3", inventoryId: "inv_spicy", qty: 18, unit: "pack", unitCost: 9, vat: 24.3, total: 186.3 },
    ],
    subtotal: 990, vat: 148.5, total: 1138.5, paymentMethod: "credit", status: "partial", paid: 500,
  },
];

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: "m1", inventoryId: "inv_chicken", date: days(2), type: "purchase", ref: "P-1001", qtyIn: 10, qtyOut: 0, balance: 11, user: "خالد الحربي" },
  { id: "m2", inventoryId: "inv_chicken", date: hours(20), type: "sale", ref: "ORDERS", qtyIn: 0, qtyOut: 8, balance: 3, user: "النظام" },
  { id: "m3", inventoryId: "inv_chicken", date: hours(6), type: "waste", ref: "W-2001", qtyIn: 0, qtyOut: 2, balance: 1, user: "أحمد العتيبي" },
  { id: "m4", inventoryId: "inv_fries", date: days(5), type: "purchase", ref: "P-1002", qtyIn: 5, qtyOut: 0, balance: 13, user: "خالد الحربي" },
  { id: "m5", inventoryId: "inv_fries", date: hours(30), type: "sale", ref: "ORDERS", qtyIn: 0, qtyOut: 5, balance: 8, user: "النظام" },
  { id: "m6", inventoryId: "inv_oil", date: days(5), type: "purchase", ref: "P-1002", qtyIn: 20, qtyOut: 0, balance: 24, user: "خالد الحربي" },
  { id: "m7", inventoryId: "inv_oil", date: hours(12), type: "sale", ref: "ORDERS", qtyIn: 0, qtyOut: 20, balance: 4, user: "النظام" },
  { id: "m8", inventoryId: "inv_pack", date: days(3), type: "purchase", ref: "P-1004", qtyIn: 6, qtyOut: 0, balance: 7, user: "خالد الحربي" },
  { id: "m9", inventoryId: "inv_pack", date: hours(8), type: "sale", ref: "ORDERS", qtyIn: 0, qtyOut: 6, balance: 1, user: "النظام" },
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    productId: "br_4",
    ingredients: [
      { inventoryId: "inv_chicken", qty: 0.25, unit: "carton" },
      { inventoryId: "inv_oil", qty: 0.15, unit: "liter" },
      { inventoryId: "inv_garlic", qty: 0.05, unit: "pack" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "br_8",
    ingredients: [
      { inventoryId: "inv_chicken", qty: 0.5, unit: "carton" },
      { inventoryId: "inv_oil", qty: 0.25, unit: "liter" },
      { inventoryId: "inv_garlic", qty: 0.08, unit: "pack" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "bg_ch",
    ingredients: [
      { inventoryId: "inv_burger_bun", qty: 1, unit: "piece" },
      { inventoryId: "inv_chicken", qty: 0.05, unit: "carton" },
      { inventoryId: "inv_cheese", qty: 1, unit: "piece" },
      { inventoryId: "inv_spicy", qty: 0.03, unit: "pack" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "bg_m",
    ingredients: [
      { inventoryId: "inv_burger_bun", qty: 1, unit: "piece" },
      { inventoryId: "inv_cheese", qty: 1, unit: "piece" },
      { inventoryId: "inv_spicy", qty: 0.03, unit: "pack" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "sw_zr",
    ingredients: [
      { inventoryId: "inv_wrap_bread", qty: 1, unit: "piece" },
      { inventoryId: "inv_chicken", qty: 0.04, unit: "carton" },
      { inventoryId: "inv_spicy", qty: 0.03, unit: "pack" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "sp_ff_s",
    ingredients: [
      { inventoryId: "inv_fries", qty: 0.05, unit: "carton" },
      { inventoryId: "inv_oil", qty: 0.05, unit: "liter" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
  {
    productId: "sp_yc_l",
    ingredients: [
      { inventoryId: "inv_fries", qty: 0.1, unit: "carton" },
      { inventoryId: "inv_oil", qty: 0.08, unit: "liter" },
      { inventoryId: "inv_cheese", qty: 2, unit: "piece" },
      { inventoryId: "inv_pack", qty: 1, unit: "piece" },
    ],
  },
];

export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: "A-501", number: "A-501", date: days(1),
    inventoryId: "inv_fries", oldQty: 9, newQty: 8, diff: -1,
    reason: "count", notes: "جرد فعلي صباح اليوم", user: "خالد الحربي",
  },
];

export const INITIAL_WASTE: WasteRecord[] = [
  {
    id: "W-2001", number: "W-2001", date: hours(6),
    inventoryId: "inv_chicken", qty: 2, unit: "carton",
    reason: "damage", estCost: 840, notes: "تلف بسبب عطل التبريد", user: "أحمد العتيبي",
  },
];
