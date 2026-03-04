import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotAnimation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dotLoop.start();
    });


    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const dot1Opacity = dotAnimation.interpolate({ inputRange: [0, 0.33, 1], outputRange: [0.3, 1, 0.3] });
  const dot2Opacity = dotAnimation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });
  const dot3Opacity = dotAnimation.interpolate({ inputRange: [0, 0.67, 1], outputRange: [0.3, 1, 0.3] });

  return (
    <SafeAreaView className="flex-1 bg-[#0A0E1A] items-center justify-center">
      <View className="items-center justify-center flex-1 w-full px-8">
        {/* Glow bg */}
        <Animated.View
          style={{ opacity: glowOpacity }}
          className="absolute w-64 h-64 rounded-full bg-[#00D4AA] opacity-10 blur-3xl"
        />

        {/* Logo */}
        <Animated.View
          style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}
          className="items-center mb-8"
        >
          <View className="w-24 h-24 rounded-3xl bg-[#00D4AA] items-center justify-center mb-5 shadow-lg"
            style={{ shadowColor: '#00D4AA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 20 }}>
            <Text style={{ fontSize: 44 }}>📍</Text>
          </View>
          <Text className="text-white text-4xl font-bold tracking-tight">
            Geo<Text className="text-[#00D4AA]">Fence</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: taglineOpacity }} className="items-center mb-16">
          <Text className="text-[#9CA3AF] text-base text-center leading-6 font-medium">
            Know What's Being Built{'\n'}Around You
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <View className="flex-row gap-2 absolute bottom-16">
          {[dot1Opacity, dot2Opacity, dot3Opacity].map((opacity, i) => (
            <Animated.View
              key={i}
              style={{ opacity }}
              className="w-2 h-2 rounded-full bg-[#00D4AA]"
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
