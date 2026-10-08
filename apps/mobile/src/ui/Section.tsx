import type { ReactNode } from 'react'
import { cx } from './cx'
import { Layout } from './Layout'
import { Text } from './Text'

/** Workout-style section: 28pt padding, orange uppercase heading, divider below. */
export function Section({ heading, divider = true, className, children }: { heading?: string; divider?: boolean; className?: string; children: ReactNode }) {
  return (
    <Layout gap={4} className={cx('py-7', divider && 'border-b border-line', className)}>
      {heading && (
        <Text variant="heading" accessibilityRole="header">
          {heading}
        </Text>
      )}
      {children}
    </Layout>
  )
}
