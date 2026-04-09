import { useState } from "react";
import {
  Avatar,
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
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { usersService } from "@/services/users.service";
import { User } from "@/types";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { errorMessage } from "@/lib/api";

interface InviteForm {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuUser, setMenuUser] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", "list", { page, limit, search }],
    queryFn: () =>
      usersService.list({ page: page + 1, limit, search: search || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>();

  const invite = useMutation({
    mutationFn: (input: InviteForm) => usersService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setInviteOpen(false);
      reset();
      setFormError(null);
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: User["status"] }) =>
      usersService.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const onInviteSubmit = (data: InviteForm) => {
    setFormError(null);
    invite.mutate(data);
  };

  const openMenu = (e: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchor(e.currentTarget);
    setMenuUser(user);
  };
  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuUser(null);
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage people with access to your workspace"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite user
          </Button>
        }
      />

      <Card>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            placeholder="Search by email or name"
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
        ) : !data?.data.length ? (
          <EmptyState
            title="No users yet"
            description="Invite teammates to collaborate in your workspace"
            icon={<AddIcon />}
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setInviteOpen(true)}
              >
                Invite user
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 34,
                            height: 34,
                            bgcolor: "primary.main",
                            fontSize: 14,
                          }}
                        >
                          {(u.firstName?.[0] ?? "") +
                            (u.lastName?.[0] ?? "") ||
                            u.email[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {u.firstName
                              ? `${u.firstName} ${u.lastName ?? ""}`.trim()
                              : "—"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => openMenu(e, u)}
                        aria-label={`Actions for ${u.email}`}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
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

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuUser)
              updateStatus.mutate({ id: menuUser.id, status: "ACTIVE" });
            closeMenu();
          }}
        >
          Activate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuUser)
              updateStatus.mutate({ id: menuUser.id, status: "SUSPENDED" });
            closeMenu();
          }}
        >
          Suspend
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuUser)
              updateStatus.mutate({ id: menuUser.id, status: "DEACTIVATED" });
            closeMenu();
          }}
        >
          Deactivate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuUser && confirm(`Delete ${menuUser.email}?`))
              removeUser.mutate(menuUser.id);
            closeMenu();
          }}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit(onInviteSubmit)}>
          <DialogTitle>Invite user</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <TextField
                label="Email"
                type="email"
                fullWidth
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register("email", { required: "Email is required" })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="First name"
                  fullWidth
                  {...register("firstName")}
                />
                <TextField
                  label="Last name"
                  fullWidth
                  {...register("lastName")}
                />
              </Stack>
              <TextField
                label="Initial password (optional)"
                type="password"
                fullWidth
                helperText="If blank, an invitation link will be used"
                {...register("password", {
                  minLength: {
                    value: 8,
                    message: "Must be at least 8 characters",
                  },
                })}
                error={!!errors.password}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Send invite
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
