import { Text as RNText, type TextProps } from 'react-native'
import { cx } from './cx'

const VARIANTS = {
  title: 'font-sans-medium text-[30px] leading-[32px] text-fg',
  body: 'font-sans text-[17px] leading-[23px] text-fg',
  heading: 'font-sans-semibold text-[13px] tracking-[2px] uppercase text-accent',
  label: 'font-mono text-[11px] tracking-[1.5px] uppercase text-muted',
  mono: 'font-mono text-[15px] text-muted',
  number: 'font-mono-medium text-[20px] text-fg',
  logo: 'font-radwave text-fg',
} as const

export type TextVariant = keyof typeof VARIANTS

/** All app text. Pick a variant; `className` adjusts color/size for one-offs. */
export function Text({ variant = 'body', className, ...props }: TextProps & { variant?: TextVariant; className?: string }) {
  return <RNText {...props} className={cx(VARIANTS[variant], className)} />
}
