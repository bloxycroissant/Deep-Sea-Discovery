import React, { useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
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

export default function SignalsScreen() {
  const router = useRouter();
  const contentFade = useSharedValue(0);
  const contentSlide = useSharedValue(20);

  useEffect(() => {
    contentFade.value = withTiming(1, { duration: 400 });
    contentSlide.value = withSpring(0, { damping: 14 });
  }, []);

  const pageAnimStyle = useAnimatedStyle(() => ({
    opacity: contentFade.value,
    transform: [{ translateY: contentSlide.value }],
  }));

  const signals = [
    { id: '1', initials: 'CF', name: 'Cedric Wayne', members: '545 crew members', time: '2m', online: true, color: '#1B4965' },
    { id: '2', initials: 'AP', name: 'Amira Phan', members: '545 crew members', time: '18m', online: true, color: '#2B580C' },
    { id: '3', initials: 'AL', name: 'Aaron Layman', members: '545 crew members', time: '1h', online: false, color: '#5C3C92' },
    { id: '4', initials: 'LT', name: 'Leo Tan', members: '545 crew members', time: '3h', online: false, color: '#1B4965' },
  ];

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
            <MaterialCommunityIcons name="sail-boat" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Crews</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./signals')}>
            <Ionicons name="chatbox" size={24} color="#00B4D8" />
            <Text style={[styles.navText, styles.activeNavText]}>Signals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./profile')}>
            <Ionicons name="person-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[{ flex: 1 }, pageAnimStyle]} pointerEvents="box-none">
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} pointerEvents="box-none">
            <View style={styles.signalsHeaderRow}>
              <View>
                <Text style={styles.headerTag}>Private channels</Text>
                <Text style={styles.pageTitle}>Signals</Text>
              </View>
              <TouchableOpacity style={styles.addSignalBtn} activeOpacity={0.8}>
                <Ionicons name="add" size={24} color="#00F0FF" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="#7A8B9E" style={{ marginRight: 10 }} />
              <TextInput placeholder="Search signals or researchers..." placeholderTextColor="#7A8B9E" style={styles.searchInput} />
            </View>

            {signals.map((sig) => (
              <TouchableOpacity key={sig.id} style={styles.signalRow} activeOpacity={0.8}>
                <View style={[styles.signalAvatar, { backgroundColor: sig.color }]}>
                  <Text style={styles.signalInitials}>{sig.initials}</Text>
                  {sig.online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.signalInfo}>
                  <Text style={styles.signalName}>{sig.name}</Text>
                  <Text style={styles.signalMembers}>{sig.members}</Text>
                </View>
                <Text style={styles.signalTime}>{sig.time}</Text>
              </TouchableOpacity>
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
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102236', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16, marginTop: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  signalsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addSignalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#102236', borderWidth: 1, borderColor: '#00B4D8', justifyContent: 'center', alignItems: 'center' },
  signalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#102236', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  signalAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, position: 'relative' },
  signalInitials: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E676', borderWidth: 2, borderColor: '#071321' },
  signalInfo: { flex: 1 },
  signalName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  signalMembers: { fontSize: 11, color: '#8A99AD', marginTop: 2 },
  signalTime: { fontSize: 11, color: '#64748B' },
});