import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'

export default function LogScreen() {
  const { colors, typography, spacing } = useTheme()
  const styles = createStyles(colors, typography, spacing)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📋</Text>
        <Text style={styles.title}>Meal log</Text>
        <Text style={styles.sub}>Your daily food log will appear here. Coming in Phase 4.</Text>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors, typography, spacing) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: { ...typography.h2, marginBottom: spacing.sm },
  sub: { ...typography.bodySmall, textAlign: 'center' },
})
