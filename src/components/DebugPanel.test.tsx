import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DebugPanel, { WS_DEBUG_PANEL_MARKER } from "./DebugPanel";
import type { DebugApi } from "../hooks/useWordSearchGame";
import { ACHIEVEMENTS } from "../achievements";
import { PLANTS_CATALOG } from "../plantsCatalog";
import { DEFAULT_POWERUP_INVENTORY } from "../powerups";

function makeDebugApi(): DebugApi {
    return {
        loadGrid: vi.fn(),
        setUnlockedAchievements: vi.fn(),
        setOwnedPlants: vi.fn(),
        setGrowthByPlant: vi.fn(),
        setPowerupInventory: vi.fn(),
        setHighestUnlockedLevel: vi.fn(),
        setUnlockedThemes: vi.fn(),
        setHasGoldenCrest: vi.fn(),
        queuePromotionPreview: vi.fn(),
    };
}

function baseProps() {
    return {
        onClose: vi.fn(),
        onNavigate: vi.fn(),
        debugApi: makeDebugApi(),
        unlockedAchievements: new Set<string>(),
        ownedPlants: ["moss-sprout"],
        growthByPlant: {},
        powerupInventory: { ...DEFAULT_POWERUP_INVENTORY },
        unlockedThemes: [],
        hasGoldenCrest: false,
        highestUnlockedLevel: 1,
        gridSize: 4,
        wordsToFind: [] as string[],
        foundWords: {} as Record<string, string>,
        revealAndSolveWord: vi.fn(() => true),
        reshuffle: vi.fn(() => true),
        activateSuperRoot: vi.fn(() => true),
        activateCompass: vi.fn(() => true),
        activateSpectrometer: vi.fn(() => true),
        activateDoubleSeeds: vi.fn(() => true),
        staticPreviewActive: false,
        onSetStaticPreview: vi.fn(),
    };
}

describe("DebugPanel", () => {
    afterEach(() => cleanup());

    it("renders a section per feature surface, sized to the real catalogs", () => {
        render(<DebugPanel {...baseProps()} />);
        expect(document.querySelector(`[data-testid="${WS_DEBUG_PANEL_MARKER}"]`)).toBeTruthy();
        expect(screen.getByText(`Achievements (0/${ACHIEVEMENTS.length})`)).toBeTruthy();
        expect(screen.getByText(`Garden (1/${PLANTS_CATALOG.length} plants)`)).toBeTruthy();
        expect(screen.getByRole("button", { name: "12×12" })).toBeTruthy();
    });

    it("loads a board size through debugApi when a size button is clicked", () => {
        const props = baseProps();
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "8×8" }));
        expect(props.debugApi.loadGrid).toHaveBeenCalledWith(8);
    });

    it("offers every size from 4x4 through 12x12", () => {
        render(<DebugPanel {...baseProps()} />);
        for (let size = 4; size <= 12; size++) {
            expect(screen.getByRole("button", { name: `${size}×${size}` })).toBeTruthy();
        }
    });

    it("picking a board size exits static preview and jumps to Play", () => {
        const props = baseProps();
        props.staticPreviewActive = true;
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "6×6" }));
        expect(props.onSetStaticPreview).toHaveBeenCalledWith(false);
        expect(props.onNavigate).toHaveBeenCalledWith("play");
    });

    it("enters the static end-screen preview by completing the level and freezing it", () => {
        const props = baseProps();
        props.wordsToFind = ["cat", "dog"];
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Preview end screen (static)" }));
        expect(props.revealAndSolveWord).toHaveBeenCalledWith("cat");
        expect(props.revealAndSolveWord).toHaveBeenCalledWith("dog");
        expect(props.onSetStaticPreview).toHaveBeenCalledWith(true);
        expect(props.onNavigate).toHaveBeenCalledWith("play");
    });

    it("exits the static end-screen preview without re-completing the level", () => {
        const props = baseProps();
        props.staticPreviewActive = true;
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Exit static end screen" }));
        expect(props.onSetStaticPreview).toHaveBeenCalledWith(false);
        expect(props.revealAndSolveWord).not.toHaveBeenCalled();
    });

    it("unlocks and locks every achievement through debugApi", () => {
        const props = baseProps();
        render(<DebugPanel {...props} />);
        // The Achievements section is collapsed by default -- open it first, same as a real user would.
        fireEvent.click(screen.getByText(`Achievements (0/${ACHIEVEMENTS.length})`));
        fireEvent.click(screen.getByRole("button", { name: "Unlock all" }));
        expect(props.debugApi.setUnlockedAchievements).toHaveBeenCalledWith(ACHIEVEMENTS.map(a => a.id));
        fireEvent.click(screen.getByRole("button", { name: "Lock all" }));
        expect(props.debugApi.setUnlockedAchievements).toHaveBeenCalledWith([]);
    });

    it("previews a genuine promotion spanning the rank below the current one", () => {
        const props = baseProps();
        props.highestUnlockedLevel = 7; // Fern Forager (minLevel 7), preceded by Moss Tender (minLevel 4)
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByText("Botanist rank"));
        fireEvent.click(screen.getByRole("button", { name: "Preview promotion ceremony" }));
        expect(props.debugApi.queuePromotionPreview).toHaveBeenCalledWith(4, 7);
    });

    it("previews an upcoming promotion when already at the lowest rank", () => {
        const props = baseProps();
        props.highestUnlockedLevel = 1; // Seedling Scout, the first rank, has no preceding rank
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByText("Botanist rank"));
        fireEvent.click(screen.getByRole("button", { name: "Preview promotion ceremony" }));
        expect(props.debugApi.queuePromotionPreview).toHaveBeenCalledWith(1, 4); // Moss Tender starts at 4
    });

    it("calls onClose from its close button", () => {
        const props = baseProps();
        render(<DebugPanel {...props} />);
        fireEvent.click(screen.getByRole("button", { name: "Close debug panel" }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });
});
