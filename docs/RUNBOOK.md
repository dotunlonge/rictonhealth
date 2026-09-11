# Ricton Operations Runbook

## Alert thresholds (configure in Sentry + CloudWatch; SLOs in docs/SLOS.md)

| Alert           | Signal                                  | Threshold         | Response                                                                  |
| --------------- | --------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| Gateway5xx      | Kong/proxy 5xx rate                     | > 0.1% over 5 min | Check service health, recent deploy, DB pool                              |
| AuthFailures    | 401/403 spike on /api/auth              | > 3× 1h baseline  | Possible stuffing attack; inspect Kong rate-limit counters + WAF blocks   |
| WebhookLag      | BullMQ `webhook` depth                  | > 1000 jobs       | Scale workers; check notification provider status                         |
| RenewalFailures | `subscription-renewal-daily` job failed | any failure       | Inspect worker logs; Paystack status page; dunning covers users meanwhile |
| TokenReuse      | `TOKEN_REUSE_ATTACK` audit events       | any occurrence    | Treat as account-takeover signal; force logout-all for affected users     |
| DbPool          | RDS `DatabaseConnections`               | > 80% max         | Enable PgBouncer transaction pooling / scale readers                      |
| DiskQueue       | ElastiCache evictions                   | > 0 sustained     | Scale Redis node type; check runaway keys                                 |
| MigrationHook   | `*-migrate` Job failed                  | any failure       | Rollout halted by hook; inspect `kubectl logs job/<svc>-migrate`          |

## Incident playbooks

### Payment double-charge suspected

1. Freeze: no deploys; note time window.
2. Query `wallet_transactions` grouped by `referenceId` having count > 1.
3. The `@@unique(walletId, referenceId)` constraint prevents recurrence; refund
   via Paystack dashboard with the stored `providerReference`.
4. Post-mortem: attach BullMQ webhook job history.

### Suspected account takeover

1. Admin: revoke sessions (logout-all path bumps `tokenVersion`).
2. Confirm `TOKEN_REUSE_ATTACK` rows in `audit_logs` for scope.
3. Rotate `JWT_SECRET`/`REFRESH_SECRET` via secret manager + rolling restart.

### Database restore (PITR)

1. Identify target time; restore to a NEW instance from automated snapshot.
2. Point a staging deployment at the restored instance; verify migrations table
   matches the deployed release (`_prisma_migrations`).
3. Quarterly drill is mandatory — record results in the release checklist.

### Failed deploy

1. Helm pre-upgrade migration Job gates rollout; on Job failure nothing rolls.
2. `helm rollback <release> <revision>`; services are stateless — safe to roll.
3. `helm lint` + `npm run typecheck` + contract suites gate every merge (CI).
