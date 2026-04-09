import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  color?: string;
}

export default function StatCard({ label, value, icon, hint, color }: Props) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: color ?? "primary.main",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.disabled">
                {hint}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
