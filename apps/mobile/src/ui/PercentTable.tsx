import { useRef, useState, type RefObject } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native'
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
const EASE_OUT = Easing.out(Easing.cubic)

const rowTop = (i: number) => i * STRIDE
const cardTop = (i: number) => rowTop(i) - CARD_PAD
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
 * Three layers: dark rows (tap targets), the sliding white card, and each row's text fixed in place.
 * Every row has a dark-row and a card version of its text; their opacity follows how far the card is
 * from that row, so text fades out of the row the card leaves and into the row it reaches.
 */
export function PercentTable({ weightAt, projectedAt, lastAt, todayPct, scrollRef }: Props) {
  const initial = Math.max(0, PERCENTS.indexOf(todayPct ?? 80))
  const [shown, setShown] = useState(initial) // nearest row to the card (a11y + haptics)
  const indexRef = useRef(initial)
  // Drag state lives in refs, not closure locals: dev StrictMode runs the setup below twice, and the
  // gesture library may call handlers from either copy.
  const dragStartRef = useRef(0)
  const activeRef = useRef(false)
  const [cardY] = useState(() => new Animated.Value(cardTop(initial)))

  // oxlint-disable-next-line react/refs -- refs are only read inside these callbacks, never during render
  const [api] = useState(() => {
    const reach = (i: number) => {
      if (i === indexRef.current) return
      indexRef.current = i
      setShown(i)
      haptic('selection')
    }
    const glide = (i: number) =>
      Animated.timing(cardY, { toValue: cardTop(i), duration: 220, easing: EASE_OUT, useNativeDriver: false }).start()

    const follow = ({ translationY }: { translationY: number }) => {
      // Only a drag that actually started moves the card (a plain tap must never reposition it).
      if (!activeRef.current) return
      const y = Math.min(Math.max(dragStartRef.current + translationY, cardTop(0)), cardTop(LAST))
      cardY.setValue(y)
      reach(clampIndex(Math.round((y + CARD_PAD) / STRIDE)))
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
        glide(indexRef.current)
      })
    const gestureWithScroll = scrollRef ? gesture.blocksExternalGesture(scrollRef) : gesture
    return { reach, glide, gesture: gestureWithScroll }
  })

  const select = (i: number) => {
    api.reach(i)
    api.glide(i)
  }

  const onA11yAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? -1 : 1 // up the table = heavier
    select(clampIndex(shown + delta))
  }

  const shownPct = PERCENTS[shown]
  const shownLast = lastAt(shownPct)

  return (
    <GestureDetector gesture={api.gesture}>
      <View style={styles.table}>
        {/* 1. Dark rows: background + grain, and the tap targets. */}
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
          </Pressable>
        ))}

        {/* 2. The white card slides under the text. */}
        <Animated.View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${shownPct}%${shownPct === todayPct ? ', today' : ''}. Projected ${projectedAt(shownPct)} pounds${
            shownLast !== undefined ? `. Last ${shownPct}%: ${shownLast} pounds` : ''
          }`}
          accessibilityHint="Swipe up or down to change percentage, or drag to slide."
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onA11yAction}
          style={[styles.card, { transform: [{ translateY: cardY }] }]}
        />

        {/* 3. Each row's text, fixed in its row; crossfades with the card's distance. */}
        <View style={styles.textLayer} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {PERCENTS.map((p, i) => {
            const near = cardY.interpolate({
              // Gone by the halfway point, so text fades out of one row before fading into the next.
              inputRange: [cardTop(i) - STRIDE / 2, cardTop(i), cardTop(i) + STRIDE / 2],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            })
            const far = Animated.subtract(1, near)
            const last = lastAt(p)
            const isToday = p === todayPct
            return (
              <View key={p} style={[styles.rowText, { top: rowTop(i) }]}>
                <Animated.View style={[styles.content, { opacity: far }]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.pct}>{p}%</Text>
                    {isToday && <Text style={[styles.todayTag, { color: color.accent }]}>Today</Text>}
                  </View>
                  <Text style={styles.weight}>
                    {weightAt(p)} <Text style={styles.unit}>lb</Text>
                  </Text>
                </Animated.View>

                <Animated.View style={[styles.content, styles.overlay, { opacity: near }]}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.pct, { color: color.bg }]}>{p}%</Text>
                    {isToday && <Text style={styles.todayTag}>Today</Text>}
                  </View>
                  <View style={styles.values}>
                    <View style={styles.col}>
                      <Text style={styles.colLabel}>≈ Projected</Text>
                      <Text style={[styles.weight, { color: color.bg, fontFamily: font.mono }]}>
                        {projectedAt(p)} <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.col}>
                      <View style={styles.colLabelRow}>
                        <Check size={10} width={3} stroke={color.mutedOnWhite} />
                        <Text style={styles.colLabel}>Last {p}%</Text>
                      </View>
                      <Text style={[styles.weight, { color: color.bg }]}>
                        {last ?? '—'}{' '}
                        {last !== undefined && <Text style={[styles.unit, { color: color.mutedOnWhite }]}>lb</Text>}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            )
          })}
        </View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  table: { marginTop: 14 + CARD_PAD, marginBottom: CARD_PAD, gap: GAP },
  row: { height: ROW_H, borderRadius: 8, backgroundColor: color.surface, overflow: 'hidden' },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CARD_H,
    borderRadius: 10,
    backgroundColor: color.white,
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.35)',
  },
  textLayer: { pointerEvents: 'none', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  rowText: { position: 'absolute', left: 0, right: 0, height: ROW_H },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
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
