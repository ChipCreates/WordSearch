import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GardenView from "./GardenView";
import type { BloomEvent } from "../bloomEvents";

// WSP-2.6: dedicated component-level coverage for the Garden's watering
// beat and bloom presentation, across every bloom-triggering source
// GardenView itself owns (individual watering and fertilizing -- bulk
// "water all ready" lives in useWordSearchGame.ts/App.tsx and is covered
// there; see useWordSearchGame.test.ts's "bloomEvents presentation queue"
// describe block for that third source sharing this exact same shape).
//
// "moss-sprout" is Word Sprout's starter plant (economy.ts's
// STARTER_PLANT_ID): purchaseCost 0, bloomBounty 50, fertilizerCost 25
// (the MIN_FERTILIZER_COST floor). Using it keeps every test's expected
// bounty/cost numbers simple and stable regardless of economy tuning
// elsewhere in the catalog.
const PLANT_ID = "moss-sprout";
const PLANT_NAME = "Deep Moss Sprout";
const PLANT_TIER = "Common";
const BLOOM_BOUNTY = 50;

function baseProps(overrides: Partial<Parameters<typeof GardenView>[0]> = {}) {
    return {
        seeds: 1000,
        ownedPlants: [PLANT_ID],
        wateredTimestamps: {},
        growthByPlant: { [PLANT_ID]: 75 },
        afflictions: {},
        remedyCharges: 0,
        onOpenStore: vi.fn(),
        addSeeds: vi.fn(),
        spendSeeds: vi.fn(() => true),
        updateWateredTimestamp: vi.fn(),
        updatePlantGrowth: vi.fn(),
        recordPlantBloom: vi.fn(),
        onTreatPlant: vi.fn(() => true),
        onCompostPlant: vi.fn(() => true),
        showToast: vi.fn(),
        bloomEvents: [] as BloomEvent[],
        onDismissBloomEvent: vi.fn(),
        isMobile: false,
        ...overrides,
    };
}

function bloomEvent(overrides: Partial<BloomEvent> = {}): BloomEvent {
    return { id: "bloom-1", plantId: PLANT_ID, plantName: PLANT_NAME, tier: PLANT_TIER, bounty: BLOOM_BOUNTY, ...overrides };
}

describe("GardenView", () => {
    afterEach(() => cleanup());

    describe("individual watering (handleWaterPlant)", () => {
        it("waters a non-bloomed plant without triggering a bloom", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 25 } });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByText("Water Vessel"));

            expect(props.updateWateredTimestamp).toHaveBeenCalledWith(PLANT_ID, expect.any(Number));
            expect(props.updatePlantGrowth).toHaveBeenCalledWith(PLANT_ID, 50);
            expect(props.recordPlantBloom).not.toHaveBeenCalled();
            expect(props.addSeeds).not.toHaveBeenCalled();
        });

        it("blooming from 75% to 100% emits a full BloomOccurrence via recordPlantBloom, and no plain bloom toast", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 75 } });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByText("Water Vessel"));

            expect(props.addSeeds).toHaveBeenCalledWith(BLOOM_BOUNTY);
            expect(props.recordPlantBloom).toHaveBeenCalledTimes(1);
            expect(props.recordPlantBloom).toHaveBeenCalledWith({
                plantId: PLANT_ID, plantName: PLANT_NAME, tier: PLANT_TIER, bounty: BLOOM_BOUNTY,
            });
            // WSP-2.6 replaces the old plain-toast bloom flow -- the
            // celebration (BloomCelebration) is the presentation now, not a
            // showToast call announcing the bloom.
            expect(props.showToast).not.toHaveBeenCalledWith(expect.stringContaining("Fantastic"));
        });

        it("respects the watering cooldown and never fires a beat/mutation while it's active", () => {
            const props = baseProps({ wateredTimestamps: { [PLANT_ID]: Date.now() } });
            render(<GardenView {...props} />);

            // The button itself is disabled during cooldown (existing
            // behavior, unchanged by this issue) -- confirm the underlying
            // handler still no-ops even if something did dispatch a click.
            const button = screen.getByRole("button", { name: /Water in/ }) as HTMLButtonElement;
            expect(button.disabled).toBe(true);
            fireEvent.click(button);
            expect(props.updateWateredTimestamp).not.toHaveBeenCalled();
        });
    });

    describe("individual fertilizing (handleFertilizePlant)", () => {
        it("blooming via fertilizer emits the SAME occurrence shape as watering", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 75 } });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByText(/Apply Fertilizer/));

            expect(props.spendSeeds).toHaveBeenCalledWith(25); // MIN_FERTILIZER_COST for the starter plant
            expect(props.addSeeds).toHaveBeenCalledWith(BLOOM_BOUNTY);
            expect(props.recordPlantBloom).toHaveBeenCalledWith({
                plantId: PLANT_ID, plantName: PLANT_NAME, tier: PLANT_TIER, bounty: BLOOM_BOUNTY,
            });
        });

        it("does not fertilize (or spend Seeds) when the purchase fails", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 75 }, spendSeeds: vi.fn(() => false) });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByText(/Apply Fertilizer/));

            expect(props.updatePlantGrowth).not.toHaveBeenCalled();
            expect(props.recordPlantBloom).not.toHaveBeenCalled();
        });
    });

    describe("watering beat (Part 1) and rapid repeated input", () => {
        it("shows a watering-beat overlay immediately after tapping Water Vessel", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 25 } });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByText("Water Vessel"));

            const beat = screen.getByTestId("watering-beat");
            expect(beat.getAttribute("data-action")).toBe("water");
        });

        it("mashing the Water button rapidly fires the underlying mutation only once", () => {
            const props = baseProps({ growthByPlant: { [PLANT_ID]: 25 } });
            render(<GardenView {...props} />);

            const button = screen.getByText("Water Vessel").closest("button")!;
            fireEvent.click(button);
            // The beat's mash-guard (activeBeats) disables the button the
            // instant the first tap registers, so a second rapid tap before
            // the ~1.4s beat window closes must not re-run the mutation.
            fireEvent.click(button);
            fireEvent.click(button);

            expect(props.updateWateredTimestamp).toHaveBeenCalledTimes(1);
            expect(props.updatePlantGrowth).toHaveBeenCalledTimes(1);
        });

        it("the beat clears after its window, re-enabling the button for the next real action", () => {
            vi.useFakeTimers();
            try {
                const props = baseProps({ growthByPlant: { [PLANT_ID]: 25 } });
                render(<GardenView {...props} />);

                const button = screen.getByText("Water Vessel").closest("button")!;
                act(() => { fireEvent.click(button); });
                expect(screen.queryByTestId("watering-beat")).not.toBeNull();

                act(() => { vi.advanceTimersByTime(1500); });

                expect(screen.queryByTestId("watering-beat")).toBeNull();
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("shared BloomCelebration presentation", () => {
        it("renders the celebration for a queued bloom event with the plant's name, tier, and bounty", () => {
            const props = baseProps({ bloomEvents: [bloomEvent()] });
            render(<GardenView {...props} />);

            const celebration = screen.getByRole("status");
            expect(celebration.textContent).toContain(PLANT_NAME);
            expect(celebration.textContent).toContain("Common bloom!");
            expect(celebration.textContent).toContain(`+${BLOOM_BOUNTY} Seeds`);
        });

        it("dismissing the celebration calls onDismissBloomEvent", () => {
            const props = baseProps({ bloomEvents: [bloomEvent()] });
            render(<GardenView {...props} />);

            fireEvent.click(screen.getByRole("button", { name: /Dismiss bloom celebration/i }));

            expect(props.onDismissBloomEvent).toHaveBeenCalledTimes(1);
        });

        it("presents queued blooms sequentially, one at a time, in order", () => {
            const first = bloomEvent({ id: "a", plantId: "plant-a", plantName: "Plant A", tier: "Common" });
            const second = bloomEvent({ id: "b", plantId: "plant-b", plantName: "Plant B", tier: "Rare" });
            const props = baseProps({ bloomEvents: [first, second] });
            const { rerender } = render(<GardenView {...props} />);

            expect(screen.getByRole("status").textContent).toContain("Plant A");
            expect(screen.getByRole("status").textContent).not.toContain("Plant B");

            // Simulate the parent popping the queue after dismissal/timeout.
            rerender(<GardenView {...baseProps({ bloomEvents: [second] })} />);
            expect(screen.getByRole("status").textContent).toContain("Plant B");
        });

        it("respects prefers-reduced-motion for the bloom celebration", () => {
            const matchMediaMock = vi.fn().mockReturnValue({
                matches: true,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            });
            vi.stubGlobal("matchMedia", matchMediaMock);
            try {
                const props = baseProps({ bloomEvents: [bloomEvent()] });
                render(<GardenView {...props} />);

                expect(screen.getByRole("status").className).toContain("ws-bloom-celebration--reduced");
            } finally {
                vi.unstubAllGlobals();
            }
        });

        it("a higher-intensity (Legendary) bloom shows a scrim, and the scrim never blocks other Garden interaction", () => {
            const props = baseProps({
                ownedPlants: [PLANT_ID],
                growthByPlant: { [PLANT_ID]: 25 }, // still waterable -- proves the scrim doesn't block it
                bloomEvents: [bloomEvent({ tier: "Legendary" })],
            });
            render(<GardenView {...props} />);

            // "exceptional" intensity (Legendary+) carries a scrim on both
            // platforms per REWARD_PRESENTATION -- confirm it renders...
            expect(document.querySelector(".ws-bloom-scrim")).not.toBeNull();

            // ...and that clicking a completely unrelated Garden control
            // while it's showing still works (non-blocking is a pointer-
            // events:none guarantee on the scrim, not just a visual choice).
            fireEvent.click(screen.getByText("Water Vessel"));
            expect(props.updateWateredTimestamp).toHaveBeenCalledTimes(1);
        });
    });

    describe("Conservatory Shelf (Part 4)", () => {
        it("shows one token per owned plant and grows with the collection", () => {
            const props = baseProps({
                ownedPlants: [PLANT_ID, "succulent-rosette"],
                growthByPlant: { [PLANT_ID]: 75, "succulent-rosette": 10 },
            });
            render(<GardenView {...props} />);

            const shelf = screen.getByTestId("conservatory-shelf");
            expect(shelf.textContent).toContain("2 plants");
            expect(shelf.querySelectorAll(".ws-conservatory-shelf__token")).toHaveLength(2);
        });

        it("renders nothing when the Garden is empty", () => {
            const props = baseProps({ ownedPlants: [], growthByPlant: {} });
            render(<GardenView {...props} />);

            expect(screen.queryByTestId("conservatory-shelf")).toBeNull();
        });
    });
});
