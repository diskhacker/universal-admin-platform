import { useState, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantService } from "@/services/tenant.service";
import { useUIStore } from "@/stores/ui.store";
import PageHeader from "@/components/PageHeader";
import { errorMessage } from "@/lib/api";

export default function SettingsPage() {
  const qc = useQueryClient();
  const themeMode = useUIStore((s) => s.themeMode);
  const setThemeMode = useUIStore((s) => s.setThemeMode);
  const animationPref = useUIStore((s) => s.animationPref);
  const setAnimationPref = useUIStore((s) => s.setAnimationPref);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", "current"],
    queryFn: () => tenantService.getCurrent(),
  });

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setLogoUrl(tenant.logoUrl ?? "");
      setDomain(tenant.domain ?? "");
    }
  }, [tenant]);

  const update = useMutation({
    mutationFn: () =>
      tenantService.updateCurrent({
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
        domain: domain.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant"] });
      setSaveMessage({ type: "success", text: "Workspace updated" });
    },
    onError: (err) =>
      setSaveMessage({ type: "error", text: errorMessage(err) }),
  });

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace branding, appearance, and preferences"
      />

      <Grid container spacing={3}>
        {/* Branding */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Workspace
              </Typography>
              {saveMessage && (
                <Alert
                  severity={saveMessage.type}
                  sx={{ mb: 2 }}
                  onClose={() => setSaveMessage(null)}
                >
                  {saveMessage.text}
                </Alert>
              )}
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={logoUrl || undefined}
                    sx={{ width: 64, height: 64, bgcolor: "primary.main" }}
                  >
                    {name?.[0]?.toUpperCase() ?? "W"}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Logo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Paste a public image URL
                    </Typography>
                  </Box>
                </Stack>
                <TextField
                  label="Logo URL"
                  fullWidth
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <TextField
                  label="Workspace name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="Custom domain"
                  fullWidth
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="app.example.com"
                />
                <TextField
                  label="Workspace slug"
                  fullWidth
                  value={tenant?.slug ?? ""}
                  disabled
                  helperText="Contact support to change your slug"
                />
                <Box>
                  <Button
                    variant="contained"
                    disabled={update.isPending}
                    onClick={() => update.mutate()}
                  >
                    Save changes
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Appearance
              </Typography>

              <Stack spacing={3}>
                <FormControl>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Theme
                  </Typography>
                  <Select
                    size="small"
                    value={themeMode}
                    onChange={(e) =>
                      setThemeMode(e.target.value as "dark" | "light")
                    }
                  >
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="light">Light</MenuItem>
                  </Select>
                </FormControl>

                <Divider />

                <FormControl>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Animations
                  </Typography>
                  <RadioGroup
                    value={animationPref}
                    onChange={(e) =>
                      setAnimationPref(
                        e.target.value as "full" | "reduced" | "off"
                      )
                    }
                  >
                    <FormControlLabel
                      value="full"
                      control={<Radio size="small" />}
                      label="Full"
                    />
                    <FormControlLabel
                      value="reduced"
                      control={<Radio size="small" />}
                      label="Reduced"
                    />
                    <FormControlLabel
                      value="off"
                      control={<Radio size="small" />}
                      label="Off"
                    />
                  </RadioGroup>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
