import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { authAPI, userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useTheme } from '../context/ThemeContext'

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const { setUser } = useAuthStore()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login(email, password)
      // Save tokens first — interceptor needs these
      await SecureStore.setItemAsync('access_token', res.data.access_token)
      await SecureStore.setItemAsync('refresh_token', res.data.refresh_token)
      // Existing users skip onboarding
      await SecureStore.setItemAsync('onboarding_complete', 'true')
      const meRes = await userAPI.getMe()
      setUser(meRes.data)
      // Manually set full auth state
      useAuthStore.setState({
        user: meRes.data,
        isAuthenticated: true,
        onboardingComplete: true,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const s = makeStyles(colors, spacing, radius, shadows)

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.emoji}>🥗</Text>
          <Text style={[typography.h1, { color: colors.primary, marginBottom: spacing.xs }]}>NutriScan AI</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Track your nutrition with AI</Text>
        </View>

        <View style={s.card}>
          <Text style={[typography.h2, { textAlign: 'center', marginBottom: spacing.lg }]}>Welcome back</Text>

          <Text style={[typography.label, { marginBottom: spacing.xs }]}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            placeholder="you@example.com" placeholderTextColor={colors.textTertiary} />

          <Text style={[typography.label, { marginBottom: spacing.xs, marginTop: spacing.md }]}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Your password" placeholderTextColor={colors.textTertiary} />

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.lg, alignItems: 'center' }}
            onPress={() => navigation.navigate('Register')}>
            <Text style={[typography.bodySmall]}>
              Don't have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (colors, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 16, color: colors.text, backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  errorBox: { backgroundColor: colors.errorLight, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: colors.error, fontSize: 14 },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})