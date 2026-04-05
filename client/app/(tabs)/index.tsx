import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';
import { Themes } from '../../themes';
import { getTheme, saveTheme } from '../../themes_logic'; 
import { DeviceEventEmitter } from 'react-native';

interface ExchangeRate {
  id: number;
  base_currency: string;
  target_currency: string;
  rate: number;
  created_at: string;
}

export default function TabOneScreen() {
  const [message, setMessage] = useState('Loading...');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [displayedRates, setDisplayedRates] = useState<ExchangeRate[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const currencyData = require('../../avaliable_currencies.json');
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");


  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('themeChanged', (newTheme) => {
      setSelectedTheme(newTheme);
    });

    // 2. Initial Load
    getTheme().then(saved => setSelectedTheme(saved as any));

    return () => subscription.remove();
  }, []);

  const handleThemeChange = async (itemValue: keyof typeof Themes) => {
    setSelectedTheme(itemValue); // Changes the colors NOW
    await saveTheme(itemValue);  // Saves to AsyncStorage for NEXT TIME
    DeviceEventEmitter.emit('themeChanged', itemValue); // Broadcasting the new theme to all the screens and tabs 
  };

  const colors = Themes[selectedTheme];

  useEffect(() => {
    const getRates = async () => {
      console.log("⚠️FETCH STARTING FOR:", baseCurrency);
      setLoadingRates(true);

      try {
        const response = await fetch(`http://127.0.0.1:8000/rates/${baseCurrency}`);
        const data = await response.json();

        if (response.status === 404 || !data || data.length === 0) {
          console.log('Empty or not found. Syncing with external API...');
          const syncResponse = await fetch(`http://127.0.0.1:8000/fetch_and_save/${baseCurrency}`, { method: "POST" });

          if (syncResponse.ok) {
            const retry = await fetch(`http://127.0.0.1:8000/rates/${baseCurrency}`);
            const freshData = await retry.json();
            setDisplayedRates(freshData);    
          }
        } else {
          setDisplayedRates(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRates(false);
      }
    };

    if (baseCurrency) getRates();
  }, [baseCurrency]);

  if (loadingRates) {
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

  /* this was used before to show the welcome message from the servers main endpoint
  useEffect(() => {
    const API_URL = "http://127.0.0.1:8000";

    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error("Connection problem", err));
  }, []);
  */ 

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      //justifyContent: 'center',
      width: '100%',
      color: colors.text,
      backgroundColor: colors.background,
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
    item: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#fff',      
    },
    currencyText: {
      fontSize: 18, 
      fontWeight: '500',
      alignSelf: 'center',
    },
    rateText: {
      color: '#9b66a6', 
      fontWeight: 'bold',
    },
    dateText: {
      fontSize: 12, 
      color: '#888', 
      marginTop: 4,
      alignSelf: 'center',
    },
    picker: {
      width: '15%',
      alignSelf: 'center', // Centers the narrow picker horizontally
      paddingVertical: 10,
      paddingHorizontal: 0,
      borderRadius: 15,
      margin: 10,
      backgroundColor: '#f0f0f0',
      textAlign: 'center',
    },
    flatlist: {
      width: '15%',
      borderRadius: 10,
      height: '40%',
      flexGrow: 0, // Prevents stretching
      overflow: 'hidden', // Required for borderRadius to clip content
      textAlign: 'center',
    }
  });

  return (
    <View style={styles.container}>
      <Picker
        style={styles.picker} 
        selectedValue={baseCurrency} 
        onValueChange={(itemValue) => setBaseCurrency(itemValue)}
      >  
        {currencyData?.currencies?.map(([code, name]: [string, string]) => (
          <Picker.Item key={code} label={`${code} ${name}`} value={code} />
        ))}
      </Picker>
      <FlatList
        style={styles.flatlist}
        data={displayedRates.filter(item => item.base_currency !== item.target_currency)}
        keyExtractor={(item) => item.id.toString()} // Using the 'id' from your JSON
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.currencyText}>
              {/*1 {item.base_currency} = */}
              <Text style={styles.rateText}> {item.rate} </Text> 
              {item.target_currency}
            </Text>
            <Text style={styles.dateText}>Updated: {new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        )}
      />
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
    </View>
  );
}
