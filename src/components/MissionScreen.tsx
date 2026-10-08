import { useEffect, useRef, useState } from 'react'
import type { MissionStateView, PlayerView, Role, TaskView } from '../lib/gameTypes'
import { ROLE_META } from '../lib/gameTypes'
import { sfx, vibrate } from '../lib/sound'
import { Spaceship } from './Spaceship'
import { HudPanel, RoleBadge, RoleIcon, SystemBar } from './ui'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function MissionTimer({
  startedAt,
  durationMinutes,
  clockOffset,
}: {
  startedAt: number
  durationMinutes: number
  clockOffset: number
}) {
  const [, force] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => force((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [])
  const now = Date.now() + clockOffset
  const target = startedAt + durationMinutes * 60_000
  const remain = target - now
  const over = remain < 0
  const abs = Math.abs(remain)
  const mm = Math.floor(abs / 60_000)
  const ss = Math.floor((abs % 60_000) / 1000)
  return (
    <div className={`mission-timer ${over ? 'overtime' : ''}`}>
      <span className="timer-value">
        {over ? '+' : ''}
        {pad(mm)}:{pad(ss)}
      </span>
      <span className="timer-label">{over ? 'OVERTIME — NO PRESSURE, FINISH STRONG' : 'MISSION TARGET'}</span>
    </div>
  )
}

export function systemProgress(state: MissionStateView) {
  // null = that chore isn't in this mission (nobody picked the role),
  // so the matching ship system was never installed.
  const prog = (role: Role): number | null => {
    const roleTasks = state.tasks.filter((t) => t.role === role)
    if (roleTasks.length === 0) return null
    return roleTasks.filter((t) => t.done).length / roleTasks.length
  }
  return {
    nav: prog('clearer'),
    eng: prog('cleaner'),
    shields: prog('finisher'),
  }
}

export function ShipPanel({
  state,
  mode,
}: {
  state: MissionStateView
  mode?: 'grounded' | 'launching' | 'flying'
}) {
  const { nav, eng, shields } = systemProgress(state)
  const nameFor = (role: Role) =>
    state.players.find((p) => p.role === role)?.nickname
  return (
    <HudPanel tone="blue" className="ship-panel">
      <div className="ship-stage">
        <Spaceship nav={nav} eng={eng} shields={shields} mode={mode ?? 'grounded'} />
      </div>
      <div className="ship-systems">
        {nav !== null && (
          <SystemBar role="clearer" label="NAVIGATION" value={nav} sub={nameFor('clearer')} />
        )}
        {eng !== null && (
          <SystemBar role="cleaner" label="ENGINES" value={eng} sub={nameFor('cleaner')} />
        )}
        {shields !== null && (
          <SystemBar role="finisher" label="SHIELDS" value={shields} sub={nameFor('finisher')} />
        )}
      </div>
    </HudPanel>
  )
}

function TaskCard({
  task,
  index,
  total,
  onComplete,
}: {
  task: TaskView
  index: number
  total: number
  onComplete: (id: number) => Promise<string | null>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justDone, setJustDone] = useState(false)

  const complete = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    sfx.taskDone()
    setJustDone(true)
    const err = await onComplete(task.id)
    if (err) {
      setError(err)
      setJustDone(false)
    }
    setBusy(false)
  }

  return (
    <HudPanel
      tone={task.role === 'clearer' ? 'blue' : task.role === 'cleaner' ? 'yellow' : 'red'}
      className={`task-card ${justDone ? 'task-done-anim' : ''}`}
    >
      <div className="task-head">
        <span className="task-counter">
          OBJECTIVE {index + 1}/{total}
        </span>
        <RoleBadge role={task.role} small />
      </div>
      <h2 className="task-title">{task.title}</h2>
      <p className="task-detail">{task.detail}</p>
      {error && <p className="error-text">{error}</p>}
      <button
        className={`btn btn-complete role-bg-${task.role}`}
        onClick={complete}
        disabled={busy}
      >
        {busy ? 'TRANSMITTING…' : 'TASK COMPLETE'}
      </button>
    </HudPanel>
  )
}

function HoldToLaunch({
  me,
  players,
  onReady,
}: {
  me: PlayerView
  players: PlayerView[]
  onReady: (ready: boolean) => Promise<string | null>
}) {
  const holding = useRef(false)
  const [isHolding, setIsHolding] = useState(false)

  const setHold = (hold: boolean) => {
    if (holding.current === hold) return
    holding.current = hold
    setIsHolding(hold)
    if (hold) {
      sfx.tap()
      vibrate(30)
    }
    void onReady(hold)
  }

  return (
    <div className="launch-pad-section">
      <div className="all-systems-banner">ALL SYSTEMS ONLINE</div>
      <p className="launch-instruction">
        Every crew member must <strong>press and hold</strong> their launch
        lever at the same time.
      </p>
      <div className="ready-dots">
        {players.map((p) => (
          <span
            key={p.id}
            className={`ready-dot role-border-${p.role} ${p.ready || (p.id === me.id && isHolding) ? 'ready' : ''}`}
          >
            <RoleIcon role={p.role} size={14} />
            {p.nickname}
          </span>
        ))}
      </div>
      <button
        className={`btn btn-launch ${isHolding ? 'holding' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault()
          setHold(true)
        }}
        onPointerUp={() => setHold(false)}
        onPointerLeave={() => setHold(false)}
        onPointerCancel={() => setHold(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isHolding ? 'HOLD STEADY…' : 'HOLD TO LAUNCH'}
        <span className="launch-ring" aria-hidden="true" />
      </button>
    </div>
  )
}

export function MissionScreen({
  state,
  playerId,
  clockOffset,
  onComplete,
  onReady,
}: {
  state: MissionStateView
  playerId: string
  clockOffset: number
  onComplete: (id: number) => Promise<string | null>
  onReady: (ready: boolean) => Promise<string | null>
}) {
  const me = state.players.find((p) => p.id === playerId)
  if (!me) return null
  const meta = ROLE_META[me.role]

  const myTasks = state.tasks.filter((t) => t.role === me.role)
  const current = myTasks.find((t) => t.available) ?? null
  const blocked = myTasks.filter((t) => !t.done && !t.available)
  const doneCount = myTasks.filter((t) => t.done).length
  const allMineDone = myTasks.length > 0 && doneCount === myTasks.length
  const isReadyPhase = state.mission.status === 'ready'
  const teammates = state.players.filter((p) => p.id !== playerId)

  return (
    <main className="screen-main mission">
      {state.mission.startedAt && (
        <MissionTimer
          startedAt={state.mission.startedAt}
          durationMinutes={state.mission.durationMinutes}
          clockOffset={clockOffset}
        />
      )}

      <div className={`role-banner role-bg-${me.role}`}>
        <RoleIcon role={me.role} size={22} />
        <div>
          <div className="role-banner-name">
            {meta.label.toUpperCase()} · {me.nickname}
          </div>
          <div className="role-banner-system">
            System: {meta.system} · {doneCount}/{myTasks.length} objectives
          </div>
        </div>
      </div>

      {isReadyPhase ? (
        <HoldToLaunch me={me} players={state.players} onReady={onReady} />
      ) : current ? (
        <TaskCard
          task={current}
          index={myTasks.indexOf(current)}
          total={myTasks.length}
          onComplete={onComplete}
        />
      ) : allMineDone ? (
        <HudPanel tone="white" className="task-card waiting-card">
          <h2 className="task-title">{meta.system.toUpperCase()} ONLINE</h2>
          <p className="task-detail">
            Your system is fully operational! Help your crew in the real world —
            the ship launches when every system is online.
          </p>
          <div className="radar-ring radar-small" aria-hidden="true" />
        </HudPanel>
      ) : blocked.length > 0 ? (
        <HudPanel tone="white" className="task-card waiting-card">
          <div className="task-head">
            <span className="task-counter">STANDBY</span>
            <RoleBadge role={me.role} small />
          </div>
          <h2 className="task-title">{blocked[0].title}</h2>
          <p className="task-detail">
            Waiting for the{' '}
            <strong className={`role-text-${blocked[0].blockedByRole ?? 'clearer'}`}>
              {ROLE_META[blocked[0].blockedByRole ?? 'clearer'].label}
            </strong>{' '}
            to prepare this area. Catch your breath, Captain.
          </p>
          <div className="radar-ring radar-small" aria-hidden="true" />
        </HudPanel>
      ) : null}

      <ShipPanel state={state} />

      {teammates.length > 0 && (
        <HudPanel tone="white" className="teammates-panel">
          <div className="field-label">CREW STATUS</div>
          {teammates.map((p) => (
            <div key={p.id} className="teammate-row">
              <span className={`crew-dot ${p.online ? 'online' : 'offline'}`} />
              <span className="teammate-name">{p.nickname}</span>
              <RoleBadge role={p.role} small />
              <span className="teammate-progress">
                {p.tasksDone}/{p.tasksTotal}
              </span>
            </div>
          ))}
        </HudPanel>
      )}

      {!isReadyPhase && myTasks.length > 0 && (
        <HudPanel tone="white" className="tasklist-panel">
          <div className="field-label">YOUR OBJECTIVE QUEUE</div>
          <ol className="task-list">
            {myTasks.map((t) => (
              <li
                key={t.id}
                className={`task-row ${t.done ? 'done' : t.available ? 'available' : 'locked'}`}
              >
                <span className="task-row-state" aria-hidden="true">
                  {t.done ? '✓' : t.available ? '▸' : '◌'}
                </span>
                <span className="task-row-title">{t.title}</span>
                {!t.done && !t.available && t.blockedByRole && (
                  <span className={`task-row-lock role-text-${t.blockedByRole}`}>
                    {ROLE_META[t.blockedByRole].label} unlocks
                  </span>
                )}
              </li>
            ))}
          </ol>
        </HudPanel>
      )}
    </main>
  )
}
