import React, { useEffect, useMemo } from 'react';
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

const BUBBLE_COUNT = 50;
const MIN_RADIUS = 4;
const MAX_RADIUS = 14;
const MIN_SPEED = 8000;
const MAX_SPEED = 15000;

const getRandomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
const getRandomX = () => Math.random() * SCREEN_WIDTH;

const Bubble = React.memo(({ id, onPop }: { id: number, onPop: (id: number) => void }) => {
  const config = useMemo(() => ({
    radius: getRandomInRange(MIN_RADIUS, MAX_RADIUS),
    initialX: getRandomX(),
    duration: getRandomInRange(MIN_SPEED, MAX_SPEED),
    delay: Math.random() * 5000,
    driftRange: getRandomInRange(10, 30),
    driftSpeed: getRandomInRange(3000, 6000),
  }), []);

  const progress = useSharedValue(0);
  const popScale = useSharedValue(1);
  const popOpacity = useSharedValue(0.6);

  const restartAnimation = (initial = false) => {
    'worklet';
    progress.value = 0;
    progress.value = withDelay(
      initial ? config.delay : 0,
      withRepeat(
        withTiming(1, { duration: config.duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  };

  useEffect(() => {
    restartAnimation(true);
  }, []);

  const handlePress = () => {
    popScale.value = withSequence(
      withTiming(1.8, { duration: 100, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 50, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(restartAnimation)(false);
          if (onPop) runOnJS(onPop)(id);
        }
      })
    );
    
    popOpacity.value = withSequence(
        withTiming(0.8, { duration: 50 }),
        withTiming(0, { duration: 100 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [0, -SCREEN_HEIGHT - 150],
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
        [0, 0.1, 0.9, 1], 
        [0, popOpacity.value, popOpacity.value, 0]
    )
  }));

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        { left: config.initialX },
        animatedStyle
      ]}
      pointerEvents="box-only"
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
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
                fillOpacity={0.6}
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
  const subRotate = useSharedValue(0);
  const subPulse = useSharedValue(1);
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
    subPulse.value = withRepeat(withSequence(withTiming(1.05, { duration: 1200, easing: Easing.ease }), withTiming(1, { duration: 1200, easing: Easing.ease })), -1, true);
    subRotate.value = withRepeat(withTiming(Math.PI * 2, { duration: 20000, easing: Easing.linear }), -1, false);

    titleOpacity.value = withTiming(1, { duration: 800 });
    statsOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    cardsTranslateY.value = withDelay(500, withSpring(0, { damping: 12 }));
    cardsOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    buttonsScale.value = withDelay(700, withSpring(1, { damping: 10 }));
  }, []);

  const octopusStyle = useAnimatedStyle(() => ({ transform: [{ translateY: octopusTranslateY.value }, { rotate: `${octopusRotate.value}rad` }] }));
  const sharkStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sharkTranslateX.value }, { rotate: `${sharkRotate.value}rad` }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: subPulse.value }] }));
  const subLogoRotateStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${subRotate.value}rad` }] }));
  const contentEntryStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const statsEntryStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }));
  const cardsEntryStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value, transform: [{ translateY: cardsTranslateY.value }] }));
  const buttonsEntryStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonsScale.value }], opacity: cardsOpacity.value }));

  const handleBubblePop = (id: number) => {
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroRow}>
          <Animated.View style={octopusStyle}>
            <Image source={require('../../assets/Deep-Sea-Discovery (Assets)/Octopus Icon.png')} style={styles.sideIcon} resizeMode="contain" />
          </Animated.View>

          <Animated.View style={[styles.mainBadgeContainer, badgeStyle]}>
            <LinearGradient colors={['#0F2942', '#081726']} style={styles.badgeCircle}>
              <Animated.Image source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')} style={[styles.subLogo, subLogoRotateStyle]} resizeMode="contain" />
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
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    overflow: 'hidden',
  },
  bubbleContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT + 50,
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 40, 
    alignItems: 'center',
    zIndex: 2,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sideIcon: { width: 65, height: 65, marginHorizontal: 10 },
  mainBadgeContainer: { width: 120, height: 120, borderRadius: 60, padding: 3, backgroundColor: '#00F0FF' },
  badgeCircle: { flex: 1, borderRadius: 60, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  subLogo: { width: '80%', height: '80%' },
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