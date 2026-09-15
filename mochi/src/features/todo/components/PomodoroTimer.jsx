import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'

const FOCUS = 25 * 60
const SHORT = 5 * 60
const LONG  = 15 * 60

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function PomodoroTimer({ task, onPomodoroComplete, onClose }) {
  const [isRunning,    setIsRunning]    = useState(false)
  const [isBreak,      setIsBreak]      = useState(false)
  const [isLongBreak,  setIsLongBreak]  = useState(false)
  const [secondsLeft,  setSecondsLeft]  = useState(FOCUS)
  const [sessionPomos, setSessionPomos] = useState(0)

  // Refs keep the timer effect free of stale closures
  const isBreakRef      = useRef(false)
  const sessionPomosRef = useRef(0)
  const onCompleteRef   = useRef(onPomodoroComplete)
  useEffect(() => { onCompleteRef.current = onPomodoroComplete }, [onPomodoroComplete])

  useEffect(() => {
    if (!isRunning) return

    // Timer just hit zero — handle phase transition
    if (secondsLeft <= 0) {
      setIsRunning(false)

      if (!isBreakRef.current) {
        // Focus session completed
        const next = sessionPomosRef.current + 1
        sessionPomosRef.current = next
        setSessionPomos(next)
        onCompleteRef.current()

        const longBreak = next % 4 === 0
        isBreakRef.current = true
        setIsBreak(true)
        setIsLongBreak(longBreak)
        setSecondsLeft(longBreak ? LONG : SHORT)
      } else {
        // Break completed
        isBreakRef.current = false
        setIsBreak(false)
        setIsLongBreak(false)
        setSecondsLeft(FOCUS)
      }
      return
    }

    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [isRunning, secondsLeft])

  const handleReset = () => {
    setIsRunning(false)
    isBreakRef.current = false
    setIsBreak(false)
    setIsLongBreak(false)
    setSecondsLeft(FOCUS)
  }

  const phaseName  = isBreak ? (isLongBreak ? 'Long Break' : 'Short Break') : 'Focus'
  const phaseColor = isBreak ? 'var(--mochi-peach-dark)' : 'var(--mochi-mint-dark)'
  const phaseBg    = isBreak ? 'var(--mochi-peach)'      : 'var(--mochi-mint)'
  const phaseMid   = isBreak ? 'var(--mochi-peach-mid)'  : 'var(--mochi-mint-mid)'

  // Dots show progress within the current 4-pomodoro cycle
  const cyclePos = sessionPomos % 4

  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5"
      style={{ background: phaseBg, borderTop: '1px dashed var(--mochi-border)' }}
    >
      {/* Phase pill */}
      <span
        className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
        style={{ background: phaseMid, color: phaseColor }}
      >
        {phaseName}
      </span>

      {/* Clock face */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '20px',
          fontWeight: 800,
          color: phaseColor,
          minWidth: '64px',
          letterSpacing: '0.04em',
        }}
      >
        {fmt(secondsLeft)}
      </span>

      {/* Play / Pause + Reset */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsRunning((r) => !r)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{ background: phaseColor, color: phaseBg }}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning
            ? <Pause size={12} fill={phaseBg} strokeWidth={0} />
            : <Play  size={12} fill={phaseBg} strokeWidth={0} />}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
          style={{ border: `1.5px solid ${phaseColor}`, color: phaseColor }}
          title="Reset to 25:00"
        >
          <RotateCcw size={10} />
        </button>
      </div>

      {/* Cycle dots (4 slots) */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background:   i < cyclePos ? phaseColor : 'transparent',
              border:       `1.5px solid ${phaseColor}`,
              opacity:      i < cyclePos ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Total pomodoros (session + DB) */}
      <span
        className="flex items-center gap-1 flex-shrink-0"
        style={{ fontSize: '11px', color: phaseColor, opacity: 0.85, marginLeft: 'auto' }}
        title="Total pomodoros completed for this task"
      >
        <Timer size={11} strokeWidth={2} />
        <span>×{(task.pomodoroCount || 0) + sessionPomos}</span>
      </span>

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ color: phaseColor, opacity: 0.6 }}
        title="Close timer"
      >
        <X size={12} />
      </button>
    </div>
  )
}
