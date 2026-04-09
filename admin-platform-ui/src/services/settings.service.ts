import { apiGet, apiPut, apiDelete, apiPatch } from "@/lib/api";
import type { FeatureFlag, TenantSetting } from "@/types";

export const settingsService = {
  getTenantSettings(productId?: string) {
    const q = productId ? `?productId=${productId}` : "";
    return apiGet<TenantSetting[]>(`/settings/tenant${q}`);
  },
  setTenantSetting(key: string, value: unknown, productId?: string) {
    return apiPut<TenantSetting>("/settings/tenant", { key, value, productId });
  },
  bulkSetTenantSettings(settings: Record<string, unknown>, productId?: string) {
    return apiPut<TenantSetting[]>("/settings/tenant/bulk", {
      settings,
      productId,
    });
  },
  deleteTenantSetting(key: string, productId?: string) {
    const q = productId ? `?productId=${productId}` : "";
    return apiDelete<{ message: string }>(`/settings/tenant/${key}${q}`);
  },
  listFeatureFlags(productId: string) {
    return apiGet<FeatureFlag[]>(`/settings/flags/${productId}`);
  },
  setFeatureFlag(
    productId: string,
    input: {
      name: string;
      isEnabled: boolean;
      targetType?: "all" | "tenant" | "plan";
      targetIds?: string[];
    }
  ) {
    return apiPut<FeatureFlag>(`/settings/flags/${productId}`, input);
  },
  getUserPreferences() {
    return apiGet<Record<string, unknown>>("/settings/preferences");
  },
  updateUserPreferences(prefs: Record<string, unknown>) {
    return apiPatch<Record<string, unknown>>("/settings/preferences", prefs);
  },
};
