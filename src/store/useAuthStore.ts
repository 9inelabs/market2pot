import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type FarmerProfile = Database['public']['Tables']['farmer_profiles']['Row'];
export type ProfileView = Database['public']['Enums']['profile_view'];

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  // Presence of this (not profile.role) is what actually grants farmer
  // capability — a consumer can add it later via "Register as a farmer"
  // without their original role changing.
  farmerProfile: FarmerProfile | null;
  // True until the first onAuthStateChange fires — lets the routing gate
  // (phase 5) hold the splash/loading state instead of briefly treating a
  // not-yet-checked session as "signed out".
  initializing: boolean;
  loadingProfile: boolean;
  fetchProfile: () => Promise<void>;
  // Flips which tab set/home screen is shown. Only meaningful once
  // farmerProfile exists — the Settings switcher only renders in that case.
  setActiveView: (view: ProfileView) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  farmerProfile: null,
  initializing: true,
  loadingProfile: false,

  fetchProfile: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      set({ profile: null, farmerProfile: null });
      return;
    }

    set({ loadingProfile: true });
    const [profileResult, farmerProfileResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('farmer_profiles').select('*').eq('profile_id', userId).maybeSingle(),
    ]);
    set({
      profile: profileResult.error ? null : profileResult.data,
      farmerProfile: farmerProfileResult.data ?? null,
      loadingProfile: false,
    });
  },

  setActiveView: async (view) => {
    const userId = get().session?.user.id;
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ active_view: view }).eq('id', userId);
    if (!error) {
      set((state) => (state.profile ? { profile: { ...state.profile, active_view: view } } : {}));
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

// Keeps the store's session in sync with Supabase's own auth state, and
// (re)fetches the profile whenever the signed-in user changes. The routing
// gate (phase 5) reads this store rather than subscribing to Supabase itself.
supabase.auth.onAuthStateChange((_event, session) => {
  const previousUserId = useAuthStore.getState().session?.user.id;
  useAuthStore.setState({ session, initializing: false });

  if (session?.user.id !== previousUserId) {
    if (session) {
      useAuthStore.getState().fetchProfile();
    } else {
      useAuthStore.setState({ profile: null, farmerProfile: null });
    }
  }
});
