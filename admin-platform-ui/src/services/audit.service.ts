import { api, apiGet } from "@/lib/api";
import type { AuditLog, PaginatedResult } from "@/types";

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

export const auditService = {
  list(filters: AuditFilters = {}) {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    return apiGet<PaginatedResult<AuditLog>>(`/audit?${q.toString()}`);
  },
  getStats() {
    return apiGet<{ today: number; week: number; total: number }>(
      "/audit/stats"
    );
  },
  async exportLogs(format: "csv" | "json", from?: string, to?: string) {
    const q = new URLSearchParams();
    q.set("format", format);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const resp = await api.get(`/audit/export?${q.toString()}`, {
      responseType: "blob",
    });
    return resp.data as Blob;
  },
};
