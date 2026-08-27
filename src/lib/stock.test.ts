import { describe, expect, it } from "vitest";
import { validateTransferInput } from "./stock";

describe("CLEANWARE stock transfer validation", () => {
  it("accepts a positive whole-number movement between different locations", () => {
    expect(() => validateTransferInput(3, "Storage A", "Sales Floor")).not.toThrow();
  });

  it.each([0, -1, 1.5])("rejects invalid quantity %s", (quantity) => {
    expect(() => validateTransferInput(quantity, "Storage A", "Customer")).toThrow(/whole number greater than zero/i);
  });

  it("rejects transfers to the same location", () => {
    expect(() => validateTransferInput(1, "Sales Floor", "Sales Floor")).toThrow(/must be different/i);
  });
});
