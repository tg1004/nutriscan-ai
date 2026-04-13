import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { userAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useTheme } from '../context/ThemeContext'
import {DIET_TARGETS, GOAL_ADJUSTMENTS} from '../theme'
const GOALS = [
  { key: 'weight_loss', label: 'Weight loss', emoji: '🔥', desc: 'Reduce body fat' },
  { key: 'muscle_gain', label: 'Muscle gain', emoji: '💪', desc: 'Build muscle mass' },
  { key: 'maintenance', label: 'Maintenance', emoji: '⚖️', desc: 'Stay at current weight' },
  { key: 'overall_health', label: 'Overall health', emoji: '🌿', desc: 'Improve wellbeing' },
  { key: 'performance', label: 'Performance', emoji: '🏆', desc: 'Athlete performance diet' },
]

const DIETS = [
  { key: 'balanced', label: 'Balanced', emoji: '🥗', desc: 'No restrictions' },
  { key: 'keto', label: 'Keto', emoji: '🥑', desc: 'High fat, very low carb' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱', desc: 'No animal products' },
  { key: 'vegetarian', label: 'Vegetarian', emoji: '🧀', desc: 'No meat or fish' },
  { key: 'high_protein', label: 'High protein', emoji: '🍗', desc: 'Protein focused' },
  { key: 'low_carb', label: 'Low carb', emoji: '🥦', desc: 'Reduced carbohydrates' },
]

const GENDERS = ['Male', 'Female', 'Other']
const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Light', desc: '1-3 days/week' },
  { key: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { key: 'active', label: 'Active', desc: '6-7 days/week' },
]

function computeTDEE(weight, height, age, gender, activity, goal) {
  if (!weight || !height || !age) return 2000
  const w = parseFloat(weight)
  const h = parseFloat(height)
  const a = parseInt(age)
  // Mifflin-St Jeor equation
  let bmr = gender === 'Female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }
  const tdee = Math.round(bmr * (multipliers[activity] || 1.375))
  const adjustment = GOAL_ADJUSTMENTS[goal] || 0
  return Math.max(1200, tdee + adjustment)
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { completeOnboarding } = useAuthStore()
  const { colors, typography, spacing, radius, shadows } = useTheme()

  // Step 1
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')

  // Step 2
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')

  // Step 3
  const [goal, setGoal] = useState('')

  // Step 4
  const [diet, setDiet] = useState('')
  const [activity, setActivity] = useState('moderate')

  // Step 5 — targets (editable)
  const [targets, setTargets] = useState(null)

  const totalSteps = 5

  const buildTargets = () => {
    const base = DIET_TARGETS[diet] || DIET_TARGETS.balanced
    const tdee = computeTDEE(weight, height, age, gender, activity, goal)
    return { ...base, calories: tdee }
  }

  const goNext = () => {
    setError('')
    if (step === 1) {
      if (!gender || !age) { setError('Please fill in all fields.'); return }
    }
    if (step === 2) {
      if (!weight || !height) { setError('Please enter your height and weight.'); return }
    }
    if (step === 3) {
      if (!goal) { setError('Please select a goal.'); return }
    }
    if (step === 4) {
      if (!diet) { setError('Please select a diet type.'); return }
      // Build targets when entering step 5
      setTargets(buildTargets())
    }
    setStep(s => s + 1)
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      await userAPI.updateProfile({
        gender: gender.toLowerCase(),
        age: parseInt(age),
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        goal,
        diet_type: diet,
        activity_level: activity,
        custom_targets: targets,
      })
      await completeOnboarding()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, padding: spacing.lg },
    progress: { flexDirection: 'row', gap: 6, marginBottom: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
    progressDotActive: { backgroundColor: colors.primary },
    stepLabel: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xs, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.xs },
    subtitle: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.xl, color: colors.textSecondary },
    field: { marginBottom: spacing.md },
    label: { ...typography.label, marginBottom: spacing.xs, color: colors.text },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: 12,
      fontSize: 16, color: colors.text, backgroundColor: colors.surface,
    },
    inputRow: { flexDirection: 'row', gap: spacing.sm },
    optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    optionBtn: {
      borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg,
      padding: spacing.md, alignItems: 'center', minWidth: '30%', flex: 1,
      backgroundColor: colors.surface,
    },
    optionBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    optionEmoji: { fontSize: 28, marginBottom: 4 },
    optionLabel: { ...typography.label, textAlign: 'center', color: colors.text },
    optionLabelActive: { color: colors.primary },
    optionDesc: { ...typography.caption, textAlign: 'center', marginTop: 2 },
    genderRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    genderBtn: {
      flex: 1, borderWidth: 2, borderColor: colors.border,
      borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
      backgroundColor: colors.surface,
    },
    genderBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    genderText: { ...typography.label, color: colors.text },
    genderTextActive: { color: colors.primary },
    activityCard: {
      borderWidth: 2, borderColor: colors.border, borderRadius: radius.md,
      padding: spacing.md, marginBottom: spacing.sm,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.surface,
    },
    activityCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    targetRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    targetLabel: { ...typography.label, flex: 1, color: colors.text },
    targetInput: {
      borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
      paddingHorizontal: spacing.sm, paddingVertical: 6,
      width: 80, textAlign: 'right', fontSize: 15, color: colors.text,
      backgroundColor: colors.surface,
    },
    targetUnit: { ...typography.caption, width: 36, textAlign: 'right' },
    errorBox: {
      backgroundColor: colors.errorLight, borderRadius: radius.sm,
      padding: spacing.md, marginBottom: spacing.md,
    },
    errorText: { color: colors.error, fontSize: 14 },
    btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    backBtn: {
      flex: 1, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
      backgroundColor: colors.surface,
    },
    backBtnText: { ...typography.label, color: colors.textSecondary },
    nextBtn: {
      flex: 2, backgroundColor: colors.primary,
      borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
    },
    nextBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    card: {
      backgroundColor: colors.surface, borderRadius: radius.xl,
      padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
    },
    infoBox: {
      backgroundColor: colors.primaryLight, borderRadius: radius.md,
      padding: spacing.md, marginBottom: spacing.lg,
      borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    infoText: { ...typography.bodySmall, color: colors.primaryDark },
  })

  return (
    <SafeAreaView style={s.container}>
      {/* Progress bar */}
      <View style={s.progress}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[s.progressDot, i < step && s.progressDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── STEP 1: Basic info ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            <Text style={s.stepLabel}>Step 1 of 5</Text>
            <Text style={s.title}>Tell us about you</Text>
            <Text style={s.subtitle}>We'll use this to personalise your nutrition targets</Text>

            <Text style={[s.label, { marginBottom: spacing.sm }]}>Gender</Text>
            <View style={s.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g} style={[s.genderBtn, gender === g && s.genderBtnActive]}
                  onPress={() => setGender(g)} activeOpacity={0.8}>
                  <Text style={[s.genderText, gender === g && s.genderTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Age</Text>
              <TextInput style={s.input} value={age} onChangeText={setAge}
                keyboardType="numeric" placeholder="e.g. 22" placeholderTextColor={colors.textTertiary} />
            </View>
          </>
        )}

        {/* ── STEP 2: Body measurements ─────────────────────────────── */}
        {step === 2 && (
          <>
            <Text style={s.stepLabel}>Step 2 of 5</Text>
            <Text style={s.title}>Body measurements</Text>
            <Text style={s.subtitle}>Used to calculate your daily calorie needs</Text>

            <View style={s.inputRow}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Weight (kg)</Text>
                <TextInput style={s.input} value={weight} onChangeText={setWeight}
                  keyboardType="decimal-pad" placeholder="70" placeholderTextColor={colors.textTertiary} />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Height (cm)</Text>
                <TextInput style={s.input} value={height} onChangeText={setHeight}
                  keyboardType="decimal-pad" placeholder="175" placeholderTextColor={colors.textTertiary} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Target weight (kg) — optional</Text>
              <TextInput style={s.input} value={targetWeight} onChangeText={setTargetWeight}
                keyboardType="decimal-pad" placeholder="65" placeholderTextColor={colors.textTertiary} />
            </View>

            <Text style={[s.label, { marginBottom: spacing.sm }]}>Activity level</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity key={a.key}
                style={[s.activityCard, activity === a.key && s.activityCardActive]}
                onPress={() => setActivity(a.key)} activeOpacity={0.8}>
                <View>
                  <Text style={[s.label, activity === a.key && { color: colors.primary }]}>{a.label}</Text>
                  <Text style={s.optionDesc}>{a.desc}</Text>
                </View>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2, borderColor: activity === a.key ? colors.primary : colors.border,
                  backgroundColor: activity === a.key ? colors.primary : 'transparent',
                }} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── STEP 3: Goal ──────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <Text style={s.stepLabel}>Step 3 of 5</Text>
            <Text style={s.title}>What's your goal?</Text>
            <Text style={s.subtitle}>This adjusts your daily calorie target</Text>

            {GOALS.map(g => (
              <TouchableOpacity key={g.key}
                style={[s.activityCard, goal === g.key && s.activityCardActive]}
                onPress={() => setGoal(g.key)} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Text style={{ fontSize: 28 }}>{g.emoji}</Text>
                  <View>
                    <Text style={[s.label, goal === g.key && { color: colors.primary }]}>{g.label}</Text>
                    <Text style={s.optionDesc}>{g.desc}</Text>
                  </View>
                </View>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2, borderColor: goal === g.key ? colors.primary : colors.border,
                  backgroundColor: goal === g.key ? colors.primary : 'transparent',
                }} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── STEP 4: Diet type ─────────────────────────────────────── */}
        {step === 4 && (
          <>
            <Text style={s.stepLabel}>Step 4 of 5</Text>
            <Text style={s.title}>Dietary preference</Text>
            <Text style={s.subtitle}>Sets your default nutritional targets</Text>

            <View style={s.optionGrid}>
              {DIETS.map(d => (
                <TouchableOpacity key={d.key}
                  style={[s.optionBtn, diet === d.key && s.optionBtnActive]}
                  onPress={() => setDiet(d.key)} activeOpacity={0.8}>
                  <Text style={s.optionEmoji}>{d.emoji}</Text>
                  <Text style={[s.optionLabel, diet === d.key && s.optionLabelActive]}>{d.label}</Text>
                  <Text style={s.optionDesc}>{d.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── STEP 5: Review & edit targets ─────────────────────────── */}
        {step === 5 && targets && (
          <>
            <Text style={s.stepLabel}>Step 5 of 5</Text>
            <Text style={s.title}>Your daily targets</Text>
            <Text style={s.subtitle}>Calculated for you — edit any value you want</Text>

            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Based on your profile: {Math.round(targets.calories)} kcal/day
                ({DIET_TARGETS[diet]?.label || 'Balanced'} · {goal?.replace('_', ' ')})
              </Text>
            </View>

            <View style={s.card}>
              {[
                { key: 'calories', label: 'Calories', unit: 'kcal' },
                { key: 'protein_g', label: 'Protein', unit: 'g' },
                { key: 'carbs_g', label: 'Carbohydrates', unit: 'g' },
                { key: 'fat_g', label: 'Fat', unit: 'g' },
                { key: 'fiber_g', label: 'Fiber', unit: 'g' },
                { key: 'sugar_g', label: 'Sugar', unit: 'g' },
                { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
                { key: 'iron_mg', label: 'Iron', unit: 'mg' },
                { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
                { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
                { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
              ].map(t => (
                <View key={t.key} style={s.targetRow}>
                  <Text style={s.targetLabel}>{t.label}</Text>
                  <TextInput
                    style={s.targetInput}
                    value={String(Math.round(targets[t.key] || 0))}
                    onChangeText={val => setTargets(prev => ({ ...prev, [t.key]: parseFloat(val) || 0 }))}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.targetUnit}>{t.unit}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

        {/* Navigation buttons */}
        <View style={s.btnRow}>
          {step > 1 && (
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={s.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          {step < 5 ? (
            <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.nextBtn} onPress={submit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.nextBtnText}>Get started 🎉</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}