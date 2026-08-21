import { Platform, TextStyle } from 'react-native';

// --- iOS font bundling status ----------------------------------------------
// Android header (Archivo Expanded, static instances) and Android body
// (Inter, via @expo-google-fonts/inter) are fully bundled and loaded.
//
// iOS has NO font files in assets/fonts/ — no SFProDisplay-ExpandedSemibold.otf
// and no SFProText-Regular/Medium/Semibold.otf. Per the build spec these must
// be downloaded from Apple's developer site; they are not present, so iOS
// temporarily falls back to the OS system font instead of failing silently.
//
// TODO(ios-fonts): once the .otf files are added to assets/fonts/ and
// registered in the font-loading hook (src/theme/useAppFonts.ts), flip this
// to true — the fallback families below will stop being used.
const IOS_FONTS_BUNDLED = false;

if (__DEV__ && Platform.OS === 'ios' && !IOS_FONTS_BUNDLED) {
  console.warn(
    '[typography] SF Pro Expanded/Text .otf files are missing from assets/fonts/. ' +
      'iOS is temporarily using the system font — headers will not match the intended ' +
      'design metrics until the licensed files are supplied. See build spec section 3.'
  );
}

type BodyWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const headerFamily: string | undefined = IOS_FONTS_BUNDLED
  ? Platform.select({ ios: 'SFProDisplay-ExpandedSemibold', android: 'ArchivoExpanded-SemiBold' })
  : Platform.select({ ios: undefined, android: 'ArchivoExpanded-SemiBold' });

const bodyFamilies: Record<BodyWeight, string | undefined> = IOS_FONTS_BUNDLED
  ? Platform.select({
      ios: {
        regular: 'SFProText-Regular',
        medium: 'SFProText-Medium',
        semibold: 'SFProText-Semibold',
        bold: 'SFProText-Bold',
      },
      android: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
      },
    })!
  : Platform.select({
      ios: { regular: undefined, medium: undefined, semibold: undefined, bold: undefined },
      android: {
        regular: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
      },
    })!;

// The iOS system-font fallback has no custom family to encode weight in, so it
// needs an explicit numeric fontWeight. Android's custom TTFs must NOT also
// get a fontWeight — RN/Android can silently substitute the system font when a
// custom font family is combined with a weight it doesn't declare.
const iosFallbackWeight: Record<BodyWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

function header(): TextStyle {
  return { fontFamily: headerFamily };
}

function body(weight: BodyWeight): TextStyle {
  const family = bodyFamilies[weight];
  if (Platform.OS === 'ios' && !IOS_FONTS_BUNDLED) {
    return { fontFamily: family, fontWeight: iosFallbackWeight[weight] };
  }
  return { fontFamily: family };
}

export const typography = {
  h1: { ...header(), fontSize: 32 },
  h2: { ...header(), fontSize: 28 },
  body: { ...body('regular'), fontSize: 16 },
  label: { ...body('medium'), fontSize: 14 },
  button: { ...body('semibold'), fontSize: 17 },
  caption: { ...body('regular'), fontSize: 13 },
  // Headline/subtitle for every screen EXCEPT Welcome — Archivo Expanded
  // (the `header` family above) is reserved for Welcome's brand moment,
  // matching the wordmark. Everywhere else (phone, OTP, name, photo,
  // location, role...) uses the body family at these sizes instead — SF
  // Pro Text on iOS (via the system-font fallback), Inter on Android.
  stepHeadline: { ...body('bold'), fontSize: 30 },
  stepSubtitle: { ...body('semibold'), fontSize: 13, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;

// Raw family names — used by the font-loading hook to know what it must load,
// and by components (e.g. the brand wordmark) that need a family name directly
// rather than a full text style.
export const fontFamilies = {
  header: headerFamily,
  bodyRegular: bodyFamilies.regular,
  bodyMedium: bodyFamilies.medium,
  bodySemibold: bodyFamilies.semibold,
  bodyBold: bodyFamilies.bold,
} as const;

// Family (plus the iOS fallback's explicit weight) with no size attached —
// for the two brand screens, whose type sizes come from the design frame and
// are scaled per-device rather than picked off the fixed scale above.
export function bodyFont(weight: BodyWeight): TextStyle {
  return body(weight);
}

export function headerFont(): TextStyle {
  return header();
}

// Inter explicitly, on BOTH platforms — for the places a design calls for
// Inter by name rather than "whatever the body family is". `bodyFont()` above
// deliberately does not give you Inter on iOS: it honours the build spec's
// intent that iOS use SF Pro Text, and currently falls back to the OS system
// font because those .otf files aren't bundled. Inter itself is loaded on both
// platforms by useAppFonts, so naming it directly always works.
export const interFont = {
  regular: { fontFamily: 'Inter_400Regular' },
  medium: { fontFamily: 'Inter_500Medium' },
  semibold: { fontFamily: 'Inter_600SemiBold' },
  bold: { fontFamily: 'Inter_700Bold' },
} as const satisfies Record<string, TextStyle>;
