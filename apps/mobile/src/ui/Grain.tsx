import { Image, StyleSheet } from 'react-native'

const grain = require('../../assets/grain.png')

/** Tiled noise from the design's feTurbulence filter; opacity carries the density. */
export function Grain({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null
  return (
    <Image
      source={grain}
      resizeMode="repeat"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { opacity, width: '100%', height: '100%' }]}
    />
  )
}
