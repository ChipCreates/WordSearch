/**
 * `?debug=true` is gated on `import.meta.env.DEV` so it can never be true in
 * a production build -- Vite statically replaces that expression with
 * `false` when building for production, which lets esbuild/Rollup dead-code
 * eliminate every branch that depends on it (the DebugPanel lazy import
 * included) before the bundle is even chunked.
 */
export const isDebugBuild = (): boolean => import.meta.env.DEV;

export const isDebugModeRequested = (): boolean =>
    isDebugBuild()
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("debug") === "true";
