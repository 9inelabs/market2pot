import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

const EMOJIS = [
  '😀', '😂', '🥰', '😍', '😊', '😉', '😢', '😮', '😴', '🤔',
  '👍', '👎', '🙏', '👋', '💪', '🤝', '👏',
  '❤️', '🎉', '🔥', '⭐', '✅', '❓',
  '🍅', '🥬', '🥕', '🌽', '🍎', '🍌', '🥭', '🍇', '🥑', '🍓',
  '🐔', '🥚', '🌾', '🚚', '📦', '💰',
];

type Props = {
  onSelect: (emoji: string) => void;
};

// A quick-pick row of common emojis above the chat input — not a full
// native picker library (none installed, and plain unicode text already
// works fine in RN's TextInput), just a fast way to insert one without
// switching to the OS emoji keyboard. Each cell is taller than the glyph's
// own font size and has an explicit lineHeight — without both, color emoji
// glyphs render visibly clipped at the top/bottom on some Android builds.
export function EmojiPickerRow({ onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {EMOJIS.map((emoji, index) => (
        <Pressable
          key={`${emoji}-${index}`}
          onPress={() => onSelect(emoji)}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel={`Insert ${emoji}`}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.skeleton,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
  item: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 34,
    includeFontPadding: false,
  },
});
