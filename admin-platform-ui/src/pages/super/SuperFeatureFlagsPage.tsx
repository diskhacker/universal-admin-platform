import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { settingsService } from "@/services/settings.service";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import FlagIcon from "@mui/icons-material/Flag";
import { PRODUCTS, DEFAULT_PRODUCT_ID } from "@/lib/products";
import { errorMessage } from "@/lib/api";

interface FlagForm {
  name: string;
  isEnabled: boolean;
  targetType: "all" | "tenant" | "plan";
  targetIds: string;
}

export default function SuperFeatureFlagsPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(DEFAULT_PRODUCT_ID);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: flags, isLoading } = useQuery({
    queryKey: ["super", "flags", productId],
    queryFn: () => settingsService.listFeatureFlags(productId),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FlagForm>({
    defaultValues: {
      name: "",
      isEnabled: true,
      targetType: "all",
      targetIds: "",
    },
  });

  const save = useMutation({
    mutationFn: (input: FlagForm) =>
      settingsService.setFeatureFlag(productId, {
        name: input.name,
        isEnabled: input.isEnabled,
        targetType: input.targetType,
        targetIds: input.targetIds
          ? input.targetIds.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super", "flags"] });
      setDialogOpen(false);
      reset();
      setFormError(null);
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const toggle = useMutation({
    mutationFn: (input: {
      name: string;
      isEnabled: boolean;
      targetType: "all" | "tenant" | "plan";
      targetIds: string[];
    }) => settingsService.setFeatureFlag(productId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["super", "flags"] }),
  });

  return (
    <>
      <PageHeader
        title="Feature flags"
        subtitle="Enable or disable features per product, tenant, or plan"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              reset();
              setFormError(null);
              setDialogOpen(true);
            }}
          >
            New flag
          </Button>
        }
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

      {isLoading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !flags?.length ? (
        <EmptyState
          title="No feature flags"
          description="Create a flag to gate features across this product"
          icon={<FlagIcon />}
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              New flag
            </Button>
          }
        />
      ) : (
        <Stack spacing={2}>
          {flags.map((flag) => (
            <Card key={flag.id}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ md: "center" }}
                  justifyContent="space-between"
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={700}>
                        {flag.name}
                      </Typography>
                      <Chip
                        label={flag.targetType}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    {flag.description && (
                      <Typography variant="body2" color="text.secondary">
                        {flag.description}
                      </Typography>
                    )}
                    {flag.targetIds?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Targeting: {flag.targetIds.join(", ")}
                      </Typography>
                    )}
                  </Box>
                  <Switch
                    checked={flag.isEnabled}
                    onChange={(e) =>
                      toggle.mutate({
                        name: flag.name,
                        isEnabled: e.target.checked,
                        targetType: flag.targetType,
                        targetIds: flag.targetIds ?? [],
                      })
                    }
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit((d) => save.mutate(d))}>
          <DialogTitle>New feature flag</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Flag name"
                fullWidth
                autoFocus
                placeholder="new_dashboard"
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name", { required: "Required" })}
              />
              <TextField
                select
                label="Target type"
                fullWidth
                defaultValue="all"
                {...register("targetType")}
                onChange={(e) =>
                  setValue(
                    "targetType",
                    e.target.value as "all" | "tenant" | "plan"
                  )
                }
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="tenant">Specific tenants</MenuItem>
                <MenuItem value="plan">Specific plans</MenuItem>
              </TextField>
              {watch("targetType") !== "all" && (
                <TextField
                  label="Target IDs (comma-separated)"
                  fullWidth
                  {...register("targetIds")}
                  helperText="Tenant IDs or plan names"
                />
              )}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch defaultChecked {...register("isEnabled")} />
                <Typography>Enabled</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create flag
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
