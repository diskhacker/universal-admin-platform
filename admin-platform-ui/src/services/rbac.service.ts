import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { Role } from "@/types";

export const rbacService = {
  listRoles(productId: string) {
    return apiGet<Role[]>(`/rbac/roles/${productId}`);
  },
  createRole(
    productId: string,
    input: {
      name: string;
      displayName: string;
      description?: string;
      permissions: string[];
    }
  ) {
    return apiPost<Role>(`/rbac/roles/${productId}`, input);
  },
  updateRole(
    id: string,
    input: {
      displayName?: string;
      description?: string;
      permissions?: string[];
    }
  ) {
    return apiPatch<Role>(`/rbac/roles/${id}`, input);
  },
  deleteRole(id: string) {
    return apiDelete<{ message: string }>(`/rbac/roles/${id}`);
  },
  assignRole(input: { userId: string; roleId: string; expiresAt?: string }) {
    return apiPost<unknown>("/rbac/assign", input);
  },
  revokeRole(userId: string, roleId: string) {
    return apiDelete<{ message: string }>(`/rbac/assign/${userId}/${roleId}`);
  },
  getUserRoles(userId: string) {
    return apiGet<Array<{ roleId: string; role: Role }>>(
      `/rbac/users/${userId}/roles`
    );
  },
};
