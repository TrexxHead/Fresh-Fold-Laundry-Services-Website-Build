import { describe, expect, it } from "vitest";
import { createAnalyticsEvent } from "./analytics";

describe("consent-safe analytics events", () => {
  it("keeps operational dimensions and drops customer identifiers", () => {
    const event = createAnalyticsEvent("booking_request_submitted", {
      serviceType: "WASH_FOLD",
      outcome: "accepted",
      email: "customer@example.com",
      orderReference: "FF-SECRET",
      phone: "8765551234",
      note: "sensitive care instruction",
    }, "2026-10-14T12:00:00.000Z");
    expect(event.metadata).toEqual({ serviceType: "WASH_FOLD", outcome: "accepted" });
  });

  it("truncates unbounded labels and rejects nested values", () => {
    const event = createAnalyticsEvent("order_action_requested", { action: "x".repeat(200), status: { raw: "no" } });
    expect(event.metadata.action).toHaveLength(80);
    expect(event.metadata).not.toHaveProperty("status");
  });
});
