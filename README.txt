FULL REPLACEMENT PACKAGE — RESTRO ORDER MARKING FLOW

1. Run 01_RUN_IN_SUPABASE.sql.
2. Replace app/orders/page.tsx.
3. Add app/api/restro/orders/route.ts.
4. Add app/api/restro/orders/status/route.ts.
5. Ensure SUPABASE_SERVICE_ROLE_KEY and RESTRO_SESSION_SECRET are configured in Vercel.

FLOW
- New Order Accept -> In Kitchen.
- New Order Reject -> Cancellation Request with Admin-matching reason list.
- Out for Delivery Delivered -> Restro Marked Delivered.
- Out for Delivery any issue -> Complaints.
- Complaints response stays in Complaints and only records vendor response/history.
- Bad Delivery tab/button removed from Restro Portal.
- Restro Marked Delivered and Complaints tabs added.

The 3-day auto Delivered job is NOT included in this package; that is the next Admin/Cron step.
