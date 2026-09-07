import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BotanistPromotionCeremony from "./BotanistPromotionCeremony";
import { getBotanistPromotion } from "../botanistRanks";

describe("BotanistPromotionCeremony", () => {
    it("announces the rank change and advances on continue", () => {
        const onContinue = vi.fn();
        const promotion = getBotanistPromotion(3, 4);
        if (!promotion) throw new Error("test setup: expected a promotion");

        render(<BotanistPromotionCeremony promotion={promotion} avatarBackgroundPosition="0% 0%" onContinue={onContinue} />);

        expect(screen.getByRole("dialog").textContent).toContain("Moss Tender");
        expect(screen.getByLabelText("Promoted from Seedling Scout to Moss Tender")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Continue growing" }));
        expect(onContinue).toHaveBeenCalledOnce();
    });
});
