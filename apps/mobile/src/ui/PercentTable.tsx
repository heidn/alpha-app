import { useRef, useState, type RefObject } from 'react'
import { Animated, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native'
import { Gesture, GestureDetector, type ScrollView } from 'react-native-gesture-handler'
import { color, font } from '../theme'
import { haptic } from './hooks'
import { Check } from './icons'
import { Grain } from './kit'

const PERCENTS = Array.from({ length: 13 }, (_, i) => 100 - i * 5)

const ROW_H = 46
const GAP = 4
const STRIDE = ROW_H + GAP
const CARD_PAD = GAP // the card covers its row plus the gaps around it, never the neighbors
const CARD_H = ROW_H + CARD_PAD * 2
const LAST = PERCENTS.length - 1

const cardTop = (i: number) => i * STRIDE - CARD_PAD
const clampIndex = (i: number) => Math.min(Math.max(i, 0), LAST)

/** Grain density scales with percentage: 0.1 at 40%, 1 at 100% (from the design). */
const grainOpacity = (pct: number) => {
  const t = (pct - 40) / 60
  return 0.1 + 0.9 * t * t
}

type Props = {
  weightAt: (pct: number) => number
  projectedAt: (pct: number) => number
  lastAt: (pct: number) => number | undefined
  todayPct?: number
  /** The page's gesture-handler ScrollView, which waits while the card is dragged. */
  scrollRef?: RefObject<ScrollView | null>
}

/**
 * The white selection card floats over the rows. Tap a row to glide it there, or drag the card:
 * it follows the finger and its data fades over to each row it passes (haptic tick per row).
 */
export function PercentTable({ weightAt, projectedAt, lastAt, todayPct, scrollRef }: Props) {
  const initial = Math.max(0, PERCENTS.indexOf(todayPct ?? 80))
  const [shown, setShown] = useState(initial) // row whose data the card shows
  const indexRef = useRef(initial)
  // Drag state lives in refs, not closure locals: dev StrictMode runs the setup below twice, and the
  // gesture library may call handlers from either copy.
  const dragStartRef = useRef(0)
  const activeRef = useRef(false)
  const [cardY] = useState(() => new Animated.Value(cardTop(initial)))
  const [stretch] = useState(() => new Animated.Value(1))
  const [fade] = useState(() => new Animated.Value(1))
  const [slide] = useState(() => new Animated.Value(0))

  // oxlint-disable-next-line react/refs -- refs are only read inside these callbacks, never during render
  const [api] = useState(() => {
    /** Swap the card's data with a short fade + slide in the direction of travel. */
    const show = (i: number) => {
      if (i === indexRef.current) return
      const dir = i > indexRef.current ? 1 : -1
      indexRef.current = i
      setShown(i)
      haptic('selection')
      fade.setValue(0.15)
      slide.setValue(dir * 8)
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: false }),
        Animated.spring(slide, { toValue: 0, friction: 7, tension: 180, useNativeDriver: false }),
      ]).start()
    }
    const snap = (i: number) =>
      Animated.parallel([
        Animated.spring(cardY, { toValue: cardTop(i), friction: 7, tension: 160, useNativeDriver: false }),
        Animated.spring(stretch, { toValue: 1, friction: 5, useNativeDriver: false }),
      ]).start()

    const follow = ({ translationY, velocityY }: { translationY: number; velocityY: number }) => {
      const y = Math.min(Math.max(dragStartRef.current + translationY, cardTop(0)), cardTop(LAST))
      cardY.setValue(y)
      // Liquid feel: stretch a little along the motion, proportional to speed (px/s).
      stretch.setValue(1 + Math.min((Math.abs(velocityY) / 1000) * 0.08, 0.14))
      show(clampIndex(Math.round((y + CARD_PAD) / STRIDE)))
    }
    const gesture = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY([-4, 4])
      .onTouchesDown((e, state) => {
        // Only a touch on the card drags it; anywhere else the page scrolls and rows take taps.
        const y = e.allTouches[0]?.y ?? -1
        const top = cardTop(indexRef.current)
        if (y < top || y > top + CARD_H) state.fail()
      })
      .onStart(() => {
        activeRef.current = true
        dragStartRef.current = cardTop(indexRef.current)
        haptic('light')
      })
      .onUpdate(follow)
      // The release carries the final position; apply it in case the last move event was skipped.
      .onEnd(follow)
      .onFinalize(() => {
        if (!activeRef.current) return
        activeRef.current = false
        snap(indexRef.current)
      })
    const gestureWithScroll = scrollRef ? gesture.blocksExternalGesture(scrollRef) : gesture
    return { show, snap, gesture: gestureWithScroll }
  })

  const select = (i: number) => {
    api.show(i)
    api.snap(i)
  }

  const onA11yAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? -1 : 1 // up the table = heavier
    select(clampIndex(shown + delta))
  }

  const pct = PERCENTS[shown]
  const isToday = pct === todayPct
  const last = lastAt(pct)

  return (
    <GestureDetector gesture={api.gesture}>
      <View style={styles.table}>
        {PERCENTS.map((p, i) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityLabel={`${p}%${p === todayPct ? ', today' : ''}: ${weightAt(p)} pounds`}
            accessibilityElementsHidden={i === shown}
            importantForAccessibility={i === shown ? 'no-hide-descendants' : 'auto'}
            onPress={() => select(i)}
            style={styles.row}
          >
            <Grain opacity={grainOpacity(p)} />
            <View style={styles.rowLeft}>
              <Text style={styles.pct}>{p}%</Text>
              {p === todayPct && <Text style={[styles.todayTag, { color: color.accent }]}>Today</Text>}
            </View>
            <Text style={styles.weight}>
              {weightAt(p)} <Text style={styles.unit}>lb</Text>
            </Text>
          </Pressable>
        ))}

        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${pct}%${isToday ? ', today' : ''}. Projected ${projectedAt(pct)} pounds${
            last !== undefined ? `. Last ${pct}%: ${last} pounds` : ''
          }`}
          accessibilityHint="Swipe up or down to change percentage, or drag to slide."
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onA11yAction}
          style={[styles.card, { transform: [{ translateY: cardY }, { scaleY: stretch }] }]}
        >
          <Animated.View style={[styles.cardContent, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={styles.rowLeft}>
              <Text style={[styles.pct, { color: color.bg }]}>{pct}%</Text>
              {isToday && <Text style={styles.todayTag}>Today</Text>}
            </View>
            <View style={styles.values}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>≈ Projected</Text>
                <Text style={[styles.weight, { color: color.bg, fontFamily: font.mono }]}>
                  {projectedAt(pct)} <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.col}>
                <View style={styles.colLabelRow}>
                  <Check size={10} width={3} stroke={color.mutedOnWhite} />
                  <Text style={styles.colLabel}>Last {pct}%</Text>
                </View>
                <Text style={[styles.weight, { color: color.bg }]}>
                  {last ?? '—'}{' '}
                  {last !== undefined && <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>}
                </Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  table: { marginTop: 14 + CARD_PAD, marginBottom: CARD_PAD, gap: GAP },
  row: {
    height: ROW_H,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: color.surface,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CARD_H,
    borderRadius: 10,
    backgroundColor: color.white,
    overflow: 'hidden',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.35)',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pct: { width: 44, fontFamily: font.mono, fontSize: 15, color: color.text },
  todayTag: { fontFamily: font.sansSemi, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: color.accentOnWhite },
  weight: { fontFamily: font.monoMedium, fontSize: 20, color: color.text },
  unit: { fontFamily: font.mono, fontSize: 12, color: color.muted },
  values: { flexDirection: 'row', gap: 18 },
  col: { alignItems: 'flex-end', gap: 3 },
  colLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colLabel: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: color.mutedOnWhite },
  divider: { width: 1, backgroundColor: '#D4D4D8' },
})
