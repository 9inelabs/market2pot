# Report 11 — Home tab redesign, categories table, cart badge, refresh flicker

First slice of a larger queue (see "Still queued" at the end). Covers the Home tab
redesign and the categories work that gates it, plus the two bugs that live inside the
Home header being rebuilt.

## What was built, by file

**Database**

- `supabase/migrations/20260824090000_categories.sql` — `categories (id, name unique,
  sort_order, created_at)`, RLS on, a single public `select using (true)` policy and
  deliberately no write policy (reference data is curated in migrations), seeded with the
  eight categories in the given order. **Pushed to the linked project and verified live**
  via the REST API — all eight rows return in `sort_order`.
- `src/lib/database.types.ts` — regenerated. Ended cleanly this time; the stray
  telemetry-shutdown line this repo usually has to strip did not appear.

**Categories, one source**

- `src/hooks/useCategories.ts` (new) — the only place the app learns what categories
  exist. Module-level cache, since this is reference data that changes only in a
  migration: the first screen pays for the fetch, every screen after it renders chips on
  the first frame instead of flashing empty.
- `src/hooks/useFreshProducts.ts` — `useProductCategories` **deleted**. It built the chip
  row from `select distinct category` over live listings, so the row changed shape as
  listings came and went.
- `app/(app)/(tabs)/search.tsx`, `app/(app)/categories.tsx` — repointed at `useCategories`.
- `src/screens/ListingFormScreen.tsx` — the free-text category `TextField` is now a chip
  radio group fed from the table. Chips (not a picker) because the form is already a
  flat scroll of labelled fields with no modal pattern anywhere in it, and eight short
  labels wrap into two rows without one. 44pt minimum tap target on each chip even though
  it reads smaller.

**Home tab**

- `src/components/app/home/HouseholdHome.tsx` — rebuilt to the reference: green header
  bleeding to the physical top (safe-area inset applied *inside* it, so the status bar
  sits on the green) with rounded 28pt bottom corners, avatar + greeting + heavy name +
  two white circular icon buttons with badges, translucent location pill, white search
  bar, dark "Have produce to sell?" banner; then the cream body with Farmers Near You,
  the category chip row, Fresh Picks, and a hard 3-up product grid.
- `src/components/app/home/HomeProductCard.tsx` (new) — the 3-up card. Kept separate from
  the shared `ProductCard` on purpose: that one is the 2-up card Search, Categories and
  Farmer Profile render, and restyling it would have silently changed four other screens.
- `src/components/app/FarmerCard.tsx` — green avatar ring, gold View pill, and
  `isVerified` now actually gates the badge and the "Verified farmer" line. It was
  previously accepted and ignored, so every card rendered as verified; the reference's
  second card has neither.
- `src/lib/titleCase.ts` (new) — the header name is normalised to initial caps regardless
  of how it was typed at sign-up. Keeps internal capitals in hyphenated and apostrophed
  names ("Ade-Bello", "O'Neill").

**Cart badge**

- `src/store/useCartStore.ts` (new) + `src/hooks/useCart.ts` (rewritten as a thin wrapper).

**Refresh flicker**

- Twelve hooks in `src/hooks/` (see below).

## Bugs found and fixed

1. **Cart badge kept a stale count ("I cleared the cart and it still shows 1").** Root
   cause: `useCart()` was a plain `useState` hook called from **six separate places** —
   Home (via `useProductQuickView`), Cart, Checkout, Payment, Product detail, Welcome
   Back. Each call site held its *own* copy of the cart. Clearing on the Cart screen
   mutated that screen's copy only; Home's badge kept rendering the old array until
   something unrelated happened to refetch. Fixed by moving the cart into a Zustand store
   (matching `useAuthStore`), so all six consumers read one array and a single mutation
   updates them in the same tick. `clear()` empties local state *before* the round trip so
   badges drop to zero immediately. `addItem`'s full signature —
   `(productId, farmerId, quantity, options?: {clearFirst})` returning the
   `'needs-clear-confirmation'` sentinel — is preserved exactly, since five screens depend
   on it to decide when to raise the "switch farmers?" dialog.
2. **A Realtime subscription now backs the badge**, opened once at module level rather than
   per-component (six mounts would otherwise mean six channels). This is what makes the
   count correct when the cart is emptied server-side — checkout clears it from an Edge
   Function, which no amount of local state would have noticed.
3. **The 20-second auto-refresh visibly blinked.** `useAutoRefresh` re-runs `refresh()`
   every 20s; the hooks it drives were each calling `setLoading(true)` at the top of that
   refetch, and the screens render `loading ? null : <list/>`. So every 20 seconds the
   list *unmounted and remounted* — the flash. Fixed in twelve hooks
   (`useFreshProducts`, `useConversations`, `useHouseholdOrders`, `useFarmerOrders`,
   `useNotifications`, `useBestSellers`, `useActivePromotions`, `useUpcomingHarvest`,
   `useLowStockProducts`, `useFarmerStats`, `useMyListings`, `useDeliveryLocation`):
   `loading` now means "the first load hasn't finished" and nothing else, so a background
   refresh swaps data underneath a rendered list without it ever going empty. Covers Home,
   Messages, Products and Orders. `useProductSearch` was deliberately left alone — its
   `loading` is driven by the user's own typing, where a spinner is correct.

## Judgment calls on the reference image

Two places where the written spec and the image disagree. **I followed the image in both**,
since "match this image precisely — spacing, colors, proportions" was the stated rule and
the image is unambiguous. Both are a one-line change if you want it the other way:

- **The search bar does not straddle the green/cream boundary.** The written spec asks for
  it half in the header and half over the cream "exactly like the reference image" — but in
  the image the search bar sits wholly inside the green, with the dark "Have produce to
  sell?" banner *below* it and still on green, and the green ending well under both. To
  straddle it, the green would have to end around the search bar, which leaves the banner
  stranded on cream.
- **The product image area is 106x85, not square.** The spec says "square image area"; the
  reference's image blocks are consistently ~1.25:1. At three cards across, a square crop
  makes the card noticeably taller than the reference's.

Other calls:

- **The dark "Have produce to sell?" banner** is in the image but absent from the written
  spec. Kept it (it already existed as a terracotta card) and restyled it dark to match.
- **The verified mark is a `check-circle`**, per the words "verified checkmark badge". At
  the reference's ~10px the glyph honestly looks more like the brand leaf; say the word and
  it becomes `LeafMark`.
- **Chips show the real eight category names**, not the image's shorter placeholder set
  ("Grains", "Poultry", "Proteins"), per the instruction to pull from the table.
- **"Axis • Lekki, Lagos"** — "Axis" is not a literal. It's `farm_locations.address_line`,
  which is free text; the format is `address_line • lga, state`.
- **`products.category` stays a text column holding the name** rather than becoming a FK to
  `categories.id`. A FK would mean backfilling every existing listing whose free-text
  category doesn't match one of the eight, and rewriting every `.eq('category', name)`
  filter. The stated requirement — the list itself living in exactly one place — is met:
  no UI can invent a category any more.
- **Placeholder copy ignored as instructed** — real product names, units and prices from
  the existing data, no repeated "Fresh Tomatoes" or "Unit • Paint".

## Verification

```
npx supabase db push                  # applied 20260824090000_categories.sql
curl .../rest/v1/categories           # all 8 rows, correct order, anon-readable
npx supabase gen types typescript     # clean, no stray telemetry line
npx tsc --noEmit                      # clean
npx expo export --platform android    # bundles clean
npx expo start                        # boots clean, Metro ready, no errors
```

**Not verified on a screen.** No emulator or `adb` here, so the redesign has not been
looked at running. Given this repo's history that is a real gap, not a formality.

## Still queued

Not started, in the order you gave them:

1. Full notification system (push token registration, `send-notification` Edge Function,
   nine triggers, preferences, household screen, realtime badges) — **blocked on the
   questions raised in chat**, chiefly the pg_net/pg_cron setup and a `status` value that
   doesn't exist in this schema.
2. Messages: reply button only while the thread has an unread message.
3. Notifications screen: opening it clears the badge, rather than per-notification.
4. Payment "something went wrong" — diagnosis delivered in chat, fix not applied per your
   instruction to report the cause first.
5. Informational notes throughout the app.
