import { strings } from '@/i18n/strings';

import { Pill } from './Pill';

type Props = {
  onPress: () => void;
  scale?: number;
};

export function SignInPill({ onPress, scale }: Props) {
  return <Pill label={strings.signInPill} onPress={onPress} scale={scale} />;
}
