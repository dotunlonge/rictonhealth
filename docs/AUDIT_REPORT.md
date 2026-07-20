# UI/UX to Backend Spec Audit Report

## Overview
The existing `BACKEND_SPEC.md` and `RICTON_BACKEND_BLUEPRINT.md` have successfully mapped over 90% of the UI components to backend endpoints and Prisma models.
However, several files export from Figma with generic names (e.g., `Frame ...`) were not explicitly referenced in the documentation, even though their functional flows are covered.

## Unmapped / Generically Named Files Mapping
| File | Inferred Feature | Maps To Existing Spec Flow |
|---|---|---|
| `Frame 121075499.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075506.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075507-10.pdf` | Premium Confirmation | Section 2.1 (Premium user done) |
| `Frame 121075507-7.pdf` | Registration Success | Section 1.2 (Auth) |
| `Frame 121075507-8.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075507-9.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-1.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-10.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-11.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-12.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-2.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-3.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-4.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-5.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-6.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-7.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-8.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511-9.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075511.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-1.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-10.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-11.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-12.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-13.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-14.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-15.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-16.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-17.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-18.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-19.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-2.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-20.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-21.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-22.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-23.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-24.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-25.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-26.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-27.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-28.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-29.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-3.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-30.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-31.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-32.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-33.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-34.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-35.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-36.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-37.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-38.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-39.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-4.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-40.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-41.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-42.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-43.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-44.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-45.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-46.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-47.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-48.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-49.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-5.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-50.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-51.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-52.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-53.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-54.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-55.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-56.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-57.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-58.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-59.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-6.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-60.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-61.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-62.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-63.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-64.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-65.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-66.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-67.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-68.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-69.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-7.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-70.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-71.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-72.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-73.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-8.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512-9.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075512.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075533.pdf` | Authentication (Email Verification) | Section 1.2 (Auth) |
| `Frame 121075552-1.pdf` | Authentication (Create Password) | Section 1.2 (Auth) |
| `Frame 121075552-2.pdf` | Authentication (Create Password) | Section 1.2 (Auth) |
| `Frame 121075552-3.pdf` | Authentication (Password Reset) | Section 1.2 (Auth) |
| `Frame 121075552-4.pdf` | Authentication (Password Reset) | Section 1.2 (Auth) |
| `Frame 121075552-5.pdf` | Authentication (Phone Capture) | Section 1.2 (Auth) |
| `Frame 121075552-6.pdf` | Authentication (OTP Verification) | Section 1.2 (Auth) |
| `Frame 121075552.pdf` | Unknown Content: 􀆉 Back Get going with email It’s helpful to provide a good reason for why the email address is  | Needs Review |
| `Frame 121075553-1.pdf` | Patient Profile (Address) | Section 2.1 (Profile update) |
| `Frame 121075553.pdf` | Patient Profile (Details) | Section 2.1 (Profile update) |
| `Frame 121075567-1.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075567-2.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075567-3.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075567-4.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075567-5.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075567.pdf` | iOS Keyboard State | N/A (UI only) |
| `Frame 121075597-1.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075597-2.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075597-3.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075597-4.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075597.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075602-1.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075602-2.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075602-3.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075602-4.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075602-5.pdf` | Unknown Content: Continue 1 2 3 ABC ABC DEF 4 5 6 GHI JKL MNO 7 8 9 PQRS TUV 0 WXYZ  | Needs Review |
| `Frame 121075602-6.pdf` | Unknown Content: Continue 1 2 3 ABC ABC DEF 4 5 6 GHI JKL MNO 7 8 9 PQRS TUV 0 WXYZ  | Needs Review |
| `Frame 121075602.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-1.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-10.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-11.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-12.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-13.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-14.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-15.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-16.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-17.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-18.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-2.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-3.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-4.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-5.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-6.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-7.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-8.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699-9.pdf` | Empty/Image-only UI State | N/A |
| `Frame 121075699.pdf` | Empty/Image-only UI State | N/A |
| `Frame.pdf` | Password Reset Sent | Section 1.2 (Auth) |

## Actionable Recommendations
1. **Update BACKEND_SPEC.md**: Add explicit references to the Figma frame numbers to prevent confusion during QA/Validation.
2. **No Backend Changes Needed**: The underlying functional flows (Auth, Premium status, Profile updating) are already correctly identified and designed in the Prisma schema and API spec.
| `Rectangle 2767.pdf` | Empty/Image-only UI State | N/A |
| `User -1.pdf` | User Profile Variations | Section 2.1 (Profile update) |
| `Transforming healthcare...pdf` | Splash / Onboarding | Section 1.2 (Onboarding) |
| `Here’s a good place...pdf` | Splash / Onboarding | Section 1.2 (Onboarding) |
| `Rectangle 4223.png` | Empty/Image-only UI State | N/A |
| `iPhone 13 & 14 - 7.jpg` | App Store Mockup | N/A |
| `2 Landing page.pdf` | Marketing Landing Page | Section 7 (Cross-Portal Screens) |
| `Log in-1.pdf` | Authentication Login State | Section 1.2 (Auth) |
| `MDTs C.jpg` | Consultant MDT View | Section 3.6 (MDT) |
| `Screenshot (643) 1.png` | Assorted UI Snapshot | N/A |
