# Ricton Mobile Design Source — Page and File Audit

**Audited:** 2026-09-04  
**Scope:** all 272 files immediately under `RICTON_UI_UX/Mobile`  
**Method:** every one of the 256 single-page PDFs was rendered and visually reviewed; all 14 JPGs and two PNGs were inspected, including the combined design canvas

## Verdict

Use this folder as a product-flow archive, not as a production specification.

The source contains many valuable journeys, but its apparent volume is misleading: 111 PDFs are only 390×46 status-bar exports, and dozens more are isolated logo, text, keyboard, navigation, modal, or control fragments. The actual screen concepts are duplicated across multiple exports and vary in visual language. Rebuilding them literally would make the app feel less professional than the current web frontend.

### Disposition key

- **Rebuild:** preserve the user goal and core information; redesign with the shared professional system.
- **Consolidate:** preserve as a state or component within another screen, not as a route.
- **Hold:** do not promise or implement until the backend/product prerequisite is approved.
- **Discard:** export artifact or duplicate that should not influence implementation.

## System-wide problems found

- No stable brand hierarchy: saturated blue, green, purple, and gradients each behave like primary colors in different flows.
- No consistent type scale, line height, spacing grid, radius scale, icon family, elevation model, or content gutter.
- Several screens exceed normal phone height because a whole flow was designed as one scrolling canvas.
- Persistent bottom navigation changes between flows; a drawer duplicates global navigation.
- Labels and secondary text are often too small or low contrast for a healthcare application.
- Buttons and icon controls do not consistently meet 44×44 pt touch targets.
- Content hierarchy is frequently driven by decorative cards instead of task priority.
- Keyboard screenshots and overlays are exported as separate pages rather than specified interaction states.
- Loading, offline, stale, empty, partial-error, permission-denied, retry, and destructive confirmation states are incomplete.
- Copy is inconsistent and contains errors, including “Dont” and “one connection at at time.”
- Payment screens imply direct card collection, which should be replaced by provider-hosted checkout.
- Maps, ratings, calling, uploads, emergency care, and some premium benefits exceed current verified backend capability.

## Page-by-page journey audit

### Brand, splash, welcome, and onboarding

**Sources:** `Rectangle 2767.pdf`, `5.jpg`, `iPhone 13 & 14 - 7.jpg`, `Here’s a good place for a brief overview of the app or it’s key feature.pdf`, `RICTON.pdf`, `Transforming healthcare one connection at at time.pdf`, `Welcome to Ricton.pdf`.

The fragmented logo/tagline exports and multiple splash variants are not a usable brand specification. The welcome concept is valid, but long intro copy delays the user and the typography lacks a dependable hierarchy.

**Disposition:** Rebuild one fast branded launch state and, only if product research supports it, a maximum three-card onboarding carousel. Consolidate the text snippets into editable copy; correct the tagline; discard bitmap/text-fragment layout guidance.

### Sign in and social authentication

**Sources:** `Login.pdf`, `Login-1.pdf`, `Login.jpg`, `Login - with Google.pdf`, `Login - with Google-1.pdf`, `loading - Google & Apple.pdf`, `Phone number.pdf`, `User -1.pdf`.

The core intent is clear, but the visual variants disagree on spacing and social-auth state. A standalone “loading” page is unnecessary. Current mobile implementation also exposes several buttons that do nothing.

**Disposition:** Rebuild a single sign-in route with email/phone mode, native provider buttons, inline progress, explicit errors, secure callback recovery, keyboard-safe layout, and accessibility labels. Consolidate provider loading into button/page state.

### Registration, verification, and password recovery

**Sources:** `Email.pdf`, `Confirm email.pdf`, `Email confirmed.pdf`, `Temporary code.pdf`, `Create password.pdf`, `Create password-1.pdf`, `Reset password.pdf`, `Reset password alert.pdf`, `loading - reset password.pdf`, `Success.pdf`.

The sequence captures the expected path but over-fragments success/loading/alert states into routes. OTP attempt, resend, expiry, paste, autofill, and lockout behavior are not specified well enough.

**Disposition:** Rebuild as explicit auth state machines. Use inline/sheet feedback instead of route-per-alert, retain durable success confirmation only where it prevents uncertainty, and bind timers/lockout to server truth.

### Home

**Sources:** `Home page.pdf`, `Home page.jpg`, `Home (after the user has booked an appointment).jpg`.

The home board contains the right priorities—greeting, quick actions, wallet, and upcoming appointment—but the PDF is a 390×1654 long canvas and mixes too many competing cards. The booked variant proves a useful state but should not become a separate screen.

**Disposition:** Rebuild as a concise, adaptive dashboard with one next-best clinical action, an upcoming appointment module, wallet summary, and clear discovery entry points. Consolidate booked/unbooked/loading/error into component states.

### Global navigation and menu

**Sources:** `Menu.pdf`, `Menu-1.pdf`, `Menu-2.pdf`, `Menu-3.pdf`.

The menu variants duplicate bottom-tab destinations and introduce inconsistent hierarchy. This is not a good mobile information architecture.

**Disposition:** Discard the persistent drawer pattern. Use four patient tabs—Home, Appointments, Prescriptions, Account—and place low-frequency settings in Account. Use sheets only for contextual actions.

### Account: free and premium

**Sources:** `Account free.jpg`, `Account Premium.jpg`, `Account personal info.pdf`, `Account medical history.pdf`, `Account Security &.pdf`, `Acount premium user .pdf`, `Acount premium user -1.pdf`, `Acount premium user PI.pdf`, `Acount premium user MH.pdf`, `Acount premium user SP.pdf`, `Address.pdf`.

The information grouping is useful, but free and premium accounts are duplicated into parallel page sets. Premium should be a capability/status, not a forked account architecture. Personal, health, address, and security data need clearer privacy and save/error feedback.

**Disposition:** Rebuild one Account hierarchy with shared personal, medical, address, security/session, notifications, subscription, and support sections. Premium changes badges and enforced entitlements, not navigation or duplicate screens.

### Premium upgrade

**Sources:** `Upgrade to premium 1.pdf`, `Upgrade to premium 2.pdf`, `Upgrade to premium 3.pdf`, `Premium user done.pdf`.

The progression is understandable, but benefits, pricing, renewal, cancellation, and failure states are not sufficiently grounded in backend entitlement logic. Decorative purple competes with the Ricton brand.

**Disposition:** Rebuild in the navy/blue system. Hold any benefit not enforced by pricing/order/appointment services. Externalize payment, show verified subscription state, renewal terms, restore/reconcile, and failure recovery.

### Appointment list and management

**Sources:** `Appointment page.pdf`, `Appointment page.jpg`, `Cancel appointment.pdf`, `Cancel appointment tele medicine.pdf`, `Reschedule appointment.pdf`, `Reschedule appointment tele medicine.pdf`.

The list and cancel/reschedule intents are sound, but duplicated telemedicine variants add unnecessary branching. Cancellation consequences and reschedule conflicts need more prominence.

**Disposition:** Rebuild one appointment detail/action model whose metadata changes by appointment type. Use confirmation sheets, server-provided cancellation policy, clear refund state, and conflict recovery.

### Provider/pharmacy discovery and booking

**Sources:** every `Booking` PDF and JPG listed in the file ledger below.

This is the richest but least normalized source family. It mixes doctor search, specialty filters, maps, pharmacy discovery, profile detail, calendars, payment, confirmation, voice/video call states, and long-scroll compositions. Heights range from 844 to 1779 points. Similar states use different cards, navigation, colors, and button placement.

**Disposition:** Decompose into independent journeys: provider search → profile → slots → review → payment → confirmation; pharmacy search → detail → fulfillment; telemedicine lobby → room. Rebuild all visual structure. Hold map-nearby, ratings submission, and direct phone calling until backend/product prerequisites exist.

### Telemedicine

**Sources:** `Tele medicine page.pdf`, `Tele medicine page-1.pdf`, `Tele medicine page-2.pdf`, `Tele medicine page-3.pdf` plus telemedicine states embedded in the `Booking` family.

The sources illustrate a desired room and controls but do not fully specify device permissions, preflight, reconnection, remote-end, background/interruption, privacy, or invalid-room behavior.

**Disposition:** Rebuild natively after a video SDK proof-of-concept. Do not base production behavior on the backend's simulated-token fallback. Add lobby, permissions, network quality, reconnect, and terminal states.

### Prescriptions

**Sources:** `Prescription page.pdf`, `Prescription page-1.pdf`, `Prescription page-2.pdf`, `Prescription page-3.pdf`.

The tab/list/detail intent is usable, but clinical status, prescriber identity, dates, instructions, order eligibility, and dispense history need a more rigorous hierarchy.

**Disposition:** Rebuild patient read-only list/detail around backend enums and signed state. Make “Order” available only when server-authorized; do not imply patients can edit or validate prescriptions.

### Pharmacy cart, fulfillment, payment, and orders

**Sources:** `My order.pdf`, `My order-1.pdf` through `My order-9.pdf`, `Delivery.pdf`, `Pickup.pdf`, `Payment.pdf`.

The boards cover cart/order variants and delivery/pickup, but expose client-owned totals and raw payment-card form concepts. Order-state labels do not consistently match backend enums, and failure/idempotency/stock-conflict paths are absent.

**Disposition:** Rebuild with server-calculated totals, authoritative stock, explicit fulfillment selection, saved address, provider-hosted Paystack checkout, callback verification, idempotent submission, and the backend state machine: `PLACED`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.

### Wallet

**Sources:** `wallet page.pdf`, `wallet page-1.pdf`, `wallet page-2.pdf`, `wallet page.jpg`.

The balance card and transaction history are useful. Funding and virtual-account states need stronger verification, pending, reversal, duplicate-callback, and privacy behavior.

**Disposition:** Rebuild with server-authoritative balance/history and plural `/api/wallets` contract. Use an external payment surface; reconcile on return; never display success based only on a redirect.

## Component and export-fragment audit

### Status bars — discard all 111 PDFs

These are identical-size 390×46 operating-system chrome fragments and must not be treated as routes, custom status bars, or layout assets:

- `Frame 121075511.pdf` and `Frame 121075511-1.pdf` through `Frame 121075511-12.pdf` — 13 files.
- `Frame 121075512.pdf` and `Frame 121075512-1.pdf` through `Frame 121075512-73.pdf` — 74 files.
- `Frame 121075597.pdf` and `Frame 121075597-1.pdf` through `Frame 121075597-4.pdf` — five files.
- `Frame 121075699.pdf` and `Frame 121075699-1.pdf` through `Frame 121075699-18.pdf` — 19 files.

Use native safe areas and system status-bar configuration instead.

### Control/navigation fragments — consolidate or discard

| Files                                                  | What they represent                       | Disposition                                                              |
| ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| `Frame 121075499.pdf`                                  | 32×32 icon fragment                       | Discard; use the governed icon library.                                  |
| `Frame 121075506.pdf`                                  | 390×54 navigation/control strip           | Consolidate into native navigation/component specs.                      |
| `Frame 121075507-7.pdf`, `-8.pdf`, `-9.pdf`, `-10.pdf` | short bars/panels                         | Consolidate as component states; never routes.                           |
| `Frame 121075533.pdf`, `Frame.pdf`                     | isolated cards/panels                     | Rebuild through card/sheet primitives.                                   |
| `Frame 121075552.pdf`, `-1.pdf` through `-6.pdf`       | modal/sheet fragments                     | Consolidate into a standard sheet/dialog component with named variants.  |
| `Frame 121075553.pdf`, `Frame 121075553-1.pdf`         | larger modal/panel fragments              | Consolidate; add focus, close, destructive, loading, and error behavior. |
| `Frame 121075567.pdf`, `-1.pdf` through `-5.pdf`       | repeated 390×290 control panels/keyboards | Discard keyboard artwork; keep only the intended input state.            |
| `Frame 121075602.pdf`, `-1.pdf` through `-4.pdf`       | 390×54 navigation/control strips          | Consolidate into native navigation/components.                           |
| `Frame 121075602-5.pdf`, `Frame 121075602-6.pdf`       | 390×360 panels/keyboards                  | Discard keyboard artwork; rebuild the interaction state.                 |
| `Rectangle 4223.png`                                   | bitmap rectangle/background fragment      | Discard as an implementation asset.                                      |

## Complete source ledger

The grouped notation below is exhaustive: every file is named directly or by an inclusive suffix range. A range includes only files that exist in this folder.

| Source files                                                                                                                                                                                                                                                                                                                                                       |   Count | Classification                                          | Final disposition                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------: | ------------------------------------------------------- | --------------------------------------------------------- |
| `5.jpg`; `iPhone 13 & 14 - 7.jpg`; `Rectangle 2767.pdf`; the four logo/tagline text PDFs named in the onboarding section                                                                                                                                                                                                                                           |       7 | Splash/onboarding/reference fragments                   | Rebuild intent; discard fragments                         |
| `Login.pdf`; `Login-1.pdf`; `Login.jpg`; `Login - with Google.pdf`; `Login - with Google-1.pdf`; `loading - Google & Apple.pdf`; `Phone number.pdf`; `User -1.pdf`                                                                                                                                                                                                 |       8 | Sign-in/social states                                   | Rebuild and consolidate                                   |
| `Email.pdf`; `Confirm email.pdf`; `Email confirmed.pdf`; `Temporary code.pdf`; `Create password.pdf`; `Create password-1.pdf`; `Reset password.pdf`; `Reset password alert.pdf`; `loading - reset password.pdf`; `Success.pdf`                                                                                                                                     |      10 | Registration/recovery states                            | Rebuild and consolidate                                   |
| `Home page.pdf`; `Home page.jpg`; `Home (after the user has booked an appointment).jpg`                                                                                                                                                                                                                                                                            |       3 | Home states                                             | Rebuild                                                   |
| `Menu.pdf`; `Menu-1.pdf`; `Menu-2.pdf`; `Menu-3.pdf`                                                                                                                                                                                                                                                                                                               |       4 | Drawer/navigation variants                              | Discard pattern; retain destination inventory             |
| `Account free.jpg`; `Account Premium.jpg`; `Account personal info.pdf`; `Account medical history.pdf`; `Account Security &.pdf`; `Acount premium user .pdf`; `Acount premium user -1.pdf`; `Acount premium user PI.pdf`; `Acount premium user MH.pdf`; `Acount premium user SP.pdf`; `Address.pdf`                                                                 |      11 | Account/profile variants                                | Rebuild one hierarchy                                     |
| `Upgrade to premium 1.pdf`; `Upgrade to premium 2.pdf`; `Upgrade to premium 3.pdf`; `Premium user done.pdf`                                                                                                                                                                                                                                                        |       4 | Subscription states                                     | Rebuild; hold unsupported benefits                        |
| `Appointment page.pdf`; `Appointment page.jpg`; `Cancel appointment.pdf`; `Cancel appointment tele medicine.pdf`; `Reschedule appointment.pdf`; `Reschedule appointment tele medicine.pdf`                                                                                                                                                                         |       6 | Appointment states                                      | Rebuild and consolidate                                   |
| `Booking - 1.pdf`, `-2.pdf`, `-3.pdf`, `-7.pdf`, `-9.pdf`, `-10.pdf`, `-11.pdf`, `-13.pdf`, `-14.pdf`, `-20.pdf`, `-21.pdf`, `-23.pdf` through `-29.pdf`, `-31.pdf` through `-33.pdf`, `-35.pdf`, `-37.pdf`, `-39.pdf`, `-41.pdf` through `-56.pdf`, `-58.pdf` through `-62.pdf`; `Booking- 21.pdf`; `Booking - 8.jpg`, `-36.jpg`, `-38.jpg`, `-40.jpg`, `-57.jpg` |      51 | Mixed discovery/booking/payment/call states             | Decompose and rebuild; hold unsupported features          |
| `Tele medicine page.pdf`; `Tele medicine page-1.pdf` through `-3.pdf`                                                                                                                                                                                                                                                                                              |       4 | Telemedicine states                                     | Rebuild after native spike                                |
| `Prescription page.pdf`; `Prescription page-1.pdf` through `-3.pdf`                                                                                                                                                                                                                                                                                                |       4 | Prescription states                                     | Rebuild                                                   |
| `My order.pdf`; `My order-1.pdf` through `-9.pdf`; `Delivery.pdf`; `Pickup.pdf`; `Payment.pdf`                                                                                                                                                                                                                                                                     |      13 | Cart/order/fulfillment/payment states                   | Rebuild; externalize payment                              |
| `wallet page.pdf`; `wallet page-1.pdf`; `wallet page-2.pdf`; `wallet page.jpg`                                                                                                                                                                                                                                                                                     |       4 | Wallet states                                           | Rebuild                                                   |
| `Frame 121075511{,-1…-12}.pdf`; `Frame 121075512{,-1…-73}.pdf`; `Frame 121075597{,-1…-4}.pdf`; `Frame 121075699{,-1…-18}.pdf`                                                                                                                                                                                                                                      |     111 | OS status-bar fragments                                 | Discard                                                   |
| `Frame 121075499.pdf`; `Frame 121075506.pdf`; `Frame 121075507-{7,8,9,10}.pdf`; `Frame 121075533.pdf`; `Frame 121075552{,-1…-6}.pdf`; `Frame 121075553{,-1}.pdf`; `Frame 121075567{,-1…-5}.pdf`; `Frame 121075602{,-1…-6}.pdf`; `Frame.pdf`; `Rectangle 4223.png`                                                                                                  |      31 | Icons, navigation, modal, keyboard, and panel fragments | Consolidate or discard                                    |
| `RICTON UI_UX.png`                                                                                                                                                                                                                                                                                                                                                 |       1 | Combined Figma-canvas overview                          | Retain as the master visual index only                    |
| **Total**                                                                                                                                                                                                                                                                                                                                                          | **272** | **All source files accounted for**                      | **No source file is a production-ready asset by default** |

## Professional mobile direction

The replacement visual language should be visibly related to the current web frontend:

- navy shell/text anchors;
- Ricton blue for the sole primary action;
- white and slate surfaces;
- semantic green/amber/rose only for status;
- border-first cards with restrained elevation;
- one consistent line-icon family;
- fewer, stronger cards with clear headings;
- readable native type with Dynamic Type support;
- four stable tabs and focused nested journeys;
- sheets/dialogs for transient choices, not new pages;
- platform-native permission, payment, camera, and safe-area behavior.

The source remains traceable for product intent, but final approval should compare implemented mobile screens with the web design tokens and user outcomes—not with the pixel geometry of these exports.
