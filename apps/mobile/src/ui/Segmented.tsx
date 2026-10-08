import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { color, font } from '../theme'
import { haptic } from './hooks'

const PAD = 4
const EASE_OUT = Easing.out(Easing.cubic)

type Props<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}

/**
 * A white pill slides between options (tap, or drag the pill). Labels stay put and crossfade
 * between their muted and selected styles as the pill passes, like the Personal record table.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: Props<T>) {
  const n = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const [segW, setSegW] = useState(0)
  const [x] = useState(() => new Animated.Value(0))
  // Refs, not closure locals: dev StrictMode runs the setup twice and the gesture library may call either copy.
  const segWRef = useRef(0)
  const indexRef = useRef(index)
  const dragStartRef = useRef(0)
  const activeRef = useRef(false)
  const optionsRef = useRef(options)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    optionsRef.current = options
    onChangeRef.current = onChange
  }, [options, onChange])

  // Place the pill on first layout / resize.
  useEffect(() => {
    x.setValue(indexRef.current * segW)
  }, [segW, x])
  // Jump only for changes made outside this control; our own taps/drags already set indexRef and animate.
  useEffect(() => {
    if (activeRef.current || index === indexRef.current) return
    indexRef.current = index
    x.setValue(index * segWRef.current)
  }, [index, x])

  // oxlint-disable-next-line react/refs -- refs are only read inside these callbacks, never during render
  const [api] = useState(() => {
    const glide = (i: number) =>
      Animated.timing(x, { toValue: i * segWRef.current, duration: 220, easing: EASE_OUT, useNativeDriver: false }).start()
    const commit = (i: number) => {
      if (i !== indexRef.current) haptic('selection')
      indexRef.current = i
      glide(i)
      const next = optionsRef.current[i]
      if (next) onChangeRef.current(next.value)
    }
    const follow = ({ translationX }: { translationX: number }) => {
      if (!activeRef.current) return
      const max = (optionsRef.current.length - 1) * segWRef.current
      x.setValue(Math.min(Math.max(dragStartRef.current + translationX, 0), max))
    }
    const gesture = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-4, 4])
      .onTouchesDown((e, state) => {
        // Only a touch on the pill drags it; taps elsewhere select directly.
        const tx = (e.allTouches[0]?.x ?? -1) - PAD
        const left = indexRef.current * segWRef.current
        if (tx < left || tx > left + segWRef.current) state.fail()
      })
      .onStart(() => {
        activeRef.current = true
        dragStartRef.current = indexRef.current * segWRef.current
      })
      .onUpdate(follow)
      .onEnd(follow)
      .onFinalize((e) => {
        if (!activeRef.current) return
        activeRef.current = false
        const w = segWRef.current || 1
        const max = optionsRef.current.length - 1
        commit(Math.min(Math.max(Math.round((dragStartRef.current + e.translationX) / w), 0), max))
      })
    return { commit, gesture }
  })

  const onLayout = (e: LayoutChangeEvent) => {
    const w = (e.nativeEvent.layout.width - PAD * 2) / n
    segWRef.current = w
    setSegW(w)
  }

  return (
    // onLayout lives on an outer View: GestureDetector doesn't pass it through on web.
    <View onLayout={onLayout}>
      <GestureDetector gesture={api.gesture}>
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
          {segW > 0 && <Animated.View style={[styles.pill, { width: segW, transform: [{ translateX: x }] }]} />}
          {options.map((o, i) => {
            const near =
              segW > 0
                ? x.interpolate({
                    inputRange: [(i - 0.5) * segW, i * segW, (i + 0.5) * segW],
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  })
                : i === index
                  ? 1
                  : 0
            const far = typeof near === 'number' ? 1 - near : Animated.subtract(1, near)
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ selected: i === index }}
                onPress={() => api.commit(i)}
                style={styles.segment}
              >
                <Animated.Text style={[styles.label, { color: color.muted, opacity: far }]}>{o.label}</Animated.Text>
                <Animated.Text style={[styles.label, styles.on, { opacity: near }]}>{o.label}</Animated.Text>
              </Pressable>
            )
          })}
        </View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: PAD, borderRadius: 26, backgroundColor: color['surface-3'] },
  pill: { position: 'absolute', top: PAD, left: PAD, bottom: PAD, borderRadius: 22, backgroundColor: color.white },
  segment: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: font['sans-semibold'], fontSize: 15 },
  on: { position: 'absolute', color: color.ink },
})
