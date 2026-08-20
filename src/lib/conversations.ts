import { supabase } from './supabase';

// Used by every "Message this farmer" entry point (Farmer Profile, Track
// Order) now that household-side messaging is real. conversations has a
// unique (farmer_id, household_id) constraint, so this is safe to call
// repeatedly — it never creates a duplicate thread between the same two
// people.
export async function findOrCreateConversation(farmerProfileId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('farmer_id', farmerProfileId)
    .eq('household_id', user.id)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ farmer_id: farmerProfileId, household_id: user.id })
    .select('id')
    .single();
  if (error || !created) return null;
  return created.id;
}
