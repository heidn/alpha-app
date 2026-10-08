import Svg, { Path, Rect } from 'react-native-svg'
import { color } from '../theme'

type IconProps = { size?: number; stroke?: string; width?: number }

function Line({ d, size = 18, stroke = color.fg, width = 2 }: IconProps & { d: string[] }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p) => (
        <Path key={p} d={p} />
      ))}
    </Svg>
  )
}

export function ChevronDown(p: IconProps) {
  return <Line d={['M5 9l7 7 7-7']} {...p} />
}
export function ChevronLeft(p: IconProps) {
  return <Line d={['M15 5l-7 7 7 7']} {...p} />
}
export function ChevronRight(p: IconProps) {
  return <Line d={['M9 5l7 7-7 7']} {...p} />
}
export function ArrowRight(p: IconProps) {
  return <Line d={['M5 12h14', 'M13 6l6 6-6 6']} {...p} />
}
export function Plus(p: IconProps) {
  return <Line d={['M12 5v14', 'M5 12h14']} {...p} />
}
export function Minus(p: IconProps) {
  return <Line d={['M5 12h14']} {...p} />
}
export function Close(p: IconProps) {
  return <Line d={['M6 6l12 12', 'M18 6L6 18']} {...p} />
}
export function Check(p: IconProps) {
  return <Line d={['M5 12.5l4.5 4.5L19 7.5']} {...p} />
}
export function Pencil(p: IconProps) {
  return <Line d={['M4 20h4L19 9l-4-4L4 16v4z', 'M13.5 6.5l4 4']} {...p} />
}

export function CalendarIcon({ size = 18, stroke = color.fg }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2} />
      <Path d="M3.5 10h17" />
      <Path d="M8 3v4" />
      <Path d="M16 3v4" />
    </Svg>
  )
}

/** Two 1pt lines, 8pt apart. */
export function MenuIcon({ stroke = color.fg }: IconProps) {
  return (
    <Svg width={20} height={9} viewBox="0 0 20 9" fill="none" stroke={stroke} strokeWidth={1} strokeLinecap="round">
      <Path d="M0.5 0.5h19" />
      <Path d="M0.5 8.5h19" />
    </Svg>
  )
}
