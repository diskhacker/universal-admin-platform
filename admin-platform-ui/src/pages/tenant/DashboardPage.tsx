import {
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Chip,
  Box,
  LinearProgress,
  Button,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import KeyIcon from "@mui/icons-material/Key";
import { useQuery } from "@tanstack/react-query";
import { tenantService } from "@/services/tenant.service";
import { auditService } from "@/services/audit.service";
import { usersService } from "@/services/users.service";
import { apiKeysService } from "@/services/apiKeys.service";
import { useAuthStore } from "@/stores/auth.store";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatDistanceToNow } from "date-fns";
import { Link as RouterLink } from "react-router-dom";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", "current"],
    queryFn: () => tenantService.getCurrent(),
  });

  const { data: usersResult } = useQuery({
    queryKey: ["users", "list", { page: 1, limit: 5 }],
    queryFn: () => usersService.list({ page: 1, limit: 5 }),
  });

  const { data: auditStats } = useQuery({
    queryKey: ["audit", "stats"],
    queryFn: () => auditService.getStats(),
  });

  const { data: recentAudit } = useQuery({
    queryKey: ["audit", "recent"],
    queryFn: () => auditService.list({ page: 1, limit: 5 }),
  });

  const { data: apiKeys } = useQuery({
    queryKey: ["api-keys", "list"],
    queryFn: () => apiKeysService.list(),
  });

  const activeKeys = apiKeys?.filter((k) => k.isActive).length ?? 0;

  return (
    <>
      <PageHeader
        title={`Welcome${user?.firstName ? `, ${user.firstName}` : ""}`}
        subtitle={
          tenant
            ? `${tenant.name} — ${tenant.status}`
            : "Your workspace overview"
        }
      />

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Users"
            value={usersResult?.total ?? tenant?.userCount ?? 0}
            icon={<GroupIcon />}
            color="#2563EB"
            hint="Across all products"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Subscriptions"
            value={tenant?.activeSubscriptions ?? 0}
            icon={<CreditCardIcon />}
            color="#10B981"
            hint={`${tenant?.totalProducts ?? 0} total products`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Active API Keys"
            value={activeKeys}
            icon={<KeyIcon />}
            color="#F59E0B"
            hint={`${apiKeys?.length ?? 0} total`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Events (24h)"
            value={auditStats?.today ?? 0}
            icon={<HistoryIcon />}
            color="#7C3AED"
            hint={`${auditStats?.week ?? 0} this week`}
          />
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" fontWeight={700}>
                  Recent activity
                </Typography>
                <Button
                  component={RouterLink}
                  to="/audit"
                  size="small"
                  variant="text"
                >
                  View all
                </Button>
              </Stack>
              {recentAudit?.data?.length ? (
                <Stack spacing={1.5}>
                  {recentAudit.data.map((log) => (
                    <Box
                      key={log.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        py: 1,
                        borderBottom: 1,
                        borderColor: "divider",
                        "&:last-child": { borderBottom: 0 },
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {log.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.actor?.email || log.actorType || "system"} ·{" "}
                          {log.resourceType}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" fontWeight={700}>
                  Recent users
                </Typography>
                <Button
                  component={RouterLink}
                  to="/users"
                  size="small"
                  variant="text"
                >
                  Manage
                </Button>
              </Stack>
              {usersResult?.data.length ? (
                <Stack spacing={1.5}>
                  {usersResult.data.slice(0, 5).map((u) => (
                    <Box
                      key={u.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {u.firstName
                            ? `${u.firstName} ${u.lastName ?? ""}`.trim()
                            : u.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.email}
                        </Typography>
                      </Box>
                      <Chip
                        label={u.status}
                        size="small"
                        color={
                          u.status === "ACTIVE"
                            ? "success"
                            : u.status === "SUSPENDED"
                            ? "warning"
                            : "default"
                        }
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No users yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Workspace health
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="body2">Account status</Typography>
                    <Chip
                      label={tenant?.status || "PENDING"}
                      size="small"
                      color={tenant?.status === "ACTIVE" ? "success" : "warning"}
                    />
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={tenant?.status === "ACTIVE" ? 100 : 50}
                    color={tenant?.status === "ACTIVE" ? "success" : "warning"}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
