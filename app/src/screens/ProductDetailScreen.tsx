import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ChevronLeft, Star, ShoppingCart, Minus, Plus, Share2, ShieldCheck } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { Button } from '../shared/components/ui/Button';
import { Badge } from '../shared/components/ui/Badge';

export default function ProductDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
    const { theme } = useColorTheme();
    const [quantity, setQuantity] = useState(1);

    // Fallback params
    const params = route.params || {};
    const product = params.product || {
        id: 1,
        name: 'DentiMaster Floss',
        detail: 'Essential for interdental care. Soft wax coating minimizes gum irritation.',
        price: '₩12,900',
        rating: 4.8,
        reviewCount: 1240,
        tag: 'BEST',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        description: 'A thin floss that enters smoothly without irritating the gums. Added mint scent for a fresh feeling after use. Large 50m capacity for the whole family.'
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            <SafeAreaView edges={['top']} className="flex-1">
                {/* Header */}
                <View className="px-4 py-2 flex-row items-center justify-between border-b border-slate-50 dark:border-slate-800">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="p-2 -ml-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View className="flex-row gap-2">
                        <TouchableOpacity className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800">
                            <Share2 size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800">
                            <ShoppingCart size={24} color="#1e293b" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView className="flex-1">
                    {/* Image Area */}
                    <View className={`w-full h-80 ${product.color || 'bg-slate-100'} items-center justify-center`}>
                        <Text className={`font-bold text-4xl opacity-20 ${product.iconColor || 'text-slate-500'}`}>PRODUCT IMG</Text>
                    </View>

                    <View className="p-6 pb-32">
                        {/* Title & Price */}
                        <View className="mb-6">
                            <View className="flex-row gap-2 mb-2">
                                {product.tag && (
                                    <Badge variant="outline" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                                        <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">{product.tag}</Text>
                                    </Badge>
                                )}
                                <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    <Star size={12} color="#fbbf24" fill="#fbbf24" style={{ marginRight: 4 }} />
                                    <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{product.rating}</Text>
                                </View>
                            </View>

                            <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{product.name}</Text>
                            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white">{product.price}</Text>
                        </View>

                        {/* Divider */}
                        <View className="h-2 bg-slate-50 dark:bg-slate-800 -mx-6 mb-6" />

                        {/* Details */}
                        <View className="mb-6">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">Product Info</Text>
                            <Text className="text-base text-slate-600 dark:text-slate-400 leading-7">
                                {product.detail}
                                {'\n\n'}
                                {product.description}
                            </Text>
                        </View>

                        {/* Certification */}
                        <View className="flex-row items-center gap-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl mb-6">
                            <ShieldCheck size={24} color="#16a34a" />
                            <View>
                                <Text className="font-bold text-green-800 dark:text-green-400">Quasi-drug Certified</Text>
                                <Text className="text-xs text-green-600 dark:text-green-500">A safe product approved by the Ministry of Food and Drug Safety.</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Bar */}
                <View className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <View className="flex-row items-center justify-between gap-4">
                        {/* Quantity Stepper */}
                        <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                            <TouchableOpacity
                                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm"
                            >
                                <Minus size={16} color="#1e293b" />
                            </TouchableOpacity>
                            <Text className="w-10 text-center font-bold text-lg text-slate-900 dark:text-white">{quantity}</Text>
                            <TouchableOpacity
                                onPress={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm"
                            >
                                <Plus size={16} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        {/* Buy Button */}
                        <Button className="flex-1 h-14 bg-slate-900 dark:bg-white rounded-full">
                            <Text className="text-white dark:text-slate-900 font-bold text-lg">Buy Now</Text>
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}
