import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { PhotoBackdrop } from '@/components/marketing/PhotoBackdrop';
import { Button } from '@/components/ui/Button';
import { strings } from '@/i18n/strings';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Shown to a returning, fully-onboarded user on cold start (see the
// routing gate in (onboarding)/intro.tsx) instead of either silently
// dropping them into the app or making them re-authenticate — the session
// already persisted, this is just a deliberate confirmation step matching
// the uploaded design.
export default function WelcomeBackScreen() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const signOut = useAuthStore((state) => state.signOut);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <PhotoBackdrop>
        <View style={styles.content}>
          <View style={styles.brandBlock}>
            <Wordmark width={180} height={50} />
          </View>

          <View style={styles.leafWrap}>
            <LeafMark width={40} height={44} />
          </View>

          <Text style={[typography.h1, styles.heading]}>{strings.welcomeBackHeading}</Text>
          <Text style={[typography.button, styles.name]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[typography.body, styles.subtitle]}>{strings.welcomeBackSubtitle}</Text>

          <View style={styles.shortcutRow}>
            <Pressable
              onPress={() => goToShortcut('/(app)/notifications')}
              style={styles.shortcutButton}
              accessibilityRole="button"
              accessibilityLabel={strings.homeNotificationsLabel}
            >
              <FontAwesome5 name="bell" size={16} color={colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => goToShortcut('/(app)/cart')}
              style={styles.shortcutButton}
              accessibilityRole="button"
              accessibilityLabel={strings.homeCartLabel}
            >
              <FontAwesome5 name="shopping-cart" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Button label={strings.welcomeBackBrowse} onPress={enterApp} style={styles.browseButton} />
          <Button
            label={strings.welcomeBackLogout}
            variant="secondary"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
          <Text style={[typography.caption, styles.logoutHint]}>{strings.welcomeBackLogoutHint}</Text>

          <View style={styles.signUpRow}>
            <Text style={typography.caption}>{strings.welcomeBackNoAccount} </Text>
            <Pressable
              onPress={() => router.push('/(profile)/role')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={strings.welcomeBackSignUp}
            >
              <Text style={styles.signUpLink}>{strings.welcomeBackSignUp}</Text>
            </Pressable>
          </View>
        </View>
      </PhotoBackdrop>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  brandBlock: {
    alignItems: 'center',
    marginTop: spacing[24],
  },
  leafWrap: {
    marginTop: spacing[24],
    marginBottom: spacing[16],
  },
  heading: {
    color: colors.textPrimary,
  },
  name: {
    color: colors.textPrimary,
    marginTop: spacing[4],
  },
  subtitle: {
    color: colors.harvestGreen,
    marginTop: spacing[4],
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing[12],
    marginTop: spacing[20],
    marginBottom: spacing[32],
  },
  shortcutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.skeleton,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButton: {
    alignSelf: 'stretch',
    marginBottom: spacing[12],
  },
  logoutButton: {
    alignSelf: 'stretch',
  },
  logoutHint: {
    color: colors.textMuted,
    marginTop: spacing[8],
  },
  signUpRow: {
    flexDirection: 'row',
    marginTop: spacing[24],
  },
  signUpLink: {
    ...typography.caption,
    color: colors.harvestGreen,
    fontWeight: '600',
  },
});
