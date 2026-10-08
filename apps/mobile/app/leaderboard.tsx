import { Text } from '../src/ui'
import { Screen } from '../src/shell/Screen'

// Not designed yet (handoff §5.3).
export default function LeaderboardScreen() {
  return (
    <Screen header={{ nav: 'back', eyebrow: 'Today', title: 'Leaderboard' }}>
      <Text className="text-muted">Not designed yet.</Text>
    </Screen>
  )
}
