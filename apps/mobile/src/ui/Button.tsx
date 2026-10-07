import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { color } from '../tokens'
import { cx } from './cx'
import { haptic } from './hooks'

const VARIANTS = {
  /** Big Radwave pill: Sign in. */
  hero: { box: 'h-[76px] rounded-full bg-white items-center justify-center flex-row gap-3', label: 'font-radwave text-[24px] tracking-[0.5px] text-ink' },
  /** White pill: Save. */
  primary: { box: 'h-14 rounded-full bg-white items-center justify-center', label: 'font-sans-semibold text-[16px] tracking-[0.6px] text-ink' },
  /** Small outlined pill: Book. */
  outline: { box: 'h-9 min-w-11 px-3.5 rounded-full border border-line-strong items-center justify-center active:bg-surface-3', label: 'font-sans-medium text-[14px] text-fg' },
  /** Text link: Leaderboard →, Use a different email. */
  ghost: { box: 'min-h-11 flex-row items-center justify-center gap-1.5', label: 'font-sans-medium text-[15px] tracking-[0.3px] text-fg' },
  /** 44pt transparent icon target. */
  icon: { box: 'w-11 h-11 items-center justify-center active:opacity-60', label: '' },
  /** White circle: the + under a lift/metcon. */
  round: { box: 'w-11 h-11 rounded-full bg-white items-center justify-center', label: '' },
  /** White result chip: 185 × 5 ✓. */
  chip: { box: 'h-11 self-start px-[18px] rounded-full bg-white flex-row items-center gap-2.5 active:opacity-70', label: 'font-mono-medium text-[16px] text-ink' },
} as const

export type ButtonVariant = keyof typeof VARIANTS
const SCALES: ButtonVariant[] = ['hero', 'primary', 'round']

type Props = {
  variant?: ButtonVariant
  label?: string
  children?: ReactNode
  onPress: () => void
  accessibilityLabel?: string
  feedback?: 'light' | 'medium' | 'success' | 'none'
  disabled?: boolean
  busy?: boolean
  className?: string
}

export function Button({ variant = 'primary', label, children, onPress, accessibilityLabel, feedback, disabled, busy, className }: Props) {
  const v = VARIANTS[variant]
  const off = disabled || busy
  const fb = feedback ?? (variant === 'hero' ? 'medium' : variant === 'primary' ? 'success' : 'none')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPressIn={() => fb !== 'none' && !off && haptic(fb)}
      onPress={onPress}
      className={cx(v.box, off && 'opacity-40', SCALES.includes(variant) && 'active:scale-[0.97]', className)}
    >
      {busy ? <ActivityIndicator color={color.ink} /> : label ? <Text className={v.label}>{label}</Text> : null}
      {!busy && children}
    </Pressable>
  )
}
