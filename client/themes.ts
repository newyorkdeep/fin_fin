import { Share } from "react-native";

const SharedLayout = {
  borderRadius: 15,
  spacing: { margin: 10, padding: 15 }
};

export const Themes = {
  light: {
    ...SharedLayout,
    background: '#f5f5f7',
    text: '#47473f',
    tabBar: '#ffffff',
    activeicon: '#2f95dc',
    inactiveicon: '#a5a5a5',
  },
  dark: {
    ...SharedLayout,
    background: '#2d2d2d',
    text: '#FFFFFF',
    tabBar: '#000000',
    activeicon: '#fff',
    inactiveicon: '#747474'
  },
};