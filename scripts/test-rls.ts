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
//     farm_locations / bank_accounts rows (0 rows affected each time)
//   - user A CAN read and update their OWN rows in all three tables — a
//     policy that blocked everything would otherwise pass the negative
//     checks above trivially
//   - user A cannot self-verify their own bank_accounts row by writing
//     verification_status / name_match_score / resolved_account_name
//     (column-level GRANTs, not RLS, are what block this)
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

// Seeds a farm_locations and bank_accounts row for a profile via the service
// role (bypasses RLS by design — this is test setup, not the thing under test).
async function seedRowsFor(profileId: string, bankName: string): Promise<void> {
  const { error: farmLocationError } = await admin
    .from('farm_locations')
    .insert({ profile_id: profileId, address_line: '1 Farm Way' });
  if (farmLocationError) {
    throw new Error(`Failed to seed farm_locations for ${profileId}: ${farmLocationError.message}`);
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
  console.log('Creating two throwaway users (user A, user B)...');
  const userA = await createTestUser('a');
  const userB = await createTestUser('b');

  try {
    console.log("Seeding a farm_locations and bank_accounts row for both users...");
    await seedRowsFor(userA.id, 'User A Bank');
    await seedRowsFor(userB.id, 'User B Bank');

    console.log('Signing in as user A...');
    const clientA = await signInAsClient(userA);

    // --- Cross-user reads: expect 0 rows -----------------------------------
    console.log("\nAttempting to READ user B's rows as user A (expecting 0 rows each)...");

    const selProfile = await clientA.from('profiles').select('*').eq('id', userB.id);
    assertZeroRows('profiles SELECT (cross-user)', selProfile.data, selProfile.error);

    const selFarm = await clientA.from('farm_locations').select('*').eq('profile_id', userB.id);
    assertZeroRows('farm_locations SELECT (cross-user)', selFarm.data, selFarm.error);

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

    console.log('\nAll RLS checks passed.');
  } finally {
    console.log('\nCleaning up test users...');
    await deleteTestUser(userA);
    await deleteTestUser(userB);
  }
}

main().catch((error: Error) => {
  console.error('\nRLS TEST FAILED:', error.message);
  process.exit(1);
});
