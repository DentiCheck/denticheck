import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsPoliciesScreen() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

    const TermsContent = () => (
        <View>
            <Text className="font-bold text-slate-800 mb-2">Article 1 (Purpose)</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                These terms and conditions aim to regulate the terms of use and procedures of the service provided by DentiCheck (hereinafter "Company"), as well as the rights, obligations, and responsibilities of the users and the company.
            </Text>

            <Text className="font-bold text-slate-800 mb-2">Article 2 (Definition of Terms)</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                1. "Service" means the AI oral checkup and all related services provided by the Company.{'\n'}
                2. "User" means members and non-members who receive the services provided by the Company in accordance with these terms and conditions.
            </Text>

            <Text className="font-bold text-slate-800 mb-2">Article 3 (Posting and Revision of Terms)</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                The Company posts the contents of these terms and conditions on the service's initial screen so that users can easily find them. The Company may revise these terms and conditions within the scope that does not violate relevant laws.
            </Text>
        </View>
    );

    const PrivacyContent = () => (
        <View>
            <Text className="font-bold text-slate-800 mb-2">1. Items of Personal Information Collected</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                The company is collecting the following personal information for membership registration, consultation, service application, etc.{'\n'}
                - Required items: Name, email, password{'\n'}
                - Optional items: Oral health survey data, oral images
            </Text>

            <Text className="font-bold text-slate-800 mb-2">2. Purpose of Collection and Use of Personal Information</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                The company utilizes the collected personal information for the following purposes.{'\n'}
                - Providing AI-based oral health analysis{'\n'}
                - Recommending customized clinics and products
            </Text>

            <Text className="font-bold text-slate-800 mb-2">3. Retention and Use Period of Personal Information</Text>
            <Text className="text-slate-600 mb-4 leading-5 text-sm">
                In principle, after the purpose of collecting and using personal information is achieved, the information is destroyed without delay. However, if it is necessary to preserve it in accordance with the provisions of relevant laws, the company stores member information for a certain period set by relevant laws as follows.
            </Text>
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
                    <Text className="text-xl font-bold text-slate-800">Terms & Policies</Text>
                </View>

                {/* Tabs */}
                <View className="flex-row border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => setActiveTab('terms')}
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'terms' ? 'border-blue-500' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold ${activeTab === 'terms' ? 'text-blue-600' : 'text-slate-400'}`}>Terms of Use</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('privacy')}
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'privacy' ? 'border-blue-500' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold ${activeTab === 'privacy' ? 'text-blue-600' : 'text-slate-400'}`}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
