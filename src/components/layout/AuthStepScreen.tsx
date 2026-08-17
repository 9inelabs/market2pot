import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeafMark } from '@/components/brand/LeafMark';
import { Stagger } from '@/components/motion/Stagger';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  headline: string;
  subtitle?: string;
  // Rendered in the top bar next to Back (e.g. the profile-photo screen's
  // Skip pill). Not part of the staggered reveal — nav chrome appears
  // immediately, only body content cascades in.
  topRight?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  // Gap from the subtitle down to the screen's own content. Measured
  // per-screen (Phone Number.png: 73, Profile picture.png: 50) — the two
  // designs genuinely use different gaps here depending on what follows
  // (a text field's underline vs. a circular avatar), so this isn't a
  // single constant that can pixel-match every screen at once.
  contentGap?: number;
};

// Shared chrome for the phone/OTP/consumer-onboarding screens: Back button,
// centered leaf mark, headline/subtitle, then whatever content and footer
// each screen needs. Every one of assets/materials' five mockups (and the
// role-selection screen built to match them) uses this exact structure.
export function AuthStepScreen({
  headline,
  subtitle,
  topRight,
  children,
  footer,
  onBack,
  contentGap = 73,
}: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12}>
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        {topRight}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Stagger initialDelay={80}>
            <View style={styles.leafWrap}>
              <LeafMark width={96} height={100} />
            </View>

            <View style={[styles.headerBlock, { marginBottom: contentGap }]}>
              <Text style={[typography.stepHeadline, styles.headline]}>{headline}</Text>
              {subtitle ? (
                <Text style={[typography.stepSubtitle, styles.subtitle]}>{subtitle}</Text>
              ) : null}
            </View>

            <View style={styles.content}>{children}</View>

            {footer ? <View style={styles.footerWrap}>{footer}</View> : <View />}
          </Stagger>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    // Top-anchored, not centered — measured directly off
    // assets/materials/extracted/Phone Number.png (428x926, 1:1 with RN
    // points on that frame size): content sits near the top with ~341pt of
    // empty space below the button, not centered in the viewport at all.
    // paddingTop below is the measured gap from the Back button's bottom
    // edge to the leaf icon's top edge in that file.
    justifyContent: 'flex-start',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: 96,
    paddingBottom: spacing[40],
  },
  leafWrap: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerBlock: {
    // Was measured as ~10 off the source PNGs, but that was font
    // line-height bleed (ascender/descender space around the glyphs), not
    // a real margin — the actual design gap between headline and subtitle
    // is 0. marginBottom is set dynamically per-screen via the
    // `contentGap` prop above.
    gap: 0,
  },
  headline: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.harvestGreen,
    textAlign: 'center',
  },
  content: {
    // Measured: phone field's underline -> hint text top.
    gap: 9,
  },
  footerWrap: {
    // Measured: hint text bottom -> button top.
    marginTop: 23,
  },
});
