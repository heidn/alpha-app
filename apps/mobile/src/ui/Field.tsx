import { TextInput, type TextInputProps } from 'react-native'
import { color } from '../tokens'
import { cx } from './cx'
import { Layout } from './Layout'
import { Text } from './Text'

/** Labelled input. `multiline` for notes, `mono` for codes. */
export function Field({ label, mono, multiline, className, ...props }: TextInputProps & { label: string; mono?: boolean; className?: string }) {
  return (
    <Layout gap={2} className={className}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        className={cx(
          'px-4 border border-line rounded-xl bg-surface-2 text-fg',
          multiline ? 'min-h-16 py-3 font-sans text-[16px]' : 'h-14',
          mono ? 'font-mono-medium text-[24px] tracking-[8px]' : !multiline && 'font-sans text-[17px]',
        )}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
      />
    </Layout>
  )
}
