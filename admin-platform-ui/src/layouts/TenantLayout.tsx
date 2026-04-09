import { Outlet } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import BoltIcon from "@mui/icons-material/Bolt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import KeyIcon from "@mui/icons-material/Key";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import SidebarNav, { NavItem } from "@/components/SidebarNav";
import NotificationBell from "@/components/NotificationBell";
import UserMenu from "@/components/UserMenu";
import { APP_NAME } from "@/lib/config";

const DRAWER_WIDTH = 260;

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon fontSize="small" /> },
  { label: "Users", path: "/users", icon: <GroupIcon fontSize="small" /> },
  {
    label: "Roles",
    path: "/roles",
    icon: <AdminPanelSettingsIcon fontSize="small" />,
  },
  {
    label: "Billing",
    path: "/billing",
    icon: <CreditCardIcon fontSize="small" />,
  },
  { label: "API Keys", path: "/api-keys", icon: <KeyIcon fontSize="small" /> },
  {
    label: "Settings",
    path: "/settings",
    icon: <SettingsIcon fontSize="small" />,
  },
  {
    label: "Audit Logs",
    path: "/audit",
    icon: <HistoryIcon fontSize="small" />,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: <NotificationsIcon fontSize="small" />,
  },
];

export default function TenantLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  const drawerContent = (
    <Box>
      <Toolbar sx={{ px: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {APP_NAME}
          </Typography>
        </Stack>
      </Toolbar>
      <SidebarNav items={navItems} sectionLabel="Workspace" />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%" },
          ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          bgcolor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(11,18,32,0.75)"
              : "rgba(255,255,255,0.75)",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="body2"
            sx={{ flexGrow: 1, color: "text.secondary" }}
            noWrap
          >
            {user?.tenantId ? "Tenant admin" : "Workspace"}
          </Typography>
          <NotificationBell />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: sidebarOpen ? DRAWER_WIDTH : 0 }, flexShrink: 0 }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={sidebarOpen}
            onClose={toggleSidebar}
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="persistent"
            open={sidebarOpen}
            sx={{
              "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%",
          },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
