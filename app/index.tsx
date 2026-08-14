// TEMPORARY: proves Reanimated and the Supabase client are wired correctly.
// This screen will be replaced by the real onboarding flow.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { supabase } from '@/lib/supabase';

export default function TempIndexScreen() {
  const [status, setStatus] = useState('Checking Supabase connection…');

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ error }) => {
        setStatus(error ? error.message : 'Supabase connected');
      })
      .catch((error: Error) => {
        setStatus(error.message);
      });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text entering={FadeInUp.duration(600)} style={styles.title}>
        Market2pot
      </Animated.Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
});
