import React, { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { NavigationContainerRef, CommonActions } from "@react-navigation/native";

import { BottomTabs } from "./BottomTabs";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import SurveyScreen from "../screens/SurveyScreen";
import ThemeSelectorScreen from "../screens/ThemeSelectorScreen";
import HospitalMapScreen from "../screens/HospitalMapScreen";
import RecommendedProductsScreen from "../screens/RecommendedProductsScreen";
import InsuranceProductsScreen from "../screens/InsuranceProductsScreen";
import HospitalDetailScreen from "../screens/HospitalDetailScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CartScreen from "../screens/CartScreen";
import CommentListScreen from "../screens/community/CommentListScreen";
import NotificationSettingsScreen from "../screens/NotificationSettingsScreen";
import CustomerServiceScreen from "../screens/CustomerServiceScreen";
import TermsPoliciesScreen from "../screens/TermsPoliciesScreen";
import { useAuth } from "../shared/providers/AuthProvider";
import { View, ActivityIndicator, InteractionManager } from "react-native";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  /** 커뮤니티 탭으로 이동 시 params: { screen: "Community", params: { scrollToPostId } } */
  Main: undefined | { screen: "Community"; params: { scrollToPostId: string } };
  Survey: undefined;
  ThemeSelector: undefined;
  HospitalMap: undefined;
  RecommendedProducts: undefined;
  InsuranceProducts: undefined;
  HospitalDetail: { hospital: any };
  ProductDetail: { product: any };
  Cart: undefined;
  CommentList: { postId: string };
  NotificationSettings: undefined;
  CustomerService: undefined;
  TermsPolicies: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// NavigationContainer의 ref (index.tsx에서 사용)
export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

export function RootNavigator() {
  const { user, isLoading } = useAuth();
  const pendingDeepLinkRef = useRef<string | null>(null);
  const [initialUrl, setInitialUrl] = useState<string | null>(null);

  // 딥링크 처리 함수
  const handleDeepLink = (url: string) => {
    if (!navigationRef.current) return;

    try {
      const parsed = Linking.parse(url);
      // path는 문자열 또는 배열일 수 있음
      const path = Array.isArray(parsed.path) 
        ? parsed.path.join("/") 
        : parsed.path || "";
      
      // denticheck://community/post/{id} 형식 처리
      if (path.includes("community/post/")) {
        const parts = path.split("/");
        const postIndex = parts.indexOf("post");
        const postId = postIndex >= 0 && postIndex < parts.length - 1 
          ? parts[postIndex + 1] 
          : null;
        
        if (postId && user) {
          // 로그인되어 있으면 커뮤니티 탭으로 이동 후 해당 게시글 위치로 스크롤
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
          // 로그인 안 되어 있으면 딥링크 저장 후 로그인 페이지로
          pendingDeepLinkRef.current = url;
          navigationRef.current.navigate("Login");
        }
      }
    } catch (error) {
      console.error("딥링크 처리 오류:", error);
    }
  };

  // 딥링크 리스너: 앱 실행 중 링크로 들어올 때
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      pendingDeepLinkRef.current = url;
      handleDeepLink(url);
    });
    return () => subscription.remove();
  }, [user]);

  // 앱 콜드스타트 시 초기 URL 저장 (state로 두어 URL 도착 시 effect 재실행)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) setInitialUrl(url);
    });
  }, []);

  // 초기 URL 또는 로그인 후 대기 URL 처리 (네비/화면 준비 후 한 번만)
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
          <Stack.Screen name="HospitalMap" component={HospitalMapScreen} />
          <Stack.Screen
            name="RecommendedProducts"
            component={RecommendedProductsScreen}
          />
          <Stack.Screen
            name="InsuranceProducts"
            component={InsuranceProductsScreen}
          />
          <Stack.Screen
            name="HospitalDetail"
            component={HospitalDetailScreen}
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
