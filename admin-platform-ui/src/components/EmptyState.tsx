import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: Props) {
  return (
    <Box
      sx={{
        py: 8,
        px: 2,
        textAlign: "center",
      }}
    >
      <Stack spacing={2} alignItems="center">
        {icon && (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
            }}
          >
            {icon}
          </Box>
        )}
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            {description}
          </Typography>
        )}
        {action}
      </Stack>
    </Box>
  );
}
