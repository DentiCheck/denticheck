import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { SEARCH_DENTALS, TOGGLE_DENTAL_LIKE } from '../graphql/queries';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Search, MapPin, Star, Phone, Clock, Heart, Navigation, MapPinned } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../shared/components/ui/Card';
import { Button } from '../shared/components/ui/Button';
import { Badge } from '../shared/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../shared/components/ui/Tabs';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';

type Dental = {
    id: string;
    name: string;
    address: string;
    distance: string;
    ratingAvg: number;
    ratingCount: number;
    phone?: string;
    isOpen: boolean;
    description?: string;
    isLiked?: boolean;
    openTime: string;
    features: string[];
    isAd?: boolean;
};

interface DentalQueryContent {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
}

interface SearchDentalsData {
    searchDentals: {
        content: DentalQueryContent[];
    };
}

interface SearchDentalsVars {
    latitude: number;
    longitude: number;
    radius: number;
    page: number;
    size: number;
}

export default function DentalSearchScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute();
    const { theme } = useColorTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);



    const [page, setPage] = useState(0);

    // Get tab param from navigation
    const { tab } = (route.params as { tab?: string }) || {};
    const [activeTab, setActiveTab] = useState(tab === 'favorites' ? 'favorites' : 'all');

    // Update activeTab if params change
    React.useEffect(() => {
        if (tab === 'favorites') {
            setActiveTab('favorites');
        }
    }, [tab]);

    // Default location (Seoul Station) for search
    const defaultLocation = {
        latitude: 37.5547,
        longitude: 126.9707,
    };

    const [toggleDentalLike] = useMutation(TOGGLE_DENTAL_LIKE);

    const { data, loading, error, fetchMore } = useQuery<SearchDentalsData, SearchDentalsVars>(SEARCH_DENTALS, {
        variables: {
            latitude: defaultLocation.latitude,
            longitude: defaultLocation.longitude,
            radius: 20.0, // 20km radius
            page: 0,
            size: 10,
        },
    });

    const dentalsData = React.useMemo(() => data?.searchDentals?.content || [], [data]);

    const dentals: Dental[] = React.useMemo(() => dentalsData.map((d: any) => ({
        id: d.id,
        name: d.name,
        address: d.address || '',
        ratingAvg: d.ratingAvg || 0,
        ratingCount: d.ratingCount || 0,
        latitude: d.latitude,
        longitude: d.longitude,
        phone: d.phone,
        description: d.description,
        isLiked: d.isLiked || false,
        distance: '0.0km', // Mock
        isOpen: true, // Mock
        openTime: '09:00 - 18:00', // Mock
        features: [], // Mock
    })), [dentalsData]);

    useEffect(() => {
        if (dentals) {
            const likedIds = dentals.filter((d) => d.isLiked).map((d) => d.id);
            setFavorites(likedIds);
        }
    }, [dentalsData]); // Depend on dentalsData to re-sync when data changes

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <Text className="text-red-500">Error loading dentals: {error.message}</Text>
            </View>
        );
    }



    const toggleFavorite = async (id: string) => {
        try {
            const { data } = await toggleDentalLike({ variables: { dentalId: id } }) as { data: { toggleDentalLike: boolean } };
            if (data?.toggleDentalLike) {
                setFavorites((prev) => [...prev, id]);
            } else {
                setFavorites((prev) => prev.filter((fav) => fav !== id));
            }
        } catch (e) {
            console.error("Failed to toggle like", e);
        }
    };

    const filteredDentals = dentals.filter((dental) =>
        dental.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dental.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favoriteDentals = dentals.filter((d) => favorites.includes(d.id));

    const DentalCard = ({ dental }: { dental: Dental }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DentalDetail', { dental })}
        >
            <Card className="p-5 mb-4">
                {dental.isAd && (
                    <View className="self-start mb-3">
                        <Badge className="bg-blue-600">
                            <Text className="text-white text-xs">광고</Text>
                        </Badge>
                    </View>
                )}

                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-2">
                        <Text className="font-semibold text-lg mb-1 text-foreground">{dental.name}</Text>
                        <View className="flex-row items-center gap-2 mb-2">
                            <View className="flex-row items-center gap-1">
                                <Star size={16} color="#eab308" fill="#eab308" />
                                <Text className="font-medium text-sm text-foreground">{dental.ratingAvg}</Text>
                                <Text className="text-sm text-muted-foreground">({dental.ratingCount})</Text>
                            </View>
                            <Text className="text-muted-foreground">•</Text>
                            <View className="flex-row items-center gap-1">
                                <Navigation size={14} color="#4b5563" />
                                <Text className="text-sm text-muted-foreground">{dental.distance}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => toggleFavorite(dental.id)}
                        className="p-2 bg-muted/50 rounded-full"
                    >
                        <Heart
                            size={20}
                            color={favorites.includes(dental.id) ? '#ef4444' : '#9ca3af'}
                            fill={favorites.includes(dental.id) ? '#ef4444' : 'transparent'}
                        />
                    </TouchableOpacity>
                </View>

                <View className="space-y-2 mb-4">
                    <View className="flex-row items-start gap-2">
                        <MapPin size={16} color="#4b5563" style={{ marginTop: 2 }} />
                        <Text className="text-sm text-muted-foreground flex-1">{dental.address}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Clock size={16} color="#4b5563" />
                        <Text className={`text-sm ${dental.isOpen ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {dental.isOpen ? '영업 중' : '영업 종료'}
                        </Text>
                        <Text className="text-sm text-muted-foreground">• {dental.openTime}</Text>
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-2 mb-4">
                    {dental.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline">
                            <Text className="text-xs text-foreground">{feature}</Text>
                        </Badge>
                    ))}
                </View>

                <View className="flex-row gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onPress={() => Linking.openURL(`tel:${dental.phone}`)}>
                        <Phone size={16} color={theme.primary} style={{ marginRight: 4 }} />
                        <Text className="text-primary font-medium">전화</Text>
                    </Button>
                    <Button size="sm" className="flex-1 bg-blue-600">
                        <MapPin size={16} color="white" style={{ marginRight: 4 }} />
                        <Text className="text-white font-medium">길찾기</Text>
                    </Button>
                </View>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-background">
            <SafeAreaView className="bg-white border-b border-border" edges={['top']}>
                <View className="px-6 py-4 flex-col space-y-4">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">병원 찾기</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('DentalMap')}
                            className="bg-blue-50 p-2 rounded-full"
                        >
                            <MapPinned size={24} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                    <View className="relative justify-center">
                        <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                        <TextInput
                            placeholder="병원명, 지역으로 검색"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="bg-muted pl-10 h-10 rounded-md text-foreground"
                        />
                    </View>
                </View>
            </SafeAreaView>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <View className="bg-white border-b border-border px-6 sticky top-0 z-10">
                    <TabsList className="bg-transparent p-0 gap-4 mb-2">
                        <TabsTrigger
                            value="all"
                            className={`rounded-none px-0 pb-3 border-b-2 ${activeTab === 'all' ? 'border-blue-600' : 'border-transparent'}`}
                        >
                            <Text className={activeTab === 'all' ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>전체</Text>
                        </TabsTrigger>
                        <TabsTrigger
                            value="favorites"
                            className={`rounded-none px-0 pb-3 border-b-2 ${activeTab === 'favorites' ? 'border-blue-600' : 'border-transparent'}`}
                        >
                            <Text className={activeTab === 'favorites' ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>찜한 병원</Text>
                        </TabsTrigger>
                    </TabsList>
                </View>

                <TabsContent value="all" className="flex-1">
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                        <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
                            <View className="flex-row items-center gap-3">
                                <MapPin size={20} color="#2563eb" />
                                <View className="flex-1">
                                    <Text className="font-medium text-sm text-foreground">현재 위치</Text>
                                    <Text className="text-xs text-muted-foreground">서울특별시 강남구 역삼동</Text>
                                </View>
                                <Button size="sm" variant="outline" className="bg-white h-8">
                                    <Text className="text-xs text-foreground">변경</Text>
                                </Button>
                            </View>
                        </Card>

                        {filteredDentals.map(dental => (
                            <DentalCard key={dental.id} dental={dental} />
                        ))}

                        {filteredDentals.length === 0 && (
                            <View className="items-center py-12">
                                <MapPin size={48} color="#d1d5db" />
                                <Text className="text-muted-foreground mt-4">검색 결과가 없습니다</Text>
                            </View>
                        )}
                    </ScrollView>
                </TabsContent>

                <TabsContent value="favorites" className="flex-1">
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                        {favoriteDentals.length > 0 ? (
                            favoriteDentals.map(dental => (
                                <DentalCard key={dental.id} dental={dental} />
                            ))
                        ) : (
                            <View className="items-center py-12">
                                <Heart size={48} color="#d1d5db" />
                                <Text className="text-muted-foreground mt-4 mb-2">찜한 병원이 없습니다</Text>
                                <Text className="text-sm text-muted-foreground">마음에 드는 병원을 찜해보세요</Text>
                            </View>
                        )}
                    </ScrollView>
                </TabsContent>
            </Tabs>
        </View>
    );
}
