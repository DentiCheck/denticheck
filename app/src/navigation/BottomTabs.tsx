import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Camera, MessageSquare, Search, User, Users } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import AICheckScreen from '../screens/AICheckScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import DentalSearchScreen from '../screens/DentalSearchScreen';
import MyPageScreen from '../screens/MyPageScreen';
import CommunityScreen from '../screens/community/CommunityScreen';

const Tab = createBottomTabNavigator();

export function BottomTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#0ea5e9', // Example color
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AICheck"
                component={AICheckScreen}
                options={{
                    tabBarLabel: 'AI Check',
                    tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Chatbot"
                component={ChatbotScreen}
                options={{
                    tabBarLabel: 'Chatbot',
                    tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="DentalSearch"
                component={DentalSearchScreen}
                options={{
                    tabBarLabel: 'Hospital',
                    tabBarIcon: ({ color, size }) => <Search color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Community"
                component={CommunityScreen}
                options={{
                    tabBarLabel: 'Community',
                    tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="MyPage"
                component={MyPageScreen}
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => <User color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
}
