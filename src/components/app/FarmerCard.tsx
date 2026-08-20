import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { getInitials } from '@/lib/initials';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  name: string;
  avatarUrl: string | null;
  // Currently unused for gating — every farmer shows as verified for now
  // (explicit decision, matches the design mockup where every visible card
  // is verified). Kept in the data flow rather than deleted, since real
  // per-farmer verification will matter again once trust/production
  // concerns catch up with the schema (bank_accounts.verification_status
  // already exists and is computed correctly upstream).
  isVerified: boolean;
  locationLine: string | null;
  onPress: () => void;
};

// Horizontal-scroll farmer card — Household Home's "Farmers Near You" row.
export function FarmerCard({ name, avatarUrl, locationLine, onPress }: Props) {
  return (
    <View style={styles.card}>
      <AvatarPicker uri={avatarUrl} initials={getInitials(name)} size={56} />

      <View style={styles.nameRow}>
        <Text style={[typography.label, styles.name]} numberOfLines={1}>
          {name}
        </Text>
        <FontAwesome5 name="check-circle" size={14} color={colors.harvestGreen} solid />
      </View>

      <Text style={styles.verified}>Verified farmer</Text>
      {locationLine ? (
        <Text style={[typography.caption, styles.location]} numberOfLines={1}>
          {locationLine}
        </Text>
      ) : null}

      <Pressable
        onPress={onPress}
        style={styles.viewButton}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}'s farm profile`}
      >
        <Text style={styles.viewLabel}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing[8],
  },
  name: {
    color: colors.textPrimary,
    maxWidth: 82,
  },
  verified: {
    ...typography.caption,
    fontSize: 11,
    color: colors.goldenWheatText,
    marginTop: 2,
  },
  location: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  viewButton: {
    marginTop: spacing[8],
    height: 30,
    minWidth: 64,
    borderRadius: 15,
    paddingHorizontal: spacing[12],
    backgroundColor: colors.goldenWheat,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewLabel: {
    ...typography.caption,
    fontSize: 12,
    // Golden Wheat is a bright mid-tone — white text on it fails WCAG AA
    // (goldenWheat is only meant as a decorative accent per theme/tokens.ts'
    // own comment). Dark text keeps the button legible.
    color: colors.deepSoil,
    fontWeight: '600',
  },
});
