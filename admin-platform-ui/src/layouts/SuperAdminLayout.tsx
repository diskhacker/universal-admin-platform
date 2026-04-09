import { Outlet, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  Chip,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ShieldIcon from "@mui/icons-material/Shield";
import BusinessIcon from "@mui/icons-material/Business";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import FlagIcon from "@mui/icons-material/Flag";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useUIStore } from "@/stores/ui.store";
import SidebarNav, { NavItem } from "@/components/SidebarNav";
import UserMenu from "@/components/UserMenu";

const DRAWER_WIDTH = 260;

const navItems: NavItem[] = [
  {
    label: "Tenants",
    path: "/super/tenants",
    icon: <BusinessIcon fontSize="small" />,
  },
  {
    label: "Products",
    path: "/super/products",
    icon: <Inventory2Icon fontSize="small" />,
  },
  {
    label: "Feature Flags",
    path: "/super/feature-flags",
    icon: <FlagIcon fontSize="small" />,
  },
  {
    label: "Global Audit",
    path: "/super/audit",
    icon: <HistoryIcon fontSize="small" />,
  },
];

export default function SuperAdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  const drawerContent = (
    <Box>
      <Toolbar sx={{ px: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              Super Admin
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Platform control
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <SidebarNav items={navItems} sectionLabel="Platform" />
      <Box sx={{ px: 2, mt: 2 }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
        >
          Back to tenant
        </Button>
      </Box>
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
          >
            <MenuIcon />
          </IconButton>
          <Chip
            label="SUPER ADMIN"
            size="small"
            color="secondary"
            sx={{ mr: 2, fontWeight: 700, letterSpacing: 0.5 }}
          />
          <Box sx={{ flexGrow: 1 }} />
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
