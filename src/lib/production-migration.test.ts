import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/202610140001_production_workflows.sql"), "utf8");

describe("production workflow migration", () => {
  it("contains one atomic booking entry point with idempotency and capacity protection", () => {
    expect(migration).toContain("create or replace function public.create_booking_request");
    expect(migration).toContain("idempotency_key=p_idempotency_key");
    expect(migration).toContain("public.reserve_pickup_slot");
    expect(migration).toContain("raise exception 'PUBLISHED_TERMS_REQUIRED'");
  });

  it("creates durable workflow structures for communications and operations", () => {
    for (const table of [
      "notification_outbox",
      "order_communications",
      "order_change_requests",
      "customer_issues",
      "operation_events",
      "dispatch_runs",
      "dispatch_stops",
      "commercial_accounts",
    ]) expect(migration).toContain(`create table public.${table}`);
  });

  it("keeps public execution away from privileged workflow functions", () => {
    expect(migration).toContain("revoke all on function public.create_booking_request");
    expect(migration).toContain("revoke all on function public.create_guest_order_action");
    expect(migration).toContain("grant execute on function public.create_booking_request");
    expect(migration).toContain("to service_role");
  });

  it("authorizes guest mutations by hashed, expiring access and preserves staff review", () => {
    expect(migration).toContain("create or replace function public.create_guest_order_action");
    expect(migration).toContain("guest_token_hash=p_guest_token_hash");
    expect(migration).toContain("guest_token_expires_at>now()");
    expect(migration).toContain("The existing window remains until staff confirms a change.");
    expect(migration).not.toContain("payment_status='PAID'");
  });
});
