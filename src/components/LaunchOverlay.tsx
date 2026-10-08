import { useEffect, useRef, useState } from 'react'
import type { MissionStateView } from '../lib/gameTypes'
import { sfx } from '../lib/sound'
import { Spaceship } from './Spaceship'
import { systemProgress } from './MissionScreen'

const COUNTDOWN_MS = 3200

/**
 * Full-screen synchronized countdown + launch. Driven by the server's
 * countdownStartedAt timestamp so every phone counts in step.
 */
export function LaunchOverlay({
  state,
  clockOffset,
}: {
  state: MissionStateView
  clockOffset: number
}) {
  const startAt = state.mission.countdownStartedAt ?? Date.now()
  const [elapsed, setElapsed] = useState(() => Date.now() + clockOffset - startAt)
  const lastDigit = useRef<number | null>(null)
  const launched = useRef(false)

  useEffect(() => {
    const t = window.setInterval(() => {
      setElapsed(Date.now() + clockOffset - startAt)
    }, 50)
    return () => window.clearInterval(t)
  }, [clockOffset, startAt])

  const digit = elapsed < 0 ? 3 : Math.max(3 - Math.floor(elapsed / (COUNTDOWN_MS / 3)), 0)
  const lifted = elapsed >= COUNTDOWN_MS

  useEffect(() => {
    if (!lifted && digit > 0 && lastDigit.current !== digit) {
      lastDigit.current = digit
      sfx.countBeep(false)
    }
    if (lifted && !launched.current) {
      launched.current = true
      sfx.countBeep(true)
      sfx.launch()
    }
  }, [digit, lifted])

  const { nav, eng, shields } = systemProgress(state)

  return (
    <div className={`launch-overlay ${lifted ? 'lifted' : ''}`}>
      <div className="launch-streaks" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="streak" style={{ left: `${(i * 7.3 + 3) % 100}%`, animationDelay: `${(i % 7) * 0.13}s` }} />
        ))}
      </div>

      {!lifted ? (
        <div className="countdown-stage">
          <div className="countdown-label">LAUNCH IN</div>
          <div key={digit} className="countdown-digit">
            {digit > 0 ? digit : 1}
          </div>
          <div className="countdown-crew">ALL CREW HOLDING — DO NOT LET GO</div>
        </div>
      ) : (
        <div className="liftoff-stage">
          <div className="liftoff-label">LIFTOFF!</div>
        </div>
      )}

      <div className={`launch-ship ${lifted ? 'flying' : 'rumbling'}`}>
        <Spaceship nav={nav} eng={eng} shields={shields} mode={lifted ? 'flying' : 'launching'} />
      </div>
    </div>
  )
}
