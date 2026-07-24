import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { EyeOff, Eye } from 'lucide-react-native';
import { Svg, Path, Circle, Ellipse, Line, Polyline } from 'react-native-svg';
import { login } from '../api/auth';
import { Alert } from 'react-native';

const Logo = () => (
  <View style={styles.logoWrapper}>
    <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
      {/* Globe outline */}
      <Circle cx="50" cy="50" r="45" stroke="#1da1f2" strokeWidth="6" />
      {/* Globe horizontal lines */}
      <Ellipse cx="50" cy="50" rx="45" ry="15" stroke="#1da1f2" strokeWidth="6" />
      {/* Globe vertical line */}
      <Line x1="50" y1="5" x2="50" y2="95" stroke="#1da1f2" strokeWidth="6" />
      {/* Heart */}
      <Path
        d="M50 75C50 75 25 55 25 40C25 30 35 25 42.5 30C47.5 33.3 50 38 50 38C50 38 52.5 33.3 57.5 30C65 25 75 30 75 40C75 55 50 75 50 75Z"
        fill="#8a2be2"
      />
      {/* EKG Line */}
      <Polyline
        points="25,50 35,50 40,35 45,65 52,40 57,50 75,50"
        stroke="#1da1f2"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  </View>
);

const GoogleLogo = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

const AppleLogo = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Path
      d="M17.05 20.28c-.98.98-2.06 1.05-3.14.49-1.12-.56-2.24-.56-3.4 0-1.05.52-2.1.49-3.04-.49-1.15-1.19-2.34-3.08-3.32-5.49-1.22-3.01-1.05-5.91.49-7.52 1.05-1.12 2.38-1.57 3.5-1.54 1.15.03 2.17.63 2.76.63.6 0 1.78-.7 3.11-.63 1.15.03 2.2.49 2.94 1.22-2.41 1.26-2.03 4.58.52 5.67-1.01 2.38-2.27 4.97-4.42 7.66zm-3.64-16.1c.31-1.4.1-2.9-1.19-3.95-1.15-.94-2.52-1.08-3.78-.84.28 1.47 1.05 2.73 2.03 3.5 1.05.77 2.41.98 3.5.7l-.56.59z"
      fill="#000"
    />
  </Svg>
);

export default function LoginScreen({ _navigation }: any) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Note: The design only shows "Password" and implies email is captured previously or we just use Email here as well.
  // I will include an Email field to make this screen functional with the backend.

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      const res = await login(email, password);
      console.log('Login successful:', res);
      Alert.alert('Success', 'Logged in successfully!');
      // navigation.navigate('Home'); // Next phase
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials or server error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Logo />
          </View>

          <Text style={styles.title}>Login to your Account</Text>

          {/* Email Input - Added for functional backend auth integration */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#555"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#555"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? <Eye size={20} color="#333" /> : <EyeOff size={20} color="#333" />}
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.signInButtonText}>{isLoading ? 'Signing In...' : 'Sign In'}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerWrapper}>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.orSignUpText}>Or Sign Up</Text>

          {/* Alternative Methods */}
          <TouchableOpacity style={styles.altButtonEmail}>
            <Text style={styles.altButtonTextEmail}>Continue with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.altButtonPhone}>
            <Text style={styles.altButtonTextPhone}>Continue with Phone</Text>
          </TouchableOpacity>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <GoogleLogo />
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton}>
              <AppleLogo />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Dont Have an Account? </Text>
            <TouchableOpacity>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '400',
  },
  signInButton: {
    backgroundColor: '#1E73E8',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#111',
    width: '60%',
  },
  orSignUpText: {
    textAlign: 'center',
    color: '#111',
    fontSize: 14,
    marginBottom: 24,
  },
  altButtonEmail: {
    backgroundColor: '#1E73E8',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  altButtonTextEmail: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  altButtonPhone: {
    backgroundColor: '#ffffff',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  altButtonTextPhone: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#333333',
  },
  signUpLink: {
    fontSize: 14,
    color: '#1E73E8',
    fontWeight: '500',
  },
});
