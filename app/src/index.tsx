import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { registerRootComponent } from "expo";
import { RootNavigator, navigationRef } from "./navigation/RootNavigator";

import { ColorThemeProvider } from "./shared/providers/ColorThemeProvider";
import { AuthProvider } from "./shared/providers/AuthProvider";

import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from "react-native-screens";

import { SafeAreaProvider } from "react-native-safe-area-context";

import { ApolloProvider } from "@apollo/client/react";
import client from "./graphql/client";

enableScreens();

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <ColorThemeProvider>
            <AuthProvider>
              <ApolloProvider client={client}>
                <RootNavigator />
              </ApolloProvider>
            </AuthProvider>
          </ColorThemeProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
