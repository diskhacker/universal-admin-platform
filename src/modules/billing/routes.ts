import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../../config/database.js";
import { getEnv } from "../../config/env.js";
import { NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { eventBus, Events } from "../../shared/events/index.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

// ── Service ──

export class BillingService {
  private db = getDb();

  private getStripe() {
    const key = getEnv().STRIPE_SECRET_KEY;
    if (!key) throw new ValidationError("Stripe not configured");
    // Dynamic import to avoid errors when Stripe is not configured
    const Stripe = require("stripe");
    return new Stripe(key);
  }

  async listPlans(productId: string) {
    return this.db.plan.findMany({
      where: { productId, isPublic: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getSubscription(tenantId: string, productId: string) {
    const sub = await this.db.tenantProduct.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");
    return sub;
  }

  async changePlan(tenantId: string, productId: string, newPlanId: string) {
    const newPlan = await this.db.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new NotFoundError("Plan", newPlanId);

    const sub = await this.db.tenantProduct.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });
    if (!sub) throw new NotFoundError("Subscription");

    // Update Stripe subscription if exists
    if (sub.stripeSubId && newPlan.stripePriceIdMo) {
      const stripe = this.getStripe();
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubId);
      await stripe.subscriptions.update(sub.stripeSubId, {
        items: [{ id: stripeSub.items.data[0].id, price: newPlan.stripePriceIdMo }],
        proration_behavior: "create_prorations",
      });
    }

    const updated = await this.db.tenantProduct.update({
      where: { tenantId_productId: { tenantId, productId } },
      data: { planId: newPlanId },
      include: { plan: true },
    });

    await eventBus.emit(Events.SUBSCRIPTION_UPDATED, { tenantId, productId, planId: newPlanId });
    return updated;
  }

  async createCheckoutSession(tenantId: string, productId: string, planId: string, successUrl: string, cancelUrl: string) {
    const plan = await this.db.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.stripePriceIdMo) throw new ValidationError("Plan not available for purchase");

    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError("Tenant", tenantId);

    const stripe = this.getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.stripePriceIdMo, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId, productId, planId },
      client_reference_id: tenantId,
    });

    return { url: session.url, sessionId: session.id };
  }

  async recordUsage(tenantId: string, productId: string, metric: string, quantity: number) {
    const sub = await this.db.tenantProduct.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });
    if (!sub) return;

    const currentUsage = (sub.usageData as Record<string, number>) || {};
    currentUsage[metric] = (currentUsage[metric] || 0) + quantity;

    await this.db.tenantProduct.update({
      where: { tenantId_productId: { tenantId, productId } },
      data: { usageData: currentUsage },
    });
  }

  async getUsage(tenantId: string, productId: string) {
    const sub = await this.db.tenantProduct.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundError("Subscription");
    return { usage: sub.usageData, limits: sub.plan.limits, plan: sub.plan.name };
  }

  async handleWebhook(payload: string, signature: string) {
    const stripe = this.getStripe();
    const webhookSecret = getEnv().STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new ValidationError("Stripe webhook not configured");

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { tenantId, productId, planId } = session.metadata;
        await this.db.tenantProduct.update({
          where: { tenantId_productId: { tenantId, productId } },
          data: { planId, stripeSubId: session.subscription, status: "ACTIVE" },
        });
        await this.db.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const sub = await this.db.tenantProduct.findFirst({ where: { stripeSubId: invoice.subscription } });
        if (sub) await this.db.tenantProduct.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const sub = await this.db.tenantProduct.findFirst({ where: { stripeSubId: subscription.id } });
        if (sub) {
          await this.db.tenantProduct.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
          await eventBus.emit(Events.SUBSCRIPTION_CANCELLED, { tenantId: sub.tenantId, productId: sub.productId });
        }
        break;
      }
    }
  }
}

// ── Routes ──

const billing = new Hono();
const service = new BillingService();

billing.get("/plans/:productId", async (c) => {
  const plans = await service.listPlans(c.req.param("productId"));
  return c.json({ data: plans });
});

billing.get("/subscription/:productId", authenticate, requirePermission("billing:read"), async (c) => {
  const ctx = c.get("ctx");
  const sub = await service.getSubscription(ctx.tenantId!, c.req.param("productId"));
  return c.json({ data: sub });
});

billing.post("/subscription/:productId/change", authenticate, requirePermission("billing:write"),
  zValidator("json", z.object({ planId: z.string() })), async (c) => {
  const ctx = c.get("ctx");
  const { planId } = c.req.valid("json");
  const sub = await service.changePlan(ctx.tenantId!, c.req.param("productId"), planId);
  await logAudit(ctx, "subscription.plan_changed", "subscription", sub.id, { planId });
  return c.json({ data: sub });
});

billing.post("/checkout", authenticate, requirePermission("billing:write"),
  zValidator("json", z.object({ productId: z.string(), planId: z.string(), successUrl: z.string().url(), cancelUrl: z.string().url() })),
  async (c) => {
    const ctx = c.get("ctx");
    const input = c.req.valid("json");
    const session = await service.createCheckoutSession(ctx.tenantId!, input.productId, input.planId, input.successUrl, input.cancelUrl);
    return c.json({ data: session });
  }
);

billing.get("/usage/:productId", authenticate, requirePermission("billing:read"), async (c) => {
  const ctx = c.get("ctx");
  const usage = await service.getUsage(ctx.tenantId!, c.req.param("productId"));
  return c.json({ data: usage });
});

billing.post("/webhook", async (c) => {
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature") || "";
  await service.handleWebhook(body, signature);
  return c.json({ received: true });
});

export default billing;
