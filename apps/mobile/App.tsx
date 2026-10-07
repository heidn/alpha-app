import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { ROLES } from '../../convex/roles'

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>A</Text>
      </View>
      <Text style={styles.title}>Alpha Strength</Text>
      <Text style={styles.subtitle}>Train with purpose.</Text>
      <Text style={styles.meta}>Roles from shared backend: {ROLES.join(' · ')}</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e5483b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', color: '#121826' },
  subtitle: { fontSize: 16, color: '#5b6475' },
  meta: { marginTop: 24, fontSize: 12, color: '#5b6475' },
})
