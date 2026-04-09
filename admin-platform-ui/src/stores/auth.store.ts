import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "@/types";
import { STORAGE_KEYS } from "@/lib/config";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  tenantSlug: string | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: CurrentUser | null) => void;
  setTenantSlug: (slug: string | null) => void;
  clear: () => void;
  hasPermission: (perm: string) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenantSlug: null,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setTenantSlug: (tenantSlug) => set({ tenantSlug }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
      hasPermission: (perm) => {
        const perms = get().user?.permissions ?? [];
        if (perms.includes("*")) return true;
        if (perms.includes(perm)) return true;
        // Support resource:* wildcards
        const [resource] = perm.split(":");
        return perms.includes(`${resource}:*`);
      },
      isSuperAdmin: () => {
        const perms = get().user?.permissions ?? [];
        return perms.some((p) => p.startsWith("super:") || p === "*");
      },
    }),
    {
      name: STORAGE_KEYS.accessToken + ".state",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
      }),
    }
  )
);
