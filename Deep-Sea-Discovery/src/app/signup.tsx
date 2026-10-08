import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

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

  return (
    <LinearGradient colors={['#071321', '#112238', '#1A365D']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={[styles.badgeContainer, badgeStyle]}>
          <LinearGradient colors={['#0F2942', '#081726']} style={styles.badgeCircle}>
            <Image 
              source={require('../../assets/Deep-Sea-Discovery (Assets)/logo.png')} 
              style={styles.subLogo} 
              resizeMode="contain" 
            />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.title}>Deep Sea Discovery</Text>
        <Text style={styles.subtitle}>
          Join the expedition{'\n'}Create your free learner account
        </Text>

        <Animated.View style={[styles.formContainer, formStyle]}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={[styles.input, focusedField === 'name' && styles.inputFocused]}
            placeholder="Your full name"
            placeholderTextColor="#64748B"
            value={fullName}
            onChangeText={setFullName}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, focusedField === 'email' && styles.inputFocused]}
            placeholder="you@email.com"
            placeholderTextColor="#64748B"
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
            placeholderTextColor="#64748B"
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
            <Animated.View style={[styles.checkbox, agreed && styles.checkboxChecked, checkboxAnimStyle]}>
              {agreed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
            </Animated.View>
            <Text style={styles.termsText}>
              By signing up, you agree to our <Text style={styles.linkText}>Terms</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>Start Learning Free</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('./login')}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40, alignItems: 'center' },
  badgeContainer: { width: 100, height: 100, borderRadius: 50, padding: 2, backgroundColor: '#00F0FF', marginBottom: 15 },
  badgeCircle: { flex: 1, borderRadius: 50, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  subLogo: { width: '75%', height: '75%' },
  title: { fontSize: 26, fontWeight: '800', color: '#00B4D8', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 20, lineHeight: 18 },
  formContainer: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 14, marginBottom: 16 },
  inputFocused: { borderColor: '#00F0FF', backgroundColor: 'rgba(0, 240, 255, 0.05)' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#00B4D8', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#00B4D8' },
  termsText: { fontSize: 11, color: '#94A3B8', flex: 1 },
  linkText: { color: '#00B4D8', fontWeight: '600' },
  submitButton: { backgroundColor: '#13233A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 13, color: '#94A3B8' },
  footerLink: { fontSize: 13, color: '#00B4D8', fontWeight: '700' },
});