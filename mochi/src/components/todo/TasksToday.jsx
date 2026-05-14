import { useMemo } from 'react'
import { computePriority, priorityMeta } from '../../utils/priority'

const isToday = (ts) => {
  if (!ts) return false
  const d = new Date(ts)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  )
}

export default function TasksToday({ tasks }) {
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.isDone && isToday(t.deadline))
        .map((t) => ({ ...t, _score: computePriority(t) }))
        .sort((a, b) => b._score - a._score),
    [tasks]
  )

  const nudgeTask = useMemo(() => {
    if (todayTasks.length > 0) return null
    return (
      tasks
        .filter((t) => !t.isDone && !isToday(t.deadline))
        .map((t) => ({ ...t, _score: computePriority(t) }))
        .sort((a, b) => b._score - a._score)[0] ?? null
    )
  }, [tasks, todayTasks])

  if (todayTasks.length === 0) {
    return (
      <div className="flex items-center h-full">
        <p style={{ fontSize: '12px', color: 'var(--mochi-text-muted)', lineHeight: 1.7 }}>
          {nudgeTask ? (
            <>
              You have no tasks today, but you still need to complete{' '}
              <span style={{ fontWeight: 700, color: 'var(--mochi-text)' }}>
                {nudgeTask.title}
              </span>
              . Please utilize your time effectively.
            </>
          ) : (
            'You have no tasks today.'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '170px' }}>
      {todayTasks.map((task) => {
        const meta = priorityMeta(task._score)
        return (
          <div key={task.id} className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: meta.bg, color: meta.text }}
            >
              {meta.label}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--mochi-text)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.title}
            </span>
            {task.category && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--mochi-cream)', color: 'var(--mochi-text-soft)' }}
              >
                {task.category}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
