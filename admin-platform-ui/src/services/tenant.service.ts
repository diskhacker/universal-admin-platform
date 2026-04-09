import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import type { PaginatedResult, Tenant } from "@/types";

export const tenantService = {
  getCurrent() {
    return apiGet<Tenant>("/tenants/current");
  },
  updateCurrent(input: Partial<Tenant>) {
    return apiPatch<Tenant>("/tenants/current", input);
  },
  // Super admin
  list(params: { page?: number; limit?: number; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    return apiGet<PaginatedResult<Tenant>>(`/tenants?${q.toString()}`);
  },
  getById(id: string) {
    return apiGet<Tenant>(`/tenants/${id}`);
  },
  updateStatus(id: string, status: string) {
    return apiPatch<Tenant>(`/tenants/${id}/status`, { status });
  },
  delete(id: string) {
    return apiDelete<{ message: string }>(`/tenants/${id}`);
  },
};
