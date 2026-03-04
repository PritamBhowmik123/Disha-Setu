import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { Appearance } from 'react-native';

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useNativeWindColorScheme();

  const isDark = colorScheme === 'dark' || (colorScheme === 'system' && Appearance.getColorScheme() === 'dark');

  return {
    colorScheme,
    isDark,
    setColorScheme,
    toggleColorScheme,
  };
}
