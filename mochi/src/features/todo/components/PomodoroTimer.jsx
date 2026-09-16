import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import mochiLogo from '../../../../../ui-revamp/mochi_assets/mochi_loggo.png'

const SHORT = 5 * 60
const LONG = 15 * 60
const QUOTES = [
  'Small steps still move you forward.',
  'You only need to focus on this moment.',
  'Your future self will thank you for starting.',
  'Progress counts, even when it feels tiny.',
  'One focused session is a good win.',
]
const fmt = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function PomodoroTimer() {
  const { tasks, pomodoro, setPomodoro, setPomodoroFocusMinutes, closePomodoro, updateTask } = useStore()
  const task = tasks.find((item) => item.id === pomodoro.taskId)
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Date.now() / 300000) % QUOTES.length)
  const [position, setPosition] = useState({ x: Math.max(16, window.innerWidth - 320), y: Math.max(16, window.innerHeight - 280) })
  const dragRef = useRef(null)

  useEffect(() => {
    const quoteTimer = setInterval(() => setQuoteIndex((index) => (index + 1) % QUOTES.length), 300000)
    return () => clearInterval(quoteTimer)
  }, [])

  useEffect(() => {
    if (!pomodoro.isRunning) return undefined
    const interval = setInterval(() => {
      const current = useStore.getState().pomodoro
      if (current.secondsLeft > 1) {
        setPomodoro({ secondsLeft: current.secondsLeft - 1 })
        return
      }
      if (!current.isBreak) {
        const next = current.sessionPomos + 1
        const isLongBreak = next % 4 === 0
        const currentTask = useStore.getState().tasks.find((item) => item.id === current.taskId)
        if (currentTask) updateTask(currentTask.id, { pomodoroCount: (currentTask.pomodoroCount || 0) + 1 })
        setPomodoro({ isRunning: false, isBreak: true, isLongBreak, secondsLeft: isLongBreak ? LONG : SHORT, sessionPomos: next })
      } else {
        setPomodoro({ isRunning: false, isBreak: false, isLongBreak: false, secondsLeft: current.focusMinutes * 60 })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [pomodoro.isRunning, setPomodoro, updateTask])

  useEffect(() => {
    const onResize = () => setPosition((current) => ({ x: Math.min(current.x, Math.max(16, window.innerWidth - 300)), y: Math.min(current.y, Math.max(16, window.innerHeight - 260)) }))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!task) return null
  const phaseName = pomodoro.isBreak ? (pomodoro.isLongBreak ? 'Long break' : 'Short break') : 'Focus'
  const phaseColor = pomodoro.isBreak ? 'var(--mochi-peach-dark)' : 'var(--mochi-mint-dark)'
  const phaseBg = pomodoro.isBreak ? 'var(--mochi-peach)' : 'var(--mochi-mint)'
  const phaseMid = pomodoro.isBreak ? 'var(--mochi-peach-mid)' : 'var(--mochi-mint-mid)'
  const cyclePos = pomodoro.sessionPomos % 4

  const onDragStart = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const start = { x: event.clientX - position.x, y: event.clientY - position.y }
    dragRef.current = (moveEvent) => setPosition({
      x: Math.max(8, Math.min(window.innerWidth - 288, moveEvent.clientX - start.x)),
      y: Math.max(8, Math.min(window.innerHeight - 250, moveEvent.clientY - start.y)),
    })
    event.currentTarget.addEventListener('pointermove', dragRef.current)
  }
  const onDragEnd = (event) => {
    if (dragRef.current) event.currentTarget.removeEventListener('pointermove', dragRef.current)
    dragRef.current = null
  }

  return (
    <section className="pomodoro-dock" style={{ left: position.x, top: position.y, background: phaseBg, border: `2px solid ${phaseMid}` }} aria-label={`Pomodoro timer for ${task.title || 'task'}`}>
      <div className="pomodoro-dock__drag" onPointerDown={onDragStart} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} title="Drag timer">
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); closePomodoro() }} aria-label="Close timer" title="Close timer"><X size={14} /></button>
        <img src={mochiLogo} alt="Mochi" />
      </div>
      <p className="pomodoro-dock__quote">{QUOTES[quoteIndex]}</p>
      <span className="pomodoro-dock__phase" style={{ background: phaseMid, color: phaseColor }}>{phaseName}</span>
      <strong className="pomodoro-dock__clock" style={{ color: phaseColor }}>{fmt(pomodoro.secondsLeft)}</strong>
      <div className="pomodoro-dock__controls">
        <button type="button" onClick={() => setPomodoro({ isRunning: !pomodoro.isRunning })} title={pomodoro.isRunning ? 'Pause' : 'Start'} style={{ background: phaseColor, color: phaseBg }}>{pomodoro.isRunning ? <Pause size={15} fill={phaseBg} strokeWidth={0} /> : <Play size={15} fill={phaseBg} strokeWidth={0} />}</button>
        <button type="button" onClick={() => setPomodoro({ isRunning: false, isBreak: false, isLongBreak: false, secondsLeft: pomodoro.focusMinutes * 60 })} title={`Reset to ${pomodoro.focusMinutes}:00`} style={{ border: `1.5px solid ${phaseColor}`, color: phaseColor }}><RotateCcw size={13} /></button>
        {!pomodoro.isBreak && !pomodoro.isRunning && <label style={{ color: phaseColor }}>Focus
          <select value={pomodoro.focusMinutes} onChange={(event) => setPomodoroFocusMinutes(event.target.value)} aria-label="Focus interval in minutes" style={{ border: `1px solid ${phaseColor}`, color: phaseColor, background: phaseBg }}>
            {[5, 10, 15, 20, 25, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
          </select>
        </label>}
      </div>
      <div className="pomodoro-dock__footer"><span>{[0, 1, 2, 3].map((index) => <i key={index} style={{ background: index < cyclePos ? phaseColor : 'transparent', borderColor: phaseColor }} />)}</span><span><Timer size={11} /> {task.title || 'Current task'}</span></div>
    </section>
  )
}
