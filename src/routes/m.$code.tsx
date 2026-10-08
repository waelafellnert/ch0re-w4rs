import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { CompleteScreen } from '../components/CompleteScreen'
import { LaunchOverlay } from '../components/LaunchOverlay'
import { Lobby } from '../components/Lobby'
import { MissionScreen } from '../components/MissionScreen'
import { Starfield } from '../components/Starfield'
import { HudPanel, RoleIcon, SettingsToggles, Toasts } from '../components/ui'
import type { MissionStateView, Role } from '../lib/gameTypes'
import { formatMinutes, ROLE_META } from '../lib/gameTypes'
import { ROLE_ORDER } from '../lib/tasks'
import { sfx, unlockAudio } from '../lib/sound'
import { useMission } from '../lib/useMission'

export const Route = createFileRoute('/m/$code')({
  component: MissionRoute,
})

function JoinGate({
  state,
  onJoin,
}: {
  state: MissionStateView
  onJoin: (nickname: string, role: Role) => Promise<string | null>
}) {
  const [nickname, setNickname] = useState('')
  const [picked, setPicked] = useState<Role | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taken = new Set(state.players.map((p) => p.role))
  const firstFree = ROLE_ORDER.find((r) => !taken.has(r)) ?? null
  // Fall back if someone else grabbed the picked chore since the last poll.
  const role = picked && !taken.has(picked) ? picked : firstFree

  const join = async () => {
    if (!nickname.trim() || !role || busy) return
    unlockAudio()
    sfx.tap()
    setBusy(true)
    setError(null)
    const err = await onJoin(nickname.trim(), role)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }

  const full = state.players.length >= state.mission.maxPlayers
  const started = state.mission.status !== 'lobby'

  return (
    <main className="screen-main join-gate">
      <h1 className="screen-title">INCOMING TRANSMISSION</h1>
      <p className="screen-sub">
        You've been invited to crew mission <strong>{state.mission.code}</strong>
      </p>

      <HudPanel tone="blue" className="form-panel">
        <div className="join-meta">
          <div className="join-meta-row">
            <span>TARGET ZONE</span>
            <strong>{state.mission.roomLabel}</strong>
          </div>
          <div className="join-meta-row">
            <span>MISSION TARGET</span>
            <strong>{formatMinutes(state.mission.durationMinutes).toUpperCase()}</strong>
          </div>
          <div className="join-meta-row">
            <span>CREW</span>
            <strong>
              {state.players.length}/{state.mission.maxPlayers} —{' '}
              {state.players.map((p) => p.nickname).join(', ') || 'empty'}
            </strong>
          </div>
        </div>
      </HudPanel>

      {started ? (
        <>
          <p className="error-text">
            This mission already launched. Ask your crew for a fresh code!
          </p>
          <Link to="/" className="btn btn-secondary">
            BACK TO BASE
          </Link>
        </>
      ) : full ? (
        <>
          <p className="error-text">The ship is full — all crew slots are taken.</p>
          <Link to="/" className="btn btn-secondary">
            BACK TO BASE
          </Link>
        </>
      ) : (
        <>
          <HudPanel tone="yellow" className="form-panel">
            <div className="field-label">PICK YOUR CHORE</div>
            <div className="role-pick-list">
              {ROLE_ORDER.map((r) => {
                const meta = ROLE_META[r]
                const claimed = taken.has(r)
                return (
                  <button
                    key={r}
                    className={`role-pick role-pick-${r} ${role === r ? 'selected' : ''} ${claimed ? 'taken' : ''}`}
                    disabled={claimed}
                    onClick={() => {
                      setPicked(r)
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
                    {claimed && (
                      <span className="role-pick-status">
                        {state.players.find((p) => p.role === r)?.nickname}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </HudPanel>
          <HudPanel tone="red" className="form-panel">
            <label className="field-label" htmlFor="join-nickname">
              YOUR CALLSIGN
            </label>
            <input
              id="join-nickname"
              className="text-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              placeholder="e.g. Rocket Ria"
              maxLength={20}
              autoComplete="off"
            />
          </HudPanel>
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn btn-primary btn-xl"
            onClick={join}
            disabled={!nickname.trim() || !role || busy}
          >
            {busy ? 'BOARDING…' : 'BOARD THE SHIP'}
          </button>
        </>
      )}
    </main>
  )
}

function MissionRoute() {
  const { code } = Route.useParams()
  const {
    state,
    session,
    loading,
    offline,
    error,
    toasts,
    dismissToast,
    clockOffset,
    join,
    changeRole,
    start,
    completeTask,
    setReady,
  } = useMission(code.toUpperCase())

  const status = state?.mission.status
  const warp = status === 'countdown' || status === 'complete'

  return (
    <div className="screen">
      <Starfield warp={warp} />

      <header className="screen-top">
        <Link to="/" className="back-link" onClick={() => sfx.tap()}>
          ◂ BASE
        </Link>
        <span className="chip chip-yellow code-chip">{code.toUpperCase()}</span>
        <SettingsToggles />
      </header>

      {offline && (
        <div className="offline-bar" role="alert">
          SIGNAL LOST — RECONNECTING…
        </div>
      )}

      {loading && !state && (
        <main className="screen-main centered">
          <div className="radar-ring" aria-hidden="true" />
          <p className="loading-text">ESTABLISHING UPLINK…</p>
        </main>
      )}

      {error && !state && (
        <main className="screen-main centered">
          <p className="error-text">{error}</p>
          <Link to="/" className="btn btn-secondary">
            BACK TO BASE
          </Link>
        </main>
      )}

      {state && !session && <JoinGate state={state} onJoin={join} />}

      {state && session && (
        <>
          {status === 'lobby' && (
            <Lobby
              state={state}
              playerId={session.playerId}
              isHost={
                state.players.find((p) => p.id === session.playerId)?.isHost ??
                false
              }
              onStart={start}
              onChangeRole={changeRole}
            />
          )}

          {(status === 'active' || status === 'ready') && (
            <MissionScreen
              state={state}
              playerId={session.playerId}
              clockOffset={clockOffset}
              onComplete={completeTask}
              onReady={setReady}
            />
          )}

          {status === 'countdown' && (
            <LaunchOverlay state={state} clockOffset={clockOffset} />
          )}

          {status === 'complete' && <CompleteScreen state={state} />}
        </>
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
