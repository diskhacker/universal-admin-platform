import { Outlet } from "react-router-dom";
import { Box, Container, Stack, Typography, useTheme } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import { APP_NAME } from "@/lib/config";

export default function AuthLayout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark
          ? "radial-gradient(1200px 600px at 20% 10%, rgba(37,99,235,0.18) 0%, transparent 60%), radial-gradient(900px 500px at 80% 90%, rgba(124,58,237,0.18) 0%, transparent 60%), #0B1220"
          : "radial-gradient(1200px 600px at 20% 10%, rgba(37,99,235,0.12) 0%, transparent 60%), radial-gradient(900px 500px at 80% 90%, rgba(124,58,237,0.10) 0%, transparent 60%), #F8FAFC",
        px: 2,
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon fontSize="medium" />
          </Box>
          <Typography variant="h5" fontWeight={700} textAlign="center">
            {APP_NAME}
          </Typography>
        </Stack>
        <Outlet />
      </Container>
    </Box>
  );
}
