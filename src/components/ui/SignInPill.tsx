import { strings } from '@/i18n/strings';

import { Pill } from './Pill';

type Props = {
  onPress: () => void;
};

export function SignInPill({ onPress }: Props) {
  return <Pill label={strings.signInPill} onPress={onPress} />;
}
