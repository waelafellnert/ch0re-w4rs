import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { HowToPlay } from '../components/HowToPlay'
import { Spaceship } from '../components/Spaceship'
import { Starfield } from '../components/Starfield'
import { HudPanel, SettingsToggles } from '../components/ui'
import type { CrewSession } from '../lib/session'
import { getLastSession } from '../lib/session'
import { sfx, unlockAudio } from '../lib/sound'

export const Route = createFileRoute('/')({
  component: Welcome,
})

function Welcome() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [resume, setResume] = useState<CrewSession | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)

  useEffect(() => {
    setResume(getLastSession())
  }, [])

  const joinCode = code.trim().toUpperCase()

  const goJoin = () => {
    if (joinCode.length < 4) return
    unlockAudio()
    sfx.tap()
    void navigate({ to: '/m/$code', params: { code: joinCode } })
  }

  return (
    <div className="screen">
      <Starfield />
      <header className="screen-top">
        <span className="chip chip-blue">CO-OP MISSION CONTROL</span>
        <SettingsToggles />
      </header>

      <main className="screen-main welcome">
        <div className="welcome-ship">
          <div className="radar-ring" aria-hidden="true" />
          <Spaceship nav={0.4} eng={0.35} shields={0.3} mode="grounded" className="ship-idle" />
        </div>

        <h1 className="game-title">
          CHORE
          <span className="game-title-accent">WARS</span>
        </h1>
        <p className="tagline">
          Your home is the level. Your phones are the controllers.
          <br />
          <strong>May the chores be with you.</strong>
        </p>

        {resume && (
          <Link
            to="/m/$code"
            params={{ code: resume.code }}
            className="resume-banner"
            onClick={() => unlockAudio()}
          >
            <span className="resume-pulse" aria-hidden="true" />
            Resume mission <strong>{resume.code}</strong> as {resume.nickname}
          </Link>
        )}

        <Link
          to="/create"
          className="btn btn-primary btn-xl"
          onClick={() => {
            unlockAudio()
            sfx.tap()
          }}
        >
          CREATE MISSION
        </Link>

        <HudPanel tone="yellow" className="join-panel">
          <label className="join-label" htmlFor="join-code">
            JOIN A CREW
          </label>
          <div className="join-row">
            <input
              id="join-code"
              className="code-input"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4))
              }
              onKeyDown={(e) => e.key === 'Enter' && goJoin()}
              placeholder="CODE"
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
            />
            <button
              className="btn btn-secondary"
              onClick={goJoin}
              disabled={joinCode.length < 4}
            >
              JOIN
            </button>
          </div>
        </HudPanel>

        <button
          className="btn-howto"
          onClick={() => {
            unlockAudio()
            sfx.tap()
            setShowHowTo(true)
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.2 9a2.9 2.9 0 015.6 1c0 1.9-2.8 2.4-2.8 3.8" />
            <path d="M12 17h.01" />
          </svg>
          HOW TO PLAY
        </button>
      </main>

      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}

      <footer className="screen-foot">
        <p>2–3 players · real chores · one spaceship</p>
        <p className="footer-credit">
          Built with 💖 by{' '}
          <a href="https://x.com/_waela" target="_blank" rel="noopener noreferrer">
            Waela
          </a>
        </p>
      </footer>
    </div>
  )
}
