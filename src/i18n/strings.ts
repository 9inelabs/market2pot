// Flat, typed copy table. No screen file should ever contain a hardcoded
// user-facing string — import from here instead. There is no i18next
// dependency and no language picker; this layer exists purely so a locale
// system can be bolted on later without touching screens.
//
// Only copy given verbatim in the build spec is included below. Screens not
// yet built (OTP resend/expired/incorrect states, consumer flow, farm
// location) have copy that wasn't specified — add it here, not inline, when
// those phases are implemented.
export const strings = {
  // Welcome — (onboarding)/welcome.tsx
  welcomeHeadline: 'Fresh products straight from the farm',
  welcomeSubtitle: 'Buy directly from local farmers near you',
  welcomeBrowseProducts: 'Browse products',
  welcomeGetStarted: 'Get Started',
  welcomeContinueWithGoogle: 'Continue with Google',
  welcomeSignInWithApple: 'Sign in with Apple',
  welcomeFooter: 'Visit www.market2pot.com to learn more',
  signInPill: 'Sign In',
  comingSoon: 'Coming soon',

  // Phone entry — (auth)/phone.tsx
  phoneContinue: 'Continue',

  // Role selection — (profile)/role.tsx
  roleFarmerTitle: 'Farmer',
  roleFarmerSubtitle: 'I sell produce',
  roleConsumerTitle: 'Consumer',
  roleConsumerSubtitle: 'I buy produce',

  // Farmer identity — (profile)/identity.tsx
  identityHeadline: 'Can we know you?',
  identitySubtitle: 'Input your correct information',
  identityFullNamePlaceholder: 'ENTER YOUR FULL NAME',
  identityFullNameHelper: 'Ensure this name matches your account name',

  // Bank details name matching — (profile)/bank-details.tsx, src/lib/nameMatch.ts
  bankNameReview: "We'll confirm this matches your details shortly.",
  bankNameMismatch:
    'This account belongs to a different name. Payments must go to an account in your name.',
  bankNameMismatchEditAction: 'Edit my name',
  bankNameMismatchRetryAction: 'Try another account',

  // Dev-only OTP bypass — (auth)/verify.tsx
  devModeBanner: 'DEV MODE',
} as const;

export type StringKey = keyof typeof strings;
