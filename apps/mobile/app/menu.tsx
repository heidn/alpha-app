import { useClerk, useUser } from '@clerk/expo'
import { useQuery } from 'convex/react'
import { Linking } from 'react-native'
import { api } from '../../../convex/_generated/api'
import { webUrl } from '../src/auth/config'
import { Screen } from '../src/shell/Screen'
import { ArrowRight, Layout, ListRow, Text } from '../src/ui'

// Web app pages, mirroring the web nav (apps/web AppShell): Home for everyone, the rest by role.
const WEB_PAGES = [
  { label: 'Home', hash: '#/', roles: ['athlete', 'coach', 'admin'] },
  { label: 'Gyms', hash: '#/gyms', roles: ['coach', 'admin'] },
  { label: 'Workouts', hash: '#/workouts', roles: ['coach', 'admin'] },
  { label: 'Library', hash: '#/library', roles: ['coach', 'admin'] },
  { label: 'Users', hash: '#/admin', roles: ['admin'] },
] as const

export default function MenuScreen() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const me = useQuery(api.users.current)
  const role = me?.role ?? 'athlete'
  const pages = WEB_PAGES.filter((p) => (p.roles as readonly string[]).includes(role))

  return (
    <Screen header={{ nav: 'back', eyebrow: 'Alpha', title: 'Menu' }}>
      <Text variant="heading">On the web</Text>
      <Layout className="mt-3 border-t border-line">
        {pages.map((p) => (
          <ListRow key={p.hash} onPress={() => void Linking.openURL(`${webUrl}/${p.hash}`)} accessibilityLabel={`Open ${p.label} on the web`}>
            <Text>{p.label}</Text>
            <ArrowRight />
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
