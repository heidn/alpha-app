import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { clockLabel, dayTitle, fromISO, monthGrid, monthName } from '../src/data/dates'
import { divisionText, METCON_LABEL, scoreText, topSet } from '../src/data/rules'
import { useStore } from '../src/data/store'
import type { ClassSession, ISODate, Workout } from '../src/data/types'
import { Button, Card, ChevronLeft, ChevronRight, cx, haptic, Layout, ListRow, Screen, Text } from '../src/ui'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function CalendarScreen() {
  const store = useStore()
  const { today } = store
  const params = useLocalSearchParams<{ date?: string }>()
  const [selected, setSelected] = useState<ISODate>(params.date ?? today)
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(selected)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const goToday = () => {
    const d = fromISO(today)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(today)
  }

  const cells = monthGrid(cursor.year, cursor.month)
  const workout = store.workoutOn(selected)
  const attended = store.bookingOn(selected)?.status === 'signedIn'
  const isPast = selected < today

  return (
    <Screen
      header={{
        nav: 'close',
        right: (
          <Pressable accessibilityRole="button" onPress={goToday} className="h-11 justify-center">
            <Text className="font-mono text-[12px] tracking-[1.7px] uppercase">Today</Text>
          </Pressable>
        ),
      }}
    >
      <Layout row center between className="-mt-2">
        <Text variant="title" accessibilityRole="header">
          {monthName(cursor.month)} <Text className="text-muted">{cursor.year}</Text>
        </Text>
        <Layout row className="-mr-3">
          <Button variant="icon" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="icon" accessibilityLabel="Next month" onPress={() => shiftMonth(1)}>
            <ChevronRight />
          </Button>
        </Layout>
      </Layout>

      <Layout row className="mt-5 -mx-0.5 flex-wrap">
        {WEEKDAYS.map((d, i) => (
          <View key={i} className="w-[14.2857%] px-0.5">
            <Text className="text-center font-mono text-[11px] tracking-[1.1px] text-muted">{d}</Text>
          </View>
        ))}
      </Layout>
      <Layout row className="mt-2.5 -mx-0.5 flex-wrap gap-y-1">
        {cells.map((date, i) => (
          <View key={date ?? `b${i}`} className="w-[14.2857%] px-0.5">
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
      </Layout>

      <Layout gap={5} className="mt-7 pt-6 border-t border-line">
        <Text className="font-mono text-[13px] tracking-[1.6px] uppercase">{selected === today ? "Today's workout" : dayTitle(selected)}</Text>

        {selected === today && workout ? (
          <SummaryCard workout={workout} onPress={() => router.dismissTo('/')} />
        ) : isPast && attended && workout ? (
          <SummaryCard workout={workout} withResults onPress={() => router.push(`/day/${selected}`)} />
        ) : (
          <Card variant="dashed">
            <Text className="text-[15px] text-muted">{isPast ? 'Rest day' : 'Workout not posted yet'}</Text>
          </Card>
        )}

        <Text variant="heading" className="mt-2">
          Classes
        </Text>
        <ClassList date={selected} />
      </Layout>
    </Screen>
  )
}

function DayCell({ date, today, selected, attended, onPress }: { date: ISODate; today: ISODate; selected: boolean; attended: boolean; onPress: () => void }) {
  const isToday = date === today
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dayTitle(date)}${attended ? ', attended' : ''}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cx(
        'aspect-square rounded border pt-[5px] pr-1.5 items-end overflow-hidden',
        selected ? 'bg-white border-white' : isToday ? 'border-white' : 'border-cell-line',
      )}
    >
      <Text className={cx('font-mono text-[12px]', selected ? 'text-ink' : date < today ? 'text-muted' : 'text-fg')}>{fromISO(date).getDate()}</Text>
      {attended && <View className="absolute left-0 right-0 bottom-0 h-[3px] bg-accent" />}
    </Pressable>
  )
}

function SummaryCard({ workout, withResults, onPress }: { workout: Workout; withResults?: boolean; onPress: () => void }) {
  const store = useStore()
  const lift = workout.lift
  const liftRes = withResults ? store.liftResult(workout.id) : undefined
  const met = withResults ? store.metconResult(workout.id) : undefined
  return (
    <Card onPress={onPress} accessibilityRole="link" className="flex-row items-center gap-3">
      <Layout gap={3} className="flex-1">
        {lift && (
          <Layout className="gap-[3px]">
            <Text variant="heading" className="text-[11px]">
              Lifting
            </Text>
            <Text>
              {store.movementName(lift.movementId)}{' '}
              <Text className="font-mono text-[13px] text-muted">
                {liftRes ? `top set ${topSet(liftRes).weight} lb` : `${lift.sets} × ${lift.reps} @ ${lift.percent}%`}
              </Text>
            </Text>
          </Layout>
        )}
        {workout.metcon && (
          <Layout className="gap-[3px]">
            <Text variant="heading" className="text-[11px]">
              Metcon
            </Text>
            <Text>
              {METCON_LABEL[workout.metcon.type]}{' '}
              {met && (
                <Text className="font-mono text-[13px] text-muted">
                  {scoreText(met.score)} {divisionText(met.division)}
                </Text>
              )}
            </Text>
          </Layout>
        )}
      </Layout>
      <ChevronRight />
    </Card>
  )
}

function ClassList({ date }: { date: ISODate }) {
  const store = useStore()
  const classes = store.classesOn(date)
  const booking = store.bookingOn(date)
  // Once signed in that day, other classes are no longer bookable.
  const bookable = date >= store.today && booking?.status !== 'signedIn'
  if (classes.length === 0) return <Text className="text-[15px] text-muted">No classes</Text>
  return (
    <Layout className="border-t border-line">
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
    </Layout>
  )
}

function ClassRow({ session, status, bookable, onBook, onCancel }: { session: ClassSession; status?: 'booked' | 'signedIn'; bookable: boolean; onBook: () => void; onCancel: () => void }) {
  const time = clockLabel(session.startsAt)
  const count = session.athletes + (status ? 1 : 0)
  return (
    <ListRow className="min-h-[60px]">
      <Text className="font-mono text-[17px]">{time}</Text>
      <Layout row center gap={4}>
        <Text className="font-mono text-[13px] text-muted">{session.capacity === undefined ? 'Open' : `${count} athletes`}</Text>
        {status === 'signedIn' ? (
          <View className="h-9 px-3.5 rounded-full bg-white items-center justify-center">
            <Text className="font-sans-semibold text-[14px] text-ink">Signed in</Text>
          </View>
        ) : status === 'booked' ? (
          <Button variant="outline" label="Booked" accessibilityLabel={`Booked ${time}. Tap to cancel.`} onPress={onCancel} className="border-white" />
        ) : bookable ? (
          <Button variant="outline" label="Book" accessibilityLabel={`Book ${time}`} onPress={onBook} />
        ) : null}
      </Layout>
    </ListRow>
  )
}
