import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';

type IconName = ComponentProps<typeof FontAwesome5>['name'];

function tabIcon(name: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <FontAwesome5 name={name} size={size} color={color as string} />
  );
}

// Household: Home, Search, Orders, Messages, Profile.
// Farmer: Home, Listings, Orders, Messages, Profile.
// Home itself is a single route (index.tsx) that branches its content
// internally, same pattern as identity-name.tsx branching on role — an
// expo-router tab can't point at two different underlying files depending
// on runtime state, but its content can.
export default function TabsLayout() {
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const hasFarmerProfile = useAuthStore((state) => !!state.farmerProfile);
  const isFarmerView = activeView === 'farmer' && hasFarmerProfile;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.harvestGreen,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.warmCream,
          borderTopColor: colors.skeleton,
          borderTopWidth: StyleSheet.hairlineWidth,
          // 64 is the bar's own content height — the device's bottom inset
          // (Android's gesture pill / 3-button nav, iOS's home indicator)
          // has to be added on top of that, not baked into a fixed number,
          // otherwise the OS's own nav bar overlaps the tab bar instead of
          // sitting below it.
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bodyMedium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />

      <Tabs.Protected guard={!isFarmerView}>
        <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: tabIcon('search') }} />
      </Tabs.Protected>

      <Tabs.Protected guard={isFarmerView}>
        <Tabs.Screen
          name="listings"
          options={{ title: 'Listings', tabBarIcon: tabIcon('store-alt') }}
        />
      </Tabs.Protected>

      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: tabIcon('receipt') }} />

      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: tabIcon('comment-dots') }}
      />

      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
