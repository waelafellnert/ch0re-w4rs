import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { MissionStateView } from '../lib/gameTypes'
import { ROLE_META } from '../lib/gameTypes'
import { clearLastSession } from '../lib/session'
import { sfx } from '../lib/sound'
import { Spaceship } from './Spaceship'
import { HudPanel, RoleIcon } from './ui'

function formatDuration(ms: number): string {
  const totalSec = Math.max(Math.round(ms / 1000), 0)
  const mm = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function CompleteScreen({ state }: { state: MissionStateView }) {
  const { mission, players, tasks } = state
  const fanfared = useRef(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (!fanfared.current) {
      fanfared.current = true
      sfx.fanfare()
    }
  }, [])

  const actualMs =
    mission.completedAt && mission.startedAt
      ? mission.completedAt - mission.startedAt
      : null
  const totalTasks = tasks.length

  const share = async () => {
    sfx.tap()
    const text = `Mission complete! Our crew of ${players.length} reset the ${mission.roomLabel.toLowerCase()} and launched the ship — ${totalTasks} real chores done in ${actualMs ? formatDuration(actualMs) : `${mission.durationMinutes} min`}. Chore Wars: clean together, launch together.`
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chore Wars — Mission Complete', text, url })
        return
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setShared(true)
      window.setTimeout(() => setShared(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <main className="screen-main complete">
      <div className="complete-ship">
        <Spaceship
          nav={tasks.some((t) => t.role === 'clearer') ? 1 : null}
          eng={tasks.some((t) => t.role === 'cleaner') ? 1 : null}
          shields={tasks.some((t) => t.role === 'finisher') ? 1 : null}
          mode="flying"
        />
        <div className="complete-trail" aria-hidden="true" />
      </div>

      <div className="complete-banner">
        <div className="complete-title">MISSION COMPLETE</div>
        <div className="complete-sub">YOUR CREW DID IT!</div>
      </div>

      <HudPanel tone="yellow" className="stats-panel">
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-value">{mission.roomLabel}</span>
            <span className="stat-label">ZONE RESET</span>
          </div>
          <div className="stat">
            <span className="stat-value">{players.length}</span>
            <span className="stat-label">CREW</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalTasks}</span>
            <span className="stat-label">CHORES DONE</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {actualMs ? formatDuration(actualMs) : `${mission.durationMinutes}:00`}
            </span>
            <span className="stat-label">MISSION TIME</span>
          </div>
        </div>
      </HudPanel>

      <HudPanel tone="blue" className="contrib-panel">
        <div className="field-label">CREW CONTRIBUTIONS</div>
        {players.map((p) => (
          <div key={p.id} className="contrib-row">
            <span className={`contrib-icon role-text-${p.role}`}>
              <RoleIcon role={p.role} size={16} />
            </span>
            <span className="contrib-name">{p.nickname}</span>
            <span className="contrib-detail">
              {ROLE_META[p.role].system} · {p.tasksDone} objectives
            </span>
          </div>
        ))}
        <p className="contrib-footer">One crew. One ship. Zero clutter left behind.</p>
      </HudPanel>

      <div className="complete-actions">
        <button className="btn btn-secondary" onClick={share}>
          {shared ? 'COPIED!' : 'SHARE RESULT'}
        </button>
        <Link
          to="/create"
          className="btn btn-primary"
          onClick={() => {
            clearLastSession()
            sfx.tap()
          }}
        >
          NEW MISSION
        </Link>
      </div>
    </main>
  )
}
