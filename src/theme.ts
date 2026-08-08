import { createTheme, type Theme } from "@mui/material";
import { tokens } from "./theme/tokens";

// ── Verdant Sprout — Light Theme ─────────────────────────────────────────────
export const sproutLightTheme: Theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: tokens.sprout.colorPrimary, contrastText: tokens.sprout.colorOnPrimary },
    secondary: { main: tokens.sprout.colorSecondary, contrastText: "#ffffff" },
    error:     { main: tokens.sprout.colorError },
    background: { default: tokens.sprout.colorSurface, paper: tokens.sprout.colorSurfaceContainer },
    text:      { primary: tokens.sprout.colorOnSurface, secondary: tokens.sprout.colorOnSurfaceVariant },
    divider:   tokens.sprout.colorOutlineVariant,
    action: {
      selectedOpacity: 0.12,
    },
  },
  typography: {
    fontFamily: "'Work Sans', sans-serif",
    h1: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({
          ownerState,
        }: {
          ownerState: { variant?: string; color?: string };
        }) => ({
          textTransform: "none" as const,
          fontFamily: "'Work Sans', sans-serif",
          fontWeight: 500,
          "&:active": { transform: "translateY(2px)" },
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
          ...(ownerState.variant === "contained" && ownerState.color === "primary" && {
            backgroundColor: tokens.sprout.colorPrimary,
            "&:hover": { backgroundColor: "#0d4230" },
            boxShadow: "0 4px 8px rgba(15,82,56,0.3), 0 -1px 0 rgba(255,255,255,0.15) inset",
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: tokens.sprout.colorPrimary,
            color: tokens.sprout.colorPrimary,
            "&:hover": { backgroundColor: "rgba(15,82,56,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: tokens.sprout.colorPrimary },
        thumb: { backgroundColor: tokens.sprout.colorSecondary },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: tokens.sprout.colorPrimary } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: tokens.sprout.colorPrimary } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          "&.Mui-selected": {
            backgroundColor: tokens.sprout.colorPrimary,
            color: "#ffffff",
            "&:hover": { backgroundColor: "#0d4230" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.sprout.colorSurfaceContainer,
          backgroundImage: "none",
          borderRadius: 16,
        },
      },
    },
  },
});

// ── Verdant Sprout — Midnight (Dark) Theme ────────────────────────────────────
export const sproutDarkTheme: Theme = createTheme({
  palette: {
    mode: "dark",
    primary:   { main: tokens.midnight.colorPrimary, contrastText: tokens.midnight.colorOnPrimary },
    secondary: { main: tokens.midnight.colorSecondary, contrastText: "#002201" },
    error:     { main: tokens.midnight.colorError },
    background: { default: tokens.midnight.colorSurface, paper: tokens.midnight.colorSurfaceContainer },
    text:      { primary: tokens.midnight.colorOnSurface, secondary: tokens.midnight.colorOnSurfaceVariant },
    divider:   tokens.midnight.colorOutlineVariant,
    action: {
      selectedOpacity: 0.16,
    },
  },
  typography: {
    fontFamily: "'Work Sans', sans-serif",
    h1: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Quicksand', sans-serif", fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({
          ownerState,
        }: {
          ownerState: { variant?: string; color?: string };
        }) => ({
          textTransform: "none" as const,
          fontFamily: "'Work Sans', sans-serif",
          fontWeight: 500,
          "&:active": { transform: "translateY(2px)" },
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
          ...(ownerState.variant === "contained" && ownerState.color === "primary" && {
            backgroundColor: tokens.midnight.colorPrimaryContainer,
            color: tokens.midnight.colorOnPrimary,
            "&:hover": { backgroundColor: "#00d06c" },
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: tokens.midnight.colorPrimary,
            color: tokens.midnight.colorPrimary,
            "&:hover": { backgroundColor: "rgba(0,228,121,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: tokens.midnight.colorPrimary },
        thumb: { backgroundColor: tokens.midnight.colorSecondary },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: tokens.midnight.colorPrimary } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: tokens.midnight.colorPrimaryContainer } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: tokens.midnight.colorOnSurfaceVariant,
          borderColor: tokens.midnight.colorOutlineVariant,
          "&.Mui-selected": {
            backgroundColor: tokens.midnight.colorPrimaryContainer,
            color: tokens.midnight.colorOnPrimary,
            "&:hover": { backgroundColor: "#00d06c" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.midnight.colorSurfaceContainer,
          backgroundImage: "none",
          borderRadius: 16,
        },
      },
    },
  },
});
