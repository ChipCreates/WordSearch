import { createTheme, type Theme } from "@mui/material";

// ── Verdant Sprout — Light Theme ─────────────────────────────────────────────
export const sproutLightTheme: Theme = createTheme({
  palette: {
    mode: "light",
    primary:   { main: "#0f5238", contrastText: "#ffffff" },
    secondary: { main: "#1f6d1a", contrastText: "#ffffff" },
    error:     { main: "#ba1a1a" },
    background: { default: "#fefae8", paper: "#f2eedd" },
    text:      { primary: "#1d1c12", secondary: "#404943" },
    divider:   "#bfc9c1",
    // Tertiary / Lavender lives in augmented tokens below; MUI v5 palette
    // doesn't have a first-class slot for it, so we reuse action.selected.
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
            backgroundColor: "#0f5238",
            "&:hover": { backgroundColor: "#0d4230" },
            boxShadow: "0 4px 8px rgba(15,82,56,0.3), 0 -1px 0 rgba(255,255,255,0.15) inset",
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: "#0f5238",
            color: "#0f5238",
            "&:hover": { backgroundColor: "rgba(15,82,56,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: "#0f5238" },
        thumb: { backgroundColor: "#1f6d1a" },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "#0f5238" } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: "#0f5238" } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          "&.Mui-selected": {
            backgroundColor: "#0f5238",
            color: "#ffffff",
            "&:hover": { backgroundColor: "#0d4230" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#f2eedd",
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
    primary:   { main: "#95d4b3", contrastText: "#003521" },
    secondary: { main: "#89da79", contrastText: "#002201" },
    error:     { main: "#ffb4ab" },
    background: { default: "#0d1a12", paper: "#162616" },
    text:      { primary: "#c8e6d6", secondary: "#8db09c" },
    divider:   "#2d4a38",
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
            backgroundColor: "#2d6a4f",
            color: "#a8e7c5",
            "&:hover": { backgroundColor: "#1e4d39" },
            "&:active": { boxShadow: "none", transform: "translateY(2px)" },
          }),
          ...(ownerState.variant === "outlined" && ownerState.color === "primary" && {
            borderColor: "#95d4b3",
            color: "#95d4b3",
            "&:hover": { backgroundColor: "rgba(149,212,179,0.08)" },
          }),
        }),
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: "#95d4b3" },
        thumb: { backgroundColor: "#89da79" },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "#95d4b3" } },
        track: { ".Mui-checked.Mui-checked + &": { backgroundColor: "#2d6a4f" } },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          color: "#8db09c",
          borderColor: "#2d4a38",
          "&.Mui-selected": {
            backgroundColor: "#2d6a4f",
            color: "#a8e7c5",
            "&:hover": { backgroundColor: "#1e4d39" },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#162616",
          backgroundImage: "none",
          borderRadius: 16,
        },
      },
    },
  },
});
