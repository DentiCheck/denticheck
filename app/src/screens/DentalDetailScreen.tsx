import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ChevronLeft, MapPin, Phone, Clock, Star, Heart, Calendar, Share2, Info } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';
import { Button } from '../shared/components/ui/Button';
import { Badge } from '../shared/components/ui/Badge';
import { useMutation } from '@apollo/client/react';
import { TOGGLE_DENTAL_LIKE } from '../graphql/queries';
import { fetchReviews } from '../shared/api/api';

export default function DentalDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RouteProp<RootStackParamList, 'DentalDetail'>>();
    const { theme } = useColorTheme();

    // Fallback data if no params provided (for development/testing)
    const params = route.params || {};
    const dental = params.dental || {
        id: '1',
        name: 'Smile Dental Clinic',
        address: '123 Teheran-ro, Gangnam-gu, Seoul',
        ratingAvg: 4.8,
        ratingCount: 248,
        phone: '02-1234-5678',
        isOpen: true,
        openTime: '09:00 - 18:00',
        features: ['Night Clinic', 'Parking', 'Implant'],
        description: 'Smile Dental Clinic with the latest equipment and friendly medical staff. We promise painless treatment with our pain-free anesthesia system.',
        images: ['#', '#', '#'] // Placeholders
    };

    const [isLiked, setIsLiked] = React.useState(dental.isLiked || false);
    const [ratingAvg, setRatingAvg] = React.useState(dental.ratingAvg || 0);
    const [ratingCount, setRatingCount] = React.useState(dental.ratingCount || 0);
    const [toggleDentalLike] = useMutation(TOGGLE_DENTAL_LIKE);

    // Refresh ratings when screen gains focus (e.g., after deleting a review)
    useFocusEffect(
        useCallback(() => {
            const refreshRating = async () => {
                try {
                    const data = await fetchReviews(dental.id);
                    const reviews = data.content;
                    setRatingCount(reviews.length);
                    if (reviews.length > 0) {
                        const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
                        setRatingAvg(Math.round(avg * 10) / 10);
                    } else {
                        setRatingAvg(0);
                    }
                } catch (e) {
                    // Keep existing values on error
                }
            };
            refreshRating();
        }, [dental.id])
    );

    const handleToggleLike = async () => {
        const previous = isLiked;
        setIsLiked(!previous);
        try {
            await toggleDentalLike({ variables: { dentalId: dental.id } });
        } catch (e: any) {
            setIsLiked(previous);
            console.error('Toggle like failed:', e);
            Alert.alert('Error', e?.message || 'Failed to update like status. Please try again.');
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-slate-900">
            {/* Header Image Area (Placeholder) */}
            <View className="h-64 bg-slate-200 dark:bg-slate-800 relative" style={{ zIndex: 10 }}>
                {/* Overlay Gradient could go here */}
                <View className="absolute inset-0 flex items-center justify-center">
                    <Text className="text-slate-400 dark:text-slate-600 font-bold text-lg">Clinic Image</Text>
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
                            <TouchableOpacity
                                onPress={handleToggleLike}
                                className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md"
                            >
                                <Heart size={20} color={isLiked ? "#ef4444" : theme.primary} fill={isLiked ? "#ef4444" : "none"} />
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
                                    <Text className="text-base font-bold text-slate-900 dark:text-white">{ratingAvg}</Text>
                                    <Text className="text-base text-slate-500 underline">({ratingCount} reviews)</Text>
                                </TouchableOpacity>
                            </View>
                            {dental.isOpen && (
                                <Badge className="bg-green-100 dark:bg-green-900/30">
                                    <Text className="text-green-700 dark:text-green-400 text-xs font-bold">Open</Text>
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
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">Location</Text>
                                <Text className="text-sm text-slate-500 leading-5">{dental.address}</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 items-center justify-center">
                                <Clock size={20} color="#f97316" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">Hours</Text>
                                <Text className="text-sm text-slate-500 mb-1">{dental.openTime}</Text>
                                <Text className="text-xs text-slate-400">Lunch break 13:00 - 14:00</Text>
                            </View>
                        </View>

                        <View className="flex-row gap-4">
                            <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center">
                                <Info size={20} color="#a855f7" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-1">About</Text>
                                <Text className="text-sm text-slate-500 leading-6">
                                    {dental.description || 'No clinic description available.'}
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
                        <Text className="text-primary font-bold">Call</Text>
                    </Button>
                    <Button className="flex-[2] h-12 bg-blue-600">
                        <Calendar size={18} color="white" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold">Book Now</Text>
                    </Button>
                </View>
            </View>
        </View>
    );
}
