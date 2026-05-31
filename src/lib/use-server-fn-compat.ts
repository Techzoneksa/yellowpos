// Compatibility shim for @tanstack/react-start
// Maps old useServerFn calls to new API client calls
import * as api from "./api-client";

type AnyFn = (...args: any[]) => Promise<any>;

export function useServerFn<T extends AnyFn>(fn: T) {
  return function wrapper(data?: { data?: any }) {
    return fn(data?.data as any);
  } as T;
}

// Re-export all API functions for convenience
export { api };