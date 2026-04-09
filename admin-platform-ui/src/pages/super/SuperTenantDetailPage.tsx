import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { tenantService } from "@/services/tenant.service";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import GroupIcon from "@mui/icons-material/Group";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import { errorMessage } from "@/lib/api";
import { format } from "date-fns";

export default function SuperTenantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["super", "tenant", id],
    queryFn: () => tenantService.getById(id),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => tenantService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super", "tenant", id] });
      qc.invalidateQueries({ queryKey: ["super", "tenants"] });
      setActionError(null);
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: () => tenantService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super", "tenants"] });
      navigate("/super/tenants");
    },
    onError: (err) => setActionError(errorMessage(err)),
  });

  if (isLoading) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tenant) {
    return (
      <Alert severity="error">Tenant not found</Alert>
    );
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/super/tenants")}
        sx={{ mb: 2 }}
      >
        Back to tenants
      </Button>

      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.slug} · Created ${format(
          new Date(tenant.createdAt),
          "MMM d, yyyy"
        )}`}
        actions={
          <Stack direction="row" spacing={1}>
            {tenant.status !== "ACTIVE" && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => updateStatus.mutate("ACTIVE")}
              >
                Activate
              </Button>
            )}
            {tenant.status !== "SUSPENDED" && (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BlockIcon />}
                onClick={() => updateStatus.mutate("SUSPENDED")}
              >
                Suspend
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (
                  confirm(
                    `Permanently delete "${tenant.name}"? This cannot be undone.`
                  )
                )
                  remove.mutate();
              }}
            >
              Delete
            </Button>
          </Stack>
        }
      />

      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Users"
            value={tenant.userCount ?? 0}
            icon={<GroupIcon />}
            color="#2563EB"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Subscriptions"
            value={tenant.activeSubscriptions ?? 0}
            icon={<CreditCardIcon />}
            color="#10B981"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Products"
            value={tenant.totalProducts ?? 0}
            icon={<Inventory2Icon />}
            color="#7C3AED"
          />
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Tenant info
              </Typography>
              <Grid container spacing={2}>
                <InfoRow label="ID" value={tenant.id} mono />
                <InfoRow label="Slug" value={tenant.slug} mono />
                <InfoRow
                  label="Status"
                  value={
                    <Chip
                      label={tenant.status}
                      size="small"
                      color={
                        tenant.status === "ACTIVE"
                          ? "success"
                          : tenant.status === "SUSPENDED"
                          ? "warning"
                          : "default"
                      }
                    />
                  }
                />
                <InfoRow label="Domain" value={tenant.domain || "—"} />
                <InfoRow
                  label="Created"
                  value={format(new Date(tenant.createdAt), "PPpp")}
                />
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{ fontFamily: mono ? "monospace" : undefined }}
      >
        {value}
      </Typography>
    </Grid>
  );
}
