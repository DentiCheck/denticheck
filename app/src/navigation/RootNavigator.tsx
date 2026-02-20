import React, { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { NavigationContainerRef, CommonActions } from "@react-navigation/native";
import { View, ActivityIndicator, InteractionManager } from "react-native";

import { BottomTabs } from "./BottomTabs";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import SurveyScreen from "../screens/SurveyScreen";
import ThemeSelectorScreen from "../screens/ThemeSelectorScreen";
import DentalSearchScreen from "../screens/DentalSearchScreen";
import DentalMapScreen from "../screens/DentalMapScreen";
import RecommendedProductsScreen from "../screens/RecommendedProductsScreen";
import InsuranceProductsScreen from "../screens/InsuranceProductsScreen";
import DentalDetailScreen from "../screens/DentalDetailScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CartScreen from "../screens/CartScreen";
import CommentListScreen from "../screens/community/CommentListScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import CustomerServiceScreen from "../screens/CustomerServiceScreen";
import TermsPoliciesScreen from "../screens/TermsPoliciesScreen";
import ReviewListScreen from "../screens/ReviewListScreen";
import ReviewWriteScreen from "../screens/ReviewWriteScreen";
import { useAuth } from "../shared/providers/AuthProvider";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  /** params when moving to community tab: { screen: "Community", params: { scrollToPostId } } */
  Main: undefined | { screen: "Community"; params: { scrollToPostId: string } };
  Survey: undefined;
  ThemeSelector: undefined;
  DentalSearch: { tab?: string };
  DentalMap: undefined;
  RecommendedProducts: undefined;
  InsuranceProducts: undefined;
  DentalDetail: { dental: any };
  ProductDetail: { product: any };
  Cart: undefined;
  CommentList: { postId: string };
  NotificationSettings: undefined;
  CustomerService: undefined;
  TermsPolicies: undefined;
  ReviewList: { dentalId: string; dentalName: string };
  ReviewWrite: { dentalId: string; dentalName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// NavigationContainer ref (used in index.tsx)
export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

export function RootNavigator() {
  const { user, isLoading } = useAuth();
  const pendingDeepLinkRef = useRef<string | null>(null);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);

  // Deep link processing function
  const handleDeepLink = (url: string) => {
    if (!navigationRef.current) return;

    try {
      const parsed = Linking.parse(url);
      // path can be string or array
      const path = Array.isArray(parsed.path)
        ? parsed.path.join("/")
        : parsed.path || "";

      // Handle denticheck://community/post/{id} format
      if (path.includes("community/post/")) {
        const parts = path.split("/");
        const postIndex = parts.indexOf("post");
        const postId = postIndex >= 0 && postIndex < parts.length - 1
          ? parts[postIndex + 1]
          : null;

        if (postId && user) {
          // If logged in, move to community tab and scroll to that post
          pendingDeepLinkRef.current = null;
          navigationRef.current.dispatch(
            CommonActions.navigate({
              name: "Main",
              params: {
                screen: "Community",
                params: { scrollToPostId: postId },
              },
            })
          );
        } else if (postId && !user) {
          // If not logged in, save deep link and move to login page
          pendingDeepLinkRef.current = url;
          navigationRef.current.navigate("Login");
        }
      }
    } catch (error) {
      console.error("Deep link processing error:", error);
    }
  };

  // Deep link listener: When entering via link while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      pendingDeepLinkRef.current = url;
      handleDeepLink(url);
    });
    return () => subscription.remove();
  }, [user]);

  // Save initial URL on app cold start (use state to re-run effect when URL arrives)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) setInitialUrl(url);
    });
  }, []);

  // Process initial URL or wait URL after login (once after nav/screen ready)
  useEffect(() => {
    if (!user) return;
    const url = initialUrl || pendingDeepLinkRef.current;
    if (!url) return;

    const run = () => {
      if (!navigationRef.current) {
        setTimeout(run, 150);
        return;
      }
      handleDeepLink(url);
      setInitialUrl(null);
      pendingDeepLinkRef.current = null;
    };

    InteractionManager.runAfterInteractions(() => {
      setTimeout(run, 250);
    });
  }, [user, initialUrl]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={BottomTabs} />
          <Stack.Screen name="Survey" component={SurveyScreen} />
          <Stack.Screen name="ThemeSelector" component={ThemeSelectorScreen} />
          <Stack.Screen name="DentalSearch" component={DentalSearchScreen} />
          <Stack.Screen name="DentalMap" component={DentalMapScreen} />
          <Stack.Screen
            name="RecommendedProducts"
            component={RecommendedProductsScreen}
          />
          <Stack.Screen
            name="InsuranceProducts"
            component={InsuranceProductsScreen}
          />
          <Stack.Screen
            name="DentalDetail"
            component={DentalDetailScreen}
          />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="CommentList" component={CommentListScreen} />
          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
          />
          <Stack.Screen
            name="CustomerService"
            component={CustomerServiceScreen}
          />
          <Stack.Screen name="TermsPolicies" component={TermsPoliciesScreen} />
          <Stack.Screen name="ReviewList" component={ReviewListScreen} />
          <Stack.Screen name="ReviewWrite" component={ReviewWriteScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
