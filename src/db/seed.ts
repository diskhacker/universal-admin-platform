import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import {
	products,
	plans,
	roleDefinitions,
	notificationTemplates,
} from "./schema.js";

const client = postgres(
	process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/uap",
);
const db = drizzle(client);

async function seed() {
	console.log("Seeding Universal Admin Platform...");

	// ── Products ──
	const productData = [
		{
			name: "sigops",
			displayName: "SigOps",
			description: "AI-assisted Execution OS for Infrastructure",
		},
		{ name: "credora-os", displayName: "Credora OS", description: "Credora Operating System" },
		{ name: "assera", displayName: "Assera", description: "Assera Platform" },
		{ name: "paynex", displayName: "Paynex", description: "Paynex Payment Platform" },
		{ name: "talentra", displayName: "Talentra", description: "Talentra Talent Platform" },
		{ name: "lifetra", displayName: "Lifetra", description: "Lifetra Platform" },
	];

	for (const p of productData) {
		const [product] = await db
			.insert(products)
			.values(p)
			.onConflictDoUpdate({
				target: products.name,
				set: { displayName: p.displayName, description: p.description },
			})
			.returning();
		console.log(`  Product: ${product.name}`);

		// ── Plans per product ──
		const planData = [
			{
				name: "starter",
				displayName: "Starter",
				priceMonthly: 0,
				priceYearly: 0,
				sortOrder: 0,
				limits: { users: 2, api_keys: 2 },
				features: ["basic_dashboard", "basic_rbac"],
			},
			{
				name: "pro",
				displayName: "Pro",
				priceMonthly: 4900,
				priceYearly: 49000,
				sortOrder: 1,
				limits: { users: 10, api_keys: 10 },
				features: ["basic_dashboard", "basic_rbac", "advanced_features", "email_support"],
			},
			{
				name: "business",
				displayName: "Business",
				priceMonthly: 19900,
				priceYearly: 199000,
				sortOrder: 2,
				limits: { users: 50, api_keys: 50 },
				features: ["full_dashboard", "advanced_rbac", "sso", "priority_support"],
			},
			{
				name: "enterprise",
				displayName: "Enterprise",
				priceMonthly: 0,
				priceYearly: 0,
				sortOrder: 3,
				limits: { users: -1, api_keys: -1 },
				features: ["*"],
			},
		];

		for (const plan of planData) {
			await db
				.insert(plans)
				.values({ productId: product.id, ...plan })
				.onConflictDoUpdate({
					target: [plans.productId, plans.name],
					set: {
						displayName: plan.displayName,
						priceMonthly: plan.priceMonthly,
						priceYearly: plan.priceYearly,
						limits: plan.limits,
						features: plan.features,
					},
				});
		}
		console.log(`    Plans: ${planData.map((p) => p.name).join(", ")}`);

		// ── System Roles per product ──
		const roles = [
			{ name: "admin", displayName: "Admin", isSystem: true, isDefault: false, permissions: ["*"] },
			{
				name: "member",
				displayName: "Member",
				isSystem: true,
				isDefault: true,
				permissions: [
					"users:read",
					"settings:read",
					"audit:read",
					"billing:read",
					"api_keys:read",
					"notifications:read",
				],
			},
			{
				name: "viewer",
				displayName: "Viewer",
				isSystem: true,
				isDefault: false,
				permissions: ["users:read", "settings:read", "audit:read"],
			},
			{
				name: "billing_admin",
				displayName: "Billing Admin",
				isSystem: true,
				isDefault: false,
				permissions: ["billing:read", "billing:write", "settings:read"],
			},
		];

		for (const role of roles) {
			await db
				.insert(roleDefinitions)
				.values({ productId: product.id, ...role })
				.onConflictDoUpdate({
					target: [roleDefinitions.productId, roleDefinitions.name],
					set: { displayName: role.displayName, permissions: role.permissions },
				});
		}
		console.log(`    Roles: ${roles.map((r) => r.name).join(", ")}`);

		// ── Notification Templates ──
		const templates = [
			{
				name: "welcome_email",
				channel: "email",
				subject: "Welcome to {{product_name}}!",
				body: "Hi {{first_name}}, welcome to {{product_name}}! Your account is ready.",
			},
			{
				name: "invite_user",
				channel: "email",
				subject: "You've been invited to {{tenant_name}}",
				body: "Hi, {{inviter_name}} invited you to join {{tenant_name}} on {{product_name}}. Click here to accept: {{invite_url}}",
			},
			{
				name: "password_reset",
				channel: "email",
				subject: "Reset your password",
				body: "Click the link to reset your password: {{reset_url}}. This link expires in 1 hour.",
			},
		];

		for (const t of templates) {
			await db
				.insert(notificationTemplates)
				.values({ productId: product.id, ...t })
				.onConflictDoUpdate({
					target: [
						notificationTemplates.productId,
						notificationTemplates.name,
						notificationTemplates.channel,
					],
					set: { subject: t.subject, body: t.body },
				});
		}
		console.log(`    Templates: ${templates.map((t) => t.name).join(", ")}`);
	}

	// ── Super Admin Role (global, anchored to sigops product) ──
	const [sigops] = await db
		.select()
		.from(products)
		.where(eq(products.name, "sigops"))
		.limit(1);

	if (sigops) {
		await db
			.insert(roleDefinitions)
			.values({
				productId: sigops.id,
				name: "super_admin",
				displayName: "Super Admin",
				isSystem: true,
				isDefault: false,
				permissions: [
					"*",
					"super:tenants:read",
					"super:tenants:write",
					"super:tenants:delete",
					"super:settings:write",
				],
			})
			.onConflictDoUpdate({
				target: [roleDefinitions.productId, roleDefinitions.name],
				set: {},
			});
		console.log("  Super Admin role created");
	}

	console.log("\nSeed complete!");
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => client.end());
