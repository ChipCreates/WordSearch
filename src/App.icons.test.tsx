import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "./App";

describe("Icon System Migration", () => {
    it("renders App with zero material-symbols-outlined elements", () => {
        const { container } = render(<App />);
        const materialSymbolsElements = container.querySelectorAll(".material-symbols-outlined");
        expect(materialSymbolsElements.length).toBe(0);
    });
});
