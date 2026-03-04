import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  type = 'toggle',
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean | string;
  onValueChange?: (v: boolean) => void;
  type?: 'toggle' | 'select' | 'arrow';
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-4 border-b border-[#1F2937]"
      onPress={onPress}
      activeOpacity={type === 'toggle' ? 1 : 0.7}
    >
      <View className="w-10 h-10 rounded-xl bg-[#1A2035] items-center justify-center mr-4">
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium text-base">{title}</Text>
        {subtitle && <Text className="text-[#6B7280] text-xs mt-0.5">{subtitle}</Text>}
      </View>
      {type === 'toggle' && (
        <Switch
          value={value as boolean}
          onValueChange={onValueChange}
          trackColor={{ false: '#374151', true: '#00D4AA' }}
          thumbColor="#ffffff"
        />
      )}
      {type === 'select' && (
        <Text className="text-[#9CA3AF] text-sm mr-2">{value as string}</Text>
      )}
      {(type === 'select' || type === 'arrow') && (
        <Text className="text-[#4B5563]">›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [geoFence, setGeoFence] = useState(true);
  const [radius, setRadius] = useState('5 km');
  const [language, setLanguage] = useState('English');

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]">
      <View className="px-4 pt-4 pb-4">
        <Text className="text-white text-2xl font-bold">Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View className="mx-4 mb-4 bg-[#111827] rounded-3xl p-4 border border-[#1F2937] flex-row items-center">
          <View className="w-14 h-14 rounded-2xl bg-[#00D4AA] items-center justify-center mr-4">
            <Text style={{ fontSize: 28 }}>👤</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-base">Citizen User</Text>
            <Text className="text-[#9CA3AF] text-sm">+91 98765 43210</Text>
          </View>
          <TouchableOpacity className="bg-[#1A2035] rounded-xl px-3 py-2 border border-[#1F2937]">
            <Text className="text-[#00D4AA] text-xs font-bold">Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Location Section */}
        <Text className="text-[#6B7280] text-xs font-bold uppercase tracking-wider px-4 mb-2 mt-2">Location</Text>
        <View className="mx-4 bg-[#111827] rounded-3xl border border-[#1F2937] overflow-hidden mb-4">
          <SettingRow
            icon="📡"
            title="Geo-Fence Alerts"
            subtitle="Get alerted when near project zones"
            type="toggle"
            value={geoFence}
            onValueChange={setGeoFence}
          />
          <SettingRow
            icon="📏"
            title="Detection Radius"
            subtitle="Projects within this range are shown"
            type="select"
            value={radius}
            onPress={() => {
              const options = ['1 km', '5 km', '10 km'];
              const next = options[(options.indexOf(radius) + 1) % options.length];
              setRadius(next);
            }}
          />
        </View>

        {/* Notifications */}
        <Text className="text-[#6B7280] text-xs font-bold uppercase tracking-wider px-4 mb-2">Notifications</Text>
        <View className="mx-4 bg-[#111827] rounded-3xl border border-[#1F2937] overflow-hidden mb-4">
          <SettingRow
            icon="🔔"
            title="Push Notifications"
            subtitle="Receive project alerts"
            type="toggle"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingRow
            icon="📊"
            title="Status Updates"
            subtitle="When project milestones change"
            type="toggle"
            value={true}
            onValueChange={() => {}}
          />
        </View>

        {/* Appearance */}
        <Text className="text-[#6B7280] text-xs font-bold uppercase tracking-wider px-4 mb-2">Appearance</Text>
        <View className="mx-4 bg-[#111827] rounded-3xl border border-[#1F2937] overflow-hidden mb-4">
          <SettingRow
            icon="🌙"
            title="Dark Mode"
            type="toggle"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingRow
            icon="🌐"
            title="Language"
            type="select"
            value={language}
            onPress={() => {
              const opts = ['English', 'Hindi', 'Kannada', 'Tamil'];
              setLanguage(opts[(opts.indexOf(language) + 1) % opts.length]);
            }}
          />
        </View>

        {/* About */}
        <Text className="text-[#6B7280] text-xs font-bold uppercase tracking-wider px-4 mb-2">About</Text>
        <View className="mx-4 bg-[#111827] rounded-3xl border border-[#1F2937] overflow-hidden mb-4">
          <SettingRow icon="📄" title="Privacy Policy" type="arrow" />
          <SettingRow icon="📋" title="Terms of Service" type="arrow" />
          <SettingRow icon="ℹ️" title="App Version" subtitle="v1.0.0 (Build 1)" type="select" value="" />
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="mx-4 mb-8 bg-[#EF444415] rounded-3xl py-4 items-center border border-[#EF4444]/30"
          onPress={() => router.replace('/auth')}
          activeOpacity={0.85}
        >
          <Text className="text-[#EF4444] font-bold text-base">🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
