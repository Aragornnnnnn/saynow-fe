import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000')
  : 'https://saynow.vercel.app';

export default function App() {
  return (
    <>
      <WebView source={{ uri: WEB_URL }} style={styles.webview} />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});
