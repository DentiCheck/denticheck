import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Camera, MessageSquare, Search, User } from 'lucide-react-native';

// Placeholder screens
const Placeholder = ({ name }: { name: string }) => <></>;

const Tab = createBottomTabNavigator();

export function BottomTabs() {
    return (
        <Tab.Navigator>
            <Tab.Screen
                name="홈"
                component={() => <Placeholder name="Home" />}
                options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
            />
            <Tab.Screen
                name="AI체크"
                component={() => <Placeholder name="AI Check" />}
                options={{ tabBarIcon: ({ color, size }) => <Camera color={color} size={size} /> }}
            />
            <Tab.Screen
                name="상식챗"
                component={() => <Placeholder name="Chat" />}
                options={{ tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} /> }}
            />
            <Tab.Screen
                name="병원찾기"
                component={() => <Placeholder name="Hospital" />}
                options={{ tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
            />
            <Tab.Screen
                name="마이"
                component={() => <Placeholder name="My" />}
                options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
            />
        </Tab.Navigator>
    );
}
