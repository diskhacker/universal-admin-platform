import { useState } from "react";
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  InputAdornment,
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
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from "@mui/icons-material/Business";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { tenantService } from "@/services/tenant.service";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

export default function SuperTenantsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super", "tenants", { page, limit, search }],
    queryFn: () =>
      tenantService.list({
        page: page + 1,
        limit,
        search: search || undefined,
      }),
  });

  return (
    <>
      <PageHeader
        title="All tenants"
        subtitle="Every workspace on the platform"
      />

      <Card>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            placeholder="Search by name or slug"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
        </Box>

        {isLoading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : !data?.data?.length ? (
          <EmptyState
            title="No tenants found"
            description="No workspaces match your search"
            icon={<BusinessIcon />}
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Workspace</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((t) => (
                  <TableRow
                    key={t.id}
                    hover
                    onClick={() => navigate(`/super/tenants/${t.id}`)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {t.name[0]?.toUpperCase()}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {t.name}
                          </Typography>
                          {t.domain && (
                            <Typography variant="caption" color="text.secondary">
                              {t.domain}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {t.slug}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        color={
                          t.status === "ACTIVE"
                            ? "success"
                            : t.status === "SUSPENDED"
                            ? "warning"
                            : t.status === "CANCELLED"
                            ? "error"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>{t.userCount ?? "—"}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(t.createdAt).toLocaleDateString()}
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
            />
          </>
        )}
      </Card>
    </>
  );
}
