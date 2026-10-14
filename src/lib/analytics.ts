export const ANALYTICS_EVENTS = [
  "booking_started",
  "booking_step_completed",
  "booking_request_submitted",
  "order_hub_opened",
  "order_action_requested",
  "contact_intent_selected",
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[number];
export type AnalyticsValue = string | number | boolean;

const SAFE_METADATA_KEYS = new Set([
  "route", "step", "mode", "serviceType", "customerCategory", "outcome", "action", "status", "errorCode", "source",
]);
const PROHIBITED_KEY = /(name|email|phone|address|community|institution|student|reference|token|note|message|file|proof|payment)/i;

export interface SafeAnalyticsEvent {
  name: AnalyticsEventName;
  metadata: Record<string, AnalyticsValue>;
  occurredAt: string;
}

export function createAnalyticsEvent(
  name: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
  occurredAt = new Date().toISOString(),
): SafeAnalyticsEvent {
  const safe: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key) || PROHIBITED_KEY.test(key)) continue;
    if (typeof value === "string") safe[key] = value.slice(0, 80);
    else if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "boolean") safe[key] = value;
  }
  return { name, metadata: safe, occurredAt };
}
