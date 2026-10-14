import { describe, expect, it } from "vitest";
import { NOTIFICATION_CATALOGUE, NOTIFICATION_EVENTS, notificationDefinition } from "./notifications";

describe("notification catalogue", () => {
  it("defines every supported event with a customer-safe summary", () => {
    expect(Object.keys(NOTIFICATION_CATALOGUE)).toEqual([...NOTIFICATION_EVENTS]);
    for (const definition of Object.values(NOTIFICATION_CATALOGUE)) {
      expect(definition.templateKey).toMatch(/^[a-z0-9-]+$/);
      expect(definition.customerSummary.length).toBeGreaterThan(12);
    }
  });

  it("requires opt-in before approved WhatsApp templates can be queued", () => {
    expect(() => notificationDefinition("REQUEST_CONFIRMED", "WHATSAPP", false)).toThrow("opt-in");
    expect(notificationDefinition("REQUEST_CONFIRMED", "WHATSAPP", true).templateKey).toBe("request-confirmed");
  });

  it("does not allow payment-proof receipt to imply payment verification", () => {
    expect(NOTIFICATION_CATALOGUE.PAYMENT_PROOF_RECEIVED.customerSummary).toContain("not yet verified");
  });
});
