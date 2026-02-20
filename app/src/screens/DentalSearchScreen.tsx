import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, ActivityIndicator, Modal, Pressable, Alert } from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { SEARCH_DENTALS, TOGGLE_DENTAL_LIKE } from '../graphql/queries';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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

    const LOCATION_PRESETS = [
        { name: 'Seoul Station', latitude: 37.5547, longitude: 126.9707 },
        { name: 'Gangnam Station', latitude: 37.4979, longitude: 127.0276 },
        { name: 'Sinsa Station', latitude: 37.5163, longitude: 127.0205 },
        { name: 'Jamsil Station', latitude: 37.5133, longitude: 127.1001 },
        { name: 'Hongdae Entrance', latitude: 37.5575, longitude: 126.9245 },
    ];

    const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [locationResults, setLocationResults] = useState<any[]>([]);

    const handleAddressSearch = async () => {
        if (!locationSearchTerm.trim()) return;

        setIsSearchingLocation(true);
        setLocationResults([]);
        try {
            // Worldwide search (no country restriction)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearchTerm)}&limit=5`,
                {
                    headers: {
                        'User-Agent': 'DentiCheck-App/1.0',
                    },
                }
            );
            const results = await response.json();

            if (results && results.length > 0) {
                setLocationResults(results);
            } else {
                Alert.alert('No Results', 'Could not find that location. Please try a different address.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            Alert.alert('Error', 'Failed to search for location. Please check your connection.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const onSelectLocation = (loc: any) => {
        setCurrentLocation({
            latitude: parseFloat(loc.lat),
            longitude: parseFloat(loc.lon),
        });
        setLocationName(loc.display_name.split(',')[0]);
        setIsLocationModalVisible(false);
        setLocationSearchTerm('');
        setLocationResults([]);
    };



    const [page, setPage] = useState(0);

    // Default location (Seoul Station)
    const [currentLocation, setCurrentLocation] = useState({
        latitude: 37.5547,
        longitude: 126.9707,
    });
    const [locationName, setLocationName] = useState('Seoul Station');

    // Get tab param from navigation
    const { tab } = (route.params as { tab?: string }) || {};
    const [activeTab, setActiveTab] = useState(tab === 'favorites' ? 'favorites' : 'all');

    // Update activeTab if params change
    React.useEffect(() => {
        if (tab === 'favorites') {
            setActiveTab('favorites');
        }
    }, [tab]);

    const [toggleDentalLike] = useMutation(TOGGLE_DENTAL_LIKE);

    const { data, loading, error, refetch } = useQuery<SearchDentalsData, SearchDentalsVars>(SEARCH_DENTALS, {
        variables: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            radius: 20.0,
            page: 0,
            size: 20,
        },
    });

    // Refetch data when screen gains focus (e.g., after deleting a review)
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const dentalsData = React.useMemo(() => data?.searchDentals?.content || [], [data]);

    const dentals: Dental[] = React.useMemo(() => dentalsData.map((d: any) => {
        const dist = d.latitude && d.longitude
            ? haversineDistance(currentLocation.latitude, currentLocation.longitude, d.latitude, d.longitude)
            : 0;

        return {
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
            distance: dist > 0 ? `${dist.toFixed(1)}km` : '0.1km',
            isOpen: true,
            openTime: '09:00 - 18:00',
            features: [],
        };
    }), [dentalsData, currentLocation]);

    useEffect(() => {
        if (dentals && dentals.length > 0) {
            const likedIds = dentals.filter((d) => d.isLiked).map((d) => d.id);
            setFavorites(likedIds);
        }
    }, [dentalsData]); // Re-sync favorites from server data whenever it changes

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
            onPress={() => navigation.navigate('DentalDetail', { dental: { ...dental, isLiked: favorites.includes(dental.id) } })}
        >
            <Card className="p-5 mb-4">
                {dental.isAd && (
                    <View className="self-start mb-3">
                        <Badge className="bg-blue-600">
                            <Text className="text-white text-xs">AD</Text>
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
                            {dental.isOpen ? 'Open' : 'Closed'}
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
                        <Text className="text-primary font-medium">Call</Text>
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 bg-blue-600"
                        onPress={() => navigation.navigate('DentalMap', { dentalId: dental.id })}
                    >
                        <MapPin size={16} color="white" style={{ marginRight: 4 }} />
                        <Text className="text-white font-medium">Directions</Text>
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
                        <Text className="text-2xl font-extrabold text-slate-800 dark:text-white">Find Clinic</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('DentalMap', {})}
                            className="bg-blue-50 p-2 rounded-full"
                        >
                            <MapPinned size={24} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                    <View className="relative justify-center">
                        <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
                        <TextInput
                            placeholder="Search by name or location"
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
                            <Text className={activeTab === 'all' ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>All</Text>
                        </TabsTrigger>
                        <TabsTrigger
                            value="favorites"
                            className={`rounded-none px-0 pb-3 border-b-2 ${activeTab === 'favorites' ? 'border-blue-600' : 'border-transparent'}`}
                        >
                            <Text className={activeTab === 'favorites' ? 'text-blue-600 font-semibold' : 'text-muted-foreground'}>Saved</Text>
                        </TabsTrigger>
                    </TabsList>
                </View>

                <TabsContent value="all" className="flex-1">
                    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                        <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-blue-100 p-2 rounded-full">
                                    <MapPin size={20} color="#2563eb" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-semibold text-sm text-slate-900">Current Search Location</Text>
                                    <Text className="text-xs text-slate-500 mt-0.5">{locationName}</Text>
                                </View>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-white h-9 px-4 border-blue-200"
                                    onPress={() => setIsLocationModalVisible(true)}
                                >
                                    <Text className="text-xs text-blue-600 font-bold">Change</Text>
                                </Button>
                            </View>
                        </Card>

                        {filteredDentals.map(dental => (
                            <DentalCard key={dental.id} dental={dental} />
                        ))}

                        {filteredDentals.length === 0 && (
                            <View className="items-center py-12">
                                <MapPin size={48} color="#d1d5db" />
                                <Text className="text-muted-foreground mt-4">No search results found</Text>
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
                                <Text className="text-muted-foreground mt-4 mb-2">No saved clinics</Text>
                                <Text className="text-sm text-muted-foreground">Save clinics you are interested in</Text>
                            </View>
                        )}
                    </ScrollView>
                </TabsContent>
            </Tabs>
            <Modal
                visible={isLocationModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsLocationModalVisible(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-center items-center px-6"
                    onPress={() => setIsLocationModalVisible(false)}
                >
                    <View className="bg-white w-full rounded-3xl p-6 shadow-xl" onStartShouldSetResponder={() => true}>
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-bold text-slate-800">Change Location</Text>
                            <TouchableOpacity onPress={() => setIsLocationModalVisible(false)}>
                                <Text className="text-slate-400 font-bold">✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-slate-600 mb-2">Search Address</Text>
                            <View className="flex-row gap-2">
                                <View className="flex-1 relative justify-center">
                                    <View className="absolute left-3 z-10">
                                        <Search size={18} color="#94a3b8" />
                                    </View>
                                    <TextInput
                                        placeholder="E.g. Gangnam-daero, Seoul"
                                        value={locationSearchTerm}
                                        onChangeText={setLocationSearchTerm}
                                        className="bg-slate-50 border border-slate-200 pl-10 h-12 rounded-xl text-slate-900"
                                        onSubmitEditing={handleAddressSearch}
                                        returnKeyType="search"
                                    />
                                </View>
                                <TouchableOpacity
                                    onPress={handleAddressSearch}
                                    disabled={isSearchingLocation}
                                    className="bg-blue-600 w-12 h-12 rounded-xl items-center justify-center shadow-sm"
                                >
                                    {isSearchingLocation ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Search size={20} color="white" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Search Results */}
                        {locationResults.length > 0 && (
                            <View className="mb-6 max-h-60">
                                <Text className="text-sm font-semibold text-slate-600 mb-2">Search Results</Text>
                                <ScrollView showsVerticalScrollIndicator={true} className="border border-blue-100 rounded-xl bg-blue-50/30">
                                    {locationResults.map((loc, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => onSelectLocation(loc)}
                                            className={`p-4 flex-row items-center gap-3 ${idx < locationResults.length - 1 ? 'border-b border-blue-50' : ''}`}
                                        >
                                            <MapPin size={16} color="#3b82f6" />
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                                                    {loc.display_name.split(',')[0]}
                                                </Text>
                                                <Text className="text-xs text-slate-500" numberOfLines={2}>
                                                    {loc.display_name}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity
                                    onPress={() => setLocationResults([])}
                                    className="mt-2 self-end"
                                >
                                    <Text className="text-xs text-blue-600 font-bold">Clear Results</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text className="text-sm font-semibold text-slate-600 mb-2">Popular Areas</Text>
                        <View className="gap-2">
                            {LOCATION_PRESETS.map((loc) => (
                                <TouchableOpacity
                                    key={loc.name}
                                    className={`p-4 rounded-xl flex-row items-center justify-between ${locationName === loc.name ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                                        }`}
                                    onPress={() => {
                                        setCurrentLocation({ latitude: loc.latitude, longitude: loc.longitude });
                                        setLocationName(loc.name);
                                        setIsLocationModalVisible(false);
                                        setLocationSearchTerm('');
                                        setLocationResults([]);
                                    }}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <MapPin size={18} color={locationName === loc.name ? '#2563eb' : '#64748b'} />
                                        <Text className={`font-medium ${locationName === loc.name ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {loc.name}
                                        </Text>
                                    </View>
                                    {locationName === loc.name && (
                                        <View className="w-2 h-2 rounded-full bg-blue-600" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}
