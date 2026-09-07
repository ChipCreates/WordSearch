import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DestinationSkeleton from "./DestinationSkeleton";

describe("DestinationSkeleton", () => {
    it.each([
        ["levels", "Loading levels"],
        ["garden", "Loading garden"],
        ["achievements", "Loading trophies"],
        ["settings", "Loading settings"],
        ["about", "Loading about"],
        ["store", "Loading seed store"],
    ] as const)("provides a themed local fallback for %s", (destination, label) => {
        render(<DestinationSkeleton destination={destination} />);

        expect(screen.getByRole("status", { name: label })).toBeTruthy();
        expect(document.querySelectorAll(".ws-skeleton-block").length).toBeGreaterThan(0);
    });
});
