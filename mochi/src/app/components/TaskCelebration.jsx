import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import useStore from '../store/useStore'

const CONFETTI_COLORS = ['#f768a0', '#e02189', '#cb6ce6', '#f6b3d1', '#fff0f8', '#ff9fca']

const createConfetti = () => Array.from({ length: 54 }, (_, index) => ({
  id: index,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  left: `${Math.round(Math.random() * 100)}%`,
  delay: `${(Math.random() * 0.42).toFixed(2)}s`,
  duration: `${(1.6 + Math.random() * 1.15).toFixed(2)}s`,
  drift: `${Math.round(-180 + Math.random() * 360)}px`,
  rotation: `${Math.round(240 + Math.random() * 640)}deg`,
  size: `${6 + Math.round(Math.random() * 7)}px`,
  shape: index % 3 === 0 ? 'is-round' : '',
}))

export default function TaskCelebration() {
  const celebration = useStore((state) => state.taskCelebration)
  const dismiss = useStore((state) => state.dismissTaskCelebration)
  const celebrationId = celebration?.id
  const confetti = useMemo(() => celebrationId ? createConfetti() : [], [celebrationId])

  useEffect(() => {
    if (!celebration) return undefined
    const timeout = window.setTimeout(dismiss, 4600)
    return () => window.clearTimeout(timeout)
  }, [celebration, dismiss])

  if (!celebration) return null

  return (
    <section className="task-celebration" aria-live="polite" aria-label="Task completed">
      <div className="task-celebration__confetti" aria-hidden="true">
        {confetti.map((piece) => (
          <i
            key={`${celebration.id}-${piece.id}`}
            className={piece.shape}
            style={{
              '--confetti-color': piece.color,
              '--confetti-left': piece.left,
              '--confetti-delay': piece.delay,
              '--confetti-duration': piece.duration,
              '--confetti-drift': piece.drift,
              '--confetti-rotation': piece.rotation,
              '--confetti-size': piece.size,
            }}
          />
        ))}
      </div>

      <div className="task-celebration__card" role="status">
        <button type="button" className="task-celebration__close" onClick={dismiss} aria-label="Dismiss celebration">
          <X size={16} strokeWidth={2.5} />
        </button>
        <img src={`/yipee/${celebration.gif}`} alt="" className="task-celebration__gif" />
        <div>
          <p className="task-celebration__eyebrow">Task complete</p>
          <h2>{celebration.remark}</h2>
          <p className="task-celebration__task" title={celebration.taskTitle}>{celebration.taskTitle}</p>
        </div>
      </div>
    </section>
  )
}
