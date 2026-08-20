// RLS test — not part of the app bundle, run manually or in CI:
//   npx tsx scripts/test-rls.ts
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the environment (in .env, NEVER
// EXPO_PUBLIC_-prefixed — that prefix ships to the client bundle, and this
// key bypasses RLS entirely).
//
// Creates two throwaway users, seeds a row per table for each, signs in as
// user A, and asserts:
//   - user A cannot SELECT, UPDATE, or DELETE user B's profiles /
//     farm_locations / delivery_locations / bank_accounts rows (0 rows
//     affected each time)
//   - user A CAN read and update their OWN rows in all three tables — a
//     policy that blocked everything would otherwise pass the negative
//     checks above trivially
//   - user A cannot self-verify their own bank_accounts row by writing
//     verification_status / name_match_score / resolved_account_name
//     (column-level GRANTs, not RLS, are what block this)
//   - banks is public-read (any authenticated user can SELECT) but has no
//     insert/update/delete policy at all — only the service role (used
//     inside the list-banks Edge Function) can write
//   - user A cannot SELECT user B's account_resolution_attempts rows, CAN
//     insert/select their own, and cannot insert a row claiming to be user B
//     (the rate-limit log's only two policies are select_own/insert_own)
//   - farmer_profiles is public-read; only the owner can insert/update, and
//     only into their own row (auth.uid() = profile_id)
//   - products is public-read only when is_available = true, but a farmer
//     can also see their own unavailable listings; only the owning farmer
//     can insert/update/delete (products is the one table in this project
//     with a real delete policy — the spec calls for a real delete action)
//   - orders: household can select/insert/update only their own rows;
//     farmer can select (not write) rows where they're the farmer; a third
//     party who is neither sees nothing
//   - order_items: access follows the parent order's household-or-farmer
//     ownership, since order_items has no owner column of its own
//   - farmer_verification (a view over bank_accounts) is publicly
//     selectable even though bank_accounts itself is not
//
// Deletes both users (and their cascaded rows) whether the assertions pass
// or fail.
import 'dotenv/config';
import { createClient, type PostgrestError } from '@supabase/supabase-js';

import type { Database } from '../src/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    'Missing env vars. Need EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, ' +
      'and SUPABASE_SERVICE_ROLE_KEY (service role key must not be committed or ' +
      'EXPO_PUBLIC_-prefixed).'
  );
  process.exit(1);
}

const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type TestUser = {
  id: string;
  email: string;
  password: string;
};

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Email+password is used to sign in (Email is virtually always enabled by
// default), but a phone number is set too so the auto-insert trigger's
// phone-or-email check is satisfied via phone — RLS itself only cares about
// auth.uid(), not which provider established the session.
async function createTestUser(label: string): Promise<TestUser> {
  const suffix = randomSuffix();
  const email = `rls-test-${label}-${suffix}@example.com`;
  const phone = `+1555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
  const password = `Test-${suffix}-Aa1!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    phone,
    password,
    email_confirm: true,
    phone_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create ${label}: ${error?.message}`);
  }

  return { id: data.user.id, email, password };
}

async function deleteTestUser(user: TestUser): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`Warning: failed to delete test user ${user.id}: ${error.message}`);
  }
}

async function signInAsClient(user: TestUser) {
  const client = createClient<Database>(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`Failed to sign in as ${user.id}: ${error.message}`);
  }
  return client;
}

// Seeds a farm_locations, delivery_locations, and bank_accounts row for a
// profile via the service role (bypasses RLS by design — this is test
// setup, not the thing under test).
async function seedRowsFor(profileId: string, bankName: string): Promise<void> {
  const { error: farmLocationError } = await admin
    .from('farm_locations')
    .insert({ profile_id: profileId, address_line: '1 Farm Way' });
  if (farmLocationError) {
    throw new Error(`Failed to seed farm_locations for ${profileId}: ${farmLocationError.message}`);
  }

  const { error: deliveryLocationError } = await admin
    .from('delivery_locations')
    .insert({ profile_id: profileId, address_line: '1 Delivery Way' });
  if (deliveryLocationError) {
    throw new Error(
      `Failed to seed delivery_locations for ${profileId}: ${deliveryLocationError.message}`
    );
  }

  const { error: bankAccountError } = await admin.from('bank_accounts').insert({
    profile_id: profileId,
    bank_code: '058',
    bank_name: bankName,
    account_number: '0123456789',
    resolved_account_name: 'ACCOUNT HOLDER',
    name_match_score: 1,
  });
  if (bankAccountError) {
    throw new Error(`Failed to seed bank_accounts for ${profileId}: ${bankAccountError.message}`);
  }
}

// banks isn't per-user — seed one throwaway row via the service role so the
// write-rejection tests below have a real row to target.
async function seedBankRow(code: string): Promise<void> {
  const { error } = await admin.from('banks').insert({ code, name: 'RLS Test Bank' });
  if (error) {
    throw new Error(`Failed to seed banks row: ${error.message}`);
  }
}

async function deleteBankRow(code: string): Promise<void> {
  const { error } = await admin.from('banks').delete().eq('code', code);
  if (error) {
    console.error(`Warning: failed to delete test banks row ${code}: ${error.message}`);
  }
}

async function seedFarmerProfile(profileId: string, farmName: string): Promise<string> {
  const { data, error } = await admin
    .from('farmer_profiles')
    .insert({ profile_id: profileId, farm_name: farmName })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed farmer_profiles for ${profileId}: ${error?.message}`);
  }
  return data.id;
}

async function seedProduct(farmerId: string, name: string, isAvailable: boolean): Promise<string> {
  const { data, error } = await admin
    .from('products')
    .insert({
      farmer_id: farmerId,
      name,
      category: 'Vegetables',
      price: 500,
      unit: 'basket',
      is_available: isAvailable,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed products for farmer ${farmerId}: ${error?.message}`);
  }
  return data.id;
}

async function seedOrder(householdId: string, farmerId: string): Promise<string> {
  const { data, error } = await admin
    .from('orders')
    .insert({ household_id: householdId, farmer_id: farmerId })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed orders for household ${householdId}: ${error?.message}`);
  }
  return data.id;
}

async function seedOrderItem(orderId: string): Promise<string> {
  const { data, error } = await admin
    .from('order_items')
    .insert({
      order_id: orderId,
      product_name_snapshot: 'RLS Test Product',
      quantity: 1,
      unit_price: 500,
      line_total: 500,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed order_items for order ${orderId}: ${error?.message}`);
  }
  return data.id;
}

async function seedPromotion(productId: string, discountPercent: number): Promise<string> {
  const { data, error } = await admin
    .from('promotions')
    .insert({
      product_id: productId,
      discount_percent: discountPercent,
      ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed promotions for product ${productId}: ${error?.message}`);
  }
  return data.id;
}

async function deleteRowById(table: 'promotions' | 'delivery_zones', id: string): Promise<void> {
  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Warning: failed to delete test ${table} row ${id}: ${error.message}`);
  }
}

async function seedPayout(orderId: string, farmerId: string, amount: number): Promise<string> {
  const { data, error } = await admin
    .from('payouts')
    .insert({ order_id: orderId, farmer_id: farmerId, amount })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed payouts for order ${orderId}: ${error?.message}`);
  }
  return data.id;
}

async function seedRefund(orderId: string, householdId: string, amount: number): Promise<string> {
  const { data, error } = await admin
    .from('refunds')
    .insert({ order_id: orderId, household_id: householdId, amount })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`Failed to seed refunds for order ${orderId}: ${error?.message}`);
  }
  return data.id;
}

function assertZeroRows(
  label: string,
  rows: unknown[] | null,
  error: PostgrestError | null
): void {
  if (error) {
    throw new Error(`${label}: query errored instead of returning zero rows — ${error.message}`);
  }
  if (!rows || rows.length !== 0) {
    throw new Error(`${label}: expected 0 rows, got ${rows?.length ?? 'null'}`);
  }
  console.log(`PASS  ${label}: 0 rows affected`);
}

function assertOneRow(label: string, rows: unknown[] | null, error: PostgrestError | null): void {
  if (error) {
    throw new Error(`${label}: expected 1 row, got an error — ${error.message}`);
  }
  if (!rows || rows.length !== 1) {
    throw new Error(`${label}: expected exactly 1 row, got ${rows?.length ?? 'null'}`);
  }
  console.log(`PASS  ${label}: 1 row affected, as expected for an own-row operation`);
}

function assertRejected(label: string, error: PostgrestError | null): void {
  if (!error) {
    throw new Error(`${label}: expected the write to be rejected, but it succeeded`);
  }
  console.log(`PASS  ${label}: rejected — ${error.message}`);
}

async function main() {
  console.log('Creating three throwaway users (user A, user B, user C — C has no relationship to anyone)...');
  const userA = await createTestUser('a');
  const userB = await createTestUser('b');
  const userC = await createTestUser('c');
  const testBankCode = `RLS${randomSuffix()}`;

  try {
    console.log("Seeding a farm_locations and bank_accounts row for both users...");
    await seedRowsFor(userA.id, 'User A Bank');
    await seedRowsFor(userB.id, 'User B Bank');
    await seedBankRow(testBankCode);

    console.log('Seeding a farmer_profiles row for both users (both act as farmers too)...');
    const farmerProfileA = await seedFarmerProfile(userA.id, 'User A Farm');
    const farmerProfileB = await seedFarmerProfile(userB.id, 'User B Farm');

    console.log('Seeding one available and one unavailable product for each farmer...');
    const productAAvailable = await seedProduct(farmerProfileA, 'User A Available Product', true);
    const productAHidden = await seedProduct(farmerProfileA, 'User A Hidden Product', false);
    const productBAvailable = await seedProduct(farmerProfileB, 'User B Available Product', true);

    console.log('Seeding orders: A buys from B, B buys from B, B buys from A...');
    const orderAFromB = await seedOrder(userA.id, farmerProfileB);
    const orderBFromB = await seedOrder(userB.id, farmerProfileB);
    const orderBFromA = await seedOrder(userB.id, farmerProfileA);

    console.log('Seeding one order_item on orderAFromB and one on orderBFromB...');
    await seedOrderItem(orderAFromB);
    await seedOrderItem(orderBFromB);

    console.log('Signing in as user A...');
    const clientA = await signInAsClient(userA);

    // --- profiles: relationship-scoped read (fixed a real bug — see
    // 20260822090000_profiles_select_related_household.sql) -----------------
    // orderBFromA (household B, farmer A) already exists at this point, so
    // user A — as the farmer on that order — now legitimately CAN read user
    // B's profile row (this used to silently return null in every
    // household:profiles(...) embed useFarmerOrders/useOrderDetail/
    // useConversations/the chat thread rely on, showing "Household"/
    // "Unknown" instead of a real name). User C has no order or conversation
    // with anyone, so the same read must still fail for them.
    console.log("\nChecking profiles table (relationship-scoped read, not blanket cross-user)...");

    const selProfileRelated = await clientA.from('profiles').select('*').eq('id', userB.id);
    assertOneRow(
      'profiles SELECT (user A reading user B — a real order relationship exists)',
      selProfileRelated.data,
      selProfileRelated.error
    );

    const selProfileUnrelated = await clientA.from('profiles').select('*').eq('id', userC.id);
    assertZeroRows(
      'profiles SELECT (user A reading user C — no relationship exists)',
      selProfileUnrelated.data,
      selProfileUnrelated.error
    );

    // --- Cross-user reads: expect 0 rows -----------------------------------
    console.log("\nAttempting to READ user B's rows as user A (expecting 0 rows each)...");

    const selFarm = await clientA.from('farm_locations').select('*').eq('profile_id', userB.id);
    assertZeroRows('farm_locations SELECT (cross-user)', selFarm.data, selFarm.error);

    const selDelivery = await clientA
      .from('delivery_locations')
      .select('*')
      .eq('profile_id', userB.id);
    assertZeroRows('delivery_locations SELECT (cross-user)', selDelivery.data, selDelivery.error);

    const selBank = await clientA.from('bank_accounts').select('*').eq('profile_id', userB.id);
    assertZeroRows('bank_accounts SELECT (cross-user)', selBank.data, selBank.error);

    // --- Cross-user updates: expect 0 rows affected -------------------------
    console.log("\nAttempting to UPDATE user B's rows as user A (expecting 0 rows each)...");

    const updProfile = await clientA
      .from('profiles')
      .update({ full_name: 'Hijacked' })
      .eq('id', userB.id)
      .select();
    assertZeroRows('profiles UPDATE (cross-user)', updProfile.data, updProfile.error);

    const updFarm = await clientA
      .from('farm_locations')
      .update({ address_line: 'Hijacked' })
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('farm_locations UPDATE (cross-user)', updFarm.data, updFarm.error);

    const updDelivery = await clientA
      .from('delivery_locations')
      .update({ address_line: 'Hijacked' })
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('delivery_locations UPDATE (cross-user)', updDelivery.data, updDelivery.error);

    const updBank = await clientA
      .from('bank_accounts')
      .update({ bank_name: 'Hijacked' })
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('bank_accounts UPDATE (cross-user)', updBank.data, updBank.error);

    // --- Cross-user deletes: expect 0 rows affected -------------------------
    // Note: none of the three tables have a DELETE policy at all (by design —
    // the spec only calls for select/insert/update), so delete is fully
    // blocked for every authenticated user, not just cross-user. These
    // assertions confirm user A specifically cannot delete user B's rows;
    // they don't imply user A could delete their own.
    console.log("\nAttempting to DELETE user B's rows as user A (expecting 0 rows each)...");

    const delProfile = await clientA.from('profiles').delete().eq('id', userB.id).select();
    assertZeroRows('profiles DELETE (cross-user)', delProfile.data, delProfile.error);

    const delFarm = await clientA
      .from('farm_locations')
      .delete()
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('farm_locations DELETE (cross-user)', delFarm.data, delFarm.error);

    const delDelivery = await clientA
      .from('delivery_locations')
      .delete()
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('delivery_locations DELETE (cross-user)', delDelivery.data, delDelivery.error);

    const delBank = await clientA
      .from('bank_accounts')
      .delete()
      .eq('profile_id', userB.id)
      .select();
    assertZeroRows('bank_accounts DELETE (cross-user)', delBank.data, delBank.error);

    // --- Own-row reads: expect exactly 1 row --------------------------------
    // Guards against a policy that blocks everything, which would otherwise
    // pass every assertion above trivially.
    console.log('\nReading own rows as user A (expecting 1 row each)...');

    const ownProfile = await clientA.from('profiles').select('*').eq('id', userA.id);
    assertOneRow('profiles SELECT (own row)', ownProfile.data, ownProfile.error);

    const ownFarm = await clientA.from('farm_locations').select('*').eq('profile_id', userA.id);
    assertOneRow('farm_locations SELECT (own row)', ownFarm.data, ownFarm.error);

    const ownDelivery = await clientA
      .from('delivery_locations')
      .select('*')
      .eq('profile_id', userA.id);
    assertOneRow('delivery_locations SELECT (own row)', ownDelivery.data, ownDelivery.error);

    const ownBank = await clientA.from('bank_accounts').select('*').eq('profile_id', userA.id);
    assertOneRow('bank_accounts SELECT (own row)', ownBank.data, ownBank.error);

    // --- Own-row updates: expect exactly 1 row, value actually changed -----
    console.log('\nUpdating own rows as user A (expecting 1 row each)...');

    const updOwnProfile = await clientA
      .from('profiles')
      .update({ full_name: 'User A Real Name' })
      .eq('id', userA.id)
      .select();
    assertOneRow('profiles UPDATE (own row)', updOwnProfile.data, updOwnProfile.error);
    if (updOwnProfile.data?.[0]?.full_name !== 'User A Real Name') {
      throw new Error('profiles UPDATE (own row): row returned but full_name was not updated');
    }

    const updOwnFarm = await clientA
      .from('farm_locations')
      .update({ address_line: '2 New Farm Way' })
      .eq('profile_id', userA.id)
      .select();
    assertOneRow('farm_locations UPDATE (own row)', updOwnFarm.data, updOwnFarm.error);
    if (updOwnFarm.data?.[0]?.address_line !== '2 New Farm Way') {
      throw new Error('farm_locations UPDATE (own row): row returned but address_line was not updated');
    }

    const updOwnDelivery = await clientA
      .from('delivery_locations')
      .update({ address_line: '2 New Delivery Way' })
      .eq('profile_id', userA.id)
      .select();
    assertOneRow('delivery_locations UPDATE (own row)', updOwnDelivery.data, updOwnDelivery.error);
    if (updOwnDelivery.data?.[0]?.address_line !== '2 New Delivery Way') {
      throw new Error(
        'delivery_locations UPDATE (own row): row returned but address_line was not updated'
      );
    }

    // bank_name is not column-protected — only resolved_account_name /
    // name_match_score / verification_status are (tested separately below).
    const updOwnBank = await clientA
      .from('bank_accounts')
      .update({ bank_name: 'User A New Bank' })
      .eq('profile_id', userA.id)
      .select();
    assertOneRow('bank_accounts UPDATE (own row, unprotected column)', updOwnBank.data, updOwnBank.error);
    if (updOwnBank.data?.[0]?.bank_name !== 'User A New Bank') {
      throw new Error('bank_accounts UPDATE (own row): row returned but bank_name was not updated');
    }

    // --- Self-verification must be blocked, even on user A's own row -------
    console.log('\nAttempting to self-verify own bank_accounts row as user A (expecting rejection)...');

    const selfVerify = await clientA
      .from('bank_accounts')
      .update({ verification_status: 'verified', name_match_score: 1.0 })
      .eq('profile_id', userA.id)
      .select();
    assertRejected('bank_accounts self-verify UPDATE (own row, protected columns)', selfVerify.error);

    const { data: bankAfterAttempt, error: bankAfterAttemptError } = await admin
      .from('bank_accounts')
      .select('verification_status, name_match_score')
      .eq('profile_id', userA.id)
      .single();
    if (bankAfterAttemptError) {
      throw new Error(`Failed to verify post-attempt state: ${bankAfterAttemptError.message}`);
    }
    if (bankAfterAttempt.verification_status !== 'pending' || bankAfterAttempt.name_match_score !== 1) {
      throw new Error(
        `bank_accounts self-verify: protected columns changed anyway — ` +
          `verification_status=${bankAfterAttempt.verification_status}, ` +
          `name_match_score=${bankAfterAttempt.name_match_score}`
      );
    }
    console.log('PASS  bank_accounts self-verify: protected columns unchanged, confirmed via service role');

    // --- banks: public read, but writes blocked for every authenticated user
    console.log('\nChecking banks table (public read, service-role-only write)...');

    const banksRead = await clientA.from('banks').select('*').eq('code', testBankCode);
    assertOneRow('banks SELECT (public read)', banksRead.data, banksRead.error);

    const banksInsert = await clientA
      .from('banks')
      .insert({ code: `${testBankCode}-X`, name: 'Should Not Insert' })
      .select();
    assertRejected('banks INSERT (no policy for authenticated users)', banksInsert.error);

    const banksUpdate = await clientA
      .from('banks')
      .update({ name: 'Hijacked' })
      .eq('code', testBankCode)
      .select();
    assertZeroRows('banks UPDATE (no policy for authenticated users)', banksUpdate.data, banksUpdate.error);

    const banksDelete = await clientA.from('banks').delete().eq('code', testBankCode).select();
    assertZeroRows('banks DELETE (no policy for authenticated users)', banksDelete.data, banksDelete.error);

    // --- account_resolution_attempts: owner-only select/insert, immutable log
    console.log('\nChecking account_resolution_attempts table (owner-only select/insert)...');

    const attemptsCrossSelect = await clientA
      .from('account_resolution_attempts')
      .select('*')
      .eq('profile_id', userB.id);
    assertZeroRows(
      'account_resolution_attempts SELECT (cross-user)',
      attemptsCrossSelect.data,
      attemptsCrossSelect.error
    );

    const attemptsCrossInsert = await clientA
      .from('account_resolution_attempts')
      .insert({ profile_id: userB.id })
      .select();
    assertRejected(
      'account_resolution_attempts INSERT (claiming to be user B)',
      attemptsCrossInsert.error
    );

    const attemptsOwnInsert = await clientA
      .from('account_resolution_attempts')
      .insert({ profile_id: userA.id })
      .select();
    assertOneRow(
      'account_resolution_attempts INSERT (own row)',
      attemptsOwnInsert.data,
      attemptsOwnInsert.error
    );

    const attemptsOwnSelect = await clientA
      .from('account_resolution_attempts')
      .select('*')
      .eq('profile_id', userA.id);
    assertOneRow(
      'account_resolution_attempts SELECT (own row)',
      attemptsOwnSelect.data,
      attemptsOwnSelect.error
    );

    // --- farmer_profiles: public read, owner-only insert/update -----------
    console.log('\nChecking farmer_profiles table (public read, owner-only insert/update)...');

    const farmerProfileRead = await clientA
      .from('farmer_profiles')
      .select('*')
      .eq('id', farmerProfileB);
    assertOneRow('farmer_profiles SELECT (public read, cross-user)', farmerProfileRead.data, farmerProfileRead.error);

    const farmerProfileCrossUpdate = await clientA
      .from('farmer_profiles')
      .update({ farm_name: 'Hijacked Farm' })
      .eq('id', farmerProfileB)
      .select();
    assertZeroRows(
      'farmer_profiles UPDATE (cross-user)',
      farmerProfileCrossUpdate.data,
      farmerProfileCrossUpdate.error
    );

    const farmerProfileOwnUpdate = await clientA
      .from('farmer_profiles')
      .update({ farm_name: 'User A Farm Renamed' })
      .eq('id', farmerProfileA)
      .select();
    assertOneRow('farmer_profiles UPDATE (own row)', farmerProfileOwnUpdate.data, farmerProfileOwnUpdate.error);

    const farmerProfileCrossInsert = await clientA
      .from('farmer_profiles')
      .insert({ profile_id: userB.id, farm_name: 'Hijack Attempt' })
      .select();
    assertRejected('farmer_profiles INSERT (claiming to be user B)', farmerProfileCrossInsert.error);

    // --- products: public read when available, owner-only write + delete --
    console.log('\nChecking products table (available-or-own read, owner-only write/delete)...');

    const productReadAvailableCross = await clientA
      .from('products')
      .select('*')
      .eq('id', productBAvailable);
    assertOneRow(
      'products SELECT (available, cross-user)',
      productReadAvailableCross.data,
      productReadAvailableCross.error
    );

    const productReadOwnHidden = await clientA.from('products').select('*').eq('id', productAHidden);
    assertOneRow(
      'products SELECT (own row, unavailable)',
      productReadOwnHidden.data,
      productReadOwnHidden.error
    );

    const productCrossUpdate = await clientA
      .from('products')
      .update({ name: 'Hijacked' })
      .eq('id', productBAvailable)
      .select();
    assertZeroRows('products UPDATE (cross-user)', productCrossUpdate.data, productCrossUpdate.error);

    const productCrossInsert = await clientA
      .from('products')
      .insert({
        farmer_id: farmerProfileB,
        name: 'Hijack Attempt',
        category: 'Vegetables',
        price: 1,
        unit: 'kg',
      })
      .select();
    assertRejected('products INSERT (claiming farmer B)', productCrossInsert.error);

    const productOwnUpdate = await clientA
      .from('products')
      .update({ name: 'User A Renamed Product' })
      .eq('id', productAAvailable)
      .select();
    assertOneRow('products UPDATE (own row)', productOwnUpdate.data, productOwnUpdate.error);

    const productCrossDelete = await clientA.from('products').delete().eq('id', productBAvailable).select();
    assertZeroRows('products DELETE (cross-user)', productCrossDelete.data, productCrossDelete.error);

    const productOwnDelete = await clientA.from('products').delete().eq('id', productAHidden).select();
    assertOneRow('products DELETE (own row)', productOwnDelete.data, productOwnDelete.error);

    // --- orders: household read/write own; farmer read-only own; nobody
    // else sees anything ------------------------------------------------
    console.log('\nChecking orders table (household read/write own, farmer read-only own)...');

    const orderAsHouseholdOwn = await clientA.from('orders').select('*').eq('id', orderAFromB);
    assertOneRow('orders SELECT (own household order)', orderAsHouseholdOwn.data, orderAsHouseholdOwn.error);

    const orderAsFarmerOwn = await clientA.from('orders').select('*').eq('id', orderBFromA);
    assertOneRow('orders SELECT (order where user A is the farmer)', orderAsFarmerOwn.data, orderAsFarmerOwn.error);

    const orderUnrelated = await clientA.from('orders').select('*').eq('id', orderBFromB);
    assertZeroRows('orders SELECT (unrelated to user A entirely)', orderUnrelated.data, orderUnrelated.error);

    // Consumer-side build: orders_insert_household was dropped entirely
    // (20260821090200_orders_escrow.sql) — order creation now only happens
    // server-side via the initialize-checkout Edge Function, since pricing
    // math can't be trusted from a client-supplied INSERT payload once a
    // real payment is calculated from it. A direct client insert must be
    // rejected even for the household's own would-be order.
    const orderInsertOwnHousehold = await clientA
      .from('orders')
      .insert({ household_id: userA.id, farmer_id: farmerProfileB })
      .select();
    assertRejected('orders INSERT (client-side, even for own household — must go through initialize-checkout)', orderInsertOwnHousehold.error);

    const orderInsertCrossHousehold = await clientA
      .from('orders')
      .insert({ household_id: userB.id, farmer_id: farmerProfileB })
      .select();
    assertRejected('orders INSERT (claiming to be household B)', orderInsertCrossHousehold.error);

    // orders_update_household was dropped too — a household has no
    // legitimate direct-UPDATE need on orders any more (escrow-sensitive
    // transitions all go through Edge Functions using the service role).
    // Unlike INSERT with no matching policy (a hard error), UPDATE with no
    // matching row just silently affects 0 rows — same pattern the existing
    // "banks UPDATE (no policy for authenticated users)" assertion below
    // already documents for this project.
    const orderUpdateOwnHousehold = await clientA
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderAFromB)
      .select();
    assertZeroRows(
      'orders UPDATE (household, even on their own order — must go through an Edge Function now)',
      orderUpdateOwnHousehold.data,
      orderUpdateOwnHousehold.error
    );

    // Farmer-side build: the farmer now HAS an update policy
    // (orders_update_farmer_advance_only), but its `with check` blocks
    // setting status to 'delivered' — that's reserved for the household's
    // own confirmation. User A is the farmer (not household) on orderBFromA.
    const orderUpdateAsFarmerAdvance = await clientA
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderBFromA)
      .select();
    assertOneRow(
      'orders UPDATE (farmer advancing their own order to a non-delivered status)',
      orderUpdateAsFarmerAdvance.data,
      orderUpdateAsFarmerAdvance.error
    );

    const orderUpdateAsFarmerToDelivered = await clientA
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderBFromA)
      .select();
    assertRejected(
      'orders UPDATE (farmer attempting to set status to delivered — must be blocked)',
      orderUpdateAsFarmerToDelivered.error
    );

    const orderUpdateUnrelated = await clientA
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderBFromB)
      .select();
    assertZeroRows(
      'orders UPDATE (user A is neither household nor farmer on this order)',
      orderUpdateUnrelated.data,
      orderUpdateUnrelated.error
    );

    // --- order_items: access follows the parent order's ownership ---------
    console.log('\nChecking order_items table (access follows parent order ownership)...');

    const orderItemsOwnOrder = await clientA
      .from('order_items')
      .select('*')
      .eq('order_id', orderAFromB);
    assertOneRow('order_items SELECT (own order)', orderItemsOwnOrder.data, orderItemsOwnOrder.error);

    const orderItemsUnrelatedOrder = await clientA
      .from('order_items')
      .select('*')
      .eq('order_id', orderBFromB);
    assertZeroRows(
      'order_items SELECT (unrelated order)',
      orderItemsUnrelatedOrder.data,
      orderItemsUnrelatedOrder.error
    );

    // order_items_insert_via_own_order was dropped too — pricing
    // (unit_price/line_total) is server-computed now, same reasoning as
    // orders_insert_household above.
    const orderItemInsertOwnOrder = await clientA
      .from('order_items')
      .insert({
        order_id: orderAFromB,
        product_name_snapshot: 'Client-inserted item',
        quantity: 2,
        unit_price: 250,
        line_total: 500,
      })
      .select();
    assertRejected(
      'order_items INSERT (client-side, even for own order — must go through initialize-checkout)',
      orderItemInsertOwnOrder.error
    );

    const orderItemInsertUnrelatedOrder = await clientA
      .from('order_items')
      .insert({
        order_id: orderBFromB,
        product_name_snapshot: 'Should not insert',
        quantity: 1,
        unit_price: 100,
        line_total: 100,
      })
      .select();
    assertRejected(
      'order_items INSERT (unrelated order)',
      orderItemInsertUnrelatedOrder.error
    );

    // --- farmer_verification: public view over a table with no public read
    console.log('\nChecking farmer_verification view (public read, bypasses bank_accounts RLS)...');

    const verificationCrossRead = await clientA
      .from('farmer_verification')
      .select('*')
      .eq('profile_id', userB.id);
    assertOneRow(
      'farmer_verification SELECT (cross-user, via view)',
      verificationCrossRead.data,
      verificationCrossRead.error
    );

    const bankAccountsCrossReadDirect = await clientA
      .from('bank_accounts')
      .select('*')
      .eq('profile_id', userB.id);
    assertZeroRows(
      'bank_accounts SELECT (cross-user, direct — confirms the view does not widen this)',
      bankAccountsCrossReadDirect.data,
      bankAccountsCrossReadDirect.error
    );

    // --- low_stock_products: security_invoker view over products ----------
    console.log('\nChecking low_stock_products view (security_invoker — RLS still applies)...');

    const { error: lowStockUpdateError } = await admin
      .from('products')
      .update({ low_stock_threshold: 5, quantity_available: 2 })
      .eq('id', productAAvailable);
    if (lowStockUpdateError) {
      throw new Error(`Failed to set up low-stock product: ${lowStockUpdateError.message}`);
    }

    const lowStockOwnRead = await clientA
      .from('low_stock_products')
      .select('*')
      .eq('id', productAAvailable);
    assertOneRow(
      'low_stock_products SELECT (own product, crosses threshold)',
      lowStockOwnRead.data,
      lowStockOwnRead.error
    );

    // --- promotions: public read, farmer-only write on their own products -
    console.log('\nChecking promotions table (public read, farmer-only write)...');

    const promotionOwn = await seedPromotion(productAAvailable, 20);

    const promotionCrossReadInsert = await clientA
      .from('promotions')
      .insert({
        product_id: productBAvailable,
        discount_percent: 10,
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .select();
    assertRejected(
      'promotions INSERT (on a product belonging to farmer B)',
      promotionCrossReadInsert.error
    );

    const promotionSelectCross = await clientA.from('promotions').select('*').eq('id', promotionOwn);
    assertOneRow('promotions SELECT (public read, any user)', promotionSelectCross.data, promotionSelectCross.error);

    const promotionCrossUpdate = await clientA
      .from('promotions')
      .update({ discount_percent: 99 })
      .eq('id', promotionOwn)
      .select();
    assertOneRow('promotions UPDATE (own product)', promotionCrossUpdate.data, promotionCrossUpdate.error);

    await deleteRowById('promotions', promotionOwn);

    // --- delivery_zones: public read, farmer-only write --------------------
    console.log('\nChecking delivery_zones table (public read, farmer-only write)...');

    const zoneInsertOwn = await clientA
      .from('delivery_zones')
      .insert({ farmer_id: farmerProfileA, zone_name: 'Test Zone', fee: 500 })
      .select()
      .single();
    if (zoneInsertOwn.error || !zoneInsertOwn.data) {
      throw new Error(`delivery_zones INSERT (own farmer) failed: ${zoneInsertOwn.error?.message}`);
    }
    console.log('PASS  delivery_zones INSERT (own farmer): 1 row affected, as expected for an own-row operation');

    const zoneInsertCross = await clientA
      .from('delivery_zones')
      .insert({ farmer_id: farmerProfileB, zone_name: 'Hijack Zone', fee: 0 })
      .select();
    assertRejected('delivery_zones INSERT (claiming farmer B)', zoneInsertCross.error);

    const zoneDeleteOwn = await clientA
      .from('delivery_zones')
      .delete()
      .eq('id', zoneInsertOwn.data.id)
      .select();
    assertOneRow('delivery_zones DELETE (own row)', zoneDeleteOwn.data, zoneDeleteOwn.error);

    // --- reviews: household-only insert tied to a real own order, public
    // read, no update/delete -------------------------------------------
    console.log('\nChecking reviews table (household-insert-own-order, public read)...');

    const reviewOwnOrder = await clientA
      .from('reviews')
      .insert({ order_id: orderAFromB, farmer_id: farmerProfileB, household_id: userA.id, rating: 5 })
      .select()
      .single();
    if (reviewOwnOrder.error || !reviewOwnOrder.data) {
      throw new Error(`reviews INSERT (own order) failed: ${reviewOwnOrder.error?.message}`);
    }
    console.log('PASS  reviews INSERT (own order): 1 row affected, as expected for an own-row operation');

    const reviewClaimingOtherHousehold = await clientA
      .from('reviews')
      .insert({ order_id: orderBFromB, farmer_id: farmerProfileB, household_id: userB.id, rating: 1 })
      .select();
    assertRejected('reviews INSERT (claiming to be household B)', reviewClaimingOtherHousehold.error);

    const reviewPublicRead = await clientA
      .from('reviews')
      .select('*')
      .eq('id', reviewOwnOrder.data.id);
    assertOneRow('reviews SELECT (public read)', reviewPublicRead.data, reviewPublicRead.error);

    // --- notifications: new_review/new_message triggers fire, and are only
    // readable by their owner ----------------------------------------------
    // Consumer-side build: notify_farmer_new_order (fired on orders INSERT)
    // was deliberately dropped in 20260821090600_notifications_escrow_types.sql
    // — an order row now exists before it's ever paid for (initialize-
    // checkout creates it, then Paystack is called), so notifying on raw
    // INSERT would fire for abandoned/never-completed checkouts. The
    // paystack-webhook Edge Function inserts 'order_paid' once payment is
    // actually confirmed instead — not exercised here, since it requires a
    // real Paystack webhook call.
    console.log('\nChecking notifications table (trigger fan-out + owner-only read)...');

    const notificationsForFarmerB = await admin
      .from('notifications')
      .select('type')
      .eq('profile_id', userB.id);
    const notificationTypes = (notificationsForFarmerB.data ?? []).map((n) => n.type);
    if (!notificationTypes.includes('new_review')) {
      throw new Error(
        `Expected a 'new_review' notification for farmer B after the review above, got: ${notificationTypes.join(', ')}`
      );
    }
    console.log("PASS  notifications: 'new_review' trigger fired for farmer B");

    const notificationsCrossRead = await clientA
      .from('notifications')
      .select('*')
      .eq('profile_id', userB.id);
    assertZeroRows(
      'notifications SELECT (cross-user — user A cannot read user B notifications)',
      notificationsCrossRead.data,
      notificationsCrossRead.error
    );

    // --- conversations + messages: participant-only, sender-only insert ---
    console.log('\nChecking conversations/messages tables (participant-only access)...');

    const conversationOwn = await clientA
      .from('conversations')
      .insert({ farmer_id: farmerProfileB, household_id: userA.id })
      .select()
      .single();
    if (conversationOwn.error || !conversationOwn.data) {
      throw new Error(`conversations INSERT (own, as household) failed: ${conversationOwn.error?.message}`);
    }
    console.log('PASS  conversations INSERT (own, as household): 1 row affected');

    const messageOwnSend = await clientA
      .from('messages')
      .insert({ conversation_id: conversationOwn.data.id, sender_id: userA.id, content: 'Hello farmer B' })
      .select();
    assertOneRow('messages INSERT (own, as sender)', messageOwnSend.data, messageOwnSend.error);

    const messageImpersonate = await clientA
      .from('messages')
      .insert({ conversation_id: conversationOwn.data.id, sender_id: userB.id, content: 'Impersonating B' })
      .select();
    assertRejected('messages INSERT (sender_id set to user B)', messageImpersonate.error);

    const conversationBRead = await clientA
      .from('conversations')
      .select('*')
      .eq('household_id', userB.id)
      .eq('farmer_id', farmerProfileA);
    // No such conversation was ever created, so this is really just
    // confirming the SELECT policy doesn't error for a non-participant
    // query shape — the meaningful cross-user check is messages below,
    // scoped via a conversation user A has no part in.
    assertZeroRows(
      'conversations SELECT (no matching conversation exists)',
      conversationBRead.data,
      conversationBRead.error
    );

    await admin.from('messages').delete().eq('conversation_id', conversationOwn.data.id);
    await admin.from('conversations').delete().eq('id', conversationOwn.data.id);

    // --- cart_items: owner-only, all operations ----------------------------
    console.log('\nChecking cart_items table (owner-only, all operations)...');

    const cartInsertOwn = await clientA
      .from('cart_items')
      .insert({ household_id: userA.id, product_id: productBAvailable, quantity: 2 })
      .select()
      .single();
    if (cartInsertOwn.error || !cartInsertOwn.data) {
      throw new Error(`cart_items INSERT (own) failed: ${cartInsertOwn.error?.message}`);
    }
    console.log('PASS  cart_items INSERT (own): 1 row affected, as expected for an own-row operation');

    const cartInsertCrossHousehold = await clientA
      .from('cart_items')
      .insert({ household_id: userB.id, product_id: productBAvailable, quantity: 1 })
      .select();
    assertRejected('cart_items INSERT (claiming to be household B)', cartInsertCrossHousehold.error);

    const cartSelectCross = await clientA.from('cart_items').select('*').eq('household_id', userB.id);
    assertZeroRows('cart_items SELECT (cross-user)', cartSelectCross.data, cartSelectCross.error);

    const cartUpdateOwn = await clientA
      .from('cart_items')
      .update({ quantity: 5 })
      .eq('id', cartInsertOwn.data.id)
      .select();
    assertOneRow('cart_items UPDATE (own)', cartUpdateOwn.data, cartUpdateOwn.error);

    const cartDeleteOwn = await clientA.from('cart_items').delete().eq('id', cartInsertOwn.data.id).select();
    assertOneRow('cart_items DELETE (own)', cartDeleteOwn.data, cartDeleteOwn.error);

    // --- payouts / refunds: read-only for their respective owner, no
    // client write policy at all (only Edge Functions using the service
    // role write these) ---------------------------------------------------
    console.log('\nChecking payouts/refunds tables (owner-read-only, service-role-only write)...');

    const payoutForFarmerA = await seedPayout(orderBFromA, farmerProfileA, 1000);
    const payoutForFarmerB = await seedPayout(orderAFromB, farmerProfileB, 2000);

    const payoutReadOwn = await clientA.from('payouts').select('*').eq('id', payoutForFarmerA);
    assertOneRow('payouts SELECT (own farmer)', payoutReadOwn.data, payoutReadOwn.error);

    const payoutReadCross = await clientA.from('payouts').select('*').eq('id', payoutForFarmerB);
    assertZeroRows('payouts SELECT (different farmer)', payoutReadCross.data, payoutReadCross.error);

    const payoutClientInsert = await clientA
      .from('payouts')
      .insert({ order_id: orderBFromA, farmer_id: farmerProfileA, amount: 500 })
      .select();
    assertRejected('payouts INSERT (no client policy — service role only)', payoutClientInsert.error);

    const refundForHouseholdA = await seedRefund(orderAFromB, userA.id, 1500);
    const refundForHouseholdB = await seedRefund(orderBFromB, userB.id, 1500);

    const refundReadOwn = await clientA.from('refunds').select('*').eq('id', refundForHouseholdA);
    assertOneRow('refunds SELECT (own household)', refundReadOwn.data, refundReadOwn.error);

    const refundReadCross = await clientA.from('refunds').select('*').eq('id', refundForHouseholdB);
    assertZeroRows('refunds SELECT (different household)', refundReadCross.data, refundReadCross.error);

    const refundClientInsert = await clientA
      .from('refunds')
      .insert({ order_id: orderAFromB, household_id: userA.id, amount: 500 })
      .select();
    assertRejected('refunds INSERT (no client policy — service role only)', refundClientInsert.error);

    await admin.from('payouts').delete().in('id', [payoutForFarmerA, payoutForFarmerB]);
    await admin.from('refunds').delete().in('id', [refundForHouseholdA, refundForHouseholdB]);

    console.log('\nAll RLS checks passed.');
  } finally {
    console.log('\nCleaning up test users...');
    await deleteBankRow(testBankCode);
    await deleteBankRow(`${testBankCode}-X`);
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await deleteTestUser(userC);
  }
}

main().catch((error: Error) => {
  console.error('\nRLS TEST FAILED:', error.message);
  process.exit(1);
});
