import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { ComingSoonToast } from '@/components/feedback/ComingSoonToast';
import { useComingSoonToast } from '@/components/feedback/useComingSoonToast';
import { HeroPlaceholder } from '@/components/marketing/HeroPlaceholder';
import { Button } from '@/components/ui/Button';
import { SignInPill } from '@/components/ui/SignInPill';
import { SocialButton } from '@/components/ui/SocialButton';
import { ENABLE_APPLE_AUTH, ENABLE_GOOGLE_AUTH, ENABLE_GUEST_BROWSE } from '@/config/features';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function WelcomeScreen() {
  const { visible: toastVisible, show: showComingSoon } = useComingSoonToast();
  const { height: windowHeight } = useWindowDimensions();

  const goToPhone = (mode: 'signup' | 'login') => {
    router.push({ pathname: '/(auth)/phone', params: { mode } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <LeafMark width={35} height={38} />
            {/* Wordmark width isn't specified for the top bar (only intro's
                ~190x57 is) — scaled to the leaf mark's height using the
                asset's own aspect ratio (831:231). */}
            <Wordmark width={137} height={38} />
          </View>
          <SignInPill onPress={() => goToPhone('login')} />
        </View>

        {/* height computed from window size, not a CSS percentage — percentage
            heights don't resolve inside a ScrollView's content container,
            which is itself sized by its content. */}
        <View style={[styles.heroWrap, { height: Math.max(windowHeight * 0.4, 240) }]}>
          <HeroPlaceholder />
        </View>

        <Text style={[typography.h1, styles.title]}>{strings.welcomeHeadline}</Text>
        <Text style={[typography.body, styles.subtitle]}>{strings.welcomeSubtitle}</Text>

        <View style={styles.buttonStack}>
          <Button
            label={strings.welcomeBrowseProducts}
            variant="secondary"
            disabled={!ENABLE_GUEST_BROWSE}
            onPress={() => (ENABLE_GUEST_BROWSE ? undefined : showComingSoon())}
          />
          <Button
            label={strings.welcomeGetStarted}
            variant="primary"
            onPress={() => goToPhone('signup')}
          />
          <View style={styles.socialRow}>
            <SocialButton
              label={strings.welcomeContinueWithGoogle}
              disabled={!ENABLE_GOOGLE_AUTH}
              onPress={() => (ENABLE_GOOGLE_AUTH ? undefined : showComingSoon())}
            />
            <SocialButton
              label={strings.welcomeSignInWithApple}
              disabled={!ENABLE_APPLE_AUTH}
              onPress={() => (ENABLE_APPLE_AUTH ? undefined : showComingSoon())}
            />
          </View>
        </View>

        <Text style={[typography.caption, styles.footer]}>{strings.welcomeFooter}</Text>
      </ScrollView>

      <ComingSoonToast visible={toastVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[40],
    gap: spacing[24],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[16],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  heroWrap: {
    // height set inline per-render from useWindowDimensions — see above.
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttonStack: {
    gap: spacing[16],
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: geometry.socialButton.gap,
  },
  footer: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
