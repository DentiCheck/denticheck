import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../shared/components/ui/Card';
import { Button } from '../shared/components/ui/Button';
import { Label } from '../shared/components/ui/Label';
import { Checkbox } from '../shared/components/ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '../shared/components/ui/RadioGroup';
import { useColorTheme } from '../shared/providers/ColorThemeProvider';

export default function SurveyScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useColorTheme();
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = 3;

    const [habits, setHabits] = useState({
        smoking: '',
        drinking: '',
        brushing: '',
        flossing: '',
        sweetFood: '',
    });

    const [symptoms, setSymptoms] = useState<string[]>([]);

    const handleSymptomToggle = (symptom: string) => {
        setSymptoms((prev) =>
            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
        );
    };

    const canProceed = () => {
        if (currentPage === 1) return habits.smoking && habits.drinking && habits.brushing;
        if (currentPage === 2) return habits.flossing && habits.sweetFood;
        return true;
    };

    const handleSubmit = () => {
        // Mock submission
        navigation.replace('Main');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
                <TouchableOpacity onPress={() => currentPage === 1 ? navigation.goBack() : setCurrentPage(currentPage - 1)}>
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-foreground">Oral Health Survey</Text>
            </View>

            <View className="flex-1 p-6">
                <View className="mb-8">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-sm text-gray-600">
                            {currentPage === 1 ? 'Life Habits' : currentPage === 2 ? 'Eating Habits' : 'Symptoms'}
                        </Text>
                        <Text className="text-sm text-gray-600">{currentPage}/{totalPages}</Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View className="h-full transition-all" style={{ width: `${(currentPage / totalPages) * 100}%`, backgroundColor: theme.primary }} />
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {currentPage === 1 && (
                        <View className="space-y-6">
                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">Do you smoke?</Text>
                                <RadioGroup value={habits.smoking} onValueChange={(val) => setHabits({ ...habits, smoking: val })}>
                                    {[
                                        { val: 'never', label: 'Non-smoker' },
                                        { val: 'quit', label: 'Ex-smoker' },
                                        { val: 'current', label: 'Current smoker' },
                                    ].map((opt) => (
                                        <View key={opt.val} className="flex-row items-center gap-2 mb-2">
                                            <RadioGroupItem value={opt.val} />
                                            <Label onPress={() => setHabits({ ...habits, smoking: opt.val })}>{opt.label}</Label>
                                        </View>
                                    ))}
                                </RadioGroup>
                            </Card>

                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">How often do you drink?</Text>
                                <RadioGroup value={habits.drinking} onValueChange={(val) => setHabits({ ...habits, drinking: val })}>
                                    {[
                                        { val: 'never', label: 'Never' },
                                        { val: 'rare', label: '1-2 times/month' },
                                        { val: 'regular', label: '1-2 times/week' },
                                        { val: 'frequent', label: '3+ times/week' },
                                    ].map(opt => (
                                        <View key={opt.val} className="flex-row items-center gap-2 mb-2">
                                            <RadioGroupItem value={opt.val} />
                                            <Label onPress={() => setHabits({ ...habits, drinking: opt.val })}>{opt.label}</Label>
                                        </View>
                                    ))}
                                </RadioGroup>
                            </Card>

                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">How many times do you brush a day?</Text>
                                <RadioGroup value={habits.brushing} onValueChange={(val) => setHabits({ ...habits, brushing: val })}>
                                    {[
                                        { val: '1', label: '1 time' },
                                        { val: '2', label: '2 times' },
                                        { val: '3+', label: '3+ times' },
                                    ].map(opt => (
                                        <View key={opt.val} className="flex-row items-center gap-2 mb-2">
                                            <RadioGroupItem value={opt.val} />
                                            <Label onPress={() => setHabits({ ...habits, brushing: opt.val })}>{opt.label}</Label>
                                        </View>
                                    ))}
                                </RadioGroup>
                            </Card>
                        </View>
                    )}

                    {currentPage === 2 && (
                        <View className="space-y-6">
                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">Do you use floss or interdental brushes?</Text>
                                <RadioGroup value={habits.flossing} onValueChange={(val) => setHabits({ ...habits, flossing: val })}>
                                    {[
                                        { val: 'never', label: 'Never' },
                                        { val: 'sometimes', label: 'Sometimes' },
                                        { val: 'regularly', label: 'Every day' },
                                    ].map(opt => (
                                        <View key={opt.val} className="flex-row items-center gap-2 mb-2">
                                            <RadioGroupItem value={opt.val} />
                                            <Label onPress={() => setHabits({ ...habits, flossing: opt.val })}>{opt.label}</Label>
                                        </View>
                                    ))}
                                </RadioGroup>
                            </Card>

                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">How often do you consume sweet food or drinks?</Text>
                                <RadioGroup value={habits.sweetFood} onValueChange={(val) => setHabits({ ...habits, sweetFood: val })}>
                                    {[
                                        { val: 'rare', label: 'Rarely' },
                                        { val: 'sometimes', label: '1-2 times/week' },
                                        { val: 'often', label: 'Almost every day' },
                                    ].map(opt => (
                                        <View key={opt.val} className="flex-row items-center gap-2 mb-2">
                                            <RadioGroupItem value={opt.val} />
                                            <Label onPress={() => setHabits({ ...habits, sweetFood: opt.val })}>{opt.label}</Label>
                                        </View>
                                    ))}
                                </RadioGroup>
                            </Card>
                        </View>
                    )}

                    {currentPage === 3 && (
                        <View className="space-y-6">
                            <Card className="p-6">
                                <Text className="font-semibold mb-4 text-foreground">Please select all symptoms you are currently experiencing</Text>
                                <Text className="text-sm text-gray-600 mb-4">If none apply, proceed to next</Text>
                                <View className="space-y-3">
                                    {[
                                        { id: 'bad-breath', label: 'Bad breath' },
                                        { id: 'bleeding', label: 'Bleeding gums' },
                                        { id: 'sensitivity', label: 'Sensitive teeth' },
                                        { id: 'pain', label: 'Pain' },
                                        { id: 'swelling', label: 'Gum swelling' },
                                        { id: 'loose', label: 'Loose teeth' },
                                        { id: 'cavity', label: 'Suspected cavity' },
                                    ].map((symptom) => (
                                        <View key={symptom.id} className="flex-row items-center gap-2">
                                            <Checkbox
                                                value={symptoms.includes(symptom.id)}
                                                onValueChange={() => handleSymptomToggle(symptom.id)}
                                                color={theme.primary}
                                            />
                                            <Label onPress={() => handleSymptomToggle(symptom.id)}>{symptom.label}</Label>
                                        </View>
                                    ))}
                                </View>
                            </Card>

                            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <Text className="text-sm text-blue-800">
                                    💡 We provide a customized oral care guide based on your survey results.
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View className="flex-row gap-3 mt-4">
                    {currentPage > 1 && (
                        <Button variant="outline" className="flex-1" onPress={() => setCurrentPage(currentPage - 1)}>
                            <Text className="text-foreground">Prev</Text>
                        </Button>
                    )}
                    <Button
                        className="flex-1"
                        onPress={() => currentPage < totalPages ? setCurrentPage(currentPage + 1) : handleSubmit()}
                        disabled={!canProceed()}
                    >
                        <Text className="text-primary-foreground">{currentPage < totalPages ? 'Next' : 'Complete'}</Text>
                    </Button>
                </View>
            </View>
        </SafeAreaView>
    );
}
