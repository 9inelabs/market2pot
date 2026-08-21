import { Image, StyleSheet } from 'react-native';

const source = require('../../../assets/design/hero-illustration.png');

type Props = {
  width: number;
  height: number;
};

// 494x716 source, transparent background — exactly 2x the design frame's
// 247x358 hero rect, so `contain` fills the box with no letterboxing at the
// design size. `maxHeight` lets the box give height back on a screen shorter
// than the frame instead of pushing the button stack off the bottom.
export function HeroIllustration({ width, height }: Props) {
  return <Image source={source} style={[styles.image, { width, height }]} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  image: {
    maxHeight: '100%',
    alignSelf: 'center',
  },
});
