import React, { useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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

const BUBBLE_POP_DATA_URI =
  'data:audio/wav;base64,UklGRmAGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFb3WFiYmKjIuMi4uLioqKi4uLioqLioqKiYqJioqJiomKioqJioqJioqJioqJioqJiomJi4mJ';

function playPopSound() {
  try {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
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
        if (finished) runOnJS(handleFinishPop)();
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

    return { transform: [{ translateY }, { translateX }] };
  });

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popScale.value }],
  }));

  return (
    <Animated.View
      style={[styles.bubbleContainer, { left: config.initialX }, animatedStyle]}
      pointerEvents="auto"
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <Animated.View style={popStyle}>
          <Svg height={config.radius * 2} width={config.radius * 2}>
            <Circle cx={config.radius} cy={config.radius} r={config.radius} fill="#E0F7FA" fillOpacity={0.45} />
            <Circle cx={config.radius * 0.7} cy={config.radius * 0.7} r={config.radius * 0.3} fill="#FFFFFF" fillOpacity={0.75} />
          </Svg>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function CrewsScreen() {
  const router = useRouter();
  const sonarScale = useSharedValue(1);
  const sonarOpacity = useSharedValue(0.6);

  const contentFade = useSharedValue(0);
  const contentSlide = useSharedValue(20);

  useEffect(() => {
    contentFade.value = withTiming(1, { duration: 400 });
    contentSlide.value = withSpring(0, { damping: 14 });

    sonarScale.value = withRepeat(
      withTiming(1.6, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    sonarOpacity.value = withRepeat(
      withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const pageAnimStyle = useAnimatedStyle(() => ({
    opacity: contentFade.value,
    transform: [{ translateY: contentSlide.value }],
  }));

  const sonarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sonarScale.value }],
    opacity: sonarOpacity.value,
  }));

  const bubbleComponents = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }).map((_, index) => (
      <Bubble key={index} id={index} onPop={() => {}} />
    ));
  }, []);

  return (
    <LinearGradient colors={['#071321', '#102035', '#162C4A']} style={styles.container}>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        {bubbleComponents}
      </View>

      <View style={styles.foregroundLayer} pointerEvents="box-none">
        {/* Top Navbar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./explore')}>
            <Ionicons name="home-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./discover')}>
            <Feather name="search" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Discover</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./crews')}>
            <MaterialCommunityIcons name="sail-boat" size={24} color="#00B4D8" />
            <Text style={[styles.navText, styles.activeNavText]}>Crews</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./signals')}>
            <Ionicons name="chatbox-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Signals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./profile')}>
            <Ionicons name="person-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[{ flex: 1 }, pageAnimStyle]} pointerEvents="box-none">
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} pointerEvents="box-none">
            <Text style={styles.headerTag}>GO FARTHER TOGETHER</Text>
            <Text style={styles.pageTitle}>Expedition crews</Text>
            <Text style={styles.pageSubtitle}>Join live missions and follow teams exploring the planet's last frontier</Text>

            <View style={styles.sonarBanner}>
              <View style={styles.sonarCircleWrapper}>
                <Animated.View style={[styles.sonarPulse, sonarAnimStyle]} />
                <View style={styles.sonarCore}>
                  <Ionicons name="radio" size={20} color="#00F0FF" />
                </View>
              </View>
              <View style={styles.sonarTextGroup}>
                <Text style={styles.sonarHeader}>LIVE SONAR</Text>
                <Text style={styles.sonarTitle}>3 vessels are driving now</Text>
                <Text style={styles.sonarSub}>Tap into the mission control feed</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Open crews</Text>
              <TouchableOpacity><Text style={styles.sortText}>See map</Text></TouchableOpacity>
            </View>

            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.crewCard}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop' }} style={styles.crewThumb} />
                <View style={styles.crewDetails}>
                  <Text style={styles.crewDays}>IN 3 DAYS</Text>
                  <Text style={styles.crewMainTitle}>Blue Frontier</Text>
                  <Text style={styles.crewLocation}>📍 Coral Sea</Text>
                  <Text style={styles.crewMembers}>545 crew members</Text>
                </View>
                <TouchableOpacity style={styles.joinBtn} activeOpacity={0.8}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubbleLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1, elevation: 1 },
  bubbleContainer: { position: 'absolute', top: 0 },
  foregroundLayer: { flex: 1, zIndex: 10, elevation: 10 },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 45,
    paddingBottom: 12,
    backgroundColor: '#071321',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 11, color: '#8A99AD', marginTop: 4, fontWeight: '600' },
  activeNavText: { color: '#00B4D8' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  headerTag: { fontSize: 11, fontWeight: '800', color: '#00B4D8', letterSpacing: 1 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  pageSubtitle: { fontSize: 12, color: '#8A99AD', marginTop: 4, marginBottom: 16 },
  sonarBanner: { backgroundColor: '#102236', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  sonarCircleWrapper: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative' },
  sonarPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0, 240, 255, 0.25)' },
  sonarCore: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#081726', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00F0FF' },
  sonarTextGroup: { flex: 1 },
  sonarHeader: { fontSize: 10, fontWeight: '800', color: '#00B4D8', letterSpacing: 0.8 },
  sonarTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  sonarSub: { fontSize: 11, color: '#8A99AD', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sortText: { fontSize: 12, color: '#8A99AD' },
  crewCard: { backgroundColor: '#102236', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  crewThumb: { width: 65, height: 65, borderRadius: 8, marginRight: 12 },
  crewDetails: { flex: 1 },
  crewDays: { fontSize: 9, fontWeight: '800', color: '#00B4D8', letterSpacing: 0.5 },
  crewMainTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  crewLocation: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
  crewMembers: { fontSize: 10, color: '#64748B', marginTop: 2 },
  joinBtn: { backgroundColor: 'rgba(0,180,216,0.15)', borderWidth: 1, borderColor: '#00B4D8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  joinBtnText: { color: '#00F0FF', fontSize: 12, fontWeight: '700' },
});