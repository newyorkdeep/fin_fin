import { Share } from "react-native";

const SharedLayout = {
  borderRadius: 15,
  spacing: { margin: 10, padding: 15 }
};

export const Themes = {
  light: {
    ...SharedLayout,
    background: '#ece7d4',
    text: '#47473f',
    tabBar: '#b3c297',
  },
  dark: {
    ...SharedLayout,
    background: '#474545',
    text: '#FFFFFF',
    tabBar: '#fdf1e2',
  },
};