# FreshFold product implementation ledger

Updated: 14 October 2026

This ledger converts the approved assessment into buildable work. It deliberately separates features that can run in the owner-review demo from features that require credentials, merchant onboarding, legal approval, verified business information, or real operational capacity.

## Status key

- `DONE` — implemented and covered by the repository verification suite.
- `IN PROGRESS` — part of the active productionization slice.
- `SCAFFOLDED` — contracts, UI, data model, and safe failure states exist; an external dependency is still required.
- `OWNER DECISION` — behavior must remain disabled, enquiry-only, or staff-confirmed until FreshFold approves the rule.
- `EXTERNAL` — needs credentials, a provider, device testing, merchant approval, or another system outside this repository.
- `LATER` — intentionally sequenced after the production core is stable.

## A. Production core

| Work item | Status | Completion evidence / remaining dependency |
|---|---|---|
| Explicit review and production runtime modes | DONE | Review is the safe default; production routes fail closed when required configuration is absent. |
| Server-side booking contract and validation | DONE | Canonical Zod validation, server-side price calculation, idempotency, secure guest token, and safe receipt are implemented. |
| Atomic database booking workflow | SCAFFOLDED | Migration reserves capacity and atomically creates the customer, address, order, estimate, consent, status, audit, and outbox records; staging application is external. |
| Repository/service boundary | DONE | Booking UI calls a route; the domain service accepts a repository and never imports persistence. |
| Supabase browser/server/service clients | DONE | Browser, cookie-aware server, and server-only service clients exist and fail closed; credentials remain external. |
| Customer authentication | SCAFFOLDED | Supabase project, approved redirect origins, and email provider configuration required. |
| Staff authentication and RBAC | SCAFFOLDED | Individual accounts, MFA policy, initial Super Admin, and adversarial RLS test required. |
| Secure guest access | SCAFFOLDED | Hash-at-rest token, expiry, generic lookup failure, customer-safe DTO, and authenticated guest actions exist; staging verification is external. |
| Shared rate limiting | SCAFFOLDED | Database-backed booking/lookup/action limits exist; hosting-edge/WAF control and staging load test remain external. |
| Real slot capacity and blackouts | SCAFFOLDED | Atomic reservation primitive exists; operations must enter real slots, capacities, and blackouts. |
| Private upload pipeline | SCAFFOLDED | Private buckets, object policies, scanner webhook, approved file limits, and retention rules required. |
| Notification outbox | SCAFFOLDED | Durable outbox schema and event catalogue exist; provider workers remain disabled until credentials and approved templates exist. |
| Monitoring and redacted structured logging | SCAFFOLDED | Routes log only safe event codes/request IDs; monitoring DSN and alert destinations are external. |
| Backups and restore rehearsal | EXTERNAL | Supabase plan/region and owner-approved retention required. |

## B. Booking and customer experience

| Work item | Status | Completion evidence / remaining dependency |
|---|---|---|
| Early Kingston serviceability check | DONE | Review flow validates Kingston intent without inventing restricted zones or fees. |
| Draft recovery | DONE | Non-file booking fields persist locally for 24 hours with restore and discard controls. |
| Named accessible progress | DONE | Current step, completed steps, labels, and total are exposed semantically. |
| Accessible error summary and focus | DONE | Summary links focus invalid controls; fields retain inline errors. |
| Loading, failure, retry, and duplicate states | DONE | Production failures stay visible, form data remains available, and idempotency protects retries. |
| Alternative slots | SCAFFOLDED | Requires live slot API; demo derives the next safe windows. |
| Collapsible mobile estimate | DONE | Estimate summary can collapse visually while remaining accessible. |
| Compact booking chrome | DONE | Booking uses compact footer chrome while retaining policy, help, and order access. |
| Add-to-calendar and save reference | DONE | Calendar file and print/copy tools explicitly describe a request, not a confirmation. |
| Customer-safe order hub | DONE | Review hub covers overview, care timeline, estimates, invoice, messages, and management actions; production safe DTO exists. |
| Price approval | SCAFFOLDED | Secure guest mutation and immutable decision record exist; real revised estimates require staff repositories. |
| Reschedule request | SCAFFOLDED | Secure request is queued and never moves capacity automatically; staging database application remains. |
| Cancellation request | OWNER DECISION | Disabled until cutoff, fee basis, collection method, and legal wording are approved. |
| Rebook from completed order | DONE | Review hub pre-fills only name, category, service, load, location label, and care preferences; address, schedule, payment, uploads, and consent are re-entered. |
| Saved care preferences | DONE | Review prefill keeps preferences as requests subject to labels, capacity, price, and staff approval. |
| Digital invoices and receipts | SCAFFOLDED | Demo document view is allowed; real numbering/tax fields require finance approval. |
| Issue/claim intake | SCAFFOLDED | Claim deadline, liability, evidence, and resolution authority require legal approval. |
| Installable PWA | LATER | Add only after production URLs, icons, caching boundaries, and notification strategy are approved. |

## C. Owner and staff operations

| Work item | Status | Completion evidence / remaining dependency |
|---|---|---|
| Action-oriented operations dashboard | DONE | Review workspace exposes attention, verification, payment, request, exception, and care queues. |
| Dispatch board and manifests | DONE | Responsive review board groups stops, load, route, driver, and printable minimum-data manifest. |
| Driver/staff mobile view | SCAFFOLDED | Device testing, location consent, and route process required. |
| Chain of custody | DONE | Review UI records append-only bag, weight, station, care, exception, package, and handoff events. |
| QR/barcode labels | SCAFFOLDED | Printable label structure first; hardware workflow later. |
| Exception and rewash queue | DONE | Review queue is usable; resolution outcomes remain blocked until claims policy is approved. |
| Capacity/workforce board | SCAFFOLDED | Availability controls and dispatch load indicators are demo-derived until real data exists. |
| Customer relationship view | DONE | Review view exposes minimum operational detail and masks contact data; marketing remains separate. |
| Finance and reconciliation | DONE | Review surface separates estimates, invoices, payment review, verification, credits, and refund scaffolds. |
| Business analytics | DONE | Demo metrics are labelled and a tested PII-denying production event allow-list exists. |
| Commercial account foundation | SCAFFOLDED | Organization/contact/invoice structure only; pricing and SLA are owner decisions. |

## D. Communication, payments, and uploads

| Work item | Status | Completion evidence / remaining dependency |
|---|---|---|
| Event-based notification catalogue | DONE | Tested request, verification, pickup, price, payment, care, return, completion, and exception catalogue with channel/opt-in rules. |
| Email adapter | SCAFFOLDED | Provider and approved sender domain required. |
| WhatsApp adapter | SCAFFOLDED | E.164 number, opt-in, Meta business onboarding, and approved templates required. |
| Hosted online checkout adapter | OWNER DECISION | Compare Lynk/WiPay onboarding, fees, settlement, refunds, support, and reconciliation. |
| Bank-transfer proof review | DONE | Demo action and production schema keep proof receipt in `PAYMENT_REVIEW`; no code auto-marks paid. |
| Sequential invoices/receipts | SCAFFOLDED | Finance/accountant approval required for production format and tax fields. |
| Refund and credit notes | SCAFFOLDED | Approval limits and accounting treatment required. |
| Secure upload intent API | SCAFFOLDED | Authenticated, MIME/size-limited, UUID-path signed intents fail closed without private storage and scanning; completion/scanner worker remains external. |

## E. Brand, SEO, accessibility, and quality

| Work item | Status | Completion evidence / remaining dependency |
|---|---|---|
| Clear Day design system | DONE | Tokens, components, motion vocabulary, preview, and design rationale exist. |
| Purposeful motion with reduced-motion support | DONE | Route, menu, reveal, card, and booking transitions use transform/opacity. |
| Approved logo, favicon, photography, and social artwork | OWNER DECISION | Temporary wordmark and illustration remain until approved assets exist. |
| Production metadata and canonical URLs | DONE | Metadata, robots and sitemap exist; indexing requires explicit production and launch flags. |
| Local service structured data | SCAFFOLDED | Publish only after contact, hours, domain, and identity are verified. |
| Search indexing and Search Console | EXTERNAL | Requires approved production domain and launch authorization. |
| Automated accessibility checks | DONE | Critical-route Axe, overflow, and reduced-motion checks exist. |
| Manual keyboard/screen-reader/zoom audit | EXTERNAL | Requires assistive-technology and real-device testing with recorded evidence. |
| Consent-safe product analytics | SCAFFOLDED | Tested event and metadata allow-list excludes customer identifiers; provider and consent manager remain disabled. |
| Performance and error monitoring | SCAFFOLDED | Production DSN/provider and redaction review required. |

## F. Owner-decision blockers

The following remain intentionally inactive or staff-confirmed: verified contacts and hours; final logo/media; return windows; Saturday-to-Monday handling; cancellation timing/charge; storage and abandonment; accepted/refused items; excess-weight pricing; special-care units; delicate pricing; Express; final service naming; subscription inclusions and terms; production payment methods; invoice timing and tax fields; final Terms and Privacy Notice; retention and rights handling; live capacity; staff identities and roles; escalation process; and promised response times.

## Definition of done for the active slice

1. Review mode remains fully demonstrable with labelled synthetic data.
2. Production mode does not silently use browser-local persistence.
3. Server entry points validate, authorize, return safe DTOs, and fail closed when configuration is incomplete.
4. The database migration supplies atomic workflow and shared-control primitives.
5. Customer and staff experiences expose useful states, actions, loading, empty, and failure paths.
6. Sensitive upload/payment behavior remains private and review-based.
7. Unit tests, type checking, lint, production build, and browser journeys pass.
8. This ledger and the operational docs match the implemented state.
