import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { Picker } from '@react-native-picker/picker';
import { Themes } from '../../themes';
import { getTheme, saveTheme } from '../../themes_logic'; 
import { DeviceEventEmitter } from 'react-native';
import { LineChart } from "react-native-gifted-charts";
import { Dimensions } from 'react-native';

interface ExchangeRate {
  id: number;
  base_currency: string;
  target_currency: string;
  rate: number;
  created_at: string;
}

interface ChartPoint {
  value: number;
  label: string;
  dataPointText?: string;
}

export default function TabOneScreen() {
  const [message, setMessage] = useState('Loading...');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [displayedRates, setDisplayedRates] = useState<ExchangeRate[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  //const currencyData = require('../../avaliable_currencies.json');
  const [currencyData, setCurrencyData] = useState<any>(null);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");
  const data = [
    { value: 15, label: 'Jan' },
    { value: 30, label: 'Feb' },
    { value: 26, label: 'Mar' },
    { value: 40, label: 'Apr' },
  ];
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        // Use your computer's IP address instead of localhost!
        const response = await fetch("http://localhost:8000/currencies"); 
        const json = await response.json();
        setCurrencyData(json);
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
      }
    };
    fetchCurrencies();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('themeChanged', (newTheme) => {
      setSelectedTheme(newTheme);
    });

    // 2. Initial Load
    getTheme().then(saved => setSelectedTheme(saved as any));

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (displayedRates.length > 0) {
      const formattedData: ChartPoint[] = displayedRates
        .slice(0, 10)
        .map((item) => ({
          value: Number(item.rate), // Ensure it's a number
          label: item.target_currency,
          dataPointText: item.rate.toString(),
        }));

      setChartData(formattedData);
    }
  }, [displayedRates]);

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

  if (!currencyData) {
    return <Text>Loading Currencies...</Text>;
  }

  const screenWidth = Dimensions.get('window').width;

  /* this was used before to show the welcome message from the servers main endpoint
  useEffect(() => {
    const API_URL = "http://127.0.0.1:8000";

    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error("Connection problem", err));
  }, []);
  */ 

  // Calculating the data to show on the screen:
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f7', // Light gray background to make platforms stand out
      padding: 50,                  // Global padding so they don't touch screen edges
    },
    rowContainer: {
      flex: 1,
      flexDirection: 'row', 
      backgroundColor: '#f5f5f7',
    },
    leftColumn: {
      flex: 1,
      // THE PLATEAU EFFECT
      backgroundColor: '#fff',
      borderRadius: 30,
      marginRight: 25,           // Gap between the two platforms
      padding: 25,
      // Subtle Shadow
      elevation: 3, 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      overflow: 'hidden', // IMPORTANT: This clips children (like FlatList) to the rounded corners
    },
    rightColumn: {
      flex: 1,
      // THE PLATEAU EFFECT
      backgroundColor: '#fff',
      borderRadius: 30,
      marginLeft: 25,            // Gap between the two platforms
      padding: 15,
      justifyContent: 'center',
      alignItems: 'center',
      // Subtle Shadow
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      overflow: 'hidden', // IMPORTANT: This clips children (like FlatList) to the rounded corners
    },
    picker: {
      width: '100%',        // Fill the left half
      marginBottom: 20,
      backgroundColor: '#f0f0f0',
      borderRadius: 10,
      borderWidth: 0,
    },
    flatlist: {
      flex: 1,              // Let it take all remaining space in the left column
      width: '100%',
    },
    item: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      //backgroundColor: '#fff',
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: 'transparent', // Let the platform background show through
    },
    currencyText: {
      fontSize: 18,
      fontWeight: '500',
      textAlign: 'center',
    },
    rateText: {
      color: '#9b66a6',
      fontWeight: 'bold',
    },
    dateText: {
      fontSize: 12,
      color: '#888',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.rowContainer}>

      {/* LEFT SIDE: Picker and Exchange Rates (50%) */}
      <View style={styles.leftColumn}>
        <Picker
          style={styles.picker} 
          mode="dropdown"
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
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false} // THIS REMOVES THE SHARP CORNER LINE
          contentContainerStyle={{ paddingBottom: 20 }} // Adds space at the bottom so last item isn't cut off
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.currencyText}>
                <Text style={styles.rateText}> {item.rate} </Text> 
                {item.target_currency}
              </Text>
              <Text style={styles.dateText}>
                Updated: {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      </View>

      {/* RIGHT SIDE: Graph (50%) */}
      <View style={styles.rightColumn}>
        <LineChart
          areaChart
          curved
          data={chartData}
          
          // SIZING - Adjust these to fill your plateau
          width={screenWidth / 2 - 50} 
          height={450}               // Increase this until it matches the left side
          adjustToWidth={true}       // Stretches the line to fill the width
          initialSpacing={0}         // Removes the left-side gap
          endSpacing={0}             // Removes the right-side gap

          maxValue={1600}         // ~15% higher than the highest data point
          noOfSections={6}        // Helps redistribute the Y-axis labels
          spacing={50}            // Increases horizontal space between points if needed
          yAxisLabelContainerStyle={{marginBottom: 20}} 
          
          // STYLING
          color={colors.tabBar || "#177AD5"} 
          thickness={3}              // Thicker line looks better on large graphs
          hideDataPoints
          hideRules
          yAxisThickness={0}
          xAxisThickness={0}
          
          // Make sure labels don't push the graph up
          xAxisLabelTextStyle={{ color: 'gray', fontSize: 10 }}
          yAxisTextStyle={{ color: 'gray', fontSize: 10 }}

          rotateLabel
          startFillColor={colors.text}  
          endFillColor={colors.text}
          gradientDirection="vertical"
        />
      </View>
      </View>
    </View>
  );
}
