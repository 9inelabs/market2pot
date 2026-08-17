import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { AppModal } from './AppModal';
import { Button } from './Button';

type Props = {
  visible: boolean;
  icon?: ComponentProps<typeof FontAwesome5>['name'];
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A premium two-button confirmation dialog — icon badge, title, message,
// side-by-side actions. Built on AppModal so its backdrop/card chrome is
// shared with any future modal in the app. First use: the "Allow location
// access?" prompt on the Location screens, replacing the OS's plain
// Alert.alert with something that matches the app's own design language.
export function ConfirmDialog({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AppModal visible={visible} onRequestClose={onCancel}>
      {icon ? (
        <View style={styles.iconWrap}>
          <FontAwesome5 name={icon} size={22} color={colors.harvestGreen} />
        </View>
      ) : null}

      <Text style={[typography.button, styles.title]}>{title}</Text>
      <Text style={[typography.body, styles.message]}>{message}</Text>

      <View style={styles.actions}>
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.actionButton} />
        <Button label={confirmLabel} variant="primary" onPress={onConfirm} style={styles.actionButton} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[16],
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[12],
    marginTop: spacing[24],
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: 0,
  },
});
