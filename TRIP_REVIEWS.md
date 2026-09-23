# Trip reviews

- The original `/?tripId=...` link displays reviews starting at 00:00 on the inclusive return date in Asia/Bangkok. The existing trip editor persists that date as `departureDate + durationDays - 1`; no new date field is required. Free-text `tripPeriod` and manual completion status do not override the date. For a single-day trip, reviews open on that same day.
- Booking creation also checks the cutoff on the server. Existing tickets remain at `/tickets`.
- LINE participants with an approved booking may submit one rating (1–5) and optional comment (up to 2,000 characters). Identity comes from the session. A database unique constraint enforces one submission per account and trip, including concurrent requests.
- `/admin/reviews` provides trip status (all/open/closed), trip, rating, comment presence and name/comment search filters, sorting, pagination and filtered averages. Trip choices follow the selected status. Grant the `reviews` permission under admin management; the main `admin` account already has access.
- `/trips/[id]/reviews` is linked from completed trip cards on the landing page and customer completed-trips tab. Anyone can read it without logging in once an admin marks the trip `completed`. Reopening a trip disables its public review endpoint again.
- `/api/reviews/public` selects only non-hidden reviews for that trip, returning rating, comment, timestamp and record ID. It excludes reviewer identity and contact details. Its average and count come from the same visible-only dataset across all pages. Empty results show no average. Public pages refresh every 30 seconds while visible and on focus; responses are not cached.
- Private review API reads check current admin permissions and blocked status. Customers can read only their own full review. Database RLS is enabled and direct access by anon/authenticated roles is revoked.
- Admins can hide or restore individual reviews with the eye button. The default list shows visible reviews; choose hidden or all to restore them. Averages and counts follow the visibility filter as well. Hiding excludes a review and its score from the public list and average, retains the original record and does not allow resubmission; authors can still see their own submission. The submission form explains public visibility.

## Database setup

Apply `migrations/20260923_trip_reviews.sql` and `migrations/20260923_trip_review_visibility.sql` to each environment before release. The migration script applies both. These migrations were applied to the configured development database during implementation.

```powershell
# Prefer DATABASE_URL in .env.local. The script also supports the existing local setup script.
node scripts/migrate-trip-reviews.cjs
node scripts/check-trip-reviews.cjs
```

If the existing setup script references an old pooler host, set `REVIEWS_DB_HOST` to the current host from the database connection settings. The check script verifies constraints in a rolled-back transaction; it leaves no test reviews.

## Verification

```powershell
node --test tests/trip-reviews.test.cjs
npm.cmd run build
```

The API requires the server-side `SUPABASE_SERVICE_ROLE_KEY`. Do not expose that key to browser code.
