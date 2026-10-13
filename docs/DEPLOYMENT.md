# Deployment runbook

## Staging first

1. Create separate Supabase staging and production projects; never test policies against live customer data.
2. Configure the hosting project with Node 24, `npm ci`, `npm run build` and `.env.example` values stored as encrypted environment secrets.
3. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS origin and restrict Supabase authentication redirects to approved origins.
4. Apply migrations to staging, seed only fictitious data, run unit/build/E2E and perform the RLS role matrix.
5. Review mobile (320px), tablet and desktop journeys, keyboard completion and screen-reader headings/errors.
6. Obtain owner sign-off on every public detail and legal sign-off on published policy versions.
7. Apply the reviewed migration to production, create the first Super Admin out of band and verify audit logging.
8. Run smoke tests with no real payment or sensitive upload; then enable booking through a feature flag.

## Required production gates

- HTTPS and secure cookies; restrictive headers/CSP tested against required integrations.
- Rate limits/bot protection on booking, contact, login and guest lookup.
- Private storage with signed URLs and malware-scanning failure handling.
- Email/WhatsApp wording tied to actual provider success only.
- Monitoring and alerts with sensitive-field redaction.
- Database backups/PITR and one successful restore exercise.
- Robots changed from review-wide `Disallow: /` only after launch approval.

## Rollback

Keep the previous host deployment and database migration compatible during rollout. If customer submission, RLS, slot locking or payment review fails, disable new bookings at the feature flag, retain existing data, post an approved service notice and roll the app deployment back. Never reverse a data migration by deleting customer, consent, invoice or audit records.
