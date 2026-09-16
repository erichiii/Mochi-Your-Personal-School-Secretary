import { useEffect } from 'react'
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'

const SHORT = 5 * 60
const LONG = 15 * 60
const fmt = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export default function PomodoroTimer() {
  const { tasks, pomodoro, setPomodoro, setPomodoroFocusMinutes, closePomodoro, updateTask } = useStore()
  const task = tasks.find((item) => item.id === pomodoro.taskId)

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

  if (!task) return null
  const phaseName = pomodoro.isBreak ? (pomodoro.isLongBreak ? 'Long break' : 'Short break') : 'Focus'
  const phaseColor = pomodoro.isBreak ? 'var(--mochi-peach-dark)' : 'var(--mochi-mint-dark)'
  const phaseBg = pomodoro.isBreak ? 'var(--mochi-peach)' : 'var(--mochi-mint)'
  const phaseMid = pomodoro.isBreak ? 'var(--mochi-peach-mid)' : 'var(--mochi-mint-mid)'
  const cyclePos = pomodoro.sessionPomos % 4

  return (
    <div className="pomodoro-dock flex items-center gap-4 px-4 py-2.5" style={{ background: phaseBg, border: `1.5px solid ${phaseMid}` }}>
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0" style={{ background: phaseMid, color: phaseColor }}>{phaseName}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 800, color: phaseColor, minWidth: '64px', letterSpacing: '0.04em' }}>{fmt(pomodoro.secondsLeft)}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setPomodoro({ isRunning: !pomodoro.isRunning })} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: phaseColor, color: phaseBg }} title={pomodoro.isRunning ? 'Pause' : 'Start'}>{pomodoro.isRunning ? <Pause size={12} fill={phaseBg} strokeWidth={0} /> : <Play size={12} fill={phaseBg} strokeWidth={0} />}</button>
        <button type="button" onClick={() => setPomodoro({ isRunning: false, isBreak: false, isLongBreak: false, secondsLeft: pomodoro.focusMinutes * 60 })} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${phaseColor}`, color: phaseColor }} title={`Reset to ${pomodoro.focusMinutes}:00`}><RotateCcw size={10} /></button>
      </div>
      {!pomodoro.isBreak && !pomodoro.isRunning && <label className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: phaseColor }}>Focus
        <select value={pomodoro.focusMinutes} onChange={(event) => setPomodoroFocusMinutes(event.target.value)} aria-label="Focus interval in minutes" style={{ border: `1px solid ${phaseColor}`, borderRadius: '999px', padding: '2px 5px', background: phaseBg, color: phaseColor, fontSize: '10px' }}>
          {[5, 10, 15, 20, 25, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
        </select>
      </label>}
      <div className="flex items-center gap-1">{[0, 1, 2, 3].map((index) => <span key={index} className="w-2 h-2 rounded-full" style={{ background: index < cyclePos ? phaseColor : 'transparent', border: `1.5px solid ${phaseColor}`, opacity: index < cyclePos ? 1 : 0.3 }} />)}</div>
      <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: '11px', color: phaseColor, opacity: 0.85, marginLeft: 'auto' }} title={`Pomodoros completed for ${task.title || 'this task'}`}><Timer size={11} strokeWidth={2} />×{(task.pomodoroCount || 0) + pomodoro.sessionPomos}</span>
      <button type="button" onClick={closePomodoro} className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: phaseColor, opacity: 0.6 }} title="Close timer"><X size={12} /></button>
    </div>
  )
}
