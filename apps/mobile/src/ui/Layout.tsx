import { View, type ViewProps } from 'react-native'
import { cx } from './cx'

// Static class names so Tailwind can see them.
const GAP = { 0: '', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 5: 'gap-5', 6: 'gap-6', 7: 'gap-7' } as const

type Props = ViewProps & {
  className?: string
  row?: boolean
  gap?: keyof typeof GAP
  /** Cross-axis centering (vertical in a row). */
  center?: boolean
  /** Push children apart along the main axis. */
  between?: boolean
}

/** Flex container: column by default, `row` for horizontal. Everything else via `className`. */
export function Layout({ row, gap = 0, center, between, className, ...props }: Props) {
  return (
    <View {...props} className={cx(row && 'flex-row', GAP[gap], center && 'items-center', between && 'justify-between', className)} />
  )
}
