import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { PaginatedResult, User } from "@/types";

export const usersService = {
  list(params: { page?: number; limit?: number; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.search) q.set("search", params.search);
    return apiGet<PaginatedResult<User>>(`/users?${q.toString()}`);
  },
  getById(id: string) {
    return apiGet<User>(`/users/${id}`);
  },
  create(input: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
  }) {
    return apiPost<User>("/users", input);
  },
  update(
    id: string,
    input: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string | null;
      status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
      preferences?: Record<string, unknown>;
    }
  ) {
    return apiPatch<User>(`/users/${id}`, input);
  },
  delete(id: string) {
    return apiDelete<{ message: string }>(`/users/${id}`);
  },
};
