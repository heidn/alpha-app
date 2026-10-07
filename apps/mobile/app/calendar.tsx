import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { clockLabel, dayTitle, fromISO, monthGrid, monthName } from '../src/data/dates'
import { divisionText, METCON_LABEL, scoreText, topSet } from '../src/data/rules'
import { useStore } from '../src/data/store'
import type { ClassSession, ISODate, Workout } from '../src/data/types'
import { color, font, gutter, type } from '../src/theme'
import { ChevronLeft, ChevronRight, Close } from '../src/ui/icons'
import { haptic, useTopInset } from '../src/ui/hooks'
import { IconButton, PressableRow, SectionHeading } from '../src/ui/kit'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function CalendarScreen() {
  const store = useStore()
  const top = useTopInset()
  const { today } = store
  const params = useLocalSearchParams<{ date?: string }>()
  const [selected, setSelected] = useState<ISODate>(params.date ?? today)
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(selected)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const cells = monthGrid(cursor.year, cursor.month)
  const workout = store.workoutOn(selected)
  const booking = store.bookingOn(selected)
  const attended = booking?.status === 'signedIn'
  const isPast = selected < today

  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={[styles.page, { paddingTop: top + 20 }]}>
      <View style={styles.topBar}>
        <IconButton label="Close" onPress={close} style={{ marginLeft: -12 }}>
          <Close size={20} />
        </IconButton>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const d = fromISO(today)
            setCursor({ year: d.getFullYear(), month: d.getMonth() })
            setSelected(today)
          }}
          style={styles.todayLink}
        >
          <Text style={styles.todayLinkText}>Today</Text>
        </Pressable>
      </View>

      <View style={styles.monthRow}>
        <Text style={type.title} accessibilityRole="header">
          {monthName(cursor.month)} <Text style={{ color: color.muted }}>{cursor.year}</Text>
        </Text>
        <View style={{ flexDirection: 'row', marginRight: -12 }}>
          <IconButton label="Previous month" onPress={() => shiftMonth(-1)}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Next month" onPress={() => shiftMonth(1)}>
            <ChevronRight />
          </IconButton>
        </View>
      </View>

      <View style={[styles.grid, { marginTop: 20 }]}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={styles.cellWrap}>
            <Text style={styles.weekday}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.grid, { marginTop: 10, rowGap: 4 }]}>
        {cells.map((date, i) => (
          <View key={date ?? `b${i}`} style={styles.cellWrap}>
            {date && (
              <DayCell
                date={date}
                today={today}
                selected={date === selected}
                attended={store.bookingOn(date)?.status === 'signedIn'}
                onPress={() => {
                  haptic()
                  setSelected(date)
                }}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.detail}>
        <Text style={styles.dayLabel}>{selected === today ? "Today's workout" : dayTitle(selected)}</Text>

        {selected === today && workout ? (
          <SummaryCard workout={workout} onPress={() => router.dismissTo('/')} />
        ) : isPast && attended && workout ? (
          <SummaryCard workout={workout} withResults onPress={() => router.push(`/day/${selected}`)} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{isPast ? 'Rest day' : 'Workout not posted yet'}</Text>
          </View>
        )}

        <SectionHeading style={{ marginTop: 8 }}>Classes</SectionHeading>
        <ClassList date={selected} />
      </View>
    </ScrollView>
  )
}

function DayCell({
  date,
  today,
  selected,
  attended,
  onPress,
}: {
  date: ISODate
  today: ISODate
  selected: boolean
  attended: boolean
  onPress: () => void
}) {
  const isToday = date === today
  const past = date < today
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dayTitle(date)}${attended ? ', attended' : ''}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.cell,
        selected && styles.cellSelected,
        isToday && !selected && styles.cellToday,
      ]}
    >
      <Text style={[styles.cellNum, past && { color: color.muted }, selected && { color: color.bg }]}>
        {fromISO(date).getDate()}
      </Text>
      {attended && <View style={styles.attendBar} />}
    </Pressable>
  )
}

function SummaryCard({ workout, withResults, onPress }: { workout: Workout; withResults?: boolean; onPress: () => void }) {
  const store = useStore()
  const lift = workout.lift
  const liftRes = withResults ? store.liftResult(workout.id) : undefined
  const met = withResults ? store.metconResult(workout.id) : undefined
  return (
    <PressableRow accessibilityRole="link" onPress={onPress} style={styles.card}>
      <View style={{ gap: 12, flex: 1 }}>
        {lift && (
          <View style={{ gap: 3 }}>
            <SectionHeading style={{ fontSize: 11 }}>Lifting</SectionHeading>
            <Text style={type.body}>
              {store.movementName(lift.movementId)}{' '}
              <Text style={styles.cardMono}>
                {liftRes ? `top set ${topSet(liftRes).weight} lb` : `${lift.sets} × ${lift.reps} @ ${lift.percent}%`}
              </Text>
            </Text>
          </View>
        )}
        {workout.metcon && (
          <View style={{ gap: 3 }}>
            <SectionHeading style={{ fontSize: 11 }}>Metcon</SectionHeading>
            <Text style={type.body}>
              {METCON_LABEL[workout.metcon.type]}{' '}
              {met && (
                <Text style={styles.cardMono}>
                  {scoreText(met.score)} {divisionText(met.division)}
                </Text>
              )}
            </Text>
          </View>
        )}
      </View>
      <ChevronRight />
    </PressableRow>
  )
}

function ClassList({ date }: { date: ISODate }) {
  const store = useStore()
  const classes = store.classesOn(date)
  const booking = store.bookingOn(date)
  // Once signed in that day, other classes are no longer bookable.
  const bookable = date >= store.today && booking?.status !== 'signedIn'
  if (classes.length === 0) {
    return <Text style={styles.emptyText}>No classes</Text>
  }
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: color.line }}>
      {classes.map((c) => (
        <ClassRow
          key={c.id}
          session={c}
          status={booking?.classSessionId === c.id ? booking.status : undefined}
          bookable={bookable}
          onBook={() => {
            haptic('medium')
            store.book(date, c.id)
          }}
          onCancel={() => store.cancelBooking(date)}
        />
      ))}
    </View>
  )
}

function ClassRow({
  session,
  status,
  bookable,
  onBook,
  onCancel,
}: {
  session: ClassSession
  status?: 'booked' | 'signedIn'
  bookable: boolean
  onBook: () => void
  onCancel: () => void
}) {
  const mine = status !== undefined
  const count = session.athletes + (mine ? 1 : 0)
  return (
    <View style={styles.classRow}>
      <Text style={styles.classTime}>{clockLabel(session.startsAt)}</Text>
      <View style={styles.classRight}>
        <Text style={styles.classCount}>{session.capacity === undefined ? 'Open' : `${count} athletes`}</Text>
        {status === 'signedIn' ? (
          <View style={[styles.classPill, styles.classPillOn]}>
            <Text style={[styles.classPillText, { color: color.bg, fontFamily: font.sansSemi }]}>Signed in</Text>
          </View>
        ) : status === 'booked' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Booked ${clockLabel(session.startsAt)}. Tap to cancel.`}
            onPress={onCancel}
            style={[styles.classPill, { borderColor: color.white }]}
          >
            <Text style={styles.classPillText}>Booked</Text>
          </Pressable>
        ) : bookable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Book ${clockLabel(session.startsAt)}`}
            onPress={onBook}
            style={({ pressed }) => [styles.classPill, pressed && { backgroundColor: color.surface3 }]}
          >
            <Text style={styles.classPillText}>Book</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: gutter, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayLink: { height: 44, justifyContent: 'center' },
  todayLinkText: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.7, textTransform: 'uppercase', color: color.text },
  monthRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
  cellWrap: { width: `${100 / 7}%`, paddingHorizontal: 2 },
  weekday: { textAlign: 'center', fontFamily: font.mono, fontSize: 11, letterSpacing: 1.1, color: color.muted },
  cell: {
    aspectRatio: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.cellLine,
    paddingTop: 5,
    paddingRight: 6,
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  cellSelected: { backgroundColor: color.white, borderColor: color.white },
  cellToday: { borderColor: color.white },
  cellNum: { fontFamily: font.mono, fontSize: 12, color: color.text },
  attendBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: color.accent },
  detail: { marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderTopColor: color.line, gap: 18 },
  dayLabel: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1.56, textTransform: 'uppercase', color: color.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 12,
  },
  cardMono: { fontFamily: font.mono, fontSize: 13, color: color.muted },
  empty: { padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: color.lineStrong, borderRadius: 12 },
  emptyText: { fontFamily: font.sans, fontSize: 15, color: color.muted },
  classRow: {
    minHeight: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  classTime: { fontFamily: font.mono, fontSize: 17, color: color.text },
  classRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  classCount: { fontFamily: font.mono, fontSize: 13, color: color.muted },
  classPill: {
    height: 36,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classPillOn: { backgroundColor: color.white, borderColor: color.white },
  classPillText: { fontFamily: font.sansMedium, fontSize: 14, color: color.text },
})
