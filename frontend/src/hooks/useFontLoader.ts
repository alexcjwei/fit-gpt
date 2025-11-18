import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  IBMPlexSans_200ExtraLight,
  IBMPlexSans_300Light,
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

/**
 * Custom hook to load IBM Plex Sans fonts
 * Manages splash screen visibility during font loading
 *
 * @returns {boolean} fontsLoaded - Whether fonts have finished loading
 */
export const useFontLoader = () => {
  const [fontsLoaded, fontError] = useFonts({
    'IBMPlexSans-ExtraLight': IBMPlexSans_200ExtraLight,
    'IBMPlexSans-Light': IBMPlexSans_300Light,
    'IBMPlexSans-Regular': IBMPlexSans_400Regular,
    'IBMPlexSans-Medium': IBMPlexSans_500Medium,
    'IBMPlexSans-SemiBold': IBMPlexSans_600SemiBold,
    'IBMPlexSans-Bold': IBMPlexSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return fontsLoaded && !fontError;
};
