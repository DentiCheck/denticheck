import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { GET_HOSPITALS } from '../graphql/queries';
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

type Hospital = {
    id: string;
    name: string;
    address: string;
    distance: string;
    rating: number;
    reviewCount: number;
    phone: string;
    isOpen: boolean;
    openTime: string;
    features: string[];
    isAd?: boolean;
};

export default function HospitalsScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute();
    const { theme } = useColorTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);

    // Get tab param from navigation
    const { tab } = (route.params as { tab?: string }) || {};
    const [activeTab, setActiveTab] = useState(tab === 'favorites' ? 'favorites' : 'all');

    // Update activeTab if params change
    React.useEffect(() => {
        if (tab === 'favorites') {
            setActiveTab('favorites');
        }
    }, [tab]);

    const { data, loading, error } = useQuery<any>(GET_HOSPITALS);

    const hospitals: Hospital[] = data?.hospitals?.map((h: any) => ({
        id: h.id,
        name: h.name,
        address: h.address || '주소 정보 없음',
        distance: '0.0km', // TODO: Calculate distance
        rating: 0.0, // Mock
        reviewCount: 0, // Mock
        phone: h.phone || '',
        isOpen: true, // Mock
        openTime: '09:00 - 18:00', // Mock
        features: [], // Mock
        isAd: false,
    })) || [];

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
                <Text className="text-red-500">Error loading hospitals: {error.message}</Text>
            </View>
        );
    }

    const toggleFavorite = (id: string) => {
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
        );
    };

    const filteredHospitals = hospitals.filter((hospital) =>
        hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hospital.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favoriteHospitals = hospitals.filter((h) => favorites.includes(h.id));

    const HospitalCard = ({ hospital }: { hospital: Hospital }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('HospitalDetail', { hospital })}
        >
            <Card className="p-5 mb-4">
                {hospital.isAd && (
                    <View className="self-start mb-3">
                        <Badge className="bg-blue-600">
                            <Text className="text-white text-xs">광고</Text>
                        </Badge>
                    </View>
                )}

                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-2">
                        <Text className="font-semibold text-lg mb-1 text-foreground">{hospital.name}</Text>
                        <View className="flex-row items-center gap-2 mb-2">
                            <View className="flex-row items-center gap-1">
                                <Star size={16} color="#eab308" fill="#eab308" />
                                <Text className="font-medium text-sm text-foreground">{hospital.rating}</Text>
                                <Text className="text-sm text-muted-foreground">({hospital.reviewCount})</Text>
                            </View>
                            <Text className="text-muted-foreground">•</Text>
                            <View className="flex-row items-center gap-1">
                                <Navigation size={14} color="#4b5563" />
                                <Text className="text-sm text-muted-foreground">{hospital.distance}</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => toggleFavorite(hospital.id)}
                        className="p-2 bg-muted/50 rounded-full"
                    >
                        <Heart
                            size={20}
                            color={favorites.includes(hospital.id) ? '#ef4444' : '#9ca3af'}
                            fill={favorites.includes(hospital.id) ? '#ef4444' : 'transparent'}
                        />
                    </TouchableOpacity>
                </View>

                <View className="space-y-2 mb-4">
                    <View className="flex-row items-start gap-2">
                        <MapPin size={16} color="#4b5563" style={{ marginTop: 2 }} />
                        <Text className="text-sm text-muted-foreground flex-1">{hospital.address}</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Clock size={16} color="#4b5563" />
                        <Text className={`text-sm ${hospital.isOpen ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {hospital.isOpen ? '영업 중' : '영업 종료'}
                        </Text>
                        <Text className="text-sm text-muted-foreground">• {hospital.openTime}</Text>
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-2 mb-4">
                    {hospital.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline">
                            <Text className="text-xs text-foreground">{feature}</Text>
                        </Badge>
                    ))}
                </View>

                <View className="flex-row gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onPress={() => Linking.openURL(`tel:${hospital.phone}`)}>
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
                            onPress={() => navigation.navigate('HospitalMap')}
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

                        {filteredHospitals.map(hospital => (
                            <HospitalCard key={hospital.id} hospital={hospital} />
                        ))}

                        {filteredHospitals.length === 0 && (
                            <View className="items-center py-12">
                                <MapPin size={48} color="#d1d5db" />
                                <Text className="text-muted-foreground mt-4">검색 결과가 없습니다</Text>
                            </View>
                        )}
                    </ScrollView>
                </TabsContent>

                <TabsContent value="favorites" className="flex-1">
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                        {favoriteHospitals.length > 0 ? (
                            favoriteHospitals.map(hospital => (
                                <HospitalCard key={hospital.id} hospital={hospital} />
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
