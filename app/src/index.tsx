import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { registerRootComponent } from "expo";
import { RootNavigator } from "./navigation/RootNavigator";

import { ColorThemeProvider } from "./shared/providers/ColorThemeProvider";
import { AuthProvider } from "./shared/providers/AuthProvider";

import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";

import { SafeAreaProvider } from "react-native-safe-area-context";

enableScreens();

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <ColorThemeProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ColorThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
