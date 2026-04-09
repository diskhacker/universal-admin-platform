import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingService } from "@/services/billing.service";
import PageHeader from "@/components/PageHeader";
import { PRODUCTS, DEFAULT_PRODUCT_ID } from "@/lib/products";
import { errorMessage } from "@/lib/api";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

export default function BillingPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(DEFAULT_PRODUCT_ID);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["billing", "plans", productId],
    queryFn: () => billingService.listPlans(productId),
  });

  const { data: subscription } = useQuery({
    queryKey: ["billing", "subscription", productId],
    queryFn: () => billingService.getSubscription(productId),
    retry: false,
  });

  const { data: usage } = useQuery({
    queryKey: ["billing", "usage", productId],
    queryFn: () => billingService.getUsage(productId),
    retry: false,
  });

  const changePlan = useMutation({
    mutationFn: (planId: string) => billingService.changePlan(productId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      setActionError(null);
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  const checkout = useMutation({
    mutationFn: (planId: string) =>
      billingService.createCheckoutSession({
        productId,
        planId,
        successUrl: `${window.location.origin}/billing?success=1`,
        cancelUrl: `${window.location.origin}/billing?cancel=1`,
      }),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Manage plans, payment methods, and usage"
      />

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            select
            label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            {PRODUCTS.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.displayName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Current subscription */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Current plan
              </Typography>
              {subscription ? (
                <>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                    {subscription.plan.displayName}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip
                      label={subscription.status}
                      size="small"
                      color={
                        subscription.status === "ACTIVE"
                          ? "success"
                          : subscription.status === "TRIAL"
                          ? "info"
                          : subscription.status === "PAST_DUE"
                          ? "warning"
                          : "default"
                      }
                    />
                    <Chip
                      label={formatPrice(subscription.plan.priceMonthly)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No active subscription for this product
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Usage this period
              </Typography>
              {usage ? (
                <Stack spacing={2} sx={{ mt: 1.5 }}>
                  {Object.keys(usage.limits ?? {}).map((metric) => {
                    const used = usage.usage?.[metric] ?? 0;
                    const limit = usage.limits[metric];
                    const pct =
                      limit && limit > 0
                        ? Math.min(100, (used / limit) * 100)
                        : 0;
                    return (
                      <Box key={metric}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {metric}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {used} / {limit === -1 ? "∞" : limit}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={limit === -1 ? 0 : pct}
                          color={pct > 90 ? "error" : pct > 70 ? "warning" : "primary"}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No usage data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mt: 4, mb: 2 }}>
        Available plans
      </Typography>

      {plansLoading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {plans?.map((plan) => {
            const isCurrent = subscription?.plan.id === plan.id;
            return (
              <Grid item xs={12} sm={6} md={3} key={plan.id}>
                <Card
                  sx={{
                    height: "100%",
                    borderColor: isCurrent ? "primary.main" : undefined,
                    borderWidth: isCurrent ? 2 : 1,
                  }}
                >
                  <CardContent>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>
                        {plan.displayName}
                      </Typography>
                      <Typography variant="h4" fontWeight={800}>
                        {formatPrice(plan.priceMonthly)}
                      </Typography>
                    </Stack>
                    <Stack spacing={1} sx={{ mb: 3 }}>
                      {(plan.features ?? []).map((f) => (
                        <Stack
                          key={f}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <CheckIcon fontSize="small" color="success" />
                          <Typography variant="body2">{f}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    {isCurrent ? (
                      <Button variant="outlined" fullWidth disabled>
                        Current plan
                      </Button>
                    ) : subscription ? (
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={changePlan.isPending}
                        onClick={() => changePlan.mutate(plan.id)}
                      >
                        Switch to {plan.displayName}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        fullWidth
                        disabled={checkout.isPending}
                        onClick={() => checkout.mutate(plan.id)}
                      >
                        Subscribe
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
