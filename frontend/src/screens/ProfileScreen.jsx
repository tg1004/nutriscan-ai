import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'

export default function ProfileScreen() {
  const { colors, typography, spacing } = useTheme()
  const styles = createStyles(colors, typography, spacing)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>User profile and nutrition targets. Coming in Phase 2.</Text>
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
