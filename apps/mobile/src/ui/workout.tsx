import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { METCON_LABEL, metconLoad } from '../data/rules'
import { useStore } from '../data/store'
import type { LiftPart, MetconPart, WarmupItem } from '../data/types'
import { color, type } from '../theme'
import { ChevronDown } from './icons'
import { SectionHeading } from './kit'
import { workoutStyles as s } from './styles'

// Section bodies shared by Today and Past day. `dim` = past day (text-2).

export function WarmupSection({ items, collapsible, dim }: { items: WarmupItem[]; collapsible?: boolean; dim?: boolean }) {
  const { movementName } = useStore()
  const [open, setOpen] = useState(true)
  return (
    <View style={[s.section, { gap: 16 }]}>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel="Warm-up"
          onPress={() => setOpen((o) => !o)}
          style={s.warmToggle}
        >
          <SectionHeading>Warm-up</SectionHeading>
          <View style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}>
            <ChevronDown />
          </View>
        </Pressable>
      ) : (
        <SectionHeading>Warm-up</SectionHeading>
      )}
      {open && (
        <View style={{ gap: 10 }}>
          {items.map((i, idx) => (
            <View key={idx} style={s.warmRow}>
              <Text style={s.warmQty}>{i.qty}</Text>
              <Text style={[type.body, s.flex, dim && { color: color.text2 }]}>{movementName(i.movementId)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export function LiftTitle({ lift }: { lift: LiftPart }) {
  const { movementName } = useStore()
  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      <Text style={type.title}>{movementName(lift.movementId)}</Text>
      <Text style={type.monoSub}>
        {lift.sets} × {lift.reps} @ {lift.percent}%
      </Text>
    </View>
  )
}

export function MetconHeader({ metcon }: { metcon: MetconPart }) {
  const cap = metcon.timeCapSec ? ` · ${metcon.timeCapSec / 60} min` : ''
  return (
    <View style={{ gap: 6 }}>
      <SectionHeading>Metcon</SectionHeading>
      <Text style={type.monoSub}>
        {METCON_LABEL[metcon.type]}
        {cap}
      </Text>
    </View>
  )
}

export function MetconItems({ metcon, dim, compact }: { metcon: MetconPart; dim?: boolean; compact?: boolean }) {
  const { movementName, settings } = useStore()
  return (
    <View>
      {metcon.items.map((item, idx) => {
        const load = metconLoad(item, settings.rxWeights)
        const last = idx === metcon.items.length - 1
        if (compact) {
          return (
            <View key={idx} style={[s.compactRow, idx === 0 && s.topLine]}>
              <Text style={s.compactReps}>{item.reps ?? ''}</Text>
              <Text style={[s.compactName, dim && { color: color.text2 }]} numberOfLines={2}>
                {movementName(item.movementId)}
              </Text>
              {load && <Text style={s.compactLoad}>{load}</Text>}
            </View>
          )
        }
        return (
          <View key={idx} style={[s.metRow, s.topLine, last && s.bottomLine]}>
            {item.reps !== undefined && <Text style={s.metReps}>{item.reps}</Text>}
            <View style={[s.flex, { gap: 4 }]}>
              <Text style={[type.body, dim && { color: color.text2 }]}>{movementName(item.movementId)}</Text>
              {load && <Text style={s.metLoad}>{load}</Text>}
            </View>
          </View>
        )
      })}
    </View>
  )
}

