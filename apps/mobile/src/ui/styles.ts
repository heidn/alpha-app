import { StyleSheet } from 'react-native'
import { color, font } from '../theme'

export const workoutStyles = StyleSheet.create({
  section: { paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: color.line },
  flex: { flex: 1 },
  warmToggle: {
    height: 44,
    marginVertical: -12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warmRow: { flexDirection: 'row', gap: 14 },
  warmQty: { width: 64, fontFamily: font.mono, fontSize: 15, lineHeight: 23, color: color.muted },
  topLine: { borderTopWidth: 1, borderTopColor: color.line },
  bottomLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  metRow: { flexDirection: 'row', gap: 14, paddingVertical: 14 },
  metReps: { width: 36, fontFamily: font.mono, fontSize: 22, lineHeight: 26, color: color.text },
  metLoad: { fontFamily: font.mono, fontSize: 13, color: color.muted },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  compactReps: { width: 28, fontFamily: font.mono, fontSize: 17, color: color.text },
  compactName: { flex: 1, fontFamily: font.sans, fontSize: 16, color: color.text },
  compactLoad: { fontFamily: font.mono, fontSize: 12, color: color.muted },
})
