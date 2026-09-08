import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ContextSidebar from "./ContextSidebar";
import { DEFAULT_POWERUP_INVENTORY, type PowerupInventory } from "../../powerups";
import { createFieldNotesState } from "../../fieldNotes";
import type { ComponentProps } from "react";

type SidebarProps = ComponentProps<typeof ContextSidebar>;

const stats = {
    levelsCompleted: 4,
    seeds: 120,
    categoriesSeen: 3,
    foundDiagonal: false,
    totalCategories: 54,
    bonusWordsFound: 2,
    levelsCompletedWithoutHint: 1,
    maxBonusWordsInLevel: 1,
    reverseWordsFound: 0,
    plantsBloomed: 0,
    bloomedRarityTiers: 0,
    uniqueCategoriesCompleted: 2,
    powerupsUsed: 0,
};

function makeProps(overrides: Partial<SidebarProps> = {}): SidebarProps {
    return {
        activeTab: "play",
        highestUnlockedLevel: 4,
        playingLevel: 4,
        levelComplete: false,
        hasGoldenCrest: false,
        avatarBackgroundPosition: "0% 0%",
        profileRankTitle: "Seedling Scout",
        onOpenProfile: vi.fn(),
        onNextLevel: vi.fn(),
        onRevealHint: vi.fn(),
        onShuffle: vi.fn(),
        onRetry: vi.fn(),
        onSuperRoot: vi.fn(),
        onCompass: vi.fn(),
        onSpectrometer: vi.fn(),
        onDoubleSeeds: vi.fn(),
        hintAvailable: true,
        freeHintUsesRemaining: 1,
        powerupInventory: { ...DEFAULT_POWERUP_INVENTORY },
        doubleSeedsActive: false,
        sfxMuted: false,
        musicMuted: false,
        onToggleSfx: vi.fn(),
        onToggleMusic: vi.fn(),
        onHelp: vi.fn(),
        ownedPlants: [],
        wateredTimestamps: {},
        growthByPlant: {},
        onWaterAllReady: vi.fn(),
        achievementStats: stats,
        unlockedAchievements: new Set(),
        fieldNotes: createFieldNotesState(0),
        onCollectFieldNote: vi.fn(() => true),
        ...overrides,
    };
}

describe("ContextSidebar interaction coverage", () => {
    it("keeps unavailable power-ups disabled and enables owned charges", () => {
        const inventory: PowerupInventory = {
            ...DEFAULT_POWERUP_INVENTORY,
            "lumina-cyclone": 1,
            "super-root": 1,
            "bioluminescent-compass": 1,
            "flora-spectrometer": 1,
            "nitrogen-booster": 1,
        };
        const props = makeProps({ powerupInventory: inventory, freeHintUsesRemaining: 0, hintAvailable: false });
        render(<ContextSidebar {...props} />);

        expect(screen.getByRole("button", { name: /Hint×0/ }).hasAttribute("disabled")).toBe(true);
        expect(screen.getByRole("button", { name: /Shuffle×1/ }).hasAttribute("disabled")).toBe(false);
        expect(screen.getByRole("button", { name: /Solve word×1/ }).hasAttribute("disabled")).toBe(false);
        expect(screen.getByRole("button", { name: /Compass×1/ }).hasAttribute("disabled")).toBe(false);
        expect(screen.getByRole("button", { name: /Spectrometer×1/ }).hasAttribute("disabled")).toBe(false);
        expect(screen.getByRole("button", { name: /Double Seeds×1/ }).hasAttribute("disabled")).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: /Shuffle×1/ }));
        expect(props.onShuffle).toHaveBeenCalledTimes(1);
    });

    it("disables the booster while it is active", () => {
        render(<ContextSidebar {...makeProps({ powerupInventory: { ...DEFAULT_POWERUP_INVENTORY, "nitrogen-booster": 1 }, doubleSeedsActive: true })} />);

        expect(screen.getByRole("button", { name: /Double SeedsActive/ }).hasAttribute("disabled")).toBe(true);
        expect(screen.getByRole("status").textContent).toContain("2× Seeds active");
    });

    it.each([
        ["levels", "Journey Progress"],
        ["garden", "Garden Care"],
        ["achievements", "Closest Milestones"],
    ] as const)("renders the distinct %s context panel", (activeTab, heading) => {
        render(<ContextSidebar {...makeProps({ activeTab })} />);

        expect(screen.getByText(heading)).toBeTruthy();
    });
});
