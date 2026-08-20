import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';

// Reached from the farmer Profile tab's "App settings" row — reuses the
// exact same account/language/notifications/logout screen the household
// tab renders inline, per the app spec's explicit "reuse the existing
// screen" instruction.
export default function AppSettingsRoute() {
  return <AccountSettingsScreen showBackButton />;
}
