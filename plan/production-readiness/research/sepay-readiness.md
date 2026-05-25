# SePay And Production Readiness Research

## Summary

The current app has a working restaurant booking foundation, but payment is still manual: the customer can click "Hoan tat QR" and the app trusts that click. For production, payment should be confirmed by a server-side webhook from SePay, then the booking status should update automatically.

## Evidence

- The app currently displays a static QR image from `index.html`.
- Booking payment completion currently calls frontend logic that updates Supabase directly.
- SePay documentation describes a QR + webhook flow: customer scans QR, transfers money, SePay sends an HTTP POST to the app server, and the server marks the order as paid.
- SePay QR can be generated with `https://qr.sepay.vn/img?acc={account}&bank={bank}&amount={amount}&des={description}`.
- SePay webhook supports authentication options including HMAC-SHA256 and API Key.

## Risks

- A customer can currently mark a booking as QR-completed without real payment verification.
- Booking status changes are spread across pages and frontend helpers, making it easy for states to drift.
- Admin role checks are not fully consistent between frontend, Supabase RLS, and Edge Function logic.
- Contact, newsletter, and reviews are stored, but not yet moderated or tracked like real operational data.

## Recommendation

- Move payment confirmation to a Supabase Edge Function that receives SePay webhook events.
- Generate one unique payment code per booking and put it in the QR transfer description.
- Add a `payments` table for payment status, amount, provider transaction id, raw webhook data, and timestamps.
- Make booking status changes server-owned: customer can request/cancel; webhook confirms payment; admin approves or rejects.
- Keep the frontend as a display and action layer, not the source of payment truth.

## Unknowns

- Final SePay account type, bank account, bank short code, authentication method, and webhook secret.
- Whether the project will use SePay bank webhook only or SePay Payment Gateway product.
- Final deployment target for public webhook URL.
