import { Share } from "react-native";

const SharedLayout = {
  borderRadius: 15,
  spacing: { margin: 10, padding: 15 }
};

export const Themes = {
  light: {
    ...SharedLayout,
    background: '#e8e4cb',
    color: '#47473f',
    text: '#47473f',
    tabBar: '#a6a784',
  },
  dark: {
    ...SharedLayout,
    background: '#121212',
    text: '#FFFFFF',
    tabBar: '#1A1A1A',
  },
  ocean: {
    ...SharedLayout,
    background: '#001f3f',
    text: '#7FDBFF',
    tabBar: '#0074D9',
  }
};