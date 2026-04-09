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
import { Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";

interface ForgotForm {
  email: string;
  tenantSlug: string;
}

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    defaultValues: { email: "", tenantSlug: "" },
  });
  const [sent, setSent] = useState(false);

  const onSubmit = async (_data: ForgotForm) => {
    // Backend endpoint stub — UAP /auth does not yet expose /forgot-password.
    // We optimistically show success so the flow is usable; when the backend
    // wires it up, replace this with a real call.
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
  };

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Reset your password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We'll send a reset link to your email
          </Typography>
        </Stack>

        {sent ? (
          <Stack spacing={2}>
            <Alert severity="success">
              If an account with that email exists, a reset link has been sent.
            </Alert>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              fullWidth
            >
              Back to sign in
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Workspace slug"
                fullWidth
                error={!!errors.tenantSlug}
                helperText={errors.tenantSlug?.message}
                {...register("tenantSlug", {
                  required: "Tenant slug is required",
                })}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register("email", { required: "Email is required" })}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </Stack>
          </Box>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 3, textAlign: "center" }}
        >
          Remembered it?{" "}
          <Link component={RouterLink} to="/login" underline="hover">
            Sign in
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
