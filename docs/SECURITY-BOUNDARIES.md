# Security and privacy boundaries

## Trust zones

1. **Public browser:** may read only active public catalogue, published notices/policies and available slot metadata. All input is untrusted.
2. **Customer session:** may read customer-safe fields for records owned by the authenticated user. It cannot read internal notes, other customers, staff roles or audit events.
3. **Verified guest link:** production must hash the token at rest, expire it, rate-limit checks and return only one order's customer-safe projection.
4. **Admin:** may perform ordinary operations and sensitive reads required for those operations. Every sensitive read and write creates an audit event.
5. **Super admin:** additionally manages staff roles, security configuration and retention/destructive workflows. Re-authentication and explicit confirmation are required.
6. **Service role:** server-only secret. Never exposed through `NEXT_PUBLIC_*`, browser bundles or logs.

## Sensitive storage

Create separate private Supabase buckets for `student-ids`, `payment-proofs` and `care-photos`. Object paths must be random UUIDs, not customer names. Validate MIME signature and size server-side, quarantine until malware scanning succeeds, and use short-lived signed URLs. Normal order deletion must not delete consent, invoice, payment or audit history.

## Production work still required

- Configure Supabase Auth, redirect allow-list, password/MFA policy and recovery.
- Apply and test RLS in a disposable project with Customer A, Customer B, Admin and Super Admin fixtures.
- Put booking and guest lookup behind rate limits and bot protection.
- Implement CSRF protection if any mutation path relies on cookie authentication without the framework's action protections.
- Hash IP/user-agent data if approved; never log free text, addresses, student numbers or upload contents.
- Add the malware-scanning worker and fail closed on scan failures.
- Configure backups, point-in-time recovery and a quarterly restore exercise.
