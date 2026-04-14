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

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { colors, typography, spacing, radius, shadows } = useTheme()

  const handleRegister = async () => {
    if (!email || !password || !confirm) { setError('Please fill in all fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.register(email, password)
      // Save tokens first
      await SecureStore.setItemAsync('access_token', res.data.access_token)
      await SecureStore.setItemAsync('refresh_token', res.data.refresh_token)
      // New user — needs onboarding
      await SecureStore.setItemAsync('onboarding_complete', 'false')
      const meRes = await userAPI.getMe()
      useAuthStore.setState({
        user: meRes.data,
        isAuthenticated: true,
        onboardingComplete: false,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
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
          <Text style={[typography.h1, { color: colors.primary, marginBottom: spacing.xs }]}>Get started</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Create your free account</Text>
        </View>

        <View style={s.card}>
          <Text style={[typography.label, { marginBottom: spacing.xs }]}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            placeholder="you@example.com" placeholderTextColor={colors.textTertiary} />

          <Text style={[typography.label, { marginBottom: spacing.xs }]}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Minimum 8 characters" placeholderTextColor={colors.textTertiary} />

          <Text style={[typography.label, { marginBottom: spacing.xs }]}>Confirm password</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
            secureTextEntry placeholder="Repeat your password" placeholderTextColor={colors.textTertiary} />

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]}
            onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: spacing.lg, alignItems: 'center' }}
            onPress={() => navigation.navigate('Login')}>
            <Text style={typography.bodySmall}>
              Already have an account? <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign in</Text>
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