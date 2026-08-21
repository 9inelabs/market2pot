import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/app/CountBadge';
import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { PhotoBackdrop } from '@/components/marketing/PhotoBackdrop';
import { Stagger } from '@/components/motion/Stagger';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import { strings } from '@/i18n/strings';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, withOpacity } from '@/theme/tokens';
import { bodyFont, interFont } from '@/theme/typography';
import { DESIGN_STATUS_BAR, useDesignScale } from '@/theme/useDesignScale';

// Measured off the uploaded welcome-back mockup at the same 428x926 frame
// welcome.tsx uses. Unlike welcome there's no vector export of this screen,
// so these are read off the raster rather than lifted from an SVG — the
// shared pieces (frame width, photo backdrop, pill geometry, tinted-fill
// recipe) are taken from the vector frame so the two screens stay in step.
const D = {
  // How far up the produce band is pulled — see the knobs documented in
  // PhotoBackdrop. More negative = band ends higher = more clean cream behind
  // the wordmark.
  backdropOffsetY: -90,
  // Frame y=232 for the wordmark, less the nominal status bar the frame draws
  // its photo behind. Shrinks first on a viewport shorter than the frame.
  topOffset: 232 - DESIGN_STATUS_BAR,
  topOffsetMin: 72,
  wordmark: { width: 272, height: 67.5 },
  leafGap: 16,
  leaf: { width: 49, height: 54 },
  headingGap: 42,
  // "Welcome Back." is the quiet line and the name is the loud one — the
  // design leans on that contrast harder than a 18/24 pairing does.
  heading: { fontSize: 16, lineHeight: 20 },
  nameGap: 6,
  name: { fontSize: 28, lineHeight: 34 },
  subtitleGap: 6,
  subtitle: { fontSize: 14, lineHeight: 17 },
  shortcutGap: 18,
  shortcut: { size: 44, gap: 12, icon: 18, badge: 16 },
  // The screen's slack: grows on a tall viewport, shrinks on a short one.
  browseGap: 44,
  browseGapMin: 20,
  // Narrower and shorter than welcome's 388x60 buttons — this screen insets
  // its column by 40 rather than 20.
  button: { height: 52, radius: 26, fontSize: 17 },
  logoutGap: 18,
  hintGap: 12,
  hint: { fontSize: 13, lineHeight: 16 },
  signUpGap: 41,
  signUp: { fontSize: 13, lineHeight: 16 },
  bottom: 91,
  bottomMin: 16,
  screenPadding: 40,
} as const;

// Shown to a returning, fully-onboarded user on cold start (see the
// routing gate in (onboarding)/intro.tsx) instead of either silently
// dropping them into the app or making them re-authenticate — the session
// already persisted, this is just a deliberate confirmation step matching
// the uploaded design.
export default function WelcomeBackScreen() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const unreadNotifications = useUnreadNotificationCount();
  const { itemCount } = useCart();
  const { ds, frameWidth } = useDesignScale();

  const displayName = farmerProfile?.farm_name ?? profile?.full_name ?? '';

  const enterApp = () => router.replace('/(app)');

  const goToShortcut = (path: '/(app)/notifications' | '/(app)/cart') => {
    router.replace('/(app)');
    router.push(path);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const shortcutStyle = [
    styles.shortcutButton,
    { width: ds(D.shortcut.size), height: ds(D.shortcut.size), borderRadius: ds(D.shortcut.size / 2) },
  ];

  return (
    // Lifted further than welcome's default: this screen's first content (the
    // wordmark) sits higher up the cream than welcome's hero does, so the
    // produce band has to have finished fading sooner. See PhotoBackdrop.
    <PhotoBackdrop offsetY={D.backdropOffsetY}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View
          style={[
            styles.frame,
            { width: frameWidth, paddingHorizontal: ds(D.screenPadding) },
          ]}
        >
          <View style={{ height: ds(D.topOffset), minHeight: ds(D.topOffsetMin), flexShrink: 1 }} />

          <Stagger initialDelay={80}>
            <View style={styles.centered}>
              <Wordmark width={ds(D.wordmark.width)} height={ds(D.wordmark.height)} />
            </View>

            <View style={[styles.centered, { marginTop: ds(D.leafGap) }]}>
              <LeafMark width={ds(D.leaf.width)} height={ds(D.leaf.height)} />
            </View>

            <Text
              style={[
                styles.heading,
                {
                  fontSize: ds(D.heading.fontSize),
                  lineHeight: ds(D.heading.lineHeight),
                  marginTop: ds(D.headingGap),
                },
              ]}
            >
              {strings.welcomeBackHeading}
            </Text>

            <Text
              style={[
                styles.name,
                {
                  fontSize: ds(D.name.fontSize),
                  lineHeight: ds(D.name.lineHeight),
                  marginTop: ds(D.nameGap),
                },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  fontSize: ds(D.subtitle.fontSize),
                  lineHeight: ds(D.subtitle.lineHeight),
                  marginTop: ds(D.subtitleGap),
                },
              ]}
            >
              {strings.welcomeBackSubtitle}
            </Text>

            <View
              style={[
                styles.shortcutRow,
                { gap: ds(D.shortcut.gap), marginTop: ds(D.shortcutGap) },
              ]}
            >
              <Pressable
                onPress={() => goToShortcut('/(app)/notifications')}
                style={shortcutStyle}
                accessibilityRole="button"
                accessibilityLabel={strings.homeNotificationsLabel}
              >
                <Feather name="bell" size={ds(D.shortcut.icon)} color={colors.textPrimary} />
                <CountBadge count={unreadNotifications} size={ds(D.shortcut.badge)} />
              </Pressable>
              <Pressable
                onPress={() => goToShortcut('/(app)/cart')}
                style={shortcutStyle}
                accessibilityRole="button"
                accessibilityLabel={strings.homeCartLabel}
              >
                <Feather name="shopping-cart" size={ds(D.shortcut.icon)} color={colors.textPrimary} />
                <CountBadge
                  count={itemCount}
                  color={colors.goldenWheat}
                  size={ds(D.shortcut.badge)}
                />
              </Pressable>
            </View>
          </Stagger>

          <View
            style={{
              height: ds(D.browseGap),
              minHeight: ds(D.browseGapMin),
              flexGrow: 1,
              flexShrink: 1,
            }}
          />

          <Stagger initialDelay={290}>
            <Button
              label={strings.welcomeBackBrowse}
              onPress={enterApp}
              style={[styles.button, { height: ds(D.button.height), borderRadius: ds(D.button.radius) }]}
              textStyle={{ fontSize: ds(D.button.fontSize) }}
            />

            <Button
              label={strings.welcomeBackLogout}
              variant="muted"
              onPress={handleLogout}
              style={[
                styles.button,
                {
                  height: ds(D.button.height),
                  borderRadius: ds(D.button.radius),
                  marginTop: ds(D.logoutGap),
                },
              ]}
              textStyle={{ fontSize: ds(D.button.fontSize) }}
            />

            <Text
              style={[
                styles.hint,
                {
                  fontSize: ds(D.hint.fontSize),
                  lineHeight: ds(D.hint.lineHeight),
                  marginTop: ds(D.hintGap),
                },
              ]}
            >
              {strings.welcomeBackLogoutHint}
            </Text>

            <View style={[styles.signUpRow, { marginTop: ds(D.signUpGap) }]}>
              <Text
                style={[
                  styles.signUpPrompt,
                  { fontSize: ds(D.signUp.fontSize), lineHeight: ds(D.signUp.lineHeight) },
                ]}
              >
                {strings.welcomeBackNoAccount}{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(profile)/role')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={strings.welcomeBackSignUp}
              >
                <Text
                  style={[
                    styles.signUpLink,
                    { fontSize: ds(D.signUp.fontSize), lineHeight: ds(D.signUp.lineHeight) },
                  ]}
                >
                  {strings.welcomeBackSignUp}
                </Text>
              </Pressable>
            </View>
          </Stagger>

          <View style={{ height: ds(D.bottom), minHeight: ds(D.bottomMin), flexShrink: 1 }} />
        </View>
      </SafeAreaView>
    </PhotoBackdrop>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // No background — PhotoBackdrop paints behind this.
  },
  frame: {
    flex: 1,
    alignSelf: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  // Inter by name on both platforms, not bodyFont() — the design specifies
  // Inter here, and bodyFont() would hand iOS the system font instead.
  heading: {
    ...interFont.regular,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  name: {
    ...interFont.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...bodyFont('medium'),
    color: colors.harvestGreen,
    textAlign: 'center',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  shortcutButton: {
    borderWidth: 1,
    borderColor: colors.skeleton,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
  hint: {
    ...bodyFont('regular'),
    color: colors.harvestGreen,
    textAlign: 'center',
  },
  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpPrompt: {
    ...bodyFont('regular'),
    color: withOpacity(colors.deepSoil, 0.5),
  },
  signUpLink: {
    ...bodyFont('semibold'),
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
});
