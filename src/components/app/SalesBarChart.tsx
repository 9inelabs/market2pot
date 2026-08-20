import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { DaySales } from '@/hooks/useWeeklySales';
import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  days: DaySales[];
};

const CHART_HEIGHT = 90;
const BAR_MIN_HEIGHT = 6;

// Insights & Growth's "This week's sales" bar chart — 7 bars, tallest =
// full CHART_HEIGHT, everything else scaled relative to it.
export function SalesBarChart({ days }: Props) {
  const max = Math.max(...days.map((d) => d.total), 1);

  return (
    <View>
      <View style={styles.chartRow}>
        {days.map((day) => {
          const height = Math.max((day.total / max) * CHART_HEIGHT, day.total > 0 ? BAR_MIN_HEIGHT : 2);
          return (
            <View key={day.label} style={styles.barColumn}>
              <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 26 ${CHART_HEIGHT}`}>
                <Rect
                  x={0}
                  y={CHART_HEIGHT - height}
                  width={26}
                  height={height}
                  rx={4}
                  fill={day.total > 0 ? colors.harvestGreen : withOpacity(colors.harvestGreen, 0.15)}
                />
              </Svg>
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {days.map((day) => (
          <Text key={day.label} style={[typography.caption, styles.label]}>
            {day.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[8],
  },
  barColumn: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[4],
  },
  label: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
  },
});
