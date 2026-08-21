import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { getInitials } from '@/lib/initials';
import { toTitleCase } from '@/lib/titleCase';
import { colors, spacing } from '@/theme/tokens';
import { bodyFont } from '@/theme/typography';

type Props = {
  name: string;
  avatarUrl: string | null;
  isVerified: boolean;
  locationLine: string | null;
  onPress: () => void;
};

const CARD_WIDTH = 104;
const AVATAR_SIZE = 70;

// Horizontal-scroll farmer card — Household Home's "Farmers Near You" row.
//
// isVerified now actually gates the badge and the "Verified farmer" line, as
// the reference shows (its second card has neither). It used to be accepted
// and ignored, with every card rendering as verified.
export function FarmerCard({ name, avatarUrl, isVerified, locationLine, onPress }: Props) {
  const displayName = toTitleCase(name);

  return (
    <View style={styles.card}>
      <View style={styles.avatarRing}>
        <AvatarPicker uri={avatarUrl} initials={getInitials(name)} size={AVATAR_SIZE} />
      </View>

      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        {isVerified ? (
          <FontAwesome5
            name="check-circle"
            size={9}
            color={colors.harvestGreen}
            solid
            // The name already carries the meaning for a screen reader via
            // the accessibilityLabel below; this is decoration.
            accessibilityElementsHidden
          />
        ) : null}
      </View>

      {isVerified ? <Text style={styles.verified}>Verified farmer</Text> : null}

      {locationLine ? (
        <Text style={styles.location} numberOfLines={1}>
          {locationLine}
        </Text>
      ) : null}

      {/* Spacer keeps the View pill on one baseline across the row even
          though unverified cards are two lines shorter. */}
      <View style={styles.spacer} />

      <Pressable
        onPress={onPress}
        style={styles.viewButton}
        // The pill itself is only 20pt tall to match the reference, so the
        // 44pt minimum tap target comes from hitSlop rather than from
        // inflating the visual.
        hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}'s farm profile${isVerified ? ', verified farmer' : ''}`}
      >
        <Text style={styles.viewLabel}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  avatarRing: {
    borderRadius: AVATAR_SIZE / 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing[8],
    maxWidth: CARD_WIDTH,
  },
  name: {
    ...bodyFont('bold'),
    fontSize: 11,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  verified: {
    ...bodyFont('medium'),
    fontSize: 9,
    color: colors.terracotta,
    marginTop: 1,
  },
  location: {
    ...bodyFont('regular'),
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  // Keeps the View pill on one baseline across the row even though an
  // unverified card is two lines shorter — but with no minimum of its own, so
  // on the tallest card the pill sits directly under the text.
  spacer: {
    flex: 1,
  },
  viewButton: {
    marginTop: spacing[4],
    height: 20,
    minWidth: 46,
    borderRadius: 10,
    paddingHorizontal: spacing[12],
    backgroundColor: colors.goldenWheat,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLabel: {
    ...bodyFont('bold'),
    fontSize: 10,
    // Golden Wheat is a bright mid-tone — white text on it fails WCAG AA
    // (it's a decorative accent per theme/tokens.ts' own note). Dark text
    // keeps the button legible.
    color: colors.deepSoil,
  },
});
