import { Text } from 'react-native'
import { color, type } from '../src/theme'
import { PlainPage } from '../src/ui/Placeholder'

// Not designed yet (handoff §5.3).
export default function LeaderboardScreen() {
  return (
    <PlainPage eyebrow="Today" title="Leaderboard">
      <Text style={[type.body, { color: color.muted }]}>Not designed yet.</Text>
    </PlainPage>
  )
}
