import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Star, Plus, Trash2 } from 'lucide-react-native'; // Changed Edit to Plus for "Write" action
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { fetchReviews, deleteReview, ReviewResponse } from '../shared/api/api';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function ReviewListScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RootStackParamList, 'ReviewList'>>();
    const { theme } = useColorTheme();

    // Safety check for parameters
    const dentalId = route.params?.dentalId;
    const dentalName = route.params?.dentalName || 'Clinic';

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
            setError('Failed to load reviews.');
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

    const handleDeleteReview = (review: ReviewResponse) => {
        Alert.alert(
            'Delete Review',
            'Are you sure you want to delete this review?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteReview(dentalId, review.id);
                            loadReviews();
                        } catch (err) {
                            console.error('Delete review failed:', err);
                            Alert.alert('Error', 'Failed to delete review.');
                        }
                    },
                },
            ]
        );
    };


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
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Reviews</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ReviewWrite', { dentalId, dentalName })}
                        className="flex-row items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full"
                    >
                        <Plus size={16} color={theme.primary} />
                        <Text className="text-sm font-bold text-primary dark:text-blue-400">Write</Text>
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
                            <Text className="text-slate-900 font-bold">Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <Text className="text-slate-500 dark:text-slate-400 mb-4">
                            Total <Text className="font-bold text-slate-900 dark:text-white">{reviews.length}</Text> reviews.
                        </Text>

                        {reviews.length === 0 ? (
                            <View className="py-20 items-center">
                                <Text className="text-slate-400 text-center">No reviews yet.{'\n'}Be the first to leave a review!</Text>
                            </View>
                        ) : (
                            reviews.map((review) => (
                                <View key={review.id} className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-2 flex-1">
                                            <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 items-center justify-center">
                                                <Text className="font-bold text-slate-500 dark:text-slate-300">
                                                    {review.userName ? review.userName[0] : 'An'}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-slate-900 dark:text-white text-sm">
                                                    {review.userName || 'Anonymous User'}
                                                </Text>
                                                <View className="flex-row items-center gap-2">
                                                    {renderStars(review.rating)}
                                                    <Text className="text-xs text-slate-400">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteReview(review)}
                                            className="p-2 rounded-full"
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
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
