import { StyleSheet, Text, View } from 'react-native';

import { progressStages, stageIndex, stageLabel, type FulfillmentType, type OrderStatus } from '@/lib/orderStatus';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  status: OrderStatus;
  fulfillmentType: FulfillmentType | null;
};

// Order Detail's staged progress bar — Placed -> Preparing -> Ready for
// pickup/Out for delivery -> Delivered, matching assets/materials/farmers
// screen/08-order-detail.html.
export function OrderStageStepper({ status, fulfillmentType }: Props) {
  const stages = progressStages(fulfillmentType);
  const currentIndex = stageIndex(status, fulfillmentType);

  return (
    <View style={styles.row}>
      {stages.map((stage, index) => {
        const reached = index <= currentIndex;
        return (
          <View key={stage} style={styles.segment}>
            <View style={styles.stageColumn}>
              <View style={[styles.dot, reached && styles.dotActive]} />
              <Text
                style={[typography.caption, styles.label, reached && styles.labelActive]}
                numberOfLines={2}
              >
                {stageLabel(stage, fulfillmentType)}
              </Text>
            </View>
            {index < stages.length - 1 ? (
              <View style={[styles.line, index < currentIndex && styles.lineActive]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageColumn: {
    alignItems: 'center',
    width: 60,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.skeleton,
    marginBottom: spacing[4],
  },
  dotActive: {
    backgroundColor: colors.harvestGreen,
  },
  label: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.skeleton,
    marginBottom: 14,
  },
  lineActive: {
    backgroundColor: colors.harvestGreen,
  },
});
