import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, View, TouchableWithoutFeedback, Animated, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

function TabBarIcon({ name, focused }) {
    const { isDark } = useColorScheme();
    const iconDim = isDark ? '#9CA3AF' : '#6B7280';

    return (
        <Ionicons
            name={focused ? name : `${name}-outline`}
            size={24}
            color={focused ? '#00D4AA' : iconDim}
        />
    );
}

function CustomTabBarButton({ children, onPress, accessibilityState }) {
    const focused = accessibilityState?.selected;

    return (
        <TouchableWithoutFeedback onPress={onPress}>
            <View className="flex-1 items-center justify-center">
                {children}
                {focused && (
                    <View className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00D4AA]" />
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

import { useColorScheme } from '../../hooks/use-color-scheme';

export default function TabLayout() {
    const { isDark } = useColorScheme();
    const { t } = useTranslation();
    const bgColor = isDark ? '#111827' : '#FFFFFF';
    const borderColor = isDark ? '#1F2937' : '#E5E7EB';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarButton: (props) => <CustomTabBarButton {...props} />,
                tabBarStyle: Platform.select({
                    ios: {
                        position: 'absolute',
                        backgroundColor: bgColor,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        height: 85,
                        paddingBottom: 25,
                        paddingTop: 10,
                    },
                    default: {
                        backgroundColor: bgColor,
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                        height: 65,
                        paddingBottom: 10,
                        paddingTop: 10,
                        elevation: 0,
                    },
                }),
            }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: t('tabs.home'),
                    tabBarShowLabel: false,
                    tabBarIcon: (props) => <TabBarIcon name="home" {...props} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: t('tabs.explore'),
                    tabBarShowLabel: false,
                    tabBarIcon: (props) => <TabBarIcon name="search" {...props} />,
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: t('tabs.feedback'),
                    tabBarShowLabel: false,
                    tabBarIcon: (props) => <TabBarIcon name="bar-chart" {...props} />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: t('tabs.updates'),
                    tabBarShowLabel: false,
                    tabBarIcon: (props) => <TabBarIcon name="notifications" {...props} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('tabs.settings'),
                    tabBarShowLabel: false,
                    tabBarIcon: (props) => <TabBarIcon name="person" {...props} />,
                }}
            />
        </Tabs>
    );
}
