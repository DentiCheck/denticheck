import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Star, Plus } from 'lucide-react-native'; // Changed Edit to Plus for "Write" action
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { fetchReviews, ReviewResponse } from '../shared/api/api';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function ReviewListScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'ReviewList'>>();
    const { theme } = useColorTheme();

    // Safety check for parameters
    const dentalId = route.params?.dentalId;
    const hospitalName = route.params?.hospitalName || '병원';

    const [reviews, setReviews] = useState<ReviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadReviews = async () => {
        if (!dentalId) return;
        try {
            setLoading(true);
            const data = await fetchReviews(dentalId);
            setReviews(data.content);
        } catch (err) {
            console.error(err);
            setError('후기를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, [dentalId]);

    // Refresh when coming back from write screen
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadReviews();
        });
        return unsubscribe;
    }, [navigation]);


    const renderStars = (rating: number) => {
        return (
            <View className="flex-row">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        size={14}
                        color={i < rating ? "#eab308" : "#e2e8f0"}
                        fill={i < rating ? "#eab308" : "transparent"}
                    />
                ))}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100 dark:border-slate-800">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="mr-3 p-1"
                        >
                            <ChevronLeft size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">후기</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ReviewWrite', { dentalId, hospitalName })}
                        className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full"
                    >
                        <Plus size={16} color={theme.primary} />
                        <Text className="text-sm font-bold text-primary dark:text-blue-400">작성하기</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading && reviews.length === 0 ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : error ? (
                    <View className="flex-1 items-center justify-center p-6">
                        <Text className="text-slate-500 mb-4">{error}</Text>
                        <TouchableOpacity onPress={loadReviews} className="bg-slate-100 px-4 py-2 rounded-lg">
                            <Text className="text-slate-900 font-bold">다시 시도</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <Text className="text-slate-500 dark:text-slate-400 mb-4">
                            총 <Text className="font-bold text-slate-900 dark:text-white">{reviews.length}</Text>개의 후기가 있습니다.
                        </Text>

                        {reviews.length === 0 ? (
                            <View className="py-20 items-center">
                                <Text className="text-slate-400 text-center">아직 작성된 후기가 없습니다.{'\n'}첫 번째 후기를 남겨보세요!</Text>
                            </View>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center">
                                                <Text className="font-bold text-slate-500 dark:text-slate-300">
                                                    {review.userName ? review.userName[0] : '익'}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {review.userName || '익명 사용자'}
                                                </Text>
                                                <View className="flex-row items-center gap-2">
                                                    {renderStars(review.rating)}
                                                    <Text className="text-xs text-slate-400">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    <Text className="text-slate-800 dark:text-slate-200 leading-6">
                                        {review.content}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
