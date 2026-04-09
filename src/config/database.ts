/**
 * Prisma-compatible database shim over Drizzle ORM.
 *
 * The service/route layer was written using Prisma-style query syntax
 * (db.user.findUnique, db.auditLog.create, etc.) but the underlying client
 * is Drizzle ORM via postgres.js. This module adorns the raw Drizzle client
 * with Prisma-style model accessors that translate the familiar Prisma
 * `{ where, select, include, orderBy, skip, take, data }` arguments into
 * Drizzle queries.
 *
 * The scope is intentionally narrow: only the Prisma API surface actually
 * used by this codebase is implemented. The raw Drizzle methods (`select`,
 * `insert`, `update`, `delete`, `query`, `execute`, etc.) remain untouched
 * on the returned object so modules that prefer Drizzle native syntax
 * (e.g. `auth.service.ts`) keep working unchanged.
 */

import {
  eq,
  and,
  or,
  ilike,
  ne,
  isNull,
  isNotNull,
  inArray,
  gte,
  gt,
  lte,
  lt,
  asc,
  desc,
  sql,
  not,
  type SQL,
} from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import { getDb as getRawDb, disconnectDb } from "../db/index.js";
import * as schema from "../db/schema.js";

export { disconnectDb };
export { schema };

// ────────────────────────────────────────────────────────────────
// Table registry — maps Prisma model names → Drizzle tables.
// ────────────────────────────────────────────────────────────────

const TABLE_MAP = {
  product: schema.products,
  tenant: schema.tenants,
  tenantProduct: schema.tenantProducts,
  plan: schema.plans,
  user: schema.users,
  oauthAccount: schema.oauthAccounts,
  session: schema.sessions,
  invitation: schema.invitations,
  roleDefinition: schema.roleDefinitions,
  roleAssignment: schema.roleAssignments,
  approvalRequest: schema.approvalRequests,
  apiKey: schema.apiKeys,
  auditLog: schema.auditLogs,
  notificationTemplate: schema.notificationTemplates,
  notification: schema.notifications,
  tenantSetting: schema.tenantSettings,
  featureFlag: schema.featureFlags,
} as const;

type ModelName = keyof typeof TABLE_MAP;

// ────────────────────────────────────────────────────────────────
// Relation registry — only the ones this codebase actually reads
// through `include`/nested `select`.
// ────────────────────────────────────────────────────────────────

interface RelationDef {
  targetModel: ModelName;
  type: "one" | "many";
  fromKey: string; // Column on the owning row
  toKey: string; // Column on the related row
}

const RELATIONS: Record<string, Record<string, RelationDef>> = {
  auditLog: {
    actor: { targetModel: "user", type: "one", fromKey: "actorId", toKey: "id" },
  },
  tenantProduct: {
    plan: { targetModel: "plan", type: "one", fromKey: "planId", toKey: "id" },
  },
  roleAssignment: {
    role: { targetModel: "roleDefinition", type: "one", fromKey: "roleId", toKey: "id" },
  },
  user: {
    roleAssignments: {
      targetModel: "roleAssignment",
      type: "many",
      fromKey: "id",
      toKey: "userId",
    },
  },
};

// ────────────────────────────────────────────────────────────────
// Argument shapes (loose — Prisma-ish).
// ────────────────────────────────────────────────────────────────

type WhereValue = any;
type WhereObject = Record<string, WhereValue>;
interface IncludeEntry {
  select?: Record<string, any>;
  include?: Record<string, any>;
}
type SelectObject = Record<string, boolean | IncludeEntry>;
type IncludeObject = Record<string, boolean | IncludeEntry>;
type OrderByObject = Record<string, "asc" | "desc">;

interface FindArgs {
  where?: WhereObject;
  select?: SelectObject;
  include?: IncludeObject;
  orderBy?: OrderByObject | OrderByObject[];
  skip?: number;
  take?: number;
}

// ────────────────────────────────────────────────────────────────
// Helpers: where / orderBy / data preprocessing
// ────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, any> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    Object.getPrototypeOf(v) === Object.prototype
  );
}

function buildColumnCondition(column: PgColumn, value: WhereValue): SQL | undefined {
  if (value === null) return isNull(column);
  if (value === undefined) return undefined;
  if (value instanceof Date) return eq(column, value);
  if (Array.isArray(value)) return inArray(column, value);

  if (isPlainObject(value)) {
    const conditions: SQL[] = [];
    for (const [op, val] of Object.entries(value)) {
      switch (op) {
        case "equals":
          conditions.push(val === null ? isNull(column) : eq(column, val as any));
          break;
        case "not":
          if (val === null) conditions.push(isNotNull(column));
          else conditions.push(ne(column, val as any));
          break;
        case "in":
          conditions.push(inArray(column, val as any[]));
          break;
        case "notIn":
          conditions.push(not(inArray(column, val as any[])));
          break;
        case "gt":
          conditions.push(gt(column, val as any));
          break;
        case "gte":
          conditions.push(gte(column, val as any));
          break;
        case "lt":
          conditions.push(lt(column, val as any));
          break;
        case "lte":
          conditions.push(lte(column, val as any));
          break;
        case "contains":
          conditions.push(ilike(column, `%${val}%`));
          break;
        case "startsWith":
          conditions.push(ilike(column, `${val}%`));
          break;
        case "endsWith":
          conditions.push(ilike(column, `%${val}`));
          break;
        case "mode":
          // Mode is always insensitive in our shim (we always use ilike).
          break;
        default:
          // Unknown operator — ignore rather than crash.
          break;
      }
    }
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions);
  }

  return eq(column, value as any);
}

function buildWhere(table: PgTable, where: WhereObject | undefined): SQL | undefined {
  if (!where) return undefined;
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === "AND") {
      const list = Array.isArray(value) ? value : [value];
      const parts = list
        .map((w) => buildWhere(table, w))
        .filter((s): s is SQL => s !== undefined);
      if (parts.length) conditions.push(and(...parts)!);
      continue;
    }

    if (key === "OR") {
      const list = Array.isArray(value) ? value : [value];
      const parts = list
        .map((w) => buildWhere(table, w))
        .filter((s): s is SQL => s !== undefined);
      if (parts.length) conditions.push(or(...parts)!);
      continue;
    }

    if (key === "NOT") {
      const sub = buildWhere(table, value as WhereObject);
      if (sub) conditions.push(not(sub));
      continue;
    }

    const column = (table as any)[key] as PgColumn | undefined;
    if (!column) continue;
    const condition = buildColumnCondition(column, value);
    if (condition) conditions.push(condition);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

function normalizeOrderBy(
  table: PgTable,
  orderBy: OrderByObject | OrderByObject[] | undefined,
): SQL[] {
  if (!orderBy) return [];
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const orders: SQL[] = [];
  for (const entry of list) {
    for (const [key, dir] of Object.entries(entry)) {
      const column = (table as any)[key];
      if (!column) continue;
      orders.push(dir === "desc" ? desc(column) : asc(column));
    }
  }
  return orders;
}

/**
 * Prisma composite unique keys are passed as `{ productId_name: { ... } }`.
 * Unwrap any such nested object back to its flat columns so we can build
 * a normal where clause.
 */
function resolveUniqueWhere(where: WhereObject): WhereObject {
  const result: WhereObject = {};
  for (const [key, value] of Object.entries(where)) {
    if (
      isPlainObject(value) &&
      key.includes("_") &&
      Object.values(value).every(
        (v) =>
          v === null ||
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean" ||
          v instanceof Date,
      )
    ) {
      for (const [subKey, subVal] of Object.entries(value)) {
        result[subKey] = subVal;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function preprocessInsertData(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function preprocessUpdateData(
  table: PgTable,
  data: Record<string, any>,
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (isPlainObject(value)) {
      if ("increment" in value) {
        const column = (table as any)[key];
        if (column) out[key] = sql`${column} + ${value.increment}`;
        continue;
      }
      if ("decrement" in value) {
        const column = (table as any)[key];
        if (column) out[key] = sql`${column} - ${value.decrement}`;
        continue;
      }
      if ("set" in value) {
        out[key] = value.set;
        continue;
      }
    }
    out[key] = value;
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Include / select projection
// ────────────────────────────────────────────────────────────────

async function attachRelations(
  db: any,
  modelName: string,
  rows: any[],
  spec: IncludeObject | SelectObject,
): Promise<any[]> {
  if (rows.length === 0) return rows;
  const rels = RELATIONS[modelName];
  if (!rels) return rows;

  for (const [relName, relArgs] of Object.entries(spec)) {
    const relDef = rels[relName];
    if (!relDef) continue;
    if (relArgs === false || relArgs === undefined) continue;

    const targetTable = TABLE_MAP[relDef.targetModel];
    const fromVals = Array.from(
      new Set(rows.map((r) => r[relDef.fromKey]).filter((v) => v !== null && v !== undefined)),
    );

    if (fromVals.length === 0) {
      for (const row of rows) row[relName] = relDef.type === "many" ? [] : null;
      continue;
    }

    const targetCol = (targetTable as any)[relDef.toKey] as PgColumn;
    let relatedRows: any[] = await db
      .select()
      .from(targetTable as any)
      .where(inArray(targetCol, fromVals as any[]));

    // Recurse into nested select/include on the relation.
    if (isPlainObject(relArgs)) {
      const sub = relArgs as IncludeEntry;
      if (sub.include) {
        relatedRows = await attachRelations(
          db,
          relDef.targetModel,
          relatedRows,
          sub.include,
        );
      }
      if (sub.select) {
        relatedRows = await attachRelations(
          db,
          relDef.targetModel,
          relatedRows,
          sub.select,
        );
        relatedRows = projectSelect(relatedRows, sub.select);
      }
    }

    const byKey = new Map<any, any[]>();
    for (const rr of relatedRows) {
      const k = rr[relDef.toKey];
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(rr);
    }

    for (const row of rows) {
      const matched = byKey.get(row[relDef.fromKey]) ?? [];
      row[relName] = relDef.type === "many" ? matched : matched[0] ?? null;
    }
  }

  return rows;
}

function projectSelect(rows: any[], select: SelectObject): any[] {
  return rows.map((row) => {
    const out: any = {};
    for (const [key, val] of Object.entries(select)) {
      if (val === true) {
        out[key] = row[key];
      } else if (isPlainObject(val)) {
        out[key] = row[key];
      }
    }
    return out;
  });
}

// ────────────────────────────────────────────────────────────────
// Model wrapper
// ────────────────────────────────────────────────────────────────

class Model {
  constructor(
    private db: any,
    private table: PgTable,
    private modelName: string,
  ) {}

  async findMany(args: FindArgs = {}): Promise<any[]> {
    let query: any = this.db.select().from(this.table as any);
    const whereSql = buildWhere(this.table, args.where);
    if (whereSql) query = query.where(whereSql);
    const orders = normalizeOrderBy(this.table, args.orderBy);
    if (orders.length) query = query.orderBy(...orders);
    if (args.take != null) query = query.limit(args.take);
    if (args.skip != null) query = query.offset(args.skip);

    let rows: any[] = await query;

    if (args.include) {
      rows = await attachRelations(this.db, this.modelName, rows, args.include);
    }
    if (args.select) {
      rows = await attachRelations(this.db, this.modelName, rows, args.select);
      rows = projectSelect(rows, args.select);
    }
    return rows;
  }

  async findFirst(args: FindArgs = {}): Promise<any | null> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: {
    where: WhereObject;
    select?: SelectObject;
    include?: IncludeObject;
  }): Promise<any | null> {
    return this.findFirst({
      where: resolveUniqueWhere(args.where),
      select: args.select,
      include: args.include,
    });
  }

  async count(args: { where?: WhereObject } = {}): Promise<number> {
    let query: any = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(this.table as any);
    const whereSql = buildWhere(this.table, args.where);
    if (whereSql) query = query.where(whereSql);
    const result: any[] = await query;
    return Number(result[0]?.count ?? 0);
  }

  async create(args: {
    data: Record<string, any>;
    select?: SelectObject;
    include?: IncludeObject;
  }): Promise<any> {
    const data = preprocessInsertData(args.data);
    const [row] = await this.db
      .insert(this.table as any)
      .values(data)
      .returning();
    return this.postprocess(row, args.select, args.include);
  }

  async update(args: {
    where: WhereObject;
    data: Record<string, any>;
    select?: SelectObject;
    include?: IncludeObject;
  }): Promise<any> {
    const where = resolveUniqueWhere(args.where);
    const whereSql = buildWhere(this.table, where);
    if (!whereSql) throw new Error(`${this.modelName}.update requires a where clause`);
    const data = preprocessUpdateData(this.table, args.data);
    const [row] = await this.db
      .update(this.table as any)
      .set(data)
      .where(whereSql)
      .returning();
    return this.postprocess(row, args.select, args.include);
  }

  async updateMany(args: {
    where?: WhereObject;
    data: Record<string, any>;
  }): Promise<{ count: number }> {
    const whereSql = buildWhere(this.table, args.where);
    const data = preprocessUpdateData(this.table, args.data);
    let query: any = this.db.update(this.table as any).set(data);
    if (whereSql) query = query.where(whereSql);
    const result: any[] = await query.returning();
    return { count: result.length };
  }

  async delete(args: { where: WhereObject }): Promise<any> {
    const where = resolveUniqueWhere(args.where);
    const whereSql = buildWhere(this.table, where);
    if (!whereSql) throw new Error(`${this.modelName}.delete requires a where clause`);
    const [row] = await this.db
      .delete(this.table as any)
      .where(whereSql)
      .returning();
    return row;
  }

  async deleteMany(args: { where?: WhereObject } = {}): Promise<{ count: number }> {
    const whereSql = buildWhere(this.table, args.where);
    let query: any = this.db.delete(this.table as any);
    if (whereSql) query = query.where(whereSql);
    const result: any[] = await query.returning();
    return { count: result.length };
  }

  async upsert(args: {
    where: WhereObject;
    create: Record<string, any>;
    update: Record<string, any>;
    select?: SelectObject;
    include?: IncludeObject;
  }): Promise<any> {
    const where = resolveUniqueWhere(args.where);
    const whereSql = buildWhere(this.table, where);
    const existing = whereSql
      ? await this.db
          .select()
          .from(this.table as any)
          .where(whereSql)
          .limit(1)
      : [];

    if (existing.length > 0) {
      if (Object.keys(args.update).length === 0) {
        return this.postprocess(existing[0], args.select, args.include);
      }
      const data = preprocessUpdateData(this.table, args.update);
      const [row] = await this.db
        .update(this.table as any)
        .set(data)
        .where(whereSql!)
        .returning();
      return this.postprocess(row, args.select, args.include);
    }

    const createData = preprocessInsertData(args.create);
    const [row] = await this.db
      .insert(this.table as any)
      .values(createData)
      .returning();
    return this.postprocess(row, args.select, args.include);
  }

  private async postprocess(
    row: any,
    select?: SelectObject,
    include?: IncludeObject,
  ): Promise<any> {
    if (!row) return row;
    if (!select && !include) return row;
    let rows = [row];
    if (include) {
      rows = await attachRelations(this.db, this.modelName, rows, include);
    }
    if (select) {
      rows = await attachRelations(this.db, this.modelName, rows, select);
      rows = projectSelect(rows, select);
    }
    return rows[0];
  }
}

// ────────────────────────────────────────────────────────────────
// Public entry point
// ────────────────────────────────────────────────────────────────

let _db: any = null;

export type Db = any;

export function getDb(): any {
  if (_db) return _db;
  const inner: any = getRawDb();

  for (const [name, table] of Object.entries(TABLE_MAP)) {
    if (inner[name] === undefined) {
      inner[name] = new Model(inner, table as PgTable, name);
    }
  }

  // Prisma-style escape hatches used by the codebase.
  if (inner.$queryRaw === undefined) {
    inner.$queryRaw = (strings: TemplateStringsArray, ..._values: any[]) =>
      inner.execute(sql.raw(strings.join("")));
  }
  if (inner.$disconnect === undefined) {
    inner.$disconnect = async () => {
      /* managed via disconnectDb() */
    };
  }

  _db = inner;
  return _db;
}
