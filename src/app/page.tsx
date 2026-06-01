"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { EnvGuard } from "@/components/EnvGuard";
import { AppProvider, useApp, ADMIN_SCREENS, POS_SCREENS, isAdminRole } from "@/lib/store";
import { CatalogProvider } from "@/lib/catalog-context";
import { SettingsProvider } from "@/lib/settings-context";
import { Phase3Provider } from "@/lib/phase3Store";
import { Phase5Provider } from "@/lib/phase5Store";
import { Phase6Provider } from "@/lib/phase6Store";
import { ManagerZatcaHub } from "@/components/screens/SprintFScreens";
import {
  ManagerNotifications, ManagerImport, ManagerPermissions,
  ManagerQA, ManagerBackend,
} from "@/components/screens/Phase6Screens";
import {
  ManagerActivity, ManagerAudit, ManagerReadiness,
  ManagerExport, ManagerBackup,
} from "@/components/screens/SprintEScreens";
import { LoginSelectorScreen, POSLoginScreen, DashboardLoginScreen, AccessDeniedScreen } from "@/components/screens/AuthScreens";
import { OpenShiftScreen } from "@/components/screens/OpenShiftScreen";
import { POSScreen } from "@/components/screens/POSScreen";
import { InvoiceScreen } from "@/components/screens/InvoiceScreen";
import { HeldOrdersScreen } from "@/components/screens/HeldOrdersScreen";
import { RecentOrdersScreen } from "@/components/screens/RecentOrdersScreen";
import { RefundScreen } from "@/components/screens/RefundScreen";
import { CloseShiftScreen } from "@/components/screens/CloseShiftScreen";
import {
  DashboardScreen, ManagerProducts, ManagerCategories, ManagerAddons,
  ManagerUsers, ManagerCashiers, ManagerShifts, ManagerOrders,
  ManagerCustomers, SettingsScreen,
} from "@/components/screens/ManagerScreens";
import ReportsHub from "@/components/screens/ReportsScreen";
import {
  ManagerSuppliers, ManagerPurchases, ManagerInventory,
  ManagerRecipes, ManagerAdjustments, ManagerWaste,
} from "@/components/screens/Phase3Screens";
import {
  ManagerExpenses, ManagerBanks, ManagerChart, ManagerJournal,
  ManagerSupplierPayments, ManagerEmployees, ManagerPayroll, ManagerFinReports,
} from "@/components/screens/Phase4Screens";

const queryClient = new QueryClient();

function Router() {
  const { screen, user, setScreen } = useApp();

  if (user?.role === "cashier" && ADMIN_SCREENS.includes(screen)) {
    return <AccessDeniedScreen />;
  }
  if (!user && !["login_selector","pos_login","dashboard_login","login"].includes(screen)) {
    return <LoginSelectorScreen />;
  }

  switch (screen) {
    case "login_selector": return <LoginSelectorScreen />;
    case "pos_login": return <POSLoginScreen />;
    case "dashboard_login": return <DashboardLoginScreen />;
    case "access_denied": return <AccessDeniedScreen />;
    case "login": return <LoginSelectorScreen />;
    case "open_shift": return <OpenShiftScreen />;
    case "pos": return <POSScreen />;
    case "invoice": return <InvoiceScreen />;
    case "held": return <HeldOrdersScreen />;
    case "orders": return <RecentOrdersScreen />;
    case "refund": return <RefundScreen />;
    case "close_shift": return <CloseShiftScreen />;
    case "dashboard": return <DashboardScreen />;
    case "m_products": return <ManagerProducts />;
    case "m_categories": return <ManagerCategories />;
    case "m_addons": return <ManagerAddons />;
    case "m_users": return <ManagerUsers />;
    case "m_cashiers": return <ManagerCashiers />;
    case "m_shifts": return <ManagerShifts />;
    case "m_orders": return <ManagerOrders />;
    case "m_customers": return <ManagerCustomers />;
    case "m_reports": return <ReportsHub />;
    case "settings": return <SettingsScreen />;
    case "m_suppliers": return <ManagerSuppliers />;
    case "m_purchases": return <ManagerPurchases />;
    case "m_inventory": return <ManagerInventory />;
    case "m_recipes": return <ManagerRecipes />;
    case "m_adjustments": return <ManagerAdjustments />;
    case "m_waste": return <ManagerWaste />;
    case "m_expenses": return <ManagerExpenses />;
    case "m_banks": return <ManagerBanks />;
    case "m_chart": return <ManagerChart />;
    case "m_journal": return <ManagerJournal />;
    case "m_supplier_payments": return <ManagerSupplierPayments />;
    case "m_employees": return <ManagerEmployees />;
    case "m_payroll": return <ManagerPayroll />;
    case "m_finreports": return <ManagerFinReports />;
    case "m_zatca": return <ManagerZatcaHub />;
    case "m_readiness": return <ManagerReadiness />;
    case "m_activity": return <ManagerActivity />;
    case "m_audit": return <ManagerAudit />;
    case "m_notifications": return <ManagerNotifications />;
    case "m_import": return <ManagerImport />;
    case "m_export": return <ManagerExport />;
    case "m_backup": return <ManagerBackup />;
    case "m_permissions": return <ManagerPermissions />;
    case "m_qa": return <ManagerQA />;
    case "m_backend": return <ManagerBackend />;
    default: return <LoginSelectorScreen />;
  }
}

export default function Home() {
  return (
    <ErrorBoundary>
      <EnvGuard>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <SettingsProvider>
              <CatalogProvider>
                <Phase3Provider>
                  <Phase5Provider>
                    <Phase6Provider>
                      <Router />
                    </Phase6Provider>
                  </Phase5Provider>
                </Phase3Provider>
              </CatalogProvider>
            </SettingsProvider>
          </AppProvider>
        </QueryClientProvider>
      </EnvGuard>
    </ErrorBoundary>
  );
}