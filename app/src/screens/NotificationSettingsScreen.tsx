import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';

export default function NotificationSettingsScreen() {
    const navigation = useNavigation();
    const { theme } = useColorTheme();

    const [settings, setSettings] = useState({
        push: true,
        marketing: false,
        healthCheck: true,
        community: true,
    });

    const toggleSwitch = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const SettingItem = ({ label, description, value, onValueChange }: any) => (
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-1 mr-4">
                <Text className="text-base font-medium text-slate-800 mb-1">{label}</Text>
                {description && <Text className="text-sm text-slate-400">{description}</Text>}
            </View>
            <Switch
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor={value ? '#ffffff' : '#f1f5f9'}
                ios_backgroundColor="#e2e8f0"
                onValueChange={onValueChange}
                value={value}
            />
        </View>
    );

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="mr-4 p-1"
                    >
                        <ChevronLeft size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-800">Notification Settings</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    <Text className="text-sm font-bold text-slate-400 mb-2">Basic Notifications</Text>
                    <View className="mb-8">
                        <SettingItem
                            label="Push Notifications"
                            description="Receive all push notifications from the app."
                            value={settings.push}
                            onValueChange={() => toggleSwitch('push')}
                        />
                    </View>

                    <Text className="text-sm font-bold text-slate-400 mb-2">Service Notifications</Text>
                    <View className="mb-8">
                        <SettingItem
                            label="Health Check Notifications"
                            description="Receive regular checkup and brushing notifications."
                            value={settings.healthCheck}
                            onValueChange={() => toggleSwitch('healthCheck')}
                        />
                        <SettingItem
                            label="Community Activity"
                            description="Receive notifications for comments and likes on your posts."
                            value={settings.community}
                            onValueChange={() => toggleSwitch('community')}
                        />
                    </View>

                    <Text className="text-sm font-bold text-slate-400 mb-2">Marketing Information</Text>
                    <View>
                        <SettingItem
                            label="Benefits and Event Notifications"
                            description="Receive news about various discount benefits and events."
                            value={settings.marketing}
                            onValueChange={() => toggleSwitch('marketing')}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
