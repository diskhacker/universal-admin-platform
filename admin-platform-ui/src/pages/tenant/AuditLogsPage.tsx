import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useQuery } from "@tanstack/react-query";
import { auditService, AuditFilters } from "@/services/audit.service";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", "list", { page, limit, ...filters }],
    queryFn: () =>
      auditService.list({
        ...filters,
        page: page + 1,
        limit,
      }),
  });

  const download = async (fmt: "csv" | "json") => {
    setDownloading(true);
    try {
      const blob = await auditService.exportLogs(fmt, filters.from, filters.to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${format(new Date(), "yyyy-MM-dd")}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle="Searchable trail of all actions in your workspace"
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => download("csv")}
              disabled={downloading}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => download("json")}
              disabled={downloading}
            >
              Export JSON
            </Button>
          </Stack>
        }
      />

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="Action"
                fullWidth
                placeholder="user.created"
                value={filters.action ?? ""}
                onChange={(e) => {
                  setFilters({ ...filters, action: e.target.value });
                  setPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="Resource type"
                fullWidth
                placeholder="user"
                value={filters.resourceType ?? ""}
                onChange={(e) => {
                  setFilters({ ...filters, resourceType: e.target.value });
                  setPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="From"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.from ?? ""}
                onChange={(e) => {
                  setFilters({ ...filters, from: e.target.value });
                  setPage(0);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="To"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.to ?? ""}
                onChange={(e) => {
                  setFilters({ ...filters, to: e.target.value });
                  setPage(0);
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Card>

      <Card>
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : !data?.data.length ? (
          <EmptyState
            title="No audit logs"
            description="Actions will appear here as your team uses the workspace"
          />
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="caption">
                        {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.actor?.email || log.actorType || "system"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {log.resourceType}
                        {log.resourceId && ` · ${log.resourceId.slice(0, 8)}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {log.ipAddress || "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </>
        )}
      </Card>
    </>
  );
}
