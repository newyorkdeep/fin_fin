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
import { useWindowDimensions } from 'react-native';

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
  const [allRates, setAllRates] = useState<ExchangeRate[]>([]);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const [currencyData, setCurrencyData] = useState<any>(null); //avaliable currencies
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof Themes>("light");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const { width: windowWidth } = useWindowDimensions();
  const colors = Themes[selectedTheme];
  
  // avaliable currencies
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

  // syncs theme on initial load and listens for real-time theme updates
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('themeChanged', (newTheme) => {
      setSelectedTheme(newTheme);
    });

    // 2. Initial Load
    getTheme().then(saved => setSelectedTheme(saved as any));

    return () => subscription.remove();
  }, []);

  // filters, deduplicates, and formats the last 10 historical rates for the chart
  useEffect(() => {
    if (allRates.length > 0) {
      const filteredData = allRates
        .filter(item => 
          item.base_currency?.trim().toUpperCase() === baseCurrency.trim().toUpperCase() && 
          item.target_currency?.trim().toUpperCase() === targetCurrency.trim().toUpperCase()
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Fix: Only keep the last entry for each unique date to prevent stacking
      const uniqueDates = [];
      const seenDates = new Set();

      for (let i = filteredData.length - 1; i >= 0; i--) {
        const dateLabel = new Date(filteredData[i].created_at).toLocaleDateString([], { 
          month: 'short', 
          day: 'numeric' 
        });
        
        if (!seenDates.has(dateLabel)) {
          uniqueDates.push({
            value: Number(filteredData[i].rate),
            label: dateLabel, // Just the date, no time.
          });
          seenDates.add(dateLabel);
        }
      }

      setChartData(uniqueDates.reverse().slice(-10)); // Shows last 10 unique days
    }
  }, [allRates, targetCurrency, baseCurrency]);

  // fetches local rates on base currency change, falling back to an API sync if empty.
  useEffect(() => {
    const getRates = async () => {
      console.log("⚠️FETCH STARTING FOR:", baseCurrency);
      setLoadingRates(true);

      try {
        const response = await fetch(`http://127.0.0.1:8000/rates/${baseCurrency}`);
        const response_all = await fetch(`http://127.0.0.1:8000/all_rates/${baseCurrency}`);
        const data = await response.json();
        const data_all = await response_all.json();

        if (response.status === 404 || !data || data.length === 0) {
          console.log('Empty or not found. Syncing with external API...');
          const syncResponse = await fetch(`http://127.0.0.1:8000/fetch_and_save/${baseCurrency}`, { method: "POST" });

          if (syncResponse.ok) {
            const retry = await fetch(`http://127.0.0.1:8000/rates/${baseCurrency}`);
            const retry_all = await fetch(`http://127.0.0.1:8000/all_rates/${baseCurrency}`);
            const freshData = await retry.json();
            const freshData_all = await retry_all.json();
            setDisplayedRates(freshData); 
            setAllRates(freshData_all);   
          }
        } else {
          setDisplayedRates(data);
          setAllRates(data_all);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingRates(false);
      }
    };

    if (baseCurrency) getRates();
  }, [baseCurrency]);

  // indicator for loading
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

  // i feel like its an old indicator for loading
  if (!currencyData) {
    return <Text>Loading Currencies...</Text>;
  }
  
  const sidePadding = 20; 
  const calculatedWidth = (windowWidth / 2 - 200) - (sidePadding * 2);
  const values = chartData.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const buffer = range === 0 ? max * 0.1 : range * 0.2; // If it's a flat line, range is 0. We use a 10% buffer of the value itself. If it's a moving line, we add 20% of the range as padding.
  const chartMin = min - buffer;
  const chartMax = (max + buffer) - chartMin; // This is the "height" of the chart

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 50,                  // Global padding so they don't touch screen edges
    },
    rowContainer: {
      flex: 1,
      flexDirection: 'row', 
      backgroundColor: colors.background,
    },
    pickersContainer: {
      marginBottom: 20,
      flexDirection: "row",
      gap: 10,
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
      height: "100%",
      flex: 1,
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
      //color: '#9b66a6',
      color: '#595959',
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

          <View style={[styles.pickersContainer, {alignSelf: 'stretch'}]}>

            {/* PICKER FOR A BASE CURRENCY */}
            <View style={{flexDirection: 'column', gap: 3, flex: 1, minWidth: 0}}>
              <Text style={{flex: 0.1}}>Base currency:</Text>
              <Picker
                style={[styles.picker, {padding: 5}]}
                mode="dropdown"
                selectedValue={baseCurrency} 
                onValueChange={(itemValue) => setBaseCurrency(itemValue)}
              >  
                {currencyData?.currencies?.map(([code, name]: [string, string]) => (
                  <Picker.Item key={code} label={`${code} ${name}`} value={code} />
                ))}
              </Picker>
            </View>

            {/* PICKER FOR A TARGET CURRENCY */}
            <View style={{flexDirection: 'column', gap: 3, flex: 1, minWidth: 0}}>
              <Text style={{flex: 0.1}}>Target currency:</Text>
              <Picker
                style={[styles.picker, {padding: 5}]}
                mode="dropdown"
                selectedValue={targetCurrency} 
                onValueChange={(itemValue) => setTargetCurrency(itemValue)}
              >  
                {currencyData?.currencies?.map(([code, name]: [string, string]) => (
                  <Picker.Item key={code} label={`${code} ${name}`} value={code} />
                ))}
              </Picker>
            </View>
          </View>

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
            data={chartData}
            yAxisOffset={chartMin} // Starts the Y-axis just below your lowest rate
            maxValue={chartMax}
            height={450}               // Increase this until it matches the left side
            color={'#161616'} 
            thickness={2}              // Thicker line looks better on large graphs
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisLabelWidth={75} // Give it a generous fixed width
            formatYLabel={(label) => parseFloat(label).toFixed(2)}
            yAxisLabelContainerStyle={{justifyContent: 'center'}}
            adjustToWidth
            width={calculatedWidth}
            initialSpacing={sidePadding} 
            endSpacing={sidePadding} 
          />
        </View>
      </View>
    </View>
  );
}
