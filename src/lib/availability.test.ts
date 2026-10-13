import { describe, expect, it } from "vitest";
import { isPickupDay, isSlotAllowed, slotsForDate } from "./availability";
describe("availability rules",()=>{
  it("allows Wednesday through Saturday",()=>{expect(isPickupDay("2026-10-14")).toBe(true);expect(isPickupDay("2026-10-17")).toBe(true);expect(isPickupDay("2026-10-18")).toBe(false)});
  it("removes Saturday evening windows",()=>{expect(slotsForDate("2026-10-17")).toHaveLength(5);expect(isSlotAllowed("2026-10-17","8:00–8:30 p.m.")).toBe(false)});
  it("allows a weekday evening window",()=>{expect(isSlotAllowed("2026-10-15","8:00–8:30 p.m.")).toBe(true)});
});
