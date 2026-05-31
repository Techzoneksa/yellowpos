// Compatibility shim - replaces TanStack Start server functions with Next.js API calls
// All useServerFn calls now use the API client instead
import * as api from "./api-client";

export function useServerFn<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return function(data?: Parameters<T>[0] extends undefined ? undefined : { data: Parameters<T>[0] }) {
    return fn(data?.data as any);
  } as T;
}

export { api as createServerFn };
export { api as serverFunctions };