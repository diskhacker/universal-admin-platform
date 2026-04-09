import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "../../config/database.js";
import { paginationToSkipTake, parsePagination } from "../../shared/utils/index.js";
import { authenticate, requirePermission } from "../../middleware/auth.js";
import type { PaginatedResult } from "../../shared/types/index.js";

// ── Service ──

export class NotificationService {
  private db = getDb();

  async send(tenantId: string, input: { userId?: string; channel: string; subject?: string; body: string; metadata?: Record<string, unknown> }) {
    const notification = await this.db.notification.create({
      data: { tenantId, ...input, metadata: input.metadata || {} },
    });

    // Dispatch based on channel
    switch (input.channel) {
      case "email":
        await this.sendEmail(input.subject || "", input.body, input.metadata?.to as string);
        break;
      case "sms":
        await this.sendSms(input.body, input.metadata?.phone as string);
        break;
      case "webhook":
        await this.sendWebhook(input.body, input.metadata?.url as string);
        break;
      case "in_app":
        // Already stored in DB — frontend polls or uses WebSocket
        break;
    }

    await this.db.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date() } });
    return notification;
  }

  async listForUser(tenantId: string, userId: string, page: number, limit: number): Promise<PaginatedResult<any>> {
    const where = { tenantId, userId, channel: "in_app" };
    const { skip, take } = paginationToSkipTake({ page, limit });
    const [data, total] = await Promise.all([
      this.db.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.db.notification.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async markRead(notificationId: string, userId: string) {
    await this.db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: "READ", readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.db.notification.updateMany({
      where: { tenantId, userId, status: { not: "READ" } },
      data: { status: "READ", readAt: new Date() },
    });
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    return this.db.notification.count({ where: { tenantId, userId, channel: "in_app", status: { not: "READ" } } });
  }

  // Template rendering
  async sendFromTemplate(tenantId: string, productId: string, templateName: string, channel: string, variables: Record<string, string>, userId?: string) {
    const template = await this.db.notificationTemplate.findUnique({
      where: { productId_name_channel: { productId, name: templateName, channel } },
    });
    if (!template || !template.isActive) return null;

    let body = template.body;
    let subject = template.subject || "";
    for (const [key, value] of Object.entries(variables)) {
      body = body.replace(new RegExp(`{{${key}}}`, "g"), value);
      subject = subject.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    return this.send(tenantId, { userId, channel, subject, body });
  }

  // Stubs for external delivery — replace with actual providers
  private async sendEmail(subject: string, body: string, to?: string) {
    // TODO: Integrate with SMTP / SendGrid / SES
  }
  private async sendSms(body: string, phone?: string) {
    // TODO: Integrate with Twilio / SNS
  }
  private async sendWebhook(body: string, url?: string) {
    if (!url) return;
    try {
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: body }) });
    } catch { /* retry logic here */ }
  }
}

// ── Routes ──

const notifications = new Hono();
const service = new NotificationService();

notifications.get("/", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const { page, limit } = parsePagination(c.req.query("page"), c.req.query("limit"));
  const result = await service.listForUser(ctx.tenantId!, ctx.auth!.userId, page, limit);
  return c.json({ data: result });
});

notifications.get("/unread-count", authenticate, async (c) => {
  const ctx = c.get("ctx");
  const count = await service.getUnreadCount(ctx.tenantId!, ctx.auth!.userId);
  return c.json({ data: { count } });
});

notifications.post("/:id/read", authenticate, async (c) => {
  const ctx = c.get("ctx");
  await service.markRead(c.req.param("id"), ctx.auth!.userId);
  return c.json({ message: "Marked as read" });
});

notifications.post("/read-all", authenticate, async (c) => {
  const ctx = c.get("ctx");
  await service.markAllRead(ctx.tenantId!, ctx.auth!.userId);
  return c.json({ message: "All marked as read" });
});

notifications.post("/send", authenticate, requirePermission("notifications:write"),
  zValidator("json", z.object({
    userId: z.string().optional(),
    channel: z.enum(["email", "sms", "push", "webhook", "in_app"]),
    subject: z.string().optional(),
    body: z.string(),
    metadata: z.record(z.unknown()).optional(),
  })),
  async (c) => {
    const ctx = c.get("ctx");
    const result = await service.send(ctx.tenantId!, c.req.valid("json"));
    return c.json({ data: result }, 201);
  }
);

export default notifications;
