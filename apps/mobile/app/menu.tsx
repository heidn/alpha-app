import { useClerk, useUser } from '@clerk/expo'
import { Screen } from '../src/shell/Screen'
import { Layout, ListRow, Text } from '../src/ui'

// TODO(menu): links to the member's own pages (not staff/admin pages) go here once they exist.
const PLACEHOLDER_LINKS = ['Your page']

export default function MenuScreen() {
  const { signOut } = useClerk()
  const { user } = useUser()
  return (
    <Screen header={{ nav: 'back', eyebrow: 'Alpha', title: 'Menu' }}>
      <Layout className="border-t border-line">
        {PLACEHOLDER_LINKS.map((label) => (
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
