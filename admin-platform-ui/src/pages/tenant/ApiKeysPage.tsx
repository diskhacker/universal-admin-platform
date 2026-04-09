import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { apiKeysService } from "@/services/apiKeys.service";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { errorMessage } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const SCOPE_OPTIONS = [
  "tenants:read",
  "tenants:write",
  "users:read",
  "users:write",
  "audit:read",
  "billing:read",
  "api_keys:read",
  "settings:read",
  "notifications:write",
];

interface CreateForm {
  name: string;
  rateLimit?: number;
  expiresAt?: string;
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", "list"],
    queryFn: () => apiKeysService.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>();

  const create = useMutation({
    mutationFn: (input: CreateForm) =>
      apiKeysService.create({
        name: input.name,
        scopes: selectedScopes,
        rateLimit: input.rateLimit ? Number(input.rateLimit) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : undefined,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setCreateOpen(false);
      reset();
      setSelectedScopes([]);
      if (data.key) setRevealKey(data.key);
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => apiKeysService.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => apiKeysService.rotate(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      if (data.key) setRevealKey(data.key);
    },
  });

  const toggleScope = (scope: string) =>
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );

  const copyKey = async () => {
    if (!revealKey) return;
    await navigator.clipboard.writeText(revealKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onCreate = (data: CreateForm) => {
    setFormError(null);
    if (!selectedScopes.length) {
      setFormError("Select at least one scope");
      return;
    }
    create.mutate(data);
  };

  return (
    <>
      <PageHeader
        title="API Keys"
        subtitle="Generate scoped keys for server-to-server integrations"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create API key
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : !keys?.length ? (
          <EmptyState
            title="No API keys yet"
            description="Create a key to authenticate server-to-server requests"
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                Create API key
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Scopes</TableCell>
                <TableCell>Last used</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {k.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {k.usageCount} calls
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {k.keyPrefix}••••••
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {k.scopes.slice(0, 2).map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {k.scopes.length > 2 && (
                      <Chip
                        size="small"
                        label={`+${k.scopes.length - 2}`}
                        sx={{ mb: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {k.lastUsedAt
                        ? formatDistanceToNow(new Date(k.lastUsedAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={k.isActive ? "Active" : "Revoked"}
                      color={k.isActive ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Rotate"
                      disabled={!k.isActive}
                      onClick={() => {
                        if (confirm(`Rotate "${k.name}"? The old key will stop working.`))
                          rotate.mutate(k.id);
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      title="Revoke"
                      disabled={!k.isActive}
                      onClick={() => {
                        if (confirm(`Revoke "${k.name}"?`))
                          revoke.mutate(k.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit(onCreate)}>
          <DialogTitle>Create API key</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Name"
                fullWidth
                autoFocus
                error={!!errors.name}
                helperText={errors.name?.message || "For your own reference"}
                {...register("name", { required: "Required" })}
              />
              <Typography variant="subtitle2" fontWeight={600}>
                Scopes
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {SCOPE_OPTIONS.map((scope) => (
                  <Chip
                    key={scope}
                    label={scope}
                    onClick={() => toggleScope(scope)}
                    color={selectedScopes.includes(scope) ? "primary" : "default"}
                    variant={
                      selectedScopes.includes(scope) ? "filled" : "outlined"
                    }
                  />
                ))}
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Rate limit (per minute)"
                  type="number"
                  fullWidth
                  defaultValue={1000}
                  {...register("rateLimit")}
                />
                <TextField
                  label="Expires at"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register("expiresAt")}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create key
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reveal key dialog — shows ONCE */}
      <Dialog
        open={!!revealKey}
        onClose={() => setRevealKey(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberIcon color="warning" />
            <span>Copy your key now</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is the only time you'll see this key. Store it securely.
          </Alert>
          <TextField
            fullWidth
            value={revealKey ?? ""}
            InputProps={{
              readOnly: true,
              sx: { fontFamily: "monospace" },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={copyKey} size="small">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {copied && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: "block" }}>
              Copied to clipboard
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevealKey(null)} variant="contained">
            I've stored it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
