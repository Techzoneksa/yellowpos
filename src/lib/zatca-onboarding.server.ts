// Sprint F-2 — ZATCA onboarding (CSR + CSID compliance request) (server-only).
//
// Flow:
//   1) prepareDevice() — generates secp256k1 key pair, encrypts private
//      key, builds CSR PEM, stores both, sets onboarding_status to
//      "ready_for_otp". No network call. Idempotent (re-running rotates
//      key + CSR — only allowed before CSID is obtained).
//   2) requestComplianceCsid({ otp }) — calls the sandbox compliance
//      endpoint with the CSR + OTP. On success, stores the CSID token,
//      CSID secret, request id, and sets onboarding_status to
//      "onboarded".  On failure, records last_error and leaves status
//      unchanged. OTP is consumed immediately; never persisted.
//
// SECURITY: server-only. The CSR is the only thing that leaves the
// server. The OTP is forwarded straight to ZATCA in the same call and
// then discarded.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildCsrPem,
  encryptSecret,
  generateDeviceKeyPair,
  loadDeviceKeysRow,
} from "./zatca-crypto.server";
import { zatcaLog } from "./zatca.server";

export interface PrepareDeviceResult {
  ok: true;
  hasKey: true;
  hasCsr: true;
  csrLength: number;
}

async function loadSettings() {
  const { data: rs } = await supabaseAdmin
    .from("restaurant_settings")
    .select("vat_number, legal_name_ar, brand_name_ar")
    .eq("id", true)
    .maybeSingle();
  const { data: zs } = await supabaseAdmin
    .from("zatca_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return { rs: rs as any, zs: zs as any };
}

export async function prepareDevice(): Promise<PrepareDeviceResult> {
  const { rs, zs } = await loadSettings();
  if (!rs?.vat_number || !/^\d{15}$/.test(String(rs.vat_number))) {
    throw new Error("VAT number is missing or not 15 digits. Update restaurant settings first.");
  }
  const existing = await loadDeviceKeysRow();
  if (existing?.compliance_csid_token_encrypted) {
    throw new Error("Device is already onboarded. Reset CSID before regenerating the key pair.");
  }

  const kp = generateDeviceKeyPair();
  const enc = await encryptSecret(kp.privateKeyHex);

  const csrPem = buildCsrPem({
    commonName: zs?.csr_common_name ?? "Yellow Chicken POS 01",
    serialNumber: zs?.csr_serial_number ?? "1-YC|2-POS|3-01",
    organizationUnit: zs?.csr_organization_unit ?? "Yellow Chicken Branch",
    organizationName: zs?.csr_organization_name ?? rs?.legal_name_ar ?? "Yellow Chicken",
    country: zs?.csr_country ?? "SA",
    vatNumber: rs.vat_number,
    invoiceType: zs?.csr_invoice_type ?? "0100",
    locationAddress: zs?.csr_location_address ?? "Makkah",
    businessCategory: zs?.csr_business_category ?? "Restaurant",
    environment: (zs?.environment as "simulation" | "production") ?? "simulation",
    publicKeyHex: kp.publicKeyHex,
    privateKeyHex: kp.privateKeyHex,
  });

  await supabaseAdmin
    .from("zatca_device_keys")
    .update({
      private_key_encrypted: enc.ciphertext,
      private_key_iv: enc.iv,
      public_key_pem: kp.publicKeyHex, // hex form is fine for sandbox
      csr_pem: csrPem,
    })
    .eq("id", true);

  await supabaseAdmin
    .from("zatca_settings")
    .update({
      onboarding_status: "ready_for_otp",
      last_error: null,
      notes: "CSR ready; awaiting OTP",
    })
    .eq("id", true);

  await zatcaLog({
    event: "csr.prepared",
    detail: { csrLength: csrPem.length },
  });

  return { ok: true, hasKey: true, hasCsr: true, csrLength: csrPem.length };
}

export interface ComplianceResult {
  ok: boolean;
  status: number;
  requestId?: string;
  error?: string;
}

/**
 * Calls the ZATCA sandbox compliance CSID endpoint with the stored CSR + OTP.
 *
 * NOTE: The exact endpoint path and response shape are determined by the
 * sandbox environment. We POST to `${sandbox_base_url}/compliance` with the
 * documented headers and accept the response body shape used by the
 * developer portal:
 *   { binarySecurityToken, secret, requestID }
 */
export async function requestComplianceCsid(otp: string): Promise<ComplianceResult> {
  const { zs } = await loadSettings();
  const row = await loadDeviceKeysRow();
  if (!row?.csr_pem || !row?.private_key_encrypted) {
    return { ok: false, status: 0, error: "CSR not prepared. Run prepareDevice first." };
  }

  const csrB64 = Buffer.from(row.csr_pem).toString("base64");
  const env = ((zs?.environment as string) === "production" ? "production" : "simulation") as
    | "simulation"
    | "production";
  const { zatcaEndpoints } = await import("./zatca-endpoints.server");
  const endpoint = zatcaEndpoints(env).complianceCsid;

  // Guard: never POST to a URL that is not the compliance endpoint.
  if (!endpoint.endsWith("/compliance")) {
    const msg = `Refusing to call ZATCA: built URL does not end with /compliance (env=${env}, url=${endpoint})`;
    await supabaseAdmin
      .from("zatca_settings")
      .update({ last_error: msg, onboarding_status: "ready_for_otp" })
      .eq("id", true);
    await zatcaLog({ level: "error", event: "csid.bad_url_guard", detail: { env, endpoint } });
    return { ok: false, status: 0, error: msg };
  }

  await zatcaLog({ event: "csid.request", detail: { env, endpoint } });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Version": "V2",
        "OTP": otp,
      },
      body: JSON.stringify({ csr: csrB64 }),
    });
  } catch (e: any) {
    await zatcaLog({ level: "error", event: "csid.network_error", detail: { message: String(e?.message ?? e) } });
    return { ok: false, status: 0, error: `Network error contacting ZATCA: ${e?.message ?? e}` };
  }

  const status = res.status;
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = { raw: await res.text().catch(() => "") };
  }

  if (!res.ok) {
    await supabaseAdmin
      .from("zatca_settings")
      .update({
        last_error: `CSID HTTP ${status} from ${endpoint} :: ${JSON.stringify(body).slice(0, 300)}`,
      })
      .eq("id", true);
    await zatcaLog({ level: "error", event: "csid.http_error", detail: { status, endpoint, body } });
    return { ok: false, status, error: `ZATCA returned ${status} from ${endpoint}` };
  }

  const token = body?.binarySecurityToken ?? body?.token ?? null;
  const secret = body?.secret ?? null;
  const requestId = body?.requestID ?? body?.requestId ?? null;
  if (!token || !secret) {
    await zatcaLog({ level: "error", event: "csid.missing_fields", detail: { keys: Object.keys(body ?? {}) } });
    return { ok: false, status, error: "ZATCA response missing token/secret." };
  }

  const encToken = await encryptSecret(String(token));
  const encSecret = await encryptSecret(String(secret));

  await supabaseAdmin
    .from("zatca_device_keys")
    .update({
      compliance_csid_token_encrypted: encToken.ciphertext,
      compliance_csid_iv: encToken.iv,
      compliance_csid_secret_encrypted: encSecret.ciphertext,
      compliance_csid_secret_iv: encSecret.iv,
      compliance_request_id: requestId ? String(requestId) : null,
      csid_issued_at: new Date().toISOString(),
    })
    .eq("id", true);

  await supabaseAdmin
    .from("zatca_settings")
    .update({
      onboarding_status: "onboarded",
      compliance_csid_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", true);

  await zatcaLog({ event: "csid.obtained", detail: { requestId } });
  return { ok: true, status, requestId: requestId ? String(requestId) : undefined };
}
