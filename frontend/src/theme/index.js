export const lightColors = {
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#f0fdf4',
  accent: '#aa3bff',
  accentLight: 'rgba(170,59,255,0.1)',
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  error: '#ef4444',
  errorLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  success: '#22c55e',
  successLight: '#f0fdf4',
  info: '#3b82f6',
  infoLight: '#eff6ff',
  white: '#ffffff',
  black: '#000000',
  chart1: '#22c55e',
  chart2: '#3b82f6',
  chart3: '#f59e0b',
  chart4: '#ef4444',
  chart5: '#a855f7',
  chart6: '#06b6d4',
}

export const darkColors = {
  primary: '#4ade80',
  primaryDark: '#22c55e',
  primaryLight: '#052e16',
  accent: '#c084fc',
  accentLight: 'rgba(192,132,252,0.15)',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceSecondary: '#0f172a',
  border: '#334155',
  borderLight: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textTertiary: '#475569',
  error: '#f87171',
  errorLight: '#1a0a0a',
  warning: '#fbbf24',
  warningLight: '#1a1500',
  success: '#4ade80',
  successLight: '#052e16',
  info: '#60a5fa',
  infoLight: '#0a1628',
  white: '#ffffff',
  black: '#000000',
  chart1: '#4ade80',
  chart2: '#60a5fa',
  chart3: '#fbbf24',
  chart4: '#f87171',
  chart5: '#c084fc',
  chart6: '#22d3ee',
}

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
}

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
}

export const getTypography = (colors) => ({
  h1: { fontSize: 28, fontWeight: '700', color: colors.text },
  h2: { fontSize: 22, fontWeight: '600', color: colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text },
  h4: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: colors.textTertiary },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  labelSmall: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
})

// ── Diet targets ───────────────────────────────────────────────────────────
export const DIET_TARGETS = {
  balanced: {
    label: 'Balanced diet',
    calories: 2000, protein_g: 50, carbs_g: 275, fat_g: 65,
    fiber_g: 28, sugar_g: 50, sodium_mg: 2300, calcium_mg: 1000,
    iron_mg: 18, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 3500, magnesium_mg: 420,
  },
  keto: {
    label: 'Keto',
    calories: 1800, protein_g: 120, carbs_g: 25, fat_g: 140,
    fiber_g: 20, sugar_g: 10, sodium_mg: 3000, calcium_mg: 1000,
    iron_mg: 18, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 3500, magnesium_mg: 420,
  },
  vegan: {
    label: 'Vegan',
    calories: 2000, protein_g: 55, carbs_g: 300, fat_g: 55,
    fiber_g: 38, sugar_g: 50, sodium_mg: 2300, calcium_mg: 1200,
    iron_mg: 32, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 4700, magnesium_mg: 420,
  },
  vegetarian: {
    label: 'Vegetarian',
    calories: 2000, protein_g: 50, carbs_g: 280, fat_g: 65,
    fiber_g: 32, sugar_g: 50, sodium_mg: 2300, calcium_mg: 1200,
    iron_mg: 24, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 3500, magnesium_mg: 420,
  },
  high_protein: {
    label: 'High protein',
    calories: 2200, protein_g: 180, carbs_g: 220, fat_g: 70,
    fiber_g: 28, sugar_g: 40, sodium_mg: 2300, calcium_mg: 1000,
    iron_mg: 18, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 3500, magnesium_mg: 420,
  },
  low_carb: {
    label: 'Low carb',
    calories: 1800, protein_g: 100, carbs_g: 80, fat_g: 120,
    fiber_g: 25, sugar_g: 20, sodium_mg: 2300, calcium_mg: 1000,
    iron_mg: 18, vitamin_c_mg: 90, vitamin_a_ug: 900,
    potassium_mg: 3500, magnesium_mg: 420,
  },
}

export const GOAL_ADJUSTMENTS = {
  weight_loss: -500,
  muscle_gain: 300,
  maintenance: 0,
  overall_health: 0,
  performance: 400,
}