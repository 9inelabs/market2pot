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

  // Existing-account detection at signup — (auth)/phone.tsx
  phoneExistingAccountTitle: 'Account already exists',
  phoneExistingAccountMessage: 'An account already exists with this number. Sign in instead.',
  phoneExistingAccountConfirm: 'Go to Sign In',

  // Forgot password — reuses phone.tsx/verify.tsx with mode="reset"
  forgotPasswordHeadline: 'Reset your password',
  forgotPasswordSubtitle: "We'll text you a code to confirm it's you",
  forgotPasswordNoAccount: "We couldn't find an account with this number.",
  forgotPasswordLink: 'Forgot password?',

  // Set password — (profile)/set-password.tsx, shared signup/reset
  setPasswordHeadlineSignup: 'Create a password',
  setPasswordSubtitleSignup: "You'll use this with your phone number to sign in next time",
  setPasswordHeadlineReset: 'Set a new password',
  setPasswordSubtitleReset: 'Choose a new password for your account',
  setPasswordPlaceholder: 'Password',
  setPasswordConfirmPlaceholder: 'Confirm password',
  setPasswordTooShort: 'Password must be at least 8 characters',
  setPasswordMismatch: "Passwords don't match",
  setPasswordContinue: 'Continue',
  setPasswordSave: 'Save password',

  // Login — (auth)/login.tsx
  loginHeadline: 'Welcome back',
  loginSubtitle: 'Sign in with your phone number and password',
  loginPasswordPlaceholder: 'Password',
  loginButton: 'Sign In',
  loginInvalidCredentials: 'Incorrect phone number or password.',
  loginNoAccount: "Don't have a market2pot account?",
  loginSignUpLink: 'Sign Up',

  // Welcome Back — (onboarding)/welcome-back.tsx
  welcomeBackHeading: 'Welcome Back.',
  welcomeBackSubtitle: 'Check out fresh produce today',
  welcomeBackBrowse: 'Browse Produce',
  welcomeBackLogout: 'Log Out',
  welcomeBackLogoutHint: "You'll be required to sign in again",
  welcomeBackNoAccount: "Don't have a market2pot account?",
  welcomeBackSignUp: 'Sign Up',

  // Farmer sign-up complete — (app)/index.tsx equivalent for farmers isn't
  // built yet beyond the shared placeholder; kept here for the review
  // screen's post-confirm state if needed later.

  // App shell — shared across both Home variants and the tab bar.
  comingSoonMessage: "This is coming in a future update — we're working on it.",

  // Household Home — (app)/(tabs)/index.tsx, matches assets/materials/Home page.png
  homeSearchPlaceholder: 'Search fresh produce',
  homeRegisterBannerTitle: 'Have produce to sell?',
  homeRegisterBannerSubtitle: 'Register as a farmer and reach households near you',
  homeFarmersNearYou: 'Farmers Near You',
  homeFreshPicks: 'Fresh Picks',
  homeNoLocationTitle: 'Set your delivery location',
  homeNoLocationMessage: 'Add an address so we can show farmers and produce near you.',
  homeNoFarmersTitle: 'No farmers nearby yet',
  homeNoFarmersMessage: "We're growing — check back again soon.",
  homeNoProductsTitle: 'Nothing fresh listed yet',
  homeNoProductsMessage: 'Check back soon for new produce.',
  homeNotificationsLabel: 'Notifications',
  homeCartLabel: 'Cart',
  homeLocationLabel: 'Delivery location',

  // Farmer Home — (app)/(tabs)/index.tsx, farmer branch. No mockup for
  // this one — built to match the household variant's structure/spacing
  // per the instruction to use it as context for related screens.
  farmerHomeStatListings: 'Active Listings',
  farmerHomeStatPendingOrders: 'Pending Orders',
  farmerHomeStatWeekTotal: 'This Week',
  farmerHomeAddListing: 'Add New Listing',
  farmerHomeQuickListings: 'My Listings',
  farmerHomeQuickOrders: 'Orders',
  farmerHomeQuickMessages: 'Messages',
  farmerHomeQuickEditProfile: 'Edit Profile',
  farmerHomeQuickBankDetails: 'Bank Details',
  farmerHomeQuickSettings: 'Settings',
  farmerHomeRecentOrders: 'Recent Orders',
  farmerHomeMyListings: 'My Listings',
  farmerHomeNoOrdersTitle: 'No orders yet',
  farmerHomeNoOrdersMessage: 'Orders from households will show up here.',
  farmerHomeNoListingsTitle: 'List your first product',
  farmerHomeNoListingsMessage:
    'Households nearby are ready to buy fresh — add your first listing to get started.',
  farmerHomeNoListingsAction: 'Add Listing',

  // Listings tab — (app)/(tabs)/listings.tsx
  listingsTitle: 'My Listings',
  listingsEmptyTitle: 'No listings yet',
  listingsEmptyMessage: 'Add your first product so households nearby can find it.',
  listingsDeleteTitle: 'Delete this listing?',
  listingsDeleteMessage: "This can't be undone — the listing will be removed for good.",
  listingsDeleteConfirm: 'Delete',
  listingsDeleteCancel: 'Cancel',
  listingsAddLabel: 'Add listing',

  // Add/edit listing — (app)/listing/add.tsx, (app)/listing/[id].tsx
  listingFormTitleAdd: 'Add Listing',
  listingFormTitleEdit: 'Edit Listing',
  listingFormPhotoLabel: 'Photo',
  listingFormName: 'Product name',
  listingFormNamePlaceholder: 'e.g. Fresh Tomatoes',
  listingFormDescription: 'Description (optional)',
  listingFormDescriptionPlaceholder: 'What makes this product special? How was it grown?',
  listingFormCategory: 'Category',
  listingFormCategoryPlaceholder: 'e.g. Vegetables',
  listingFormPrice: 'Price (NGN)',
  listingFormPricePlaceholder: '0',
  listingFormUnit: 'Unit',
  listingFormUnitPlaceholder: 'e.g. basket, kg',
  listingFormQuantity: 'Quantity available',
  listingFormQuantityPlaceholder: '0',
  listingFormHarvestDate: 'Harvest date (optional)',
  listingFormHarvestDatePlaceholder: 'Select a date',
  listingFormSave: 'Save Listing',
  listingFormRequired: 'Fill in the product name, category, price, and unit to continue',
  listingFormPriceInvalid: 'Enter a valid price',

  // Farmer Profile (household-facing) — (app)/farmer/[id].tsx
  farmerProfileMessage: 'Message',
  farmerProfileSaveLabel: 'Save farmer',
  farmerProfileNoBio: "This farmer hasn't added a bio yet.",
  farmerProfileListings: 'Listings',
  farmerProfileNoListings: 'No listings yet',
  farmerProfileNoListingsMessage: 'Check back soon for fresh produce from this farm.',
  farmerProfileReviews: 'Reviews',
  farmerProfileNoReviews: 'No reviews yet',
  farmerProfileNoReviewsMessage: 'Be the first to order and leave a review.',
  farmerProfileNotFound: 'This farmer profile could not be found.',

  // Nearby Farmers full list — (app)/nearby-farmers.tsx
  nearbyFarmersTitle: 'Farmers Near You',

  // Register as a farmer — (app)/register-farmer/*.tsx. Reuses the farm
  // location + bank steps' underlying hooks/components from the original
  // signup flow, but skips phone/OTP (already authenticated) and starts
  // with a new farm-details step, since the original flow never collected
  // a distinct farm name.
  registerFarmerFarmDetailsHeadline: "Let's set up your farm",
  registerFarmerFarmDetailsSubtitle: 'Tell households what to call your farm',
  registerFarmerFarmNameLabel: 'Farm name',
  registerFarmerFarmNamePlaceholder: 'e.g. Adeyemi Family Farm',
  registerFarmerFarmNameRequired: 'Enter a farm name to continue',
  registerFarmerBioLabel: 'About your farm (optional)',
  registerFarmerBioPlaceholder: 'What do you grow? How long have you been farming?',
  registerFarmerContinue: 'Continue',
  // Location and bank steps reuse farmLocation*/bankDetails* strings
  // above verbatim — same copy, same underlying hooks/components, just a
  // different completion handler (this flow creates farmer_profiles at the
  // end instead of advancing the original signup's onboarding_step).

  // Settings — (app)/(tabs)/profile.tsx and (app)/settings/*.tsx
  settingsTitle: 'Settings',
  settingsAccountGroup: 'Account',
  settingsEditProfile: 'Edit Profile',
  settingsPhoneNumber: 'Phone Number',
  settingsLanguage: 'Language',
  settingsLanguageValue: 'English',
  settingsNotifications: 'Notifications',
  settingsPayoutGroup: 'Payouts',
  settingsPayoutBankDetails: 'Bank Details',
  settingsModeGroup: 'Mode',
  settingsSwitchToFarmer: 'Switch to Selling',
  settingsSwitchToHousehold: 'Switch to Shopping',
  settingsSwitchModeDescription: 'Flips which Home and tabs you see',
  settingsSupportGroup: 'Support',
  settingsHelp: 'Help & Support',
  settingsTerms: 'Terms & Conditions',
  settingsPrivacy: 'Privacy Policy',
  settingsRegisterFarmer: 'Register as a Farmer',
  settingsLogout: 'Log Out',
  settingsLogoutConfirmTitle: 'Log out?',
  settingsLogoutConfirmMessage: "You'll need to sign in again to continue.",
  settingsDeleteAccount: 'Delete Account',
  settingsDeleteAccountConfirmTitle: 'Delete your account?',
  settingsDeleteAccountConfirmMessage:
    'This will permanently remove your account and all your data. This cannot be undone.',
  settingsDeleteAccountUnavailable:
    "Account deletion isn't available yet — contact support and we'll take care of it.",
  settingsConfirmAction: 'Confirm',
  settingsCancelAction: 'Cancel',

  // Edit Profile — (app)/settings/edit-profile.tsx
  editProfileTitle: 'Edit Profile',
  editProfileFullName: 'Full name',
  editProfileFarmName: 'Farm name',
  editProfileBio: 'About your farm',
  editProfileSave: 'Save Changes',
  editProfileSaved: 'Profile updated',
  editProfileRequired: 'Enter your full name to continue',

  // Payout & Bank Details (Settings) — (app)/settings/bank-details.tsx
  settingsBankDetailsTitle: 'Payout & Bank Details',
  settingsBankDetailsCurrentLabel: 'Current payout account',
  settingsBankDetailsNone: "You haven't added a payout account yet.",
  settingsBankDetailsUpdate: 'Update Bank Details',

  // Help & Support — (app)/settings/help.tsx
  helpTitle: 'Help & Support',
  helpBody:
    'Need a hand? Reach out to us at support@market2pot.com and we’ll get back to you as soon as we can.',

  // Farmer Home hub — rebuild of src/components/app/home/FarmerHome.tsx,
  // matching assets/materials/farmers screen/01-home-hub.html
  farmerHubLowStockBanner: (count: number) => `${count} listing${count === 1 ? '' : 's'} running low on stock`,
  farmerHubQuickAddProduct: 'Add product',
  farmerHubQuickListings: 'My listings',
  farmerHubQuickOrders: 'Orders',
  farmerHubQuickInsights: 'Insights',
  farmerHubQuickPromotions: 'Promotions',
  farmerHubQuickReviews: 'Reviews',
  farmerHubQuickBusiness: 'Business',
  farmerHubQuickShare: 'Share profile',
  farmerHubQuickMessages: 'Messages',
  farmerHubUpcomingHarvestPrefix: 'Next harvest:',
  farmerHubUpcomingHarvestReadyToday: 'Ready today',
  farmerHubUpcomingHarvestReadyInDays: (days: number) => `Ready in ${days} day${days === 1 ? '' : 's'}`,
  farmerHubPreorderCount: (count: number) => `${count} pre-order${count === 1 ? '' : 's'} waiting`,
  farmerHubSectionManage: 'Manage your farm',

  // Listings tab — bulk actions extension
  listingsSelect: 'Select',
  listingsSelectCancel: 'Cancel',
  listingsSelectedCount: (count: number) => `${count} selected`,
  listingsBulkUpdatePrice: 'Update price',
  listingsBulkToggleAvailability: 'Toggle availability',
  listingsBulkPriceModalTitle: 'Update price',
  listingsBulkPriceModalMessage: 'Set a new price for the selected listings.',
  listingsBulkPricePlaceholder: 'New price (NGN)',
  listingsBulkPriceApply: 'Apply',
  listingsBulkPriceInvalid: 'Enter a valid price',
  listingsLowStockLabel: (remaining: number) => `Low stock: ${remaining} left`,
  listingsPromotionLabel: (percent: number) => `${percent}% OFF`,
  listingsFilterLowStock: 'Low stock',

  // Add/Edit Product extension — src/screens/ListingFormScreen.tsx
  listingFormPhotosLabel: 'Photos',
  listingFormAddPhoto: 'Add photo',
  listingFormRemovePhoto: 'Remove photo',
  listingFormLowStockThreshold: 'Low-stock alert',
  listingFormLowStockThresholdPlaceholder: '5',
  listingFormPreorderLabel: 'Available for pre-order',
  listingFormPreorderHint: 'Let households order before harvest',
  listingFormPreorderNeedsDate: 'Pre-order listings need a future harvest date',

  // Insights & Growth — (app)/insights.tsx
  insightsTitle: 'Insights',
  insightsWeeklySales: "This week's sales",
  insightsBestSellers: 'Best sellers',
  insightsBestSellersEmpty: 'No sales yet — units sold will show up here.',
  insightsSoldSuffix: 'sold',
  insightsActivePromotion: 'Active promotion',
  insightsNoPromotionsTitle: 'No promotions yet',
  insightsNoPromotionsMessage: 'Create one to bring more households to a listing.',
  insightsCreatePromotion: 'Create a promotion',
  insightsCreateAnotherPromotion: 'Create another promotion',
  insightsPromotionEndsIn: (days: number) => `ends in ${days} day${days === 1 ? '' : 's'}`,
  insightsPromotionEndsToday: 'ends today',
  insightsReviewsSuffix: 'reviews',
  insightsNoReviewsYet: 'No reviews yet',
  insightsViewAllReviews: 'View all reviews',
  insightsSharePromptTitle: 'Share your farm profile',
  insightsSharePromptSubtitle: 'Bring more households to your listings',
  insightsShareMessage: (farmName: string, url: string) =>
    `Check out ${farmName} on Market2pot — fresh produce straight from the farm: ${url}`,
  insightsShareUnavailable: "Sharing isn't available on this device.",

  // Create promotion modal
  createPromotionTitle: 'Create a promotion',
  createPromotionProductLabel: 'Product',
  createPromotionProductPlaceholder: 'Select a product',
  createPromotionDiscountLabel: 'Discount (%)',
  createPromotionDiscountPlaceholder: '20',
  createPromotionEndDateLabel: 'Ends on',
  createPromotionSubmit: 'Create promotion',
  createPromotionInvalid: 'Choose a product, a discount between 1–100%, and a future end date',

  // Reviews list — (app)/reviews.tsx
  reviewsTitle: 'Reviews',
  reviewsEmptyTitle: 'No reviews yet',
  reviewsEmptyMessage: 'Reviews from households will show up here.',

  // Business Settings — (app)/business/settings.tsx
  businessSettingsTitle: 'Business settings',
  businessSettingsOpenToggle: 'Currently open for orders',
  businessSettingsDeliverySection: 'DELIVERY',
  businessSettingsDeliveryZones: 'Delivery zones & fees',
  businessSettingsDeliveryZonesCount: (count: number) => `${count} zone${count === 1 ? '' : 's'} set up`,
  businessSettingsDeliveryZonesEmpty: 'No zones set up yet',
  businessSettingsAvailabilitySection: 'AVAILABILITY',
  businessSettingsHours: 'Business hours',
  businessSettingsHoursNotSet: 'Not set yet',
  businessSettingsTrustSection: 'TRUST',
  businessSettingsVerification: 'Verification progress',
  businessSettingsVerificationCount: (done: number, total: number) => `${done} of ${total} steps complete`,

  // Delivery zones — (app)/business/delivery-zones.tsx
  deliveryZonesTitle: 'Delivery zones & fees',
  deliveryZonesEmptyTitle: 'No zones yet',
  deliveryZonesEmptyMessage: 'Add a zone so households know your delivery fees.',
  deliveryZonesAdd: 'Add zone',
  deliveryZonesFormTitleAdd: 'Add delivery zone',
  deliveryZonesFormTitleEdit: 'Edit delivery zone',
  deliveryZonesNameLabel: 'Zone name',
  deliveryZonesNamePlaceholder: 'e.g. Lekki Phase 1',
  deliveryZonesFeeLabel: 'Delivery fee (NGN)',
  deliveryZonesFeePlaceholder: '500',
  deliveryZonesSave: 'Save zone',
  deliveryZonesDeleteTitle: 'Delete this zone?',
  deliveryZonesDeleteMessage: "This can't be undone.",
  deliveryZonesInvalid: 'Enter a zone name and a valid fee',

  // Business hours — (app)/business/hours.tsx
  businessHoursTitle: 'Business hours',
  businessHoursClosed: 'Closed',
  businessHoursOpenLabel: 'Open',
  businessHoursCloseLabel: 'Close',
  businessHoursSave: 'Save hours',
  businessHoursSaved: 'Business hours updated',

  // Verification — (app)/business/verification.tsx
  verificationTitle: 'Verification progress',
  verificationRemainingTitle: 'Steps remaining',
  verificationAllDoneTitle: "You're fully verified",
  verificationAllDoneMessage: 'All 4 verification steps are complete.',

  // Farmer Profile tab — src/components/app/profile/FarmerProfileTab.tsx,
  // matches assets/materials/farmers screen/06-profile-tab.html
  farmerProfileTabViewPublic: 'View public profile',
  farmerProfileTabSwitchTitle: 'Switch to Shopping view',
  farmerProfileTabSwitchSubtitle: 'Browse and order as a household',
  farmerProfileTabFarmGroup: 'FARM',
  farmerProfileTabGeneralGroup: 'GENERAL',
  farmerProfileTabEditProfile: 'Edit profile',
  farmerProfileTabBusinessSettings: 'Business settings',
  farmerProfileTabBankDetails: 'Bank details',
  farmerProfileTabAppSettings: 'App settings',
  farmerProfileTabHelp: 'Help & Support',
  farmerProfileTabLogout: 'Log out',

  // Edit profile extension (farm photo) — (app)/settings/edit-profile.tsx
  editProfileFarmPhoto: 'Farm photo',
  editProfileContactPhone: 'Contact phone',

  // Orders tab — (app)/(tabs)/orders.tsx, farmer branch
  ordersTitle: 'Orders',
  ordersFilterAll: 'All',
  ordersFilterPending: 'Pending',
  ordersFilterPreparing: 'Preparing',
  ordersFilterReadyOut: 'Ready/Out',
  ordersFilterDelivered: 'Delivered',
  ordersDateFilterAll: 'All time',
  ordersDateFilterToday: 'Today',
  ordersDateFilterWeek: 'This week',
  ordersDateFilterMonth: 'This month',
  ordersEmptyTitle: 'No orders yet',
  ordersEmptyMessage: 'Orders from households will show up here.',
  ordersStatusPending: 'Pending',
  ordersStatusPreparing: 'Preparing',
  ordersStatusPackaged: 'Packaged',
  ordersStatusReadyForPickup: 'Ready',
  ordersStatusOutForDelivery: 'Out for delivery',
  ordersStatusDelivered: 'Delivered',
  ordersStatusCancelled: 'Cancelled',

  // Order detail — (app)/order/[id].tsx
  orderDetailTitlePrefix: 'Order #',
  orderDetailStagePlaced: 'Placed',
  orderDetailStagePreparing: 'Preparing',
  orderDetailStageReadyForPickup: 'Ready for pickup',
  orderDetailStageOutForDelivery: 'Out for delivery',
  orderDetailStageDelivered: 'Delivered',
  orderDetailPickupTag: 'Pickup',
  orderDetailItemsTitle: 'Items',
  orderDetailTotal: 'Total',
  orderDetailCallCustomer: 'Call customer',
  orderDetailAwaitingConfirmation: 'Waiting for the household to confirm delivery',
  orderDetailNotFound: 'This order could not be found.',

  // Messages inbox — (app)/(tabs)/messages.tsx, farmer branch
  messagesTitle: 'Messages',
  messagesMarkAllRead: 'Mark all as read',
  messagesViewProfile: 'View Profile',
  messagesReply: 'Reply',
  messagesEmptyTitle: 'No messages yet',
  messagesEmptyMessage: "When a household messages you, it'll show up here.",

  // Chat thread — (app)/message/[conversationId].tsx
  chatInputPlaceholder: 'Type a message',
  chatSendLabel: 'Send',
  chatEmptyTitle: 'Say hello',
  chatEmptyMessage: 'This is the start of your conversation.',

  // Notifications — (app)/notifications.tsx
  notificationsTitle: 'Notifications',
  notificationsToday: 'TODAY',
  notificationsEarlier: 'EARLIER',
  notificationsEmptyTitle: 'No notifications yet',
  notificationsEmptyMessage: "You'll see updates about orders, stock, and reviews here.",

  // Product quick-view overlay — src/components/app/ProductQuickViewModal.tsx
  productQuickViewAddToCart: 'Add to Cart',
  productQuickViewViewFull: 'View full details',
  productQuickViewClearCartTitle: 'Start a new cart?',
  productQuickViewClearCartMessage:
    "Your cart has items from a different farmer. You can only order from one farmer at a time — adding this will clear what's already in your cart.",
  productQuickViewClearCartConfirm: 'Clear cart and add',

  // Product Detail — (app)/product/[id].tsx
  productDetailTitle: 'Product',
  productDetailDescriptionTitle: 'About this product',
  productDetailNoDescription: "This farmer hasn't added a description yet.",
  productDetailSoldBy: 'Sold by',
  productDetailNotFound: 'This product could not be found.',

  // Products tab (formerly Search) — (app)/(tabs)/search.tsx
  productsTitle: 'Products',
  searchPlaceholder: 'Search fresh produce',
  searchEmptyQueryTitle: 'Search for fresh produce',
  searchEmptyQueryMessage: 'Try a product name like "tomatoes" or a category like "vegetables".',
  searchNoResultsTitle: 'No results',
  searchNoResultsMessage: "We couldn't find anything matching your search.",

  // Categories — (app)/categories.tsx
  categoriesTitle: 'Categories',
  categoriesEmptyTitle: 'No categories yet',
  categoriesEmptyMessage: 'Check back soon as farmers add more produce.',

  // Cart — (app)/cart.tsx
  cartTitle: 'Cart',
  cartEmptyTitle: 'Your cart is empty',
  cartEmptyMessage: 'Browse fresh produce and add something to get started.',
  cartBrowseProducts: 'Browse products',
  cartFrom: 'From',
  cartSubtotal: 'Subtotal',
  cartCheckout: 'Proceed to Checkout',
  cartRemoveLabel: 'Remove',

  // Checkout — (app)/checkout.tsx
  checkoutTitle: 'Checkout',
  checkoutFulfillmentTitle: 'How would you like to get your order?',
  checkoutPickup: 'Pickup',
  checkoutPickupHint: 'Free — collect from the farm',
  checkoutDelivery: 'Delivery',
  checkoutDeliveryHint: 'Choose a delivery zone',
  checkoutSelectZone: 'Select a delivery zone',
  checkoutNoZonesTitle: 'No delivery zones set up',
  checkoutNoZonesMessage: 'This farmer only offers pickup right now.',
  checkoutNoAddressTitle: 'Add a delivery address',
  checkoutNoAddressMessage: 'Set your delivery address before checking out.',
  checkoutSetAddress: 'Set delivery address',
  checkoutSummaryTitle: 'Order summary',
  checkoutSubtotal: 'Subtotal',
  checkoutDeliveryFee: 'Delivery fee',
  checkoutTotal: 'Total',
  checkoutEscrowTitle: 'Your payment is protected',
  checkoutEscrowBody:
    "We hold your payment securely until you confirm you've received your order in good condition. The farmer is only paid once you tap \"Product Received\" in Track Order — and if they cancel before delivery, you'll get a full refund. Your money is safe even before you see your produce.",
  checkoutPayNow: 'Pay Now',
  checkoutError: 'Something went wrong starting your payment. Try again.',

  // Payment WebView + confirmation — (app)/payment/[orderId].tsx
  paymentTitle: 'Payment',
  paymentVerifying: 'Confirming your payment…',
  paymentFailedTitle: 'Payment not completed',
  paymentFailedMessage: 'Your cart is still here — you can try again whenever you\'re ready.',
  paymentBackToCheckout: 'Back to Checkout',
  orderConfirmedTitle: 'Order placed!',
  orderConfirmedMessage: 'Your payment is held securely until your order is delivered.',
  orderConfirmedTrackOrder: 'Track Order',

  // Orders (household) — (app)/(tabs)/orders.tsx, household branch
  householdOrdersEmptyTitle: 'No orders yet',
  householdOrdersEmptyMessage: 'Orders you place will show up here.',

  // Track Order additions to Order Detail — (app)/order/[id].tsx
  trackOrderProductDelivered: 'Product Delivered',
  trackOrderProductReceived: 'Product Received',
  trackOrderReceivedConfirmTitle: 'Confirm you received your order?',
  trackOrderReceivedConfirmMessage:
    "This releases payment to the farmer, so only confirm once you've received your order in good condition. This can't be undone.",
  trackOrderReceivedConfirmAction: "Yes, I've received it",
  trackOrderWaitingOnFarmer: 'Waiting for the farmer to confirm delivery to release payment.',
  trackOrderWaitingOnHousehold: 'Waiting for you to confirm you received your order.',
  trackOrderCancelOrder: 'Cancel order',
  trackOrderCancelConfirmTitle: 'Cancel this order?',
  trackOrderCancelConfirmMessage:
    "The household will be notified. If they've already paid, they'll be prompted to submit refund details.",
  trackOrderCancelConfirmAction: 'Cancel order',
  trackOrderRefundPendingTitle: 'This order was cancelled',
  trackOrderRefundPendingMessage: 'Add your bank details to receive a refund.',
  trackOrderAddRefundDetails: 'Add bank details for refund',
  trackOrderRefunded: 'Refunded',

  // Chat enhancements — (app)/message/[conversationId].tsx
  chatAttachImage: 'Attach a photo',
  chatEmojiPicker: 'Emoji',
  chatReplyingTo: 'Replying to',
  chatCancelReply: 'Cancel reply',
  chatTypingIndicator: 'typing…',
  chatSeeFarmerProfile: "See farmer's profile",
  chatViewListings: 'View listings',

  // Change delivery address — (app)/change-location.tsx (real now)
  changeLocationTitle: 'Delivery address',
  changeLocationSaved: 'Delivery address updated',
} as const;

export type StringKey = keyof typeof strings;
