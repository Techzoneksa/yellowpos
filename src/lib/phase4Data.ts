/* Phase 4 — Expenses, Banks, Chart of Accounts, Journal Entries,
   Supplier Payments, Employees, Payroll, Financial Reports.
   Frontend / local-state only. No backend, no DB, no real accounting engine. */

export type ExpenseCategoryId =
  | "salary" | "electricity" | "water" | "internet" | "rent"
  | "ads" | "license" | "maintenance" | "advance" | "other";

export const EXPENSE_CATEGORIES: { id: ExpenseCategoryId; ar: string; en: string; accountCode: string }[] = [
  { id: "salary", ar: "رواتب", en: "Salaries", accountCode: "5020" },
  { id: "electricity", ar: "كهرباء", en: "Electricity", accountCode: "5030" },
  { id: "water", ar: "ماء", en: "Water", accountCode: "5030" },
  { id: "internet", ar: "إنترنت", en: "Internet", accountCode: "5030" },
  { id: "rent", ar: "إيجار", en: "Rent", accountCode: "5040" },
  { id: "ads", ar: "إعلانات", en: "Advertising", accountCode: "5050" },
  { id: "license", ar: "تراخيص", en: "Licenses", accountCode: "5060" },
  { id: "maintenance", ar: "صيانة", en: "Maintenance", accountCode: "5070" },
  { id: "advance", ar: "سلفة عامل", en: "Employee Advance", accountCode: "1110" },
  { id: "other", ar: "مصاريف أخرى", en: "Other Expenses", accountCode: "5090" },
];

export type AccountType = "cashbox" | "bank" | "network";

export type FinanceAccount = {
  id: string;
  ar: string;
  en: string;
  type: AccountType;
  accountCode: string; // links to chart of accounts
  openingBalance: number;
  balance: number;
  lastMovementAt?: number;
};

export type BankMovementType =
  | "sale" | "expense" | "supplier_payment" | "salary"
  | "cash_in" | "cash_out" | "transfer" | "manual";

export type BankMovement = {
  id: string;
  date: number;
  accountId: string;
  type: BankMovementType;
  ref: string;
  description: string;
  in: number;
  out: number;
  balance: number;
  user: string;
  notes?: string;
  attachment?: string;
};

export type Expense = {
  id: string;
  number: string;
  date: number;
  categoryId: ExpenseCategoryId;
  description: string;
  paidFromAccountId: string;
  amount: number;
  vat: number;
  total: number;
  attachment?: string;
  createdBy: string;
  notes?: string;
};

export type ChartAccountType = "asset" | "liability" | "revenue" | "expense" | "equity";

export type ChartAccount = {
  code: string;
  ar: string;
  en: string;
  type: ChartAccountType;
  parent?: string;
  balance: number;
  active: boolean;
};

export type JournalSource =
  | "pos" | "purchase" | "supplier_payment"
  | "expense" | "salary" | "waste" | "manual";

export type JournalStatus = "posted" | "draft" | "reversed";

export type JournalLine = {
  accountCode: string;
  debit: number;
  credit: number;
  notes?: string;
};

export type JournalEntry = {
  id: string;
  number: string;
  date: number;
  source: JournalSource;
  description: string;
  lines: JournalLine[];
  status: JournalStatus;
  attachment?: string;
  createdBy: string;
};

export type SupplierPayment = {
  id: string;
  number: string;
  date: number;
  supplierId: string;
  paidFromAccountId: string;
  amount: number;
  method: "cash" | "bank";
  reference?: string;
  attachment?: string;
  notes?: string;
  createdBy: string;
};

export type EmployeeStatus = "active" | "disabled";

export type EmployeeAdjustment = {
  id: string;
  date: number;
  amount: number;
  notes?: string;
};

export type Employee = {
  id: string;
  name: string;
  jobTitle: string;
  mobile: string;
  monthlySalary: number;
  startDate: number;
  status: EmployeeStatus;
  notes?: string;
  advances: EmployeeAdjustment[];
  deductions: EmployeeAdjustment[];
};

export const JOB_TITLES: { id: string; ar: string; en: string }[] = [
  { id: "cashier", ar: "كاشير", en: "Cashier" },
  { id: "manager", ar: "مدير مطعم", en: "Restaurant Manager" },
  { id: "accountant", ar: "محاسب", en: "Accountant" },
  { id: "prep", ar: "عامل تحضير", en: "Prep Worker" },
  { id: "cleaner", ar: "عامل نظافة", en: "Cleaner" },
  { id: "chef", ar: "شيف", en: "Chef" },
];

export type SalaryStatus = "unpaid" | "paid" | "partial";

export type SalaryRecord = {
  id: string;
  month: string; // "YYYY-MM"
  employeeId: string;
  basic: number;
  advances: number;
  deductions: number;
  net: number;
  status: SalaryStatus;
  paidFromAccountId?: string;
  paidDate?: number;
  paidAmount?: number;
  notes?: string;
};

/* ───── Seeds ───── */
const now = Date.now();
const hours = (h: number) => now - h * 3600 * 1000;
const days = (d: number) => now - d * 86400 * 1000;

const monthKey = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const CUR_MONTH = monthKey(0);
export const PREV_MONTH = monthKey(1);

export const INITIAL_ACCOUNTS: FinanceAccount[] = [
  { id: "cb_main", ar: "صندوق المحل", en: "Main Cashbox", type: "cashbox", accountCode: "1010", openingBalance: 5000, balance: 7340, lastMovementAt: hours(2) },
  { id: "bk_ahli", ar: "البنك الأهلي", en: "Al Ahli Bank", type: "bank", accountCode: "1020", openingBalance: 25000, balance: 28450, lastMovementAt: hours(20) },
  { id: "bk_rajhi", ar: "بنك الراجحي", en: "Al Rajhi Bank", type: "bank", accountCode: "1030", openingBalance: 12000, balance: 9800, lastMovementAt: days(3) },
  { id: "net_mada", ar: "جهاز الشبكة / مدى", en: "Mada Terminal", type: "network", accountCode: "1040", openingBalance: 0, balance: 1850, lastMovementAt: hours(5) },
];

export const INITIAL_MOVEMENTS: BankMovement[] = [
  { id: "bm1", date: hours(2), accountId: "cb_main", type: "sale", ref: "Shift S-1024", description: "مبيعات نقدية - وردية اليوم", in: 2340, out: 0, balance: 7340, user: "أحمد العتيبي" },
  { id: "bm2", date: hours(4), accountId: "cb_main", type: "expense", ref: "EXP-1003", description: "إيجار شهري", in: 0, out: 0, balance: 5000, user: "خالد سعيد" },
  { id: "bm3", date: hours(5), accountId: "net_mada", type: "sale", ref: "Shift S-1024", description: "مبيعات شبكة - مدى", in: 1850, out: 0, balance: 1850, user: "أحمد العتيبي" },
  { id: "bm4", date: hours(20), accountId: "bk_ahli", type: "sale", ref: "Settlement", description: "تسوية مبيعات الشبكة", in: 4200, out: 0, balance: 28450, user: "النظام" },
  { id: "bm5", date: days(3), accountId: "bk_rajhi", type: "supplier_payment", ref: "SP-501", description: "دفعة لمورد الدجاج الطازج", in: 0, out: 2200, balance: 9800, user: "فهد ناصر" },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: "EXP-1001", number: "EXP-1001", date: days(1), categoryId: "electricity", description: "فاتورة الكهرباء - شهر سابق", paidFromAccountId: "bk_ahli", amount: 1450, vat: 217.5, total: 1667.5, createdBy: "فهد ناصر", attachment: "elec-april.pdf" },
  { id: "EXP-1002", number: "EXP-1002", date: days(2), categoryId: "internet", description: "اشتراك إنترنت STC شهري", paidFromAccountId: "bk_ahli", amount: 350, vat: 52.5, total: 402.5, createdBy: "فهد ناصر" },
  { id: "EXP-1003", number: "EXP-1003", date: hours(4), categoryId: "rent", description: "إيجار المحل - الشوقية", paidFromAccountId: "cb_main", amount: 4500, vat: 0, total: 4500, createdBy: "خالد سعيد", attachment: "rent-receipt.jpg" },
  { id: "EXP-1004", number: "EXP-1004", date: days(4), categoryId: "maintenance", description: "صيانة الفريزر الرئيسي", paidFromAccountId: "cb_main", amount: 320, vat: 48, total: 368, createdBy: "خالد سعيد" },
  { id: "EXP-1005", number: "EXP-1005", date: days(6), categoryId: "ads", description: "حملة سناب شات أسبوعية", paidFromAccountId: "bk_ahli", amount: 800, vat: 120, total: 920, createdBy: "فهد ناصر" },
  { id: "EXP-1006", number: "EXP-1006", date: days(7), categoryId: "advance", description: "سلفة لأحمد محمد - كاشير", paidFromAccountId: "cb_main", amount: 500, vat: 0, total: 500, createdBy: "خالد سعيد", notes: "تخصم من راتب الشهر القادم" },
];

export const INITIAL_CHART: ChartAccount[] = [
  // Assets
  { code: "1000", ar: "الأصول", en: "Assets", type: "asset", balance: 0, active: true },
  { code: "1010", ar: "الصندوق / النقدية", en: "Cash on hand", type: "asset", parent: "1000", balance: 7340, active: true },
  { code: "1020", ar: "البنك الأهلي", en: "Al Ahli Bank", type: "asset", parent: "1000", balance: 28450, active: true },
  { code: "1030", ar: "بنك الراجحي", en: "Al Rajhi Bank", type: "asset", parent: "1000", balance: 9800, active: true },
  { code: "1040", ar: "جهاز الشبكة / مدى", en: "Mada Terminal", type: "asset", parent: "1000", balance: 1850, active: true },
  { code: "1100", ar: "المخزون", en: "Inventory", type: "asset", parent: "1000", balance: 6840, active: true },
  { code: "1110", ar: "سلف الموظفين", en: "Employee Advances", type: "asset", parent: "1000", balance: 500, active: true },
  // Liabilities
  { code: "2000", ar: "الخصوم", en: "Liabilities", type: "liability", balance: 0, active: true },
  { code: "2010", ar: "الموردون", en: "Accounts Payable", type: "liability", parent: "2000", balance: 7100, active: true },
  { code: "2020", ar: "ضريبة القيمة المضافة المستحقة", en: "VAT Payable", type: "liability", parent: "2000", balance: 2340, active: true },
  { code: "2030", ar: "رواتب مستحقة", en: "Salaries Payable", type: "liability", parent: "2000", balance: 18500, active: true },
  // Revenue
  { code: "4000", ar: "الإيرادات", en: "Revenue", type: "revenue", balance: 0, active: true },
  { code: "4010", ar: "المبيعات", en: "Sales", type: "revenue", parent: "4000", balance: 42830, active: true },
  { code: "4020", ar: "خصومات المبيعات", en: "Sales Discounts", type: "revenue", parent: "4000", balance: 640, active: true },
  { code: "4030", ar: "مردودات المبيعات", en: "Sales Returns", type: "revenue", parent: "4000", balance: 285, active: true },
  // Expenses
  { code: "5000", ar: "المصروفات", en: "Expenses", type: "expense", balance: 0, active: true },
  { code: "5010", ar: "المشتريات", en: "Purchases / COGS", type: "expense", parent: "5000", balance: 7066.75, active: true },
  { code: "5020", ar: "الرواتب", en: "Salaries", type: "expense", parent: "5000", balance: 0, active: true },
  { code: "5030", ar: "الكهرباء والمياه والإنترنت", en: "Utilities & Internet", type: "expense", parent: "5000", balance: 1800, active: true },
  { code: "5040", ar: "الإيجار", en: "Rent", type: "expense", parent: "5000", balance: 4500, active: true },
  { code: "5050", ar: "الإعلانات", en: "Advertising", type: "expense", parent: "5000", balance: 800, active: true },
  { code: "5060", ar: "التراخيص", en: "Licenses", type: "expense", parent: "5000", balance: 0, active: true },
  { code: "5070", ar: "الصيانة", en: "Maintenance", type: "expense", parent: "5000", balance: 320, active: true },
  { code: "5080", ar: "الهدر والتالف", en: "Waste / Damaged Goods", type: "expense", parent: "5000", balance: 840, active: true },
  { code: "5090", ar: "مصاريف أخرى", en: "Other Expenses", type: "expense", parent: "5000", balance: 0, active: true },
  // Equity
  { code: "3000", ar: "حقوق الملكية", en: "Equity", type: "equity", balance: 0, active: true },
  { code: "3010", ar: "رأس المال", en: "Capital", type: "equity", parent: "3000", balance: 50000, active: true },
  { code: "3020", ar: "مسحوبات المالك", en: "Owner Drawings", type: "equity", parent: "3000", balance: 0, active: true },
];

export const INITIAL_JOURNAL: JournalEntry[] = [
  {
    id: "JE-2001", number: "JE-2001", date: hours(2), source: "pos",
    description: "قيد مبيعات الوردية S-1024 - نقدًا",
    lines: [
      { accountCode: "1010", debit: 2340, credit: 0, notes: "صندوق المحل" },
      { accountCode: "4010", debit: 0, credit: 2034.78, notes: "صافي المبيعات" },
      { accountCode: "2020", debit: 0, credit: 305.22, notes: "ضريبة القيمة المضافة" },
    ],
    status: "posted", createdBy: "النظام",
  },
  {
    id: "JE-2002", number: "JE-2002", date: hours(4), source: "expense",
    description: "قيد مصروف إيجار - EXP-1003",
    lines: [
      { accountCode: "5040", debit: 4500, credit: 0 },
      { accountCode: "1010", debit: 0, credit: 4500 },
    ],
    status: "posted", createdBy: "خالد سعيد", attachment: "rent-receipt.jpg",
  },
  {
    id: "JE-2003", number: "JE-2003", date: days(2), source: "purchase",
    description: "قيد فاتورة مشتريات P-1001 - آجل",
    lines: [
      { accountCode: "1100", debit: 4200, credit: 0, notes: "زيادة المخزون" },
      { accountCode: "2020", debit: 630, credit: 0, notes: "ضريبة مدخلات" },
      { accountCode: "2010", debit: 0, credit: 4830, notes: "مستحق لمورد الدجاج" },
    ],
    status: "posted", createdBy: "خالد الحربي",
  },
  {
    id: "JE-2004", number: "JE-2004", date: days(3), source: "supplier_payment",
    description: "قيد دفعة لمورد الدجاج - SP-501",
    lines: [
      { accountCode: "2010", debit: 2200, credit: 0 },
      { accountCode: "1030", debit: 0, credit: 2200, notes: "بنك الراجحي" },
    ],
    status: "posted", createdBy: "فهد ناصر",
  },
  {
    id: "JE-2005", number: "JE-2005", date: days(1), source: "expense",
    description: "قيد فاتورة الكهرباء - EXP-1001",
    lines: [
      { accountCode: "5030", debit: 1450, credit: 0 },
      { accountCode: "2020", debit: 217.5, credit: 0 },
      { accountCode: "1020", debit: 0, credit: 1667.5 },
    ],
    status: "posted", createdBy: "فهد ناصر",
  },
  {
    id: "JE-2006", number: "JE-2006", date: hours(6), source: "waste",
    description: "قيد هدر دجاج - W-2001",
    lines: [
      { accountCode: "5080", debit: 840, credit: 0 },
      { accountCode: "1100", debit: 0, credit: 840 },
    ],
    status: "posted", createdBy: "أحمد العتيبي",
  },
];

export const INITIAL_SUPPLIER_PAYMENTS: SupplierPayment[] = [
  {
    id: "SP-501", number: "SP-501", date: days(3),
    supplierId: "sup_chicken", paidFromAccountId: "bk_rajhi",
    amount: 2200, method: "bank", reference: "TRX-558821",
    attachment: "transfer-558821.pdf", createdBy: "فهد ناصر",
    notes: "دفعة جزئية على فاتورة FC-22841",
  },
  {
    id: "SP-502", number: "SP-502", date: days(8),
    supplierId: "sup_packaging", paidFromAccountId: "cb_main",
    amount: 158.5, method: "cash", createdBy: "خالد سعيد",
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP-1", name: "أحمد محمد", jobTitle: "cashier", mobile: "0501234567",
    monthlySalary: 3500, startDate: days(420), status: "active",
    advances: [{ id: "av1", date: days(7), amount: 500, notes: "سلفة شخصية" }],
    deductions: [],
  },
  {
    id: "EMP-2", name: "محمد علي", jobTitle: "cashier", mobile: "0502345678",
    monthlySalary: 3500, startDate: days(280), status: "active",
    advances: [], deductions: [{ id: "dd1", date: days(10), amount: 150, notes: "تأخير عن العمل" }],
  },
  {
    id: "EMP-3", name: "خالد سعيد", jobTitle: "manager", mobile: "0503456789",
    monthlySalary: 6500, startDate: days(620), status: "active",
    advances: [], deductions: [],
  },
  {
    id: "EMP-4", name: "فهد ناصر", jobTitle: "accountant", mobile: "0504567890",
    monthlySalary: 5000, startDate: days(190), status: "active",
    advances: [], deductions: [],
  },
  {
    id: "EMP-5", name: "عمر حسن", jobTitle: "prep", mobile: "0505678901",
    monthlySalary: 2800, startDate: days(95), status: "active",
    advances: [], deductions: [],
  },
];

export const INITIAL_SALARIES: SalaryRecord[] = [
  // Previous month — all paid
  { id: "PR-001", month: PREV_MONTH, employeeId: "EMP-1", basic: 3500, advances: 0, deductions: 0, net: 3500, status: "paid", paidFromAccountId: "bk_ahli", paidDate: days(20), paidAmount: 3500 },
  { id: "PR-002", month: PREV_MONTH, employeeId: "EMP-2", basic: 3500, advances: 0, deductions: 0, net: 3500, status: "paid", paidFromAccountId: "bk_ahli", paidDate: days(20), paidAmount: 3500 },
  { id: "PR-003", month: PREV_MONTH, employeeId: "EMP-3", basic: 6500, advances: 0, deductions: 0, net: 6500, status: "paid", paidFromAccountId: "bk_ahli", paidDate: days(20), paidAmount: 6500 },
  { id: "PR-004", month: PREV_MONTH, employeeId: "EMP-4", basic: 5000, advances: 0, deductions: 0, net: 5000, status: "paid", paidFromAccountId: "bk_ahli", paidDate: days(20), paidAmount: 5000 },
  { id: "PR-005", month: PREV_MONTH, employeeId: "EMP-5", basic: 2800, advances: 0, deductions: 0, net: 2800, status: "paid", paidFromAccountId: "cb_main", paidDate: days(20), paidAmount: 2800 },
  // Current month — unpaid (matches Salaries Payable 18,500)
  { id: "PR-006", month: CUR_MONTH, employeeId: "EMP-1", basic: 3500, advances: 500, deductions: 0, net: 3000, status: "unpaid" },
  { id: "PR-007", month: CUR_MONTH, employeeId: "EMP-2", basic: 3500, advances: 0, deductions: 150, net: 3350, status: "unpaid" },
  { id: "PR-008", month: CUR_MONTH, employeeId: "EMP-3", basic: 6500, advances: 0, deductions: 0, net: 6500, status: "unpaid" },
  { id: "PR-009", month: CUR_MONTH, employeeId: "EMP-4", basic: 5000, advances: 0, deductions: 0, net: 5000, status: "unpaid" },
  { id: "PR-010", month: CUR_MONTH, employeeId: "EMP-5", basic: 2800, advances: 0, deductions: 0, net: 2800, status: "unpaid" },
];

export const MOVEMENT_TYPE_LABEL: Record<BankMovementType, { ar: string; en: string }> = {
  sale: { ar: "مبيعات", en: "Sale" },
  expense: { ar: "مصروف", en: "Expense" },
  supplier_payment: { ar: "دفعة مورد", en: "Supplier Payment" },
  salary: { ar: "راتب", en: "Salary" },
  cash_in: { ar: "إيداع نقدي", en: "Cash Deposit" },
  cash_out: { ar: "سحب نقدي", en: "Cash Withdrawal" },
  transfer: { ar: "تحويل", en: "Transfer" },
  manual: { ar: "تسوية يدوية", en: "Manual Adjustment" },
};

export const JOURNAL_SOURCE_LABEL: Record<JournalSource, { ar: string; en: string }> = {
  pos: { ar: "مبيعات POS", en: "POS Sale" },
  purchase: { ar: "فاتورة شراء", en: "Purchase Invoice" },
  supplier_payment: { ar: "دفعة مورد", en: "Supplier Payment" },
  expense: { ar: "مصروف", en: "Expense" },
  salary: { ar: "راتب", en: "Salary Payment" },
  waste: { ar: "هدر", en: "Stock Waste" },
  manual: { ar: "قيد يدوي", en: "Manual Entry" },
};
