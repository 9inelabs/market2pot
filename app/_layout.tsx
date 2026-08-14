import { useCallback } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppFonts } from '@/theme/useAppFonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { fontsLoaded, fontError } = useAppFonts();

  const onRootLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onRootLayout}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
