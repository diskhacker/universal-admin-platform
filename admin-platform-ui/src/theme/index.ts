import { createTheme, ThemeOptions } from "@mui/material/styles";
import type { ThemeMode, AnimationPref } from "@/stores/ui.store";

const PRIMARY = "#2563EB";
const PRIMARY_LIGHT = "#60A5FA";
const PRIMARY_DARK = "#1E40AF";

export function buildTheme(mode: ThemeMode, animation: AnimationPref) {
  const isDark = mode === "dark";

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: PRIMARY,
        light: PRIMARY_LIGHT,
        dark: PRIMARY_DARK,
        contrastText: "#ffffff",
      },
      secondary: { main: "#7C3AED" },
      success: { main: "#10B981" },
      warning: { main: "#F59E0B" },
      error: { main: "#EF4444" },
      info: { main: "#0EA5E9" },
      background: isDark
        ? { default: "#0B1220", paper: "#0F172A" }
        : { default: "#F8FAFC", paper: "#FFFFFF" },
      divider: isDark
        ? "rgba(148, 163, 184, 0.12)"
        : "rgba(15, 23, 42, 0.08)",
      text: isDark
        ? { primary: "#F1F5F9", secondary: "#94A3B8" }
        : { primary: "#0F172A", secondary: "#475569" },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      h1: { fontWeight: 700, letterSpacing: "-0.025em" },
      h2: { fontWeight: 700, letterSpacing: "-0.025em" },
      h3: { fontWeight: 700, letterSpacing: "-0.02em" },
      h4: { fontWeight: 700, letterSpacing: "-0.015em" },
      h5: { fontWeight: 600, letterSpacing: "-0.01em" },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" },
    },
    transitions: {
      duration:
        animation === "off"
          ? { shortest: 0, shorter: 0, short: 0, standard: 0, complex: 0, enteringScreen: 0, leavingScreen: 0 }
          : animation === "reduced"
          ? { shortest: 75, shorter: 100, short: 125, standard: 150, complex: 175, enteringScreen: 125, leavingScreen: 100 }
          : undefined,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "thin",
          },
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? "#334155" : "#CBD5E1",
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, paddingInline: 16 },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${
              isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)"
            }`,
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "blur(8px)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            borderRight: `1px solid ${
              isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)"
            }`,
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: "small", variant: "outlined" },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginInline: 8,
            marginBlock: 2,
            "&.Mui-selected": {
              backgroundColor: isDark
                ? "rgba(37, 99, 235, 0.16)"
                : "rgba(37, 99, 235, 0.08)",
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(37, 99, 235, 0.22)"
                  : "rgba(37, 99, 235, 0.12)",
              },
            },
          },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    },
  };

  return createTheme(options);
}
