// API client - calls Next.js API routes instead of TanStack Start server functions
import { supabase } from "@/integrations/supabase/client";

const API_BASE = "";

async function apiCall<T>(endpoint: string, data?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

// Auth
export async function bootstrapStatus() {
  return apiCall<{ hasUsers: boolean }>("/api/bootstrap/status");
}

export async function bootstrapOwner(data: { fullName: string; username: string; email: string; password: string }) {
  return apiCall<{ id: string }>("/api/bootstrap/owner", data);
}

// Shifts
export async function getOpenShift() {
  return apiCall<any>("/api/shifts/get-open-shift");
}

export async function openShift(data: { opening_float: number; notes?: string }) {
  return apiCall<any>("/api/shifts/open-shift", data);
}

export async function closeShift(data: { shift_id: string; closing_cash: number; notes?: string }) {
  return apiCall<any>("/api/shifts/close-shift", data);
}

export async function getShiftSummary(data?: { shift_id?: string }) {
  return apiCall<any>("/api/shifts/shift-summary", data || {});
}

export async function listShifts(data?: { limit?: number }) {
  return apiCall<any[]>("/api/shifts/list-shifts", data || {});
}

// POS Orders
export async function createOrder(data: {
  order_type: string;
  customer_id?: string;
  notes?: string;
  discount: number;
  items: Array<{ product_id: string; quantity: number; notes?: string; addon_ids: string[] }>;
  payments: Array<{ method: string; amount: number; reference?: string }>;
}) {
  return apiCall<{ order: any; invoice: any }>("/api/pos/orders/create-order", data);
}

export async function updateOrderStatus(data: { order_id: string; status: string }) {
  return apiCall<{ ok: boolean }>("/api/pos/orders/update-order-status", data);
}

export async function listRecentOrders(data?: { q?: string; today?: boolean; shiftOnly?: boolean; limit?: number; offset?: number }) {
  return apiCall<any[]>("/api/pos/orders/list-recent-orders", data || {});
}

export async function getOrder(data: { order_id: string }) {
  return apiCall<any>("/api/pos/orders/get-order", data);
}

// Customers
export async function findCustomerByPhone(data: { phone: string }) {
  return apiCall<any>("/api/pos/customers/find-by-phone", data);
}

export async function findOrCreateCustomerByPhone(data: { phone: string; name?: string }) {
  return apiCall<any>("/api/pos/customers/find-or-create", data);
}

export async function listCustomers(data?: { q?: string; limit?: number }) {
  return apiCall<any[]>("/api/pos/customers/list-customers", data || {});
}

export async function upsertCustomer(data: { id?: string; name: string; phone?: string; notes?: string }) {
  return apiCall<any>("/api/pos/customers/upsert-customer", data);
}

// Refunds
export async function createRefund(data: {
  order_id: string;
  reason?: string;
  type: string;
  payment_method: string;
  items?: Array<{ order_item_id: string; quantity: number }>;
}) {
  return apiCall<any>("/api/pos/refunds/create-refund", data);
}

export async function listRefunds(data?: { limit?: number }) {
  return apiCall<any[]>("/api/pos/refunds/list-refunds", data || {});
}

// Held Orders
export async function holdOrder(data: {
  order_type: string;
  customer_id?: string;
  note?: string;
  cart: any;
}) {
  return apiCall<any>("/api/pos/held-orders/hold-order", data);
}

export async function listHeldOrders() {
  return apiCall<any[]>("/api/pos/held-orders/list-held-orders", {});
}

export async function resumeHeldOrder(data: { id: string }) {
  return apiCall<any>("/api/pos/held-orders/resume-held-order", data);
}

export async function discardHeldOrder(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/pos/held-orders/discard-held-order", data);
}

// Cash Movements
export async function recordCashMovement(data: { type: string; amount: number; reason?: string }) {
  return apiCall<any>("/api/pos/cash-movements/record-cash-movement", data);
}

export async function listCashMovements(data?: { shift_id?: string }) {
  return apiCall<any[]>("/api/pos/cash-movements/list-cash-movements", data || {});
}

// Reports
export async function getDashboardSummary(data?: { start?: string; end?: string }) {
  return apiCall<any>("/api/reports/dashboard/summary", data || {});
}

// Catalog
export async function listCatalog() {
  return apiCall<any>("/api/catalog/list-catalog");
}

export async function upsertCategory(data: { id?: string; name_ar: string; name_en: string; sort_order?: number; active?: boolean }) {
  return apiCall<any>("/api/catalog/upsert-category", data);
}

export async function deleteCategory(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/catalog/delete-category", data);
}

export async function upsertProduct(data: any) {
  return apiCall<any>("/api/catalog/upsert-product", data);
}

export async function deleteProduct(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/catalog/delete-product", data);
}

// Users
export async function listUsers() {
  return apiCall<any[]>("/api/users/list-users");
}

export async function createUser(data: { fullName: string; username: string; role: string; email?: string | null; password: string; active?: boolean }) {
  return apiCall<{ id: string }>("/api/users/create-user", data);
}

export async function updateUser(data: { id: string; fullName: string; username: string; role: string; email?: string | null; active: boolean }) {
  return apiCall<{ ok: boolean }>("/api/users/update-user", data);
}

export async function resetCredentials(data: { id: string; password: string }) {
  return apiCall<{ ok: boolean }>("/api/users/reset-credentials", data);
}

export async function setUserActive(data: { id: string; active: boolean }) {
  return apiCall<{ ok: boolean }>("/api/users/set-active", data);
}

export async function deleteUser(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/users/delete-user", data);
}

// Catalog
export async function upsertAddonGroup(data: { id?: string; name_ar: string; name_en: string; min_select?: number; max_select?: number; required?: boolean }) {
  return apiCall<{ id: string }>("/api/catalog/upsert-addon-group", data);
}

export async function deleteAddonGroup(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/catalog/delete-addon-group", data);
}

export async function upsertAddon(data: { id?: string; group_id: string; name_ar: string; name_en: string; price_delta?: number; active?: boolean }) {
  return apiCall<{ id: string }>("/api/catalog/upsert-addon", data);
}

export async function deleteAddon(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/catalog/delete-addon", data);
}

export async function linkAddonGroup(data: { product_id: string; group_id: string; sort_order?: number }) {
  return apiCall<{ ok: boolean }>("/api/catalog/link-addon-group", data);
}

export async function unlinkAddonGroup(data: { product_id: string; group_id: string }) {
  return apiCall<{ ok: boolean }>("/api/catalog/unlink-addon-group", data);
}

// Ops (suppliers, inventory, purchases, recipes, adjustments, waste)
export async function listSuppliers(data?: { q?: string }) {
  return apiCall<any>("/api/ops/suppliers/list-suppliers", data || {});
}

export async function upsertSupplier(data: any) {
  return apiCall<{ id: string }>("/api/ops/suppliers/upsert-supplier", data);
}

export async function setSupplierActive(data: { id: string; active: boolean }) {
  return apiCall<{ ok: boolean }>("/api/ops/suppliers/set-active", data);
}

export async function getSupplierProfile(data: { id: string }) {
  return apiCall<any>("/api/ops/suppliers/get-supplier-profile", data);
}

export async function listInventory(data?: { q?: string }) {
  return apiCall<any>("/api/ops/inventory/list-inventory", data || {});
}

export async function upsertInventoryItem(data: any) {
  return apiCall<{ id: string }>("/api/ops/inventory/upsert-item", data);
}

export async function setInventoryActive(data: { id: string; active: boolean }) {
  return apiCall<{ ok: boolean }>("/api/ops/inventory/set-active", data);
}

export async function listItemMovements(data?: { item_id?: string; limit?: number }) {
  return apiCall<any[]>("/api/ops/inventory/list-movements", data || {});
}

export async function listPurchases(data?: { q?: string }) {
  return apiCall<any>("/api/ops/purchases/list-purchases", data || {});
}

export async function createPurchase(data: any) {
  return apiCall<{ id: string }>("/api/ops/purchases/create-purchase", data);
}

export async function getPurchase(data: { id: string }) {
  return apiCall<any>("/api/ops/purchases/get-purchase", data);
}

export async function listRecipes(data?: { q?: string }) {
  return apiCall<any[]>("/api/ops/recipes/list-recipes", data || {});
}

export async function saveRecipe(data: any) {
  return apiCall<{ id: string }>("/api/ops/recipes/save-recipe", data);
}

export async function deleteRecipe(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/ops/recipes/delete-recipe", data);
}

export async function listAdjustments(data?: { item_id?: string }) {
  return apiCall<any[]>("/api/ops/inventory/list-adjustments", data || {});
}

export async function createAdjustment(data: any) {
  return apiCall<{ id: string }>("/api/ops/inventory/create-adjustment", data);
}

export async function listWaste(data?: { q?: string }) {
  return apiCall<any[]>("/api/ops/waste/list-waste", data || {});
}

export async function createWaste(data: any) {
  return apiCall<{ id: string }>("/api/ops/waste/create-waste", data);
}

export async function listCustomersWithStats() {
  return apiCall<any>("/api/ops/customers/list-customers-with-stats", {});
}

export async function getCustomerHistory(data: { id: string; limit?: number }) {
  return apiCall<any>("/api/ops/customers/get-customer-history", data);
}

// Finance
export async function listAccountMovements(data?: { account_id?: string; limit?: number }) {
  return apiCall<any[]>("/api/finance/movements/list-movements", data || {});
}

export async function transferBetweenAccounts(data: { from_id: string; to_id: string; amount: number; notes?: string }) {
  return apiCall<{ ok: boolean }>("/api/finance/transfers/transfer", data);
}

export async function recordCashAdjustment(data: { account_id: string; direction?: string; amount: number; notes?: string }) {
  return apiCall<{ ok: boolean }>("/api/finance/adjustments/record-cash", data);
}

export async function listExpenses(data?: { category?: string }) {
  return apiCall<any>("/api/finance/expenses/list-expenses", data || {});
}

export async function createExpense(data: any) {
  return apiCall<{ id: string }>("/api/finance/expenses/create-expense", data);
}

export async function listChartAccounts(data?: { type?: string }) {
  return apiCall<any[]>("/api/finance/chart/list-accounts", data || {});
}

export async function upsertChartAccount(data: any) {
  return apiCall<{ id: string }>("/api/finance/chart/upsert-account", data);
}

export async function listJournalEntries(data?: { account_id?: string }) {
  return apiCall<any[]>("/api/finance/journal/list-entries", data || {});
}

export async function createJournalEntry(data: any) {
  return apiCall<{ id: string }>("/api/finance/journal/create-entry", data);
}

export async function reverseJournalEntry(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/finance/journal/reverse-entry", data);
}

export async function listSupplierPayments(data?: { supplier_id?: string }) {
  return apiCall<any[]>("/api/finance/supplier-payments/list-payments", data || {});
}

export async function createSupplierPayment(data: any) {
  return apiCall<{ id: string }>("/api/finance/supplier-payments/create-payment", data);
}

export async function getFinanceSummary(data?: { date_from?: string; date_to?: string }) {
  return apiCall<any>("/api/finance/summary", {});
}

// HR
export async function listEmployees(data?: { status?: string }) {
  return apiCall<any[]>("/api/hr/employees/list-employees", data || {});
}

export async function upsertEmployee(data: any) {
  return apiCall<{ id: string }>("/api/hr/employees/upsert-employee", data);
}

export async function setEmployeeStatus(data: { id: string; status: string }) {
  return apiCall<{ ok: boolean }>("/api/hr/employees/set-status", data);
}

export async function listEmployeeAdjustments(data?: { employee_id?: string; month?: string }) {
  return apiCall<any[]>("/api/hr/adjustments/list-adjustments", data || {});
}

export async function createEmployeeAdjustment(data: { employee_id: string; kind: string; amount: number; month: string; notes?: string }) {
  return apiCall<{ id: string }>("/api/hr/adjustments/create-adjustment", data);
}

export async function deleteEmployeeAdjustment(data: { id: string }) {
  return apiCall<{ ok: boolean }>("/api/hr/adjustments/delete-adjustment", data);
}

export async function previewPayroll(data: { month: string }) {
  return apiCall<any>("/api/hr/payroll/preview", data);
}

export async function generatePayroll(data: { month: string }) {
  return apiCall<{ id: string }>("/api/hr/payroll/generate", data);
}

export async function listSalaryRecords(data?: { employee_id?: string; month?: string }) {
  return apiCall<any[]>("/api/hr/payroll/list-records", data || {});
}

export async function paySalaryRecord(data: { id: string; paid_from_account_id?: string; amount?: number; notes?: string }) {
  return apiCall<{ ok: boolean }>("/api/hr/payroll/pay", data);
}

// Reports
export async function getDailySalesReport(data: { date: string; cashier_id?: string }) {
  return apiCall<any>("/api/reports/daily-sales", data);
}

export async function getShiftReport(data: { shift_id: string }) {
  return apiCall<any>("/api/reports/shift-report", data);
}

export async function getEndOfDayReport(data: { date: string }) {
  return apiCall<any>("/api/reports/end-of-day", data);
}

export async function getTopProductsReport(data: { date: string }) {
  return apiCall<any>("/api/reports/top-products", data);
}

export async function getSalesByPaymentMethod(data: { date: string }) {
  return apiCall<any>("/api/reports/by-payment-method", data);
}

export async function getSalesByOrderType(data: { date: string }) {
  return apiCall<any>("/api/reports/by-order-type", data);
}

export async function getSalesByCashier(data: { date: string }) {
  return apiCall<any>("/api/reports/by-cashier", data);
}

export async function getDiscountsReport(data: { date: string }) {
  return apiCall<any>("/api/reports/discounts", data);
}

export async function getRefundsReport(data: { date: string }) {
  return apiCall<any>("/api/reports/refunds", data);
}

export async function listZReports(data?: { limit?: number; include_open?: boolean }) {
  return apiCall<any[]>("/api/reports/z-reports", data || {});
}

// Audit
export async function listAuditLogs(data?: { from?: string; to?: string; user_id?: string; entity_type?: string; action?: string; limit?: number }) {
  return apiCall<any[]>("/api/audit/list-logs", data || {});
}

export async function getReadinessSnapshot(data?: any) {
  return apiCall<any>("/api/audit/readiness-snapshot", {});
}

// ZATCA
export async function getZatcaSettings() {
  return apiCall<any>("/api/zatca/settings", {});
}

export async function updateZatcaSettings(data: any) {
  return apiCall<any>("/api/zatca/update-settings", data);
}

export async function verifyOnboardingReadiness() {
  return apiCall<any>("/api/zatca/verify-onboarding", {});
}

export async function submitOnboardingOtp(data: { otp: string }) {
  return apiCall<any>("/api/zatca/submit-otp", data);
}

export async function listZatcaInvoices(data?: { status?: string; limit?: number; offset?: number }) {
  return apiCall<any[]>("/api/zatca/list-invoices", data || {});
}

export async function listZatcaCreditNotes(data?: { limit?: number }) {
  return apiCall<any[]>("/api/zatca/list-credit-notes", data || {});
}

export async function listZatcaLogs(data?: { invoice_id?: string; limit?: number }) {
  return apiCall<any[]>("/api/zatca/list-logs", data || {});
}

export async function retryZatcaInvoice(data: { id: string }) {
  return apiCall<any>("/api/zatca/retry-invoice", data);
}

export async function localGenerateZatcaInvoice(data: { order_id: string }) {
  return apiCall<any>("/api/zatca/local-generate", data);
}

export async function prepareDeviceCsr(data: { common_name?: string }) {
  return apiCall<any>("/api/zatca/prepare-csr", data);
}

export async function getDeviceStatus() {
  return apiCall<any>("/api/zatca/device-status", {});
}

export async function processZatcaQueue(data?: { count?: number }) {
  return apiCall<any>("/api/zatca/process-queue", data || {});
}

export async function submitValidatedZatcaInvoice(data: { id: string }) {
  return apiCall<any>("/api/zatca/submit-validated", data);
}

export async function getZatcaLifecycleSummary(data?: any) {
  return apiCall<any>("/api/zatca/lifecycle-summary", {});
}

export async function debugSignedPropertiesSample(data?: { count?: number }) {
  return apiCall<any>("/api/zatca/debug-sample", data || {});
}

export async function getCsidDetails(data?: { invoice_id?: string }) {
  return apiCall<any>("/api/zatca/csid-details", data || {});
}

// Invoice
export async function getZatcaForInvoice(data: { invoice_id: string }) {
  return apiCall<any>("/api/invoices/zatca-for-invoice", data);
}

// Settings
export async function getRestaurantSettings() {
  return apiCall<any>("/api/settings/get-restaurant-settings");
}

export async function updateRestaurantSettings(data: any) {
  return apiCall<any>("/api/settings/update-restaurant-settings", data);
}

// Finance
export async function listFinanceAccounts(data?: { type?: string }) {
  return apiCall<any[]>("/api/finance/accounts/list-finance-accounts", data || {});
}

export async function upsertFinanceAccount(data: any) {
  return apiCall<any>("/api/finance/accounts/upsert-finance-account", data);
}

// Wrapped async function for use in store
export type ApiFn<T> = (data?: unknown) => Promise<T>;

export function wrapApiFn<T>(fn: (data?: unknown) => Promise<T>): ApiFn<T> {
  return fn;
}