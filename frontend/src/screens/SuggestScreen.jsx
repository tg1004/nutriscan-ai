import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, FlatList
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { suggestAPI, analyticsAPI } from '../services/api'
import { useTheme } from '../context/ThemeContext'

export default function SuggestScreen() {
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const [ingredientInput, setIngredientInput] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [dailyData, setDailyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const s = makeStyles(colors, spacing, radius, shadows)

  const addIngredient = () => {
    const trimmed = ingredientInput.trim()
    if (!trimmed || ingredients.includes(trimmed)) return
    setIngredients(prev => [...prev, trimmed])
    setIngredientInput('')
  }

  const removeIngredient = (ing) => {
    setIngredients(prev => prev.filter(i => i !== ing))
  }

  const getSuggestions = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient.')
      return
    }
    setLoading(true)
    setError('')
    setSuggestions([])
    try {
      const [suggestRes, analyticsRes] = await Promise.all([
        suggestAPI.getMeals(ingredients),
        analyticsAPI.daily(),
      ])
      setDailyData(analyticsRes.data)

      // Sort by how well they fill nutritional gaps
      const targets = analyticsRes.data.targets || {}
      const consumed = analyticsRes.data.totals || {}
      const sorted = (suggestRes.data.suggestions || []).sort((a, b) => {
        // Score: higher = better fills deficits
        const scoreA = calcDeficitScore(a.nutrition_per_piece, targets, consumed)
        const scoreB = calcDeficitScore(b.nutrition_per_piece, targets, consumed)
        return scoreB - scoreA
      })
      setSuggestions(sorted)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not fetch suggestions.')
    } finally {
      setLoading(false)
    }
  }

  const calcDeficitScore = (nutrition, targets, consumed) => {
    if (!nutrition || !targets) return 0
    let score = 0
    const keys = ['protein_g', 'fiber_g', 'calories']
    keys.forEach(k => {
      const deficit = (targets[k] || 0) - (consumed[k] || 0)
      if (deficit > 0 && nutrition[k] > 0) {
        score += Math.min(nutrition[k] / deficit, 1) * 100
      }
    })
    return score
  }

  const getDeficitTags = (nutrition) => {
    if (!dailyData) return []
    const targets = dailyData.targets || {}
    const consumed = dailyData.totals || {}
    const tags = []
    if ((targets.protein_g - consumed.protein_g) > 10 && nutrition.protein_g > 5) tags.push('💪 Protein boost')
    if ((targets.fiber_g - consumed.fiber_g) > 5 && nutrition.fiber_g > 2) tags.push('🌾 Fiber boost')
    if ((targets.calories - consumed.calories) > 300 && nutrition.calories > 100) tags.push('⚡ Energy boost')
    return tags
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Text style={[typography.h2, { marginBottom: spacing.xs }]}>💡 What can I make?</Text>
        <Text style={[typography.bodySmall, { marginBottom: spacing.xl }]}>
          Tell us what ingredients you have and we'll suggest meals that fill your nutritional gaps
        </Text>

        {/* Today's status */}
        {dailyData && (
          <View style={[s.card, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }]}>
            <Text style={[typography.label, { color: colors.primaryDark, marginBottom: spacing.sm }]}>
              Today's remaining targets
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { label: 'Calories', key: 'calories', unit: 'kcal' },
                { label: 'Protein', key: 'protein_g', unit: 'g' },
                { label: 'Fiber', key: 'fiber_g', unit: 'g' },
              ].map(item => {
                const remaining = Math.max(0, (dailyData.targets[item.key] || 0) - (dailyData.totals[item.key] || 0))
                return (
                  <View key={item.key} style={{ alignItems: 'center' }}>
                    <Text style={[typography.h3, { color: colors.primary }]}>
                      {Math.round(remaining)}
                    </Text>
                    <Text style={typography.caption}>{item.unit}</Text>
                    <Text style={typography.caption}>{item.label}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Ingredient input */}
        <View style={s.card}>
          <Text style={[typography.h3, { marginBottom: spacing.md }]}>Ingredients at home</Text>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={ingredientInput}
              onChangeText={setIngredientInput}
              placeholder="e.g. potato, wheat flour, ghee"
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={addIngredient}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addBtn} onPress={addIngredient}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Common ingredients quick-add */}
          <Text style={[typography.caption, { marginBottom: spacing.sm }]}>Quick add:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
            {['Potato', 'Wheat Flour', 'Ghee', 'Paneer', 'Egg', 'Onion', 'Rice'].map(ing => (
              <TouchableOpacity
                key={ing}
                style={[s.quickTag, ingredients.includes(ing) && s.quickTagActive]}
                onPress={() => {
                  if (ingredients.includes(ing)) {
                    removeIngredient(ing)
                  } else {
                    setIngredients(prev => [...prev, ing])
                  }
                }}
              >
                <Text style={[
                  { fontSize: 13 },
                  ingredients.includes(ing) ? { color: colors.primary, fontWeight: '600' } : { color: colors.textSecondary }
                ]}>
                  {ingredients.includes(ing) ? '✓ ' : '+ '}{ing}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected ingredients */}
          {ingredients.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
              {ingredients.map(ing => (
                <View key={ing} style={s.ingredientTag}>
                  <Text style={{ fontSize: 13, color: colors.primaryDark }}>{ing}</Text>
                  <TouchableOpacity onPress={() => removeIngredient(ing)}>
                    <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          <TouchableOpacity
            style={[s.primaryBtn, (loading || ingredients.length === 0) && { opacity: 0.5 }]}
            onPress={getSuggestions}
            disabled={loading || ingredients.length === 0}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>🔍 Find meals I can make</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Results */}
        {suggestions.length > 0 && (
          <View>
            <Text style={[typography.h3, { marginBottom: spacing.md }]}>
              {suggestions.length} meal{suggestions.length !== 1 ? 's' : ''} you can make
            </Text>

            {suggestions.map((item, index) => {
              const isExpanded = expandedId === item.food_item_id
              const deficitTags = getDeficitTags(item.nutrition_per_piece)

              return (
                <View key={item.food_item_id} style={s.suggestionCard}>
                  {index === 0 && (
                    <View style={s.bestMatchBadge}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>BEST MATCH</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : item.food_item_id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={typography.h3}>{item.name}</Text>
                        <Text style={[typography.bodySmall, { marginTop: 2 }]}>
                          {item.per_piece_calories ? `${Math.round(item.per_piece_calories)} kcal` : ''} per piece · {item.per_piece_grams}g
                        </Text>
                      </View>
                      <Text style={{ fontSize: 20, color: colors.textSecondary }}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                    </View>

                    {/* Nutrition quick stats */}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                      {[
                        { label: 'Cal', value: Math.round(item.nutrition_per_piece?.calories || 0) },
                        { label: 'Protein', value: `${(item.nutrition_per_piece?.protein_g || 0).toFixed(1)}g` },
                        { label: 'Carbs', value: `${(item.nutrition_per_piece?.carbs_g || 0).toFixed(1)}g` },
                        { label: 'Fat', value: `${(item.nutrition_per_piece?.fat_g || 0).toFixed(1)}g` },
                      ].map(n => (
                        <View key={n.label} style={s.miniStat}>
                          <Text style={[typography.label, { fontSize: 13 }]}>{n.value}</Text>
                          <Text style={[typography.caption, { fontSize: 11 }]}>{n.label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Deficit tags */}
                    {deficitTags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                        {deficitTags.map(tag => (
                          <View key={tag} style={s.deficitTag}>
                            <Text style={{ fontSize: 12, color: colors.primaryDark }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Expanded recipe */}
                  {isExpanded && (
                    <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={[typography.label, { marginBottom: spacing.sm }]}>📝 Recipe (per piece)</Text>
                      {item.recipe.map((r, i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                          <Text style={[typography.bodySmall, r.is_optional && { color: colors.textTertiary }]}>
                            {r.ingredient}{r.is_optional ? ' (optional)' : ''}
                          </Text>
                          <Text style={typography.bodySmall}>{r.quantity_g}g</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {suggestions.length === 0 && !loading && ingredients.length > 0 && (
          <View style={[s.card, { alignItems: 'center', paddingVertical: spacing.xl }]}>
            <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🤔</Text>
            <Text style={typography.h3}>No meals found</Text>
            <Text style={[typography.bodySmall, { textAlign: 'center', marginTop: spacing.sm }]}>
              Try adding more ingredients — common ones like wheat flour, salt, or oil unlock most meals.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.surface,
  },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    width: 48, justifyContent: 'center', alignItems: 'center',
  },
  quickTag: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  quickTagActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  ingredientTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
  },
  suggestionCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  bestMatchBadge: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: spacing.sm,
  },
  miniStat: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm,
    padding: spacing.sm, alignItems: 'center', flex: 1,
  },
  deficitTag: {
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorBox: { backgroundColor: colors.errorLight, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  errorText: { color: colors.error, fontSize: 14 },
})