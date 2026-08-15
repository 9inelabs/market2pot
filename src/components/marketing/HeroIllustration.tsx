import { Image, StyleSheet, View } from 'react-native';

const source = require('../../../assets/design/hero-illustration.png');

// 494x716 source (~0.69 aspect), transparent background — contain, not
// cover, since it's a character illustration, not a scene to crop into.
export function HeroIllustration() {
  return (
    <View style={styles.container}>
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
