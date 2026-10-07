import { useClerk, useUser } from '@clerk/expo'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { useStore } from '../src/data/store'
import { color, font, type } from '../src/theme'
import { ChevronRight } from '../src/ui/icons'
import { PressableRow, SectionHeading } from '../src/ui/kit'
import { PlainPage } from '../src/ui/Placeholder'

// Proposed menu (handoff §5.3). Only Personal records is built.
const LIFTS = ['deadlift', 'backSquat', 'benchPress', 'strictPress']
const LATER = ['Membership', 'Coaches', 'Settings']

export default function MenuScreen() {
  const store = useStore()
  const { signOut } = useClerk()
  const { user } = useUser()
  return (
    <PlainPage eyebrow="Alpha" title="Menu">
      <SectionHeading>Personal records</SectionHeading>
      <View style={styles.list}>
        {LIFTS.map((id) => {
          const max = store.liftStats(id, undefined, store.today).training
          return (
            <PressableRow key={id} accessibilityRole="link" onPress={() => router.push(`/record/${id}`)} style={styles.row}>
              <Text style={type.body}>{store.movementName(id)}</Text>
              <View style={styles.right}>
                <Text style={styles.value}>{max ? `${max.weight} lb` : '—'}</Text>
                <ChevronRight />
              </View>
            </PressableRow>
          )
        })}
      </View>
      <View style={[styles.list, { marginTop: 28 }]}>
        {LATER.map((label) => (
          <View key={label} style={styles.row}>
            <Text style={[type.body, { color: color.muted }]}>{label}</Text>
            <Text style={type.monoLabel}>Soon</Text>
          </View>
        ))}
      </View>
      <View style={[styles.list, { marginTop: 28 }]}>
        <PressableRow accessibilityRole="button" onPress={() => void signOut()} style={styles.row}>
          <View style={{ gap: 2 }}>
            <Text style={type.body}>Sign out</Text>
            {user?.primaryEmailAddress && <Text style={styles.value}>{user.primaryEmailAddress.emailAddress}</Text>}
          </View>
        </PressableRow>
      </View>
    </PlainPage>
  )
}

const styles = StyleSheet.create({
  list: { marginTop: 12, borderTopWidth: 1, borderTopColor: color.line },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { fontFamily: font.mono, fontSize: 15, color: color.muted },
})
