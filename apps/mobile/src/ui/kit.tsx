import type { ReactNode } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { color, font, type } from '../theme'
import { haptic } from './hooks'
import { Minus, Plus } from './icons'

/** ≥44pt transparent tap target around an icon. */
export function IconButton({
  label,
  onPress,
  children,
  style,
}: {
  label: string
  onPress: () => void
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressedDim, style]}
    >
      {children}
    </Pressable>
  )
}

export function SectionHeading({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <Text accessibilityRole="header" style={[type.sectionHeading, style]}>
      {children}
    </Text>
  )
}

export function Hairline({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hairline, style]} />
}

/** White primary action: Save, selected states. */
export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic('success')
        onPress()
      }}
      style={({ pressed }) => [styles.primary, pressed && styles.pressedScale]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  )
}

/** White circular + under a part on Today. */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.add, pressed && styles.pressedScale]}
    >
      <Plus stroke={color.bg} />
    </Pressable>
  )
}

export function StepButton({
  dir,
  label,
  onPress,
  outlined = true,
}: {
  dir: 'up' | 'down'
  label: string
  onPress: () => void
  outlined?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic()
        onPress()
      }}
      style={({ pressed }) => [styles.step, outlined && styles.stepOutlined, pressed && styles.stepPressed]}
    >
      {dir === 'up' ? <Plus size={16} /> : <Minus size={16} />}
    </Pressable>
  )
}

/** Card with a label and a −/value/+ row (metcon score inputs). */
export function StepperCard({
  label,
  value,
  onDown,
  onUp,
  name,
}: {
  label: string
  value: string
  onDown: () => void
  onUp: () => void
  name: string
}) {
  return (
    <View style={styles.stepperCard}>
      <Text style={type.monoLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <StepButton dir="down" label={`Fewer ${name}`} onPress={onDown} outlined={false} />
        <Text style={styles.stepperValue} accessibilityLabel={`${value} ${name}`}>
          {value}
        </Text>
        <StepButton dir="up" label={`More ${name}`} onPress={onUp} outlined={false} />
      </View>
    </View>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segTrack}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic()
              onChange(o.value)
            }}
            style={[styles.segItem, on && styles.segItemOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function NotesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={type.monoLabel}>Notes</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="How did it feel?"
        placeholderTextColor={color.muted}
        multiline
        accessibilityLabel="Notes"
        style={styles.notes}
      />
    </View>
  )
}

const grain = require('../../assets/grain.png')

/** Tiled noise overlay; opacity carries the density. */
export function Grain({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null
  return (
    <Image
      source={grain}
      resizeMode="repeat"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity, width: '100%', height: '100%' }]}
    />
  )
}

export function PressableRow(props: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { style, ...rest } = props
  return <Pressable {...rest} style={({ pressed }) => [style, pressed && styles.pressedDim]} />
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressedDim: { opacity: 0.6 },
  pressedScale: { transform: [{ scale: 0.97 }] },
  hairline: { height: 1, backgroundColor: color.line },
  primary: {
    height: 56,
    borderRadius: 28,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: font.sansSemi, fontSize: 16, letterSpacing: 0.64, color: color.bg },
  add: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepOutlined: { borderWidth: 1, borderColor: color.lineStrong },
  stepPressed: { backgroundColor: color.surface3 },
  stepperCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperValue: { fontFamily: font.monoMedium, fontSize: 40, lineHeight: 46, color: color.text },
  segTrack: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 26,
    backgroundColor: color.surface3,
  },
  segItem: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  segItemOn: { backgroundColor: color.white },
  segText: { fontFamily: font.sansSemi, fontSize: 15, color: color.muted },
  segTextOn: { color: color.bg },
  notes: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 10,
    backgroundColor: color.surface2,
    color: color.text,
    fontFamily: font.sans,
    fontSize: 16,
    textAlignVertical: 'top',
  },
})
