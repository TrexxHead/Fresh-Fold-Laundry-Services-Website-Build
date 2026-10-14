import { describe, expect, it } from "vitest";
import { getRuntimeMode, productionReadiness } from "./runtime";

describe("runtime configuration", () => {
  it("defaults to the explicit owner-review experience", () => {
    expect(getRuntimeMode({})).toBe("review");
  });

  it("recognises production mode only when explicitly selected", () => {
    expect(getRuntimeMode({ NEXT_PUBLIC_APP_MODE: "production" })).toBe("production");
    expect(getRuntimeMode({ NEXT_PUBLIC_APP_MODE: "anything-else" })).toBe("review");
  });

  it("treats placeholder and incomplete production values as unavailable", () => {
    const readiness = productionReadiness({
      NEXT_PUBLIC_APP_MODE: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "replace-with-public-anon-key",
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(readiness.missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("reports a complete server booking configuration", () => {
    const readiness = productionReadiness({
      NEXT_PUBLIC_APP_MODE: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://freshfold.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-value",
      SUPABASE_SERVICE_ROLE_KEY: "service-test-value",
      GUEST_LINK_SIGNING_SECRET: "a-securely-managed-secret-value",
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);
  });
});
