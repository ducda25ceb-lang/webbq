# Competitor Gap Review

## Summary

Ember BBQ now has a real booking/payment/backend foundation, but compared with production restaurant booking systems it is still closer to a student-grade single-restaurant app than a mature reservation product. The strongest gaps are table inventory, branch/location handling, guest communication, admin operations, and proof that the payment webhook works with real SePay credentials.

## Evidence

- Golden Gate's booking portal emphasizes city, brand, available restaurants, available times, hotline, 500+ restaurants, and a full booking confirmation form.
  - Source: https://datban.ggg.com.vn/
- King BBQ's booking page includes required name, email, phone, date, time, restaurant branch, guest count, notes, and a rule that customers should book at least one hour before dining.
  - Source: https://goldsunfood.vn/datban/dat-ban-tai-website/kingbbq
- OpenTable highlights availability controls, booking rules by shift, pacing, large-party controls, and table types.
  - Source: https://www.opentable.com/restaurant-solutions/products/features/availability-controls/
- SevenRooms highlights direct booking widgets, Google/Facebook/Instagram distribution, waitlist, table management, CRM, payments, multi-venue booking, reminders, surveys, and multilingual booking.
  - Source: https://sevenrooms.com/platform/reservations-waitlist/
- Resy highlights remote waitlist handling and guest text updates through Resy OS.
  - Source: https://helpdesk.resy.com/how-to-use-mobile-waitlist-rkj_bD7Iu
- Tock emphasizes deposits and prepaid reservations to reduce no-shows.
  - Source: https://www.exploretock.com/join/resources/deposit-for-restaurant-reservation-booking/

## Risks

- Ember BBQ currently has time slots, but not a real table/floor inventory model.
- Payment is prepared but not proven with real SePay credentials and bank webhook events.
- Admin dashboard has useful basics, but lacks filtering/search depth, audit clarity, table assignment, and operational views for real shifts.
- Customer booking flow requires login, which is useful for history but less frictionless than common public restaurant booking forms.
- The UI still exposes some technical setup copy when SePay secrets are missing; this should not appear in a polished production experience.

## Recommendation

- For a student project, do not chase OpenTable/SevenRooms complexity.
- Prioritize believable restaurant operations: cleaner booking status, admin filters, table/slot capacity, branch-ready data model, and polished demo mode.
- Hide technical setup language from customer UI; keep it in docs/admin only.
- Treat SePay webhook verification as the final production gate.

## Unknowns

- Whether the project needs one branch only or multiple branches.
- Whether the restaurant has actual table layout/capacity rules.
- Whether the presentation/demo needs a fake payment mode without real bank transfer.
