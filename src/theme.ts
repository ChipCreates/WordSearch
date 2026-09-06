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

// ── Autumn Canopy — store-unlockable warm light theme ─────────────────────────
export const sproutAutumnTheme: Theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: tokens.autumn.colorPrimary, contrastText: tokens.autumn.colorOnPrimary },
    secondary: { main: tokens.autumn.colorSecondary, contrastText: "#ffffff" },
    error:     { main: tokens.autumn.colorError },
    background: { default: tokens.autumn.colorSurface, paper: tokens.autumn.colorSurfaceContainer },
    text:      { primary: tokens.autumn.colorOnSurface, secondary: tokens.autumn.colorOnSurfaceVariant },
    divider:   tokens.autumn.colorOutlineVariant,
    action: { selectedOpacity: 0.12 },
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
        root: ({ ownerState }: { ownerState: { variant?: string; color?: string } }) => ({
          textTransform: "none" as const,
          fontFamily: "'Work Sans', sans-serif",
          fontWeight: 500,
          "&:active": { transform: "translateY(2px)" },
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
          ...(ownerState.variant === "contained" && ownerState.color === "primary" && {
            backgroundColor: tokens.autumn.colorPrimary,
            "&:hover": { backgroundColor: "#8a430f" },
            boxShadow: "0 4px 8px rgba(168,85,27,0.3), 0 -1px 0 rgba(255,255,255,0.15) inset",
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: tokens.autumn.colorPrimary,
            color: tokens.autumn.colorPrimary,
            "&:hover": { backgroundColor: "rgba(168,85,27,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: tokens.autumn.colorPrimary },
        thumb: { backgroundColor: tokens.autumn.colorSecondary },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: tokens.autumn.colorPrimary } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: tokens.autumn.colorPrimary } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          "&.Mui-selected": {
            backgroundColor: tokens.autumn.colorPrimary,
            color: "#ffffff",
            "&:hover": { backgroundColor: "#8a430f" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.autumn.colorSurfaceContainer,
          backgroundImage: "none",
          borderRadius: 16,
        },
      },
    },
  },
});

// ── Ocean Trench — store-unlockable deep-sea dark theme ───────────────────────
export const sproutOceanTheme: Theme = createTheme({
  palette: {
    mode: "dark",
    primary:   { main: tokens.ocean.colorPrimary, contrastText: tokens.ocean.colorOnPrimary },
    secondary: { main: tokens.ocean.colorSecondary, contrastText: "#022826" },
    error:     { main: tokens.ocean.colorError },
    background: { default: tokens.ocean.colorSurface, paper: tokens.ocean.colorSurfaceContainer },
    text:      { primary: tokens.ocean.colorOnSurface, secondary: tokens.ocean.colorOnSurfaceVariant },
    divider:   tokens.ocean.colorOutlineVariant,
    action: { selectedOpacity: 0.16 },
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
        root: ({ ownerState }: { ownerState: { variant?: string; color?: string } }) => ({
          textTransform: "none" as const,
          fontFamily: "'Work Sans', sans-serif",
          fontWeight: 500,
          "&:active": { transform: "translateY(2px)" },
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
          ...(ownerState.variant === "contained" && ownerState.color === "primary" && {
            backgroundColor: tokens.ocean.colorPrimaryContainer,
            color: tokens.ocean.colorOnPrimary,
            "&:hover": { backgroundColor: "#28948d" },
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: tokens.ocean.colorPrimary,
            color: tokens.ocean.colorPrimary,
            "&:hover": { backgroundColor: "rgba(63,208,201,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: tokens.ocean.colorPrimary },
        thumb: { backgroundColor: tokens.ocean.colorSecondary },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: tokens.ocean.colorPrimary } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: tokens.ocean.colorPrimaryContainer } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: tokens.ocean.colorOnSurfaceVariant,
          borderColor: tokens.ocean.colorOutlineVariant,
          "&.Mui-selected": {
            backgroundColor: tokens.ocean.colorPrimaryContainer,
            color: tokens.ocean.colorOnPrimary,
            "&:hover": { backgroundColor: "#28948d" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.ocean.colorSurfaceContainer,
          backgroundImage: "none",
          borderRadius: 16,
        },
      },
    },
  },
});
