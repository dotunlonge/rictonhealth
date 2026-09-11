# Authoritative Gateway ↔ OpenAPI ↔ Client Diff (2026-09-05, backend repairs applied)

Source: `gateway/kong.yml` (16 prefixes), `openapi.yaml` (3.0.0, 36 paths after repair), `apps/web/src`, `apps/mobile/src`.
Contract tests: `tests/frontend-contracts.test.ts` (11/11 GREEN), `tests/p0-security-contracts.test.ts` (11/11 GREEN), `tests/openapi-coverage.test.ts` (6/6 GREEN).

## Resolved since audit

- Availability write: already correct in code (`POST /availability` → `setAvailability` upsert per `providerId_dayOfWeek`, role-scoped; `services/appointment/src/controllers/appointment.controller.ts:17`). Audit claim of read-stub was stale.
- Patient dashboard: DECIDED — parallel queries (`GET /appointments` + `GET /wallets/me`, as mobile Home already does). No BFF endpoint; avoids a new aggregation contract.
- OpenAPI 29→36 paths: added `PUT /api/users/me`, `GET/POST /api/messages/conversations`, `GET …/{id}`, `POST …/{id}/messages`, `PATCH …/{id}/read`, `GET /api/wallets/me`, `POST /virtual-account|/topup`, `GET /transactions`, `GET/POST /api/pharmacy/orders`, `GET /api/pharmacy/products`. Generated via `npm run build -w @ricton/shared` + `npm run docs:generate` (order matters: generator reads `dist`).

## Decisions (required)

| #   | Gateway canonical                                                          | Fix                                                                             |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------- | ------------ | --------------------------------------------------------------- |
| 1   | `/api/messages/...`                                                        | Web `inbox/page.tsx` `/messaging` → `/messages`; add OpenAPI paths              |
| 2   | `/api/wallets/me`, `/transactions`, `/topup`, `/virtual-account`           | Web `/wallet/*` → `/wallets/*`; fix `LOCAL_SERVICE_PORTS` fallback; add OpenAPI |
| 3   | `GET/POST /api/appointments`, `GET /slots/:providerId`, `PATCH /:id/status | cancel`                                                                         | Drop `/me` assumption (unused); add OpenAPI slot/cancel shapes |
| 4   | `/api/prescriptions` (+ `POST /api/pharmacy/prescriptions/fulfill`)        | Web `/pharmacy/prescriptions` → `/prescriptions`; add OpenAPI pharmacy fulfill  |
| 5   | `PUT /api/users/me` (no PATCH)                                             | Keep PUT; document; add OpenAPI PUT                                             |
| 6   | No `GET /dashboard/patient` (only hospital/provider)                       | Add BFF `GET /api/users/dashboard/patient` or aggregate via parallel queries    |
| 7   | Roles `PATIENT                                                             | CONSULTANT                                                                      | PHARMACIST                                                     | HOSPITAL_ADMIN | SUPER_ADMIN` | Remove bare `ADMIN`; fix `PHARMACY_ADMIN` filter → `PHARMACIST` |
| 8   | `POST /availability` currently calls read handler                          | Repair write before clinician scheduling; correct OpenAPI description           |

## Missing OpenAPI (add first)

`/api/messages*`, `/api/wallets*`, `/api/pharmacy*`, `PUT /users/me`, `/dashboard/patient`, rewards balance/catalog/redeem, notifications, subscription.
