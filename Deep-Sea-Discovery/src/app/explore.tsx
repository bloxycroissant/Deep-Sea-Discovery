import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Home');
  const [isLiked, setIsLiked] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleBubblePop = (id: number) => {};

  const bubbleComponents = useMemo(() => {
    return Array.from({ length: BUBBLE_COUNT }).map((_, index) => (
      <Bubble key={index} id={index} onPop={handleBubblePop} />
    ));
  }, []);

  const stories = [
    { id: 'add', label: 'Your log', isAdd: true },
    { id: '1', initials: 'CF', label: 'Cedric', online: true },
    { id: '2', initials: 'JP', label: 'James', online: true },
    { id: '3', initials: 'AP', label: 'Amira', online: false },
    { id: '4', initials: 'LT', label: 'Leo', online: false },
    { id: '5', initials: 'AL', label: 'Aaron', online: false },
  ];

  return (
    <LinearGradient colors={['#071321', '#102035', '#162C4A']} style={styles.container}>
      <View style={styles.bubbleLayer} pointerEvents="box-none">
        {bubbleComponents}
      </View>

      <View style={styles.foregroundLayer} pointerEvents="box-none">
        {/* Top Navbar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Home')}>
            <Ionicons
              name={activeTab === 'Home' ? 'home' : 'home-outline'}
              size={24}
              color={activeTab === 'Home' ? '#00B4D8' : '#8A99AD'}
            />
            <Text style={[styles.navText, activeTab === 'Home' && styles.activeNavText]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Discover')}>
            <Feather name="search" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Discover</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Crews')}>
            <MaterialCommunityIcons name="sail-boat" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Crews</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Signals')}>
            <Ionicons name="chatbox-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Signals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Profile')}>
            <Ionicons name="person-outline" size={24} color="#8A99AD" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          pointerEvents="box-none"
        >
          {/* User Welcome Row */}
          <View style={styles.welcomeRow}>
            <View style={styles.userProfileGroup}>
              <View style={styles.avatarBorder}>
                <Image
                  source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.welcomeTextGroup}>
                <Text style={styles.greetingTitle}>Good morning,</Text>
                <Text style={styles.userName}>BloxyCroissant 👋</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color="#7A94B2" />
            </TouchableOpacity>
          </View>

          {/* Stories Horizontal Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.storiesContainer}
            contentContainerStyle={styles.storiesContent}
          >
            {stories.map((story) => (
              <TouchableOpacity key={story.id} style={styles.storyItem} activeOpacity={0.8}>
                {story.isAdd ? (
                  <View style={styles.addStoryCircle}>
                    <Ionicons name="add" size={22} color="#00B4D8" />
                  </View>
                ) : (
                  <View style={styles.storyCircle}>
                    <Text style={styles.storyInitials}>{story.initials}</Text>
                    {story.online && <View style={styles.onlineDot} />}
                  </View>
                )}
                <Text style={styles.storyLabel}>{story.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Section Heading */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your current</Text>
            <TouchableOpacity style={styles.sortDropdown}>
              <Text style={styles.sortText}>Recent first</Text>
              <Ionicons name="chevron-down" size={14} color="#8A99AD" />
            </TouchableOpacity>
          </View>

          {/* Feed Card */}
          <View style={styles.feedCard}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.crewAvatarContainer}>
                <Text style={styles.crewAvatarText}>ox</Text>
                <View style={styles.crewOnlineDot} />
              </View>
              <View style={styles.crewMeta}>
                <Text style={styles.crewName}>OceanX Nereus</Text>
                <Text style={styles.crewSubtitle}>Expedition crew • 2hr</Text>
              </View>
            </View>

            {/* Card Body Text */}
            <Text style={styles.postText}>Blue water with coral reefs complete.</Text>

            {/* Post Image Container */}
            <View style={styles.imageWrapper}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=1000&auto=format&fit=crop',
                }}
                style={styles.postImage}
                resizeMode="cover"
              />

              {/* Location Tag */}
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={14} color="#FFFFFF" />
                <Text style={styles.locationText}>Coral Sea</Text>
              </View>

              {/* Depth Badge */}
              <View style={styles.depthBadge}>
                <Text style={styles.depthText}>42 M</Text>
              </View>
            </View>

            {/* Post Stats */}
            <View style={styles.statsRow}>
              <View style={styles.appreciationGroup}>
                <Ionicons name="heart" size={16} color="#FF5252" />
                <Text style={styles.appreciationText}>516 appreciations</Text>
              </View>
              <Text style={styles.fieldNotesText}>12 field notes</Text>
            </View>

            {/* Post Actions Row */}
            <View style={styles.actionsRow}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setIsLiked(!isLiked)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isLiked ? '#FF5252' : '#FFFFFF'}
                  />
                  <Text style={styles.actionText}>Appreciate</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="notebook-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>Note</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rightActions}>
                <TouchableOpacity style={styles.iconActionButton} activeOpacity={0.7}>
                  <Feather name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconActionButton}
                  onPress={() => setIsSaved(!isSaved)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
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
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11,
    color: '#8A99AD',
    marginTop: 4,
    fontWeight: '600',
  },
  activeNavText: {
    color: '#00B4D8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userProfileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    backgroundColor: '#00F0FF',
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#081726',
  },
  welcomeTextGroup: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storiesContainer: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  storiesContent: {
    paddingHorizontal: 16,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  addStoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#00B4D8',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,180,216,0.08)',
    marginBottom: 6,
  },
  storyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#00B4D8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12253E',
    marginBottom: 6,
    position: 'relative',
  },
  storyInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00E676',
    borderWidth: 2,
    borderColor: '#071321',
  },
  storyLabel: {
    fontSize: 11,
    color: '#8A99AD',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 12,
    color: '#8A99AD',
    marginRight: 4,
  },
  feedCard: {
    backgroundColor: '#102236',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  crewAvatarContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3B3654',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  crewAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  crewOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
    borderWidth: 1.5,
    borderColor: '#102236',
  },
  crewMeta: {
    justifyContent: 'center',
  },
  crewName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  crewSubtitle: {
    fontSize: 11,
    color: '#7A8B9E',
    marginTop: 1,
  },
  postText: {
    fontSize: 13,
    color: '#E0E6ED',
    marginBottom: 12,
  },
  imageWrapper: {
    width: '100%',
    height: 230,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  locationBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  depthBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  depthText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  appreciationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appreciationText: {
    color: '#8A99AD',
    fontSize: 12,
    marginLeft: 6,
  },
  fieldNotesText: {
    color: '#8A99AD',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconActionButton: {
    marginLeft: 16,
  },
});