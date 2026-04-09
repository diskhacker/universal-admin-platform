import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TablePagination,
  Typography,
  Chip,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications.service";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", { page, limit }],
    queryFn: () => notificationsService.list(page + 1, limit),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="In-app notifications for your account"
        actions={
          <Button
            variant="outlined"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : !data?.data.length ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up"
            icon={<NotificationsNoneIcon />}
          />
        ) : (
          <>
            <List disablePadding>
              {data.data.map((n) => {
                const unread = n.status !== "READ";
                return (
                  <ListItem
                    key={n.id}
                    divider
                    onClick={() => unread && markRead.mutate(n.id)}
                    sx={{
                      cursor: unread ? "pointer" : "default",
                      bgcolor: unread ? "action.hover" : undefined,
                      "&:hover": unread ? { bgcolor: "action.selected" } : {},
                      alignItems: "flex-start",
                      py: 2,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography
                            variant="body1"
                            fontWeight={unread ? 700 : 500}
                          >
                            {n.subject || "Notification"}
                          </Typography>
                          {unread && (
                            <Chip label="New" size="small" color="primary" />
                          )}
                          <Chip
                            label={n.channel}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {n.body}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.disabled"
                          >
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                            })}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
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
              rowsPerPageOptions={[20, 50, 100]}
            />
          </>
        )}
      </Card>
    </>
  );
}
