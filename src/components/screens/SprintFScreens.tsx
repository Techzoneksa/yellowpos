// Sprint F — ZATCA / E-Invoicing dashboard.
// Tabs: Setup • Onboarding • Queue • Failed • Synced • Credit Notes • Logs.
// All data live from backend. No mock rows.
import React, { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/store";
import {
  getZatcaSettings,
  updateZatcaSettings,
  verifyOnboardingReadiness,
  submitOnboardingOtp,
  listZatcaInvoices,
  listZatcaCreditNotes,
  listZatcaLogs,
  retryZatcaInvoice,
  localGenerateZatcaInvoice,
  prepareDeviceCsr,
  getDeviceStatus,
  processZatcaQueue,
  submitValidatedZatcaInvoice,
  getZatcaLifecycleSummary,
  debugSignedPropertiesSample,
  getCsidDetails,
} from "@/lib/api-client";

const ZATCA_SUBMISSION_FROZEN = true;

const STATUS_LABEL: Record<string, { ar: string; en: string; cls: string }> = {
  pending_generation: {
    ar: "قيد التوليد",
    en: "Pending generation",
    cls: "bg-muted text-foreground",
  },
  generated: { ar: "تم التوليد", en: "Generated", cls: "bg-muted text-foreground" },
  signed: { ar: "تم التوقيع", en: "Signed", cls: "bg-muted text-foreground" },
  validated_blocked: {
    ar: "تحقق محلي ناجح — محجوب",
    en: "Validated blocked",
    cls: "bg-success/15 text-success",
  },
  pending_sync: {
    ar: "بانتظار الإرسال",
    en: "Pending sync",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  submitting: {
    ar: "جارٍ الإرسال",
    en: "Submitting",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  sent: { ar: "تم الإرسال", en: "Sent", cls: "bg-success/15 text-success" },
  reported: { ar: "تم الإبلاغ", en: "Reported", cls: "bg-success/15 text-success" },
  synced: { ar: "تم الإرسال", en: "Sent", cls: "bg-success/15 text-success" },
  failed: { ar: "فشل", en: "Failed", cls: "bg-destructive/15 text-destructive" },
  rejected: { ar: "مرفوض", en: "Rejected", cls: "bg-destructive/15 text-destructive" },
  local_validation_failed: {
    ar: "فشل التحقق المحلي",
    en: "Local validation failed",
    cls: "bg-destructive/15 text-destructive",
  },
};

function StatusBadge({ s, lang }: { s: string; lang: "ar" | "en" }) {
  const m = STATUS_LABEL[s] ?? { ar: s, en: s, cls: "bg-muted" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${m.cls}`}>
      {lang === "ar" ? m.ar : m.en}
    </span>
  );
}

function getInvoiceErrorSummary(row: any) {
  const local = Array.isArray(row.local_validation_errors) ? row.local_validation_errors[0] : null;
  if (local) return `LOCAL/${local.code}: ${local.message}`;
  const errors =
    row.zatca_validation_errors ?? row.response_payload?.validationResults?.errorMessages ?? [];
  const first = Array.isArray(errors) ? errors[0] : null;
  return (
    row.last_error_message ??
    row.zatca_response_message ??
    (first ? `${first.code ?? "ZATCA"}: ${first.message ?? ""}` : null) ??
    row.error_message ??
    null
  );
}

function getPhase2ProofState(row: any) {
  const proof = row.local_validation_errors ?? {};
  const issues = Array.isArray(proof?.issues) ? proof.issues : [];
  const diag = proof?.diagnostics ?? {};
  const phase2Passed = diag?.local_validation_passed === true && issues.length === 0;
  const networkBlocked =
    proof?.network_blocked === true ||
    row.status === "validated_blocked" ||
    String(row.last_error_message ?? "").includes("Network submission blocked") ||
    String(row.last_error_message ?? "").includes("Network submission is temporarily disabled");
  const reported =
    ["reported", "sent", "synced"].includes(String(row.status)) ||
    ["REPORTED", "CLEARED"].includes(
      String(
        row.zatca_response_code ??
          row.response_payload?.reportingStatus ??
          row.response_payload?.clearanceStatus,
      ),
    );
  return { phase2Passed, networkBlocked, reported };
}

function matchesInvoiceKindFilter(row: any, filter: string) {
  if (filter === "all") return true;
  const state = getPhase2ProofState(row);
  if (filter === "phase2_validation_passed") return state.phase2Passed;
  if (filter === "network_blocked_after_local_pass") return state.networkBlocked;
  if (filter === "sent_reported") return state.reported;
  return String(row.status) === filter;
}

function invoiceTabName(row: any) {
  const state = getPhase2ProofState(row);
  if (state.networkBlocked) return "Network Blocked / Local Validation Passed / All Invoices";
  if (row.status === "pending_sync" || row.status === "submitting" || row.status === "generated")
    return "Sync Queue / All Invoices";
  if (row.status === "local_validation_failed") return "Local validation failed / All Invoices";
  if (row.status === "failed" || row.status === "rejected")
    return "Failed / Rejected / All Invoices";
  if (state.reported) return "Synced / All Invoices";
  return "All Invoices";
}

type LifecycleSummary = {
  networkDisabled: boolean;
  counts: Record<string, number>;
  latest: any | null;
};
const LifecycleCtx = React.createContext<{
  summary: LifecycleSummary | null;
  refresh: () => void;
}>({ summary: null, refresh: () => {} });

function CountBadge({ k }: { k: string | string[] }) {
  const { summary } = React.useContext(LifecycleCtx);
  const keys = Array.isArray(k) ? k : [k];
  const n = keys.reduce((sum, key) => sum + (summary?.counts?.[key] ?? 0), 0);
  if (!summary) return null;
  return (
    <span className="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
      {n}
    </span>
  );
}

function LifecycleSummaryBanner() {
  const { lang } = useApp();
  const { summary, refresh } = React.useContext(LifecycleCtx);
  if (!summary) return null;
  const c = summary.counts;
  const latest = summary.latest;
  return (
    <Card className="border-amber-500/40">
      <CardContent className="p-3 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">
            {lang === "ar" ? "ملخّص دورة الفواتير" : "Invoice lifecycle summary"}
          </div>
          <div className="flex items-center gap-2">
            {summary.networkDisabled ? (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                {lang === "ar" ? "الإرسال للشبكة مجمّد بالكامل" : "All ZATCA submission paths FROZEN"}
              </Badge>
            ) : (
              <Badge className="bg-success/15 text-success">
                {lang === "ar" ? "الإرسال مفعّل" : "Network ON"}
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={refresh}>
              {lang === "ar" ? "تحديث" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span>All: <b>{c.all ?? 0}</b></span>
          <span>generated: <b>{c.generated ?? 0}</b></span>
          <span>signed: <b>{c.signed ?? 0}</b></span>
          <span>pending_sync: <b>{c.pending_sync ?? 0}</b></span>
          <span>validated_blocked: <b>{c.validated_blocked ?? 0}</b></span>
          <span>local_validation_failed: <b>{c.local_validation_failed ?? 0}</b></span>
          <span>submitting: <b>{c.submitting ?? 0}</b></span>
          <span>reported/sent: <b>{(c.reported ?? 0) || (c.sent ?? 0) + (c.synced ?? 0)}</b></span>
          <span>synced: <b>{c.synced ?? 0}</b></span>
          <span>rejected: <b>{c.rejected ?? 0}</b></span>
          <span>failed: <b>{c.failed ?? 0}</b></span>
        </div>
        {summary.networkDisabled && (c.pending_sync ?? 0) === 0 && (
          <div className="text-muted-foreground">
            {lang === "ar"
              ? "قائمة الإرسال فارغة لأن الإرسال للشبكة معطّل. الفواتير الجديدة التي اجتازت التحقق المحلي تظهر في «محجوب بعد التحقق»، والفواتير الفاشلة محليًا في «فشل التحقق المحلي»."
              : "Sync Queue is empty because network submission is OFF. New invoices that pass local validation appear in Network Blocked / Validated (blocked). Locally failed invoices appear in Local validation failed."}
          </div>
        )}
        {latest && (
          <div className="rounded border border-dashed p-2">
            <div className="font-semibold mb-1">
              {lang === "ar" ? "أحدث فاتورة (تشخيص)" : "Latest invoice (diagnostic)"}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 font-mono text-[11px]">
              <span>ref_id: {String(latest.id).slice(0, 8)}</span>
              <span>invoice_number: {latest.invoice_number ?? "—"}</span>
              <span>order_number: {latest.order_number ?? "—"}</span>
              <span>status: {latest.status}</span>
              <span>environment: {latest.environment}</span>
              <span>retry_count: {latest.retry_count ?? 0}</span>
              <span>created_at: {latest.created_at ? new Date(latest.created_at).toLocaleString() : "—"}</span>
              <span>updated_at: {latest.updated_at ? new Date(latest.updated_at).toLocaleString() : "—"}</span>
            </div>
            {(latest.last_error_message || latest.error_message) && (
              <div className="mt-1 text-destructive text-[11px]">
                last_error: {latest.last_error_message ?? latest.error_message}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LifecycleProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<LifecycleSummary | null>(null);
  const refresh = React.useCallback(() => {
    getZatcaLifecycleSummary({})
      .then((s: any) => setSummary(s))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);
  return (
    <LifecycleCtx.Provider value={{ summary, refresh }}>{children}</LifecycleCtx.Provider>
  );
}

export function ManagerZatcaHub() {
  const { lang, setScreen } = useApp();
  return (
    <LifecycleProvider>
    <div className="min-h-screen bg-background">
      <TopBar
        title={lang === "ar" ? "الفوترة الإلكترونية (ZATCA)" : "E-Invoicing (ZATCA)"}
        right={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScreen("dashboard")}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === "ar" ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
          </Button>
        }
      />
      <div className="mx-auto max-w-7xl p-4 space-y-3">
        <LifecycleSummaryBanner />
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">{lang === "ar" ? "كل الفواتير" : "All Invoices"}</TabsTrigger>
            <TabsTrigger value="queue">
              {lang === "ar" ? "قائمة الإرسال" : "Sync Queue"} <CountBadge k="pending_sync" />
            </TabsTrigger>
            <TabsTrigger value="network_blocked">
              {lang === "ar" ? "محجوب بعد التحقق" : "Network Blocked"} <CountBadge k="validated_blocked" />
            </TabsTrigger>
            <TabsTrigger value="validated">
              {lang === "ar" ? "تحقق محلي ناجح (محجوب)" : "Validated (blocked)"} <CountBadge k="validated_blocked" />
            </TabsTrigger>
            <TabsTrigger value="local_failed">
              {lang === "ar" ? "فشل التحقق المحلي" : "Local validation failed"} <CountBadge k="local_validation_failed" />
            </TabsTrigger>
            <TabsTrigger value="failed">
              {lang === "ar" ? "فشل / مرفوض" : "Failed / Rejected"} <CountBadge k={["failed", "rejected"]} />
            </TabsTrigger>
            <TabsTrigger value="synced">{lang === "ar" ? "تم الإرسال" : "Synced"} <CountBadge k={["reported", "sent", "synced"]} /></TabsTrigger>
            <TabsTrigger value="debug">{lang === "ar" ? "تشخيص SignedProperties" : "SignedProperties Debug"}</TabsTrigger>
            <TabsTrigger value="csid">{lang === "ar" ? "حالة CSID" : "CSID Status"}</TabsTrigger>
            <TabsTrigger value="credit">
              {lang === "ar" ? "إشعارات دائنة" : "Credit Notes"}
            </TabsTrigger>
            <TabsTrigger value="logs">{lang === "ar" ? "السجلات" : "Logs"}</TabsTrigger>
            <TabsTrigger value="setup">{lang === "ar" ? "الإعداد" : "Setup"}</TabsTrigger>
            <TabsTrigger value="onboarding">
              {lang === "ar" ? "تسجيل الجهاز" : "Device Onboarding"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="setup">
            <SetupTab />
          </TabsContent>
          <TabsContent value="onboarding">
            <OnboardingTab />
          </TabsContent>
          <TabsContent value="all">
            <InvoicesTab statusFilter="all" all showErrors />
          </TabsContent>
          <TabsContent value="queue">
            <InvoicesTab
              statusFilter="pending_sync"
              statuses={["pending_sync"]}
              showErrors
            />
          </TabsContent>
          <TabsContent value="network_blocked">
            <InvoicesTab
              statusFilter="network_blocked_after_local_pass"
              statuses={["validated_blocked"]}
              fixedKindFilter="network_blocked_after_local_pass"
              showErrors
            />
          </TabsContent>
          <TabsContent value="validated">
            <InvoicesTab
              statusFilter="validated_blocked"
              statuses={["validated_blocked"]}
              showErrors
            />
          </TabsContent>

          <TabsContent value="local_failed">
            <InvoicesTab
              statusFilter="local_validation_failed"
              statuses={["local_validation_failed"]}
              allowRetry
              showErrors
            />
          </TabsContent>
          <TabsContent value="failed">
            <InvoicesTab
              statusFilter="failed"
              statuses={["failed", "rejected"]}
              allowRetry
              showErrors
            />
          </TabsContent>
          <TabsContent value="synced">
            <InvoicesTab statusFilter="reported" statuses={["reported", "sent", "synced"]} showErrors />
          </TabsContent>
          <TabsContent value="debug">
            <SignedPropertiesDebugTab />
          </TabsContent>
          <TabsContent value="csid">
            <CsidStatusTab />
          </TabsContent>
          <TabsContent value="credit">
            <CreditNotesTab />
          </TabsContent>
          <TabsContent value="logs">
            <LogsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </LifecycleProvider>
  );
}

/* ─────────── Setup ─────────── */
function SetupTab() {
  const { lang } = useApp();
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getZatcaSettings()
      .then(setSettings)
      .catch((e) => toast.error(e.message));
  }, []);
  if (!settings)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        {lang === "ar" ? "جارٍ التحميل..." : "Loading..."}
      </p>
    );

  async function save(patch: any) {
    setBusy(true);
    try {
      const row = await updateZatcaSettings({ data: patch });
      setSettings(row);
      toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{lang === "ar" ? "البيئة" : "Environment"}</Label>
            <Select value={settings.environment} onValueChange={(v) => save({ environment: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simulation">
                  {lang === "ar" ? "محاكاة (Simulation)" : "Simulation"}
                </SelectItem>
                <SelectItem value="production">
                  {lang === "ar" ? "الإنتاج (Production)" : "Production"}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ar"
                ? "لا يمكن تفعيل الإنتاج إلا بعد إكمال تسجيل الجهاز."
                : "Production can only be enabled after device onboarding completes."}
            </p>
          </div>
          <div>
            <Label>{lang === "ar" ? "اسم الجهاز" : "Device name"}</Label>
            <Input
              defaultValue={settings.device_name}
              onBlur={(e) =>
                e.target.value !== settings.device_name && save({ device_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "الرقم التسلسلي" : "Serial"}</Label>
            <Input
              defaultValue={settings.device_serial}
              onBlur={(e) =>
                e.target.value !== settings.device_serial && save({ device_serial: e.target.value })
              }
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "حالة التسجيل" : "Onboarding status"}</Label>
            <div className="mt-2">
              <Badge>{settings.onboarding_status}</Badge>
            </div>
          </div>
          <div>
            <Label>{lang === "ar" ? "آخر مزامنة" : "Last sync"}</Label>
            <div className="mt-2 text-sm text-muted-foreground">
              {settings.last_sync_at ?? (lang === "ar" ? "لا يوجد" : "—")}
            </div>
          </div>
          <div>
            <Label>{lang === "ar" ? "آخر خطأ" : "Last error"}</Label>
            <div className="mt-2 text-sm text-muted-foreground">{settings.last_error ?? "—"}</div>
          </div>
        </div>
        <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          {lang === "ar"
            ? "المفاتيح والشهادات تُحفظ على الخادم فقط ولا تظهر هنا."
            : "Private keys and certificates are stored server-side and never shown in the UI."}
        </p>
        {busy && <p className="text-xs text-muted-foreground">…</p>}
      </CardContent>
    </Card>
  );
}

/* ─────────── Onboarding ─────────── */
function OnboardingTab() {
  const { lang } = useApp();
  const [verify, setVerify] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const [v, d] = await Promise.all([verifyOnboardingReadiness(), getDeviceStatus()]);
      setVerify(v);
      setDevice(d);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    check(); /* eslint-disable-next-line */
  }, []);

  async function prepare() {
    setBusy(true);
    try {
      const r = await prepareDeviceCsr({});
      toast.success(
        lang === "ar"
          ? `تم توليد CSR (${r.csrLength} حرف)`
          : `CSR generated (${r.csrLength} chars)`,
      );
      await check();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!otp.trim()) return;
    setBusy(true);
    try {
      const res = await submitOnboardingOtp({ otp: otp.trim() });
      if (res.ok) {
        toast.success(lang === "ar" ? "تم استلام CSID من ZATCA" : "CSID obtained from ZATCA");
      } else {
        toast.error(res.error ?? (lang === "ar" ? "فشل الطلب" : "Request failed"));
      }
      setOtp("");
      await check();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const canPrepare = verify?.ready && !device?.hasComplianceCsid;
  const canOtp = verify?.ready && device?.hasCsr && !device?.hasComplianceCsid;
  const onboarded = !!device?.hasComplianceCsid;

  async function regenerate() {
    if (
      !confirm(
        lang === "ar"
          ? "سيتم توليد زوج مفاتيح جديد و CSR جديد واستبدال القديم. متابعة؟"
          : "This will generate a new key pair + CSR and replace the old one. Continue?",
      )
    )
      return;
    await prepare();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>
            {lang === "ar"
              ? "أكمل بيانات الشركة (الاسم النظامي / الرقم الضريبي 15 رقم / السجل التجاري / العنوان الوطني)."
              : "Complete company info (legal name / 15-digit VAT / CR / national address)."}
          </li>
          <li>
            {lang === "ar"
              ? "ولّد زوج المفاتيح و CSR (تلقائيًا في الخادم)."
              : "Generate key pair + CSR (server-side, automatic)."}
          </li>
          <li>
            {lang === "ar" ? "اطلب OTP من بوابة فاتورة." : "Generate OTP from the FATOORA portal."}
          </li>
          <li>
            {lang === "ar"
              ? "أرسل OTP ليتم استدعاء ZATCA لاستلام CSID."
              : "Submit OTP — ZATCA is called immediately to issue the CSID."}
          </li>
        </ol>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              {lang === "ar" ? "حالة الإعدادات" : "Settings readiness"}
            </div>
            {verify ? (
              <div className="mt-1">
                <Badge className="text-xs">{verify.currentStatus}</Badge>
                {!verify.ready && verify.missing?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-destructive">
                    {verify.missing.map((m: string) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">…</div>
            )}
            <Button size="sm" variant="outline" className="mt-2" onClick={check} disabled={busy}>
              {lang === "ar" ? "إعادة التحقق" : "Re-check"}
            </Button>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">
              {lang === "ar" ? "حالة الجهاز" : "Device state"}
            </div>
            {device ? (
              <ul className="mt-1 space-y-1 text-xs">
                <li>
                  {lang === "ar" ? "زوج المفاتيح موجود:" : "Key pair present:"}{" "}
                  <b>{device.hasKey ? "✓" : "—"}</b>
                </li>
                <li>
                  {lang === "ar" ? "CSR موجود:" : "CSR present:"}{" "}
                  <b>{device.hasCsr ? `✓ (${device.csrLength} chars)` : "—"}</b>
                </li>
                <li>
                  {lang === "ar" ? "CSID مستلم:" : "Compliance CSID:"}{" "}
                  <b>{device.hasComplianceCsid ? "✓" : "—"}</b>
                </li>
                {device.csidIssuedAt && (
                  <li>
                    {lang === "ar" ? "تاريخ الإصدار:" : "Issued at:"}{" "}
                    {new Date(device.csidIssuedAt).toLocaleString()}
                  </li>
                )}
                <li>
                  {lang === "ar" ? "سلسلة PIH نشطة:" : "PIH chain active:"}{" "}
                  <b>{device.pihPresent ? "✓" : "—"}</b>
                </li>
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">…</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <Label className="text-xs">
              {lang === "ar" ? "1) توليد المفاتيح + CSR" : "1) Generate keys + CSR"}
            </Label>
            <div className="flex gap-2">
              {!device?.hasCsr && (
                <Button onClick={prepare} disabled={busy || !canPrepare}>
                  {lang === "ar" ? "توليد CSR الآن" : "Prepare CSR"}
                </Button>
              )}
              {device?.hasCsr && !onboarded && (
                <>
                  <Button variant="outline" disabled>
                    {lang === "ar"
                      ? `CSR جاهز (${device.csrLength})`
                      : `CSR ready (${device.csrLength})`}
                  </Button>
                  <Button variant="destructive" onClick={regenerate} disabled={busy || !canPrepare}>
                    {lang === "ar" ? "إعادة توليد CSR" : "Regenerate CSR"}
                  </Button>
                </>
              )}
              {onboarded && (
                <Button variant="outline" disabled>
                  {lang === "ar" ? "تم التسجيل" : "Onboarded"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-1 min-w-[220px]">
            <Label className="text-xs">
              {lang === "ar" ? "2) OTP من فاتورة" : "2) FATOORA OTP"}
            </Label>
            <div className="flex gap-2">
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={!canOtp || onboarded}
                placeholder="123456"
                maxLength={20}
              />
              <Button onClick={send} disabled={busy || !canOtp}>
                {lang === "ar" ? "إرسال OTP" : "Submit OTP"}
              </Button>
            </div>
          </div>
        </div>

        {verify?.lastError && !onboarded && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {lang === "ar" ? "آخر خطأ من ZATCA: " : "Last ZATCA error: "}
            <b>{verify.lastError}</b>
            {verify.environment && verify.complianceUrl && (
              <span className="block mt-1 opacity-80">
                env=<b>{verify.environment}</b> · url=<b dir="ltr">{verify.complianceUrl}</b>
              </span>
            )}
          </p>
        )}

        {onboarded && (
          <p className="rounded-md border bg-success/10 p-3 text-xs text-success">
            {lang === "ar"
              ? "تم تسجيل الجهاز ومستعد لإرسال الفواتير."
              : "Device onboarded. Invoices can now be reported to ZATCA."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────── Invoices tab (queue / failed / synced) ─────────── */
function InvoicesTab({
  statusFilter,
  statuses,
  allowRetry,
  showErrors,
  all,
  fixedKindFilter,
}: {
  statusFilter: string;
  statuses?: string[];
  allowRetry?: boolean;
  showErrors?: boolean;
  all?: boolean;
  fixedKindFilter?: string;
}) {
  const { lang } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState(fixedKindFilter ?? "all");
  const [localGeneratingId, setLocalGeneratingId] = useState<string | null>(null);
  const runLocalGenerate = localGenerateZatcaInvoice;
  async function refresh() {
    setLoading(true);
    try {
      const search = query.trim();
      const data: any = all ? {} : statuses ? { statuses } : { status: statusFilter };
      if (search) data.search = search;
      setRows(
        await listZatcaInvoices(data),
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh(); /* eslint-disable-next-line */
  }, [statusFilter, statuses?.join(","), query]);

  async function retry(id: string) {
    if (!confirm(lang === "ar" ? "إعادة إرسال هذه الفاتورة فقط؟" : "Retry this invoice only?"))
      return;
    try {
      const res = await retryZatcaInvoice({ id });
      const s = (res as any).summary;
      toast.success(
        s
          ? `${s.processed}✓ / ${s.failed}✗`
          : lang === "ar"
            ? "تمت إعادة المحاولة"
            : "Retry completed",
      );
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function generateLocally(row: any) {
    setLocalGeneratingId(row.id);
    try {
      const res: any = await runLocalGenerate({ order_id: row.id });
      if (!res?.ok) throw new Error(res?.error ?? "Local generation failed");
      const firstIssue = Array.isArray(res?.after?.local_validation_errors?.issues)
        ? res.after.local_validation_errors.issues[0]
        : null;
      toast.success(
        firstIssue
          ? `${res?.after?.status ?? "local_validation_failed"}: ${firstIssue.code ?? "ISSUE"} — ${firstIssue.message ?? "Local validation issue"}`
          : lang === "ar"
            ? `تم التوليد والتحقق محليًا: ${res?.after?.status ?? "?"}`
            : `Local generation complete: ${res?.after?.status ?? "?"}`,
      );
      setRows((prev) => prev.map((it) => (it.id === row.id ? { ...it, ...res.after } : it)));
      setDetail((cur: any | null) => (cur?.id === row.id ? { ...cur, ...res.after } : cur));
      await refresh();
      return res;
    } catch (e: any) {
      const message = e?.message ?? "Local generation failed";
      toast.error(message);
      throw e;
    } finally {
      setLocalGeneratingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeKindFilter = fixedKindFilter ?? kindFilter;
    return rows.filter((r) => {
      if (!matchesInvoiceKindFilter(r, activeKindFilter)) return false;
      if (!q) return true;
      const hay = [
        r.id,
        r.id ? String(r.id).slice(0, 8) : null,
        r.invoice_id,
        r.order_id,
        r.invoice_number,
        r.order_number,
        r.zatca_uuid,
      ]
        .filter(Boolean)
        .map((x: any) => String(x).toLowerCase());
      return hay.some((s) => s.includes(q));
    });
  }, [rows, query, kindFilter, fixedKindFilter]);

  const colCount = showErrors ? 11 : 10;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {lang === "ar" ? `الفواتير — ${statusFilter}` : `Invoices — ${statusFilter}`}{" "}
            <span className="text-xs text-muted-foreground">
              ({filtered.length}/{rows.length})
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "بحث: رقم الفاتورة / الطلب / Ref ID / UUID"
                  : "Search: invoice / order / ref id / UUID"
              }
              className="h-8 w-72 text-xs"
            />
            {!fixedKindFilter && (
              <Select value={kindFilter} onValueChange={setKindFilter}>
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {lang === "ar" ? "كل الحالات" : "All statuses"}
                  </SelectItem>
                  <SelectItem value="rejected">{lang === "ar" ? "مرفوض" : "Rejected"}</SelectItem>
                  <SelectItem value="failed">{lang === "ar" ? "فشل" : "Failed"}</SelectItem>
                  <SelectItem value="local_validation_failed">
                    {lang === "ar" ? "فشل التحقق المحلي" : "Local validation failed"}
                  </SelectItem>
                  <SelectItem value="phase2_validation_passed">
                    {lang === "ar" ? "نجح تحقق Phase-2" : "Phase-2 validation passed"}
                  </SelectItem>
                  <SelectItem value="network_blocked_after_local_pass">
                    {lang === "ar" ? "محجوب بعد التحقق" : "Network blocked after local pass"}
                  </SelectItem>
                  <SelectItem value="sent_reported">
                    {lang === "ar" ? "مرسل / مبلّغ" : "Sent / reported"}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {statusFilter === "pending_sync" && (
              <Button
                size="sm"
                disabled={ZATCA_SUBMISSION_FROZEN}
                onClick={async () => {
                  if (ZATCA_SUBMISSION_FROZEN) return;
                  try {
                    const s = await processZatcaQueue({});
                    toast.success(`${s.processed}✓ / ${s.failed}✗`);
                    refresh();
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                {lang === "ar" ? "الإرسال مجمّد" : "Process queue frozen"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={refresh}>
              {lang === "ar" ? "تحديث" : "Refresh"}
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "ar" ? "Ref ID" : "Ref ID"}</TableHead>
              <TableHead>{lang === "ar" ? "الفاتورة" : "Invoice"}</TableHead>
              <TableHead>{lang === "ar" ? "الطلب" : "Order"}</TableHead>
              <TableHead>{lang === "ar" ? "البيئة" : "Env"}</TableHead>
              <TableHead>{lang === "ar" ? "الإجمالي" : "Total"}</TableHead>
              <TableHead>{lang === "ar" ? "محاولات" : "Retries"}</TableHead>
              <TableHead>{lang === "ar" ? "آخر محاولة" : "Last attempt"}</TableHead>
              <TableHead>{lang === "ar" ? "التحقق" : "Validation"}</TableHead>
              <TableHead>{lang === "ar" ? "الحالة" : "Status"}</TableHead>
              {showErrors && <TableHead>{lang === "ar" ? "الخطأ" : "Error"}</TableHead>}
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-sm text-muted-foreground">
                  …
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-sm text-muted-foreground">
                  {lang === "ar" ? "لا توجد فواتير." : "No invoices."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const proofState = getPhase2ProofState(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <button
                      type="button"
                      className="underline decoration-dotted hover:text-primary"
                      title={`${r.id}\n(click to copy)`}
                      onClick={() => {
                        navigator.clipboard?.writeText(r.id);
                        toast.success(`Copied ${r.id.slice(0, 8)}`);
                      }}
                    >
                      {r.id.slice(0, 8)}
                    </button>
                    {proofState.phase2Passed && (
                      <Badge className="ml-1 bg-success/15 text-success text-[10px]">
                        LOCAL PASS
                      </Badge>
                    )}
                    {proofState.networkBlocked && (
                      <Badge className="ml-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                        BLOCKED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.invoice_number ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.order_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {r.total ? Number(r.total).toFixed(2) : "—"}
                  </TableCell>
                  <TableCell>{r.retry_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.last_attempt_at
                      ? new Date(r.last_attempt_at).toLocaleString(
                          lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB",
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Badge variant="outline" className={proofState.phase2Passed ? "bg-success/15 text-success text-[10px]" : "text-[10px]"}>
                      {proofState.phase2Passed ? "LOCAL PASS" : "NO PASS"}
                    </Badge>
                    {proofState.networkBlocked && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                        BLOCKED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge s={r.status} lang={lang} />
                  </TableCell>
                  {showErrors && (
                    <TableCell
                      className="max-w-[280px] text-xs text-destructive truncate"
                      title={getInvoiceErrorSummary(r) ?? ""}
                    >
                      {getInvoiceErrorSummary(r) ??
                        (lang === "ar" ? "لا توجد تفاصيل محفوظة" : "No stored details")}
                    </TableCell>
                  )}
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                      {lang === "ar" ? "عرض التفاصيل" : "View Details"}
                    </Button>
                    {(r.status === "generated" || r.status === "pending_generation" || r.status === "signed" || r.status === "local_validation_failed") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={localGeneratingId === r.id}
                        onClick={() => generateLocally(r)}
                      >
                        {localGeneratingId === r.id
                          ? lang === "ar"
                            ? "جارٍ التوليد المحلي..."
                            : "Generating locally..."
                          : lang === "ar"
                            ? "توليد وتحقق محلي"
                            : "Generate & validate locally"}
                      </Button>
                    )}
                    {allowRetry && (
                      <Button size="sm" variant="outline" disabled={ZATCA_SUBMISSION_FROZEN} onClick={() => retry(r.id)}>
                        {lang === "ar" ? "إعادة المحاولة مجمّدة" : "Retry frozen"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <InvoiceDetailDialog row={detail} onClose={() => setDetail(null)} onGenerateLocally={generateLocally} localGeneratingId={localGeneratingId} />
      </CardContent>
    </Card>
  );
}

function SignedPropertiesDebugTab() {
  const { lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const proof = result?.proof ?? null;
  const field = (k: string, v: any) => (
    <div className="grid grid-cols-[240px_1fr] gap-2 border-b py-1 last:border-0">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="break-all font-mono text-xs">{v === true ? "✓ true" : v === false ? "✗ false" : (v ?? "—")}</div>
    </div>
  );
  async function runDebug() {
    setLoading(true);
    try {
      const res = await debugSignedPropertiesSample();
      setResult(res);
      toast.success(lang === "ar" ? "تم إنشاء عينة محلية فقط" : "Local-only sample generated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {lang === "ar" ? "تشخيص SignedProperties المحلي" : "Local SignedProperties diagnostics"}
          </h3>
          <Button size="sm" onClick={runDebug} disabled={loading}>
            {loading ? "…" : lang === "ar" ? "إنشاء عينة محلية" : "Generate local sample"}
          </Button>
        </div>
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
          {lang === "ar" ? "لا يتم إرسال أي شيء إلى ZATCA" : "No ZATCA network submission"}
        </Badge>
        {proof && (
          <div className="rounded-md border bg-muted/30 p-3">
            {field("reference_uri", proof.reference_uri)}
            {field("reference_type", proof.reference_type)}
            {field("reference_type_is_correct", proof.reference_type_is_correct)}
            {field("digest_method_algorithm", proof.digest_method_algorithm)}
            {field("canonicalization_method", proof.canonicalization_method)}
            {field("signed_properties_id", proof.signed_properties_id)}
            {field("embedded_digest", proof.embedded_digest)}
            {field("calculated_digest", proof.calculated_digest)}
            {field("digests_equal", proof.digests_equal)}
            {field("invoice_hash_b64", result?.invoiceHashB64)}
          </div>
        )}
        {proof?.reference_xml && (
          <pre className="max-h-72 overflow-auto rounded border bg-muted/40 p-2 text-[11px]">
            {proof.reference_xml}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceDetailDialog({
  row,
  onClose,
  onGenerateLocally,
  localGeneratingId,
}: {
  row: any | null;
  onClose: () => void;
  onGenerateLocally: (row: any) => Promise<any>;
  localGeneratingId: string | null;
}) {
  const { lang } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  if (!row) return null;
  const resp =
    submitResult?.after?.zatca_raw_response ??
    row.zatca_raw_response ??
    row.response_payload ??
    null;
  const httpStatus =
    submitResult?.after?.zatca_http_status ??
    row.zatca_http_status ??
    (() => {
      const m = /HTTP\s+(\d+)/i.exec(row.last_error_message ?? row.error_message ?? "");
      return m ? m[1] : "—";
    })();
  const valErrors: any[] =
    submitResult?.after?.zatca_validation_errors ??
    row.zatca_validation_errors ??
    resp?.validationResults?.errorMessages ??
    [];
  const valWarnings: any[] =
    submitResult?.after?.zatca_warnings ??
    row.zatca_warnings ??
    resp?.validationResults?.warningMessages ??
    [];
  const noStoredDetails = !httpStatus || httpStatus === "—";

  const proof = row.local_validation_errors ?? {};
  const diag = proof?.diagnostics ?? {};
  const proofIssues: any[] = Array.isArray(proof?.issues) ? proof.issues : [];
  const localPassed = diag?.local_validation_passed === true && proofIssues.length === 0;
  const xadesSignedPropertiesType = "http://uri.etsi.org/01903#SignedProperties";
  const canSubmit =
    !ZATCA_SUBMISSION_FROZEN &&
    localPassed &&
    diag?.are_signed_properties_digests_equal === true &&
    diag?.signed_properties_reference_uri === "#xadesSignedProperties" &&
    diag?.signed_properties_reference_type === xadesSignedPropertiesType &&
    diag?.signed_properties_digest_method_algorithm === "http://www.w3.org/2001/04/xmlenc#sha256" &&
    diag?.signed_properties_id_attribute === "xadesSignedProperties" &&
    diag?.are_signature_bytes_equal === true &&
    diag?.are_timestamps_equal === true &&
    !!diag?.tax_currency_code &&
    diag?.tax_total_structure_ok === true;
  const canGenerateLocally =
    row.status === "generated" ||
    row.status === "pending_generation" ||
    row.status === "signed" ||
    row.status === "local_validation_failed";
  const isGeneratingLocally = localGeneratingId === row.id;

  async function onSubmitToZatca() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await submitValidatedZatcaInvoice({ id: row.id });
      setSubmitResult(res);
      const st = res?.after?.status;
      if (st === "sent" || st === "synced")
        toast.success(lang === "ar" ? "تم القبول من ZATCA" : "Accepted by ZATCA");
      else toast.error(`${lang === "ar" ? "استجابة ZATCA" : "ZATCA response"}: ${st ?? "unknown"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const field = (k: string, v: any) => (
    <div className="grid grid-cols-[200px_1fr] gap-2 py-1 border-b last:border-0">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-xs font-mono break-all">
        {v === true ? "true" : v === false ? "false" : (v ?? "—")}
      </div>
    </div>
  );
  const boolField = (k: string, v: any) => (
    <div className="grid grid-cols-[260px_1fr] gap-2 py-1 border-b last:border-0">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div
        className={`text-xs font-mono ${v === true ? "text-success" : v === false ? "text-destructive" : ""}`}
      >
        {v === true ? "✓ true" : v === false ? "✗ false" : "—"}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {lang === "ar" ? "تفاصيل الفاتورة (ZATCA)" : "Invoice details (ZATCA)"}
          </h3>
          <div className="flex items-center gap-2">
            {canGenerateLocally && (
              <Button
                size="sm"
                variant="secondary"
                disabled={isGeneratingLocally}
                onClick={() => onGenerateLocally(row)}
              >
                {isGeneratingLocally
                  ? lang === "ar"
                    ? "جارٍ التوليد المحلي..."
                    : "Generating locally..."
                  : lang === "ar"
                    ? "توليد وتحقق محلي"
                    : "Generate & validate locally"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {/* Local Phase-2 validation proof */}
        <div className="mb-4 rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold">
              {lang === "ar" ? "إثبات التحقق المحلي (Phase-2)" : "Local validation proof (Phase-2)"}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${localPassed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
            >
              {localPassed ? "PASSED" : "NOT PASSED"}
            </span>
          </div>
          {boolField("local_validation_ran", !!diag && Object.keys(diag).length > 0)}
          {boolField("local_validation_passed", diag.local_validation_passed)}
          {field("validation_source", diag.validation_source ?? "—")}
          {field("xml_signature_value_b64", diag.xml_signature_value_b64)}
          {field("qr_tag7_signature_b64", diag.qr_tag7_signature_b64)}
          {boolField("are_signature_bytes_equal", diag.are_signature_bytes_equal)}
          {field("canonicalization method", diag.signed_properties_canonicalization_method)}
          {field("reference URI", diag.signed_properties_reference_uri)}
          {field("reference type", diag.signed_properties_reference_type)}
          {boolField("reference type is XAdES SignedProperties", diag.signed_properties_reference_type === xadesSignedPropertiesType)}
          {field("digest method algorithm", diag.signed_properties_digest_method_algorithm)}
          {field("Id attribute", diag.signed_properties_id_attribute)}
          {field("SignedProperties ds:Reference block", diag.signed_properties_reference_xml)}
          {field("signed_properties_reference_xml", diag.signed_properties_reference_b64)}
          {field(
            "namespaces used",
            Array.isArray(diag.signed_properties_namespace_declarations_used)
              ? diag.signed_properties_namespace_declarations_used.join(" | ")
              : diag.signed_properties_namespace_declarations_used,
          )}
          {field("signed_properties_raw_xml", diag.signed_properties_raw_b64)}
          {field("signed_properties_canonical_xml", diag.signed_properties_canonical_b64)}
          {field("embedded digest b64", diag.signed_properties_digest_expected_b64)}
          {field("calculated digest b64", diag.signed_properties_digest_actual_b64)}
          {field("embedded digest hex", diag.signed_properties_digest_expected_hex)}
          {field("calculated digest hex", diag.signed_properties_digest_actual_hex)}
          {boolField(
            "are_signed_properties_digests_equal",
            diag.are_signed_properties_digests_equal,
          )}
          {field("signed_properties_digest_method", diag.signed_properties_digest_method)}
          {field(
            "signed_properties_canonicalization_method",
            diag.signed_properties_canonicalization_method,
          )}
          {field("signed_properties_reference_uri", diag.signed_properties_reference_uri)}
          {field("signed_properties_reference_type", diag.signed_properties_reference_type)}
          {field("signed_properties_id_attribute", diag.signed_properties_id_attribute)}
          {field(
            "signed_properties_namespace_declarations_used",
            Array.isArray(diag.signed_properties_namespace_declarations_used)
              ? diag.signed_properties_namespace_declarations_used.join(" | ")
              : diag.signed_properties_namespace_declarations_used,
          )}
          {field(
            "signed_properties_digest_expected_b64",
            diag.signed_properties_digest_expected_b64,
          )}
          {field("signed_properties_digest_actual_b64", diag.signed_properties_digest_actual_b64)}
          {field("signed_properties_digest_expected_hex", diag.signed_properties_digest_expected_hex)}
          {field("signed_properties_digest_actual_hex", diag.signed_properties_digest_actual_hex)}
          {boolField(
            "are_signed_properties_digests_equal",
            diag.are_signed_properties_digests_equal,
          )}
          {field("signed_properties_raw_b64", diag.signed_properties_raw_b64)}
          {field("signed_properties_canonical_b64", diag.signed_properties_canonical_b64)}
          {field("xml_issue_date", diag.xml_issue_date)}
          {field("xml_issue_time", diag.xml_issue_time)}
          {field("expected_qr_timestamp", diag.expected_qr_timestamp)}
          {field("actual_qr_tag3", diag.actual_qr_tag3)}
          {boolField("are_timestamps_equal", diag.are_timestamps_equal)}
          {boolField("TaxCurrencyCode exists", !!diag.tax_currency_code)}
          {field("TaxCurrencyCode value", diag.tax_currency_code)}
          {boolField("tax_total_structure_ok", diag.tax_total_structure_ok)}
          {field("document_tax_total_count", diag.document_tax_total_count)}
          {field(
            "document_tax_total_with_subtotal_count",
            diag.document_tax_total_with_subtotal_count,
          )}
          {field("qr_tag_count", diag.qr_tag_count)}
          {boolField("network_blocked", proof?.network_blocked)}

          {proofIssues.length > 0 && (
            <div className="mt-2 rounded border border-destructive/30 bg-destructive/5 p-2">
              <div className="text-xs font-semibold text-destructive">Local issues</div>
              <ul className="mt-1 space-y-1 text-xs">
                {proofIssues.map((it: any, i: number) => (
                  <li key={i} className="font-mono">
                    {it.code}: {it.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" disabled={!canSubmit || submitting} onClick={onSubmitToZatca}>
              {submitting
                ? lang === "ar"
                  ? "جارٍ الإرسال..."
                  : "Submitting..."
                : ZATCA_SUBMISSION_FROZEN
                  ? lang === "ar"
                    ? "الإرسال إلى ZATCA مجمّد"
                    : "ZATCA submission frozen"
                : lang === "ar"
                  ? "إرسال هذه الفاتورة المعتمدة محليًا إلى ZATCA"
                  : "Submit this validated invoice to ZATCA"}
            </Button>
            {(!localPassed || !canSubmit) && (
              <span className="text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "يتفعّل الإرسال فقط عند اكتمال جميع علامات التحقق المحلي."
                  : "Submission is enabled only when every local validation check is green."}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          {field("Reference ID (zatca_invoices.id)", row.id)}
          {field("Short Ref", row.id?.slice(0, 8))}
          {field("Visible tab(s)", invoiceTabName(row))}
          {field("Invoice number", row.invoice_number)}
          {field("Order number", row.order_number)}
          {field("Status", submitResult?.after?.status ?? row.status)}
          {field("Attempts", row.retry_count ?? 0)}
          {field("Environment", row.environment)}
          {field(
            "Submitted endpoint URL",
            submitResult?.after?.submitted_endpoint ?? row.submitted_endpoint,
          )}
          {field("HTTP status code", httpStatus)}
          {field(
            "ZATCA response code",
            submitResult?.after?.zatca_response_code ?? row.zatca_response_code,
          )}
          {field(
            "ZATCA response message",
            submitResult?.after?.zatca_response_message ?? row.zatca_response_message,
          )}
          {field(
            "Exception message",
            submitResult?.after?.last_error_message ?? row.last_error_message ?? row.error_message,
          )}
          {field(
            "Last attempted at",
            row.last_attempt_at ? new Date(row.last_attempt_at).toLocaleString() : "—",
          )}
          {field(
            "Last error at",
            row.last_error_at ? new Date(row.last_error_at).toLocaleString() : "—",
          )}
          {field("ZATCA UUID", row.zatca_uuid)}
          {field("Invoice hash (b64)", row.invoice_hash_b64)}
          {field("Previous hash (b64)", row.previous_invoice_hash_b64)}
          {field("ICV", row.icv)}
          {field(
            "Signed XML present",
            row.signed_xml_b64 ? `yes (${row.signed_xml_b64.length} chars b64)` : "no",
          )}
          {field("QR (TLV b64)", row.qr_payload)}
          {field(
            "Submitted at",
            row.submitted_at ? new Date(row.submitted_at).toLocaleString() : "—",
          )}
          {field("Error message", row.error_message)}
        </div>

        {noStoredDetails && !submitResult && (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            {lang === "ar"
              ? "لم يتم الإرسال بعد إلى ZATCA. اضغط زر الإرسال أعلاه بعد مراجعة الإثبات."
              : "Not yet submitted to ZATCA. Use the submit button above after reviewing the local proof."}
          </p>
        )}

        {valErrors.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-destructive">
              {lang === "ar" ? "أخطاء ZATCA" : "ZATCA validation errors"} ({valErrors.length})
            </div>
            <ul className="space-y-1 text-xs">
              {valErrors.map((e, i) => (
                <li key={i} className="rounded border border-destructive/30 bg-destructive/5 p-2">
                  <div className="font-mono text-destructive">
                    {e.code} · {e.category}
                  </div>
                  <div className="text-muted-foreground">{e.message}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {valWarnings.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-amber-600">
              Warnings ({valWarnings.length})
            </div>
            <ul className="space-y-1 text-xs">
              {valWarnings.map((e, i) => (
                <li key={i} className="rounded border p-2">
                  <div className="font-mono">
                    {e.code} · {e.category}
                  </div>
                  <div className="text-muted-foreground">{e.message}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold">
            {lang === "ar" ? "الاستجابة الخام من ZATCA" : "Raw ZATCA response"}
          </div>
          <pre className="max-h-80 overflow-auto rounded border bg-muted/40 p-2 text-[11px]">
            {resp ? JSON.stringify(resp, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Credit notes ─────────── */
function CreditNotesTab() {
  const { lang } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listZatcaCreditNotes()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card>
      <CardContent className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "ar" ? "المرجع" : "Reference"}</TableHead>
              <TableHead>{lang === "ar" ? "المبلغ" : "Amount"}</TableHead>
              <TableHead>{lang === "ar" ? "الضريبة" : "VAT"}</TableHead>
              <TableHead>{lang === "ar" ? "البيئة" : "Env"}</TableHead>
              <TableHead>{lang === "ar" ? "الحالة" : "Status"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  …
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {lang === "ar" ? "لا توجد إشعارات دائنة." : "No credit notes yet."}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.refund_id?.slice(0, 8)}</TableCell>
                <TableCell className="tabular-nums">{Number(r.amount).toFixed(2)}</TableCell>
                <TableCell className="tabular-nums">{Number(r.vat_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {r.environment}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge s={r.status} lang={lang} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─────────── Logs ─────────── */
function LogsTab() {
  const { lang } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    listZatcaLogs({ limit: 200 })
      .then(setRows)
      .catch((e) => toast.error(e.message));
  }, []);
  const sorted = useMemo(() => rows, [rows]);
  return (
    <Card>
      <CardContent className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang === "ar" ? "الوقت" : "Time"}</TableHead>
              <TableHead>{lang === "ar" ? "المستوى" : "Level"}</TableHead>
              <TableHead>{lang === "ar" ? "الحدث" : "Event"}</TableHead>
              <TableHead>{lang === "ar" ? "المرجع" : "Reference"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  {lang === "ar" ? "لا توجد سجلات." : "No logs yet."}
                </TableCell>
              </TableRow>
            )}
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">
                  {new Date(l.created_at).toLocaleString(
                    lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB",
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={l.level === "error" ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {l.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{l.event}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l.reference_type
                    ? `${l.reference_type}:${String(l.reference_id ?? "").slice(0, 8)}`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CsidStatusTab() {
  const { lang } = useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await getCsidDetails();
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const f = (k: string, v: any) => (
    <div className="grid grid-cols-[260px_1fr] gap-2 border-b py-1.5 last:border-0">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="break-all font-mono text-xs">
        {v === true ? "✓ true" : v === false ? "✗ false" : (v ?? "—")}
      </div>
    </div>
  );

  const certKind = data?.certificateType as string | undefined;
  const certKindLabel =
    certKind === "production" ? (lang === "ar" ? "إنتاج (Production CSID)" : "Production CSID")
    : certKind === "compliance" ? (lang === "ar" ? "امتثال (Compliance CSID)" : "Compliance CSID")
    : (lang === "ar" ? "غير موجود" : "none");

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {lang === "ar" ? "حالة شهادة CSID (قراءة فقط)" : "CSID Certificate Status (read-only)"}
          </h3>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "…" : (lang === "ar" ? "تحديث" : "Refresh")}
          </Button>
        </div>

        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
          {lang === "ar"
            ? "هذه شاشة تشخيص فقط — لا يتم إرسال أي شيء إلى ZATCA ولا يتم تعديل أي سجل."
            : "Diagnostic view only — no ZATCA submission, no record modification."}
        </div>

        {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}

        {data && (
          <>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? "ملخص الصلاحية" : "Validity Summary"}
              </div>
              {f("certificate_type", certKindLabel)}
              {f("environment", data.environment)}
              {f("onboarding_status", data.onboardingStatus)}
              {f("is_expired", data.isExpired)}
              {f("days_until_expiry", data.daysUntilExpiry)}
              {f("valid_for_simulation", data.validForSimulation)}
              {f("valid_for_production", data.validForProduction)}
              {f("can_submit_simplified (B2C)", data.canSubmitSimplified)}
              {f("can_submit_standard (B2B)", data.canSubmitStandard)}
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? "بيانات الجهاز" : "Device"}
              </div>
              {f("device_name", data.deviceName)}
              {f("device_serial", data.deviceSerial)}
              {f("csr_common_name", data.csrCommonName)}
              {f("csr_serial_number", data.csrSerialNumber)}
              {f("invoice_type_code", data.invoiceType)}
              {f("invoice_type_label", data.invoiceTypeLabel)}
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? "حالة الرموز المخزّنة" : "Stored Tokens"}
              </div>
              {f("has_compliance_csid", data.hasComplianceCsid)}
              {f("has_production_csid", data.hasProductionCsid)}
              {f("compliance_request_id", data.complianceRequestId)}
              {f("issued_at (db)", data.issuedAtDb)}
              {f("expires_at (db)", data.expiresAtDb)}
              {f("last_sync_at", data.lastSyncAt)}
              {f("notes", data.notes)}
              {f("updated_at", data.updatedAt)}
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? "الشهادة المُحلَّلة (X.509)" : "Parsed Certificate (X.509)"}
              </div>
              {data.cert?.parseError
                ? f("parse_error", data.cert.parseError)
                : (
                  <>
                    {f("not_before", data.cert?.notBeforeIso)}
                    {f("not_after", data.cert?.notAfterIso)}
                    {f("serial_decimal", data.cert?.serial)}
                    {f("subject_dn", data.cert?.subject)}
                    {f("issuer_dn", data.cert?.issuer)}
                    {f("token_length", data.cert?.tokenLength)}
                    {f("token_prefix", data.cert?.tokenPrefix ? data.cert.tokenPrefix + "…" : "—")}
                  </>
                )}
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <div className="mb-1 font-semibold">{lang === "ar" ? "الحكم" : "Verdict"}</div>
              {data.certificateType === "none" ? (
                <div className="text-destructive">
                  {lang === "ar"
                    ? "لا توجد شهادة CSID مخزّنة. يلزم إعادة onboarding."
                    : "No CSID stored. Re-onboarding required."}
                </div>
              ) : data.isExpired ? (
                <div className="text-destructive">
                  {lang === "ar"
                    ? `الشهادة منتهية الصلاحية منذ ${Math.abs(data.daysUntilExpiry ?? 0)} يوم. يلزم إعادة onboarding.`
                    : `Certificate expired ${Math.abs(data.daysUntilExpiry ?? 0)} day(s) ago. Re-onboarding required.`}
                </div>
              ) : data.certificateType === "compliance" && data.environment === "simulation" ? (
                <div className="text-amber-600 dark:text-amber-400">
                  {lang === "ar"
                    ? "شهادة compliance صالحة لبيئة المحاكاة. إن استمر خطأ HTTP 401 من ZATCA فالسبب الأرجح هو رفض البوابة للتوكن (انتهاء صلاحية الجلسة أو عدم تطابق الحساب). الحل: إعادة onboarding للحصول على CSID جديد."
                    : "Compliance CSID valid for simulation. Persistent HTTP 401 from ZATCA means the gateway is rejecting this specific token (account mismatch or stale session) — fix is to re-onboard for a fresh CSID."}
                </div>
              ) : (
                <div className="text-emerald-600 dark:text-emerald-400">
                  {lang === "ar" ? "الشهادة تبدو صالحة." : "Certificate looks valid."}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

