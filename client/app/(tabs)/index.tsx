import { StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';

interface CurrencyData {
    currencies: [string, string][];
  }

export default function TabOneScreen() {
  const [message, setMessage] = useState('Loading...');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const currencyData = require('../../../avaliable_currencies.json');

  

  useEffect(() => {
    const API_URL = "http://127.0.0.1:8000";

    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error("Connection problem", err));
  }, []);

  useEffect(() => {
    const API_URL = "http://127.0.0.1:8000/supported_codes";

    fetch(API_URL)
      .then
  }, []);

  const jsonData = {
    "currencies": [

    ]
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{message}</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text>Current rate for:</Text>
      <Picker 
        selectedValue={baseCurrency} 
        onValueChange={(itemValue) => setBaseCurrency(itemValue)}
      >  
        {currencyData.currencies.map(([code, name]) => (
          <Picker.Item 
            key={code} 
            label={`${code} - ${name}`} 
            value={code} 
          />
        ))}
      </Picker>
      <Picker selectedValue={targetCurrency} onValueChange={(itemValue)=>setTargetCurrency(itemValue)}>
        <Picker.Item label="USD - US Dollar" value="USD" />
        <Picker.Item label="EUR - Euro" value="EUR" />
        <Picker.Item label="GBP - British Pound" value="GBP" />
      </Picker>
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
