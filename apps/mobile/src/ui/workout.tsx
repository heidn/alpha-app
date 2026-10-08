import { useState, type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { METCON_LABEL, metconLoad } from '../data/rules'
import { useStore } from '../data/store'
import type { LiftPart, MetconPart, WarmupItem } from '../data/types'
import { cx } from './cx'
import { ChevronDown } from './icons'
import { Layout } from './Layout'
import { Section } from './Section'
import { Text } from './Text'

// Workout section bodies shared by Today and Past day. `dim` = past day (fg-2).

export function WarmupSection({ items, collapsible, dim }: { items: WarmupItem[]; collapsible?: boolean; dim?: boolean }) {
  const { movementName } = useStore()
  const list = (
    <Layout className="gap-2.5">
      {items.map((i, idx) => (
        <Layout key={idx} row className="gap-3.5">
          <Text variant="mono" className="w-16 leading-[23px]">
            {i.qty}
          </Text>
          <Text className={cx('flex-1', dim && 'text-fg-2')}>{movementName(i.movementId)}</Text>
        </Layout>
      ))}
    </Layout>
  )
  if (!collapsible) return <Section heading="Warm-up">{list}</Section>
  return <CollapsibleWarmup>{list}</CollapsibleWarmup>
}

/** Title row toggles the list; height, fade and chevron animate together, so rows below slide. */
function CollapsibleWarmup({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  const [height, setHeight] = useState(0) // natural height of the list, measured once laid out
  const progress = useSharedValue(1) // 1 = open, 0 = closed
  const body = useAnimatedStyle(() => (height ? { height: progress.value * height, opacity: progress.value } : { opacity: progress.value }))
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${(progress.value - 1) * 90}deg` }] }))

  const toggle = () => {
    progress.set(withTiming(open ? 0 : 1, { duration: 260, easing: Easing.out(Easing.cubic) }))
    setOpen(!open)
  }

  return (
    <Layout className="py-7 border-b border-line">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Warm-up"
        onPress={toggle}
        className="h-11 -my-3 flex-row items-center justify-between"
      >
        <Text variant="heading">Warm-up</Text>
        <Animated.View style={chevron}>
          <ChevronDown />
        </Animated.View>
      </Pressable>
      <Animated.View style={[{ overflow: 'hidden' }, body]} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        {/* Unconstrained inner view: reports the list's natural height even while the outer one animates. */}
        <View className="pt-4" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          {children}
        </View>
      </Animated.View>
    </Layout>
  )
}

export function LiftTitle({ lift }: { lift: LiftPart }) {
  const { movementName } = useStore()
  return (
    <Layout className="gap-1.5 shrink">
      <Text variant="title">{movementName(lift.movementId)}</Text>
      <Text variant="mono">
        {lift.sets} × {lift.reps} @ {lift.percent}%
      </Text>
    </Layout>
  )
}

export function MetconHeader({ metcon }: { metcon: MetconPart }) {
  const cap = metcon.timeCapSec ? ` · ${metcon.timeCapSec / 60} min` : ''
  return (
    <Layout className="gap-1.5">
      <Text variant="heading" accessibilityRole="header">
        Metcon
      </Text>
      <Text variant="mono">
        {METCON_LABEL[metcon.type]}
        {cap}
      </Text>
    </Layout>
  )
}

export function MetconItems({ metcon, dim, compact }: { metcon: MetconPart; dim?: boolean; compact?: boolean }) {
  const { movementName, settings } = useStore()
  return (
    <Layout className={cx(compact && 'border-t border-line')}>
      {metcon.items.map((item, idx) => {
        const load = metconLoad(item, settings.rxWeights)
        if (compact) {
          return (
            <Layout key={idx} row className="items-baseline gap-3 py-2.5 border-b border-line">
              <Text className="w-7 font-mono text-[17px]">{item.reps ?? ''}</Text>
              <Text className={cx('flex-1 text-[16px]', dim && 'text-fg-2')} numberOfLines={2}>
                {movementName(item.movementId)}
              </Text>
              {load && <Text className="font-mono text-[12px] text-muted">{load}</Text>}
            </Layout>
          )
        }
        return (
          <Layout key={idx} row className={cx('gap-3.5 py-3.5 border-t border-line', idx === metcon.items.length - 1 && 'border-b')}>
            {item.reps !== undefined && <Text className="w-9 font-mono text-[22px] leading-[26px]">{item.reps}</Text>}
            <Layout className="flex-1 gap-1">
              <Text className={cx(dim && 'text-fg-2')}>{movementName(item.movementId)}</Text>
              {load && <Text className="font-mono text-[13px] text-muted">{load}</Text>}
            </Layout>
          </Layout>
        )
      })}
    </Layout>
  )
}
