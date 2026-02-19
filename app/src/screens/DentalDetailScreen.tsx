import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ChevronLeft, MapPin, Phone, Clock, Star, Heart, Calendar, Share2, Info } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { Button } from '../shared/components/ui/Button';
import { Badge } from '../shared/components/ui/Badge';

export default function DentalDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'DentalDetail'>>();
    const { theme } = useColorTheme();

    // Fallback data if no params provided (for development/testing)
    const params = route.params || {};
    const dental = params.dental || {
        id: '1',
        name: '스마일 치과의원',
        address: '서울특별시 강남구 테헤란로 123',
        ratingAvg: 4.8,
        ratingCount: 248,
        phone: '02-1234-5678',
        isOpen: true,
        openTime: '09:00 - 18:00',
        features: ['야간진료', '주차가능', '임플란트'],
        description: '최신 장비와 친절한 의료진이 함께하는 스마일 치과입니다. 무통 마취 시스템으로 아프지 않은 치료를 약속드립니다.',
        images: ['#', '#', '#'] // Placeholders
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            {/* Header Image Area (Placeholder) */}
            <View className="h-64 bg-slate-200 dark:bg-slate-800 relative">
                {/* Overlay Gradient could go here */}
                <View className="absolute inset-0 flex items-center justify-center">
                    <Text className="text-slate-400 dark:text-slate-600 font-bold text-lg">Dental Image</Text>
                </View>

                <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0">
                    <View className="px-4 py-2 flex-row items-center justify-between">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                        >
                            <ChevronLeft size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <View className="flex-row gap-3">
                            <TouchableOpacity className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md">
                                <Share2 size={20} color="#1e293b" />
                            </TouchableOpacity>
                            <TouchableOpacity className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md">
                                <Heart size={20} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 -mt-6 bg-white dark:bg-slate-900 rounded-t-[32px]">
                <View className="p-6 pb-32">
                    {/* Title Section */}
                    <View className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                        <View className="flex-row items-start justify-between mb-2">
                            <View>
                                <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{dental.name}</Text>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('ReviewList', { dentalId: dental.id, dentalName: dental.name })}
                                    className="flex-row items-center gap-2"
                                >
                                    <Star size={18} color="#eab308" fill="#eab308" />
                                    <Text className="text-base font-bold text-slate-900 dark:text-white">{dental.ratingAvg || 0}</Text>
                                    <Text className="text-base text-slate-500 underline">({dental.ratingCount || 0}개의 후기)</Text>
                                </TouchableOpacity>
                            </View>
                            {dental.isOpen && (
                                <Badge className="bg-green-100 dark:bg-green-900/30">
                                    <Text className="text-green-700 dark:text-green-400 text-xs font-bold">진료중</Text>
                                </Badge>
                            )}
                        </View>

                        <View className="flex-row flex-wrap gap-2 mt-2">
                            {dental.features?.map((feature: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="border-slate-200 dark:border-slate-700">
                                    <Text className="text-xs text-slate-600 dark:text-slate-400">{feature}</Text>
                                </Badge>
                            ))}
                        </View>
                    </View>

                    {/* Info Section */}
                    <View className="space-y-6">
                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
                                <MapPin size={20} color={theme.primary} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">위치</Text>
                                <Text className="text-sm text-slate-500 leading-5">{dental.address}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 items-center justify-center">
                                <Clock size={20} color="#f97316" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">진료시간</Text>
                                <Text className="text-sm text-slate-500 mb-1">{dental.openTime}</Text>
                                <Text className="text-xs text-slate-400">점심시간 13:00 - 14:00</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center">
                                <Info size={20} color="#a855f7" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">병원 소개</Text>
                                <Text className="text-sm text-slate-500 leading-6">
                                    {dental.description || '병원 소개글이 없습니다.'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-area-bottom">
                <View className="flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onPress={() => Linking.openURL(`tel:${dental.phone}`)}
                    >
                        <Phone size={18} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text className="text-primary font-bold">전화하기</Text>
                    </Button>
                    <Button className="flex-[2] h-12 bg-blue-600">
                        <Calendar size={18} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold">예약하기</Text>
                    </Button>
                </View>
            </View>
        </View>
    );
}
