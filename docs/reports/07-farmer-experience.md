# Phase 7 — Full Farmer-Side Experience

Builds out the complete farmer half of the app: a rebuilt Home hub, Listings with bulk
actions, an enhanced Add/Edit Product flow, Insights & Growth, Business Settings, a
rebuilt Profile tab with a shopping/selling switcher, Orders (list + detail), Messages
(inbox + realtime chat thread), and Notifications — all wired to live Supabase data,
against `assets/materials/farmers screen/*.html` (11 HTML mockups).

## Questions asked before building, and decisions made

Two conflicts between the prompt and the actual repo state were raised before writing any
code, since guessing wrong would have meant real rework:

1. **The prompt assumed Paystack checkout/order-status flow already existed.** It doesn't —
   `orders`/`order_items` exist with RLS but zero real data, `status` was a bare `text`
   column with no enum, and there was no farmer UPDATE policy at all (confirmed against the
   actual migrations, not memory). Decided: build the status-flow schema/logic now, as the
   prompt's own section 10 fallback ("if it doesn't exist yet, build it") already
   anticipated. Real orders still won't exist until a separate checkout phase is built —
   flagged again below.
2. **Icon library.** The prompt asked for `lucide-react-native`; the mockups actually use
   Tabler icons; the app's established convention (phase 8) is FontAwesome5, chosen
   specifically *over* lucide the last time this exact question came up. Decided: keep
   FontAwesome5, for one consistent icon vocabulary across old and new screens.

A third issue surfaced mid-build, not before: **`expo-sharing`'s `shareAsync()` is
file-only** — it has no support for sharing plain text/links, which section 5 explicitly
needed ("native share sheet with a link... pre-filled message text"). Verified against the
SDK 57 docs (per this repo's `AGENTS.md` instruction to check current Expo API behavior,
not assume it) before writing the share code. Used React Native's own `Share.share()`
instead, and removed the `expo-sharing` dependency again after installing it.

A fourth blocker was environmental, not architectural: **the Supabase CLI was initially
authenticated to the wrong account** — `supabase projects list` showed three unrelated
projects, none matching `gcnwhamvirqtkipeyggm` (what `.env` actually points at), and
`db push`/`link` both failed with a 403. Resolved mid-session once the project owner logged
in with the correct account; migrations were pushed and types regenerated from the live
schema after that.

## What was built, by file

### Migrations (all applied via `npx supabase db push --linked`, types regenerated via
`npx supabase gen types typescript --linked`)

- `20260820120000_products_photos_stock_preorder.sql` — `products.photo_url` (single)
  replaced with `photo_urls text[]` (backfilled from the old column before dropping it),
  plus `low_stock_threshold integer` and `is_preorder boolean`. Also creates
  `low_stock_products`, a `security_invoker` view (`quantity_available <= low_stock_threshold`
  can't be expressed as a direct PostgREST column-to-column filter) — verified via the RLS
  script that it still respects each farmer's own row-level access, not the view owner's.
- `20260820120100_farmer_profiles_business_settings.sql` — `business_hours jsonb`,
  `is_open_now boolean default true`, `photo_url text` on `farmer_profiles`.
- `20260820120200_orders_status_flow.sql` — a CHECK constraint enumerating the allowed
  status values (`pending`, `preparing`, `ready_for_pickup`, `out_for_delivery`,
  `delivered`, `cancelled`), and a new farmer UPDATE policy
  (`orders_update_farmer_advance_only`) whose `with check` blocks the farmer from ever
  setting `delivered` themselves — the household's own confirmation is the only path to
  that state, enforced at the RLS layer, not just in client UI.
- `20260820120300_promotions.sql`, `20260820120400_reviews.sql`,
  `20260820120500_delivery_zones.sql` — new tables per the spec's section 1, each
  public-read / farmer-own-write (reviews is public-read / household-insert-own-order,
  no update/delete — permanent once left, like most tables in this project).
- `20260820120350_notifications.sql` — `notifications` table (owner-only read, no insert
  policy for `authenticated` at all — only triggers write to it) plus two `SECURITY DEFINER`
  trigger functions: `notify_farmer_new_order` (fires on `orders` insert) and
  `notify_farmer_low_stock` (fires on `products` update, only on the crossing edge from
  above-threshold to at-or-below, so it doesn't spam the same listing repeatedly).
  `reviews.sql`'s own `notify_farmer_new_review` trigger depends on this table existing
  first, hence the migration ordering.
- `20260820120600_messaging.sql` — `conversations` + `messages`, participant-scoped RLS
  (same "follows the parent's ownership" pattern `order_items` already uses), a trigger
  that keeps `conversations.last_message_preview/last_message_at` in sync on every insert,
  and `alter publication supabase_realtime add table public.messages` for the chat
  thread's live updates.

### Data layer (`src/hooks/`, `src/lib/`)

New hooks: `useActivePromotions`, `useLowStockProducts`, `useUpcomingHarvest`,
`useWeeklySales`, `useBestSellers`, `useReviews`, `useDeliveryZones`,
`useVerificationProgress`, `useFarmerPromotions`, `useFarmerVerification`,
`useConversations`, `useMessages` (Realtime-subscribed), `useNotifications`,
`useOrderDetail`. Extended `useFarmerOrders` (status filter + joined household name/item
summary) and `useFarmerStats` (week total now excludes cancelled orders, now that
`cancelled` is a real status). New `src/lib/orderStatus.ts` (the farmer-visible stage
list/labels/next-action logic, shared by the stepper and the detail screen's single advance
button), `src/lib/relativeTime.ts`, `src/lib/shareProfile.ts`.

### Home hub (`src/components/app/home/FarmerHome.tsx` — full rewrite)

Matches `01-home-hub.html`: low-stock banner (real, only shown when count > 0, routes to
Listings pre-filtered), 3 real stat cards, a 3×3 quick-action grid (`QuickActionGrid`,
`LowStockBanner`, `HarvestCard` are new components), the soonest upcoming pre-order product
with its real pre-order count, and a real 3-row Recent Orders preview
(`OrderPreviewRow`, `StatusBadge` are new, shared with Orders/Order Detail).

### Listings (`app/(app)/(tabs)/listings.tsx`, `src/components/app/ListingRow.tsx`)

Selection mode ("Select" link → checkboxes), a bulk action bar (Update price via
`BulkPriceModal`, Toggle availability), photo-count badge, low-stock/promotion tags per
row (via `useActivePromotions`), and a `?filter=low-stock` query param the Home banner
uses to land pre-filtered.

### Add/Edit Product (`src/screens/ListingFormScreen.tsx`)

Multiple photo picker (existing photos as a row with per-photo remove, "+" tile to add
more via `expo-image-picker`'s `allowsMultipleSelection`), low-stock threshold field, and a
pre-order toggle that requires a future harvest date (`DateField` gained a `minimumDate`
prop for this).

### Insights & Growth (`app/(app)/insights.tsx`) + Reviews list (`app/(app)/reviews.tsx`)

Weekly sales bar chart (`SalesBarChart`, `react-native-svg`), best sellers (units sold,
trailing 30 days), active promotions + `CreatePromotionModal`, reviews summary (average +
count + latest comment) linking to the full list, and the share-profile card using
`Share.share()`.

### Business Settings (`app/(app)/business/{settings,delivery-zones,hours,verification}.tsx`)

Open/closed toggle bound to `farmer_profiles.is_open_now`; delivery zones list with
add/edit/delete (`DeliveryZoneFormModal`); a simple day-by-day hours editor stored in
`business_hours` jsonb; verification progress computed from four real signals (bank account
on file, farm photo, ≥1 active listing, phone present) with a "steps remaining" screen.

### Profile tab (`app/(app)/(tabs)/profile.tsx` now a dispatcher, matching the pattern
`(tabs)/index.tsx` already uses for Home)

- Farmer branch: new `src/components/app/profile/FarmerProfileTab.tsx`, matching
  `06-profile-tab.html` — profile card with verified badge, prominent "Switch to Shopping
  view" row, FARM group (Edit profile, Business settings, Bank details), GENERAL group (App
  settings, Help), Log out.
- Household branch: unchanged — the original combined settings screen was extracted
  verbatim into `src/screens/AccountSettingsScreen.tsx` so it could also be reached as a
  pushed route (`app/(app)/settings/app-settings.tsx`) from the farmer tab's "App settings"
  row, per the spec's explicit "reuse the existing screen" instruction. Gained an optional
  back button, shown only when pushed.

### Edit profile (`app/(app)/settings/edit-profile.tsx`, extended)

Added a single farm photo (separate from listing photos — reuses the `product-photos`
upload path, not the `avatars` bucket, since that bucket is keyed by `{userId}/avatar.jpg`
and would have collided with the user's own personal avatar), and a display-only contact
phone row.

### Orders (`app/(app)/(tabs)/orders.tsx` + `app/(app)/order/[id].tsx`)

List: 5 filter chips (All/Pending/Preparing/Ready-Out/Delivered), real query, most recent
first. Detail: `OrderStageStepper` (new), tap-to-call, delivery address or a pickup tag,
itemized list + total, and a single advance button whose label/target status comes from
`orderStatus.ts` — it can never reach "Delivered" (enforced by both the hook and the RLS
policy above). Household side still shows the pre-existing Orders placeholder — order
creation isn't in scope for this phase.

### Messages (`app/(app)/(tabs)/messages.tsx` + `app/(app)/message/[conversationId].tsx`)

Inbox: real conversations, unread dot when the last message wasn't sent by this farmer and
is unread. Thread: real messages, sent bubbles right-aligned green / received left-aligned
cream-bordered, Realtime subscription via `supabase.channel(...).on('postgres_changes', ...)`
for live updates, marks the thread's unread messages read on open.

### Notifications (`app/(app)/notifications.tsx`, full rewrite)

Real query grouped by Today/Earlier, per-type icon/color, tap marks read and routes to the
relevant screen (order detail / listings / reviews / business verification).

## Deviations from the spec, and why

- **Icon library stayed FontAwesome5**, not lucide-react-native — see the decision above.
- **"Promotions" quick-action tile routes to Insights**, not a separate screen — the spec's
  own section 5 places promotions *inside* Insights & Growth; no separate Promotions screen
  was ever specified.
- **Share profile uses RN's `Share` API, not `expo-sharing`** — `expo-sharing` cannot share
  plain text/links at all (file-URI only); using it as the prompt literally suggested would
  have meant writing a throwaway file just to work around the API, for strictly worse UX.
- **Bulk "Update price" sets one flat price across every selected listing**, exactly as the
  spec's own wording says ("set a new price across selected items") — not a percentage
  adjustment.
- **Order item summary reads `"{qty} × {product name}"` (or `"N items"`)**, not the
  mockup's `"2 baskets · Tomatoes"` — `order_items` snapshots `product_name_snapshot` and
  `quantity` but never a unit string, so the exact mockup phrasing isn't reconstructable
  from the schema as designed in the earlier core-loop phase.
- **Farm photo reuses the `product-photos` storage bucket**, not a new bucket — see above.
- **Verification's "phone verified" signal is `profiles.phone is not null`**, not a
  dedicated verified flag — every farmer's signup is phone/OTP-gated already, so a non-null
  phone *is* the real signal; no separate column exists to check instead.
- **`is_open_now` and `business_hours` are informational only** — nothing currently reads
  them to gate checkout (there's no checkout to gate), matching the "don't build ahead of
  what's asked" instruction.

## Bugs found and fixed

- **`business/hours.tsx`'s day-hours updater widened its own state type** — spreading
  `{ ...current[key], [field]: value }` with a computed `field: 'open' | 'close'` key made
  TypeScript infer a partial `{ open?: string; close?: string }` instead of the exact
  `{ open: string; close: string }` shape, breaking the `BusinessHours` state type. Fixed by
  building the next value with an explicit `if (field === 'open') ... else ...` branch
  instead of a computed-key spread. Caught by `tsc`, not a runtime bug.
- **Two `spacing[]` scale misses** (`spacing[10]` in notifications.tsx, `spacing[6]` in
  FarmerProfileTab.tsx) — this project's spacing scale is `{4,8,12,16,20,24,32,40,48}`, not
  a full 4px-multiple range; both call sites rounded down to the nearest real key. Caught by
  `tsc`.
- **`database.types.ts` got corrupted mid-regeneration** — `npx supabase gen types ...  >
  file 2>&1` redirected the CLI's own stderr (a harmless Docker-cache-export warning) into
  the same file as the generated types, appending a stray JSON error line after the file's
  closing `} as const` and breaking the parse. Caught immediately by `tsc`, fixed by
  stripping the stray line; worth remembering for any future `supabase gen types` redirect
  in this repo — redirect stdout only, not `2>&1`.
- **RLS test regressions from the new orders CHECK constraint** — two pre-existing
  assertions in `test-rls.ts` used `status: 'confirmed'`, a value that was valid back when
  `status` was unconstrained text but isn't in the new allow-list. Both updated to use
  `'preparing'`, and the farmer-update assertion was rewritten entirely (it previously
  asserted the farmer had *no* update access at all — now genuinely true only for the
  `delivered` transition, not every update).

None of these were runtime-only surprises the way phase 5/6/8's bugs were — everything here
was either caught by `tsc` or by actually running the extended RLS/trigger test against the
live database (see Verification below), which is exactly what that category of bug needs to
be caught by.

## Verification: exact commands run and their results

- `npx tsc --noEmit` — clean, after fixing the four issues above.
- `npx expo export -p android --output-dir <tmp>` — succeeded, **2227 modules** (up from
  2190 in phase 8), 38 assets. Temp directory deleted afterward.
- `npx expo export -p ios --output-dir <tmp>` — succeeded, confirming no iOS-specific
  bundling issue. Temp directory deleted afterward.
- `npx expo-doctor` — 20/21, same pre-existing patch-version-drift category as every prior
  phase (8 packages behind SDK 57's exact patch versions) — not introduced by this phase,
  still an explicit dependency-upgrade decision that hasn't been made yet.
- `npx tsx scripts/test-rls.ts`, extended with new assertions for `low_stock_products`,
  `promotions`, `delivery_zones`, `reviews`, `notifications`, `conversations`, `messages`,
  and the new orders farmer-advance policy — **all assertions passed** against the live
  database, including:
  - The farmer can now advance their own order to a non-delivered status (previously
    impossible — no farmer update policy existed at all), but is genuinely rejected by RLS
    (not just filtered client-side) when attempting to set `delivered` directly.
  - Both `notify_farmer_new_order` and `notify_farmer_new_review` triggers actually fired
    and produced real rows during the test run — this is live proof the `SECURITY DEFINER`
    trigger pattern works end-to-end against the real database, not just that the SQL
    parses. (`notify_farmer_low_stock` wasn't separately exercised in the script, but is
    structurally identical to the other two.)
  - `low_stock_products`'s `security_invoker` view genuinely respects the querying user's
    own RLS on `products`, not the view owner's.
  - promotions/delivery_zones/reviews/notifications/messages all correctly reject
    cross-user writes and impersonation attempts, and correctly allow the owning user's own
    reads/writes.
  - Test users and every row they created (including the throwaway conversation/messages)
    were confirmed cleaned up afterward.
- `npm install` (to resync `package-lock.json` after installing-then-removing
  `expo-sharing`) — failed on a **pre-existing** peer-dependency conflict between
  `expo-router`'s bundled web-only `@radix-ui/*`/`vaul` deps and the installed `react`
  version, unrelated to anything in this phase. `package-lock.json` still has a few stray,
  inert `expo-sharing` entries as a result (nothing imports it, `package.json` and
  `app.json` no longer reference it, and both `expo export` runs above already succeeded
  against this exact lockfile state) — flagging rather than forcing a `--legacy-peer-deps`
  resolution that's out of scope for this phase.

**Could not do:** click through the new screens in a running app with real data. Checkout
and household-side message-initiation don't exist (both explicitly out of scope, per the
project's own precedent from phase 8), so Orders/Messages/Notifications will show real,
correct *empty states* in actual use, not populated ones — that's the correct behavior per
the design requirements, not a bug, but it does mean visual QA of the populated states relied
on the RLS script's synthetic data and careful reading, not an actual device screenshot.

## Open questions or decisions that had to be guessed

- Whether "Promotions" deserves its own screen eventually, distinct from being a section
  inside Insights & Growth — the spec never describes one, so none was built.
- Whether the bulk "Update price" action should eventually support a relative/percentage
  adjustment instead of (or alongside) one flat price — built literally to the spec's own
  wording for now.
- Whether verification's "phone verified" signal should become a real dedicated column
  (e.g. via a future SMS re-verification flow) rather than inferring it from
  `profiles.phone is not null` — flagged above, not blocking today.
- Whether farm photo should eventually get its own storage bucket instead of sharing
  `product-photos` — functionally fine today (same `{userId}/...`-scoped RLS pattern), but
  worth a decision if a "delete all my listing photos" bulk action is ever built, since it
  would need to specifically exclude the farm photo's path.
- Whether cancelling an order should become a farmer-facing action — the `cancelled` status
  value now exists in the schema (for completeness) but nothing in the UI can reach it yet;
  not asked for, not built.

## What's next

The natural next phase is what this one explicitly didn't touch: real cart → checkout →
Paystack payment → order creation (which is what would finally put real data behind Orders,
Messages, and Notifications), household-side review submission and conversation-starting,
and the routing-gate/resume-logic phase that's been skipped since phase 4. All schema this
phase adds (`promotions`, `reviews`, `delivery_zones`, `conversations`, `messages`,
`notifications`, plus the orders status flow) is already built and RLS-tested specifically
so that phase doesn't need its own migration pass to get started.
