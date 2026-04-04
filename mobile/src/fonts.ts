import { useFonts } from 'expo-font'

export function useAppFonts() {
  return useFonts({
    'SpaceGrotesk-Medium': require('../assets/fonts/SpaceGrotesk-Medium.ttf'),
    'SpaceGrotesk-Bold': require('../assets/fonts/SpaceGrotesk-Bold.ttf'),
  })
}
