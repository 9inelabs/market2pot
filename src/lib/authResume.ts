import type { Profile } from '@/store/useAuthStore';

export type ResumeRoute = {
  pathname: string;
  params?: Record<string, string>;
};

// Where a signed-in user with a live session should land, based on
// profiles.onboarding_step — used by both the routing gate (intro.tsx, on
// cold start) and login.tsx (a password login could in principle happen
// mid-signup-resume too, not just for a completed account). A `complete`
// profile goes to the new Welcome Back interstitial, not straight into the
// app — Browse Produce there is what actually enters (app).
export function resumeRouteForProfile(profile: Profile): ResumeRoute {
  switch (profile.step) {
    case 'complete':
      return { pathname: '/(onboarding)/welcome-back' };
    case 'password_pending':
      return { pathname: '/(profile)/set-password', params: { mode: 'signup' } };
    case 'identity_pending':
      return { pathname: '/(profile)/identity-name' };
    case 'location_pending':
      return {
        pathname: profile.role === 'farmer' ? '/(profile)/farm-location' : '/(profile)/consumer-location',
      };
    case 'bank_pending':
      return { pathname: '/(profile)/bank-details' };
    case 'role_pending':
    default:
      // Defensive fallback only — role is chosen pre-auth (role.tsx, before
      // phone/OTP), so a live session should never really still be at
      // role_pending. Never a dead end if it somehow is.
      return { pathname: '/(onboarding)/welcome' };
  }
}
