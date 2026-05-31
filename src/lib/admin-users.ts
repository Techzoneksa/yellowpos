// Hook for admin user management (backend-wired).
import { useCallback, useEffect, useState } from "react";
import {
  listUsers, createUser, updateUser, resetCredentials, setUserActive, deleteUser,
} from "@/lib/api-client";

export type AppRole = "owner" | "manager" | "finance" | "cashier";

export type UserDTO = {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  role: AppRole;
  active: boolean;
  last_login: string | null;
  created_at: string;
};

export function useAdminUsers() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows: any = await listUsers();
      setUsers(rows as UserDTO[]);
    } catch {
      // silent — manager screens already toast separately
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return {
    users, loading, reload,
    createUser: async (input: { fullName: string; username: string; role: AppRole; email?: string | null; password: string; active?: boolean; }) => {
      await createUser({ fullName: input.fullName, username: input.username, role: input.role, email: input.email, password: input.password, active: input.active }); await reload();
    },
    updateUser: async (input: { id: string; fullName: string; username: string; role: AppRole; email?: string | null; active: boolean; }) => {
      await updateUser({ id: input.id, fullName: input.fullName, username: input.username, role: input.role, email: input.email, active: input.active }); await reload();
    },
    resetCredentials: async (id: string, password: string) => {
      await resetCredentials({ id, password }); await reload();
    },
    setActive: async (id: string, active: boolean) => {
      await setUserActive({ id, active }); await reload();
    },
    deleteUser: async (id: string) => {
      await deleteUser({ id }); await reload();
    },
  };
}
