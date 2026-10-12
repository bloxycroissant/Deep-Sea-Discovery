import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
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

export default function ProfileScreen() {
  const router = useRouter();
  const [profileTab, setProfileTab] = useState('Field logs');

  const contentScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  const performLogoutNavigation = useCallback(() => {
    router.replace('./login');
  }, [router]);

  const handleLogout = () => {
    contentScale.value = withTiming(0.85, { duration: 250, easing: Easing.out(Easing.ease) });
    contentOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(performLogoutNavigation)();
      }
    });
  };

  const logoutAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
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
            <MaterialCommunityIcons name="sail-boat" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Crews</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./signals')}>
            <Ionicons name="chatbox-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Signals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => router.push('./profile')}>
            <Ionicons name="person" size={24} color="#00B4D8" />
            <Text style={[styles.navText, styles.activeNavText]}>Profile</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[{ flex: 1 }, logoutAnimStyle]} pointerEvents="box-none">
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} pointerEvents="box-none">
            <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1000&auto=format&fit=crop' }} style={styles.profileHeaderBg}>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
                <Feather name="edit-2" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </ImageBackground>

            <View style={styles.profileBody}>
              <View style={styles.profileAvatarBorder}>
                <View style={styles.profileAvatarCircle}>
                  <Text style={styles.profileAvatarText}>BC</Text>
                </View>
              </View>

              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>BloxyCroissant</Text>
                <View style={styles.explorerBadge}><Text style={styles.explorerBadgeText}>Explorer</Text></View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                  <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.profileHandle}>@bloxycroissant Student oceanographer</Text>
              <Text style={styles.profileBio}>Learning one dive at a time. Fascinated by the midnight zone and everything that glows</Text>
              <Text style={styles.profileLoc}>📍 Cebu, Philippines</Text>

              <View style={styles.statsCounterRow}>
                <Text style={styles.statCounter}><Text style={styles.statBold}>28</Text> logs</Text>
                <Text style={styles.statCounter}><Text style={styles.statBold}>1.4K</Text> followers</Text>
                <Text style={styles.statCounter}><Text style={styles.statBold}>318</Text> following</Text>
              </View>

              <View style={styles.profileTabRow}>
                {['Field logs', 'Saved', 'Species'].map((tab) => (
                  <TouchableOpacity key={tab} style={[styles.profileTab, profileTab === tab && styles.profileTabActive]} onPress={() => setProfileTab(tab)}>
                    <Text style={[styles.profileTabText, profileTab === tab && styles.profileTabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.galleryGrid}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop' }} style={styles.galleryImg} />
                <Image source={{ uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop' }} style={styles.galleryImg} />
                <Image source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop' }} style={styles.galleryImg} />
              </View>
            </View>
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
  profileHeaderBg: { width: '100%', height: 160, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 16 },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileBody: { paddingHorizontal: 16, marginTop: -30 },
  profileAvatarBorder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#071321', padding: 4, marginBottom: 12 },
  profileAvatarCircle: { flex: 1, borderRadius: 40, backgroundColor: '#1B4965', justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  profileNameRow: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginRight: 8 },
  explorerBadge: { backgroundColor: '#103A5C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10 },
  explorerBadgeText: { color: '#00F0FF', fontSize: 10, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#8B0000', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 'auto' },
  logoutBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  profileHandle: { fontSize: 12, color: '#8A99AD', marginTop: 4 },
  profileBio: { fontSize: 12, color: '#E0E6ED', marginTop: 8, lineHeight: 18 },
  profileLoc: { fontSize: 11, color: '#8A99AD', marginTop: 8 },
  statsCounterRow: { flexDirection: 'row', marginTop: 14, marginBottom: 16 },
  statCounter: { fontSize: 12, color: '#8A99AD', marginRight: 16 },
  statBold: { color: '#FFFFFF', fontWeight: '800' },
  profileTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  profileTab: { paddingVertical: 10, marginRight: 24 },
  profileTabActive: { borderBottomWidth: 2, borderBottomColor: '#00B4D8' },
  profileTabText: { fontSize: 13, color: '#8A99AD' },
  profileTabTextActive: { color: '#00F0FF', fontWeight: '700' },
  galleryGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  galleryImg: { width: (SCREEN_WIDTH - 44) / 3, height: 110, borderRadius: 8 },
});