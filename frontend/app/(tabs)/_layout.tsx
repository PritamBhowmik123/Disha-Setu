import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TABS = [
  { name: 'home', label: 'Home', icon: '🏠' },
  { name: 'search', label: 'Search', icon: '🔍' },
  { name: 'notifications', label: 'Alerts', icon: '🔔' },
  { name: 'activity', label: 'Activity', icon: '📋' },
  { name: 'settings', label: 'Settings', icon: '⚙️' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS.find(t => t.name === route.name) || TABS[0];
          const focused = state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0E1A',
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: '#00D4AA20',
  },
  label: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '500',
  },
  labelActive: {
    color: '#00D4AA',
    fontWeight: '700',
  },
});

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
