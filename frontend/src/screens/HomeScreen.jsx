import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Modal, TextInput, FlatList, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { foodAPI, logAPI } from '../services/api'
import { useTheme } from '../context/ThemeContext'

const STEPS = {
  IDLE: 'idle',
  CAMERA: 'camera',
  ANALYZING: 'analyzing',
  CONTEXT: 'context',
  RESULT: 'result',
}

export default function HomeScreen() {
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const [step, setStep] = useState(STEPS.IDLE)
  const [image, setImage] = useState(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Detected food
  const [detectedFood, setDetectedFood] = useState(null)
  const [editedFoodName, setEditedFoodName] = useState('')
  const [isEditingFood, setIsEditingFood] = useState(false)
  const [foodSearchResults, setFoodSearchResults] = useState([])

  // Context
  const [source, setSource] = useState(null)
  const [pieces, setPieces] = useState(1)
  const [extras, setExtras] = useState([])
  const [extraQuery, setExtraQuery] = useState('')
  const [extraResults, setExtraResults] = useState([])

  // Result
  const [nutritionResult, setNutritionResult] = useState(null)
  const [loggedMeal, setLoggedMeal] = useState(false)
  const scanned = useRef(false)
  const cameraRef = useRef(null)

  const s = makeStyles(colors, spacing, radius, shadows)

  // ── Image picking ──────────────────────────────────────────────────────

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!res.canceled && res.assets[0]) {
      setImage(res.assets[0].uri)
      await analyzeImage(res.assets[0].uri)
    }
  }

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        Alert.alert('Camera needed', 'Please allow camera access.')
        return
      }
    }
    setStep(STEPS.CAMERA)
  }

  const capturePhoto = async () => {
    if (!cameraRef?.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      setImage(photo.uri)
      setStep(STEPS.ANALYZING)
      await analyzeImage(photo.uri)
    } catch {
      setError('Failed to capture photo.')
      setStep(STEPS.IDLE)
    }
  }

  const analyzeImage = async (uri) => {
    setStep(STEPS.ANALYZING)
    setError('')
    setLoading(true)
    try {
      // Search for food items — in Phase 3 this will be replaced
      // with actual ML model call. For now we search by a default
      // and let the user correct if wrong.
      await new Promise(r => setTimeout(r, 1500)) // simulate ML delay
      // Simulated detection — Phase 3 replaces this with real model
      const mockResult = { food_item_id: null, food_name: 'Aloo Paratha', confidence: 0.91 }
      // Try to find it in DB
      const searchRes = await foodAPI.search('Aloo Paratha')
      if (searchRes.data.length > 0) {
        mockResult.food_item_id = searchRes.data[0].id
      }
      setDetectedFood(mockResult)
      setEditedFoodName(mockResult.food_name)
      setStep(STEPS.CONTEXT)
    } catch {
      setError('Could not analyze image. Please try again.')
      setStep(STEPS.IDLE)
    } finally {
      setLoading(false)
    }
  }

  // ── Food name editing ──────────────────────────────────────────────────

  const searchFood = async (q) => {
    setEditedFoodName(q)
    if (q.length < 2) { setFoodSearchResults([]); return }
    try {
      const res = await foodAPI.search(q)
      setFoodSearchResults(res.data)
    } catch { setFoodSearchResults([]) }
  }

  const selectFood = (item) => {
    setDetectedFood({ food_item_id: item.id, food_name: item.name, confidence: 1 })
    setEditedFoodName(item.name)
    setIsEditingFood(false)
    setFoodSearchResults([])
  }

  // ── Extra ingredients ──────────────────────────────────────────────────

  const searchExtras = async (q) => {
    setExtraQuery(q)
    if (q.length < 2) { setExtraResults([]); return }
    try {
      const res = await foodAPI.searchIngredients(q)
      setExtraResults(res.data)
    } catch { setExtraResults([]) }
  }

  // ── Submit context ─────────────────────────────────────────────────────

  const submitContext = async () => {
    if (!source) { setError('Please select home or restaurant.'); return }
    if (!detectedFood?.food_item_id) { setError('Please select a valid food item.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await foodAPI.resolveContext({
        food_item_id: detectedFood.food_item_id,
        quantity_pieces: pieces,
        source,
        extra_ingredient_ids: extras.map(e => e.id),
      })
      setNutritionResult(res.data)
      setStep(STEPS.RESULT)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compute nutrition.')
    } finally {
      setLoading(false)
    }
  }

  // ── Log meal ───────────────────────────────────────────────────────────

  const logMeal = async (mealType) => {
    setLoading(true)
    try {
      const t = nutritionResult.total_nutrients
      await logAPI.create({
        meal_type: mealType,
        items: [{
          food_item_id: nutritionResult.food_item_id,
          quantity_grams: nutritionResult.quantity_grams,
          quantity_pieces: nutritionResult.quantity_pieces,
          source: nutritionResult.source,
          oil_used: nutritionResult.oil_used,
          oil_grams: nutritionResult.oil_grams,
          extra_ingredients: nutritionResult.extra_ingredients,
          calories: t.calories,
          protein_g: t.protein_g,
          carbs_g: t.carbs_g,
          fat_g: t.fat_g,
          fiber_g: t.fiber_g,
          sugar_g: t.sugar_g,
          sodium_mg: t.sodium_mg,
          calcium_mg: t.calcium_mg,
          iron_mg: t.iron_mg,
          vitamin_c_mg: t.vitamin_c_mg,
          vitamin_a_ug: t.vitamin_a_ug,
          potassium_mg: t.potassium_mg,
        }]
      })
      setLoggedMeal(true)
    } catch {
      setError('Failed to log meal.')
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setStep(STEPS.IDLE)
    setImage(null)
    setDetectedFood(null)
    setSource(null)
    setPieces(1)
    setExtras([])
    setNutritionResult(null)
    setLoggedMeal(false)
    setError('')
  }

  // ── Camera screen ──────────────────────────────────────────────────────

  if (step === STEPS.CAMERA) {

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <SafeAreaView style={s.cameraControls}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setStep(STEPS.IDLE)}>
            <Text style={{ color: '#fff', fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.captureBtn} onPress={() => capturePhoto()}>
            <View style={s.captureInner} />
          </TouchableOpacity>
          <View style={{ width: 80 }} />
        </SafeAreaView>
      </View>
    )
  }

  // ── Analyzing ──────────────────────────────────────────────────────────

  if (step === STEPS.ANALYZING) return (
    <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      {image && <Image source={{ uri: image }} style={s.previewImage} />}
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      <Text style={[typography.body, { marginTop: spacing.md, color: colors.textSecondary }]}>
        Analyzing your food...
      </Text>
    </SafeAreaView>
  )

  // ── Context questions ──────────────────────────────────────────────────

  if (step === STEPS.CONTEXT) return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <Text style={[typography.h2, { marginBottom: spacing.lg }]}>Confirm your meal</Text>

        {/* Image preview */}
        {image && <Image source={{ uri: image }} style={s.contextImage} />}

        {/* Detected food with edit option */}
        <View style={s.card}>
          <Text style={[typography.caption, { color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }]}>
            Detected food
          </Text>
          {!isEditingFood ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={typography.h3}>{detectedFood?.food_name}</Text>
                <Text style={[typography.caption, { marginTop: 2 }]}>
                  {detectedFood?.confidence ? `${Math.round(detectedFood.confidence * 100)}% confidence` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.editBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setIsEditingFood(true)}
              >
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                  ✏️ Edit
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={s.input}
                value={editedFoodName}
                onChangeText={searchFood}
                placeholder="Search food..."
                placeholderTextColor={colors.textTertiary}
                autoFocus
              />
              {foodSearchResults.length > 0 && (
                <View style={s.dropdown}>
                  {foodSearchResults.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.dropdownItem}
                      onPress={() => selectFood(item)}
                    >
                      <Text style={typography.body}>{item.name}</Text>
                      <Text style={typography.caption}>{item.category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity onPress={() => setIsEditingFood(false)} style={{ marginTop: spacing.sm }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Cancel edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pieces counter */}
        <View style={s.card}>
          <Text style={[typography.h3, { marginBottom: spacing.md }]}>How many pieces?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
            <TouchableOpacity style={s.counterBtn}
              onPress={() => setPieces(p => Math.max(0.5, +(p - 0.5).toFixed(1)))}>
              <Text style={{ fontSize: 24, color: colors.text }}>−</Text>
            </TouchableOpacity>
            <Text style={[typography.h1, { minWidth: 60, textAlign: 'center' }]}>{pieces}</Text>
            <TouchableOpacity style={s.counterBtn}
              onPress={() => setPieces(p => +(p + 0.5).toFixed(1))}>
              <Text style={{ fontSize: 24, color: colors.text }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Home vs Restaurant */}
        <View style={s.card}>
          <Text style={[typography.h3, { marginBottom: spacing.xs }]}>Where is it from?</Text>
          <Text style={[typography.caption, { marginBottom: spacing.md }]}>
            Affects how much oil is counted
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[
              { v: 'home', emoji: '🏠', label: 'Home cooked', sub: 'Ghee / less oil' },
              { v: 'restaurant', emoji: '🍽️', label: 'Restaurant', sub: 'More refined oil' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.v}
                style={[s.sourceCard, source === opt.v && s.sourceCardActive]}
                onPress={() => setSource(opt.v)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 30, marginBottom: spacing.xs }}>{opt.emoji}</Text>
                <Text style={[typography.label, source === opt.v && { color: colors.primary }]}>
                  {opt.label}
                </Text>
                <Text style={typography.caption}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Extra ingredients */}
        <View style={s.card}>
          <Text style={[typography.h3, { marginBottom: spacing.xs }]}>Extra ingredients?</Text>
          <Text style={[typography.caption, { marginBottom: spacing.md }]}>
            Added beyond the standard recipe
          </Text>

          {extras.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
              {extras.map(e => (
                <View key={e.id} style={s.extraTag}>
                  <Text style={{ fontSize: 13, color: colors.primaryDark }}>
                    {e.name} ({e.default_quantity_g}g)
                  </Text>
                  <TouchableOpacity onPress={() => setExtras(prev => prev.filter(x => x.id !== e.id))}>
                    <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput
            style={s.input}
            value={extraQuery}
            onChangeText={searchExtras}
            placeholder="Search: cheese, butter, egg..."
            placeholderTextColor={colors.textTertiary}
          />

          {extraResults.length > 0 && (
            <View style={s.dropdown}>
              {extraResults.map(ing => (
                <TouchableOpacity
                  key={ing.id}
                  style={s.dropdownItem}
                  onPress={() => {
                    setExtras(prev => prev.find(e => e.id === ing.id) ? prev : [...prev, ing])
                    setExtraQuery('')
                    setExtraResults([])
                  }}
                >
                  <Text style={typography.body}>{ing.name}</Text>
                  <Text style={typography.caption}>+{ing.default_quantity_g}{ing.unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
        ) : null}

        <TouchableOpacity
          style={[s.primaryBtn, loading && { opacity: 0.5 }]}
          onPress={submitContext} disabled={loading} activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>Analyse nutritional value →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )

  // ── Result ─────────────────────────────────────────────────────────────

  if (step === STEPS.RESULT && nutritionResult) {
    const t = nutritionResult.total_nutrients
    const alerts = []

    // Check which nutrients exceed target (we'll use rough defaults here)
    const DEFAULTS = { calories: 2000, protein_g: 50, carbs_g: 275, fat_g: 65, sodium_mg: 2300 }
    Object.entries(DEFAULTS).forEach(([key, target]) => {
      if ((t[key] || 0) > target * 0.4) { // alert if single meal > 40% of daily
        alerts.push({ key, value: t[key], target, percent: Math.round(t[key] / target * 100) })
      }
    })

    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={[typography.h2, { marginBottom: spacing.md }]}>Nutrition breakdown</Text>

          {/* Food summary card */}
          <View style={[s.card, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }]}>
            <Text style={[typography.h3, { color: colors.primaryDark }]}>{nutritionResult.food_name}</Text>
            <Text style={[typography.bodySmall, { marginTop: 4 }]}>
              {nutritionResult.quantity_pieces} piece{nutritionResult.quantity_pieces !== 1 ? 's' : ''} ·{' '}
              {nutritionResult.quantity_grams}g ·{' '}
              {nutritionResult.source === 'home' ? '🏠 Home' : '🍽️ Restaurant'}
            </Text>
            {nutritionResult.oil_used !== 'none' && (
              <Text style={[typography.caption, { marginTop: 4, color: colors.warning }]}>
                Oil: {nutritionResult.oil_used} ({nutritionResult.oil_grams}g)
              </Text>
            )}
          </View>

          {/* Alerts */}
          {alerts.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.warningLight, borderLeftWidth: 4, borderLeftColor: colors.warning }]}>
              <Text style={[typography.label, { color: colors.warning, marginBottom: spacing.sm }]}>
                ⚠️ Nutritional alerts
              </Text>
              {alerts.map(a => (
                <Text key={a.key} style={[typography.bodySmall, { marginBottom: 4 }]}>
                  • {a.key.replace('_', ' ')}: {a.percent}% of daily target in one meal
                </Text>
              ))}
            </View>
          )}

          {/* Macros grid */}
          <View style={s.card}>
            <Text style={[typography.label, { marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: colors.textSecondary }]}>
              Macronutrients
            </Text>
            <View style={s.macroGrid}>
              {[
                { label: 'Calories', value: Math.round(t.calories || 0), unit: 'kcal', color: '#f97316' },
                { label: 'Protein', value: (t.protein_g || 0).toFixed(1), unit: 'g', color: '#3b82f6' },
                { label: 'Carbs', value: (t.carbs_g || 0).toFixed(1), unit: 'g', color: '#eab308' },
                { label: 'Fat', value: (t.fat_g || 0).toFixed(1), unit: 'g', color: '#ef4444' },
                { label: 'Fiber', value: (t.fiber_g || 0).toFixed(1), unit: 'g', color: '#22c55e' },
                { label: 'Sugar', value: (t.sugar_g || 0).toFixed(1), unit: 'g', color: '#a855f7' },
              ].map(m => (
                <View key={m.label} style={s.macroItem}>
                  <View style={[s.macroAccent, { backgroundColor: m.color }]} />
                  <Text style={[typography.h3, { fontSize: 20 }]}>{m.value}</Text>
                  <Text style={typography.caption}>{m.unit}</Text>
                  <Text style={[typography.caption, { marginTop: 2 }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Micronutrients */}
          <View style={s.card}>
            <Text style={[typography.label, { marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: colors.textSecondary }]}>
              Micronutrients
            </Text>
            <View style={s.microGrid}>
              {[
                { label: 'Sodium', value: (t.sodium_mg || 0).toFixed(0), unit: 'mg' },
                { label: 'Calcium', value: (t.calcium_mg || 0).toFixed(0), unit: 'mg' },
                { label: 'Iron', value: (t.iron_mg || 0).toFixed(1), unit: 'mg' },
                { label: 'Vitamin C', value: (t.vitamin_c_mg || 0).toFixed(1), unit: 'mg' },
                { label: 'Vitamin A', value: (t.vitamin_a_ug || 0).toFixed(0), unit: 'μg' },
                { label: 'Potassium', value: (t.potassium_mg || 0).toFixed(0), unit: 'mg' },
              ].map(m => (
                <View key={m.label} style={s.microItem}>
                  <Text style={[typography.h4, { fontSize: 15 }]}>{m.value}</Text>
                  <Text style={typography.caption}>{m.unit}</Text>
                  <Text style={[typography.caption, { marginTop: 2, textAlign: 'center' }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Extra ingredients breakdown */}
          {nutritionResult.extra_ingredients?.length > 0 && (
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.sm }]}>Extra ingredients added</Text>
              {nutritionResult.extra_ingredients.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                  <Text style={typography.bodySmall}>{e.name} ({e.quantity_g}g)</Text>
                  <Text style={typography.bodySmall}>{Math.round(e.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}

          {/* Log meal */}
          {!loggedMeal ? (
            <View>
              <Text style={[typography.label, { marginBottom: spacing.sm }]}>Log this as:</Text>
              <View style={s.logGrid}>
                {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={s.logBtn}
                    onPress={() => logMeal(type)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'dinner' ? '🌙' : '🍎'}
                    </Text>
                    <Text style={[typography.label, { color: colors.primary, textTransform: 'capitalize', marginTop: 4 }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: colors.successLight, borderColor: colors.success, borderWidth: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>✅</Text>
              <Text style={[typography.h3, { color: colors.success }]}>Meal logged!</Text>
            </View>
          )}

          <TouchableOpacity style={[s.secondaryBtn, { marginTop: spacing.md }]} onPress={resetAll}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Scan another meal</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Idle (home) ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[typography.h2, { marginBottom: spacing.xs }]}>What did you eat? 🍽️</Text>
        <Text style={[typography.bodySmall, { marginBottom: spacing.xl }]}>
          Take a photo or upload an image to analyse
        </Text>

        {/* Upload options */}
        <TouchableOpacity style={s.mainScanBtn} onPress={openCamera} activeOpacity={0.85}>
          <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>📷</Text>
          <Text style={[typography.h3, { color: colors.white }]}>Take a photo</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
            Use your camera to scan food
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryScanBtn} onPress={pickFromGallery} activeOpacity={0.85}>
          <Text style={{ fontSize: 36, marginRight: spacing.md }}>🖼️</Text>
          <View>
            <Text style={[typography.h3, { color: colors.primary }]}>Upload from gallery</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>Choose an existing photo</Text>
          </View>
        </TouchableOpacity>

        {/* Tips */}
        <View style={[s.card, { marginTop: spacing.lg }]}>
          <Text style={[typography.label, { marginBottom: spacing.sm }]}>📌 Tips for best results</Text>
          {[
            'Place food on a flat, well-lit surface',
            'Make sure the entire dish is visible',
            'Avoid blurry or dark photos',
            'One dish per photo works best',
          ].map((tip, i) => (
            <Text key={i} style={[typography.bodySmall, { marginBottom: 6 }]}>• {tip}</Text>
          ))}
        </View>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  mainScanBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md, ...shadows.md,
  },
  secondaryScanBtn: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primaryLight, ...shadows.sm,
  },
  previewImage: { width: '100%', height: 200, borderRadius: radius.lg, marginBottom: spacing.md },
  contextImage: { width: '100%', height: 160, borderRadius: radius.lg, marginBottom: spacing.md, resizeMode: 'cover' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  dropdown: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    marginTop: 4, backgroundColor: colors.surface, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  editBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  sourceCard: {
    flex: 1, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md, alignItems: 'center',
    backgroundColor: colors.surface,
  },
  sourceCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  extraTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  counterBtn: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface,
  },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroItem: {
    width: '30%', backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', flexGrow: 1,
  },
  macroAccent: { width: '100%', height: 3, borderRadius: 2, marginBottom: spacing.sm },
  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  microItem: {
    width: '30%', backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', flexGrow: 1,
  },
  logGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  logBtn: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface,
    borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  errorBox: { backgroundColor: colors.errorLight, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: colors.error, fontSize: 14 },
  cameraControls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingBottom: spacing.xl, paddingHorizontal: spacing.lg,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
})