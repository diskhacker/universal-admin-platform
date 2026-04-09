export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:4100/api/v1";

export const APP_NAME =
  (import.meta.env.VITE_APP_NAME as string | undefined) ||
  "Universal Admin Platform";

export const STORAGE_KEYS = {
  accessToken: "uap.accessToken",
  refreshToken: "uap.refreshToken",
  tenantSlug: "uap.tenantSlug",
  themeMode: "uap.themeMode",
  animationPref: "uap.animationPref",
} as const;
