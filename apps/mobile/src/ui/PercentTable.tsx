import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
} from 'react-native'
import { color, font } from '../theme'
import { haptic } from './hooks'
import { Check } from './icons'
import { Grain } from './kit'

const PERCENTS = Array.from({ length: 13 }, (_, i) => 100 - i * 5)

const ROW_H = 46
const SELECTED_H = 64
const GAP = 4
const STRIDE = ROW_H + GAP
const LENS_PAD = 4 // lens overhangs the row a little, like a magnifier
const LIQUID_GLASS = isLiquidGlassAvailable()

/** Grain density scales with percentage: 0.1 at 40%, 1 at 100% (from the design). */
const grainOpacity = (pct: number) => {
  const t = (pct - 40) / 60
  return 0.1 + 0.9 * t * t
}

const expand = () => LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'scaleY'))

type Props = {
  weightAt: (pct: number) => number
  projectedAt: (pct: number) => number
  lastAt: (pct: number) => number | undefined
  todayPct?: number
  /** Parent disables page scroll while the lens is being dragged. */
  onDragChange: (dragging: boolean) => void
}

/**
 * Tap a row to select it; drag the selected row to slide a glass lens through the percentages
 * (haptic tick per row). The selected row expands to show projected + last-lifted weights.
 */
export function PercentTable({ weightAt, projectedAt, lastAt, todayPct, onDragChange }: Props) {
  const initial = Math.max(0, PERCENTS.indexOf(todayPct ?? 80))
  const [selected, setSelected] = useState(initial)
  const [hover, setHover] = useState<number | null>(null)
  const dragging = hover !== null

  const selectedRef = useRef(initial)
  const hoverRef = useRef(initial)
  const [lensY] = useState(() => new Animated.Value(0))
  const [lensScaleY] = useState(() => new Animated.Value(1))
  const [lensScaleX] = useState(() => new Animated.Value(1))
  const [lensOpacity] = useState(() => new Animated.Value(0))

  const select = (i: number) => {
    if (i === selectedRef.current) return
    haptic('selection')
    expand()
    selectedRef.current = i
    setSelected(i)
  }

  const onDragChangeRef = useRef(onDragChange)
  useEffect(() => {
    onDragChangeRef.current = onDragChange
  }, [onDragChange])

  // Built once; handlers only touch refs/animated values, so a re-render mid-drag can't drop the gesture.
  // oxlint-disable-next-line react/refs -- refs are only read inside the gesture callbacks, never during render
  const [pan] = useState(() => {
    const last = PERCENTS.length - 1
    // Commit the selection on release; the lens springs onto the row and fades as the card expands.
    const settle = () => {
      const target = hoverRef.current
      Animated.parallel([
        Animated.spring(lensY, { toValue: target * STRIDE - LENS_PAD, friction: 7, tension: 160, useNativeDriver: false }),
        Animated.spring(lensScaleY, { toValue: 1, friction: 5, useNativeDriver: false }),
        Animated.spring(lensScaleX, { toValue: 1, friction: 5, useNativeDriver: false }),
        Animated.timing(lensOpacity, { toValue: 0, duration: 220, delay: 60, useNativeDriver: false }),
      ]).start()
      expand()
      selectedRef.current = target
      setSelected(target)
      setHover(null)
      onDragChangeRef.current(false)
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onDragChangeRef.current(true)
        hoverRef.current = selectedRef.current
        expand()
        setHover(selectedRef.current)
        lensY.setValue(selectedRef.current * STRIDE - LENS_PAD)
        Animated.timing(lensOpacity, { toValue: 1, duration: 120, useNativeDriver: false }).start()
        haptic('light')
      },
      onPanResponderMove: (_, g) => {
        const y = Math.min(Math.max(selectedRef.current * STRIDE + g.dy, 0), last * STRIDE)
        lensY.setValue(y - LENS_PAD)
        // Liquid feel: stretch along the motion, squeeze across it, proportional to speed.
        const stretch = Math.min(Math.abs(g.vy) * 0.12, 0.22)
        lensScaleY.setValue(1 + stretch)
        lensScaleX.setValue(1 - stretch * 0.25)
        const idx = Math.round(y / STRIDE)
        if (idx !== hoverRef.current) {
          hoverRef.current = idx
          setHover(idx)
          haptic('selection')
        }
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    })
  })

  const onA11yAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? -1 : 1 // up the table = heavier
    select(Math.min(Math.max(selectedRef.current + delta, 0), PERCENTS.length - 1))
  }

  return (
    <View style={styles.table}>
      {PERCENTS.map((pct, i) => {
        const isToday = pct === todayPct
        const weight = weightAt(pct)
        const isSelected = i === selected
        // Same wrapper element for every row, always: the drag handlers live on the selected
        // row's wrapper, so its contents may change mid-drag without ending the gesture.
        if (isSelected && !dragging) {
          const last = lastAt(pct)
          return (
            <View
              key={pct}
              {...pan.panHandlers}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${pct}%${isToday ? ', today' : ''}. Projected ${projectedAt(pct)} pounds${
                last !== undefined ? `. Last ${pct}%: ${last} pounds` : ''
              }`}
              accessibilityHint="Swipe up or down to change percentage, or drag to slide."
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={onA11yAction}
              style={[styles.row, styles.rowSelected]}
            >
              <View style={styles.content}>
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
              </View>
            </View>
          )
        }
        const lit = dragging && i === hover
        const plain = (
          <>
            <Grain opacity={grainOpacity(pct)} />
            <View style={styles.rowLeft}>
              <Text style={[styles.pct, lit && styles.lit]}>{pct}%</Text>
              {isToday && <Text style={[styles.todayTag, { color: color.accent }]}>Today</Text>}
            </View>
            <Text style={[styles.weight, lit && styles.lit]}>
              {weight} <Text style={styles.unit}>lb</Text>
            </Text>
          </>
        )
        return (
          <View key={pct} {...(isSelected ? pan.panHandlers : undefined)} style={styles.row}>
            {isSelected ? (
              <View style={styles.content}>{plain}</View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${pct}%${isToday ? ', today' : ''}: ${weight} pounds`}
                onPress={() => select(i)}
                style={styles.content}
              >
                {plain}
              </Pressable>
            )}
          </View>
        )
      })}

      {/* The glass lens: only visible while dragging; above the rows, ignores touches. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lens,
          {
            opacity: lensOpacity,
            transform: [{ translateY: lensY }, { scaleY: lensScaleY }, { scaleX: lensScaleX }],
          },
        ]}
      >
        {LIQUID_GLASS ? (
          <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="clear" isInteractive colorScheme="dark" />
        ) : (
          <View style={styles.lensFallback}>
            <View style={styles.lensSheen} />
          </View>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  table: { marginTop: 14, gap: GAP },
  row: { height: ROW_H, borderRadius: 8, backgroundColor: color.surface, overflow: 'hidden' },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: { height: SELECTED_H, backgroundColor: color.white },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pct: { width: 44, fontFamily: font.mono, fontSize: 15, color: color.text },
  lit: { fontFamily: font.monoMedium },
  todayTag: { fontFamily: font.sansSemi, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: color.accentOnWhite },
  weight: { fontFamily: font.monoMedium, fontSize: 20, color: color.text },
  unit: { fontFamily: font.mono, fontSize: 12, color: color.muted },
  values: { flexDirection: 'row', gap: 18 },
  col: { alignItems: 'flex-end', gap: 3 },
  colLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colLabel: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: color.mutedOnWhite },
  divider: { width: 1, backgroundColor: '#D4D4D8' },
  lens: {
    position: 'absolute',
    left: -LENS_PAD,
    right: -LENS_PAD,
    top: 0,
    height: ROW_H + LENS_PAD * 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  lensFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  lensSheen: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 2,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
})
