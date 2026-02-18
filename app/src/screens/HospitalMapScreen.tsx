import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { SEARCH_HOSPITALS } from '../graphql/queries';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ChevronLeft, List } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';

const { width, height } = Dimensions.get('window');

// Mock Data (Same as HospitalsScreen for consistency)

interface Hospital {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
}

interface SearchHospitalsData {
    searchHospitals: {
        content: Hospital[];
        pageInfo: {
            currentPage: number;
            totalPages: number;
            totalElements: number;
        };
    };
}

interface SearchHospitalsVars {
    latitude: number;
    longitude: number;
    radius: number;
    page: number;
    size: number;
}


export default function HospitalMapScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { theme } = useColorTheme();
    const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

    // Default location: Seoul Station (matching HospitalsScreen)
    const [region, setRegion] = useState({
        latitude: 37.5547,
        longitude: 126.9707,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
    });

    // Calculate radius based on latitudeDelta (approx. 111km per degree)
    // Formula: (delta * 111) / 2 to get radius from center to edge
    // We increase this slightly and ensure a minimum of 5km
    const calculatedRadius = Math.max((region.latitudeDelta * 111), 5.0);

    const { data, loading, error, refetch } = useQuery<SearchHospitalsData, SearchHospitalsVars>(SEARCH_HOSPITALS, {
        variables: {
            latitude: region.latitude,
            longitude: region.longitude,
            radius: calculatedRadius < 20.0 ? calculatedRadius : 20.0, // Cap at 20km
            page: 0,
            size: 50,
        },
        fetchPolicy: 'cache-and-network',
    });

    // Filter out hospitals with missing coordinates and map to local format
    const hospitalsData = data?.searchHospitals?.content || [];

    const hospitals = hospitalsData
        .filter((h: any) => h.latitude != null && h.longitude != null)
        .map((h: any) => ({
            id: h.id,
            name: h.name,
            latitude: h.latitude,
            longitude: h.longitude,
            address: h.address || '주소 정보 없음',
            phone: h.phone || '',
            description: h.description || '',
            rating: 0.0, // Mock for now
            reviewCount: 0, // Mock for now
            isOpen: true, // Mock for now
            openTime: '09:00 - 18:00', // Mock for now
            features: [], // Mock for now
        }));

    const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);

    const onRegionChangeComplete = (newRegion: any) => {
        // Only update if coordinates changed significantly to avoid infinite loops
        const latDiff = Math.abs(newRegion.latitude - region.latitude);
        const lngDiff = Math.abs(newRegion.longitude - region.longitude);
        const deltaDiff = Math.abs(newRegion.latitudeDelta - region.latitudeDelta);

        if (latDiff > 0.001 || lngDiff > 0.001 || deltaDiff > 0.001) {
            setRegion(newRegion);
        }
    };

    return (
        <View className="flex-1 bg-white">
            {/* Back Button */}
            <View className="absolute top-12 left-4 z-20">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-md"
                >
                    <ChevronLeft size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
                <View className="absolute top-24 left-4 right-4 z-20 bg-red-50 p-3 rounded-lg border border-red-200">
                    <Text className="text-red-600 text-xs font-medium">데이터를 불러오지 못했습니다: {error.message}</Text>
                    <TouchableOpacity onPress={() => refetch()} className="mt-2 bg-red-600 px-3 py-1 rounded self-start">
                        <Text className="text-white text-xs font-bold">재시도</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* No Data Message */}
            {!loading && !error && hospitals.length === 0 && (
                <View className="absolute top-24 left-4 right-4 z-20 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Text className="text-blue-600 text-xs font-medium text-center">이 주변에는 등록된 치과 정보가 없습니다.</Text>
                </View>
            )}

            {/* Loading Indicator */}
            {loading && (
                <View className="absolute top-24 left-0 right-0 z-20 items-center">
                    <View className="bg-white/90 px-4 py-2 rounded-full shadow-md flex-row items-center gap-2">
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text className="text-xs font-semibold text-gray-700">병원 검색 중...</Text>
                    </View>
                </View>
            )}

            <MapView
                style={{ width, height: '100%' }}
                initialRegion={region}
                onRegionChangeComplete={onRegionChangeComplete}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {hospitals.map((hospital) => (
                    <Marker
                        key={hospital.id}
                        coordinate={{ latitude: hospital.latitude, longitude: hospital.longitude }}
                        title={hospital.name}
                        description={hospital.address}
                        onPress={() => setSelectedHospitalId(hospital.id)}
                    />
                ))}
            </MapView>

            {/* Bottom Card for Selected Hospital */}
            {selectedHospital && (
                <View className="absolute bottom-10 left-4 right-4 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 z-30">
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-2">
                            <Text className="font-bold text-xl text-slate-900" numberOfLines={1}>
                                {selectedHospital.name}
                            </Text>
                            <Text className="text-slate-500 text-sm mt-1" numberOfLines={2}>
                                {selectedHospital.address}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setSelectedHospitalId(null)}
                            className="bg-slate-100 p-2 rounded-full"
                        >
                            <Text className="text-slate-400 font-bold">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        className="mt-4 bg-blue-600 py-3.5 rounded-xl items-center shadow-sm"
                        onPress={() => {
                            navigation.navigate('HospitalDetail', { hospital: selectedHospital });
                        }}
                    >
                        <Text className="text-white font-bold text-base">상세보기</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
