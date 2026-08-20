# Phase 8 — Full Consumer Experience + Escrow Payments

Closes the loop the farmer-side phase left open: browse → product overlay → product detail
→ real persistent cart → checkout → in-app Paystack payment → escrow hold → dual-confirmation
delivery → automatic fund release (or refund on cancellation) → track order → real
household-side messaging with attachments/emoji/typing/reply → notifications → delivery
address editing. Built against a plan the project owner approved via Plan Mode before any
code was written; the approved plan is preserved at
`C:\Users\Auditor DeMoon\.claude\plans\virtual-conjuring-blanket.md`.

## Decisions confirmed before building

Four architectural questions were asked and answered before writing any code, since this
phase moves real money:

1. **Paystack only**, not Paystack + Flutterwave — reuses the existing secret key and
   Edge Function patterns from the farmer signup phase.
2. **One farmer per cart** — adding a product from a different farmer prompts to clear the
   cart first. Keeps the entire escrow model to 1 payment = 1 order = 1 farmer = 1
   release/refund event.
3. **In-app WebView checkout** (`react-native-webview`, new dependency) over an
   external-browser + deep-link handoff.
4. **Order stages**: Pending → Preparing → Packaged → Out for Delivery/Ready for Pickup →
   Delivered, where "Delivered" is never set directly by either party — it's computed the
   instant both confirmations are in.

## What was built, by file

### Migrations (12, all applied via `npx supabase db push --linked`, types regenerated via
`npx supabase gen types typescript --linked`)

- `20260821090000_products_description.sql` — `products.description`.
- `20260821090100_cart_items.sql` — real persistent cart, owner-only RLS.
- `20260821090200_orders_escrow.sql` — the core hardening migration: adds
  `farmer_confirmed_at`/`household_confirmed_at`/`paystack_recipient_code`, extends the
  status CHECK constraint with `'packaged'`, adds a `payment_status` CHECK constraint
  (`pending|paid_held|released|refund_pending|refunded`), and — the important part —
  **drops `orders_insert_household`, `orders_update_household`, and
  `order_items_insert_via_own_order` entirely**, then revokes table-wide UPDATE on `orders`
  and re-grants only `status`. Order creation and every escrow-sensitive transition now
  requires going through a service-role Edge Function; a client can no longer construct an
  order with a fabricated total, or write `payment_status`/the confirmation timestamps
  directly. The farmer's advance policy now also blocks `'cancelled'` in addition to
  `'delivered'` (cancellation has real side effects — a refund-request notification — that a
  bare status write would silently skip).
- `20260821090300_payouts_refunds.sql`, `20260821090400_bank_accounts_recipient_code.sql` —
  disbursement/refund audit trail tables (owner-read-only, no client write policy at all —
  service role only) and a cached Paystack transfer-recipient code column.
- `20260821090500_messages_attachments_reply.sql` — `attachment_url`/`attachment_type`/
  `reply_to_id` on `messages`, new `message-attachments` storage bucket.
- `20260821090600_notifications_escrow_types.sql` — extends the notification type
  CHECK constraint; drops `notify_farmer_new_order` (see Deviations below).
- `20260821090700_notifications_related_id.sql` — `notifications.related_id` (nullable,
  untyped — points at an order in most cases, a conversation for `new_message`), plus a new
  `notify_on_new_message` trigger that notifies whichever participant didn't send the
  message.

### Edge Functions (6 new, deployed via `npx supabase functions deploy ... --use-api`)

All follow the `withSupabase`/read-as-text-then-parse pattern already established by
`resolve-account`/`submit-bank-account` last phase. New shared modules:
`supabase/functions/_shared/paystack.ts` (the one place that knows Paystack's
request/response shapes — initialize/verify transaction, create transfer recipient,
initiate transfer, HMAC-SHA512 webhook signature verification via Web Crypto),
`_shared/payoutHelpers.ts` (recipient-code caching), `_shared/escrow.ts` (the actual
"both sides confirmed, release the funds" logic, shared by both confirm functions so the
single most money-sensitive piece of logic in this app exists in exactly one place).

- **`initialize-checkout`** — the only path that creates an order. Validates the cart is
  single-farmer, computes subtotal (applying any active promotion discount per line) +
  delivery fee server-side, creates `orders`/`order_items` via the service role, calls
  Paystack's `/transaction/initialize`.
- **`paystack-webhook`** (`verify_jwt: false`, HMAC-verified) — the actual source of truth
  for payment success, not the WebView's client-side redirect. Idempotent (only acts the
  first time an order is seen `payment_status = 'pending'`).
- **`confirm-order-delivered`** / **`confirm-order-received`** — set their respective
  confirmation timestamp, then call the shared escrow-release check.
- **`cancel-order`** (farmer-only) — sets `status = 'cancelled'`; if funds were held,
  flips to `refund_pending` and notifies the household.
- **`process-refund`** (household-only, once they have a `bank_accounts` row) — sends the
  refund Transfer, reusing the exact same bank-details infrastructure the farmer payout flow
  established (the table was always profile-scoped, not role-scoped).

Idempotency in both the release and refund paths is enforced via a conditional
`UPDATE ... WHERE payment_status = 'X' ... SELECT` — a second near-simultaneous call finds
nothing left to claim and skips the transfer, rather than racing two disbursements.

### Data layer (`src/hooks/`, `src/lib/`)

New: `useCart` (real, `cart_items`-backed — replaces the deleted local-only
`useCartStore`), `useProductQuickView` (shared open/close/addToCart/viewFull wiring for
every product-grid screen), `useProductSearch`, `useHouseholdOrders`, `useConversations`
(generalized to take a `role` param, used by both farmer and household inboxes now),
`useMessages` (extended with attachment/reply-to send args and a Realtime Broadcast typing
channel on the same per-conversation channel), `useOrderDetail` (extended with
`isViewerFarmer`/`isViewerHousehold` and the three new escrow actions), `useFarmerPromotions`
etc. from last phase reused as-is. `src/lib/orderStatus.ts` extended for the 5-stage flow;
`src/lib/conversations.ts` (`findOrCreateConversation`, used by every "Message" entry
point now that household-side messaging is real); `src/lib/messageAttachmentUpload.ts`
mirrors `productPhotoUpload.ts`; `src/lib/shareProfile.ts` unchanged from last phase.

### Product browsing (`ProductQuickViewModal`, `ProductGrid`, `ProductCard` extended)

Tapping any product anywhere in the app (Home, Search, Categories, Farmer Profile) opens a
bottom-sheet-style overlay: photo carousel, a quantity stepper bounded by
`quantity_available`, Add to Cart (with the clear-cart confirmation when switching farmers),
and "View full details" → `app/(app)/product/[id].tsx` (full gallery, description, a
"Sold by" link to the farm). `ProductCard.tsx`'s `onAddPress` (a bare increment) became
`onPress` (opens the overlay) — a real quantity now has to be chosen, not implied.

### Search (`app/(app)/(tabs)/search.tsx`) + Categories (`app/(app)/categories.tsx`)

Both real now — debounced `ilike` search across name/category, and a real category-chip +
grid browse screen. Both converge on the same `ProductGrid`/overlay pattern as Home.

### Cart (`app/(app)/cart.tsx`) + Checkout (`app/(app)/checkout.tsx`)

Cart: real persistent lines, per-line quantity stepper/remove, subtotal, empty state with a
"Browse products" escape hatch. Checkout: pickup vs. delivery (zone picker sourced from the
farmer's real `delivery_zones`), a live order summary, and the escrow-safety copy the
project owner explicitly required households see before paying — explained in plain terms
that funds are held until both sides confirm delivery, and refunded automatically only if
the farmer cancels.

### Payment (`app/(app)/payment/[orderId].tsx`) + confirmation (`app/(app)/order-confirmation.tsx`)

WebView loads Paystack's hosted checkout; `onShouldStartLoadWithRequest` intercepts the
callback URL before it ever actually loads, then the screen polls the order's own
`payment_status` a few times (the webhook may lag a second or two behind the redirect)
rather than trusting the redirect alone. Clears the cart only once `paid_held` is confirmed.

### Track Order / Order Detail (`app/(app)/order/[id].tsx`, `useOrderDetail` extended)

One shared screen, branching its bottom action area by viewer role
(`isViewerFarmer`/`isViewerHousehold`) rather than two separate screens — avoids duplicating
the stepper/items/customer-card layout. Farmer: the existing plain-advance button through
Packaged, then "Product Delivered" once at the pre-delivery stage, plus a new "Cancel order"
link. Household: "Product Received" (behind a confirmation dialog spelling out that this
releases payment), a refund-pending banner with a link to submit bank details once the
farmer cancels a paid order, and a "Refunded" confirmation once that completes.

### Orders tab (`app/(app)/(tabs)/orders.tsx`) — now real for both roles

Household branch was a placeholder; now a real filtered list mirroring the farmer list's
own filter-chip pattern, via the new `useHouseholdOrders` hook. `OrderPreviewRow`'s
`householdName` prop was generalized to `title` (farmer's list shows the customer's name,
household's list shows the farm's name — same row shape either way).

### Messages — real for both roles now, plus attachments/emoji/typing/reply

Household inbox was a placeholder; now real via the generalized `useConversations`. Chat
thread gained: an image attachment picker (`expo-image-picker` + the new
`message-attachments` bucket), a quick-pick emoji row (no native picker library — plain
unicode text already works in `TextInput`), a typing indicator (Realtime Broadcast, never
persisted), and long-press-to-reply with a quoted preview both above the input and inside
the replying bubble. Every "Message this farmer" entry point (Farmer Profile, Track Order)
now calls `findOrCreateConversation` instead of routing to a placeholder tab.

### Notifications — real routing for the new lifecycle types

`routeFor` now deep-links order-lifecycle notification types to the specific order via
`related_id`, and `new_message` to the specific conversation — both were previously
impossible (the table had no way to reference a specific record).

### Delivery address editing (`app/(app)/change-location.tsx`)

Was a placeholder; now real, reusing the exact same
permission-rationale-then-detect-then-reverse-geocode hook (`useLocationDetection`) the
onboarding `consumer-location.tsx` screen already established, writing an `upsert` instead
of the signup step-machine's insert.

### Add/Edit Product — small addition

Farmer-side `ListingFormScreen.tsx` gained the new `description` field (multiline, optional)
so Product Detail actually has something to show beyond name/category/unit.

## Deviations from the plan, and why

- **`notify_farmer_new_order` (fired on `orders` INSERT) was dropped, not extended.** An
  order row now exists before it's ever paid for (`initialize-checkout` creates it, then
  Paystack is called) — notifying the farmer on raw insert would fire for every abandoned or
  never-completed checkout attempt. `paystack-webhook`'s `order_paid` notification (fired
  only once payment is actually confirmed) replaces it as the farmer's "you have a new
  order" signal.
- **Both `orders_insert_household` and `order_items_insert_via_own_order` were dropped
  entirely**, not narrowed — this was in the plan's schema section but is worth restating
  here because it's a genuine behavior change from last phase: a client can no longer
  create an order or order line at all, by design, now that pricing has to be
  server-computed.
- **The household's `orders_update_household` policy was dropped too**, which the plan's
  schema section didn't explicitly call out. Once every escrow-sensitive transition moved
  to Edge Functions, a household had no legitimate remaining reason to write to `orders`
  directly — leaving the policy in place would have let a household set
  `status`/`payment_status` via a raw client `UPDATE`, bypassing the escrow logic outright.
- **Track Order and the farmer's Order Detail are one shared, role-branching screen**, per
  the plan's own leaning — confirmed correct once built, since the stepper/items/customer-
  card layout really is identical either way.
- **A full "leave a review" submission flow was not built.** The `reviews` table/RLS already
  supports a household inserting one against their own delivered order (verified last
  phase), and Track Order's household branch would be the natural place to add a "Leave a
  review" prompt once an order reaches `delivered` — flagged as a clear next step, not
  silently skipped.

## Bugs found and fixed

- **`supabase gen types typescript ... > file` captures the CLI's own stdout-written
  telemetry-shutdown error, not just the generated types** — hit this twice this session (once
  per regeneration). The stray `{"_tag":"Error",...}` line lands at the very end of the file
  regardless of whether `2>&1` is used, because the CLI writes it to stdout itself, not
  stderr. `tsc` catches the resulting parse error immediately (`';' expected`), but it's worth
  documenting here directly: after every `supabase gen types` run in this repo, check the
  file's last line before trusting it compiles.
- **Two now-outdated `scripts/test-rls.ts` assertions from last phase's original orders
  policies** (`orders INSERT (own household)` expecting 1 row, `orders UPDATE (own household
  order)` expecting 1 row) had to be rewritten to `assertRejected`/`assertZeroRows` once this
  phase's migration dropped those policies — a direct, expected consequence of the schema
  hardening above, not a bug in the new code, but worth noting since it demonstrates the test
  suite is actually exercising the real policy set rather than being independently
  hand-maintained truth.
- **A no-op double-nested `Pressable` in the very first draft of the checkbox-select
  interaction pattern** (carried over from last phase's `ListingRow`, not reintroduced this
  phase) was already fixed before this session began — not a new bug, mentioned only because
  the same "wrap a control that already has its own `Pressable` in another `Pressable`"
  mistake was deliberately avoided when building this phase's long-press-to-reply gesture.
- No other bugs surfaced by `tsc` this phase beyond routine incremental fixes (a couple of
  `spacing[]` scale misses, a computed-key object-spread type-widening issue in the business-
  hours editor last phase) — everything else was caught either at compile time or by the live
  RLS/escrow test run.

## Verification: exact commands run and their results

- `npx tsc --noEmit` — clean, checked after each major file group.
- `npx expo export -p android --output-dir <tmp>` — succeeded, **2245 modules** (up from
  2227 after the farmer-side phase). Temp directory deleted afterward.
- `npx expo export -p ios --output-dir <tmp>` — succeeded. Temp directory deleted afterward.
- `npx expo-doctor` — 20/21, same pre-existing patch-version-drift category as every prior
  phase (now 9 packages, since `expo-file-system` joined the list — not introduced by this
  phase's own dependency, `react-native-webview` installed clean).
- `npx tsx scripts/test-rls.ts`, extended with `cart_items`, `payouts`, `refunds`, and
  rewritten assertions for the hardened `orders`/`order_items` policies — **all assertions
  passed** against the live database, including:
  - A client-side `orders`/`order_items` INSERT is now rejected outright, even for the
    caller's own would-be order — confirms pricing genuinely can't be forged from the
    client any more.
  - A household's direct `orders` UPDATE now affects 0 rows even on their own order —
    confirms escrow-sensitive writes only happen through Edge Functions.
  - The farmer's advance policy correctly allows a non-delivered status change but rejects
    setting `delivered` directly, exactly as last phase, now re-verified against the
    extended constraint set.
  - `cart_items`/`payouts`/`refunds` all correctly enforce owner-only read and reject
    cross-user access and any direct client write (payouts/refunds have no `authenticated`
    write policy at all).
  - Test users and every seeded row (including payouts/refunds rows created for this run)
    confirmed cleaned up afterward.
- Deployed all 6 Edge Functions via `npx supabase functions deploy ... --use-api`, then
  smoke-tested two live without spending real money: `paystack-webhook` with a bogus
  signature returned `401 {"error":"Invalid signature"}` (confirms the HMAC check is live
  and correctly rejecting), `initialize-checkout` with no auth header returned
  `401 UNAUTHORIZED_NO_AUTH_HEADER` (confirms `verify_jwt: true` is active). Full
  charge/transfer execution requires the project owner's own Paystack test credentials with
  Transfers enabled — flagged clearly below, not silently assumed working.
- `npx expo start` — confirmed healthy (`packager-status:running`) on a fresh port, then
  stopped.

**Could not do:** exercise a real Paystack charge or Transfer end-to-end (would require a
funded test account and real webhook delivery from Paystack's servers, which only the
project owner can set up), and could not visually click through the populated states of
every new screen in a running app with real data for the same reason as last phase —
though this phase is exactly what makes real data possible going forward, once payments
are actually tested.

## Open questions or decisions that had to be guessed

- Whether "Leave a review" belongs on Track Order once an order reaches `delivered`, or as
  a separate flow reached from Orders — not built either way this phase, flagged above.
- Whether the emoji quick-pick row's fixed 15-emoji set is sufficient, or whether a fuller
  picker (with search/categories) is worth it later — built to the "quick way to insert one
  without switching keyboards" reading of the request, not a full picker library.
- Whether `useFarmerStats`'s "This Week" total should now filter to
  `payment_status IN ('paid_held','released')` given a real payment state exists — flagged,
  not changed, since it wasn't explicitly asked for this phase either.
- Whether farm photo (last phase) and message attachments (this phase) sharing/reusing the
  `product-photos`/pattern-alike buckets respectively is fine long-term, or whether a
  storage cleanup pass matters once real volume exists — noted, not addressed.

## What's next

Real money can now move through the app once the project owner supplies live Paystack
credentials with Transfers enabled and configures the webhook URL in their Paystack
dashboard (`<SUPABASE_URL>/functions/v1/paystack-webhook`). Natural next steps: a "Leave a
review" flow on delivered orders, `useFarmerStats` filtering by real payment state, and
whatever surfaces once the first real end-to-end order is placed and tracked.
