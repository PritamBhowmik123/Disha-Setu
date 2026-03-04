import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleSendOTP = () => {
    if (phone.length === 10) {
      setMode('otp');
    }
  };

  const handleVerify = () => {
    router.replace('/(tabs)/home');
  };

  const handleGuest = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Header */}
            <View className="items-center mb-12">
              <View className="w-16 h-16 rounded-2xl bg-[#00D4AA] items-center justify-center mb-6"
                style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 }}>
                <Text style={{ fontSize: 28 }}>📍</Text>
              </View>
              <Text className="text-white text-2xl font-bold mb-2">
                {mode === 'phone' ? 'Welcome to GeoFence' : 'Verify Your Number'}
              </Text>
              <Text className="text-[#9CA3AF] text-sm text-center leading-5">
                {mode === 'phone'
                  ? 'Sign in to track civic projects near you'
                  : `We sent a 6-digit OTP to +91 ${phone}`}
              </Text>
            </View>

            {mode === 'phone' ? (
              <>
                {/* Phone input */}
                <View className="mb-6">
                  <Text className="text-[#9CA3AF] text-sm font-medium mb-2 ml-1">Mobile Number</Text>
                  <View className="flex-row items-center bg-[#111827] rounded-2xl border border-[#1F2937] overflow-hidden">
                    <View className="px-4 py-4 border-r border-[#1F2937]">
                      <Text className="text-[#9CA3AF] font-semibold text-base">🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      className="flex-1 text-white text-base px-4 py-4"
                      placeholder="Enter 10-digit number"
                      placeholderTextColor="#4B5563"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  className="w-full rounded-2xl py-4 items-center mb-4"
                  style={{
                    backgroundColor: phone.length === 10 ? '#00D4AA' : '#1F2937',
                    shadowColor: phone.length === 10 ? '#00D4AA' : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: phone.length === 10 ? 8 : 0,
                  }}
                  onPress={handleSendOTP}
                  disabled={phone.length !== 10}
                  activeOpacity={0.85}
                >
                  <Text className={`font-bold text-lg ${phone.length === 10 ? 'text-black' : 'text-[#4B5563]'}`}>
                    Send OTP
                  </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center mb-4">
                  <View className="flex-1 h-px bg-[#1F2937]" />
                  <Text className="text-[#4B5563] mx-4 text-sm">or</Text>
                  <View className="flex-1 h-px bg-[#1F2937]" />
                </View>

                {/* Google */}
                <TouchableOpacity
                  className="w-full flex-row items-center justify-center bg-[#111827] rounded-2xl py-4 mb-6 border border-[#1F2937]"
                  onPress={handleGuest}
                  activeOpacity={0.85}
                >
                  <Text style={{ fontSize: 20 }} className="mr-3">🔴</Text>
                  <Text className="text-white font-semibold text-base">Continue with Google</Text>
                </TouchableOpacity>

                {/* Guest */}
                <TouchableOpacity onPress={handleGuest} activeOpacity={0.7} className="items-center">
                  <Text className="text-[#6B7280] text-sm">
                    Continue as <Text className="text-[#00D4AA] font-semibold">Guest</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* OTP boxes */}
                <View className="flex-row justify-between mb-8">
                  {otp.map((digit, i) => (
                    <View
                      key={i}
                      className="w-12 h-14 rounded-xl bg-[#111827] border items-center justify-center"
                      style={{ borderColor: digit ? '#00D4AA' : '#1F2937' }}
                    >
                      <Text className="text-white text-2xl font-bold">{digit || '–'}</Text>
                    </View>
                  ))}
                </View>

                {/* Keypad */}
                {[['1','2','3'],['4','5','6'],['7','8','9'],['←','0','✓']].map((row, ri) => (
                  <View key={ri} className="flex-row justify-between mb-3">
                    {row.map((key) => (
                      <TouchableOpacity
                        key={key}
                        className="flex-1 mx-1 h-14 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: key === '✓' ? '#00D4AA' : '#111827' }}
                        activeOpacity={0.7}
                        onPress={() => {
                          const newOtp = [...otp];
                          if (key === '←') {
                            const lastFilled = newOtp.map((d, i) => d ? i : -1).filter(i => i >= 0).pop();
                            if (lastFilled !== undefined) { newOtp[lastFilled] = ''; setOtp(newOtp); }
                          } else if (key === '✓') {
                            if (otp.every(d => d)) handleVerify();
                          } else {
                            const firstEmpty = newOtp.findIndex(d => !d);
                            if (firstEmpty !== -1) { newOtp[firstEmpty] = key; setOtp(newOtp); }
                          }
                        }}
                      >
                        <Text className={`text-xl font-bold ${key === '✓' ? 'text-black' : 'text-white'}`}>{key}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                <TouchableOpacity className="items-center mt-4" onPress={() => setMode('phone')} activeOpacity={0.7}>
                  <Text className="text-[#6B7280] text-sm">← Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
