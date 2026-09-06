import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { tokens } from "./tokens";

describe("Design Token Synchronization Guard", () => {
  const cssPath = path.resolve(process.cwd(), "src/App.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  it("should match App.css :root (Sprout) tokens with tokens.sprout", () => {
    const rootBlockMatch = cssContent.match(/:root\s*\{([\s\S]*?)\}/);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch![1];

    expect(extractCssVar(rootBlock, "--color-primary")).toBe(tokens.sprout.colorPrimary);
    expect(extractCssVar(rootBlock, "--color-primary-rgb")).toBe(tokens.sprout.colorPrimaryRgb);
    expect(extractCssVar(rootBlock, "--color-primary-container")).toBe(tokens.sprout.colorPrimaryContainer);
    expect(extractCssVar(rootBlock, "--color-secondary")).toBe(tokens.sprout.colorSecondary);
    expect(extractCssVar(rootBlock, "--color-surface")).toBe(tokens.sprout.colorSurface);
    expect(extractCssVar(rootBlock, "--color-surface-container")).toBe(tokens.sprout.colorSurfaceContainer);
    expect(extractCssVar(rootBlock, "--color-on-surface")).toBe(tokens.sprout.colorOnSurface);
    expect(extractCssVar(rootBlock, "--color-error")).toBe(tokens.sprout.colorError);
  });

  it("should match App.css [data-theme='midnight'] tokens with tokens.midnight", () => {
    const midnightBlockMatch = cssContent.match(/\[data-theme="midnight"\]\s*\{([\s\S]*?)\}/);
    expect(midnightBlockMatch).not.toBeNull();
    const midnightBlock = midnightBlockMatch![1];

    expect(extractCssVar(midnightBlock, "--color-primary")).toBe(tokens.midnight.colorPrimary);
    expect(extractCssVar(midnightBlock, "--color-primary-rgb")).toBe(tokens.midnight.colorPrimaryRgb);
    expect(extractCssVar(midnightBlock, "--color-primary-container")).toBe(tokens.midnight.colorPrimaryContainer);
    expect(extractCssVar(midnightBlock, "--color-secondary")).toBe(tokens.midnight.colorSecondary);
    expect(extractCssVar(midnightBlock, "--color-surface")).toBe(tokens.midnight.colorSurface);
    expect(extractCssVar(midnightBlock, "--color-surface-container")).toBe(tokens.midnight.colorSurfaceContainer);
    expect(extractCssVar(midnightBlock, "--color-on-surface")).toBe(tokens.midnight.colorOnSurface);
    expect(extractCssVar(midnightBlock, "--color-error")).toBe(tokens.midnight.colorError);
  });

  it("should match App.css [data-theme='autumn'] tokens with tokens.autumn", () => {
    const autumnBlockMatch = cssContent.match(/\[data-theme="autumn"\]\s*\{([\s\S]*?)\}/);
    expect(autumnBlockMatch).not.toBeNull();
    const autumnBlock = autumnBlockMatch![1];

    expect(extractCssVar(autumnBlock, "--color-primary")).toBe(tokens.autumn.colorPrimary);
    expect(extractCssVar(autumnBlock, "--color-primary-rgb")).toBe(tokens.autumn.colorPrimaryRgb);
    expect(extractCssVar(autumnBlock, "--color-primary-container")).toBe(tokens.autumn.colorPrimaryContainer);
    expect(extractCssVar(autumnBlock, "--color-secondary")).toBe(tokens.autumn.colorSecondary);
    expect(extractCssVar(autumnBlock, "--color-surface")).toBe(tokens.autumn.colorSurface);
    expect(extractCssVar(autumnBlock, "--color-surface-container")).toBe(tokens.autumn.colorSurfaceContainer);
    expect(extractCssVar(autumnBlock, "--color-on-surface")).toBe(tokens.autumn.colorOnSurface);
    expect(extractCssVar(autumnBlock, "--color-error")).toBe(tokens.autumn.colorError);
  });

  it("should match App.css [data-theme='ocean'] tokens with tokens.ocean", () => {
    const oceanBlockMatch = cssContent.match(/\[data-theme="ocean"\]\s*\{([\s\S]*?)\}/);
    expect(oceanBlockMatch).not.toBeNull();
    const oceanBlock = oceanBlockMatch![1];

    expect(extractCssVar(oceanBlock, "--color-primary")).toBe(tokens.ocean.colorPrimary);
    expect(extractCssVar(oceanBlock, "--color-primary-rgb")).toBe(tokens.ocean.colorPrimaryRgb);
    expect(extractCssVar(oceanBlock, "--color-primary-container")).toBe(tokens.ocean.colorPrimaryContainer);
    expect(extractCssVar(oceanBlock, "--color-secondary")).toBe(tokens.ocean.colorSecondary);
    expect(extractCssVar(oceanBlock, "--color-surface")).toBe(tokens.ocean.colorSurface);
    expect(extractCssVar(oceanBlock, "--color-surface-container")).toBe(tokens.ocean.colorSurfaceContainer);
    expect(extractCssVar(oceanBlock, "--color-on-surface")).toBe(tokens.ocean.colorOnSurface);
    expect(extractCssVar(oceanBlock, "--color-error")).toBe(tokens.ocean.colorError);
  });
});

function extractCssVar(block: string, varName: string): string | null {
  const regex = new RegExp(`${varName}:\\s*([^;]+);`);
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}
