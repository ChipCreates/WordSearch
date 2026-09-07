import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MobilePowerupDrawer from "./MobilePowerupDrawer";
import { DEFAULT_POWERUP_INVENTORY } from "../../powerups";
import { createFieldNotesState } from "../../fieldNotes";

describe("MobilePowerupDrawer", () => {
    it("makes Field Notes part of the open Field Kit", () => {
        render(
            <MobilePowerupDrawer
                open
                onClose={vi.fn()}
                returnFocusRef={{ current: null }}
                hintAvailable={false}
                freeHintUsesRemaining={0}
                powerupInventory={{ ...DEFAULT_POWERUP_INVENTORY }}
                doubleSeedsActive={false}
                onRevealHint={vi.fn()}
                onShuffle={vi.fn()}
                onRetry={vi.fn()}
                onSuperRoot={vi.fn()}
                onCompass={vi.fn()}
                onSpectrometer={vi.fn()}
                onDoubleSeeds={vi.fn()}
                fieldNotes={createFieldNotesState(0)}
                onCollectFieldNote={vi.fn(() => true)}
            />,
        );

        expect(screen.getByRole("dialog", { name: "Field Kit" })).toBeTruthy();
        expect(screen.getByRole("dialog", { name: "Field Kit" }).getAttribute("aria-modal")).toBe("true");
        expect(screen.getByRole("region", { name: "Field Notes" })).toBeTruthy();
    });
});
