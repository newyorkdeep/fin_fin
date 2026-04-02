import { Share } from "react-native";

const SharedLayout = {
  borderRadius: 15,
  spacing: { margin: 10, padding: 15 }
};

export const Themes = {
  light: {
    ...SharedLayout,
    background: '#f7f5ed',
    text: '#47473f',
    tabBar: '#cbd1d1',
    activeicon: '#ffffff',
    inactiveicon: '#757575', 
  },
  dark: {
    ...SharedLayout,
    background: '#757575',
    text: '#FFFFFF',
    tabBar: '#474747',
    activeicon: '#ffffff',
    inactiveicon: '#747474'
  },
};