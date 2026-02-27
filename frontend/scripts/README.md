# Scripts

## Feature tests

Runs automated checks against the running app to verify main features.

**Prerequisites**

- Dev server running: `npm run dev` (in project root or `frontend/`)
- MongoDB connected (some tests need DB)

**Run**

```bash
# From frontend directory
node scripts/test-features.mjs
```

**What is tested**

| # | Feature | Expectation |
|---|--------|-------------|
| 1 | Services list | GET `/api/services/all` → 200 (or 404 if no services) |
| 2 | Daily count | GET `/api/appointments/daily-count?date=...` → 200, `total` number |
| 3 | Monthly count | GET `/api/appointments/monthly-count` → 200, `total` number |
| 4 | Appointments by date | GET `/api/appointments?date=...` → 200, array |
| 5 | Slots | GET `/api/appointments/slots?date=...&serviceId=...` → 200, `availableSlots` array |
| 6 | Closures list | GET `/api/admin/closures` → 200, array |
| 7 | Appointments require date | GET `/api/appointments` (no date) → 400 |
| 8 | Closure 5-min validation | POST closure with invalid time (e.g. 10:07) → 400 |
| 9 | Closure end > start | POST closure with end before start → 400 |
| 10 | Config | GET `/api/config` → 200 or 404 |
| 11 | Slots for tomorrow | Slots API works for tomorrow (booking is tomorrow + day after) |

Exit code: `0` if all passed, `1` if any failed.
