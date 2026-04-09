import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "./config";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Centralized axios instance for UAP backend.
 *
 * Responsibilities:
 * - Attach `Authorization: Bearer <jwt>` to every request
 * - On 401: call /auth/refresh once, retry original request
 * - On refresh failure: clear auth state and redirect to /login
 */

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token refresh plumbing (single-flight) ──
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken =
    useAuthStore.getState().refreshToken ||
    localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  try {
    const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    const data = resp.data?.data ?? resp.data;
    const newAccess: string = data.accessToken;
    const newRefresh: string = data.refreshToken ?? refreshToken;
    useAuthStore.getState().setTokens(newAccess, newRefresh);
    return newAccess;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

// ── Response interceptor: refresh on 401 ──
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!original || !error.response) return Promise.reject(error);

    const isAuthEndpoint =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/register");

    if (error.response.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      refreshPromise = refreshPromise || performRefresh();
      const token = await refreshPromise;
      refreshPromise = null;

      if (token) {
        original.headers = original.headers || {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${token}`;
        return api.request(original);
      }
      // Refresh failed — bounce to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ── Helper: unwrap `{ data: T }` envelope ──
export async function apiGet<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const resp = await api.get(path, config);
  return (resp.data?.data ?? resp.data) as T;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const resp = await api.post(path, body, config);
  return (resp.data?.data ?? resp.data) as T;
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const resp = await api.put(path, body, config);
  return (resp.data?.data ?? resp.data) as T;
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const resp = await api.patch(path, body, config);
  return (resp.data?.data ?? resp.data) as T;
}

export async function apiDelete<T>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const resp = await api.delete(path, config);
  return (resp.data?.data ?? resp.data) as T;
}

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    return (
      (data?.error?.message as string) ||
      (data?.message as string) ||
      err.message ||
      fallback
    );
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
