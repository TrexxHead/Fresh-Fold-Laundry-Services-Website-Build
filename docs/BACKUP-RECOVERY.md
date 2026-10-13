# Backup and recovery

## Proposed production policy

Use Supabase-managed daily backups and point-in-time recovery if the selected plan supports it. The owner must approve retention duration and data residency before production; this document does not choose those policies.

## Restore exercise

1. Announce the exercise and choose a backup that contains synthetic staging data only.
2. Restore to a new isolated project, never over the active project.
3. Apply any later compatible migrations and rotate all restored secrets.
4. Verify table counts, foreign keys, the latest order-status event, price/version snapshots, consent versions, invoice/payment relations and audit immutability.
5. Recreate private buckets and policies; verify Customer A cannot access Customer B objects.
6. Point a staging deployment at the restored project and run critical booking, admin, payment-review and guest-lookup tests.
7. Record date, operator, recovery point, recovery duration, discrepancies and corrective work. Delete the exercise environment through the approved project process.

## Incident recovery priorities

Protect customer data first, stop new writes if integrity is uncertain, preserve audit evidence, rotate compromised credentials, restore to a separate environment, validate access controls and only then resume booking. A deletion mistake must not be “fixed” by removing more history.
