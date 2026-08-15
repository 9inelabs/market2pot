// TEMPORARY: placeholder for the real routing gate (build spec section 9),
// which is phase 5's job — session check, resume-at-step logic, and
// (app) hand-off once onboarding is complete. Until then this always
// enters at the onboarding intro.
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(onboarding)/intro" />;
}
