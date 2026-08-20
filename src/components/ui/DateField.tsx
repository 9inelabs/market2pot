import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Button } from './Button';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Native picker, never free text — build spec section 7.6: "native date
// picker, never free text. Enforce 18+ via maximumDate."
export function DateField({ value, onChange, placeholder, maximumDate, minimumDate }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  // iOS's inline picker has no built-in dismiss affordance — track a draft
  // value so "Done" commits it, rather than every scroll tick firing
  // onChange immediately (which is fine on Android, where the dialog
  // dismisses itself on selection).
  const [draft, setDraft] = useState<Date>(value ?? minimumDate ?? maximumDate ?? new Date());

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
      return;
    }
    if (selectedDate) {
      setDraft(selectedDate);
    }
  };

  return (
    <View>
      <Pressable onPress={() => setShowPicker(true)} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {showPicker && Platform.OS === 'ios' ? (
        <View style={styles.iosPickerWrap}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          <Button
            label="Done"
            onPress={() => {
              onChange(draft);
              setShowPicker(false);
            }}
          />
        </View>
      ) : null}

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? minimumDate ?? maximumDate ?? new Date()}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: geometry.textInput.height,
    borderRadius: geometry.textInput.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: geometry.screenPaddingInputs,
    justifyContent: 'center',
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  iosPickerWrap: {
    backgroundColor: colors.surface,
    borderRadius: geometry.textInput.radius,
    marginTop: spacing[12],
    padding: spacing[12],
    gap: spacing[12],
  },
});
