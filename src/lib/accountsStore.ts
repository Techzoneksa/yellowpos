// Frontend-only accounts store (prototype). Persists in localStorage so that
// users added from Manager > Users can actually sign in.
import { INITIAL_USERS, type UserRecord, type RoleId } from "./phase2Data";

const KEY = "yc.accounts.v1";

// Seed credentials for the built-in owner account (kept private, not shown in UI).
const SEED_CREDENTIALS: Record<string, { password?: string; pin?: string }> = {
  u_owner: { password: "Sultan2030@%_Y" },
};

function seed(): UserRecord[] {
  return INITIAL_USERS.map((u) => ({ ...u, ...(SEED_CREDENTIALS[u.id] || {}) }));
}

function applySeedCreds(list: UserRecord[]): UserRecord[] {
  return list.map((u) => {
    const s = SEED_CREDENTIALS[u.id];
    if (!s) return u;
    return {
      ...u,
      password: u.password ?? s.password,
      pin: u.pin ?? s.pin,
    };
  });
}

function read(): UserRecord[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return applySeedCreds(JSON.parse(raw) as UserRecord[]);
  } catch {
    return seed();
  }
}

function write(list: UserRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("yc-accounts-changed"));
}

export const accountsStore = {
  list: read,
  save(u: UserRecord) {
    const list = read();
    const idx = list.findIndex((x) => x.id === u.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...u };
    else list.unshift(u);
    write(list);
  },
  remove(id: string) {
    write(read().filter((x) => x.id !== id));
  },
  setActive(id: string, active: boolean) {
    write(read().map((x) => (x.id === id ? { ...x, active } : x)));
  },
  resetCredentials(id: string, creds: { password?: string; pin?: string }) {
    write(read().map((x) => (x.id === id ? { ...x, ...creds } : x)));
  },
  touchLogin(id: string) {
    write(read().map((x) => (x.id === id ? { ...x, lastLogin: Date.now() } : x)));
  },
};

export function authenticatePOS(username: string, pin: string) {
  const u = username.trim().toLowerCase();
  const acc = accountsStore.list().find(
    (a) => a.active && a.role === "cashier" && a.username.toLowerCase() === u && (a.pin ?? "") === pin,
  );
  if (acc) accountsStore.touchLogin(acc.id);
  return acc || null;
}

export function authenticateAdmin(emailOrUser: string, password: string) {
  const q = emailOrUser.trim().toLowerCase();
  const acc = accountsStore.list().find(
    (a) =>
      a.active &&
      a.role !== "cashier" &&
      ((a.email && a.email.toLowerCase() === q) || a.username.toLowerCase() === q) &&
      (a.password ?? "") === password,
  );
  if (acc) accountsStore.touchLogin(acc.id);
  return acc || null;
}

export type { UserRecord, RoleId };
