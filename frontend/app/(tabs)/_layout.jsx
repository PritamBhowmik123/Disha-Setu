import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Buffer } from 'buffer';

global.Buffer = Buffer;

export default function TabLayout() {
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const bgColor = isDark ? '#111827' : '#FFFFFF';
    const borderColor = isDark ? '#1F2937' : '#E5E7EB';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#00D4AA',
                tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: -2,
                },
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',
                        backgroundColor: bgColor,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        height: 85,
                        paddingBottom: 24,
                        paddingTop: 8,
                    },
                    default: {
                        backgroundColor: bgColor,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        height: 60,
                        paddingBottom: 8,
                        paddingTop: 8,
                        elevation: 0,
                    },
                }),
            }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: t('tabs.home'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: t('tabs.explore'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: t('tabs.feedback'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: t('tabs.updates'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('tabs.settings'),
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
