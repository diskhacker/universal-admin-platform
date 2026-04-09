import {
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PageHeader from "@/components/PageHeader";
import { PRODUCTS } from "@/lib/products";

export default function SuperProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Registered products on the platform"
      />

      <Grid container spacing={2}>
        {PRODUCTS.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
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
                    <Inventory2Icon />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Typography variant="h6" fontWeight={700}>
                        {p.displayName}
                      </Typography>
                      <Chip label="Active" size="small" color="success" />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: "monospace", mt: 0.5 }}
                    >
                      {p.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      4 plans · 4 system roles · Stripe-enabled
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
