import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Themes } from '../../themes';
import { getTheme, saveTheme } from '../../themes_logic'; 
import { Picker } from '@react-native-picker/picker';
import { DeviceEventEmitter } from 'react-native';

export default function TabTwoScreen() {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");

  const handleThemeChange = async (itemValue: keyof typeof Themes) => {
    // Update local UI immediately
    setSelectedTheme(itemValue); 
    
    // Save to disk
    await saveTheme(itemValue);  
    
    // Shout to everyone else (including the Tab Bar!)
    DeviceEventEmitter.emit('themeChanged', itemValue); 
  };

  const colors = Themes[selectedTheme];
  
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={[styles.title, {color: colors.text}]}>Tab Two</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={{ color: colors.text, marginBottom: 10 }}>Select App Theme:</Text>
      <Picker
        selectedValue={selectedTheme}
        onValueChange={(itemValue) => handleThemeChange(itemValue as keyof typeof Themes)}
        style={{ color: colors.text}}
        dropdownIconColor={colors.text}>
        {Object.keys(Themes).map((themeKey) => (
          <Picker.Item
            key={themeKey}
            label={themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
            value={themeKey}>

          </Picker.Item>
        ))}
      </Picker>
      <EditScreenInfo path="app/(tabs)/two.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
