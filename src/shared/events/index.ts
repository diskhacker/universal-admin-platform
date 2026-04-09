type Handler = (data: unknown) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Handler[]>();

  on(event: string, handler: Handler): void {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  async emit(event: string, data: unknown): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    await Promise.allSettled(handlers.map((h) => h(data)));
  }

  off(event: string, handler: Handler): void {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(event, existing.filter((h) => h !== handler));
  }
}

export const eventBus = new EventBus();

// Event types
export const Events = {
  TENANT_CREATED: "tenant.created",
  TENANT_UPDATED: "tenant.updated",
  TENANT_SUSPENDED: "tenant.suspended",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  ROLE_ASSIGNED: "role.assigned",
  ROLE_REVOKED: "role.revoked",
  API_KEY_CREATED: "api_key.created",
  API_KEY_REVOKED: "api_key.revoked",
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  APPROVAL_REQUESTED: "approval.requested",
  APPROVAL_RESOLVED: "approval.resolved",
  SETTINGS_UPDATED: "settings.updated",
} as const;
