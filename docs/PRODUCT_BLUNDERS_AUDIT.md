# Ricton Product Gaps Audit — End-User Blunders

**Date:** 2026-09-29
**Scope:** Booking → Payment → Call join, Doctor fees, Appointment lifecycle, Telemedicine UX, Onboarding
**Verdict:** Great engineering, several product no-brainers missing. Payment is advisory-only, fees unsettable in UI, calls joinable unpaid.

---

## P0 — Must fix before launch (money / core promise)

### 1. Join call without paying

**Files:**

- `services/telemedicine/src/controllers/telemedicine.controller.ts:38-48` (`assertAppointmentJoinWindow`)
- `services/telemedicine/src/controllers/telemedicine.controller.ts:341-377` (`getRoomToken`), `479-503` (`joinRoom`), `255-287` (`createRoom`)
- `services/appointment/src/controllers/appointment.controller.ts:496-506,533-547`
- `apps/web/src/app/appointments/page.tsx:1015-1029` (Join), `1068-1079` (Pay separate)
- `apps/mobile/app/(app)/(tabs)/appointments.tsx:79-81,231-252`

**Current:** Join gate checks only membership + time window (15 min early / 30 min late). `PENDING` + unpaid passes. Room auto-created at booking time. Web/mobile render `Join Call` for `PENDING||CONFIRMED` regardless of `paymentStatus`.
**Expected:** `getRoomToken` / `joinRoom` require `appointment.status IN (CONFIRMED, IN_PROGRESS)` AND `payment.status == SUCCESS` OR explicit `isFree / waived with reason`. Else `402 Payment Required`. UI gates Join button on `isPaid && CONFIRMED`, else shows Pay / Awaiting confirmation.
**Fix:** Add payment check to telemedicine controller + frontend button conditions.

### 2. Confirm ignores payment (free-care path)

**Files:**

- `services/appointment/src/controllers/appointment.controller.ts:671-676,725-726` — comment: `Payment stays advisory (cash/offline flows exist) — confirmation never blocks on it.`
- `services/appointment/src/controllers/appointment.controller.ts:757-828` (`updateAppointmentStatus`, `ALLOWED_TRANSITIONS PENDING → CONFIRMED/CANCELLED`)
- `services/appointment/src/routes/appointment.routes.ts:65-70`
- `apps/web/src/app/appointments/page.tsx:495-497`

**Current:** Doctor taps Confirm on `PENDING` with zero payment. Patient cannot self-confirm (correct), but staff confirm is the bypass.
**Expected:** `PENDING → CONFIRMED` requires `payment SUCCESS` OR `consultationFee == 0/null → free` OR staff `waive + reason`.
**Fix:** Check payment in `updateAppointmentStatus`; add `waivedReason` field.

### 3. Payment SUCCESS never confirms, FAILED never blocks, cancel never refunds

**Files:**

- `services/payment/src/controllers/payment.controller.ts:236-346` (`verifyPayment`), `348-480` (`paystackWebhook charge.success/failed`)
- `services/appointment/src/controllers/appointment.controller.ts:882-970` (`cancelAppointment`, ends room `930-935`)
- `packages/db/prisma/schema.prisma:443-448` (`REFUNDED` exists, zero `refund` code)

**Current:** Webhook/verify update `payment.status` only, never touch `appointment.status`. Cancelling paid visit forfeits money.
**Expected:** `SUCCESS` → auto-confirm / mark eligible; `FAILED` → block join; clinic-cancel → auto-refund/credit.
**Fix:** Add `POST /payments/:id/refund` + hook cancel → refund/void; make verify+webhook idempotent upserts flipping appointment.

### 4. Stuck PENDING payment blocks retry forever

**Files:** `services/payment/src/controllers/payment.controller.ts:61-69,85-93`, `179-221` (Paystack called before DB row)

**Current:** Throws if existing `SUCCESS||PENDING`. No TTL/cron/sweeper. Abandoned checkout = never re-init. Dangling init possible (Paystack charge with no local row → `404 Payment not found` on verify).
**Expected:** Expire `PENDING` after ~30 min (sweeper → `FAILED/ABANDONED`, unlink `paymentId`); create pending row before provider init.
**Fix:** Sweeper cron + reorder init; reconcile by `reference`.

### 5. Doctor cannot set fee in UI (backend-only)

**Files:**

- `packages/db/prisma/schema.prisma:141-153` (`ProviderProfile.consultationFee Decimal?`)
- `services/user/src/routes/user.routes.ts:33` (`PUT /users/me`)
- `packages/shared/src/schemas/user.schema.ts:87` (`consultationFee: z.number().optional()`)
- `services/user/src/controllers/user.controller.ts:269-290`
- `apps/web/src/app/onboarding/doctor/page.tsx:73-103,183-198` (no fee field, false comment `186-187`)
- `apps/web/src/app/settings/page.tsx:174-179,98-110,320-472` (names + bank only)
- `apps/mobile/app/(app)/account/profile.tsx:13-43`, `apps/mobile/app/(app)/(tabs)/account.tsx:11-64` (patient-only)
- `apps/mobile/app/(app)/booking/index.tsx:11-48`, `apps/mobile/app/(app)/booking/[providerId].tsx:31-249` (no fee display, books blind)
- Display-only: `apps/web/src/app/providers/[id]/page.tsx:190`, `apps/web/src/app/appointments/page.tsx:74,249,427-428`, `apps/mobile/app/(app)/(tabs)/appointments.tsx:23-24,196-200`

**Current:** Fee settable via API, unsettable in any UI. Onboarding drops it. New doctors get `NULL` fee.
**Expected:** Fee step in onboarding (₦, NGN, `>0`), Settings editor for consultants, fee shown in discover/detail/booking on web+mobile.
**Fix:** Add `consultationFee` input + validation, persist via existing `PUT /users/me`.

### 6. Fee validation missing / fails late

**Files:**

- `packages/shared/src/schemas/user.schema.ts:87,49`
- `services/user/src/controllers/user.controller.ts:270-289`
- `services/payment/src/controllers/payment.controller.ts:51-73` (`if (!consultationFee) throw 'not configured'`, `0` falsy → same as `NULL`)
- `services/payment/src/controllers/payment.controller.ts:169-170` (`Math.round(NaN*100)` possible)

**Current:** Allows `0, -100, NaN, 1e12`, string `"15000"` uncoerced despite `Decimal(10,2)`. Only fails after booking at pay-time.
**Expected:** `z.coerce.number().int().min(500).max(500000)` (adjust band), reject `0/negative`, assert NGN.
**Fix:** Tighten zod schema + server range check.

### 7. No fee snapshot — price can change between book and pay

**Files:**

- `packages/db/prisma/schema.prisma:141-163` (no `currency` on profile), `237-270` (no `amount/feeSnapshot` on appointment)
- `services/payment/src/controllers/payment.controller.ts:51-73` (always re-reads live profile)

**Current:** No audit, no freeze at booking.
**Expected:** Snapshot `amount` onto `Appointment` (or `Payment.metadata`) at booking; `initializePayment` reconciles against snapshot.
**Fix:** Add `feeSnapshot` column, write at `createAppointment`.

### 8. Real registration creates NULL-fee doctors, seeds hide it

**Files:**

- `services/auth/src/controllers/auth.controller.ts:325-333` (no fee, default `General Practice`, `isVerified: ENV!=='production'`)
- `packages/db/src/seed-doctors-helper.ts:31,46,61...` (`18000-30000`), `packages/db/prisma/seed.ts:71` (`15000.0`)
- `services/user/src/controllers/user.controller.ts:499-560` (auto-seed if `<3` / `total===0`)

**Current:** Directory always looks priced in dev, broken in prod.
**Expected:** Stop auto-seed in production; surface "fee missing" in admin; require fee at verification.
**Fix:** Gate seeds to dev-only, admin missing-fee filter.

---

## P0 — Booking UX goofs

### 9. Schedule shows date only, no time

**Files:** `apps/web/src/app/appointments/page.tsx:233-239,362,415` (`toLocaleDateString` drops time)
**Fix:** Render date + time with `Africa/Lagos` tz.

### 10. Past slots offered, then rejected

**Files:** `services/appointment/src/controllers/appointment.controller.ts:250-269` (no `slotStart > now` filter) vs `306-310` (400s on past)
**Fix:** Filter `slotStart > now + buffer` server-side.

### 11. Everything UTC, Lagos books wrong day

**Files:** `services/appointment/src/controllers/appointment.controller.ts:135,320,390`, `packages/shared/src/schemas/appointment.schema.ts:113,117`, `apps/mobile/app/(app)/booking/[providerId].tsx:57-60`
**Fix:** Accept `timezone` param, evaluate day/window in it, return tz-labelled slots.

### 12. No duration cap — one booking squats whole day

**Files:** `packages/shared/src/schemas/appointment.schema.ts:77` (`positive`, no max), `appointment.controller.ts:383,402`
**Fix:** Cap duration or force `= availability.slotDurationMinutes`.

### 13. Self-booking allowed

**Files:** `services/appointment/src/controllers/appointment.controller.ts:277-302` (no `providerId !== userId` check)
**Fix:** Reject when provider equals caller.

### 14. IN_PERSON often has no venue

**Files:** `appointment.controller.ts:411-429`, schema `:37` (`hospitalId` optional), `apps/web/src/app/appointments/page.tsx:1030-1047,1041-1045`
**Fix:** Require hospital/venue for `IN_PERSON` at booking.

---

## P1 — Lifecycle / trust gaps

### 15. Past visits never auto-close

**Files:** `packages/shared/src/jobs/reminders.ts:35-56` (only reminders), `updateAppointmentStatus:783-795` (manual)
**Fix:** Hourly sweep → `NO_SHOW` / `COMPLETED`.

### 16. Doctor never joins → patient waits forever

**Files:** `apps/mobile/app/(app)/telemedicine/[roomId].tsx:239-242`, `services/telemedicine/src/controllers/telemedicine.controller.ts` (no timer)
**Fix:** Join-timeout → auto `NO_SHOW` + notify + refund path.

### 17. Late-cancel free, no reason

**Files:** `services/appointment/src/controllers/appointment.controller.ts:882-927,821`
**Fix:** Require reason + cutoff (2–4h) with late-cancel flag/refund hook.

### 18. Reschedule kills 24h reminder

**Files:** `appointment.controller.ts:1104-1107`, `reminders.ts:42`
**Fix:** Set `reminderSentAt = null` on reschedule.

### 19. Video has no duration cap

**Files:** `services/telemedicine/src/controllers/telemedicine.controller.ts:391-394` (1h token), `apps/web/src/app/telemedicine/[id]/page.tsx:255-265`
**Fix:** Enforce max consult + auto-end with warning.

### 20. No reviews submission

**Files:** `apps/web/src/app/providers/page.tsx:158`, `providers/[id]/page.tsx:156`, `dashboard/page.tsx:753-779`; zero write routes in `services/`
**Fix:** `POST /reviews` gated on `COMPLETED` (one per visit).

### 21. Status tabs hide states

**Files:** `apps/web/src/app/appointments/page.tsx:81,904,457-464` (only ALL/CONFIRMED/PENDING/CANCELLED)
**Fix:** Add COMPLETED / NO_SHOW / IN_PROGRESS tabs.

### 22. Admin locked out of cancel

**Files:** `services/appointment/src/routes/appointment.routes.ts:73-77` vs `65-70`
**Fix:** Add `HOSPITAL_ADMIN, SUPER_ADMIN` to cancel route.

### 23. License verification theatrical

**Files:** `apps/web/src/app/onboarding/doctor/page.tsx:611,627` (`onClick → true`, never sent), `services/admin/src/controllers/admin.controller.ts:336-360` (`documents:[]`), `user.controller.ts:270-278` (drops `yearsExperience,bio,documents`)
**Fix:** Real S3 upload, persist `documents[]`, `isVerified=false` in all envs, gate bookability on verified.

### 24. Specialty / currency / bank / availability nits

- Specialty free-text mismatch: `onboarding/doctor/page.tsx:401-409` vs `providers/page.tsx:74-80` → single canonical enum.
- Currency ad-hoc: `₦` hardcoded, `toFee()` drops `0` → shared `formatNGN()` (`en-NG`), distinguish `null (Contact provider)` vs `0 (invalid)`. `providers/page.tsx:126-201` grid shows no fee; `api-contract-mappers.ts:77-79` drops fee in summary.
- Bank half-wired: flat fields vs `{bankDetails:{...}}`, no NUBAN server check, no payout worker reads `bankDetails`. Validate NUBAN + `bankCode`, verify via Paystack `resolveAccount`.
- Availability silent default: `auth.controller.ts:335-349` provisions 7×9-5, onboarding has no step → add explicit step.
- Mobile parity: 7-day wall (`booking/[providerId].tsx:17-29`) vs web picker; no in-call chat on mobile vs web ephemeral chat (`telemedicine/[id]/page.tsx:609-670`) → shared horizon + persisted visit chat.
- Dev bypass: `telemedicine.controller.ts:58-66` warn-only window in dev/unset → ensure staging enforces.

---

## PART 2 — Deep adversarial audit (2026-09-29 stern pass)

### FIN — Money integrity (new, beyond #1–#8)

- **25. No commission/split, providers never paid [P0]:** `ProviderEarning` model exists (`schema.prisma:661-676`) but zero writes, zero `commission|split` in `services/`. All Naira sits in platform balance. Fix: cut % + create earning on `charge.success` + payout worker + Paystack transfers.
- **26. Double wallet credit race [P0]:** `payment.controller.ts:291-298,301-334,389-418` non-atomic check-then-increment; safe `creditWalletAtomic` in `wallet.controller.ts:82-156` unused. Plus cross-service double-spend: `wallet.controller.ts:709-735` + `payment.controller.ts:301` both credit same `WALLET_TOPUP` ref → ₦10k becomes ₦20k. Fix: single atomic credit path, `updateMany{status:PENDING}` + `count===1` guard.
- **27. Initialize has no idempotency, Paystack-before-DB [P0]:** `payment.routes.ts:25-26,58` no `idempotency()` (cf `appointment.routes.ts:54`); naked PENDING pre-check `payment.controller.ts:61-93`; `179-221` inits Paystack before DB → orphan paid URL → `404` on verify after money moved. Fix: idempotency key, PENDING row first, reconcile by reference.
- **28. State machine goes backwards, REFUNDED dead [P0]:** `verify` allows `SUCCESS→FAILED`; `charge.failed` flips paid → FAILED without reversing credit; replayed `charge.success` resurrects `FAILED/REFUNDED` → SUCCESS + re-credit. Zero `refund` code. Fix: allowed transitions only, persist `event.id` dedup, handle refund/dispute events.
- **29. Webhook money math trusts floats/email [P1]:** `wallet.controller.ts:685,711,754` `amount/100` float → kobo drift; `743-758` refunds provider-echoed amount; `684,710` locates user by mutable email; `692-700` silent 200 on missing wallet → money vanishes. Fix: reconcile stored row, `Math.round`, lookup by reference, 200-ack-and-alert.
- **30. Withdraw predictable + pay-to-typo [P1]:** `wallet.controller.ts:498` `WALLET_WITHDRAW_${userId}_${Date.now()}`, no idempotency (`wallet.routes.ts:113`), recipient per-withdraw `name:'Ricton wallet holder'`, `bank/resolve` best-effort never blocks. No max/daily cap, no step-up. `transfer.success` no-op → reversal race pays twice. Fix: uuid ref, idempotency, gate on resolved `account_name` + confirm, limits, reconciler.
- **31. Client-controlled amounts, duplicate price [P1]:** `payment.controller.ts:150-152` email from body not JWT; `WALLET_TOPUP` any `Number(amount)` no max; `5000` hardcoded in two places (`payment.controller.ts:95-96`, `subscription.controller.ts:24-25`); future types accept `0/negative/NaN` → `Math.round(NaN*100)` to Paystack. Fix: allow-list per type, `z.coerce.number().int().min.max`, single price const, email from JWT.
- **32. Subscription double-activate + phantom sub [P1]:** `subscription.controller.ts:146-161` read-only txn + init + second txn → two PENDING → two ACTIVE; webhook `421-443` creates ACTIVE without verifying Payment row/ownership. Fix: unique `(userId+billingPeriod)`, webhook must find PENDING payment + user match, drop `else create`.
- **33. Display-vs-charged mismatch [P2]:** live fee re-read vs rendered fee, wallet `Math.floor` vs `Math.round`, `subscription.controller.ts:65` advertises 10% pharmacy discount with zero pricing path (`pharmacy.controller.ts:386-387` flat). Fix: snapshot, `formatNGN`, remove/implement discount.
- **34. Webhook operability [P2]:** unknown ref throws non-2xx → retry storm (`payment.controller.ts:370-372,442-444`); no `event.id` table; rateLimit after webhook route (`payment.routes.ts:25-26` vs `:23`). Fix: 200-ack-and-log, dedup table, throttle.

### SEC — Auth / RBAC / privacy (new)

- **35. Reset does not revoke refresh [CRITICAL]:** `auth.controller.ts:1291-1365` bumps `tokenVersion` but never revokes `refreshToken` rows; `refresh 849-935` never checks version. Stolen refresh lives 7–30d after reset. Fix: revoke all refresh on reset (like `changePassword 1665-1683` does).
- **36. Prescription OTP bypassed non-prod [HIGH]:** `prescription.controller.ts:165-194` signs anyway if `NODE_ENV !== production`. Fix: require OTP everywhere.
- **37. Appointment getById fallthrough [HIGH]:** `appointment.controller.ts:698-751` authorizes PATIENT/CONSULTANT/HOSPITAL_ADMIN only — PHARMACIST + any role falls through → full PII + prescriptions. Fix: default-deny.
- **38. Pharmacy getOrderById fallthrough [HIGH]:** `pharmacy.controller.ts:616-622` only PATIENT/PHARMACIST checked — doctors/admins read any order + address. Fix: default-deny + ownership.
- **39. Unverified doctors can do everything except sign [HIGH]:** `prescription.controller.ts:14-60` no `isVerified` on create; no gate on confirm/room/pay. Combined with auto-verify dev (`auth.controller.ts:325-333,1486-1500`). Fix: gate create/confirm/room/earn on `isVerified`.
- **40. Messaging force-add + PII harvest [HIGH]:** `messaging.routes.ts:17-26` auth-only; `messaging.controller.ts:373-406` arbitrary `participantIds`, returns email/phone/profiles. Fix: relationship check + consent + minimal fields.
- **41. PENDING tokens usable everywhere except booking [MED-HIGH]:** `requireActiveStatus` only on `POST /appointments` + admin. Payment/telemedicine/prescription/wallet/messaging ungated. Fix: apply ACTIVE gate broadly.
- **42. Refresh theft-tolerant [MED]:** device mismatch only risk-scores (`957-982`); expired refresh honored +24h (`937-955`). Fix: reject on mismatch, drop grace.
- **43. Stale JWT role 15m [MED]:** `requireRole` trusts token role, no DB recheck. Demotion lags. Fix: recheck role or short exp + revocation on role change.
- **44. Enumeration oracles [MED]:** 409 on register (`299-302`), 404 vs 200 on OTP (`1377-1383`), 404/403 split on IDs. Fix: generic messages.
- **45. OTP spam cannon [MED]:** `sendOtp 488-539` no existence check, per-IP throttle only. Fix: per-recipient throttle + existence check + CAPTCHA.
- **46. 2FA enroll w/o step-up, no limit [MED]:** `enable2FA 1539-1565` persists + returns plaintext secret on session alone; `2fa/*` no rateLimit. Fix: password + code-before-persist + throttle.
- **47. PII over-collection + audit PII [MED]:** rooms/participants/appointments/prescriptions return full counterparty profiles + history to single-booking doctors; audit logs email/phone. Fix: minimum-necessary fields + retention/redaction.
- **48. License mutation w/o re-verify [MED]:** `PUT /users/me` swaps license stays verified. Fix: `isVerified=false` + requeue on credential change.

### CLIN — Clinical safety / data integrity (new)

- **49. Prescription with no encounter [P0]:** `prescription.controller.ts:38-60` any status/age suffices, even CANCELLED/ancient. Fix: require `CONFIRMED/IN_PROGRESS/COMPLETED` + recent window.
- **50. Dosage free-text, no allergy check [P0]:** `dosage: z.string().min(1)`, `quantity: positive` only; `allergies` never read. Fix: structured dose + max + controlled-substance block + allergy cross-check.
- **51. OTP non-atomic consume [P0]:** `get+del` not Lua, concurrent signs reuse OTP. Fix: Lua compare-del + single-use.
- **52. Last-writer-wins status, no audit [P0]:** `updateAppointmentStatus 817-828`, `cancel 916-927` bare update, zero `auditLog`. Fix: `where:{status}` guard + version + audit row.
- **53. Zero care audit trail [P0]:** no audit on complete/sign/send/dispense (cf auth/admin do). Fix: audit every care transition.
- **54. Doctor blind in video [P0]:** `telemedicine/[id]/page.tsx:1-845` never fetches allergies/history though `getPatientById` exists. Fix: side panel with allergies/history/meds.
- **55. No emergency path [P0]:** `emergencyContact` stored never read; no SOS/location/escalation. Fix: emergency card + SOP + location link.
- **56. No visit consent [P0]:** only registration consent; no `telemedicineConsentAt`. Fix: per-visit consent checkbox + timestamp.
- **57. Ephemeral chat, no transcript [P0]:** LiveKit `publishData` in-memory, "live session only". Fix: persist via messaging service + export.
- **58. Delete wipes evidence [P0]:** `deletedAt` dead, cascades wipe notifications/chat; Appointment FKs lack `onDelete`. Fix: soft-delete + legal hold + explicit FK policy.
- **59. Reminders IN_APP+email only [P1]:** `reminders.ts:82-93` no SMS/push; `notifications.ts:71-92` no push despite `PushToken`. Fix: honor channel prefs incl. push.
- **60. Failures warn-and-drop [P1]:** `catch{warn}`, BullMQ 3 tries then drop, IN_APP fail skips retry, NO_SHOW never notifies. Fix: DLQ + resend UI + notify all terminal states.
- **61. Reschedule/cancel/sign lack idempotency [P1]:** only `POST /` has it; double-tap duplicates nudges/SMS/sign race. Fix: idempotency on all mutating routes + atomic `updateMany` guards.
- **62. Hospital split-brain [P1]:** `ProviderProfile.hospitalId` never written, `User.hospitalId` diverges; anyone-admin invents hospital from free text. Fix: single link + ownership check + verification.
- **63. Zero buffer / grid desync / no lead [P1]:** `==` allowed back-to-back, any duration, start-only grid check, book 40s ahead. Fix: buffer + force slot duration + lead time + overrun guard.
- **64. Overnight spill check gap [P1]:** create checks same UTC day only vs availability scanning prev day. Fix: overlap query on interval, not day.
- **65. Open DM + PHI pull [P2]:** any-to-any messaging, full profile per message. Fix: appointment-gated threads + block/report.
- **66. Times labelled UTC [P2]:** SMS/email `(UTC)` (`notifications.ts:20-26`, `reminders.ts:17-23,72`). Fix: WAT label + tz.

### UX — Broken flows / parity (new)

- **67. Mobile pay ref in RAM only [P0]:** `appointments.tsx:63,95-96,202-229`, `wallet/topup.tsx:17,31-32` — back/app-switch loses ref → paid-shows-unpaid. Fix: persist ref + poll on focus + deep-link return.
- **68. Mobile no Paystack WebView [P0]:** `openURL` handoff, manual "I have paid". Web has `/payments/verify` polling. Fix: `expo-web-browser` session + verify screen parity.
- **69. Mobile join falls back to bad id [P0]:** `telemedicineRoom?.id || appointment.id` → 404; web falls back to list. Fix: hide Join when no room, explain.
- **70. Web video no auth gate [P0]:** `telemedicine/[id]/page.tsx:147-170` shows crypto error not login. Fix: redirect to `/login?next=`.
- **71. Mobile cancel one-tap no reason [P0]:** `appointments.tsx:253-266` vs web prompt. Fix: confirm sheet + reason.
- **72. Mobile email-only login [P0]:** `mobile/(auth)/index.tsx:121,134-138` vs web email-or-phone. Fix: parity.
- **73. Mobile register drops fields [P0]:** no lastName/phone/role/consent (`register.tsx:21-34`). Fix: parity + role selection.
- **74. Web OTP no resend [P0]:** `verify-otp/page.tsx:42-82` dead-end; mobile has resend. Fix: resend + timer + digit-strip.
- **75. Hero CTAs drop context [P1]:** `providers/page.tsx:190-198`, `providers/[id]/page.tsx:131-148` → bare routes. Fix: pass `providerId+scheduledAt`.
- **76. Reschedule ignores type change [P1]:** modal editable but PATCH only `{scheduledAt}` (`appointments/page.tsx:1155-1165,351-353`). Fix: lock or send type.
- **77. Search hammers API, specialty dead [P1]:** per-keystroke `load(text)` (`booking/index.tsx:90-98`), `specialty` never sent. Fix: debounce + cancel + send specialty.
- **78. Slot error = empty [P1]:** fetch fail → "No slots" (`providers/[id]/page.tsx:248-253`); mobile stale list no spinner. Fix: distinct error state + retry.
- **79. Mobile Rx 3-item stub [P1]:** `prescriptions.tsx:74-100` cap, no detail, `signedAt` vs `status` skew. Fix: list + `[id]` parity.
- **80. No receipt/invoice [P1]:** verify text-only, wallet rows no detail. Fix: receipt screen + print + link to appointment.
- **81. Mobile list flat, limit ignored [P1]:** no tabs/search, `limit=50 hasMore` ignored, one pill style. Fix: tabs + search + pagination.
- **82. Chat no empty/sender/retry dup [P1]:** blank list, identical bubbles, fresh key per retry → dup. Fix: empty state + mine/theirs + stable key.
- **83. Inbox can't start on mobile [P1]:** list-only vs web New Message modal. Fix: parity.
- **84. Verify polls blind 30s [P1]:** `payments/verify/page.tsx:19-20,56-66`, kobo ambiguity. Fix: cancel/back hint + `formatNGN`.
- **85. Top-up accepts junk, no max/confirm [P1]:** `wallet/topup.tsx:21`, `checkout.tsx:29-33`. Fix: max + confirm screen.
- **86. Images/pagination/validation/a11y/tz/noise [P2]:** broken avatar no fallback, `charAt(4)` bug, no pagination anywhere, onboarding ships Cardiology/12yrs/LUTH defaults + unvalidated numbers/past license, keyboard divs, title-only buttons, time-only/tz-less renders in 6 spots, `console.warn/error` in UI, admin zeros-on-fail. Files: `providers/page.tsx:135-143,155-160`, `providers/[id]/page.tsx:43,110-116,154-158`, `booking/index.tsx:61-63,122-124`, `appointments.tsx:55`, `wallet/index.tsx:49`, `onboarding/doctor/page.tsx:73-103,416-423,449-454,494-501,610-638`, `inbox/page.tsx:68-70,233-279,392-464`, `telemedicine/[id]/page.tsx:447-449,692-826`, `telemedicine/page.tsx:81-87`, `notifications/page.tsx:54,185-199`, `tabs/index.tsx:157-160`, `prescriptions/page.tsx:368`, `admin/page.tsx:42-58,220-226`, `messages/[conversationId].tsx:86-94`, `ui.tsx:21,111-120`, `booking/[providerId].tsx:39`. Fix: fallbacks, pagination, real validation, roles/labels, tz labels, silent admin fail.

---

## Suggested fix order

1. Gate join + Join button on `CONFIRMED && paid||free-waived` (#1, #2).
2. Fee onboarding + Settings editor + validation + snapshot (#5, #6, #7).
3. Expire pendings, auto-confirm on SUCCESS, refund on cancel (#3, #4).
4. Date+time, past-slot filter, tz, duration cap, venue required (#9–#14).
5. Sweeps, timeouts, reminders, reviews, tabs, admin cancel (#15–#24).
6. Money integrity: split/payouts, atomic credit, idempotency, state machine, webhook math, withdraw, amounts, subs (#25–#34).
7. Security: reset-revoke, OTP, fallthroughs, unverified gates, messaging, PENDING, enumeration, 2FA (#35–#48).
8. Clinical: encounter-gate Rx, dosage/allergy, consent, emergency, blind-video, chat persist, audit, hospital link (#49–#66).
9. UX parity: mobile pay/verify/join/cancel/auth, CTAs, search, Rx, receipts, lists, chat (#67–#86).
10. Infra/secrets/deploy/observability/video/mobile-build/tests (#87–#111).
11. Compliance/pharmacy/fraud/legal/continuity/access (#P1–#V1 below).
12. Contract/gateway/model-drift/versioning (#A1–#F2 below).

---

## PART 3 — Infra / compliance / contract (2026-09-29 third stern pass)

### INFRA / SECRETS / DEPLOY / OBSERVABILITY

- **87. Real secrets on disk [WONTFIX — accepted risk per owner 2026-09-29]:** `.env` / `.env.production` intentionally kept on disk for local dev. Ignored by decision — do not flag again. Mitigation only: ensure gitignored, don't commit, restrict sharing.
- **88. Compose boots on known-default passwords [HIGH]:** `docker-compose.yml:13,32,59,86-88` (`ricton-secure-pg-prod-2026`, `dev-secret`). Fix: `:?` fail-closed like prod compose.
- **89. Kong Admin on 0.0.0.0 [CRITICAL]:** `docker-compose.yml:58,62-64`, `docker-compose.prod.yml:49` publishes 8001/8444 no auth. Fix: 127.0.0.1 only / disable in prod.
- **90. .gitignore fence + missing mobile ignores [MED]:** `.gitignore:1-23`. Fix: remove fence, add eas/jks/p8/mobileprovision, CI `check-ignore`.
- **91. Helm SET_VIA_DEPLOY fail-open [HIGH]:** `values-prod.yaml:57-77`, `secrets.yaml:10-12`. Fix: sentinel fail or mandatory existingSecret.
- **92. Kong JWT on 3/17 services [HIGH]:** `gateway/kong.yml:41-46,78-83,108-117`; payment/wallet/Rx/pharmacy/notify/messaging/subs/admin open at edge. Fix: default-deny edge JWT.
- **93. Webhook/callback no edge throttle [HIGH]:** `payment.routes.ts:23-26`, `kong.yml:11-17`, `telemedicine.routes.ts:15`. Fix: per-route 10-20/min + 200-ack-and-queue.
- **94. WAF optional, cap 2000/5min [MED-HIGH]:** `infra/terraform/waf.tf:39-48,59-63`. Fix: always attach, login/webhook rules, BotControl.
- **95. One Redis for everything [HIGH]:** `kong.yml:24-31`, `redis.tf:21-40`. Fix: separate DB/index, `fault_tolerant:false` globally.
- **96. Prod auto-seeds fake doctors [CRITICAL]:** `services/user/src/index.ts:86-88`, `user.controller.ts:499-501,543-560`, `seed-doctors-helper.ts:221-239` (no prod guard). Fix: dev-only seeding.
- **97. Destructive drift migration, no backup gate [HIGH]:** `20260905000004_catch_up_schema_drift/migration.sql:1-3` DROPs table in CI (`deploy-aws-ecr.yml:330`). Fix: snapshot-before-migrate + expand-contract.
- **98. seed.ts deleteMany with env guard only [HIGH]:** `seed.ts:8-20`. Fix: `ALLOW_DESTRUCTIVE_SEED=yes` + refuse on rds URL.
- **99. Migration job deletes evidence, 2 retries [MED]:** `migration-job.yaml:11-14`. Fix: keep failed, deadline 300s, CloudWatch logs.
- **100. Prod compose no Postgres, migrate races RDS [HIGH]:** `docker-compose.prod.yml:63-73`. Fix: pg_isready wait, PgBouncer, right-size RDS.
- **101. Liveness==Readiness==/health, admin always 200 [HIGH]:** `values.yaml:117-129`, `admin/src/index.ts:38-39`. Fix: split live/ready, check DB/redis.
- **102. No trace IDs, 15/17 w/o dd-trace [HIGH]:** `logger.ts:1-40`. Fix: genReqId + Kong + BullMQ traceId + APM all.
- **103. Sentry wired but dead [HIGH]:** `resilience.ts:17`, `.env.production:75`, `docker-compose.prod.yml:343`. Fix: DSN all services, sample 0.1 prod.
- **104. Zero metrics/alarms-as-code [HIGH]:** no `aws_cloudwatch_metric_alarm`, no `/metrics`. SLOS/RUNBOOK unmeasured. Fix: Terraform alarms + SNS/PagerDuty + /metrics.
- **105. RPO≤5min claimed, 7-day backups [MED-HIGH]:** `rds.tf:50-55`. Fix: PITR + cross-region + quarterly restore drill + Glacier 7y audit.
- **106. LiveKit 1h token, EU hairpin, no TURN [HIGH]:** `telemedicine.controller.ts:391-394`, `.env:50-52`, `networkpolicy.yaml:45-49`. Fix: 15m + refresh, TURN/UDP, audio-only fallback, fail-closed callback URL.
- **107. No EAS/OTA/force-update, wrong root app.json [HIGH]:** `app.json:1-5`, `apps/mobile/app.json:1-55`. Fix: eas.json + runtimeVersion + OTA + version gate; delete root stub.
- **108. Secure-store backup resurrects sessions [MED-HIGH]:** `apps/mobile/app.json:35-41` `configureAndroidBackup:true`. Fix: false + ThisDeviceOnly.
- **109. Root Jest ignores apps/, E2E skips money+video [HIGH]:** `jest.config.js:7`, `ci.yml:86-108`. Fix: include mobile units, add payment/wallet/telemedicine to E2E, coverage thresholds.
- **110. Deploy migrates w/o snapshot/smoke [HIGH]:** `deploy-aws-ecr.yml:323-332`, `load-smoke.js` unused, `tag:latest` drift. Fix: snapshot + /health/ready + smoke gate, pin sha.
- **111. CI jobs don't block, deploy skips E2E [MED-HIGH]:** `ci.yml:10-121`, `deploy-aws-ecr.yml:11-52`. Fix: single required checks job, ECR needs E2E.

### COMPLIANCE / PHARMACY / FRAUD / LEGAL / CONTINUITY

- **P1. No expiry/batch [HIGH]:** `schema.prisma:847-867`, `pharmacy.controller.ts:153-191,238-286`, `pharmacy.schema.ts:6-18`. Expired drugs sellable. Fix: expiry+batch required, FEFO, recall/quarantine.
- **P2. No NAFDAC reg / counterfeit path [HIGH]:** zero `nafdacRegNo|quarantine|recall` hits. Fix: reg no + verify flag + report/quarantine.
- **P3. No controlled-substance schedule [CRITICAL]:** only `requiresPrescription` boolean. Tramadol bulk orderable. Fix: schedule + qty cap + ID + specialist rule.
- **P4. Delivery address free JSON [HIGH]:** `pharmacy.schema.ts:36,61`, `pharmacy.controller.ts:461-462,871`. Fix: call address validator + ownership + phone.
- **P5. dispensePrescription no stock move [HIGH]:** `pharmacy.controller.ts:307-354` vs `490-506,849-862`. Fix: single atomic dispense+decrement.
- **P6. Unverified pharmacist sells [HIGH]:** `pharmacy.controller.ts:153-159,238-254,665-671` role-only. Fix: ACTIVE + isVerified gate.
- **F1. Fake hospital self-provision [CRITICAL]:** `user.controller.ts:353-374` creates hospital + self-ACTIVE, no CAC/approval. Fix: quarantine + SUPER_ADMIN approve + CAC check.
- **F2. Self-referral, no referral model [MED]:** zero Referral/FollowUp/CarePlan. Fix: referral with consent + audit.
- **F3. Phantom premium (family/10%/unlimited) [MED]:** `subscription.controller.ts:59-68` unenforced. Fix: enforce or remove claims.
- **F4. Phone-only bricked on DVA [MED]:** `wallet.controller.ts:588-599,684-688`. Fix: DVA for phone users, lookup by reference not email.
- **L1. Consent theater [HIGH]:** single version, hardcoded '1.0', OAuth no consent, no /privacy|/terms. Fix: ConsentHistory + versioned re-consent + screens.
- **L2. No age gate [HIGH]:** no DOB/age check, future DOB accepted, no guardian. Fix: 18+ or parental consent flow.
- **L3. No erasure vs no retention [HIGH]:** `deletedAt` dead, no DELETE/me, no 7-10yr hold. Fix: erasure queue + anonymize + legal-hold for Rx.
- **L4. Rx lacks prescriber snapshot [MED]:** no license/signature hash. Fix: snapshot license+hash at sign.
- **C1. No leave/OOO/holiday [HIGH]:** no Leave table, booking ignores it, `Hospital.isActive` unchecked. Fix: leave + closures + delegate + banner.
- **C2. No follow-up/referral/chronic recall [HIGH]:** no parentAppointmentId/followUpAt. Fix: follow-up + referral-out + recall lists.
- **C3. No support/dispute, suspend doesn't kill [MED]:** mailto only, no tickets/refund queue, suspend leaves rooms/wallet live. Fix: in-app help + dispute queue + suspend kills sessions/rooms/payouts.
- **A1. English-only, smartphone-only [HIGH]:** zero locale/i18n/USSD. Fix: Yoruba/Hausa/Igbo + USSD/SMS fallback + low-literacy mode.
- **V1. Phone/NUBAN unvalidated [MED]:** all `z.string()`, typo passes, resolve best-effort. Fix: E.164 + NUBAN regex server-side, block on resolve mismatch.

### API CONTRACT / GATEWAY / MODEL DRIFT

- **A1. Edge JWT 3/16 (dup of #92, contract angle) [HIGH]:** `kong.yml` — fix default-deny.
- **A2. Zero timeout/retry/body-limit [MED]:** Kong defaults → 504-then-double-charge (no idempotency). Fix: per-route timeouts + size policy matching 5MB messaging limit.
- **A3. Messaging port env drift [MED]:** `MESSAGING_PORT` vs `PORT_MESSAGING`. Fix: single convention + fail-fast.
- **B1. Token method docs GET vs code POST [HIGH]:** `API_CONTRACT.md:870-875` vs `telemedicine.routes.ts:28-29` + openapi POST. Fix: correct doc, test codegen.
- **B2. deliveryType HOME_DELIVERY doesn't exist [HIGH]:** contract vs `pharmacy.schema.ts:37` + `DeliveryType{PICKUP,DELIVERY}` + conflicting defaults (`:461` vs `:870`). Fix: single enum + single default.
- **B3. reason vs cancellationReason [MED]:** cancel vs status + openapi vs doc disagree. Fix: one field, fix doc.
- **B4. Mapping docs rot [MED]:** `ENDPOINT_MAPPING_AUDIT.md` singular wallet, wrong notification paths, `ROUTE_OPENAPI_DIFF.md` 36 vs 95 paths. Fix: generate or delete, CI diff check.
- **C1. status/cancelledBy/role z.string theater [MED]:** `appointment.schema.ts:14,19`, `user.schema.ts:10-11`. Fix: enums everywhere.
- **C2. PaymentResponse.status free string [MED]:** `openapi.yaml:1435-1436` vs `PaymentStatus{PENDING,SUCCESS,FAILED,REFUNDED}`; earnings status untyped. Fix: enums + earnings schema.
- **C3. Decimal three-way split + overflow [HIGH]:** `Decimal(10,2)` vs `(12,2)`, `Number()` drift, zod number vs Prisma string `"15000.00"` → 400 after GET, mapper `numberValue(x,0)` masks null → ₦0 vs Contact, `totalRevenue:1250000000` doesn't fit column. Fix: string decimals end-to-end + `formatNGN` + migrate width.
- **C4. Required-yet-nullable breaks codegen [MED]:** openapi required+nullable vs zod nullable.optional vs `stringValue` collapsing ""→undefined. Fix: optional+nullable only, preserve "" vs undefined.
- **C5. Mapper reads missing columns [HIGH]:** `api-contract-mappers.ts:91,105` `billingPeriod/paymentUrl` vs `Subscription{plan:FREE|PREMIUM}` no such cols → blank interval + dead checkout. Fix: map real fields.
- **D1. Earning no unique(appointmentId) [HIGH]:** replay inserts second row. Fix: unique constraint.
- **D2. Subscription zero indexes [HIGH]:** scan on userId/status. Fix: indexes.
- **D3. Missing composite indexes [HIGH p95]:** no `(status,scheduledAt)`, `(userId,status)`, `Prescription(appointmentId)`, `(providerId,status)` rooms. Fix: add.
- **D4. WalletTx unique(walletId,referenceId) nullable bypass [HIGH]:** NULL refs dedupe nothing in PG. Fix: NOT NULL + default uuid.
- **D5. Redundant index + Unsupported tstzrange [LOW]:** lint schema; interval query instead of arithmetic.
- **E1. Appointment list 5-way include, uncapped limit [HIGH]:** `appointment.controller.ts:649-680`, `limit` no max → `?limit=100000` × 5 joins; count/findMany race. Fix: max 50 + cursor + snapshot.
- **E2. Room list take 200 + 4-way include + OR-some [HIGH]:** `telemedicine.controller.ts:203-248`, skip drift. Fix: max 20 + select cap + cursor + index.
- **F1. No versioning/force-update/generated client [HIGH]:** unversioned `/api/*`, no min-version, hand-rolled fetch. Fix: `/v1` or version header + min-supported endpoint + checked-in codegen.
- **F2. Success envelope + codes incomplete [MED]:** 2xx unchecked (`api-client.ts` doFetch), health-shaped bodies crash callers; 402/429/500 undocumented. Fix: enforce envelope type-guard + document all codes.

---

## PART 4 — Missing interfaces & flows (2026-09-29 deep audit)

Web: 41 pages (`apps/web/src/app/**/page.tsx`). Mobile: 33 screens, patient-only (`PatientTabsLayout`). Backend: 17 services, all Kong-wired.

### ORPHAN BACKEND — built, zero UI caller

- **112. Auth orphans:** `POST /auth/otp/verify`, `POST /auth/verify-phone`, `POST /auth/2fa/setup`, `GET /auth/sessions` + `DELETE /auth/sessions/:id`. Settings promises session management (`settings/page.tsx:646`) but only `logout-all`. Fix: wire or delete; build sessions list/revoke.
- **113. Appointment/prescription orphans:** `GET /appointments/:id` (both list+PATCH, never GET-single); `PATCH /prescriptions/:id/dispense` (real flow uses `POST /pharmacy/prescriptions/fulfill`). Fix: detail page; delete dead dispense or wire pharmacist UI.
- **114. Pharmacy orphans:** `GET /pharmacy/categories`, `PATCH /pharmacy/orders/:id/status`. Dashboard read-only (`dashboard/pharmacy/page.tsx:37-38`). Fix: wire actions or delete.
- **115. Payment/notify orphans:** `GET /payments`, `GET /payments/:id`, `GET /notifications/unread-count` (client-side count instead), `GET /notifications/:id`, `POST /notifications/test`, `DELETE /notifications/push-token/:token` (defined mobile, never called). Fix: payment history/admin list; use unread-count; test sender; unregister on logout.
- **116. Rewards/address/admin orphans:** `GET /rewards/earnings|/redemptions|/tiers` (tier hardcoded `rewards/page.tsx:103`); `POST /addresses/validate` (web has no addresses UI at all); `GET /admin/users/:id`, `POST /admin/users/:id/verify`, `GET /admin/analytics` (dead dup of analytics-service). Fix: wire or delete + fix docs.
- **117. Smartguard 100% orphan:** all 7 endpoints (`status|alerts|metrics|threats|audit-log|acknowledge|mitigate`) — zero UI/nav/GATEWAY_PATHS. Fix: security dashboard or delete service.
- **118. Telemedicine/messaging partial orphans:** `GET /rooms/:id/participants` (LiveKit SDK used instead); `threads` aliases (UI uses `conversations` only). One-platform gaps: `POST /wallets/virtual-account` mobile-only, `POST /wallets/withdraw` web-only, `PUT /me/medical-history` mobile-only, `GET /subscriptions/history` web-only, `PATCH messages read` mobile-only (web unread never clears). Fix: parity or delete aliases.

### MISSING FLOWS — journey dies here

- **119. Pharmacy order→pay link missing [P0]:** `pharmacy/page.tsx:55-74`, `mobile checkout.tsx:29-55` POST order only, never `/payments/initialize` (`PHARMACY_ORDER` exists, unused). Unpaid orders to pharmacist. Fix: checkout → initialize → verify.
- **120. Web pharmacy no checkout [P1]:** one-tap `{items}` only, no deliveryType/address/notes/Rx vs mobile `checkout.tsx:18-55`. "Home delivery" unfulfillable on web. Fix: checkout screen parity.
- **121. Web order history dead text [P1]:** `pharmacy/page.tsx:252-281` divs, no detail/track/cancel/pay/reorder vs mobile `orders/[orderId].tsx`. Fix: order detail parity.
- **122. Rx SENT_TO_PHARMACY dead-end [P0]:** `prescriptions/page.tsx:418-446` no link to pharmacy/order/track after send. Fix: CTA → order → track.
- **123. Pharmacist dashboard read-only [P1]:** `dashboard/pharmacy/page.tsx:133-164` divs, no status/fulfill/inventory actions. Fix: wire existing endpoints here.
- **124. No pharmacist verify queue [P0]:** `admin/providers` doctors-only. Pharmacist waits forever. Fix: queue + approve/reject.
- **125. No verification wait-state [P2]:** onboarding → `/dashboard` unconditionally (`onboarding/doctor/page.tsx:202`). Fix: pending screen + banner + next-steps.
- **126. Mobile non-patient lockout [P0]:** `UnsupportedMobileRoleError`, hardcoded patient account. Doctor/pharmacist/admin zero mobile. Fix: role tabs or explicit roadmap.
- **127. Hospital can't manage staff [P1]:** `dashboard/hospital/page.tsx:191-198,580-611` read-only + hardcoded hours. Fix: invite/remove/assign + real hours.
- **128. Availability write-only [P2]:** `dashboard/availability/page.tsx:28-48` POST only, never lists. Fix: list/edit/delete.
- **129. Notification deep-links wrong [P2]:** `notification-targets.ts:18-32` PHARMACY→`/prescriptions`, billing→`/wallet`, unknown→disabled (`notifications/page.tsx:170-177`). Fix: correct targets + fallback.
- **130. Sessions card fake [P2]:** `settings/page.tsx:641-681` hardcoded macOS/Chrome. Fix: real list/revoke or fix copy.
- **131. Mobile 2FA no disable [P2]:** `security.tsx:128-163` enable-only vs web disable. Fix: parity.
- **132. Web no medical-history UI [P2]:** settings tabs profile|payouts|security only; mobile-only editor. Fix: parity.
- **133. Family profiles absent [P1]:** landing `page.tsx:614` promises, zero model/UI. Fix: dependents or remove claim.
- **134. Insurance/HMO absent [P2]:** landing `page.tsx:846` promises, zero code. Fix: remove claim or scope integration.
- **135. Refill/reorder absent [P1]:** "refills" copy, no endpoint/button. Fix: refill from DISPENSED + reorder delivered.
- **136. No offline handling [P2]:** NetInfo only in test mocks. Fix: banner + queue + retry.
- **137. Web order no confirm/idempotency [P1]:** `pharmacy/page.tsx:55-74` direct POST (mobile has key `checkout.tsx:14-16`). Fix: confirm + key + timeout guard.
- **138. Verify page approve-only [P1]:** `admin/providers/page.tsx:32-41,121-129` Verify-only, no reject/suspend+reason. Fix: reject/suspend + audit.

Journeys: A dies at order→pay + Rx→order; B dies at wait/availability/mobile/earnings; C dies at verify queue + dashboard; D dies at staff add/verify + revenue; E dies at pharmacist queue + reject + disputes.

---

## PART 5 — Rewards revamp, ugly sidebar, pharmacy ownership, hospital onboarding (2026-09-29)

### UGLY SIDEBAR PAGE — subscription, not rewards

- **139. `subscription/page.tsx` is the legacy outlier [P1]:** own `<aside w-40 bg-[#1877F2] fixed>` with emoji 🩺/🏠/⚙️/💎/💳 (`118-142`), 4 links only, `main ml-40 bg-gradient-to-br [#DAE8FE→#EEF4FD]` + HEX_BG SVG (`12,145`), `text-4xl` hero (`149`). Zero `SidebarLayout` hits. Every other page (dashboard/wallet/appointments/pharmacy/telemedicine/inbox/rewards) uses `SidebarLayout` navy `w-64` + `var(--ricton-surface-muted)`. Fix: delete custom sidebar/gradient, render via `SidebarLayout` + primitives.
- **140. Rewards is stale not ugly [P1]:** `rewards/page.tsx` uses SidebarLayout correctly but hardcodes `Tier 1 Member Balance` (`103`) while backend returns `{balance,tier,nextTierPoints}` (`rewards.controller.ts:72-79`, `TIER_THRESHOLDS BRONZE/SILVER/GOLD/PLATINUM :12-37`); hardcodes `text-[#1877F2]`, `from-[#0A192F] to-[#1E3A8A]`, `text-[11px]` (auto-promotes to 12px per `globals.css:76-80`); empty state is steady-state prod (`144-148`). Token debt repo-wide: only SidebarLayout+primitives use `var(--ricton-*)`. Fix: tokens `bg-[var(--ricton-action)]`, `rounded-[var(--ricton-radius-xl)]`, real tier badge + progress.

### REWARDS ECONOMY — complete backend, zero earn path

- **141. No earn trigger anywhere [P0]:** `POST /rewards/internal/earn` secret-gated exists + idempotent `(userId,source,referenceId)` + tier multiplier (`rewards.controller.ts:415-438`), but zero producers (`grep rewards services/appointments|pharmacy|payments` = ∅). COMPLETED appointment / DELIVERED order fire nothing. Fix: earn on `COMPLETED` (+50), `PHARMACY_ORDER` (+1/₦100), `REFERRAL` (+200), `SIGNUP` (+100) via internal secret.
- **142. Catalog empty in prod [P0]:** `getCatalog` filters `isActive, stock>0` (`:329`); only seed is E2E single row (`seed-mobile-e2e.ts:251-266`); `seed.ts` zero rows. Users see 0 pts + empty grid. Frontend wires 3/6 endpoints (balance/catalog/claim) never tiers/earnings/redemptions. Mobile same (`premium/rewards.tsx:30-32,49-52`). Fix: admin seed ~8 rows + wire tabs Store|Earnings|Redemptions|Tiers + How-to-earn strip + tierRequired lock + stock count.

### PHARMACY — fillable by ANY self-registered PHARMACIST day one

- **143. Ownership = role-string theater [CRITICAL]:** `POST /products` allows any `PHARMACIST` incl PENDING/unverified (`pharmacy.routes.ts:227,305`, `pharmacy.controller.ts:153-191` role-only, never status/isVerified; `requireActiveStatus` never used on pharmacy routes). Public catalog unauthenticated (`:42,64,77,89`). `Product.pharmacyId → User.id`, no hospitalId. Fix: gate create/fulfill/status on ACTIVE + `pharmacyProfile.isVerified`.
- **144. Onboarding persists ~10%, PCN upload theater [HIGH]:** `onboarding/pharmacy/page.tsx:203-220` PUTs only `{pharmacyName,bank trio}`; backend upserts only `pharmacyName` (`user.controller.ts:291-306`); drops registration/address/hours/superintendent/services; `pcnLicenseUploaded` div onClick (`:613`) no file/S3. `pharmacyType` selector (`:377-384`) never sent. Fix: persist all + S3 presign (reuse avatar pattern) + `isVerified=false` quarantine.
- **145. Dual fulfill vs dispense — one must die [HIGH]:** `POST /pharmacy/prescriptions/fulfill` (order+stock+SENT→DISPENSED atomic, UI-wired `prescriptions/page.tsx:204-211`) vs `PATCH /prescriptions/:id/dispense` (flip only, no order/stock, zero UI callers). Using dispense first blocks fulfill forever. Fix: delete `dispense`, keep `fulfill`.
- **146. Order lifecycle curl-only [HIGH]:** `PATCH /orders/:id/status` (forward-only table) + patient cancel (`PLACED`-only) exist, zero UI (dashboard read-only `:133-164`, history read-only). Orders stuck PLACED. Pharmacist cancel needs no reason. Fix: wire Confirm/Prepare/Ready/Deliver/Cancel+reason + patient cancel button.
- **147. Payment never gated + delivery string-only [HIGH]:** orders DELIVER without `payment SUCCESS` check; `deliveryType` defaults conflict (DELIVERY `:461` vs PICKUP `:870`); no courier/address validation/proof; `READY→DELIVERED` skips OUT_FOR_DELIVERY. Earnings sums DELIVERED regardless of pay. Fix: gate DELIVER on pay + single default + address schema + proof.
- **148. Visibility incoherence [MED]:** `getOrderById :582-628` lets CONSULTANT/HOSPITAL_ADMIN/any fallthrough read any order; `getOrders` 403s them. Fix: default-deny + consistent scope.
- **149. HOSPITAL_ADMIN locked out, SUPER_ADMIN dead code [MED]:** hospital dispensary impossible except rogue PHARMACIST; `requireRole('PHARMACIST')` blocks before controller SUPER_ADMIN bypass (`:249-254,302-307`). Fix: hospital-linked pharmacist or `hospitalId` on Product/Order; open route or delete branch.

### HOSPITAL — no public funnel, self-activate fiction

- **150. Entry paradox — nobody can self-onboard [HIGH]:** register picker PATIENT|CONSULTANT|PHARMACIST only (`register/page.tsx:72`, `auth.controller.ts:158-160,287-291` 403 on HOSPITAL_ADMIN, oauth same). Only path `provisionUser` SUPER_ADMIN-only (`admin.controller.ts:153-228`). Dead code `verify-otp/page.tsx:69-70` routes HOSPITAL_ADMIN→onboarding that can never happen. `/onboarding/hospital` reachable only by provisioned admin with null hospitalId (`role-home.ts:49-50`). Fix: `POST /hospitals/apply` PENDING path or document provision-only.
- **151. Creates row lossy + instant-active, no verify [CRITICAL]:** `onboarding/hospital/page.tsx:219-257` → `PUT /users/me` → `user.controller.ts:307-375` creates hospital + `onboardingComplete=true` + PENDING→ACTIVE auto-flip (`:350,364,371`). No `isVerified` column exists. No `GET /pending`, no verify endpoint, admin list shows ACTIVE from birth, detail can't verify (`admin/hospitals/[id]` name/email/phone/address only), no auditLog. Fix: `isVerified=false,isActive=false` + `GET /admin/hospitals/pending` + verify/reject + audit.
- **152. 60%+ fields dropped/theater [HIGH]:** `Hospital` has only name/address/phone/email/logo/regNo/documents/onboarding/departments/isActive — no tier/ownership/capacity/director/bank/CAC cols. facilityTier/ownership/beds/ICU/theatres/ambulances dropped; director 4 fields validated but never sent; website dropped; cacNumber clobbers registrationNumber; bank → admin personal `User.bankDetails` (sell hospital → money moves); address shape fork `{street}` vs `{line1}` → admin blank (`admin/hospitals/page.tsx:206`); Step7 docs div onClick theater; Steps7-8 no validation. Fix: extend schema + S3 docs + separate cacNumber + hospital wallet + unify address.
- **153. After onboard everything is zeros/theater [HIGH]:** stats scoped by hospitalId but FKs never set → zeros + fallback global analytics leak (`dashboard/hospital:174-181`); Doctors Schedule = global directory + seeded fakes; no add/invite (provision schema HOSPITAL_ADMIN-only, doctor has no hospital selector); revenue = admin personal `GET /wallets/me` zero; Patient chart hardcoded `(i*13+30)%110` (`:315-347`); Complete-Profile reads wrong model; table no confirm/cancel actions. Fix: staffing endpoints (`POST/DELETE /hospitals/doctors`, scoped search `?hospitalId=`), facility revenue scope, remove fakes/fallbacks.
- **154. Hospital pharmacy + patient scope dead [MED]:** `Product/Order.pharmacyId → User` no hospitalId — hospital can't own stock; `getPatients` filters `User.hospitalId` never set → always zero; `getPatientById` 403 guaranteed. Fix: `hospitalId` on Product/Order or linked pharmacist; set patient hospitalId on booking.
- **155. Mobile zero hospital [MED]:** 13 grep hits, no screens. Fix: explicit roadmap or staff-lite mobile.
