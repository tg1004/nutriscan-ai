import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import { DIET_TARGETS } from '../theme'

const GOALS = [
  { key: 'weight_loss', label: 'Weight loss', emoji: '🔥' },
  { key: 'muscle_gain', label: 'Muscle gain', emoji: '💪' },
  { key: 'maintenance', label: 'Maintenance', emoji: '⚖️' },
  { key: 'overall_health', label: 'Overall health', emoji: '🌿' },
  { key: 'performance', label: 'Performance', emoji: '🏆' },
]

const DIETS = [
  { key: 'balanced', label: 'Balanced', emoji: '🥗' },
  { key: 'keto', label: 'Keto', emoji: '🥑' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🧀' },
  { key: 'high_protein', label: 'High protein', emoji: '🍗' },
  { key: 'low_carb', label: 'Low carb', emoji: '🥦' },
]

export default function ProfileScreen() {
  const { colors, typography, spacing, radius, shadows, isDark, toggleTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editSection, setEditSection] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Editable fields
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [goal, setGoal] = useState('')
  const [diet, setDiet] = useState('')
  const [targets, setTargets] = useState(null)

  const s = makeStyles(colors, spacing, radius, shadows)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await userAPI.getProfile()
      const p = res.data
      setProfile(p)
      setWeight(String(p.weight_kg || ''))
      setHeight(String(p.height_cm || ''))
      setAge(String(p.age || ''))
      setGender(p.gender || '')
      setGoal(p.goal || '')
      setDiet(p.diet_type || '')
      setTargets(p.custom_targets || DIET_TARGETS[p.diet_type || 'balanced'])
    } catch {}
    finally { setLoading(false) }
  }

  const saveSection = async (section) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      let data = {}
      if (section === 'body') {
        data = {
          weight_kg: parseFloat(weight) || null,
          height_cm: parseFloat(height) || null,
          age: parseInt(age) || null,
          gender,
        }
      } else if (section === 'goals') {
        data = { goal, diet_type: diet }
      } else if (section === 'targets') {
        data = { custom_targets: targets }
      }
      await userAPI.updateProfile(data)
      setSuccess('Saved successfully!')
      setEditSection(null)
      await loadProfile()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false) }
  }

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ])
  }

  if (loading) return (
    <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Profile header */}
        <View style={[s.card, { alignItems: 'center', paddingVertical: spacing.xl }]}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 36 }}>
              {gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑'}
            </Text>
          </View>
          <Text style={[typography.h2, { marginTop: spacing.md }]}>
            {user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={[typography.bodySmall, { marginTop: 4 }]}>{user?.email}</Text>
          <View style={s.goalBadge}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
              {GOALS.find(g => g.key === goal)?.emoji} {GOALS.find(g => g.key === goal)?.label || 'No goal set'}
            </Text>
          </View>
        </View>

        {/* Theme toggle */}
        <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text style={{ fontSize: 24 }}>{isDark ? '🌙' : '☀️'}</Text>
            <View>
              <Text style={typography.label}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
              <Text style={typography.caption}>Tap to switch theme</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {success ? (
          <View style={[s.errorBox, { backgroundColor: colors.successLight, borderLeftColor: colors.success }]}>
            <Text style={{ color: colors.success }}>✅ {success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Body stats section */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={typography.h3}>Body stats</Text>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => setEditSection(editSection === 'body' ? null : 'body')}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                {editSection === 'body' ? 'Cancel' : '✏️ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {editSection !== 'body' ? (
            <View style={s.statsGrid}>
              {[
                { label: 'Weight', value: profile?.weight_kg ? `${profile.weight_kg} kg` : '—' },
                { label: 'Height', value: profile?.height_cm ? `${profile.height_cm} cm` : '—' },
                { label: 'Age', value: profile?.age ? `${profile.age} yrs` : '—' },
                { label: 'Gender', value: profile?.gender || '—' },
              ].map(item => (
                <View key={item.label} style={s.statItem}>
                  <Text style={[typography.h3, { color: colors.primary }]}>{item.value}</Text>
                  <Text style={typography.caption}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <View style={s.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { marginBottom: 4 }]}>Weight (kg)</Text>
                  <TextInput style={s.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholderTextColor={colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { marginBottom: 4 }]}>Height (cm)</Text>
                  <TextInput style={s.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholderTextColor={colors.textTertiary} />
                </View>
              </View>
              <View style={s.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { marginBottom: 4 }]}>Age</Text>
                  <TextInput style={s.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.label, { marginBottom: 4 }]}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {['male', 'female', 'other'].map(g => (
                      <TouchableOpacity key={g}
                        style={[s.genderBtn, gender === g && s.genderBtnActive]}
                        onPress={() => setGender(g)}>
                        <Text style={[{ fontSize: 12 }, gender === g && { color: colors.primary, fontWeight: '600' }]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                onPress={() => saveSection('body')} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Goals & diet section */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={typography.h3}>Goals & diet</Text>
            <TouchableOpacity style={s.editBtn}
              onPress={() => setEditSection(editSection === 'goals' ? null : 'goals')}>
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                {editSection === 'goals' ? 'Cancel' : '✏️ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {editSection !== 'goals' ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ fontSize: 24 }}>{GOALS.find(g => g.key === goal)?.emoji || '🎯'}</Text>
                <View>
                  <Text style={typography.label}>Goal</Text>
                  <Text style={typography.bodySmall}>{GOALS.find(g => g.key === goal)?.label || '—'}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={{ fontSize: 24 }}>{DIETS.find(d => d.key === diet)?.emoji || '🥗'}</Text>
                <View>
                  <Text style={typography.label}>Diet</Text>
                  <Text style={typography.bodySmall}>{DIETS.find(d => d.key === diet)?.label || '—'}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[typography.label, { marginBottom: spacing.sm }]}>Goal</Text>
              {GOALS.map(g => (
                <TouchableOpacity key={g.key}
                  style={[s.optionRow, goal === g.key && s.optionRowActive]}
                  onPress={() => setGoal(g.key)}>
                  <Text style={{ fontSize: 20 }}>{g.emoji}</Text>
                  <Text style={[typography.label, goal === g.key && { color: colors.primary }]}>{g.label}</Text>
                  <View style={[s.radio, goal === g.key && s.radioActive]} />
                </TouchableOpacity>
              ))}

              <Text style={[typography.label, { marginBottom: spacing.sm, marginTop: spacing.md }]}>Diet</Text>
              <View style={s.dietGrid}>
                {DIETS.map(d => (
                  <TouchableOpacity key={d.key}
                    style={[s.dietBtn, diet === d.key && s.dietBtnActive]}
                    onPress={() => setDiet(d.key)}>
                    <Text style={{ fontSize: 22 }}>{d.emoji}</Text>
                    <Text style={[{ fontSize: 12, textAlign: 'center', marginTop: 2 }, diet === d.key && { color: colors.primary, fontWeight: '600' }]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                onPress={() => saveSection('goals')} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Daily targets section */}
        {targets && (
          <View style={s.card}>
            <View style={s.sectionHeader}>
              <Text style={typography.h3}>Daily targets</Text>
              <TouchableOpacity style={s.editBtn}
                onPress={() => setEditSection(editSection === 'targets' ? null : 'targets')}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                  {editSection === 'targets' ? 'Cancel' : '✏️ Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {editSection !== 'targets' ? (
              <View>
                {[
                  { key: 'calories', label: 'Calories', unit: 'kcal' },
                  { key: 'protein_g', label: 'Protein', unit: 'g' },
                  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
                  { key: 'fat_g', label: 'Fat', unit: 'g' },
                  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                ].map(t => (
                  <View key={t.key} style={s.targetDisplayRow}>
                    <Text style={typography.bodySmall}>{t.label}</Text>
                    <Text style={[typography.label, { color: colors.primary }]}>
                      {Math.round(targets[t.key] || 0)} {t.unit}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                {[
                  { key: 'calories', label: 'Calories', unit: 'kcal' },
                  { key: 'protein_g', label: 'Protein', unit: 'g' },
                  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
                  { key: 'fat_g', label: 'Fat', unit: 'g' },
                  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                  { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
                  { key: 'iron_mg', label: 'Iron', unit: 'mg' },
                  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
                  { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
                ].map(t => (
                  <View key={t.key} style={s.targetEditRow}>
                    <Text style={[typography.label, { flex: 1 }]}>{t.label}</Text>
                    <TextInput
                      style={s.targetInput}
                      value={String(Math.round(targets[t.key] || 0))}
                      onChangeText={val => setTargets(prev => ({ ...prev, [t.key]: parseFloat(val) || 0 }))}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[typography.caption, { width: 36, textAlign: 'right' }]}>{t.unit}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={() => saveSection('targets')} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save targets</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
          <Text style={s.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.xl }]}>
          NutriScan AI v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  goalBadge: {
    marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 4,
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  editBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: radius.full },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statItem: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.md, alignItems: 'center',
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  genderBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center',
    backgroundColor: colors.surface,
  },
  genderBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 12, alignItems: 'center', marginTop: spacing.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optionRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, marginLeft: 'auto' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  dietBtn: {
    width: '30%', flexGrow: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dietBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  targetDisplayRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  targetEditRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  targetInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    width: 80, textAlign: 'right', fontSize: 15, color: colors.text,
    backgroundColor: colors.surface,
  },
  logoutBtn: {
    borderWidth: 1, borderColor: colors.error, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center', marginBottom: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: 15 },
  errorBox: {
    borderLeftWidth: 4, borderLeftColor: colors.error,
    backgroundColor: colors.errorLight, borderRadius: radius.sm,
    padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 14 },
})