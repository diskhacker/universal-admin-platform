import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { errorMessage } from "@/lib/api";

interface RegisterForm {
  tenantName: string;
  tenantSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  productId: string;
}

// These match the UAP seeded products. Using the product `name` as id since
// the backend accepts a product identifier and /api/v1/billing/plans/:productId
// resolves by either.
const PRODUCTS = [
  { id: "sigops", label: "SigOps" },
  { id: "credora-os", label: "Credora OS" },
  { id: "assera", label: "Assera" },
  { id: "paynex", label: "Paynex" },
  { id: "talentra", label: "Talentra" },
  { id: "lifetra", label: "Lifetra" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setTenantSlug = useAuthStore((s) => s.setTenantSlug);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      tenantName: "",
      tenantSlug: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      productId: PRODUCTS[0].id,
    },
  });

  const [serverError, setServerError] = useState<string | null>(null);

  // Auto-slug from tenant name
  const watchedName = watch("tenantName");
  const handleNameBlur = () => {
    const slug = watchedName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    if (slug && !watch("tenantSlug")) setValue("tenantSlug", slug);
  };

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      const tokens = await authService.register({
        tenantName: data.tenantName.trim(),
        tenantSlug: data.tenantSlug.trim(),
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        productId: data.productId,
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      setTenantSlug(data.tenantSlug.trim());
      if (tokens.user) setUser(tokens.user);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(errorMessage(err, "Unable to create workspace"));
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Create your workspace
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start managing users, billing and access in minutes
          </Typography>
        </Stack>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <TextField
              label="Workspace name"
              fullWidth
              error={!!errors.tenantName}
              helperText={errors.tenantName?.message}
              {...register("tenantName", {
                required: "Workspace name is required",
                minLength: { value: 2, message: "Too short" },
              })}
              onBlur={handleNameBlur}
            />
            <TextField
              label="Workspace slug"
              placeholder="acme-corp"
              fullWidth
              error={!!errors.tenantSlug}
              helperText={
                errors.tenantSlug?.message ||
                "Lowercase letters, digits and hyphens"
              }
              {...register("tenantSlug", {
                required: "Slug is required",
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: "Invalid slug format",
                },
              })}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First name"
                  fullWidth
                  {...register("firstName")}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last name"
                  fullWidth
                  {...register("lastName")}
                />
              </Grid>
            </Grid>

            <TextField
              label="Email"
              type="email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              error={!!errors.password}
              helperText={
                errors.password?.message || "At least 8 characters"
              }
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
            />

            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <TextField select label="Primary product" fullWidth {...field}>
                  {PRODUCTS.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting ? "Creating workspace..." : "Create workspace"}
            </Button>
          </Stack>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          Already have an account?{" "}
          <Link component={RouterLink} to="/login" underline="hover">
            Sign in
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
