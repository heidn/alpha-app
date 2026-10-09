import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../../../../convex/_generated/api'

const PICK_KEY = 'workouts.pick'

type Pick = { gymId?: string; classId?: string }

function readPick(): Pick {
  try {
    return JSON.parse(localStorage.getItem(PICK_KEY) ?? '{}') as Pick
  } catch {
    return {}
  }
}

// Staff's chosen gym + class, remembered per browser and shared by the pages that need one.
export function useClassPick() {
  const gyms = useQuery(api.gyms.list)
  const [pick, setPick] = useState(readPick)
  const gym = gyms?.find((g) => g._id === pick.gymId) ?? gyms?.[0]
  const classes = useQuery(api.classes.listByGym, gym ? { gymId: gym._id } : 'skip')
  const cls = classes?.find((c) => c._id === pick.classId) ?? classes?.[0]

  useEffect(() => {
    try {
      localStorage.setItem(PICK_KEY, JSON.stringify(pick))
    } catch {
      // storage unavailable: selection just isn't remembered
    }
  }, [pick])

  return {
    gyms,
    gym,
    classes,
    cls,
    loading: gyms === undefined || (!!gym && classes === undefined),
    pickGym: (gymId: string) => setPick({ gymId }),
    pickClass: (classId: string) => setPick({ gymId: gym?._id, classId }),
  }
}
