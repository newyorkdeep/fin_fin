import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';

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

  useEffect(() => {
    fetch('http://127.0.0.1:8000/rates/USD') 
      .then((response) => response.json())
      .then((data) => {
        setDisplayedRates(data);
        setLoadingRates(false);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        setLoadingRates(false);
      });
  }, []);

  if (loadingRates) {
    return (
      <View>
        <ActivityIndicator size="large" color="#0000ff" />
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
      <FlatList
        data={displayedRates}
        keyExtractor={(item) => item.id.toString()} // Using the 'id' from your JSON
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.currencyText}>
              1 {item.base_currency} = 
              <Text style={styles.rateText}> {item.rate} </Text> 
              {item.target_currency}
            </Text>
            <Text style={styles.dateText}>Updated: {new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        )}
      />
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
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  currencyText: {
    fontSize: 18, 
    fontWeight: '500',
  },
  rateText: {
    color: '#2ecc71', 
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12, 
    color: '#888', 
    marginTop: 4,
  }
});
