import { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ShieldIcon from "@mui/icons-material/Shield";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";

export default function UserMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const isSuper = useAuthStore((s) =>
    (s.user?.permissions ?? []).some(
      (p) => p === "*" || p.startsWith("super:")
    )
  );
  const themeMode = useUIStore((s) => s.themeMode);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "") ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
        <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main" }}>
          {initials}
        </Avatar>
      </IconButton>
      <Menu
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.firstName
              ? `${user.firstName} ${user.lastName ?? ""}`.trim()
              : user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        {isSuper && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              navigate("/super/tenants");
            }}
          >
            <ListItemIcon>
              <ShieldIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Super Admin</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/settings");
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={toggleTheme}>
          <ListItemIcon>
            {themeMode === "dark" ? (
              <LightModeIcon fontSize="small" />
            ) : (
              <DarkModeIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {themeMode === "dark" ? "Light mode" : "Dark mode"}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            clear();
            navigate("/login");
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
