// Compatibility shim for @tanstack/react-start useServerFn
// This module is imported wherever useServerFn was used from @tanstack/react-start
// It maps the old server function call pattern to our new API client calls
import * as api from "./api-client";

type ServerFn<T = any> = (data?: { data?: T }) => Promise<T>;

export function useServerFn<T extends (...args: any[]) => Promise<any>>(fn: T): ServerFn<any> {
  return function(data?: { data?: any }) {
    return fn(data?.data);
  } as ServerFn<any>;
}

// Re-export createServerFn for any remaining imports
export const createServerFn = {
  create: (opts: any) => ({
    handler: async (fn: any) => fn,
    middleware: (m: any) => ({ handler: async (args: any) => m({ next: async ({ context }: any) => context }) }),
    inputValidator: (v: any) => ({ handler: async (fn: any) => fn }),
  }),
};