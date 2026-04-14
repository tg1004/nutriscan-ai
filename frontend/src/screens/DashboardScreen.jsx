import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg'
import { analyticsAPI } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import useAuthStore from '../store/authStore'
import { useFocusEffect } from '@react-navigation/native'

const { width } = Dimensions.get('window')

// ── Simple ring chart ──────────────────────────────────────────────────────
function RingChart({ percent, color, size = 80, label, value, unit }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const strokeDash = Math.min(percent / 100, 1) * circ
  const { colors, typography } = useTheme()
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2},${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={8} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={8} fill="none"
            strokeDasharray={`${strokeDash} ${circ}`}
            strokeLinecap="round"
          />
        </G>
        <SvgText x={size / 2} y={size / 2 + 5}
          textAnchor="middle" fontSize="13" fontWeight="700" fill={colors.text}>
          {Math.round(percent)}%
        </SvgText>
      </Svg>
      <Text style={[typography.label, { fontSize: 13, marginTop: 4 }]}>{value}</Text>
      <Text style={[typography.caption, { fontSize: 11 }]}>{unit}</Text>
      <Text style={[typography.caption, { marginTop: 1 }]}>{label}</Text>
    </View>
  )
}

// ── Simple bar chart ───────────────────────────────────────────────────────
function BarChart({ data, color, target }) {
  const { colors, typography, spacing, radius } = useTheme()
  const maxVal = Math.max(...data.map(d => d.calories || 0), target || 1)
  const barWidth = (width - spacing.lg * 2 - spacing.md * 2 - (data.length - 1) * 4) / data.length

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
        {data.map((d, i) => {
          const h = Math.max(4, ((d.calories || 0) / maxVal) * 110)
          const isToday = i === data.length - 1
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 120 }}>
              <View style={{
                width: '100%', height: h,
                backgroundColor: isToday ? color : colors.border,
                borderRadius: radius.sm,
              }} />
            </View>
          )
        })}
      </View>
      {/* Day labels */}
      <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.xs }}>
        {data.map((d, i) => {
          const day = new Date(d.date).toLocaleDateString('en', { weekday: 'short' })
          const isToday = i === data.length - 1
          return (
            <Text key={i} style={[typography.caption, { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: isToday ? '700' : '400', color: isToday ? color : colors.textTertiary }]}>
              {day}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('daily')
  const [dailyData, setDailyData] = useState(null)
  const [weeklyData, setWeeklyData] = useState(null)
  const [loading, setLoading] = useState(true)

  const s = makeStyles(colors, spacing, radius, shadows)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [daily, weekly] = await Promise.all([
        analyticsAPI.daily(),
        analyticsAPI.weekly(),
      ])
      setDailyData(daily.data)
      setWeeklyData(weekly.data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  // Reload every time this tab is focused
  useFocusEffect(loadData)

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  )

  const targets = dailyData?.targets || {}
  const totals = dailyData?.totals || {}
  const meals = dailyData?.meals || []
  const alerts = dailyData?.alerts || []

  const calPercent = targets.calories ? (totals.calories / targets.calories) * 100 : 0
  const calRemaining = Math.max(0, (targets.calories || 2000) - (totals.calories || 0))

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg }}>
          <View>
            <Text style={[typography.caption, { color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 }]}>
              {getGreeting()}
            </Text>
            <Text style={typography.h2}>{user?.email?.split('@')[0] || 'There'} 👋</Text>
          </View>
          <Text style={{ fontSize: 32 }}>📊</Text>
        </View>

        {/* Tab selector */}
        <View style={s.tabRow}>
          {['daily', 'weekly'].map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, tab === t && s.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[typography.label, { fontSize: 13 }, tab === t && { color: colors.primary }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DAILY TAB ─────────────────────────────────────────────── */}
        {tab === 'daily' && (
          <>
            {/* Calorie hero card */}
            <View style={[s.heroCard, { backgroundColor: calPercent >= 100 ? colors.warningLight : colors.primaryLight }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[typography.caption, { color: calPercent >= 100 ? colors.warning : colors.primary, textTransform: 'uppercase', letterSpacing: 1 }]}>
                    {calPercent >= 100 ? 'Daily limit reached' : 'Calories today'}
                  </Text>
                  <Text style={[typography.h1, { color: calPercent >= 100 ? colors.warning : colors.primaryDark, fontSize: 42 }]}>
                    {Math.round(totals.calories || 0)}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    of {targets.calories || 2000} kcal · {Math.round(calRemaining)} remaining
                  </Text>
                </View>
                <RingChart
                  percent={calPercent}
                  color={calPercent >= 100 ? colors.warning : colors.primary}
                  size={90}
                  label="Done"
                  value={`${Math.round(calPercent)}%`}
                  unit=""
                />
              </View>

              {/* Progress bar */}
              <View style={[s.progressTrack, { marginTop: spacing.md }]}>
                <View style={[s.progressFill, {
                  width: `${Math.min(calPercent, 100)}%`,
                  backgroundColor: calPercent >= 100 ? colors.warning : colors.primary,
                }]} />
              </View>
            </View>

            {/* Macro rings */}
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.lg, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: colors.textSecondary }]}>
                Macronutrients
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[
                  { key: 'protein_g', label: 'Protein', color: colors.chart2, unit: 'g' },
                  { key: 'carbs_g', label: 'Carbs', color: colors.chart3, unit: 'g' },
                  { key: 'fat_g', label: 'Fat', color: colors.chart4, unit: 'g' },
                  { key: 'fiber_g', label: 'Fiber', color: colors.chart1, unit: 'g' },
                ].map(m => (
                  <RingChart
                    key={m.key}
                    percent={targets[m.key] ? (totals[m.key] / targets[m.key]) * 100 : 0}
                    color={m.color}
                    size={72}
                    label={m.label}
                    value={(totals[m.key] || 0).toFixed(1)}
                    unit={m.unit}
                  />
                ))}
              </View>
            </View>

            {/* Alerts */}
            {alerts.length > 0 && (
              <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: colors.warning, backgroundColor: colors.warningLight }]}>
                <Text style={[typography.label, { color: colors.warning, marginBottom: spacing.sm }]}>
                  ⚠️ Over daily target
                </Text>
                {alerts.map(a => (
                  <View key={a.nutrient} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={typography.bodySmall}>{a.nutrient.replace('_', ' ')}</Text>
                    <Text style={[typography.bodySmall, { color: colors.warning, fontWeight: '600' }]}>
                      {a.percent}% of target
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Today's meals */}
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.md }]}>Today's meals</Text>
              {meals.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>🍽️</Text>
                  <Text style={typography.bodySmall}>No meals logged today</Text>
                </View>
              ) : (
                meals.map(meal => (
                  <View key={meal.id} style={s.mealRow}>
                    <View style={s.mealDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.label, { textTransform: 'capitalize' }]}>{meal.meal_type}</Text>
                      <Text style={typography.caption}>
                        {Math.round(meal.calories || 0)} kcal · P: {(meal.protein_g || 0).toFixed(1)}g · C: {(meal.carbs_g || 0).toFixed(1)}g
                      </Text>
                    </View>
                    <Text style={[typography.bodySmall, { color: colors.primary }]}>
                      {Math.round(meal.calories || 0)} cal
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Micronutrients progress */}
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: colors.textSecondary }]}>
                Micronutrients
              </Text>
              {[
                { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
                { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
                { key: 'iron_mg', label: 'Iron', unit: 'mg' },
                { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg' },
                { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
              ].map(m => {
                const val = totals[m.key] || 0
                const target = targets[m.key] || 1
                const pct = Math.min((val / target) * 100, 100)
                const over = val > target
                return (
                  <View key={m.key} style={{ marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={typography.bodySmall}>{m.label}</Text>
                      <Text style={[typography.caption, over && { color: colors.warning }]}>
                        {val.toFixed(0)} / {target} {m.unit}
                        {over ? ' ⚠️' : ''}
                      </Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, {
                        width: `${pct}%`,
                        backgroundColor: over ? colors.warning : colors.chart2,
                      }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* ── WEEKLY TAB ────────────────────────────────────────────── */}
        {tab === 'weekly' && weeklyData && (
          <>
            {/* Weekly calorie chart */}
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.md }]}>Calories this week</Text>
              <BarChart
                data={weeklyData.days}
                color={colors.primary}
                target={weeklyData.targets?.calories}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={typography.h3}>
                    {Math.round(weeklyData.days.reduce((s, d) => s + (d.calories || 0), 0) / 7)}
                  </Text>
                  <Text style={typography.caption}>Avg/day kcal</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={typography.h3}>
                    {weeklyData.days.filter(d => d.calories > 0).length}
                  </Text>
                  <Text style={typography.caption}>Days logged</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={typography.h3}>
                    {Math.round(weeklyData.days.reduce((s, d) => s + (d.calories || 0), 0))}
                  </Text>
                  <Text style={typography.caption}>Total kcal</Text>
                </View>
              </View>
            </View>

            {/* Weekly macros */}
            <View style={s.card}>
              <Text style={[typography.label, { marginBottom: spacing.md }]}>Weekly macro averages</Text>
              {[
                { key: 'protein_g', label: 'Protein', color: colors.chart2, unit: 'g' },
                { key: 'carbs_g', label: 'Carbohydrates', color: colors.chart3, unit: 'g' },
                { key: 'fat_g', label: 'Fat', color: colors.chart4, unit: 'g' },
              ].map(m => {
                const avg = weeklyData.days.reduce((s, d) => s + (d[m.key] || 0), 0) / 7
                const target = weeklyData.targets?.[m.key] || 1
                const pct = Math.min((avg / target) * 100, 100)
                return (
                  <View key={m.key} style={{ marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={typography.bodySmall}>{m.label}</Text>
                      <Text style={typography.caption}>{avg.toFixed(1)} / {target}{m.unit} avg</Text>
                    </View>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (colors, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  heroCard: { borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  tabRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, marginBottom: spacing.lg, ...shadows.sm },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.md },
  tabBtnActive: { backgroundColor: colors.primaryLight },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  mealDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
})