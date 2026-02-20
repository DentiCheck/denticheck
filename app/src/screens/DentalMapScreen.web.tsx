import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width, height } = Dimensions.get('window');

export default function DentalMapScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    return (
        <View className="flex-1 bg-white">
            <View className="absolute top-12 left-4 z-10">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-md bg-opacity-90"
                >
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center p-6">
                <Text className="text-xl font-bold text-slate-800 mb-2">
                    View Map
                </Text>
                <Text className="text-slate-500 text-center">
                    Maps are not supported in the current web environment.{'\n'}
                    Please check in the mobile app.
                </Text>
            </View>
        </View>
    );
}
