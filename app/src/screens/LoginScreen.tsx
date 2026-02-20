import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Smile } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorTheme } from "../shared/providers/ColorThemeProvider";
import { useAuth } from "../shared/providers/AuthProvider";

export default function LoginScreen() {
    const { theme } = useColorTheme();
    const { signInWithGoogle, signInDev, isLoading } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Google login failed", error);
        }
    };

    return (
        <LinearGradient colors={[theme.background, theme.muted, theme.background]} style={{ flex: 1 }}>
            <SafeAreaView className="flex-1 justify-center items-center p-6">
                <View className="w-full max-w-sm items-center">
                    {/* Logo & Branding */}
                    <View className="items-center mb-12">
                        <LinearGradient
                            colors={theme.gradient}
                            className="w-24 h-24 items-center justify-center rounded-3xl mb-6 shadow-xl"
                        >
                            <Smile size={48} color="white" />
                        </LinearGradient>
                        <Text className="text-3xl font-bold text-center text-slate-800 mb-2">DentiCheck</Text>
                        <Text className="text-slate-500 text-center font-medium">Smart Oral Care Starts Here</Text>
                    </View>

                    {/* Google Login Button */}
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white flex-row items-center justify-center py-4 px-6 rounded-2xl shadow-md border border-slate-100 mb-4"
                        activeOpacity={0.8}
                    >
                        {/* Google Icon Placeholder or Text */}
                        <Text className="text-lg font-bold text-slate-700 ml-3">Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Dev Bypass Button (Only in Dev) */}
                    {__DEV__ && (
                        <View className="w-full mt-2 gap-2">
                            <TouchableOpacity
                                onPress={() => signInDev("user")}
                                className="w-full bg-slate-800 flex-row items-center justify-center py-3 px-6 rounded-2xl shadow-md"
                                activeOpacity={0.8}
                            >
                                <Text className="text-base font-bold text-white">🛠️ Dev Pass (User)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => signInDev("admin")}
                                className="w-full bg-red-800 flex-row items-center justify-center py-3 px-6 rounded-2xl shadow-md"
                                activeOpacity={0.8}
                            >
                                <Text className="text-base font-bold text-white">🛠️ Dev Pass (Admin)</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text className="text-slate-400 text-xs text-center mt-8">
                        By logging in, you agree to our Terms and Privacy Policy.
                    </Text>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}
