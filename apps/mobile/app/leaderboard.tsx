import { Screen, Text } from '../src/ui'

// Not designed yet (handoff §5.3).
export default function LeaderboardScreen() {
  return (
    <Screen header={{ nav: 'back', eyebrow: 'Today', title: 'Leaderboard' }}>
      <Text className="text-muted">Not designed yet.</Text>
    </Screen>
  )
}
