# Ricton Service-Level Objectives

Staging smoke gates (enforced by `scripts/load-smoke.js`):

| Signal                            | Staging gate | Production target |
| --------------------------------- | ------------ | ----------------- |
| Anonymous endpoint p99 @ 20 conns | < 1500 ms    | < 500 ms          |
| 5xx responses during smoke        | 0            | 0                 |
| Errors during smoke               | 0            | 0                 |

## Production targets (to be validated before launch)

- Availability: 99.9% monthly per public path (gateway 5xx budget).
- Authenticated read p99: < 400 ms @ projected peak (see capacity plan).
- Booking write p99: < 800 ms (includes Serializable transaction + lock).
- Webhook processing lag p99: < 60 s (BullMQ depth alert at > 1000 jobs).
- Video: room join success ≥ 99% (excluding client network failures); token
  issuance p99 < 600 ms.
- RPO ≤ 5 min (PITR), RTO ≤ 30 min (documented restore drill quarterly).
- Data retention: audit logs 7 years (healthcare compliance), telemedicine
  metadata per consent, no media stored server-side.

## Capacity planning inputs (fill before launch)

- Peak RPS per route, concurrent authenticated sessions, concurrent video
  rooms, message fan-out, push fan-out, DB write rate, queue depth.
- Run `scripts/load-smoke.js` with `LOAD_CONNECTIONS`/`LOAD_DURATION_S`
  scaled to 3× projected peak; record results in the release checklist.
