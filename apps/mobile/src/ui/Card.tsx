import type { ReactNode } from 'react'
import { Pressable, View, type AccessibilityRole } from 'react-native'
import { cx } from './cx'

// A card is a rounded, self-contained group of related content (a workout summary, a max,
// a logged score). Not for rows, buttons or page sections.
const VARIANTS = {
  /** Default: thin line border (workout summary, score inputs). */
  outline: 'border border-line',
  /** Confirmed/primary value: solid white border (Actual 1RM). */
  emphasis: 'border-[1.5px] border-white',
  /** Estimated or empty: dashed border (Projected 1RM, "Rest day"). */
  dashed: 'border-[1.5px] border-dashed border-line-dashed',
  /** Highlighted result: white fill, ink text (logged metcon score). */
  filled: 'bg-white',
} as const

type Props = {
  variant?: keyof typeof VARIANTS
  /** Layout only (flex, gap, direction); the card's look comes from `variant`. */
  className?: string
  children: ReactNode
  /** Makes the whole card tappable. */
  onPress?: () => void
  accessibilityLabel?: string
  accessibilityRole?: AccessibilityRole
}

export function Card({ variant = 'outline', className, children, onPress, ...a11y }: Props) {
  const classes = cx('rounded-[14px] p-4', VARIANTS[variant], className)
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
