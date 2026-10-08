import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { cx } from './cx'

/** Full-width row with a bottom divider; tappable when `onPress` is set. */
export function ListRow({ onPress, accessibilityLabel, className, children }: { onPress?: () => void; accessibilityLabel?: string; className?: string; children: ReactNode }) {
  const classes = cx('min-h-14 flex-row items-center justify-between border-b border-line', className)
  if (!onPress) return <View className={classes}>{children}</View>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} className={cx(classes, 'active:opacity-60')}>
      {children}
    </Pressable>
  )
}
