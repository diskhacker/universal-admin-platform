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
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { rbacService } from "@/services/rbac.service";
import { Role } from "@/types";
import PageHeader from "@/components/PageHeader";
import { PRODUCTS, DEFAULT_PRODUCT_ID } from "@/lib/products";
import { errorMessage } from "@/lib/api";

const AVAILABLE_PERMISSIONS = [
  "users:read",
  "users:write",
  "users:delete",
  "tenants:read",
  "tenants:write",
  "billing:read",
  "billing:write",
  "api_keys:read",
  "api_keys:write",
  "roles:read",
  "roles:write",
  "roles:delete",
  "roles:assign",
  "audit:read",
  "audit:export",
  "settings:read",
  "settings:write",
  "notifications:read",
  "notifications:write",
];

interface RoleForm {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

export default function RolesPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(DEFAULT_PRODUCT_ID);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles", productId],
    queryFn: () => rbacService.listRoles(productId),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoleForm>({
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: [],
    },
  });

  const selectedPerms = watch("permissions") ?? [];

  const openDialog = (role?: Role) => {
    setFormError(null);
    if (role) {
      setEditRole(role);
      reset({
        name: role.name,
        displayName: role.displayName,
        description: role.description ?? "",
        permissions: role.permissions,
      });
    } else {
      setEditRole(null);
      reset({ name: "", displayName: "", description: "", permissions: [] });
    }
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: (data: RoleForm) => {
      if (editRole) {
        return rbacService.updateRole(editRole.id, {
          displayName: data.displayName,
          description: data.description,
          permissions: data.permissions,
        });
      }
      return rbacService.createRole(productId, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => rbacService.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const togglePerm = (perm: string) => {
    if (selectedPerms.includes(perm)) {
      setValue(
        "permissions",
        selectedPerms.filter((p) => p !== perm)
      );
    } else {
      setValue("permissions", [...selectedPerms, perm]);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Define custom access levels for your workspace"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog()}
          >
            Create role
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
            sx={{ minWidth: 220 }}
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
      ) : (
        <Grid container spacing={2}>
          {roles?.map((role) => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {role.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role.name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {role.isSystem && (
                        <Chip size="small" label="System" variant="outlined" />
                      )}
                      {role.isDefault && (
                        <Chip
                          size="small"
                          label="Default"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Stack>

                  {role.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {role.description}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Permissions
                  </Typography>
                  <Box sx={{ mt: 0.5, mb: 2 }}>
                    {role.permissions.slice(0, 6).map((p) => (
                      <Chip
                        key={p}
                        label={p}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {role.permissions.length > 6 && (
                      <Chip
                        size="small"
                        label={`+${role.permissions.length - 6}`}
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {!role.isSystem && (
                      <>
                        <Button size="small" onClick={() => openDialog(role)}>
                          Edit
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm(`Delete role "${role.displayName}"?`))
                              remove.mutate(role.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleSubmit((d) => save.mutate(d))}>
          <DialogTitle>
            {editRole ? "Edit role" : "Create custom role"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Name (internal)"
                  fullWidth
                  disabled={!!editRole}
                  placeholder="custom_role"
                  error={!!errors.name}
                  helperText={
                    errors.name?.message ||
                    "Lowercase letters and underscores only"
                  }
                  {...register("name", {
                    required: "Required",
                    pattern: {
                      value: /^[a-z_]+$/,
                      message: "Lowercase letters and underscores only",
                    },
                  })}
                />
                <TextField
                  label="Display name"
                  fullWidth
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
                  {...register("displayName", { required: "Required" })}
                />
              </Stack>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                {...register("description")}
              />
              <Typography variant="subtitle2" fontWeight={600}>
                Permissions
              </Typography>
              <Controller
                name="permissions"
                control={control}
                render={() => (
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      maxHeight: 240,
                      overflow: "auto",
                    }}
                  >
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <Chip
                        key={perm}
                        label={perm}
                        onClick={() => togglePerm(perm)}
                        color={
                          selectedPerms.includes(perm) ? "primary" : "default"
                        }
                        variant={
                          selectedPerms.includes(perm) ? "filled" : "outlined"
                        }
                      />
                    ))}
                  </Box>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {editRole ? "Save changes" : "Create role"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
