import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { ComingSoonToast } from '@/components/feedback/ComingSoonToast';
import { useComingSoonToast } from '@/components/feedback/useComingSoonToast';
import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { LeafWatermark } from '@/components/marketing/LeafWatermark';
import { PhotoBackdrop } from '@/components/marketing/PhotoBackdrop';
import { Stagger } from '@/components/motion/Stagger';
import { Button } from '@/components/ui/Button';
import { SignInPill } from '@/components/ui/SignInPill';
import { SocialButton } from '@/components/ui/SocialButton';
import { ENABLE_APPLE_AUTH, ENABLE_GOOGLE_AUTH, ENABLE_GUEST_BROWSE } from '@/config/features';
import { strings } from '@/i18n/strings';
import { colors, geometry, withOpacity } from '@/theme/tokens';
import { bodyFont, headerFont } from '@/theme/typography';
import { DESIGN_STATUS_BAR, useDesignScale } from '@/theme/useDesignScale';

// Every number below is lifted straight out of assets/design/Onboarding.svg
// (the 428x926 design frame) rather than rounded onto the 8pt scale — this
// screen's whole job is to match the mockup, and the frame still carries each
// rect's exact x/y/w/h plus each text run's exact ink box.
//
// Gaps are the distance from one element's layout box to the next, so laying
// them out in flow reproduces the frame's absolute positions.
const D = {
  // Frame y=50.5 for the brand card, less the nominal status bar the frame
  // draws its photo behind.
  topBarTop: 50.5 - DESIGN_STATUS_BAR,
  brandCard: { width: 218, height: 58 },
  leaf: { width: 35, height: 38 },
  brandGap: 5,
  wordmark: { width: 146, height: 36.2 },
  heroGap: 29.5,
  hero: { width: 247, height: 358 },
  titleGap: 9.9,
  title: { fontSize: 24, lineHeight: 29.4 },
  subtitleGap: 3.6,
  subtitle: { fontSize: 16, lineHeight: 19 },
  browseGap: 25.7,
  button: { height: 60, radius: 30, fontSize: 17 },
  getStartedGap: 5,
  socialGap: 15.25,
  footerGap: 15,
  footer: { fontSize: 13, lineHeight: 17.6 },
  footerBottom: 46.5,
} as const;

export default function WelcomeScreen() {
  const { visible: toastVisible, show: showComingSoon } = useComingSoonToast();
  const { ds, scale, frameWidth } = useDesignScale();
  const reducedMotion = useReducedMotion();

  // Existing users (Sign In) go straight to phone+password login. New users
  // (Get Started) pick a role first — role is chosen before an account
  // exists, so it can't be written to the DB yet; it's carried as a route
  // param through phone -> verify instead. See (profile)/role.tsx.
  const goToSignIn = () => {
    router.push('/(auth)/login');
  };

  const goToRoleSelection = () => {
    router.push('/(profile)/role');
  };

  return (
    // PhotoBackdrop is the root, not a child of SafeAreaView: the photo has to
    // bleed to the physical top of the screen the way the design frame does, so
    // the safe area insets the content on top of it rather than the backdrop
    // itself. LeafWatermark's absolute y=169 is measured from that same frame
    // top, so it sits outside the safe area too.
    <PhotoBackdrop>
      <LeafWatermark />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View
          style={[
            styles.frame,
            {
              width: frameWidth,
              paddingHorizontal: ds(geometry.screenPaddingButtons),
              paddingTop: ds(D.topBarTop),
              paddingBottom: ds(D.footerBottom),
            },
          ]}
        >
          <Stagger initialDelay={80}>
            <View style={styles.topBar}>
              <View
                style={[
                  styles.brandCard,
                  {
                    width: ds(D.brandCard.width),
                    height: ds(D.brandCard.height),
                    borderRadius: ds(geometry.brandCard.radius),
                    paddingHorizontal: ds(geometry.brandCard.paddingHorizontal),
                    gap: ds(D.brandGap),
                  },
                ]}
              >
                <LeafMark width={ds(D.leaf.width)} height={ds(D.leaf.height)} />
                <Wordmark width={ds(D.wordmark.width)} height={ds(D.wordmark.height)} />
              </View>
              <SignInPill onPress={goToSignIn} scale={scale} />
            </View>
          </Stagger>

          {/* Outside Stagger on purpose: this is the one block that flexes to
              absorb the difference between the frame and the real viewport,
              and Stagger's own wrapper View would swallow that flex. */}
          <Animated.View
            style={[styles.heroWrap, { marginTop: ds(D.heroGap) }]}
            entering={
              reducedMotion
                ? undefined
                : FadeIn.delay(150).duration(350).easing(Easing.out(Easing.cubic))
            }
          >
            <HeroIllustration width={ds(D.hero.width)} height={ds(D.hero.height)} />
          </Animated.View>

          <Stagger initialDelay={220}>
            <Text
              style={[
                styles.title,
                {
                  fontSize: ds(D.title.fontSize),
                  lineHeight: ds(D.title.lineHeight),
                  marginTop: ds(D.titleGap),
                },
              ]}
            >
              {strings.welcomeHeadline}
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
              {strings.welcomeSubtitle}
            </Text>

            <Button
              label={strings.welcomeBrowseProducts}
              variant="secondary"
              style={[
                styles.button,
                {
                  height: ds(D.button.height),
                  borderRadius: ds(D.button.radius),
                  marginTop: ds(D.browseGap),
                },
              ]}
              textStyle={{ fontSize: ds(D.button.fontSize) }}
              onPress={() => (ENABLE_GUEST_BROWSE ? router.push('/browse') : showComingSoon())}
            />

            <Button
              label={strings.welcomeGetStarted}
              variant="primary"
              style={[
                styles.button,
                {
                  height: ds(D.button.height),
                  borderRadius: ds(D.button.radius),
                  marginTop: ds(D.getStartedGap),
                },
              ]}
              textStyle={{ fontSize: ds(D.button.fontSize) }}
              onPress={goToRoleSelection}
            />

            <View
              style={[
                styles.socialRow,
                { gap: ds(geometry.socialButton.gap), marginTop: ds(D.socialGap) },
              ]}
            >
              <SocialButton
                provider="google"
                label={strings.welcomeContinueWith}
                accessibilityLabel={strings.welcomeContinueWithGoogle}
                scale={scale}
                onPress={() => (ENABLE_GOOGLE_AUTH ? undefined : showComingSoon())}
              />
              <SocialButton
                provider="apple"
                label={strings.welcomeSignInWith}
                accessibilityLabel={strings.welcomeSignInWithApple}
                scale={scale}
                onPress={() => (ENABLE_APPLE_AUTH ? undefined : showComingSoon())}
              />
            </View>

            <Text
              style={[
                styles.footer,
                {
                  fontSize: ds(D.footer.fontSize),
                  lineHeight: ds(D.footer.lineHeight),
                  marginTop: ds(D.footerGap),
                },
              ]}
            >
              {strings.welcomeFooter}
            </Text>
          </Stagger>
        </View>

        <ComingSoonToast visible={toastVisible} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // Near-white so the lock-up reads against the produce photo behind it;
    // everything below sits on the photo's own warmCream fade.
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...headerFont(),
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...bodyFont('regular'),
    // deepSoil at 70% in the frame, not a separate muted token.
    color: withOpacity(colors.deepSoil, 0.7),
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footer: {
    ...bodyFont('regular'),
    // deepSoil at 50%.
    color: withOpacity(colors.deepSoil, 0.5),
    textAlign: 'center',
  },
});
