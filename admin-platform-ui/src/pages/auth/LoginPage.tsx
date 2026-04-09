import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { errorMessage } from "@/lib/api";

interface LoginForm {
  email: string;
  password: string;
  tenantSlug: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const setTokens = useAuthStore((s) => s.setTokens);
  const setTenantSlug = useAuthStore((s) => s.setTenantSlug);
  const setUser = useAuthStore((s) => s.setUser);
  const storedSlug = useAuthStore((s) => s.tenantSlug);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "", tenantSlug: storedSlug ?? "" },
  });

  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const tokens = await authService.login({
        email: data.email.trim(),
        password: data.password,
        tenantSlug: data.tenantSlug.trim(),
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      setTenantSlug(data.tenantSlug.trim());
      if (tokens.user) setUser(tokens.user);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, "Unable to sign in"));
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your workspace
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <TextField
              label="Workspace slug"
              placeholder="acme-corp"
              size="medium"
              fullWidth
              autoFocus
              error={!!errors.tenantSlug}
              helperText={errors.tenantSlug?.message || "Your tenant identifier"}
              {...register("tenantSlug", {
                required: "Tenant slug is required",
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: "Lowercase letters, digits and hyphens only",
                },
              })}
            />
            <TextField
              label="Email"
              type="email"
              size="medium"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <TextField
              label="Password"
              type="password"
              size="medium"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password", { required: "Password is required" })}
            />
            <Box sx={{ textAlign: "right" }}>
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
              >
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </Stack>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          New to the platform?{" "}
          <Link component={RouterLink} to="/register" underline="hover">
            Create a workspace
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
