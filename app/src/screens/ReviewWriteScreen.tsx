import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Star } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { createReview } from '../shared/api/api';
import { RootStackParamList } from '../navigation/RootNavigator';

export default function ReviewWriteScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'ReviewWrite'>>();
    const { theme } = useColorTheme();

    const dentalId = route.params?.dentalId;
    const dentalName = route.params?.dentalName || 'Clinic';

    const [rating, setRating] = useState(5);
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Notice', 'Please enter your review.');
            return;
        }

        try {
            setSubmitting(true);
            await createReview(dentalId, rating, content);
            Alert.alert('Success', 'Review has been posted.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to post review.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = () => {
        return (
            <View className="flex-row gap-2 justify-center py-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Star
                            size={40}
                            color={star <= rating ? "#eab308" : "#e2e8f0"}
                            fill={star <= rating ? "#eab308" : "transparent"}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-slate-800">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-3 p-1"
                    >
                        <ChevronLeft size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Write Review</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
                        <Text className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                            {dentalName}
                        </Text>
                        <Text className="text-center text-slate-500 dark:text-slate-400 mb-6">
                            Were you satisfied with your visit?
                        </Text>

                        {renderStars()}

                        <Text className="text-center font-bold text-xl text-yellow-500 mb-8">
                            {rating} stars
                        </Text>

                        <View className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 min-h-[200px]">
                            <TextInput
                                className="flex-1 text-base text-slate-900 dark:text-white"
                                placeholder="Please leave a detailed review. (Min. 10 characters)"
                                placeholderTextColor="#94a3b8"
                                multiline
                                textAlignVertical="top"
                                value={content}
                                onChangeText={setContent}
                            />
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={submitting}
                            className={`h-14 rounded-xl items-center justify-center flex-row gap-2 ${submitting ? 'bg-slate-300' : 'bg-blue-600'
                                }`}
                        >
                            {submitting && <ActivityIndicator size="small" color="white" />}
                            <Text className="text-white font-bold text-lg">
                                {submitting ? 'Posting...' : 'Submit'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
