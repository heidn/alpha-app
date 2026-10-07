import { useClerk, useUser } from '@clerk/expo'
import { router } from 'expo-router'
import { useStore } from '../src/data/store'
import { ChevronRight, Layout, ListRow, Screen, Text } from '../src/ui'

// Proposed menu (handoff §5.3). Only Personal records is built.
const LIFTS = ['deadlift', 'backSquat', 'benchPress', 'strictPress']
const LATER = ['Membership', 'Coaches', 'Settings']

export default function MenuScreen() {
  const store = useStore()
  const { signOut } = useClerk()
  const { user } = useUser()
  return (
    <Screen header={{ nav: 'back', eyebrow: 'Alpha', title: 'Menu' }}>
      <Text variant="heading">Personal records</Text>
      <Layout className="mt-3 border-t border-line">
        {LIFTS.map((id) => {
          const max = store.liftStats(id, undefined, store.today).training
          return (
            <ListRow key={id} onPress={() => router.push(`/record/${id}`)} accessibilityLabel={store.movementName(id)}>
              <Text>{store.movementName(id)}</Text>
              <Layout row center className="gap-2.5">
                <Text variant="mono">{max ? `${max.weight} lb` : '—'}</Text>
                <ChevronRight />
              </Layout>
            </ListRow>
          )
        })}
      </Layout>

      <Layout className="mt-7 border-t border-line">
        {LATER.map((label) => (
          <ListRow key={label}>
            <Text className="text-muted">{label}</Text>
            <Text variant="label">Soon</Text>
          </ListRow>
        ))}
      </Layout>

      <Layout className="mt-7 border-t border-line">
        <ListRow onPress={() => void signOut()} accessibilityLabel="Sign out">
          <Layout className="gap-0.5">
            <Text>Sign out</Text>
            {user?.primaryEmailAddress && <Text variant="mono">{user.primaryEmailAddress.emailAddress}</Text>}
          </Layout>
        </ListRow>
      </Layout>
    </Screen>
  )
}
