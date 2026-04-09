import { useState } from "react";
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications.service";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const qc = useQueryClient();

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 30_000,
  });

  const { data: list } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationsService.list(1, 10),
    enabled: !!anchorEl,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={`${unread?.count ?? 0} unread notifications`}
        size="large"
      >
        <Badge badgeContent={unread?.count ?? 0} color="error" max={99}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 480 } } }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ p: 2 }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Button
            size="small"
            onClick={() => markAllRead.mutate()}
            disabled={!unread?.count}
          >
            Mark all read
          </Button>
        </Stack>
        <Divider />
        {!list?.data.length ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {list.data.map((n) => {
              const unread = n.status !== "READ";
              return (
                <ListItem
                  key={n.id}
                  onClick={() => unread && markRead.mutate(n.id)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: unread ? "action.hover" : undefined,
                    "&:hover": { bgcolor: "action.selected" },
                    alignItems: "flex-start",
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={unread ? 600 : 400}
                      >
                        {n.subject || "Notification"}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
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
        )}
      </Popover>
    </>
  );
}
