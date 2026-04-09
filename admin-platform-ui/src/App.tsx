import { useMemo, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useUIStore } from "./stores/ui.store";
import { useAuthStore } from "./stores/auth.store";
import { buildTheme } from "./theme";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import TenantLayout from "./layouts/TenantLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

// Tenant admin pages
import DashboardPage from "./pages/tenant/DashboardPage";
import UsersPage from "./pages/tenant/UsersPage";
import RolesPage from "./pages/tenant/RolesPage";
import BillingPage from "./pages/tenant/BillingPage";
import ApiKeysPage from "./pages/tenant/ApiKeysPage";
import SettingsPage from "./pages/tenant/SettingsPage";
import AuditLogsPage from "./pages/tenant/AuditLogsPage";
import NotificationsPage from "./pages/tenant/NotificationsPage";

// Super admin pages
import SuperTenantsPage from "./pages/super/SuperTenantsPage";
import SuperTenantDetailPage from "./pages/super/SuperTenantDetailPage";
import SuperProductsPage from "./pages/super/SuperProductsPage";
import SuperFeatureFlagsPage from "./pages/super/SuperFeatureFlagsPage";
import SuperAuditLogPage from "./pages/super/SuperAuditLogPage";

import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  const themeMode = useUIStore((s) => s.themeMode);
  const animationPref = useUIStore((s) => s.animationPref);
  const theme = useMemo(
    () => buildTheme(themeMode, animationPref),
    [themeMode, animationPref]
  );

  // Respect OS reduced-motion as a fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches && useUIStore.getState().animationPref === "full") {
      useUIStore.getState().setAnimationPref("reduced");
    }
  }, []);

  const isAuthed = useAuthStore((s) => !!s.accessToken);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public / auth routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={isAuthed ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthed ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Tenant admin routes */}
        <Route
          element={
            <ProtectedRoute>
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/audit" element={<AuditLogsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Super admin routes */}
        <Route
          element={
            <ProtectedRoute requireSuperAdmin>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/super" element={<Navigate to="/super/tenants" replace />} />
          <Route path="/super/tenants" element={<SuperTenantsPage />} />
          <Route path="/super/tenants/:id" element={<SuperTenantDetailPage />} />
          <Route path="/super/products" element={<SuperProductsPage />} />
          <Route path="/super/feature-flags" element={<SuperFeatureFlagsPage />} />
          <Route path="/super/audit" element={<SuperAuditLogPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
  );
}
