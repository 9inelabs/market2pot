import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Bank } from '@/hooks/useBanks';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { TextField } from './TextField';

type Props = {
  banks: Bank[];
  loading: boolean;
  value: Bank | null;
  onChange: (bank: Bank) => void;
  placeholder: string;
};

// A plain long list of 40+ Nigerian banks is poor UX on its own — search
// makes this usable. Not in the mockup explicitly (which just shows a
// closed dropdown), but a reasonable addition for the actual interaction.
export function BankPicker({ banks, loading, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return banks;
    return banks.filter((bank) => bank.name.toLowerCase().includes(normalized));
  }, [banks, query]);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.field} disabled={loading}>
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {loading ? 'Loading banks…' : (value?.name ?? placeholder)}
        </Text>
        <FontAwesome5 name="chevron-down" size={14} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={typography.stepHeadline}>{placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search banks"
            autoFocus
            style={styles.search}
          />

          <FlatList
            data={filtered}
            keyExtractor={(bank) => bank.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <Text style={typography.body}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    height: geometry.textInput.height,
    borderRadius: geometry.textInput.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: geometry.screenPaddingInputs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.warmCream,
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
  },
  close: {
    ...typography.label,
    color: colors.harvestGreen,
  },
  search: {
    marginBottom: spacing[12],
  },
  row: {
    paddingVertical: spacing[16],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
});
