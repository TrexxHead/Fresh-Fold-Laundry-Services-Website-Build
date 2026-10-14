export type RuntimeMode = "review" | "production";

type RuntimeEnvironment = Partial<Record<
  | "NEXT_PUBLIC_APP_MODE"
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "GUEST_LINK_SIGNING_SECRET"
  | "BOOKING_RATE_LIMIT_SECRET"
  | "UPLOAD_MALWARE_SCAN_WEBHOOK"
  | "EMAIL_PROVIDER_API_KEY"
  | "ERROR_MONITORING_DSN"
  | "ANALYTICS_ID",
  string | undefined
>>;

const PLACEHOLDER_PARTS = ["your-project", "replace-with", "example", "changeme"];

export function getRuntimeMode(environment: RuntimeEnvironment = process.env as RuntimeEnvironment): RuntimeMode {
  return environment.NEXT_PUBLIC_APP_MODE === "production" ? "production" : "review";
}

export function isConfigured(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  const normalized = value.toLowerCase();
  return !PLACEHOLDER_PARTS.some((part) => normalized.includes(part));
}

const PRODUCTION_BOOKING_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GUEST_LINK_SIGNING_SECRET",
] as const;

export interface ProductionReadiness {
  mode: RuntimeMode;
  ready: boolean;
  missing: string[];
  integrations: {
    email: boolean;
    monitoring: boolean;
    analytics: boolean;
    uploadScanning: boolean;
  };
}

export function productionReadiness(environment: RuntimeEnvironment = process.env as RuntimeEnvironment): ProductionReadiness {
  const mode = getRuntimeMode(environment);
  const missing = PRODUCTION_BOOKING_KEYS.filter((key) => !isConfigured(environment[key]));
  return {
    mode,
    ready: mode === "production" && missing.length === 0,
    missing: [...missing],
    integrations: {
      email: isConfigured(environment.EMAIL_PROVIDER_API_KEY),
      monitoring: isConfigured(environment.ERROR_MONITORING_DSN),
      analytics: isConfigured(environment.ANALYTICS_ID),
      uploadScanning: isConfigured(environment.UPLOAD_MALWARE_SCAN_WEBHOOK),
    },
  };
}

export function requireProductionReadiness(environment: RuntimeEnvironment = process.env as RuntimeEnvironment): ProductionReadiness {
  const readiness = productionReadiness(environment);
  if (!readiness.ready) {
    throw new Error(`Production services are unavailable. Missing configuration: ${readiness.missing.join(", ") || "production mode"}.`);
  }
  return readiness;
}

export const publicRuntime = {
  mode: getRuntimeMode(),
  isReview: getRuntimeMode() === "review",
} as const;
