import { Share } from 'react-native';

import { strings } from '@/i18n/strings';

// Native share sheet with a pre-filled message + link to this farmer's
// public profile. RN's own Share API (not expo-sharing) is the right tool
// here — expo-sharing's shareAsync() only shares local file URIs, it has no
// support for plain text/links (verified against the SDK 57 docs before
// writing this, per this repo's AGENTS.md instruction to check current
// Expo API behavior rather than assume it).
export async function shareFarmerProfile(farmerProfileId: string, farmName: string): Promise<void> {
  const url = `https://market2pot.com/farmer/${farmerProfileId}`;
  const message = strings.insightsShareMessage(farmName, url);
  try {
    await Share.share({ message, url });
  } catch {
    // Share.share rejects on user cancel too — nothing to surface.
  }
}
