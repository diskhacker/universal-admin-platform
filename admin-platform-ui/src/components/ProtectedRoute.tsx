import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { authService } from "@/services/auth.service";
import { Box, CircularProgress } from "@mui/material";

interface Props {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireSuperAdmin }: Props) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isSuper = useAuthStore((s) =>
    (s.user?.permissions ?? []).some(
      (p) => p === "*" || p.startsWith("super:")
    )
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => authService.me(),
    enabled: !!accessToken && !user,
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading && !user) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuper) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
