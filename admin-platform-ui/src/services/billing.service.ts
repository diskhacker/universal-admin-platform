import { apiGet, apiPost } from "@/lib/api";
import type { Plan, Subscription } from "@/types";

export const billingService = {
  listPlans(productId: string) {
    return apiGet<Plan[]>(`/billing/plans/${productId}`);
  },
  getSubscription(productId: string) {
    return apiGet<Subscription>(`/billing/subscription/${productId}`);
  },
  changePlan(productId: string, planId: string) {
    return apiPost<Subscription>(
      `/billing/subscription/${productId}/change`,
      { planId }
    );
  },
  createCheckoutSession(input: {
    productId: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return apiPost<{ url: string; sessionId: string }>(
      "/billing/checkout",
      input
    );
  },
  getUsage(productId: string) {
    return apiGet<{
      usage: Record<string, number>;
      limits: Record<string, number>;
      plan: string;
    }>(`/billing/usage/${productId}`);
  },
};
