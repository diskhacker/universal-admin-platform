import * as argon2 from "argon2";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { nanoid } from "nanoid";
import { getEnv } from "../../config/env.js";
import type { AuthContext, PaginationParams } from "../types/index.js";

// ─── Password Hashing ───
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ─── JWT ───
function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function signAccessToken(ctx: AuthContext): Promise<string> {
  return new SignJWT({
    sub: ctx.userId,
    tid: ctx.tenantId,
    email: ctx.email,
    roles: ctx.roles,
    perms: ctx.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getEnv().JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(getEnv().JWT_ACCESS_TTL)
    .sign(getSecret());
}

export async function signRefreshToken(userId: string, tenantId: string): Promise<string> {
  return new SignJWT({ sub: userId, tid: tenantId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getEnv().JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(getEnv().JWT_REFRESH_TTL)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(), { issuer: getEnv().JWT_ISSUER });
  return payload;
}

// ─── ID Generation ───
export function generateId(prefix?: string): string {
  const id = nanoid(21);
  return prefix ? `${prefix}_${id}` : id;
}

export function generateApiKey(): { key: string; prefix: string } {
  const key = `uap_${nanoid(40)}`;
  return { key, prefix: key.slice(0, 12) };
}

// ─── Pagination ───
export function parsePagination(page?: string | number, limit?: string | number): PaginationParams {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));
  return { page: p, limit: l };
}

export function paginationToSkipTake(params: PaginationParams) {
  return { skip: (params.page - 1) * params.limit, take: params.limit };
}

// ─── API Key Hash ───
export async function hashApiKey(key: string): Promise<string> {
  return argon2.hash(key, { type: argon2.argon2id });
}

export async function verifyApiKey(hash: string, key: string): Promise<boolean> {
  return argon2.verify(hash, key);
}
