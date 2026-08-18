import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  title: string;
  icon: ComponentProps<typeof FontAwesome5>['name'];
  // Tab roots (Search/Orders/Messages) don't take a back button — they're
  // navigated to via the tab bar itself. Pushed screens (Categories,
  // Favorites, Cart, ...) pass onBack.
  onBack?: () => void;
};

// Shared body for every explicitly-out-of-scope screen this build reaches
// but doesn't implement yet — product browsing, cart, checkout, real
// search/messaging, notifications. Each is a real route (not a dead tap)
// so nothing in the app ever silently does nothing when pressed.
export function ComingSoonScreen({ title, icon, onBack }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={onBack ? ['top', 'bottom'] : ['bottom']}>
      {onBack ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={strings.back}
          >
            <Text style={styles.backLabel}>‹ {strings.back}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={typography.button}>{title}</Text>
        </View>
      )}

      <View style={styles.body}>
        <EmptyState icon={icon} title={title} message={strings.comingSoonMessage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  header: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
