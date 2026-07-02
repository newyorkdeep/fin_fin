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
  const BACKEND_URL = 'http://localhost:8000'; 
  const [apiGood, setApiGood] = useState<boolean | null>(null);
  const [requestsLeft, setRequestsLeft] = useState<number | null>(null);
  const [checkApiTrigger, setCheckApiTrigger] = useState<number>(0); 
  const [planQuota, setPlanQuota] = useState<number | null>(null);
  const [newQuotaDate, setNewQoutaDate] = useState<number | null>(null);

  
  useEffect(() => {
    fetch(`${BACKEND_URL}/check_api`)
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

  useEffect(()=> {
    if (checkApiTrigger === 0) {
      return; 
    }
    
    async function checkApi() {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/quota`)

        if (response.ok) {
          const data = await response.json();
          setApiGood(data.status === 'success');
          setRequestsLeft(data.requests_remaining);
          setPlanQuota(data.plan_quota);
          setNewQoutaDate(data.new_quota);
        } else {
          setApiGood(false);
        }
      } catch (error) {
        console.error('FAILED TO FETCH FROM THE BACKGROUND: ', error);
        setApiGood(false);
        setRequestsLeft(null);
      } finally {
        setLoading(false);
      }
    }
    
    checkApi();
    }, [checkApiTrigger]);

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
    },
    whiteBlank: {
      backgroundColor: 'white',
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 15,
      borderColor: 'black',
      borderWidth: 1,
    },
    online: { color: 'green' },
    offline: { color: 'red' },
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


      {/* Changing theme */}
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
      
      
      {/* Current key */}
      <>
        <View style={{ height: 10 }} />
        <Text style={{ color: colors.text, marginBottom: 10 }}>Api key:</Text>
        
        {apiKey && apiKey.keyFound ? (
          <View style={{flexDirection: 'row', gap: 3, backgroundColor: colors.background}}>
            
            <Text style={styles.whiteBlank}>{apiKey.prefix}</Text>

            <TouchableOpacity onPress={() => setCheckApiTrigger(prev => prev+1)}>
              <Text style={[styles.whiteBlank, {paddingHorizontal: 5}]}>Check</Text>
            </TouchableOpacity>

          </View>
        ) : (
          <Text>Key not found</Text>
        )}
      </>
      <View style={{ height: 10 }} />
      
      
      {/* Details about the quota */}
      {requestsLeft !== null && (
        <View style={[styles.whiteBlank, {backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 10}]}>
          <Text style={{color: colors.text}}>
            Status: <Text style={apiGood ? styles.online : styles.offline}>{apiGood ? '● Valid' : '● Not Valid'}</Text>
          </Text> 
          <Text style={{color: colors.text, marginTop: 5}}>
            Requests left: {requestsLeft}
          </Text>
          <Text style={{color: colors.text, marginTop: 5}}>
            Monthly quota: {planQuota}
          </Text>
          <Text style={{color: colors.text, marginTop: 5}}>
            Refreshes at (date): {newQuotaDate}
          </Text>
        </View>
      )}
      <View style={{ height: 10 }} />

      
      {/* Changing api */}
      <Text>Change your api key:</Text>
      <View style={{ height: 10 }} />
      <View style={{flexDirection: 'row', gap: 3, backgroundColor: colors.background}}>
        <TextInput
          style={[styles.whiteBlank, {textAlign: 'center'}]}
          placeholder="Enter your API Key here"
          placeholderTextColor="#999"
          value={newApiKey}
          onChangeText={setNewApiKey}
          // secureTextEntry={true}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ height: 10 }} />
        <TouchableOpacity
          style={[styles.whiteBlank, {paddingHorizontal: 5}]}
          onPress={handleKeySave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text>Save Key</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ height: 10 }} />
      <Link href='https://app.exchangerate-api.com/sign-up' target="_blank" rel="noopener noreferrer">Click here to obtain a free key</Link>
    </View>
  );
}
