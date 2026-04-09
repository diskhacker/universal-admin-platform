import { apiPost, apiGet } from "@/lib/api";
import type { AuthTokens, CurrentUser } from "@/types";

export const authService = {
  login(input: { email: string; password: string; tenantSlug: string }) {
    return apiPost<AuthTokens>("/auth/login", input);
  },
  register(input: {
    tenantName: string;
    tenantSlug: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    productId: string;
  }) {
    return apiPost<AuthTokens>("/auth/register", input);
  },
  refresh(refreshToken: string) {
    return apiPost<AuthTokens>("/auth/refresh", { refreshToken });
  },
  me() {
    return apiGet<CurrentUser>("/auth/me");
  },
};
