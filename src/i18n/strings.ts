// Flat, typed copy table. No screen file should ever contain a hardcoded
// user-facing string — import from here instead. There is no i18next
// dependency and no language picker; this layer exists purely so a locale
// system can be bolted on later without touching screens.
export const strings = {
  // Shared
  back: 'Back',

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

  // Role selection — (profile)/role.tsx. Not in the uploaded designs; built
  // fresh per the project owner's exact wording. Headline/subtitle weren't
  // specified at all — written to match this flow's question-form,
  // second-person headline pattern ("What's your...", "Where should...").
  roleHeadline: 'How will you use Market2pot?',
  roleSubtitle: 'You can always change this later',
  roleFarmerLabel: 'I am a farmer',
  roleFarmerHint: 'I grow and sell produce',
  roleConsumerLabel: 'I am a consumer',
  roleConsumerHint: 'I buy fresh produce',

  // Phone entry — (auth)/phone.tsx — copy matches assets/materials exactly.
  // Shared by both roles — identical screen in both design uploads.
  // Explicit line break matches the design's exact 2-line wrap ("What's
  // your" / "Mobile Number?") — left to automatic wrapping, different font
  // metrics between platforms/weights can wrap it differently.
  phoneHeadline: "What's your\nMobile Number?",
  phoneSubtitle: "We'll text you a code, no password needed",
  phonePlaceholder: 'Fill in your correct mobile number',
  phoneSendCode: 'Send Code',
  phoneInvalid: 'Enter a valid Nigerian mobile number',
  phoneRateLimited: 'Too many attempts. Try again in a few minutes.',
  // Supabase returns this when no SMS provider is configured for the
  // project (Twilio isn't provisioned yet — expected during development).
  // Points at the fix (a dashboard-configured test number) instead of
  // surfacing Supabase's raw internal error string.
  phoneNoSmsProvider:
    "SMS isn't set up yet. Use a test phone number configured in Supabase (Authentication → Sign In / Providers → Phone → Test OTPs).",
  // Shared between the phone screen's Send Code button (cooldown after a
  // send, in case the user backs out and returns) and verify's Resend Code.
  resendCountdown: (seconds: number) => `Resend in ${seconds}s`,

  // OTP verification — (auth)/verify.tsx — copy matches assets/materials
  // exactly, except the code length: the mockup shows 4 boxes, but the
  // build spec explicitly calls for 6 digits, confirmed by the project
  // owner over the mockup. Shared by both roles.
  verifyHeadline: 'Enter the code',
  verifySubtitlePrefix: 'We sent a code to',
  verifyResend: 'Resend Code',
  verifyButton: 'Verify Code',
  verifyExpired: 'This code has expired. Request a new one.',
  verifyIncorrect: "That code doesn't match. Check and try again.",

  // Full name — (profile)/identity-name.tsx — copy matches assets/materials
  // exactly, identical between both role uploads. Shared screen.
  identityNameHeadline: "What's your Full Name?",
  identityNameSubtitle: 'So farmers know who they are preparing for',
  // Farmer-specific variant — the shared screen's default subtitle above is
  // written from the consumer's perspective (telling a farmer who they're
  // preparing for); farmers need the reverse framing.
  identityNameSubtitleFarmer: "So households know who they're buying from",
  identityNamePlaceholder: 'Enter your full name',
  identityNameContinue: 'Continue',
  identityNameRequired: 'Enter your full name to continue',
  // Date of birth — farmer-only, NOT in the uploaded designs. Added per the
  // project owner's explicit decision to satisfy the build spec's 18+
  // payout requirement (spec: "payouts make this a hard requirement"),
  // since farmers reach bank-details later in this same flow. Consumers
  // never see this field.
  identityDobLabel: 'Date of birth',
  identityDobPlaceholder: 'Select your date of birth',
  identityDobRequired: 'Enter your date of birth to continue',
  identityDobTooYoung: 'You must be 18 or older to sell on Market2pot',
  // Farmer-only note, also not in the uploaded designs — added alongside the
  // name-match enforcement in Bank Details (src/lib/nameMatch.ts), so
  // farmers know *why* the name they type here matters before they hit that
  // screen, not after being blocked by it.
  identityNameBankNote:
    "Use the name on your bank account — we'll match it against your bank details later so we can pay you correctly.",

  // Profile photo — (profile)/identity-photo.tsx — copy matches
  // assets/materials exactly, identical between both role uploads.
  identityPhotoHeadline: 'Add a profile photo',
  identityPhotoSubtitle: 'Optional, but helps farmers recognize your orders',
  identityPhotoTakePhoto: 'Take Photo',
  identityPhotoSelectGallery: 'Select Gallery',
  identityPhotoSkip: 'Skip',
  identityPhotoContinue: 'Continue',

  // Consumer delivery location — (profile)/consumer-location.tsx — copy
  // matches assets/materials exactly
  consumerLocationHeadline: 'Where should we deliver?',
  consumerLocationSubtitle: "We'll show you farmers near this location",
  consumerLocationUseCurrent: 'Use my current location',
  consumerLocationOr: 'or enter it manually',
  consumerLocationPlaceholder: 'Home address',
  consumerLocationContinue: 'Continue',
  consumerLocationPermissionTitle: 'Allow location access?',
  consumerLocationPermissionBody:
    "We'll use this once to fill in your address and find farmers near you. You can still enter your address manually if you'd rather not share it.",
  consumerLocationPermissionAllow: 'Allow',
  consumerLocationPermissionDeny: 'Not now',
  consumerLocationDetectFailed: "Couldn't detect your location. Enter your address manually.",

  // Farm location — (profile)/farm-location.tsx — copy matches
  // assets/materials/Farmers flow exactly
  farmLocationHeadline: "Where's your farm?",
  farmLocationSubtitle: 'So nearby households can find your produce',
  farmLocationUseCurrent: 'Use my current location',
  farmLocationOr: 'or enter it manually',
  farmLocationPlaceholder: 'Home address',
  farmLocationContinue: 'Continue',
  farmLocationPermissionTitle: 'Allow location access?',
  farmLocationPermissionBody:
    "We'll use this once to fill in your farm's address and help nearby households find you. You can still enter it manually if you'd rather not share it.",
  farmLocationPermissionAllow: 'Allow',
  farmLocationPermissionDeny: 'Not now',
  farmLocationDetectFailed: "Couldn't detect your location. Enter your address manually.",

  // Bank details — (profile)/bank-details.tsx — copy matches
  // assets/materials/Farmers flow exactly
  bankDetailsHeadline: 'Add your bank details',
  bankDetailsSubtitle: 'This is where you will receive payments',
  bankDetailsSelectBank: 'Select your bank',
  bankDetailsAccountNumber: 'Account number',
  bankDetailsEncryptedNote: 'Encrypted • Used for only payouts',
  bankDetailsContinue: 'Continue',
  bankDetailsResolving: 'Resolving account…',
  bankDetailsResolveFailed: "Couldn't resolve this account. Check the details and try again.",
  bankDetailsAgreementRequired: 'Agree to the Terms & Conditions and Privacy Policy to continue',
  // Name-matching outcomes (src/lib/nameMatch.ts), per build spec 7.8 —
  // copy for 'review' and 'blocked' is given verbatim in the spec.
  bankNameReview: "We'll confirm this matches your details shortly.",
  bankNameMismatch:
    'This account belongs to a different name. Payments must go to an account in your name.',
  bankNameMismatchEditAction: 'Edit my name',
  bankNameMismatchRetryAction: 'Try another account',

  // Review profile — (profile)/review-profile.tsx — copy matches
  // assets/materials/Farmers flow exactly
  reviewHeadline: 'Review Your Profile',
  reviewSubtitle: 'This is what your households will see',
  reviewVerifiedBadge: 'Verified farmer',
  reviewNote:
    "This is your public profile — it's what households see when they find your farm. Your bank details stay private and are only ever used to send you payments. You can update anything here later from your profile",
  reviewConfirm: 'Confirm & Continue',
  reviewEdit: 'Edit Details',
  reviewCopyAccountNumber: 'Account number copied',

  // Dev-only OTP bypass — (auth)/verify.tsx
  devModeBanner: 'DEV MODE',

  // Farmer sign-up complete — (app)/index.tsx equivalent for farmers isn't
  // built yet beyond the shared placeholder; kept here for the review
  // screen's post-confirm state if needed later.
} as const;

export type StringKey = keyof typeof strings;
