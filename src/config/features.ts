// Feature flags — single switch point for functionality that's built but not
// yet ready to expose (build spec sections 3, 4.2, 7.2).

// Google/Apple sign-in render exactly as designed on the welcome screen, but
// are gated off until the providers are wired up — tapping shows a "Coming
// soon" toast rather than being visually dimmed (product decision: they
// should look fully active even before the backend exists). Do not delete
// the buttons themselves.
export const ENABLE_GOOGLE_AUTH = false;
export const ENABLE_APPLE_AUTH = false;

// Guests can browse without an account; sign-in is only prompted at order
// time (not built yet — marketplace/checkout screens are out of scope for
// this auth/onboarding build, see build spec section 0). Routes to a
// temporary placeholder screen until the real marketplace exists.
export const ENABLE_GUEST_BROWSE = true;

// Twilio isn't provisioned yet. When active, the OTP verify screen skips the
// network call and accepts "000000", with a visible DEV MODE banner so it can
// never be mistaken for production behaviour. Gated on __DEV__ (not only the
// env var) so this is unreachable in a release build no matter how
// EXPO_PUBLIC_SMS_ENABLED is set — see build spec section 4.2. Prefer
// Supabase's dashboard-configured test phone numbers over this bypass once
// the Supabase project is configured for it.
export const DEV_OTP_BYPASS = __DEV__ && !process.env.EXPO_PUBLIC_SMS_ENABLED;
