/* Phase 2 — Manager dashboard local data.
   Frontend / local-state only. No backend, no DB, no ZATCA. */

export type RoleId = "owner" | "finance" | "manager" | "cashier";

export const ROLES: { id: RoleId; ar: string; en: string }[] = [
  { id: "owner", ar: "الأونر", en: "Owner" },
  { id: "finance", ar: "المدير المالي", en: "Financial Manager" },
  { id: "manager", ar: "مدير المطعم", en: "Restaurant Manager" },
  { id: "cashier", ar: "كاشير", en: "Cashier" },
];

/* Permission matrix — true means role has access to that area in this phase */
export const PERMISSIONS: Record<
  RoleId,
  {
    dashboard: boolean;
    products: boolean;
    categories: boolean;
    addons: boolean;
    users: boolean;
    cashiers: boolean;
    shifts: boolean;
    orders: boolean;
    customers: boolean;
    reports: boolean;
    settings: boolean;
    pos: boolean;
    /* placeholders for next phases */
    expenses: boolean;
    accounting: boolean;
    suppliers: boolean;
  }
> = {
  owner: {
    dashboard: true, products: true, categories: true, addons: true, users: true,
    cashiers: true, shifts: true, orders: true, customers: true, reports: true,
    settings: true, pos: true, expenses: true, accounting: true, suppliers: true,
  },
  finance: {
    dashboard: true, products: false, categories: false, addons: false, users: false,
    cashiers: false, shifts: true, orders: true, customers: true, reports: true,
    settings: false, pos: false, expenses: true, accounting: true, suppliers: true,
  },
  manager: {
    dashboard: true, products: true, categories: true, addons: true, users: false,
    cashiers: true, shifts: true, orders: true, customers: true, reports: true,
    settings: false, pos: true, expenses: false, accounting: false, suppliers: false,
  },
  cashier: {
    dashboard: false, products: false, categories: false, addons: false, users: false,
    cashiers: false, shifts: false, orders: false, customers: false, reports: false,
    settings: false, pos: true, expenses: false, accounting: false, suppliers: false,
  },
};

export type UserRecord = {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: RoleId;
  active: boolean;
  lastLogin?: number;
  /** Dashboard password (manager/owner/finance) */
  password?: string;
  /** POS PIN (cashier) */
  pin?: string;
};

export const INITIAL_USERS: UserRecord[] = [
  { id: "u_owner", name: "سلطان العبدلي", username: "owner", email: "owner@yellowchicken.sa", role: "owner", active: true, lastLogin: Date.now() - 1000 * 60 * 60 * 3 },
  { id: "u_fin", name: "ماجد القرشي", username: "finance", email: "finance@yellowchicken.sa", role: "finance", active: true, lastLogin: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "u_mgr", name: "خالد الحربي", username: "manager", email: "manager@yellowchicken.sa", role: "manager", active: true, lastLogin: Date.now() - 1000 * 60 * 40 },
  { id: "u_c1", name: "أحمد العتيبي", username: "ahmed", role: "cashier", active: true, lastLogin: Date.now() - 1000 * 60 * 15 },
  { id: "u_c2", name: "محمد الزهراني", username: "mohammed", role: "cashier", active: true, lastLogin: Date.now() - 1000 * 60 * 60 * 18 },
];

export type CashierRecord = {
  id: string;
  name: string;
  username: string;
  shiftStatus: "open" | "closed";
  todaySales: number;
  todayOrders: number;
  lastClose: number;
  active: boolean;
};

export const INITIAL_CASHIERS: CashierRecord[] = [
  { id: "cash_1", name: "أحمد العتيبي", username: "ahmed", shiftStatus: "open", todaySales: 1240.5, todayOrders: 38, lastClose: Date.now() - 1000 * 60 * 60 * 24, active: true },
  { id: "cash_2", name: "محمد الزهراني", username: "mohammed", shiftStatus: "closed", todaySales: 1875.25, todayOrders: 54, lastClose: Date.now() - 1000 * 60 * 60 * 9, active: true },
];

export type ModifierGroupRecord = {
  id: string;
  ar: string;
  en: string;
  required: boolean;
  multi: boolean;
  categories: string[]; // category ids from data.ts
  options: { id: string; ar: string; en: string; price: number }[];
};

export const INITIAL_MODIFIER_GROUPS: ModifierGroupRecord[] = [
  {
    id: "mg_spice",
    ar: "اختيار النوع",
    en: "Spice Level",
    required: true,
    multi: false,
    categories: ["broasted"],
    options: [
      { id: "opt_normal", ar: "عادي", en: "Regular", price: 0 },
      { id: "opt_spicy", ar: "حار", en: "Spicy", price: 0 },
    ],
  },
  {
    id: "mg_removals",
    ar: "الإزالات",
    en: "Removals",
    required: false,
    multi: true,
    categories: ["burger", "sandwich", "clubs"],
    options: [
      { id: "opt_no_lettuce", ar: "بدون خس", en: "No lettuce", price: 0 },
      { id: "opt_no_tomato", ar: "بدون طماطم", en: "No tomato", price: 0 },
      { id: "opt_no_pickle", ar: "بدون مخلل", en: "No pickles", price: 0 },
      { id: "opt_no_chili", ar: "بدون شطة", en: "No chili", price: 0 },
      { id: "opt_no_ketchup", ar: "بدون كاتشب", en: "No ketchup", price: 0 },
      { id: "opt_no_sauce", ar: "بدون صوص", en: "No sauce", price: 0 },
    ],
  },
  {
    id: "mg_paid",
    ar: "إضافات مدفوعة",
    en: "Paid Addons",
    required: false,
    multi: true,
    categories: ["burger", "sandwich", "special"],
    options: [
      { id: "opt_cheese", ar: "زيادة جبن", en: "Extra cheese", price: 2 },
      { id: "opt_sauce", ar: "زيادة صوص", en: "Extra sauce", price: 1 },
      { id: "opt_chicken", ar: "زيادة دجاج", en: "Extra chicken", price: 5 },
      { id: "opt_meat", ar: "زيادة لحم", en: "Extra meat", price: 6 },
      { id: "opt_sauce_cup", ar: "صوص إضافي", en: "Extra sauce cup", price: 1 },
    ],
  },
];

export type CustomerRecord = {
  phone: string;
  orders: number;
  total: number;
  lastOrderAt: number;
  lastOrderTotal: number;
};

export const INITIAL_CUSTOMERS: CustomerRecord[] = [
  { phone: "0551234567", orders: 12, total: 482.5, lastOrderAt: Date.now() - 1000 * 60 * 45, lastOrderTotal: 67.25 },
  { phone: "0509876543", orders: 5, total: 198.0, lastOrderAt: Date.now() - 1000 * 60 * 60 * 6, lastOrderTotal: 38.0 },
  { phone: "0534567812", orders: 28, total: 1240.75, lastOrderAt: Date.now() - 1000 * 60 * 60 * 24, lastOrderTotal: 54.5 },
  { phone: "0567894321", orders: 2, total: 44.0, lastOrderAt: Date.now() - 1000 * 60 * 60 * 72, lastOrderTotal: 22.0 },
  { phone: "0598765432", orders: 9, total: 312.5, lastOrderAt: Date.now() - 1000 * 60 * 60 * 30, lastOrderTotal: 41.0 },
];

export type ShiftRecord = {
  id: string;
  cashier: string;
  openTime: number;
  closeTime?: number;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  applePay: number;
  visa: number;
  refunds: number;
  expenses: number;
  additions: number;
  discounts: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  netSales: number;
  status: "open" | "closed";
  ordersCount: number;
};

export const INITIAL_SHIFTS: ShiftRecord[] = [
  {
    id: "S-1024", cashier: "أحمد العتيبي",
    openTime: Date.now() - 1000 * 60 * 60 * 4, openingCash: 200,
    cashSales: 540, cardSales: 700, applePay: 180, visa: 220, refunds: 22, expenses: 30, additions: 0, discounts: 18,
    expectedCash: 690, actualCash: 690, difference: 0, netSales: 1240.5, status: "open", ordersCount: 38,
  },
  {
    id: "S-1023", cashier: "محمد الزهراني",
    openTime: Date.now() - 1000 * 60 * 60 * 12, closeTime: Date.now() - 1000 * 60 * 60 * 4, openingCash: 200,
    cashSales: 980, cardSales: 720, applePay: 95, visa: 180, refunds: 30, expenses: 45, additions: 50, discounts: 22,
    expectedCash: 1155, actualCash: 1150, difference: -5, netSales: 1875.25, status: "closed", ordersCount: 54,
  },
  {
    id: "S-1022", cashier: "أحمد العتيبي",
    openTime: Date.now() - 1000 * 60 * 60 * 28, closeTime: Date.now() - 1000 * 60 * 60 * 20, openingCash: 200,
    cashSales: 760, cardSales: 540, applePay: 120, visa: 200, refunds: 12, expenses: 25, additions: 0, discounts: 14,
    expectedCash: 923, actualCash: 925, difference: 2, netSales: 1620.0, status: "closed", ordersCount: 47,
  },
];

export const COMPANY_LEGAL = {
  legalAr: "شركة مطاعم سلطان العبدلي لتقديم الوجبات",
  legalEn: "Sultan Al-Abdali Restaurants Meal Services Co.",
  brandAr: "يلو تشكن",
  brandEn: "Yellow Chicken",
  branchAr: "مكة المكرمة - حي الشوقية",
  branchEn: "Makkah — Al-Shawqiyyah",
  vatNumber: "300000000000003",
  crNumber: "—",
  nationalAddress: "—",
};
