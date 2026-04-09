import { apiGet, apiPost } from "@/lib/api";
import type { ApiKey } from "@/types";

export const apiKeysService = {
  list() {
    return apiGet<ApiKey[]>("/api-keys");
  },
  create(input: {
    name: string;
    scopes: string[];
    rateLimit?: number;
    expiresAt?: string;
  }) {
    return apiPost<ApiKey>("/api-keys", input);
  },
  revoke(id: string) {
    return apiPost<{ message: string }>(`/api-keys/${id}/revoke`);
  },
  rotate(id: string) {
    return apiPost<ApiKey>(`/api-keys/${id}/rotate`);
  },
};
