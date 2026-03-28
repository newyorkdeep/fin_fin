import React, { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { Themes } from '../../themes';
import { getTheme, saveTheme } from '../../themes_logic';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { DeviceEventEmitter } from 'react-native';

export default function TabLayout() {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");
  
  useEffect(() => {
    // 1. Load initial theme
    getTheme().then(saved => setSelectedTheme(saved as any));
    // 2. 👂 Listen for changes from the switcher
    const subscription = DeviceEventEmitter.addListener('themeChanged', (newTheme) => {
      setSelectedTheme(newTheme);
    });
    return () => subscription.remove(); // Cleanup
  }, []);

  const handleThemeChange = async (itemValue: keyof typeof Themes) => {
    setSelectedTheme(itemValue); // Changes the colors NOW
    await saveTheme(itemValue);  // Saves to AsyncStorage for NEXT TIME
    DeviceEventEmitter.emit('themeChanged', itemValue); // Broadcasting the new theme to all the screens and tabs 
  };

  const colors = Themes[selectedTheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.background,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab One',
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'home_and_garden',
                web: 'home_and_garden',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={25}
                    tintColor={colors.background}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Tab Two',
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'settings_heart',
                web: 'settings_heart',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 25,       // Space from the bottom of the screen
    left: 20,         // Margin on the left
    right: 20,        // Margin on the right
    height: 60,       // Fixed height
    backgroundColor: '#d1c09ebb', // Transparent a little for a glassy look
    borderRadius: 30, // Half of height for perfect circles
    borderTopWidth: 0,
    elevation: 5,     // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
});