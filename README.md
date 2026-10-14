# FreshFold Laundry Company Ltd

A polished, mobile-first owner-review website and order-operations prototype for FreshFold in Kingston, Jamaica. The primary journey is **Book a Pickup**. Confirmed prices and operational rules are implemented; contradictions and missing decisions remain visible instead of being silently invented.

> **Review boundary:** this repository defaults to an explicitly labelled local demo. Bookings, contact forms, plan enquiries, uploads, payments, email and WhatsApp do not leave the browser. The Supabase schema and security plan are production foundations, not a claim that production integrations are live.

## What is built

- Original responsive “Clear Day” design system in light blue, white, deep ink and mint; no fake logo, people, ratings or testimonials.
- Accessible Motion for React interaction layer with route continuity, scroll reveals, animated mobile navigation, booking-step feedback and tactile CTA/card states; reduced-motion preferences are honoured.
- Public Home, Services & Pricing, Book, How It Works, Service Area & Schedule, Subscriptions, FAQ, Contact, draft Terms, draft Privacy, Account, Order Lookup and Design System routes.
- Five-step guest/account-intent booking flow with central JMD estimate rules, student verification state, Wednesday–Saturday date filtering, Saturday-evening restriction, itemised add-ons, consent and duplicate-submission protection.
- Browser-persisted owner-review records with a multi-tab customer order hub and staff workspaces for dispatch, chain of custody, requests/exceptions, finance, insights, order verification, notices, catalogue, customers, policies, audit and role-gated settings.
- Production route contracts for atomic booking, expiring hashed guest access, customer-safe lookup, price decisions, reschedule/support requests, shared rate limits, and private signed-upload intents that fail closed without scanning.
- Relational Supabase/PostgreSQL workflows for immutable history, integer-JMD money, versioned prices/policies, capacity locking, notification outbox, communications, dispatch, issues, commercial-account foundations and RLS.
- Tested notification and PII-denying analytics catalogues plus review/production runtime separation, launch-gated indexing, passwordless authentication scaffolds and server-only service credentials.
- Unit tests for pricing, provisional/quote behaviour, schedules, validation, runtime gates, atomic migration controls, notifications and analytics; Playwright journeys for responsive booking, admin operations, access disclosures and accessibility.

## Confirmed requirements, assumptions and implementation

| Area | Confirmed | Safe implementation |
|---|---|---|
| Market | Kingston; student and non-student | Kingston-focused content; location is operationally assessed |
| Main conversion | Book a Pickup | Persistent mobile CTA and progressive form |
| Load pricing | 6/9/12 lb prices supplied in JMD | Central integer-JMD catalogue; never floating point |
| Student rate | Current ID, manual verification | Estimate marked provisional; review queue and audit event |
| Handoff | Direct pickup; request not automatically confirmed | Confirmation language at every relevant state |
| Weight/inspection | Higher revised price needs approval | Original estimate remains immutable; adjustment/approval schema |
| Payment | Preference at booking; proof requires review | No card collection or gateway; proof never marks paid |
| Pickup days | Wednesday–Saturday; no Saturday evenings | Implemented in booking rules; live capacity remains production work |
| Subscriptions | Path required, benefits unresolved | Enquiry-only cards; checkout disabled |
| Policies | Versioned consent; complete text not approved | Clearly labelled v0.1 drafts; launch blocked |
| Contact values | Supplied as development seeds | Centralised and marked unverified; WhatsApp URL disabled |
| Runtime | No repository existed | Next.js 16.4 App Router, React 19.3, strict TypeScript, CSS tokens, Zod, Supabase migration |

## File/folder map

```text
src/app/                    Next.js routes, global design tokens and metadata
src/components/             Public UI, shared shell and admin review screens
src/context/demo-context.tsx Browser-local review repository and audit history
src/lib/                    Catalogue, pricing, availability, schemas, statuses, types
supabase/migrations/        Production relational schema, functions and RLS foundation
supabase/seed.sql           Safe draft settings/policy seed
e2e/                        Playwright critical journeys and Axe checks
docs/                       Security, deployment, admin and recovery runbooks
design-tokens.json          Canonical machine-readable design tokens
DESIGN.md                   Design rationale and component guidance
public/design-preview.html  Standalone visual reference
```

## Local setup

Requirements: Node.js 24+ and npm 11+.

```powershell
cd "C:\Users\cowar\OneDrive\Documents\FreshFold Laundry Company Limited"
npm install
npx playwright install chromium
npm run dev
```

Open `http://localhost:3000`. Useful review routes:

- `/book` — progressive booking and estimate
- `/orders` — masked guest lookup (sample references are shown on-page)
- `/admin/login` — admin/super-admin review environment
- `/design-system` — living design reference

To reset browser-local records, use **Admin → Settings**, switch to Super Admin and select **Reset local demo data**, or clear site storage.

## Environment and Supabase

Copy `.env.example` to `.env.local` and populate secrets only through local/host secret storage. Do not commit `.env.local`.

Production data enablement requires a separate hardening phase:

1. Create a Supabase project in the deployment region approved by the owner.
2. Apply `supabase/migrations/202610120001_initial_freshfold.sql` and then `supabase/migrations/202610140001_production_workflows.sql` to a disposable staging project first.
3. Create private `student-ids`, `payment-proofs` and `care-photos` buckets and implement storage policies matching `owns_order`/`is_staff`.
4. Run adversarial RLS tests with two customers, one Admin and one Super Admin.
5. Connect the remaining staff repository adapters; production admin deliberately fails closed instead of showing browser-local demo records.
6. Create the first Super Admin through a controlled out-of-band process and enable the approved MFA policy.

See [Security boundaries](docs/SECURITY-BOUNDARIES.md), [Deployment](docs/DEPLOYMENT.md), [Admin onboarding](docs/ADMIN-ONBOARDING.md) and [Backup/restore](docs/BACKUP-RECOVERY.md).

## Quality commands

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run verify
```

`npm run verify` covers lint, strict type checking, unit tests and production build. Playwright is separate because it launches a browser and development server.

### Verified results — 14 October 2026

- `npm run verify`: **PASS** — ESLint clean, strict TypeScript clean, 33/33 unit tests passed, and all 36 Next.js routes generated in the production build. (The build needs normal Windows filesystem access when the restricted sandbox cannot canonicalize the OneDrive path.)
- `npm run test:e2e`: **PASS** — 22 passed and 6 intentional project-specific skips. Coverage includes the complete 320px guest request, truthful JMD prices/quotes, admin payment-proof review, desktop/mobile Axe audits on six critical routes, 320px overflow checks, normal-motion mobile navigation, the reduced-motion override, and preview captures in `artifacts/`.
- `npm audit --omit=dev`: **0 production vulnerabilities**.
- Full `npm audit` reports five high-severity development-tool findings through `eslint-config-next → fast-glob → micromatch → braces`. The current registry has no non-breaking patched path for this Next.js 16.4 lint chain; do not apply npm’s suggested downgrade to Next 14. Track the upstream advisory and keep untrusted glob patterns out of build automation.

## Configured versus stubbed integrations

| Capability | Review state | Production requirement |
|---|---|---|
| Pricing and estimate engine | Implemented | Move active/versioned catalogue reads to Supabase |
| Local booking/order state | Implemented and labelled demo | Booking, lookup and guest actions have server contracts; apply migrations and populate approved production configuration |
| Supabase DB/Auth/RLS | Schema/workflow foundation and clients | Project credentials, staff adapters and adversarial policy tests |
| Sensitive uploads | No file retained in review mode | Signed intent API exists; create private buckets and add upload completion, magic-byte validation, scanner worker and retention |
| Email | Not connected; no false success | Approved provider, templates, delivery result handling |
| WhatsApp | Disabled | Confirm E.164 number; click-to-chat only unless an approved API is added |
| Payments | Preference and review workflow only | Approved invoice process; never store raw card data |
| Analytics | Provider disabled; tested safe-event catalogue | Consent/privacy approval and provider adapter |
| Error monitoring | Disabled | Redacted production integration and alert routing |

## Admin onboarding

Production staff should be invited individually—never through a shared login. Super Admin grants the minimum role, reviews the person’s training and records the grant. Admins may operate orders; only Super Admins manage roles, security settings, retention and destructive/anonymisation workflows. See `docs/ADMIN-ONBOARDING.md` for the day-one checklist.

## Launch-blocker checklist

Status values are deliberately honest: all remain `OPEN` until the owner records evidence and approval.

| # | Owner | Status | Decision / resolution evidence required |
|---:|---|---|---|
| 1 | Owner | OPEN | Confirm official phone, WhatsApp E.164/link, email, Instagram URL and contact hours. |
| 2 | Operations | OPEN | Confirm return/drop-off windows and Saturday-to-Monday handling. |
| 3 | Owner + legal | OPEN | Clarify whether cancellation cutoff is 12 hours before pickup or another rule. |
| 4 | Owner + legal | OPEN | Define basis and collection method for 25% arrival cancellation charge. |
| 5 | Owner + Jamaican counsel | OPEN | Reconcile J$100/day after five days with abandonment wording; approve any disposal policy. |
| 6 | Operations | OPEN | Confirm accepted and refused laundry items. |
| 7 | Owner | OPEN | Confirm excess-weight price and split/reclassification method for loads over 12 lb. |
| 8 | Owner | OPEN | Define every special-care amount as full price or surcharge and define its unit. |
| 9 | Owner | OPEN | Decide whether delicate wash is included, free or charged. |
| 10 | Owner + operations | OPEN | Decide whether Express launches; if yes, confirm loads, price, cutoff and turnaround. |
| 11 | Owner | OPEN | Confirm “Wash Only” versus wash/dry/fold naming. |
| 12 | Owner | OPEN | Define plan inclusions, eligibility, load counts/sizes, billing cycle, deposits, renewal, pause, cancellation, refund and rollover. |
| 13 | Owner + finance | OPEN | Confirm invoice timing and active launch payment methods. |
| 14 | Owner + Jamaican counsel | OPEN | Supply approved complete Terms and Privacy Notice. |
| 15 | Owner + privacy adviser | OPEN | Define data purpose, access matrix, retention duration and deletion/anonymisation rules. |
| 16 | Owner | OPEN | Supply final logo, favicon, approved photos and authorised testimonial/customer media. |
| 17 | Operations | OPEN | Define capacities, daily limits, staff users, escalation and promised WhatsApp response time. |

## Do not infer

Do not infer that contact channels are verified; a visible slot is confirmed; a preference can always be met; a target turnaround is guaranteed; transfer proof is payment; student evidence is approved; a J$0 quote item is free; Express is available; subscription figures are current offers; legal draft language is approved; data can be retained indefinitely; unattended pickup is permitted; an excess, cancellation, storage or delivery fee exists; or a WhatsApp/email message was sent.

## Owner-review readiness versus launch readiness

This repository is ready for owner review when all verification commands pass and critical browser journeys are demonstrated. It is **not ready for public production** until every launch blocker that affects published behaviour is resolved, production adapters and private storage are implemented, RLS is adversarially tested, the logo/contact/policy content is approved, and backup restore is rehearsed.
