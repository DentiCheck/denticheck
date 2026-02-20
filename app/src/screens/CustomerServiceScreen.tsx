import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronDown, ChevronUp, Phone, Mail, MessageSquare } from 'lucide-react-native';

export default function CustomerServiceScreen() {
    const navigation = useNavigation();

    // FAQ Data
    const faqs = [
        {
            question: 'How accurate are the AI checkup results?',
            answer: 'The AI model is trained on tens of thousands of clinical data points and shows over 90% agreement with specialist diagnoses. However, a dental visit is recommended for an accurate diagnosis.'
        },
        {
            question: 'How do I withdraw my membership?',
            answer: 'You can do so via the [Withdrawal] menu at the bottom of My Page. Upon withdrawal, all data is immediately deleted and cannot be recovered.'
        },
        {
            question: 'How do I check my dental appointment?',
            answer: 'The reservation function is under preparation. Currently, you must make a reservation directly through the dental clinic phone number.'
        },
    ];

    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const ContactItem = ({ icon: Icon, label, value, color }: any) => (
        <TouchableOpacity className="flex-row items-center bg-gray-50 p-4 rounded-xl mb-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 bg-white shadow-sm`}>
                <Icon size={20} color={color} />
            </View>
            <View>
                <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
                <Text className="text-sm font-bold text-slate-800">{value}</Text>
            </View>
        </TouchableOpacity>
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
                    <Text className="text-xl font-bold text-slate-800">Support Center</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24 }}>
                    {/* Contact Info */}
                    <Text className="text-lg font-bold text-slate-800 mb-4">Contact Us</Text>
                    <ContactItem icon={Phone} label="Phone Number" value="02-1234-5678" color="#3b82f6" />
                    <ContactItem icon={Mail} label="Email Inquiry" value="help@denticheck.com" color="#8b5cf6" />
                    <ContactItem icon={MessageSquare} label="KakaoTalk Consultation" value="@denticheck" color="#fbbf24" />

                    <View className="h-px bg-gray-100 my-6" />

                    {/* FAQ */}
                    <Text className="text-lg font-bold text-slate-800 mb-4">Frequently Asked Questions (FAQ)</Text>
                    <View>
                        {faqs.map((faq, index) => (
                            <View key={index} className="mb-3 border border-gray-100 rounded-xl overflow-hidden">
                                <TouchableOpacity
                                    onPress={() => toggleExpand(index)}
                                    className={`flex-row items-center justify-between p-4 bg-white ${expandedIndex === index ? 'bg-slate-50' : ''}`}
                                >
                                    <Text className="text-sm font-bold text-slate-700 flex-1 mr-2">Q. {faq.question}</Text>
                                    {expandedIndex === index ? (
                                        <ChevronUp size={20} color="#94a3b8" />
                                    ) : (
                                        <ChevronDown size={20} color="#94a3b8" />
                                    )}
                                </TouchableOpacity>
                                {expandedIndex === index && (
                                    <View className="p-4 bg-slate-50 border-t border-gray-100">
                                        <Text className="text-sm text-slate-600 leading-5">{faq.answer}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
