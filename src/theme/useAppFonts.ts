// Import each weight from its own subpath, not the package's top-level
// barrel — the barrel's index.js requires every weight (all 20 files,
// regular + italic) as a side effect of the module evaluating, which bundles
// ~7MB of unused fonts even though only three weights are ever loaded here.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';

// iOS SF Pro Expanded/Text .otf files are not bundled yet — see
// src/theme/typography.ts for the temporary fallback this causes.
export function useAppFonts() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    'ArchivoExpanded-Medium': require('../../assets/fonts/ArchivoExpanded-Medium.ttf'),
    'ArchivoExpanded-SemiBold': require('../../assets/fonts/ArchivoExpanded-SemiBold.ttf'),
    'ArchivoExpanded-Bold': require('../../assets/fonts/ArchivoExpanded-Bold.ttf'),
  });

  return { fontsLoaded: loaded, fontError: error };
}
