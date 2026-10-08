import { useEffect, useMemo, useState } from 'react'
import { toDataURL } from 'qrcode'
import type { MissionStateView, Role } from '../lib/gameTypes'
import { formatMinutes, ROLE_META } from '../lib/gameTypes'
import { ROLE_ORDER } from '../lib/tasks'
import { sfx } from '../lib/sound'
import { HudPanel, RoleBadge, RoleIcon } from './ui'

export function Lobby({
  state,
  playerId,
  isHost,
  onStart,
  onChangeRole,
}: {
  state: MissionStateView
  playerId: string
  isHost: boolean
  onStart: () => Promise<string | null>
  onChangeRole: (role: Role) => Promise<string | null>
}) {
  const { mission, players } = state
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const joinUrl = useMemo(
    () =>
      typeof window !== 'undefined'
        ? `${window.location.origin}/m/${mission.code}`
        : '',
    [mission.code],
  )

  useEffect(() => {
    if (!joinUrl) return
    toDataURL(joinUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#0a1020', light: '#e8f6ff' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [joinUrl])

  const share = async () => {
    sfx.tap()
    const text = `Join my Chore Wars crew! Room code ${mission.code} — ${joinUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chore Wars', text, url: joinUrl })
        return
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const start = async () => {
    if (starting) return
    setStarting(true)
    setError(null)
    const err = await onStart()
    if (err) {
      setError(err)
      setStarting(false)
    }
  }

  const me = players.find((p) => p.id === playerId) ?? null
  const switchRole = async (role: Role) => {
    if (switching || !me || me.role === role) return
    sfx.tap()
    setSwitching(true)
    setError(null)
    const err = await onChangeRole(role)
    if (err) setError(err)
    setSwitching(false)
  }

  const slots = Array.from({ length: mission.maxPlayers }, (_, i) => players[i] ?? null)
  const canStart = players.length >= 2

  return (
    <main className="screen-main lobby">
      <h1 className="screen-title">CREW LOBBY</h1>
      <p className="screen-sub">
        {mission.roomLabel} reset · {formatMinutes(mission.durationMinutes)} target
      </p>

      <HudPanel tone="yellow" className="code-panel">
        <div className="code-panel-label">ROOM CODE</div>
        <div className="room-code" aria-label={`Room code ${mission.code}`}>
          {mission.code.split('').map((c, i) => (
            <span key={i} className="code-char">
              {c}
            </span>
          ))}
        </div>
        <div className="share-row">
          {qr && (
            <img src={qr} alt={`QR code to join mission ${mission.code}`} className="qr-img" />
          )}
          <div className="share-col">
            <p className="share-hint">
              Crewmates scan the code or open the link on their own phone — no
              account needed.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={share}>
              {copied ? 'LINK COPIED!' : 'SHARE INVITE'}
            </button>
          </div>
        </div>
      </HudPanel>

      <HudPanel tone="blue" className="crew-panel">
        <div className="field-label">
          CREW MANIFEST · {players.length}/{mission.maxPlayers}
        </div>
        <div className="crew-slots">
          {slots.map((p, i) => (
            <div
              key={i}
              className={`crew-slot ${p ? `filled role-border-${p.role}` : 'empty'}`}
            >
              {p ? (
                <>
                  <span className={`crew-dot ${p.online ? 'online' : 'offline'}`} />
                  <span className="crew-name">
                    {p.nickname}
                    {p.id === playerId && <em> (you)</em>}
                    {p.isHost && <span className="host-tag">HOST</span>}
                  </span>
                  <RoleBadge role={p.role} small />
                </>
              ) : (
                <>
                  <span className="radar-mini" aria-hidden="true" />
                  <span className="crew-name waiting">Scanning for crew…</span>
                </>
              )}
            </div>
          ))}
        </div>
      </HudPanel>

      <HudPanel tone="red" className="role-brief">
        <div className="field-label">CHORE ASSIGNMENTS · TAP TO CLAIM YOURS</div>
        <div className="role-pick-list">
          {ROLE_ORDER.map((r) => {
            const meta = ROLE_META[r]
            const owner = players.find((p) => p.role === r) ?? null
            const mine = owner?.id === playerId
            const claimedByOther = !!owner && !mine
            return (
              <button
                key={r}
                className={`role-pick role-pick-${r} ${mine ? 'selected' : ''} ${claimedByOther ? 'taken' : ''}`}
                disabled={claimedByOther || switching}
                onClick={() => switchRole(r)}
                aria-pressed={mine}
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
                <span className="role-pick-status">
                  {mine ? 'YOU' : (owner?.nickname ?? 'OPEN')}
                </span>
              </button>
            )
          })}
        </div>
      </HudPanel>

      {error && <p className="error-text">{error}</p>}

      {isHost ? (
        <button
          className="btn btn-primary btn-xl"
          onClick={start}
          disabled={!canStart || starting}
        >
          {starting
            ? 'IGNITING…'
            : canStart
              ? players.length < mission.maxPlayers
                ? `START WITH ${players.length} CREW`
                : 'START MISSION'
              : 'WAITING FOR CREW…'}
        </button>
      ) : (
        <div className="waiting-host">
          <span className="radar-mini" aria-hidden="true" />
          Waiting for the host to start the mission…
        </div>
      )}
    </main>
  )
}
