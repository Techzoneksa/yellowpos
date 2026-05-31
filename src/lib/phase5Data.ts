// ============================================================
// Phase 5 — ZATCA / E-Invoicing UI PREPARATION (frontend only)
// ============================================================
// IMPORTANT: This file contains UI-only seed data. It does NOT
// connect to ZATCA, does NOT generate production XML / QR / CSID,
// and must NOT be used to claim compliance.
// ============================================================

export type ZatcaInvoiceStatus =
  | "ui_preview"
  | "pending_sync"
  | "synced"
  | "failed"
  | "rejected"
  | "offline_queued";

export const INVOICE_STATUS_LABELS: Record<ZatcaInvoiceStatus, { ar: string; en: string; tone: string }> = {
  ui_preview:     { ar: "معاينة فقط",      en: "UI Preview",      tone: "bg-muted text-foreground" },
  pending_sync:   { ar: "بانتظار المزامنة", en: "Pending sync",    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  synced:         { ar: "تمت المزامنة",     en: "Synced",          tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  failed:         { ar: "فشل",              en: "Failed",          tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  rejected:       { ar: "مرفوضة",           en: "Rejected",        tone: "bg-rose-500/20 text-rose-800 dark:text-rose-200" },
  offline_queued: { ar: "في قائمة الانتظار", en: "Offline queued",  tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
};

/* ───────────── Company Tax Profile ───────────── */
export type CompanyTaxProfile = {
  legalNameAr: string;
  legalNameEn: string;
  brandAr: string;
  brandEn: string;
  vatNumber: string;
  crNumber: string;
  nationalAddress: string;
  city: string;
  district: string;
  branchName: string;
  vatRate: number;
  pricesIncludeVat: boolean;
  invoiceTypeAr: string;
  invoiceTypeEn: string;
};

export const INITIAL_TAX_PROFILE: CompanyTaxProfile = {
  legalNameAr: "شركة مطاعم سلطان العبدلي لتقديم الوجبات",
  legalNameEn: "Sultan Al-Abdali Restaurants Meal Services Co.",
  brandAr: "يلو تشكن",
  brandEn: "Yellow Chicken",
  vatNumber: "",
  crNumber: "",
  nationalAddress: "",
  city: "مكة المكرمة",
  district: "حي الشوقية",
  branchName: "Yellow Chicken - الشوقية",
  vatRate: 15,
  pricesIncludeVat: true,
  invoiceTypeAr: "فاتورة ضريبية مبسطة",
  invoiceTypeEn: "Simplified Tax Invoice",
};

/* ───────────── POS Device Onboarding ───────────── */
export type OnboardingStatus = "not_connected" | "draft_saved" | "otp_entered" | "ready_for_backend";
export type PosDevice = {
  deviceName: string;
  deviceType: "Web POS" | "Tablet POS" | "Desktop POS";
  branch: string;
  environment: "simulation" | "production_placeholder";
  otp: string;
  status: OnboardingStatus;
};

export const INITIAL_POS_DEVICE: PosDevice = {
  deviceName: "Yellow Chicken POS 01",
  deviceType: "Web POS",
  branch: "مكة المكرمة - حي الشوقية",
  environment: "simulation",
  otp: "",
  status: "not_connected",
};

/* ───────────── Invoice Template Settings ───────────── */
export type InvoiceTemplate = {
  width: "58mm" | "80mm";
  printer: "USB" | "Bluetooth" | "Network";
  method: "browser" | "driver";
  copies: number;
  showLegal: boolean;
  showBrand: boolean;
  showBranchAddress: boolean;
  showVatNumber: boolean;
  showCrNumber: boolean;
  showInvoiceNumber: boolean;
  showOrderNumber: boolean;
  showCashier: boolean;
  showPaymentMethod: boolean;
  showVatBreakdown: boolean;
  showQrPreview: boolean;
  showInvoiceStatus: boolean;
};

export const INITIAL_INVOICE_TEMPLATE: InvoiceTemplate = {
  width: "80mm", printer: "USB", method: "browser", copies: 2,
  showLegal: true, showBrand: true, showBranchAddress: true, showVatNumber: true,
  showCrNumber: false, showInvoiceNumber: true, showOrderNumber: true,
  showCashier: true, showPaymentMethod: true, showVatBreakdown: true,
  showQrPreview: true, showInvoiceStatus: true,
};

/* ───────────── E-Invoice Preview (sample) ───────────── */
export const SAMPLE_PREVIEW_INVOICE = {
  invoiceNumber: "INV-2026-000142",
  orderNumber: "Q-018",
  date: "2026-05-18 14:22",
  cashier: "أحمد العتيبي",
  orderType: "Dine in",
  paymentMethod: "Mada",
  items: [
    { ar: "بروست 4 قطع",   en: "Broasted 4 pcs",  qty: 1, price: 28.00 },
    { ar: "فرنش فرايز صغير", en: "French Fries S",  qty: 1, price: 7.00 },
    { ar: "صوص إضافي",     en: "Extra Sauce",     qty: 2, price: 2.00 },
  ],
  discount: 0,
};

/* ───────────── Sync Queue ───────────── */
export type SyncRow = {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  datetime: string;
  total: number;
  payment: string;
  status: ZatcaInvoiceStatus;
  retryCount: number;
  lastAttempt: string;
};

export const INITIAL_SYNC_QUEUE: SyncRow[] = [
  { id: "s1", invoiceNumber: "INV-2026-000138", orderNumber: "Q-014", datetime: "2026-05-18 13:02", total: 42.50, payment: "Cash",   status: "pending_sync",   retryCount: 0, lastAttempt: "—" },
  { id: "s2", invoiceNumber: "INV-2026-000139", orderNumber: "Q-015", datetime: "2026-05-18 13:18", total: 18.40, payment: "Mada",   status: "offline_queued", retryCount: 0, lastAttempt: "—" },
  { id: "s3", invoiceNumber: "INV-2026-000140", orderNumber: "Q-016", datetime: "2026-05-18 13:41", total: 67.20, payment: "Mada",   status: "synced",         retryCount: 1, lastAttempt: "2026-05-18 13:42" },
  { id: "s4", invoiceNumber: "INV-2026-000141", orderNumber: "Q-017", datetime: "2026-05-18 14:05", total: 23.00, payment: "Cash",   status: "failed",         retryCount: 2, lastAttempt: "2026-05-18 14:06" },
  { id: "s5", invoiceNumber: "INV-2026-000142", orderNumber: "Q-018", datetime: "2026-05-18 14:22", total: 39.00, payment: "Mada",   status: "pending_sync",   retryCount: 0, lastAttempt: "—" },
];

/* ───────────── Failed Invoices ───────────── */
export type FailedInvoice = {
  id: string;
  invoiceNumber: string;
  datetime: string;
  errorType: string;
  errorMessage: string;
  amount: number;
  status: "open" | "in_review" | "resolved";
  notes: { at: string; by: string; text: string }[];
};

export const INITIAL_FAILED: FailedInvoice[] = [
  {
    id: "f1", invoiceNumber: "INV-2026-000141", datetime: "2026-05-18 14:06",
    errorType: "Missing VAT number",
    errorMessage: "Seller VAT number is required by simplified invoice schema.",
    amount: 23.00, status: "open", notes: [],
  },
  {
    id: "f2", invoiceNumber: "INV-2026-000127", datetime: "2026-05-18 11:31",
    errorType: "Backend integration not configured",
    errorMessage: "ZATCA integration service is not connected yet (UI phase only).",
    amount: 54.10, status: "in_review", notes: [{ at: "2026-05-18 12:00", by: "Manager", text: "بانتظار فريق التكامل." }],
  },
  {
    id: "f3", invoiceNumber: "INV-2026-000119", datetime: "2026-05-18 10:14",
    errorType: "Network unavailable",
    errorMessage: "Could not reach ZATCA endpoint during simulation.",
    amount: 12.50, status: "open", notes: [],
  },
];

/* ───────────── Offline Mode ───────────── */
export type OfflineSettings = {
  enabled: boolean;
  allowSalesWhileOffline: boolean;
  storeLocally: boolean;
  warnCashier: boolean;
  autoSyncOnReturn: boolean;
};
export const INITIAL_OFFLINE: OfflineSettings = {
  enabled: true, allowSalesWhileOffline: true, storeLocally: true,
  warnCashier: true, autoSyncOnReturn: true,
};

/* ───────────── Compliance Checklist ───────────── */
export type ChecklistStatus = "completed" | "missing" | "pending_backend" | "needs_review";
export type ChecklistItem = { id: string; ar: string; en: string; status: ChecklistStatus };
export type ChecklistGroup = { ar: string; en: string; items: ChecklistItem[] };

export const INITIAL_CHECKLIST: ChecklistGroup[] = [
  {
    ar: "بيانات الشركة", en: "Company Data",
    items: [
      { id: "c1", ar: "اسم الشركة القانوني", en: "Legal company name", status: "completed" },
      { id: "c2", ar: "الرقم الضريبي",       en: "VAT number",         status: "missing" },
      { id: "c3", ar: "السجل التجاري",        en: "Commercial registration", status: "missing" },
      { id: "c4", ar: "العنوان الوطني",        en: "National address",    status: "missing" },
      { id: "c5", ar: "عنوان الفرع",           en: "Branch address",      status: "completed" },
    ],
  },
  {
    ar: "بيانات الفاتورة", en: "Invoice Data",
    items: [
      { id: "i1", ar: "رقم الفاتورة",        en: "Invoice number",         status: "completed" },
      { id: "i2", ar: "التاريخ والوقت",       en: "Date and time",          status: "completed" },
      { id: "i3", ar: "بيانات البائع",        en: "Seller information",     status: "needs_review" },
      { id: "i4", ar: "تفاصيل الضريبة",       en: "VAT details",            status: "completed" },
      { id: "i5", ar: "الإجمالي شامل الضريبة", en: "Total including VAT",    status: "completed" },
      { id: "i6", ar: "رمز QR",              en: "QR code",                status: "pending_backend" },
      { id: "i7", ar: "طريقة الدفع",          en: "Payment method",         status: "completed" },
    ],
  },
  {
    ar: "إعداد الجهاز", en: "Device Setup",
    items: [
      { id: "d1", ar: "جهاز إصدار واحد",     en: "One POS issuing device", status: "completed" },
      { id: "d2", ar: "اسم الجهاز",           en: "Device name",            status: "completed" },
      { id: "d3", ar: "OTP جاهز",             en: "OTP ready",              status: "missing" },
      { id: "d4", ar: "تسجيل الجهاز (Backend)", en: "Backend onboarding",   status: "pending_backend" },
      { id: "d5", ar: "إصدار CSID",           en: "CSID issuance",          status: "pending_backend" },
      { id: "d6", ar: "الاتصال بالإنتاج",      en: "Production connection",  status: "pending_backend" },
    ],
  },
  {
    ar: "وضع عدم الاتصال", en: "Offline Handling",
    items: [
      { id: "o1", ar: "قائمة انتظار محلية", en: "Offline queue UI",   status: "completed" },
      { id: "o2", ar: "حالة المزامنة",      en: "Sync status UI",     status: "completed" },
      { id: "o3", ar: "الفواتير الفاشلة",   en: "Failed invoices UI", status: "completed" },
      { id: "o4", ar: "إعادة المحاولة",      en: "Retry UI",           status: "completed" },
    ],
  },
  {
    ar: "بانتظار التكامل الخلفي", en: "Backend Integration Pending",
    items: [
      { id: "b1", ar: "توليد XML الإنتاجي",  en: "Real XML generation",       status: "pending_backend" },
      { id: "b2", ar: "توليد QR وفق المتطلبات", en: "Real QR generation",     status: "pending_backend" },
      { id: "b3", ar: "إصدار CSID",            en: "CSID generation",          status: "pending_backend" },
      { id: "b4", ar: "الختم التشفيري",        en: "Cryptographic stamp",      status: "pending_backend" },
      { id: "b5", ar: "نداءات API لزاتكا",     en: "ZATCA API calls",          status: "pending_backend" },
      { id: "b6", ar: "اختبار الإنتاج",        en: "Production testing",       status: "pending_backend" },
    ],
  },
];

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, { ar: string; en: string; tone: string }> = {
  completed:       { ar: "مكتمل",          en: "Completed",       tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  missing:         { ar: "ناقص",           en: "Missing",         tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  pending_backend: { ar: "بانتظار التكامل", en: "Pending backend", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  needs_review:    { ar: "بحاجة لمراجعة",  en: "Needs review",    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
};

/* ───────────── Sample XML preview (UI only, NOT production) ───────────── */
export const SAMPLE_XML_PREVIEW = `<!-- Sample XML structure preview only — not production XML -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>INV-2026-000142</ID>
  <IssueDate>2026-05-18</IssueDate>
  <IssueTime>14:22:00</IssueTime>
  <InvoiceTypeCode name="0200000">388</InvoiceTypeCode>
  <DocumentCurrencyCode>SAR</DocumentCurrencyCode>
  <AccountingSupplierParty>
    <Party>
      <PartyName><Name>Yellow Chicken</Name></PartyName>
      <PartyLegalEntity>
        <RegistrationName>شركة مطاعم سلطان العبدلي لتقديم الوجبات</RegistrationName>
      </PartyLegalEntity>
      <PartyTaxScheme>
        <CompanyID>{{ VAT_NUMBER }}</CompanyID>
        <TaxScheme><ID>VAT</ID></TaxScheme>
      </PartyTaxScheme>
    </Party>
  </AccountingSupplierParty>
  <TaxTotal>
    <TaxAmount currencyID="SAR">5.09</TaxAmount>
  </TaxTotal>
  <LegalMonetaryTotal>
    <TaxInclusiveAmount currencyID="SAR">39.00</TaxInclusiveAmount>
    <PayableAmount      currencyID="SAR">39.00</PayableAmount>
  </LegalMonetaryTotal>
  <!-- Items, allowances, signatures, QR and CSID are generated by the backend integration phase. -->
</Invoice>`;
