"use client"

import { useEffect, useState } from "react"
import { cachedLegRoute, legRoute, type LegRoute } from "@/lib/directions"
import type { Journey } from "@/lib/types"

/** Road names, turns and geometry for each leg of a journey (loaded in the background). */
export function useLegRoutes(journey: Journey | undefined): (LegRoute | undefined)[] {
  const [state, setState] = useState<{ id: string; routes: (LegRoute | undefined)[] } | null>(null)

  useEffect(() => {
    if (!journey) return
    let cancelled = false
    Promise.all(journey.legs.map(legRoute)).then((routes) => {
      if (!cancelled) setState({ id: journey.id, routes })
    })
    return () => {
      cancelled = true
    }
  }, [journey])

  if (!journey) return []
  if (state?.id === journey.id) return state.routes
  return journey.legs.map(cachedLegRoute)
}
