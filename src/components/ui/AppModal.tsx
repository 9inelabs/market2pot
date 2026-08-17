import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  // Tapping the dimmed backdrop closes the modal — set false for a dialog
  // that requires an explicit button press rather than an implicit dismiss.
  dismissOnBackdropPress?: boolean;
};

// Shared chrome for every centered modal dialog/pop-up in the app: a dimmed
// backdrop behind a rounded, softly-elevated white card. Native `fade`
// transition (not a custom Reanimated entrance) — RN's Modal doesn't keep
// children mounted while hidden, which makes a Reanimated exit animation
// unreliable here; the native fade already reads as clean and deliberate
// without that risk.
//
// Build specific dialogs (ConfirmDialog, and any future info/alert pop-up)
// as thin wrappers around this rather than reimplementing the backdrop/card
// chrome each time.
export function AppModal({ visible, onRequestClose, children, dismissOnBackdropPress = true }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdropPress ? onRequestClose : undefined}
        />
        {/* No-op onPress — a Pressable claims the touch so a tap inside the
            card can never fall through to the backdrop Pressable behind it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {children}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 36, 32, 0.55)', // deepSoil-tinted overlay
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[24],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing[24],
    // The rest of the app is flat/matte — a soft shadow here is what
    // actually reads as "lifted above the page" rather than pasted-on-flat.
    shadowColor: colors.deepSoil,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
});
