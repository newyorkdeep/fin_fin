import { StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';


export default function TabOneScreen() {
  const [message, setMessage] = useState('Loading...');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const currencyData = require('../../avaliable_currencies.json');

/* this was used before to show the welcome message from the servers main endpoint
  useEffect(() => {
    const API_URL = "http://127.0.0.1:8000";

    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error("Connection problem", err));
  }, []);
*/ 

  return (
    <View style={styles.container}>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text>Base currency:</Text>
      <Picker
        //style={{ width: '25%', height: 50 }} 
        selectedValue={baseCurrency} 
        onValueChange={(itemValue) => setBaseCurrency(itemValue)}
      >  
        {currencyData?.currencies?.map(([code, name]: [string, string]) => (
          <Picker.Item key={code} label={`${code} ${name}`} value={code} />
        ))}
      </Picker>
      <Text>Target currency:</Text>
      <Picker
        //style={{ width: '25%', height: 50 }} 
        selectedValue={baseCurrency} 
        onValueChange={(itemValue) => setBaseCurrency(itemValue)}
      >  
        {currencyData?.currencies?.map(([code, name]: [string, string]) => (
          <Picker.Item key={code} label={`${code} ${name}`} value={code} />
        ))}
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
