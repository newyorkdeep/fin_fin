import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Themes } from '../../themes';
import { getTheme, saveTheme } from '../../themes_logic'; 
import { Picker } from '@react-native-picker/picker';
import { DeviceEventEmitter } from 'react-native';
import { Link } from 'expo-router';

interface KeyResponse {
  keyFound: boolean,
  prefix: string,
}

export default function TabTwoScreen() {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");
  const [apiKey, setApiKey] = useState<KeyResponse | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  const KEY_URL = 'http://localhost:8000/update_key';


  
  useEffect(() => {
    fetch('http://localhost:8000/check_api')
    .then((response) => response.json())
    .then((json) => {
      setApiKey(json);
      setLoading(false);
    })
    .catch((error) => {
      console.error('Error fetching api key', error);
      setLoading(false);
    });
  }, [refreshTrigger]);

  const handleThemeChange = async (itemValue: keyof typeof Themes) => {

    // Update local UI immediately
    setSelectedTheme(itemValue); 
    
    // Save to disk
    await saveTheme(itemValue);  
    
    // Shout to everyone else (including the Tab Bar!)
    DeviceEventEmitter.emit('themeChanged', itemValue); 
  };

  const handleKeySave = async() => {
    if (!newApiKey.trim()) {
      console.error('Key cannot be empty')
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(KEY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },  
        body: JSON.stringify({api_key: newApiKey}),
      });

      const data = await response.json();

      if (response.ok) {
        setRefreshTrigger(prev => !prev); 
        setNewApiKey('');
      } else {
        console.error('Error', data.detail || 'Something went wrong'); 
      } 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const colors = Themes[selectedTheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      color: colors.text,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    separator: {
      marginVertical: 30,
      height: 1,
      width: '80%',
    },
    picker: {
      color: '#47473f',
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 15,
    }
  });

  if (loading) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
          <ActivityIndicator size="small" color="#000000" />
        </View>
      );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={{ color: colors.text, marginBottom: 10 }}>Theme:</Text>
      <Picker
        selectedValue={selectedTheme}
        onValueChange={(itemValue) => handleThemeChange(itemValue as keyof typeof Themes)}
        style={styles.picker}
        dropdownIconColor={colors.text}>
        {Object.keys(Themes).map((themeKey) => (
          <Picker.Item
            key={themeKey}
            label={themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
            value={themeKey}>
          </Picker.Item>
        ))}
      </Picker>
      <>
        <View style={{ height: 10 }} />
        <Text style={{ color: colors.text, marginBottom: 10 }}>Api key:</Text>
        
        {apiKey && apiKey.keyFound ? (
          /* Safer object lookup notation matching how you accessed 'key found' */
          <Text>{apiKey.prefix}</Text>
        ) : (
          <Text>Key not found</Text>
        )}
      </>
      <View style={{ height: 10 }} />
      <TextInput
        placeholder="Enter new API Key"
        placeholderTextColor="#999"
        value={newApiKey}
        onChangeText={setNewApiKey}
        // secureTextEntry={true}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={{ height: 10 }} />
      <TouchableOpacity  
        onPress={handleKeySave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text>Save Key</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 10 }} />
      <Link href='https://app.exchangerate-api.com/sign-up' target="_blank" rel="noopener noreferrer">Click here to obtain a free key</Link>
    </View>
  );
}
