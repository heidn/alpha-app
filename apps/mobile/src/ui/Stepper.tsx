import { Pressable } from 'react-native'
import { cx } from './cx'
import { haptic } from './hooks'
import { Minus, Plus } from './icons'
import { Layout } from './Layout'
import { Text } from './Text'

type Props = {
  value: string
  onDown: () => void
  onUp: () => void
  /** What the value counts, for screen readers ("rounds", "set 2 weight"). */
  name: string
  /** card: boxed with a label (metcon score). row: outlined −/+ around a big value (lift sets). */
  variant?: 'card' | 'row'
  label?: string
  unit?: string
  className?: string
}

export function Stepper({ value, onDown, onUp, name, variant = 'card', label, unit, className }: Props) {
  const outlined = variant === 'row'
  const step = (dir: 'down' | 'up') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dir === 'up' ? 'Increase' : 'Decrease'} ${name}`}
      onPress={() => {
        haptic()
        if (dir === 'up') onUp()
        else onDown()
      }}
      className={cx('w-11 h-11 rounded-full items-center justify-center active:bg-surface-3', outlined && 'border border-line-strong')}
    >
      {dir === 'up' ? <Plus size={16} /> : <Minus size={16} />}
    </Pressable>
  )
  const display = (
    <Layout row className="items-baseline justify-center gap-1" accessibilityLabel={`${value}${unit ? ` ${unit}` : ''} ${name}`}>
      <Text className={cx('font-mono-medium text-fg', outlined ? 'text-[30px] leading-[34px]' : 'text-[40px] leading-[46px]')}>{value}</Text>
      {unit && <Text className="font-mono text-[12px] text-muted">{unit}</Text>}
    </Layout>
  )
  if (outlined) {
    return (
      <Layout row center gap={3} className={className}>
        {step('down')}
        <Layout className="w-[92px]">{display}</Layout>
        {step('up')}
      </Layout>
    )
  }
  return (
    <Layout gap={2} className={cx('flex-1 p-3.5 border border-line rounded-xl', className)}>
      {label && <Text variant="label">{label}</Text>}
      <Layout row center between>
        {step('down')}
        {display}
        {step('up')}
      </Layout>
    </Layout>
  )
}
