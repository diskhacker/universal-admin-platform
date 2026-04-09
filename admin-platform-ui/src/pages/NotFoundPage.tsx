import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Typography variant="h1" fontWeight={800} color="primary.main">
          404
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          Page not found
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 400, textAlign: "center" }}
        >
          The page you're looking for doesn't exist or has moved.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Go home
        </Button>
      </Stack>
    </Box>
  );
}
