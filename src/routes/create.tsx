import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Starfield } from '../components/Starfield'
import { HudPanel, RoleIcon, SettingsToggles } from '../components/ui'
import type { Role, RoomKey } from '../lib/gameTypes'
import { formatMinutes, ROLE_META, ROOM_DURATIONS, ROOM_META } from '../lib/gameTypes'
import { ROLE_ORDER } from '../lib/tasks'
import { saveSession } from '../lib/session'
import { sfx, unlockAudio } from '../lib/sound'

export const Route = createFileRoute('/create')({
  component: CreateMission,
})

const ROOMS: RoomKey[] = ['kitchen', 'living', 'bedroom', 'whole']

function RoomGlyph({ room }: { room: RoomKey }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (room) {
    case 'kitchen':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 3v7a2 2 0 002 2v9M9 3v7a2 2 0 01-2 2M7 3v4" />
          <path d="M17 3c-1.7 0-3 2-3 5 0 2 .8 3.4 2 4v9" />
        </svg>
      )
    case 'living':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3" />
          <path d="M3 13a2 2 0 012-2 2 2 0 012 2v2h10v-2a2 2 0 012-2 2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4z" />
          <path d="M6 19v2M18 19v2" />
        </svg>
      )
    case 'bedroom':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6" />
          <path d="M3 18h18M5 10V6a2 2 0 012-2h10a2 2 0 012 2v4" />
          <path d="M7 10h4v0" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      )
  }
}

function CreateMission() {
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomKey>('kitchen')
  const [maxPlayers, setMaxPlayers] = useState(2)
  // Duration is tracked as a tier (quick/standard/deep) so switching rooms
  // keeps the same depth while the minutes adjust to that room's presets.
  const [tier, setTier] = useState(1)
  const [role, setRole] = useState<Role>('clearer')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durations = ROOM_DURATIONS[room]

  const createMission = async () => {
    if (!nickname.trim() || busy) return
    unlockAudio()
    sfx.tap()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/create-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room,
          maxPlayers,
          durationMinutes: durations[tier],
          role,
          nickname: nickname.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'Could not create the mission')
        setBusy(false)
        return
      }
      saveSession({
        code: data.code,
        playerId: data.playerId,
        token: data.token,
        nickname: nickname.trim(),
        role: data.role,
      })
      void navigate({ to: '/m/$code', params: { code: data.code } })
    } catch {
      setError('Connection lost — try again')
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <Starfield />
      <header className="screen-top">
        <Link to="/" className="back-link" onClick={() => sfx.tap()}>
          ◂ ABORT
        </Link>
        <SettingsToggles />
      </header>

      <main className="screen-main create">
        <h1 className="screen-title">NEW MISSION</h1>
        <p className="screen-sub">Configure the reset. Your crew joins with a code.</p>

        <HudPanel tone="blue" className="form-panel">
          <div className="field-label">TARGET ZONE</div>
          <div className="option-grid">
            {ROOMS.map((r) => (
              <button
                key={r}
                className={`option-card ${room === r ? 'selected' : ''}`}
                onClick={() => {
                  setRoom(r)
                  sfx.tap()
                }}
                aria-pressed={room === r}
              >
                <RoomGlyph room={r} />
                <span className="option-name">{ROOM_META[r].label}</span>
                <span className="option-blurb">{ROOM_META[r].blurb}</span>
              </button>
            ))}
          </div>
        </HudPanel>

        <HudPanel tone="yellow" className="form-panel">
          <div className="form-row">
            <div className="form-col">
              <div className="field-label">CREW SIZE</div>
              <div className="pill-row">
                {[2, 3].map((n) => (
                  <button
                    key={n}
                    className={`pill ${maxPlayers === n ? 'selected' : ''}`}
                    onClick={() => {
                      setMaxPlayers(n)
                      sfx.tap()
                    }}
                    aria-pressed={maxPlayers === n}
                  >
                    {n} PLAYERS
                  </button>
                ))}
              </div>
              <p className="field-hint">
                {maxPlayers === 2
                  ? 'Two crew — each player picks one of the three chores.'
                  : 'Full crew — all three chores claimed, all systems online.'}
              </p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-col">
              <div className="field-label">MISSION TARGET</div>
              <div className="pill-row">
                {durations.map((m, i) => (
                  <button
                    key={m}
                    className={`pill ${tier === i ? 'selected' : ''}`}
                    onClick={() => {
                      setTier(i)
                      sfx.tap()
                    }}
                    aria-pressed={tier === i}
                  >
                    {formatMinutes(m).toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="field-hint">
                A target, not a deadline — the mission never fails on time.
                Longer missions mean more objectives per player.
              </p>
            </div>
          </div>
        </HudPanel>

        <HudPanel tone="red" className="form-panel">
          <div className="field-label">YOUR CHORE</div>
          <div className="role-pick-list">
            {ROLE_ORDER.map((r) => {
              const meta = ROLE_META[r]
              return (
                <button
                  key={r}
                  className={`role-pick role-pick-${r} ${role === r ? 'selected' : ''}`}
                  onClick={() => {
                    setRole(r)
                    sfx.tap()
                  }}
                  aria-pressed={role === r}
                >
                  <span className={`role-pick-icon role-text-${r}`}>
                    <RoleIcon role={r} size={22} />
                  </span>
                  <span className="role-pick-main">
                    <span className="role-pick-name">
                      {meta.label} → {meta.system}
                    </span>
                    <span className="role-pick-tagline">{meta.tagline}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="field-hint">
            Your crewmates pick from the remaining chores when they board.
          </p>
        </HudPanel>

        <HudPanel tone="red" className="form-panel">
          <label className="field-label" htmlFor="nickname">
            YOUR CALLSIGN
          </label>
          <input
            id="nickname"
            className="text-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            onKeyDown={(e) => e.key === 'Enter' && createMission()}
            placeholder="e.g. Captain Maya"
            maxLength={20}
            autoComplete="off"
          />
        </HudPanel>

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn btn-primary btn-xl"
          onClick={createMission}
          disabled={!nickname.trim() || busy}
        >
          {busy ? 'BUILDING SHIP…' : 'OPEN THE AIRLOCK'}
        </button>
      </main>
    </div>
  )
}
