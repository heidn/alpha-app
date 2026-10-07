import type { ReactNode } from 'react'
import { Pressable, View, type AccessibilityRole } from 'react-native'
import { cx } from './cx'

const VARIANTS = {
  outline: 'border border-line',
  dashed: 'border border-dashed border-line-strong',
  white: 'bg-white',
  solid: 'bg-surface',
} as const

type Props = {
  variant?: keyof typeof VARIANTS
  className?: string
  children: ReactNode
  /** Makes the whole card tappable. */
  onPress?: () => void
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
}

export function Card({ variant = 'outline', className, children, onPress, ...a11y }: Props) {
  const classes = cx('rounded-xl p-4', VARIANTS[variant], className)
  if (!onPress) return <View className={classes}>{children}</View>
  return (
    <Pressable
      accessibilityRole={a11y.accessibilityRole ?? 'button'}
      accessibilityLabel={a11y.accessibilityLabel}
      onPress={onPress}
      className={cx(classes, 'active:opacity-70')}
    >
      {children}
    </Pressable>
  )
}
