# Phase 6 — Post-Signup App Shell (Bottom Tabs, Home, Listings, Farmer Profile, Register-as-a-Farmer, Settings)

Builds the full navigable app reached once sign-up completes: role-aware bottom tabs, both
Home variants (household and farmer), My Listings + add/edit listing, the household-facing
Farmer Profile screen, a "Register as a farmer" flow for existing consumers, and a real
Settings screen — all wired to live Supabase data. Search, Orders, and Messages are
correctly-styled placeholders, per the explicit scope for this phase.

## Questions asked before building, and the decisions made

Four architectural conflicts between the prompt and what's already shipped were raised before
any code was written, since guessing wrong would have meant real rework against a live,
Paystack-integrated schema:

1. **`farmer_profiles`'s bank fields vs. the existing `bank_accounts` table.** Chosen: reuse
   `bank_accounts` — `farmer_profiles` has no bank columns of its own. "Verified farmer" is
   computed from `bank_accounts.verification_status` via a new public view (see below), not
   stored redundantly.
2. **`profiles.role` (fixed at signup) vs. the prompt's "household is the base identity,
   farmer is an optional add-on" model.** Chosen: keep `role` exactly as-is; add `active_view`
   on top, defaulting to match `role`. Existing fully-onboarded farmers got a `farmer_profiles`
   row backfilled automatically.
3. **Household location** — reuse the existing `delivery_locations` table (already populated by
   consumer signup) rather than adding new `location_text`/`lat`/`lng` columns to `profiles`.
4. **Design system** — reuse the app's existing typography (Archivo Expanded reserved for
   Welcome only) and FontAwesome5 icon set, rather than introducing Sora/Plus Jakarta Sans and
   `lucide-react-native` as the prompt specified.

All four were confirmed before building. See the conversation for the full reasoning; the
summary above is what actually shipped.

## What was built, by file

### Migrations (all applied via `npx supabase db push --linked`)

- `20260817160000_profiles_active_view.sql` — new `profile_view` enum (`household`/`farmer`),
  `profiles.active_view` column, backfilled from `role` for every existing row.
- `20260817160500_farmer_profiles.sql` — `farmer_profiles` (`profile_id` unique FK, `farm_name`,
  `bio`; no bank columns). Public-read RLS, owner-only insert/update. Backfilled a row for every
  existing `role = 'farmer', step = 'complete'` profile, using `full_name` as a placeholder
  `farm_name` (no distinct farm name was ever collected in the original signup flow).
- `20260817161000_products.sql` — `products` table. RLS: public read when `is_available = true`
  *or* the querying user owns the farmer_profiles row; owner-only insert/update/**delete** (the
  one table in this project with a real delete policy, since My Listings needs a genuine
  delete action).
- `20260817161500_orders.sql` — `orders` + `order_items`. Household can select/insert/update
  their own orders; farmer can only select (not write) orders where they're the farmer;
  `order_items` access follows the parent order's ownership. Both tables exist now but nothing
  writes to them yet — order creation is explicitly the next phase.
- `20260817162000_farmer_verification_view.sql` — `farmer_verification`, a view over
  `bank_accounts` exposing only `(profile_id, is_verified)`. `bank_accounts` itself deliberately
  has no public-read policy (raw bank details must never be exposed to a browsing household);
  this view is the "restricted view" an earlier migration's own comment had already anticipated
  needing. Created without `security_invoker`, so it runs as the migration role (which bypasses
  RLS) and exposes only the derived boolean — verified directly against a live query as an
  unrelated authenticated user (see Verification below).
- `20260817163000_product_photos_storage_bucket.sql` — `product-photos` bucket, same
  public-read / `{user_id}/...`-scoped-write pattern as the existing `avatars` bucket.

### Data layer

- `src/store/useAuthStore.ts` — extended with `farmerProfile` (fetched alongside `profile` in
  the same `fetchProfile()` call) and `setActiveView()`. **Presence of `farmerProfile`, not
  `profile.role`, is what actually gates farmer screens/tabs** — this is the concrete
  implementation of decision #2 above.
- `app/(auth)/verify.tsx` — the signup completion update now also sets `active_view` alongside
  `role`.
- New hooks: `useNearbyFarmers`, `useFreshProducts` (+`useProductCategories`),
  `useDeliveryLocation`, `useMyListings`, `useFarmerStats`, `useFarmerOrders`, `useFarmerDetail`.
  All do their own client-side joins across `farmer_profiles`/`profiles`/`farm_locations`/
  `farmer_verification` — PostgREST can't auto-embed a view or unrelated tables, so this is
  deliberate, not an oversight.
- `src/lib/functionError.ts` — the duck-typed Edge-Function-error-message extractor, extracted
  out of `(profile)/bank-details.tsx` (where it was fixed twice this session — see phases 5's
  report) into a shared module, since the new Settings/Register-as-a-farmer bank screens need
  the identical, already-hardened logic.

### Navigation shell

- `app/(app)/_layout.tsx` — Stack wrapping the tab navigator and every full-screen route pushed
  on top of it. A minimal auth guard (redirects to onboarding if there's no live session) — not
  the real resume-at-step routing gate, which is still a separate, not-yet-built phase.
- `app/(app)/(tabs)/_layout.tsx` — the actual `Tabs` navigator. Uses `Tabs.Protected` (a real
  expo-router 6 API, confirmed against the installed version's type definitions before using it)
  to conditionally include `search` (household) vs. `listings` (farmer); `orders`/`messages`/
  `profile` are shared. `index` (Home) is a single route that branches its rendered content by
  `active_view` — the same pattern `identity-name.tsx` already uses for `role` — since a tab
  can't point at two different files depending on runtime state.
- `app/(app)/(tabs)/index.tsx` — the Home dispatcher (renders `HouseholdHome` or `FarmerHome`).

### Shared app-shell components (`src/components/app/`)

`SectionHeader`, `EmptyState`, `FarmerCard`, `ProductCard`, `StatCard`, `QuickAccessItem`,
`SettingsRow`, `ListingRow` — small, reused across Home, Listings, Farmer Profile, and Settings.
`src/lib/currency.ts` (`formatNaira`), `src/lib/freshness.ts` (`"Picked today"`/`"Harvested N
days ago"`), `src/lib/greeting.ts` (time-of-day greeting) back these.

### Household Home (`src/components/app/home/HouseholdHome.tsx`)

Built to match `assets/materials/Home page.png` directly: greeting + name, notification bell
(static, TODO'd), cart icon with a live badge from a new local-only `useCartStore` (no real cart
— explicitly out of scope), tappable location pill (reads `delivery_locations` via
`useDeliveryLocation`), tappable search bar, the "Register as a farmer" banner (shown only when
`!farmerProfile`), a quick-access row, real category chips (distinct `products.category` values)
that filter Fresh Picks in place, "Farmers Near You" (real `farmer_profiles`, horizontal scroll),
and "Fresh Picks" (real available `products`, 2-column grid with the freshness badge). Pull to
refresh re-fetches everything. Empty states for no farmers/no products.

### Farmer Home (`src/components/app/home/FarmerHome.tsx`)

No mockup existed for this — built to match the household variant's structure/spacing, per the
instruction to use it as context. Greeting with real `farm_name`, three real stat cards (active
listings, pending orders, this week's order total — all correctly read as 0 until order
creation exists), "Add New Listing" button, quick-access row, "Recent Orders" preview (real,
empty for now), "My Listings" preview (real, top 3, with a working availability toggle).

### Listings (`app/(app)/(tabs)/listings.tsx`) + add/edit (`src/screens/ListingFormScreen.tsx`)

Full list of the farmer's own products (available or not), each row with a working availability
`Switch` and a real delete action gated behind a `ConfirmDialog` (destructive variant — see
below). The add/edit screen is one shared component (`productId?` prop) reused by both
`app/(app)/listing/add.tsx` and `app/(app)/listing/[id].tsx`; photo upload uses the *correct*
`expo-file-system` `File` pattern from the start (see phase 5's report for why
`fetch(uri).arrayBuffer()` is the wrong approach on React Native).

### Farmer Profile (`app/(app)/farmer/[id].tsx`) — household-facing

Header (avatar, name, verified badge from `farmer_verification`, location, Message button →
Messages placeholder, a local-only heart/save toggle), bio, a real grid of the farmer's active
listings, and "No reviews yet" (the review system doesn't exist yet, per explicit scope).

### Register as a farmer (`app/(app)/register-farmer/*.tsx`)

Three screens: `farm-details` (new — nothing in the original signup flow ever collected a
distinct farm name), `location` (reuses `useLocationDetection` + `ConfirmDialog`, same UI/copy
as the original `farm-location.tsx`), `bank-details` (reuses the exact same auto-resolve +
`submit-bank-account` pattern as the original `bank-details.tsx`). A new
`useRegisterFarmerStore` (Zustand) holds the in-progress farm name/bio across the three screens
rather than round-tripping them through route params. On the final bank step's success: creates
the `farmer_profiles` row, sets `active_view = 'farmer'`, refetches the auth store, and lands on
the tab navigator (which now shows Farmer Home). **Deliberately reuses hooks/components, not the
original signup pages themselves** — `farm-location.tsx`/`bank-details.tsx` are tightly coupled
to the onboarding step-machine (they write `profiles.step` and hardcode their next route), and
reusing them wholesale for an already-onboarded user risked corrupting that state.

### Settings (`app/(app)/(tabs)/profile.tsx` + `app/(app)/settings/*.tsx`, `app/(app)/language.tsx`)

Grouped list matching the spec's structure: Edit Profile (real — updates `profiles.full_name`,
and `farmer_profiles.farm_name`/`bio` if applicable), Phone Number (display-only, per spec),
Language (placeholder), Notifications toggle (local state, TODO'd), Payout & Bank Details
(farmer-only, real — reuses the same resolve/submit-bank-account pattern; `submit-bank-account`
already upserts on `profile_id`, so this correctly *replaces* an existing payout account), the
Shopping/Selling switcher (only shown once `farmerProfile` exists — otherwise a "Register as a
Farmer" row in its place), Help & Support (static), Terms & Privacy (two rows, linking the
already-existing `/terms` and `/privacy` placeholder pages), Log Out (real, `ConfirmDialog` →
`supabase.auth.signOut()`), Delete Account (real destructive `ConfirmDialog`; confirming shows an
honest "not available yet, contact support" message — the deletion logic itself is a TODO, per
the explicit instruction that it needs its own careful, dedicated pass).

### Placeholders (`src/screens/ComingSoonScreen.tsx` + thin routes)

One shared component, reused for Search, Orders, Messages (tab roots — no back button) and
Categories, Favorites, Cart, Notifications, Change Location (pushed screens — with a back
button). Every out-of-scope tap in this build lands on a real, correctly-styled screen — nothing
is a silent dead tap.

## Deviations from the prompt, and why

- **Icon vocabulary is FontAwesome5, not lucide-react-native** (decision #4).
- **Typography reuses the existing scale**, not Sora/Plus Jakarta Sans (decision #4).
- **Farmer Home has no design reference** — built to visually match the household variant's
  structure (header shape, stat-card row, quick-access row, section pattern) rather than
  inventing an unrelated layout.
- **"Farmers Near You" cards show the farmer's personal name (`profiles.full_name`), not
  `farm_name`.** The one real mockup (`Home page.png`) shows person-style names ("Habeeb Moshood
  A.") with no separate farm-name line — matched that exactly. `farm_name` is used as the
  header on the Farmer Profile detail screen and in Farmer Home instead, where a business
  identity reads more naturally.
- **Terms & Privacy is two rows, not one**, since the app already has two separate real pages
  (`/terms`, `/privacy`) built in an earlier phase — collapsing them under one tap would have
  meant arbitrarily picking which document a user actually reaches.
- **The category chips row filters Fresh Picks in place** (real, in-scope); the **"Categories"
  quick-access tile** opens the placeholder screen — the spec's own text draws this same
  distinction ("Categories (→ category browse placeholder)" as a nav item, vs. "category chips
  ... pulled from ... products" feeding Fresh Picks), so both are built to match, not merged.

## Bugs found and fixed

- **`Tabs.Screen`'s `tabBarIcon` callback type mismatch** — `color` is typed `ColorValue`
  (which includes `OpaqueColorValue` on native), not a plain `string`; the icon helper needed an
  explicit cast. Caught by `tsc`, not a runtime bug.
- No other new bugs this phase — the two real historical bugs this session touches
  (`fetch().arrayBuffer()` for uploads, and the duck-typed Edge Function error parser) were
  already fixed in the previous phase; this phase reused the corrected patterns from the start
  rather than reintroducing them (`productPhotoUpload.ts` uses `File.arrayBuffer()` directly;
  the new bank screens import the shared `extractFunctionErrorMessage`).

## Known gaps — flagged, not silently built around

- **Account deletion is UI-only.** The confirmation dialog and destructive styling are real; the
  actual deletion (cascading data, storage cleanup, removing the `auth.users` row) is
  intentionally not implemented, per the explicit instruction that it needs its own dedicated,
  careful pass.
- **Notifications, Language, and the notification bell are all non-functional by design** — no
  push infrastructure, no locale system, no real notification feed exist yet. Each is flagged
  with a `TODO` comment at its source, not silently stubbed.
- **The cart is entirely local/in-memory** (`useCartStore`) — no persistence, no real product
  data attached to a cart line, no checkout. This matches the prompt's own "local cart state"
  wording for the badge count; a real cart is explicitly next-phase.
- **`orders`/`order_items` have zero real data** — by design, this phase only builds the schema
  and RLS; Farmer Home's stat cards and Recent Orders correctly show 0/empty until order
  creation exists.
- **Farmer Home's "This Week" stat sums `orders.total` regardless of `status`/`payment_status`**
  — the prompt says "held+released order totals," a distinction that doesn't exist yet in this
  schema (no payout-hold state is modeled). Simplified to a plain sum for now; will need
  revisiting once payment/payout status is real.
- **No distance-based sorting for "Farmers Near You."** `farm_locations.latitude/longitude`
  exist, but a household's own `delivery_locations` coordinates aren't guaranteed populated
  (manual-address entry skips reverse geocoding) — farmers are listed newest-first instead of
  pretending to sort by real distance.

## Verification: exact commands run and results

- `npx tsc --noEmit` — clean throughout; re-run after every major file group (migrations/types,
  navigation shell, each screen batch).
- `npx expo-doctor` — `20/21`, same pre-existing patch-version-drift category as every prior
  phase (now 8 packages behind SDK 57's exact patch versions — not introduced by this phase).
- `npx expo export -p android --output-dir <tmp>` — succeeded, **2190 modules** (up from 2139),
  38 assets (unchanged — no new bundled binary assets). Test directory deleted afterward.
- `npx expo export -p ios --output-dir <tmp>` — succeeded, confirming no iOS-specific bundling
  issue. Test directory deleted afterward.
- `npx tsx scripts/test-rls.ts`, extended to cover `farmer_profiles`, `products`, `orders`,
  `order_items`, and the `farmer_verification` view — **51 assertions, all passing**, including:
  - `farmer_profiles`: public read, owner-only insert/update, cross-user insert rejected.
  - `products`: available-or-own read (a farmer sees their own unavailable listings, a stranger
    doesn't), owner-only insert/update/**delete**, cross-user write/delete rejected.
  - `orders`: household read/write own; a user who is only the *farmer* on an order can read it
    but not update it (no farmer update policy exists); a fully unrelated third party sees
    nothing.
  - `order_items`: access correctly follows the parent order's ownership in both directions
    (select and insert).
  - `farmer_verification`: an unrelated authenticated user can read another farmer's
    `is_verified` via the view, while a direct query against `bank_accounts` for the same user
    still correctly returns zero rows — confirms the view doesn't accidentally widen access to
    the underlying table.
  - Cleanup confirmed (test users and their cascaded farmer_profiles/products/orders/order_items
    all removed afterward).
- `npx expo start` — confirmed running and healthy (`packager-status:running` on port 8081) in
  this environment. Could not force a dev-bundle request through that specific already-running
  process within a reasonable timeout to double-confirm from here, but the two full production
  `expo export` runs above are a strictly stronger test (a from-scratch build across the entire
  2190-module graph, which would fail loudly on any resolution/syntax error) and both succeeded.

## Open questions or decisions that had to be guessed

- Whether farmers showing their personal name (not farm name) on browse cards is actually the
  intended long-term identity, or just an artifact of the one mockup provided — flagged above.
- Whether "This Week" should eventually be split into held vs. released totals once a payout
  state model exists, or whether a plain sum remains the intended metric.
- Whether the Shopping/Selling switcher belongs only in Settings (as built) or should also be
  reachable from Home directly — the spec placed it in Settings explicitly, so that's what
  shipped, but it's a one-tap-deeper flow than some apps use for this pattern.

## What's next

The natural next phase is what this one explicitly excluded: product browsing/category screens,
product detail, real cart + checkout + Paystack payment, order creation/tracking, farmer order
status management, real search, real messaging, and the review system. All of the schema this
phase creates (`products`, `orders`, `order_items`) is already built and RLS-tested specifically
so that phase doesn't need its own migration pass to get started.
