import React, { useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
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

const BUBBLE_POP_DATA_URI = 'data:audio/wav;base64,UklGRmAGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFb3WFiYmKjIuMi4uLioqKi4uLioqLioqKiYqJioqJiomKioqJioqJioqJioqJioqJiomJi4mJ';

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
  } catch (error) {
  }
}

const Bubble = React.memo(({ id, onPop }: { id: number, onPop: (id: number) => void }) => {
  const config = useMemo(() => ({
    radius: getRandomInRange(MIN_RADIUS, MAX_RADIUS),
    initialX: getRandomX(),
    duration: getRandomInRange(MIN_SPEED, MAX_SPEED),
    initialProgress: Math.random(),
    driftRange: getRandomInRange(15, 35),
    driftSpeed: getRandomInRange(3000, 6000),
  }), []);

  const progress = useSharedValue(config.initialProgress);
  const popScale = useSharedValue(1);
  const isPopping = useSharedValue(false);

  const startFloatingAnimation = useCallback(() => {
    popScale.value = 1;
    isPopping.value = false;
    
    const remainingTime = (1 - progress.value) * config.duration;
    progress.value = withTiming(1, { duration: remainingTime, easing: Easing.linear }, (finished) => {
      if (finished) {
        progress.value = 0;
        progress.value = withRepeat(
          withTiming(1, { duration: config.duration, easing: Easing.linear }),
          -1,
          false
        );
      }
    });
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

export default function WelcomeScreen() {
  const router = useRouter();

  // Animated Shared Values
  const octopusTranslateY = useSharedValue(0);
  const octopusRotate = useSharedValue(0);
  const sharkTranslateX = useSharedValue(0);
  const sharkRotate = useSharedValue(0);
  
  const logoBadgeScale = useSharedValue(0.8);
  const logoGlowPulse = useSharedValue(1);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);

  const statsOpacity = useSharedValue(0);
  const statsScale = useSharedValue(0.9);

  const cardsTranslateY = useSharedValue(40);
  const cardsOpacity = useSharedValue(0);

  const primaryBtnScale = useSharedValue(1);
  const secondaryBtnScale = useSharedValue(1);

  useEffect(() => {
    // Floating animations for aquatic icons
    octopusTranslateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    octopusRotate.value = withRepeat(
      withSequence(
        withTiming(-0.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.08, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    sharkTranslateX.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-8, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    sharkRotate.value = withRepeat(
      withSequence(
        withTiming(0.05, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-0.05, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Continuous logo glowing pulse
    logoGlowPulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Entrance animations sequence
    logoBadgeScale.value = withSpring(1, { damping: 10 });
    
    titleOpacity.value = withTiming(1, { duration: 800 });
    titleTranslateY.value = withSpring(0, { damping: 12 });

    statsOpacity.value = withDelay(250, withTiming(1, { duration: 800 }));
    statsScale.value = withDelay(250, withSpring(1, { damping: 12 }));

    cardsTranslateY.value = withDelay(450, withSpring(0, { damping: 14 }));
    cardsOpacity.value = withDelay(450, withTiming(1, { duration: 800 }));
  }, []);

  // Animated Styles
  const octopusStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: octopusTranslateY.value }, { rotate: `${octopusRotate.value}rad` }],
  }));

  const sharkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sharkTranslateX.value }, { rotate: `${sharkRotate.value}rad` }],
  }));

  const logoBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoBadgeScale.value * logoGlowPulse.value }],
  }));

  const contentEntryStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const statsEntryStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ scale: statsScale.value }],
  }));

  const cardsEntryStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
    transform: [{ translateY: cardsTranslateY.value }],
  }));

  const primaryBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: primaryBtnScale.value }],
  }));

  const secondaryBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: secondaryBtnScale.value }],
  }));

  const handleBubblePop = (id: number) => {};

  const bubbleComponents = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }).map((_, index) => (
      <Bubble key={index} id={index} onPop={handleBubblePop} />
    ));
  }, []);

  const handlePressSignup = () => {
    primaryBtnScale.value = withSequence(
      withTiming(0.92, { duration: 90 }),
      withTiming(1, { duration: 90 }, (finished) => {
        if (finished) {
          runOnJS(router.push)('./signup');
        }
      })
    );
  };

  const handlePressLogin = () => {
    secondaryBtnScale.value = withSequence(
      withTiming(0.92, { duration: 90 }),
      withTiming(1, { duration: 90 }, (finished) => {
        if (finished) {
          runOnJS(router.push)('./login');
        }
      })
    );
  };

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
          <View style={styles.heroRow}>
            <Animated.View style={octopusStyle}>
              <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/Octopus Icon.png')} style={styles.sideIcon} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.mainBadgeContainer, logoBadgeStyle]}>
              <LinearGradient colors={['#0F2942', '#081726']} style={styles.badgeCircle}>
                <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')} style={styles.subLogo} resizeMode="contain" />
              </LinearGradient>
            </Animated.View>

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

          <View style={styles.buttonContainer}>
            <TouchableOpacity activeOpacity={0.85} onPress={handlePressSignup}>
              <Animated.View style={[styles.primaryButton, primaryBtnStyle]}>
                <Text style={styles.primaryButtonText}>Getting Started</Text>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={handlePressLogin}>
              <Animated.View style={[styles.secondaryButton, secondaryBtnStyle]}>
                <Text style={styles.secondaryButtonText}>I already have an account</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 40, 
    alignItems: 'center',
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
  statCard: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.25)', 
    borderRadius: 16, 
    paddingVertical: 14, 
    alignItems: 'center', 
    marginHorizontal: 5, 
    backgroundColor: '#0F2136' 
  },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cardsWrapper: { width: '100%' },
  featureCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.25)', 
    backgroundColor: '#112238', 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 14 
  },
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