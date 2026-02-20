import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Trash2, Minus, Plus } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { Button } from '../shared/components/ui/Button';

export default function CartScreen() {
    const navigation = useNavigation();
    const { theme } = useColorTheme();

    // Mock Cart Data
    const [cartItems, setCartItems] = useState([
        {
            id: 1,
            name: 'DentiMaster Floss',
            price: 12900,
            quantity: 2,
            imageColor: 'bg-teal-50',
            iconColor: 'text-teal-600',
        },
        {
            id: 2,
            name: 'Sensitive Toothpaste',
            price: 8500,
            quantity: 1,
            imageColor: 'bg-rose-50',
            iconColor: 'text-rose-600',
        },
    ]);

    const updateQuantity = (id: number, delta: number) => {
        setCartItems(items =>
            items.map(item => {
                if (item.id === id) {
                    const newQuantity = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            })
        );
    };

    const removeItem = (id: number) => {
        setCartItems(items => items.filter(item => item.id !== id));
    };

    const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-4 p-1"
                    >
                        <ChevronLeft size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-800">Cart</Text>
                </View>

                {/* Cart Items */}
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                            <View key={item.id} className="flex-row gap-4 mb-6 bg-white">
                                {/* Image Placeholder */}
                                <View className={`w-24 h-24 ${item.imageColor} rounded-2xl items-center justify-center`}>
                                    <Text className={`font-bold text-lg opacity-30 ${item.iconColor}`}>IMG</Text>
                                </View>

                                <View className="flex-1 justify-between py-1">
                                    <View>
                                        <Text className="font-bold text-base text-slate-800 mb-1">{item.name}</Text>
                                        <Text className="font-bold text-lg text-primary">
                                            ₩{(item.price * item.quantity).toLocaleString()}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center justify-between mt-2 bg-gray-50 rounded-lg p-1 w-28">
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.id, -1)}
                                            className="p-1"
                                        >
                                            <Minus size={16} color="#64748b" />
                                        </TouchableOpacity>
                                        <Text className="font-bold text-slate-800">{item.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.id, 1)}
                                            className="p-1"
                                        >
                                            <Plus size={16} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity onPress={() => removeItem(item.id)} className="pt-1">
                                    <Trash2 size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <View className="items-center justify-center py-20">
                            <Text className="text-slate-400 text-lg">Your cart is empty.</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Footer */}
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 safe-area-bottom">
                    <View className="flex-row justify-between mb-4">
                        <Text className="text-slate-500 font-medium">Total amount</Text>
                        <Text className="text-xl font-bold text-slate-800">
                            ₩{totalPrice.toLocaleString()}
                        </Text>
                    </View>
                    <Button size="lg" className="w-full rounded-2xl" disabled={cartItems.length === 0}>
                        <Text className="font-bold text-white">Checkout</Text>
                    </Button>
                </View>
            </SafeAreaView>
        </View>
    );
}
