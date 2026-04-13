import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { foodAPI, logAPI } from '../services/api'
import { useTheme } from '../context/ThemeContext'
const STEPS = {
  CHOOSE: 'choose',
  CAMERA: 'camera',
  BARCODE: 'barcode',
  CONTEXT: 'context',
  RESULT: 'result',
}

export default function ScanScreen({ navigation }) {
  const [step, setStep] = useState(STEPS.CHOOSE)
  const [permission, requestPermission] = useCameraPermissions()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detectedFood, setDetectedFood] = useState(null)
  const [source, setSource] = useState(null)
  const [pieces, setPieces] = useState(1)
  const [extras, setExtras] = useState([])
  const [extraQuery, setExtraQuery] = useState('')
  const [extraResults, setExtraResults] = useState([])
  const [nutritionResult, setNutritionResult] = useState(null)
  const scanned = useRef(false)
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const styles = createStyles(colors, typography, spacing, radius, shadows)

  const requestCameraAndStart = async (mode) => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        Alert.alert('Camera needed', 'Please allow camera access to scan food.')
        return
      }
    }
    scanned.current = false
    setStep(mode)
  }

  const handleBarcodeScan = async ({ data }) => {
    if (scanned.current) return
    scanned.current = true
    setLoading(true)
    setError('')
    try {
      const res = await foodAPI.barcodeLookup(data)
      setDetectedFood({
        food_item_id: res.data.food_item_id,
        food_name: res.data.product_name,
        brand: res.data.brand,
        isBarcode: true,
      })
      setStep(STEPS.CONTEXT)
    } catch (err) {
      setError(err.response?.data?.detail || 'Product not found.')
      scanned.current = false
    } finally {
      setLoading(false)
    }
  }

  const searchExtras = async (q) => {
    setExtraQuery(q)
    if (q.length < 2) { setExtraResults([]); return }
    try {
      const res = await foodAPI.searchIngredients(q)
      setExtraResults(res.data)
    } catch { setExtraResults([]) }
  }

  const submitContext = async () => {
    if (!source && !detectedFood?.isBarcode) {
      setError('Please select home or restaurant.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await foodAPI.resolveContext({
        food_item_id: detectedFood.food_item_id,
        quantity_pieces: pieces,
        source: source || 'home',
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

  const logMeal = async (mealType) => {
    setLoading(true)
    try {
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
          ...nutritionResult.total_nutrients,
        }]
      })
      navigation.navigate('Dashboard')
    } catch {
      setError('Failed to save meal.')
    } finally {
      setLoading(false)
    }
  }

  // ── CHOOSE MODE ──────────────────────────────────────────────────────────
  if (step === STEPS.CHOOSE) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chooseContent}>
        <Text style={styles.chooseEmoji}>🍽️</Text>
        <Text style={styles.chooseTitle}>Add a meal</Text>
        <Text style={styles.chooseSub}>How do you want to identify your food?</Text>

        <TouchableOpacity
          style={styles.modeButton}
          onPress={() => requestCameraAndStart(STEPS.CAMERA)}
          activeOpacity={0.85}
        >
          <Text style={styles.modeEmoji}>📷</Text>
          <View>
            <Text style={styles.modeTitle}>Photo scan</Text>
            <Text style={styles.modeSub}>Take a photo of your food</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, styles.modeBorder]}
          onPress={() => requestCameraAndStart(STEPS.BARCODE)}
          activeOpacity={0.85}
        >
          <Text style={styles.modeEmoji}>📦</Text>
          <View>
            <Text style={styles.modeTitle}>Barcode scan</Text>
            <Text style={styles.modeSub}>For packaged products</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  // ── CAMERA ───────────────────────────────────────────────────────────────
  if (step === STEPS.CAMERA || step === STEPS.BARCODE) return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={step === STEPS.BARCODE ? handleBarcodeScan : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
      />

      {step === STEPS.BARCODE && (
        <View style={styles.barcodeOverlay}>
          <View style={styles.barcodeFrame} />
          <Text style={styles.barcodeHint}>Point at barcode</Text>
        </View>
      )}

      {loading && (
        <View style={styles.cameraLoading}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.cameraLoadingText}>Looking up product...</Text>
        </View>
      )}

      {error ? (
        <View style={styles.cameraError}>
          <Text style={styles.cameraErrorText}>{error}</Text>
        </View>
      ) : null}

      <SafeAreaView style={styles.cameraControls}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => { setStep(STEPS.CHOOSE); setError('') }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {step === STEPS.CAMERA && (
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => {
              // Phase 3: wire to ML model
              // For now simulate detection
              setDetectedFood({
                food_item_id: 'PLACEHOLDER',
                food_name: 'Aloo Paratha',
                confidence: 0.94,
                isBarcode: false,
              })
              setStep(STEPS.CONTEXT)
            }}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  )

  // ── CONTEXT ──────────────────────────────────────────────────────────────
  if (step === STEPS.CONTEXT) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => setStep(STEPS.CHOOSE)} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Detected food */}
        <View style={styles.detectedCard}>
          <Text style={styles.detectedLabel}>Detected</Text>
          <Text style={styles.detectedName}>{detectedFood?.food_name}</Text>
          {detectedFood?.brand && (
            <Text style={styles.detectedBrand}>{detectedFood.brand}</Text>
          )}
          {detectedFood?.confidence && (
            <Text style={styles.detectedConf}>
              {Math.round(detectedFood.confidence * 100)}% confidence
            </Text>
          )}
        </View>

        {/* Pieces */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How many pieces?</Text>
          <View style={styles.counter}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPieces(p => Math.max(0.5, +(p - 0.5).toFixed(1)))}
            >
              <Text style={styles.counterBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{pieces}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setPieces(p => +(p + 0.5).toFixed(1))}
            >
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Home vs Restaurant */}
        {!detectedFood?.isBarcode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where is it from?</Text>
            <Text style={styles.sectionSub}>This affects the oil calculation</Text>
            <View style={styles.sourceRow}>
              {[
                { value: 'home', emoji: '🏠', label: 'Home cooked', sub: 'Less oil (ghee)' },
                { value: 'restaurant', emoji: '🍽️', label: 'Restaurant', sub: 'More oil (refined)' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sourceCard, source === opt.value && styles.sourceCardActive]}
                  onPress={() => setSource(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sourceEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.sourceLabel, source === opt.value && styles.sourceLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.sourceSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Extra ingredients */}
        {!detectedFood?.isBarcode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extra ingredients?</Text>
            <Text style={styles.sectionSub}>Added beyond the standard recipe</Text>

            {extras.length > 0 && (
              <View style={styles.extraTags}>
                {extras.map(e => (
                  <View key={e.id} style={styles.extraTag}>
                    <Text style={styles.extraTagText}>{e.name} ({e.default_quantity_g}g)</Text>
                    <TouchableOpacity onPress={() => setExtras(prev => prev.filter(x => x.id !== e.id))}>
                      <Text style={styles.extraTagRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={styles.input}
              value={extraQuery}
              onChangeText={searchExtras}
              placeholder="Search: cheese, butter, egg..."
              placeholderTextColor={colors.textTertiary}
            />

            {extraResults.length > 0 && (
              <View style={styles.extraResults}>
                {extraResults.map(ing => (
                  <TouchableOpacity
                    key={ing.id}
                    style={styles.extraResultItem}
                    onPress={() => {
                      setExtras(prev => prev.find(e => e.id === ing.id) ? prev : [...prev, ing])
                      setExtraQuery('')
                      setExtraResults([])
                    }}
                  >
                    <Text style={styles.extraResultName}>{ing.name}</Text>
                    <Text style={styles.extraResultQty}>+{ing.default_quantity_g}{ing.unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={submitContext}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.primaryBtnText}>Calculate nutrition →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (step === STEPS.RESULT && nutritionResult) {
    const t = nutritionResult.total_nutrients
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.resultTitle}>Nutrition breakdown</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultFoodName}>{nutritionResult.food_name}</Text>
            <Text style={styles.resultMeta}>
              {nutritionResult.quantity_pieces} piece{nutritionResult.quantity_pieces !== 1 ? 's' : ''} ·{' '}
              {nutritionResult.quantity_grams}g ·{' '}
              {nutritionResult.source === 'home' ? '🏠 Home' : '🍽️ Restaurant'}
            </Text>
            {nutritionResult.oil_used !== 'none' && (
              <Text style={styles.resultOil}>
                Oil: {nutritionResult.oil_used} ({nutritionResult.oil_grams}g)
              </Text>
            )}
          </View>

          {/* Macros */}
          <View style={styles.macroGrid}>
            {[
              { label: 'Calories', value: Math.round(t.calories), unit: 'kcal', color: '#f97316' },
              { label: 'Protein', value: t.protein_g?.toFixed(1), unit: 'g', color: '#3b82f6' },
              { label: 'Carbs', value: t.carbs_g?.toFixed(1), unit: 'g', color: '#eab308' },
              { label: 'Fat', value: t.fat_g?.toFixed(1), unit: 'g', color: '#ef4444' },
              { label: 'Fiber', value: t.fiber_g?.toFixed(1), unit: 'g', color: '#22c55e' },
              { label: 'Sugar', value: t.sugar_g?.toFixed(1), unit: 'g', color: '#a855f7' },
            ].map(m => (
              <View key={m.label} style={styles.macroItem}>
                <View style={[styles.macroAccent, { backgroundColor: m.color }]} />
                <Text style={styles.macroVal}>{m.value}</Text>
                <Text style={styles.macroUnit}>{m.unit}</Text>
                <Text style={styles.macroLbl}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Extras */}
          {nutritionResult.extra_ingredients?.length > 0 && (
            <View style={styles.extrasCard}>
              <Text style={styles.extrasTitle}>Extra ingredients</Text>
              {nutritionResult.extra_ingredients.map((e, i) => (
                <View key={i} style={styles.extrasRow}>
                  <Text style={styles.extrasName}>{e.name} ({e.quantity_g}g)</Text>
                  <Text style={styles.extrasKcal}>{Math.round(e.calories)} kcal</Text>
                </View>
              ))}
            </View>
          )}

          {/* Log as */}
          <Text style={styles.logTitle}>Log this as:</Text>
          <View style={styles.logGrid}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
              <TouchableOpacity
                key={type}
                style={styles.logBtn}
                onPress={() => logMeal(type)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.logBtnText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}

const createStyles = (colors, typography, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },

  // Choose
  chooseContent: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  chooseEmoji: { fontSize: 64, textAlign: 'center', marginBottom: spacing.md },
  chooseTitle: { ...typography.h1, textAlign: 'center', marginBottom: spacing.xs },
  chooseSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  modeButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  modeBorder: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modeEmoji: { fontSize: 36 },
  modeTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  modeSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: colors.black },
  barcodeOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  barcodeFrame: { width: 280, height: 120, borderWidth: 2, borderColor: colors.white, borderRadius: radius.md },
  barcodeHint: { color: colors.white, marginTop: spacing.md, fontSize: 14 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  cameraLoadingText: { color: colors.white, marginTop: spacing.sm },
  cameraError: { position: 'absolute', top: 60, left: spacing.lg, right: spacing.lg, backgroundColor: '#dc2626', borderRadius: radius.md, padding: spacing.md },
  cameraErrorText: { color: colors.white, fontSize: 14 },
  cameraControls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  cancelText: { color: colors.white, fontSize: 15 },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.white },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.white },

  // Context
  backBtn: { marginBottom: spacing.md },
  backText: { ...typography.bodySmall, color: colors.textSecondary },
  detectedCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  detectedLabel: { ...typography.caption, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  detectedName: { ...typography.h2, marginBottom: spacing.xs },
  detectedBrand: { ...typography.bodySmall },
  detectedConf: { ...typography.caption, marginTop: 4 },
  section: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  sectionTitle: { ...typography.h3, marginBottom: spacing.xs },
  sectionSub: { ...typography.caption, marginBottom: spacing.md },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  counterBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 22, color: colors.text },
  counterValue: { ...typography.h1, minWidth: 48, textAlign: 'center' },
  sourceRow: { flexDirection: 'row', gap: spacing.sm },
  sourceCard: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  sourceCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sourceEmoji: { fontSize: 28, marginBottom: spacing.xs },
  sourceLabel: { ...typography.label, textAlign: 'center' },
  sourceLabelActive: { color: colors.primary },
  sourceSub: { ...typography.caption, textAlign: 'center', marginTop: 2 },
  extraTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  extraTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, gap: spacing.xs },
  extraTagText: { fontSize: 13, color: colors.primaryDark },
  extraTagRemove: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 15, color: colors.text },
  extraResults: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' },
  extraResultItem: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  extraResultName: { ...typography.body },
  extraResultQty: { ...typography.caption },
  errorText: { color: colors.error, fontSize: 14, marginBottom: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  // Result
  resultTitle: { ...typography.h2, marginBottom: spacing.md },
  resultCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  resultFoodName: { ...typography.h3, marginBottom: spacing.xs },
  resultMeta: { ...typography.bodySmall },
  resultOil: { ...typography.caption, marginTop: 4, color: colors.warning },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  macroItem: { width: '30%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  macroAccent: { width: '100%', height: 3, borderRadius: 2, marginBottom: spacing.sm },
  macroVal: { ...typography.h3 },
  macroUnit: { ...typography.caption },
  macroLbl: { ...typography.caption, marginTop: 2 },
  extrasCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  extrasTitle: { ...typography.label, marginBottom: spacing.sm },
  extrasRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  extrasName: { ...typography.bodySmall },
  extrasKcal: { ...typography.bodySmall },
  logTitle: { ...typography.label, marginBottom: spacing.sm },
  logGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  logBtn: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  logBtnText: { ...typography.label, color: colors.primary, textTransform: 'capitalize' },
})
