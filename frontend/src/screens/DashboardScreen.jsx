import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import useAuthStore from '../store/authStore'
import { useTheme } from '../context/ThemeContext'

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuthStore()
  const { colors, typography, spacing, radius, shadows } = useTheme()
  const styles = createStyles(colors, typography, spacing, radius, shadows)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Today's summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's calories</Text>
          <Text style={styles.calorieNumber}>0</Text>
          <Text style={styles.calorieGoal}>of 2000 kcal goal</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
        </View>

        {/* Macro row */}
        <View style={styles.macroRow}>
          {[
            { label: 'Protein', value: '0g', color: '#3b82f6' },
            { label: 'Carbs', value: '0g', color: '#f59e0b' },
            { label: 'Fat', value: '0g', color: '#ef4444' },
          ].map(m => (
            <View key={m.label} style={styles.macroCard}>
              <View style={[styles.macroBar, { backgroundColor: m.color }]} />
              <Text style={styles.macroValue}>{m.value}</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Scan CTA */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.85}
        >
          <Text style={styles.scanEmoji}>📷</Text>
          <View>
            <Text style={styles.scanTitle}>Scan your meal</Text>
            <Text style={styles.scanSub}>Take a photo to log nutrition</Text>
          </View>
        </TouchableOpacity>

        {/* Coming soon */}
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            📊 Full dashboard with charts coming in Phase 4
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors, typography, spacing, radius, shadows) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: { ...typography.h3 },
  email: { ...typography.caption, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { ...typography.caption, color: colors.textSecondary },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: spacing.xs },
  calorieNumber: { color: colors.white, fontSize: 48, fontWeight: '700' },
  calorieGoal: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: spacing.md },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: radius.full,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.white,
    borderRadius: radius.full,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  macroBar: { width: 32, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  macroValue: { ...typography.h3, marginBottom: 2 },
  macroLabel: { ...typography.caption },
  scanButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    ...shadows.sm,
  },
  scanEmoji: { fontSize: 40 },
  scanTitle: { ...typography.h3, color: colors.primary },
  scanSub: { ...typography.bodySmall, marginTop: 2 },
  comingSoon: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  comingSoonText: { ...typography.bodySmall, textAlign: 'center' },
})
