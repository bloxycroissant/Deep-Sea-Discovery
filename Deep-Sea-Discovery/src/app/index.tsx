import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_COUNT = 30;
const MIN_RADIUS = 12;
const MAX_RADIUS = 22;
const MIN_SPEED = 7000;
const MAX_SPEED = 14000;

const getRandomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
const getRandomX = () => Math.random() * (SCREEN_WIDTH - 40);

// Base64 Audio URI - Plays natively without requiring any missing native modules
const BUBBLE_POP_DATA_URI = 'data:audio/wav;base64,UklGRmAGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFb3WFiYmKjIuMi4uLioqKi4uLioqLioqKiYqJioqJiomKioqJioqJioqJioqJioqJiomJi4mJ';

// Synthesized / URI Pop sound player (100% fail-safe)
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

      // Web HTML5 Audio Fallback
      const audio = new window.Audio(BUBBLE_POP_DATA_URI);
      audio.play().catch(() => {});
    }
  } catch (error) {
    // Fail-safe protection
  }
}

const Bubble = React.memo(({ id, onPop }: { id: number, onPop: (id: number) => void }) => {
  const config = useMemo(() => ({
    radius: getRandomInRange(MIN_RADIUS, MAX_RADIUS),
    initialX: getRandomX(),
    duration: getRandomInRange(MIN_SPEED, MAX_SPEED),
    delay: Math.random() * 4000,
    driftRange: getRandomInRange(15, 35),
    driftSpeed: getRandomInRange(3000, 6000),
  }), []);

  const progress = useSharedValue(0);
  const popScale = useSharedValue(1);
  const isPopping = useSharedValue(false);

  const startFloatingAnimation = useCallback((initialDelay = 0) => {
    progress.value = 0;
    popScale.value = 1;
    isPopping.value = false;
    progress.value = withDelay(
      initialDelay,
      withRepeat(
        withTiming(1, { duration: config.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [config.duration]);

  const handleFinishPop = useCallback(() => {
    startFloatingAnimation(0);
    if (onPop) onPop(id);
  }, [id, onPop, startFloatingAnimation]);

  useEffect(() => {
    startFloatingAnimation(config.delay);
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
      [SCREEN_HEIGHT + 20, -100],
      Extrapolation.CLAMP
    );

    const translateX = Math.sin(progress.value * Math.PI * 2 * (config.driftSpeed / 1000)) * config.driftRange;

    return {
      transform: [
        { translateY },
        { translateX }
      ],
    };
  });

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
    opacity: interpolate(
      progress.value, 
      [0, 0.05, 0.9, 1], 
      [0, 0.6, 0.6, 0]
    )
  }));

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        { left: config.initialX },
        animatedStyle
      ]}
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
              fillOpacity={0.4}
            />
            <Circle
              cx={config.radius * 0.7}
              cy={config.radius * 0.7}
              r={config.radius * 0.3}
              fill="#FFFFFF"
              fillOpacity={0.7}
            />
          </Svg>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function WelcomeScreen() {
  const router = useRouter();

  const octopusTranslateY = useSharedValue(0);
  const octopusRotate = useSharedValue(0);
  const sharkTranslateX = useSharedValue(0);
  const sharkRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const cardsTranslateY = useSharedValue(40);
  const cardsOpacity = useSharedValue(0);
  const buttonsScale = useSharedValue(0.9);

  useEffect(() => {
    octopusTranslateY.value = withRepeat(withSequence(withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(8, { duration: 1800, easing: Easing.inOut(Easing.sin) })), -1, true);
    octopusRotate.value = withRepeat(withSequence(withTiming(-0.05, { duration: 1500, easing: Easing.inOut(Easing.sin) }), withTiming(0.05, { duration: 1500, easing: Easing.inOut(Easing.sin) })), -1, true);
    sharkTranslateX.value = withRepeat(withSequence(withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.quad) }), withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.quad) })), -1, true);
    sharkRotate.value = withRepeat(withSequence(withTiming(0.03, { duration: 2200, easing: Easing.inOut(Easing.quad) }), withTiming(-0.03, { duration: 2200, easing: Easing.inOut(Easing.quad) })), -1, true);

    titleOpacity.value = withTiming(1, { duration: 800 });
    statsOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    cardsTranslateY.value = withDelay(500, withSpring(0, { damping: 12 }));
    cardsOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    buttonsScale.value = withDelay(700, withSpring(1, { damping: 10 }));
  }, []);

  const octopusStyle = useAnimatedStyle(() => ({ transform: [{ translateY: octopusTranslateY.value }, { rotate: `${octopusRotate.value}rad` }] }));
  const sharkStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sharkTranslateX.value }, { rotate: `${sharkRotate.value}rad` }] }));
  const contentEntryStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const statsEntryStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }));
  const cardsEntryStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value, transform: [{ translateY: cardsTranslateY.value }] }));
  const buttonsEntryStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonsScale.value }], opacity: cardsOpacity.value }));

  const handleBubblePop = (id: number) => {};

  const bubbleComponents = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }).map((_, index) => (
      <Bubble key={index} id={index} onPop={handleBubblePop} />
    ));
  }, []);

  return (
    <LinearGradient colors={['#071321', '#112238', '#1A365D']} style={styles.container}>
      {/* Background Bubbles Layer (Strictly zIndex: 1 behind UI) */}
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        {bubbleComponents}
      </View>

      {/* Foreground Interactive Content Layer (Strictly zIndex: 10 in front) */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <Animated.View style={octopusStyle}>
            <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/Octopus Icon.png')} style={styles.sideIcon} resizeMode="contain" />
          </Animated.View>

          <View style={styles.mainBadgeContainer}>
            <LinearGradient colors={['#0F2942', '#081726']} style={styles.badgeCircle}>
              <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')} style={styles.subLogo} resizeMode="contain" />
            </LinearGradient>
          </View>

          <Animated.View style={sharkStyle}>
            <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/Shark Icon.png')} style={styles.sideIcon} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.centerBlock, contentEntryStyle]}>
          <Text style={styles.title}>
            Deep Sea <Text style={styles.titleHighlight}>Discovery</Text>
          </Text>
          <Text style={styles.subtitle}>Rocket your knowledge from Grade 1 to Grade 6</Text>
        </Animated.View>

        <Animated.View style={[styles.statsRow, statsEntryStyle]}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>1.5M +</Text>
            <Text style={styles.statLabel}>Explorers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>10K+</Text>
            <Text style={styles.statLabel}>Species</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Oceans</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardsWrapper, cardsEntryStyle]}>
          <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="sail-boat" size={28} color="#7CC5FF" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Live expedition crews</Text>
              <Text style={styles.featureDesc}>Follow researchers from surface to seafloor</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="waves" size={28} color="#7CC5FF" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Share field discoveries</Text>
              <Text style={styles.featureDesc}>Post sightings, depths, and ocean stories</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, buttonsEntryStyle]}>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={() => router.push('./signup')}>
            <Text style={styles.primaryButtonText}>Getting Started</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => router.push('./login')}>
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    zIndex: 1, // Guaranteed background placement
  },
  bubbleContainer: {
    position: 'absolute',
    top: 0,
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 40, 
    alignItems: 'center',
    zIndex: 10, // Content sits strictly above background bubbles
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sideIcon: { width: 65, height: 65, marginHorizontal: 10 },
  mainBadgeContainer: { width: 120, height: 120, borderRadius: 60, padding: 3, backgroundColor: '#00F0FF' },
  badgeCircle: { flex: 1, borderRadius: 60, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  subLogo: { width: '100%', height: '100%' },
  centerBlock: { alignItems: 'center', width: '100%' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  titleHighlight: { color: '#00B4D8' },
  subtitle: { fontSize: 13, color: '#A0AEC0', textAlign: 'center', marginTop: 4, marginBottom: 25, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 25 },
  statCard: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginHorizontal: 5, backgroundColor: 'rgba(255,255,255,0.03)' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardsWrapper: { width: '100%' },
  featureCard: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 14, padding: 14, marginBottom: 14 },
  featureIconContainer: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  featureTextContainer: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  featureDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  buttonContainer: { width: '100%', marginTop: 10 },
  primaryButton: { backgroundColor: '#13233A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#101D30', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});