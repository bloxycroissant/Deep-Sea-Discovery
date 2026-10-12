import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_COUNT = 30;
const MIN_RADIUS = 6;
const MAX_RADIUS = 24;
const MIN_SPEED = 6000;
const MAX_SPEED = 14000;

const getRandomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
const getRandomX = () => Math.random() * SCREEN_WIDTH;

const BUBBLE_POP_DATA_URI =
  'data:audio/wav;base64,UklGRmAGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFb3WFiYmKjIuMi4uLioqKi4uLioqLioqKiYqJioqJiomKioqJioqJioqJioqJioqJiomJi4mJ';

function playPopSound() {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.08);
        return;
      }

      const audio = new window.Audio(BUBBLE_POP_DATA_URI);
      audio.play().catch(() => {});
    }
  } catch (error) {}
}

const Bubble = React.memo(({ id, onPop }: { id: number; onPop: (id: number) => void }) => {
  const config = useMemo(
    () => ({
      radius: getRandomInRange(MIN_RADIUS, MAX_RADIUS),
      initialX: getRandomX(),
      duration: getRandomInRange(MIN_SPEED, MAX_SPEED),
      initialProgress: Math.random(),
      driftRange: getRandomInRange(15, 35),
      driftSpeed: getRandomInRange(3000, 6000),
    }),
    []
  );

  const progress = useSharedValue(config.initialProgress);
  const popScale = useSharedValue(1);
  const isPopping = useSharedValue(false);

  const startFloatingAnimation = useCallback(() => {
    popScale.value = 1;
    isPopping.value = false;

    const remainingTime = (1 - progress.value) * config.duration;
    progress.value = withTiming(
      1,
      { duration: remainingTime, easing: Easing.linear },
      (finished) => {
        if (finished) {
          progress.value = 0;
          progress.value = withRepeat(
            withTiming(1, { duration: config.duration, easing: Easing.linear }),
            -1,
            false
          );
        }
      }
    );
  }, [config.duration]);

  const handleFinishPop = useCallback(() => {
    progress.value = 0;
    popScale.value = 1;
    isPopping.value = false;
    progress.value = withRepeat(
      withTiming(1, { duration: config.duration, easing: Easing.linear }),
      -1,
      false
    );
    if (onPop) onPop(id);
  }, [id, config.duration, onPop]);

  useEffect(() => {
    startFloatingAnimation();
  }, []);

  const handlePress = () => {
    if (isPopping.value) return;
    isPopping.value = true;

    playPopSound();

    popScale.value = withSequence(
      withTiming(1.6, { duration: 80, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 60, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(handleFinishPop)();
        }
      })
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [SCREEN_HEIGHT + 30, -80],
      Extrapolation.CLAMP
    );

    const translateX =
      Math.sin(progress.value * Math.PI * 2 * (config.driftSpeed / 1000)) *
      config.driftRange;

    return {
      transform: [{ translateY }, { translateX }],
    };
  });

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.bubbleContainer, { left: config.initialX }, animatedStyle]}
      pointerEvents="auto"
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Animated.View style={popStyle}>
          <Svg height={config.radius * 2} width={config.radius * 2}>
            <Circle
              cx={config.radius}
              cy={config.radius}
              r={config.radius}
              fill="#E0F7FA"
              fillOpacity={0.45}
            />
            <Circle
              cx={config.radius * 0.7}
              cy={config.radius * 0.7}
              r={config.radius * 0.3}
              fill="#FFFFFF"
              fillOpacity={0.75}
            />
          </Svg>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const badgePulse = useSharedValue(1);
  const formOpacity = useSharedValue(0);
  const formSlide = useSharedValue(30);
  const checkScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    formOpacity.value = withTiming(1, { duration: 800 });
    formSlide.value = withSpring(0, { damping: 15 });
  }, []);

  const navigateToHome = useCallback(() => {
    router.push('./explore');
  }, [router]);

  const handleStartLearning = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in all fields (Full Name, Email, and Password) before proceeding.');
      return;
    }

    buttonScale.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withTiming(1, { duration: 100 }, (finished) => {
        if (finished) {
          runOnJS(navigateToHome)();
        }
      })
    );
  };

  const handleCheckboxToggle = () => {
    setAgreed(!agreed);
    checkScale.value = withSequence(
      withSpring(1.3, { damping: 6 }),
      withSpring(1, { damping: 8 })
    );
  };

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formSlide.value }],
  }));

  const checkboxAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleBubblePop = (id: number) => {};

  const bubbleComponents = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }).map((_, index) => (
      <Bubble key={index} id={index} onPop={handleBubblePop} />
    ));
  }, []);

  return (
    <LinearGradient colors={['#071321', '#112238', '#1A365D']} style={styles.container}>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        {bubbleComponents}
      </View>

      <View style={styles.foregroundLayer} pointerEvents="box-none">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.badgeContainer, badgeStyle]}>
            <LinearGradient colors={['#0F2942', '#081726']} style={styles.badgeCircle}>
              <Image
                source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')}
                style={styles.subLogo}
                resizeMode="contain"
              />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>
            Deep Sea <Text style={styles.titleHighlight}>Discovery</Text>
          </Text>
          <Text style={styles.subtitle}>
            Join the expedition{'\n'}Create your free learner account
          </Text>

          <Animated.View style={[styles.formContainer, formStyle]}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              style={[styles.input, focusedField === 'name' && styles.inputFocused]}
              placeholder="Your full name"
              placeholderTextColor="#7A8B9E"
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              placeholder="you@email.com"
              placeholderTextColor="#7A8B9E"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={[styles.input, focusedField === 'pass' && styles.inputFocused]}
              placeholder="Min. 8 characters"
              placeholderTextColor="#7A8B9E"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={handleCheckboxToggle}
            >
              <Animated.View
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxChecked,
                  checkboxAnimStyle,
                ]}
              >
                {agreed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </Animated.View>
              <Text style={styles.termsText}>
                By signing up, you agree to our{' '}
                <Text style={styles.linkText}>Terms</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleStartLearning}
            >
              <Animated.View style={[styles.submitButton, buttonAnimStyle]}>
                <Text style={styles.submitButtonText}>Start Learning Free</Text>
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('./login')}>
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubbleLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 1,
  },
  bubbleContainer: {
    position: 'absolute',
    top: 0,
  },
  foregroundLayer: {
    flex: 1,
    zIndex: 10,
    elevation: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: 'center',
  },
  badgeContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 3,
    backgroundColor: '#00F0FF',
    marginBottom: 16,
  },
  badgeCircle: {
    flex: 1,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  subLogo: { width: '100%', height: '100%' },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleHighlight: {
    color: '#00B4D8',
  },
  subtitle: {
    fontSize: 13,
    color: '#B0C4DE',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    lineHeight: 18,
  },
  formContainer: { width: '100%' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A99AD',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#1C3554',
    borderWidth: 1,
    borderColor: '#2A4A72',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 18,
  },
  inputFocused: {
    borderColor: '#00B4D8',
    backgroundColor: '#1E3A5F',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#5B7898',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#00B4D8',
    borderColor: '#00B4D8',
  },
  termsText: { fontSize: 12, color: '#8A99AD', flex: 1 },
  linkText: { color: '#00B4D8', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#14253B',
    borderWidth: 1,
    borderColor: '#2E496B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  footerText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  footerLink: { fontSize: 15, fontWeight: '700', color: '#00B4D8' },
});