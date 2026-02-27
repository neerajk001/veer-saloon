# Veer Salon – What’s Done vs What Could Be Added

## Implemented (current features)

- **Home** – Hero, “Book Appointment”, “My Bookings”
- **Book** – Sign in with Google → service, date (tomorrow + day after only), 5‑min slots, details → create appointment
- **My Bookings** – List from **localStorage** (bookings saved after each book)
- **Admin** – Dashboard (customers today, month total, services, appointments, completed, closures, users), Services CRUD, Appointments by date + status update (scheduled/completed/canceled/blocked), Settings (morning/evening hours, **days off**), Shop closures (full day + partial 5‑min block), User list + block/unblock
- **APIs** – Services, config, appointments (create, list by date, PUT status, DELETE), slots (respects closures, partial blocks, **weekly days off**), daily-count, monthly-count, closures CRUD, auth (NextAuth + Google)

---

## Gaps / possible next features

| Area | What’s missing | Notes |
|------|----------------|--------|
| **My Bookings** | Not synced with backend | Today “My Bookings” only reads from localStorage. It does **not** load the user’s appointments from the API by email. So if they book on another device or clear storage, those bookings don’t show. You could add e.g. `GET /api/appointments?userEmail=...` (with auth) and show real appointments and/or merge with localStorage. |
| **Cancel from user side** | No “Cancel” in My Bookings | User cannot cancel a booking from the app. Admin can set status to “canceled”. You could add “Cancel” in My Bookings that calls e.g. `PUT /api/appointments/:id` with `status: 'canceled'` (and restrict to own appointments). |
| **Admin link** | No visible link to Admin on home | Only way in is `/admin` or `/admin/login`. You could add a small “Admin” link in header/footer (or only when logged in as admin). |
| **Notifications** | No email/SMS | No reminders (e.g. day before) or confirmations by email/SMS. Would need a provider (Resend, Twilio, etc.) and templates. |
| **Payments** | No payment | Booking is free; no Stripe/Razorpay etc. Optional for later. |
| **Booking window** | Only 2 days | Currently only “tomorrow” and “day after tomorrow”. You could make the window configurable (e.g. next 7 or 14 days). |
| **Multiple staff / resources** | Single “salon” | No barber/staff selection or per-staff slots. All bookings use one shared slot pool. |

---

## Recently fixed

- **Days off** – Settings “days off” (e.g. Sunday, Monday) are now applied in the slots API: those weekdays return no slots and a reason (e.g. “Closed on Sundays”).
- **Admin error message** – Appointment update failure now shows a generic “Failed to update appointment” instead of “Update endpoint not implemented”.

Nothing else is **required** for the current scope; the list above is “nice to have” or future scope.
