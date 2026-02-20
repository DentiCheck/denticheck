import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../shared/components/ui/Card';
import { Button } from '../shared/components/ui/Button';
import { Input } from '../shared/components/ui/Input';
import { Label } from '../shared/components/ui/Label';
import { Checkbox } from '../shared/components/ui/Checkbox';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';

export default function SignupScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useColorTheme();
    const [step, setStep] = useState(1);
    const [allAgreed, setAllAgreed] = useState(false);
    const [agreements, setAgreements] = useState({
        service: false,
        privacy: false,
        marketing: false,
        age: false,
    });

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
    });

    const handleAgreementChange = (key: keyof typeof agreements, value: boolean) => {
        const newAgreements = { ...agreements, [key]: value };
        setAgreements(newAgreements);
        setAllAgreed(Object.values(newAgreements).every(Boolean));
    };

    const handleAllAgree = (checked: boolean) => {
        setAllAgreed(checked);
        setAgreements({
            service: checked,
            privacy: checked,
            marketing: checked,
            age: checked,
        });
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (agreements.service && agreements.privacy && agreements.age) {
                setStep(2);
            } else {
                Alert.alert("Notice", "Please agree to the required terms.");
            }
        }
    };

    const handleSignup = () => {
        if (formData.password !== formData.confirmPassword) {
            Alert.alert("Notice", "Passwords do not match.");
            return;
        }
        // Mock signup and navigate to survey
        Alert.alert("Success", "Sign up complete!", [
            { text: "OK", onPress: () => navigation.replace('Survey') }
        ]);
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
                <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-foreground">Sign Up</Text>
            </View>

            <View className="flex-1 p-6">
                <View className="mb-8">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-gray-600">{step === 1 ? 'Agreement' : 'Information'}</Text>
                        <Text className="text-sm text-gray-600">{step}/2</Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View className="h-full transition-all" style={{ width: `${(step / 2) * 100}%`, backgroundColor: theme.primary }} />
                    </View>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {step === 1 && (
                            <View className="space-y-4">
                                <Card className="p-6">
                                    <View className="flex-row items-center gap-3 mb-6 pb-4 border-b border-border">
                                        <Checkbox
                                            value={allAgreed}
                                            onValueChange={handleAllAgree}
                                            color={allAgreed ? theme.primary : undefined}
                                        />
                                        <Label className="font-semibold text-base">Agree All</Label>
                                    </View>

                                    <View className="space-y-4">
                                        {[
                                            { key: 'service', label: '[Required] Terms of Service' },
                                            { key: 'privacy', label: '[Required] Privacy Policy' },
                                            { key: 'age', label: '[Required] I am over 14 years old' },
                                            { key: 'marketing', label: '[Optional] Marketing Information', isLast: true },
                                        ].map((item: any) => (
                                            <View key={item.key} className={`flex-row items-center justify-between ${item.key === 'marketing' ? 'pt-4 border-t border-border' : ''}`}>
                                                <View className="flex-row items-center gap-3">
                                                    <Checkbox
                                                        value={agreements[item.key as keyof typeof agreements]}
                                                        onValueChange={(val) => handleAgreementChange(item.key as keyof typeof agreements, val)}
                                                        color={agreements[item.key as keyof typeof agreements] ? theme.primary : undefined}
                                                    />
                                                    <Label>{item.label}</Label>
                                                </View>
                                                <ChevronRight size={20} color="#9ca3af" />
                                            </View>
                                        ))}
                                    </View>
                                </Card>

                                <Button onPress={handleNextStep} className="mt-4">
                                    <Text className="text-primary-foreground">Next</Text>
                                </Button>
                            </View>
                        )}

                        {step === 2 && (
                            <View className="space-y-4">
                                <Card className="p-6 space-y-4">
                                    <View>
                                        <Label>Name</Label>
                                        <Input
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                        />
                                    </View>
                                    <View>
                                        <Label>Email</Label>
                                        <Input
                                            placeholder="example@email.com"
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            keyboardType="email-address"
                                        />
                                    </View>
                                    <View>
                                        <Label>Phone Number</Label>
                                        <Input
                                            placeholder="010-1234-5678"
                                            value={formData.phone}
                                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                    <View>
                                        <Label>Password</Label>
                                        <Input
                                            placeholder="At least 8 characters"
                                            value={formData.password}
                                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                                            secureTextEntry
                                        />
                                    </View>
                                    <View>
                                        <Label>Confirm Password</Label>
                                        <Input
                                            placeholder="Re-enter password"
                                            value={formData.confirmPassword}
                                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                            secureTextEntry
                                        />
                                    </View>
                                </Card>

                                <Button onPress={handleSignup} className="mt-4">
                                    <Text className="text-primary-foreground">Complete Sign Up</Text>
                                </Button>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}
