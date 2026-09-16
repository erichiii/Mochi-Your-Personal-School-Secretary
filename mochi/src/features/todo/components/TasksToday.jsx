import { useMemo } from 'react'
import { computePriority, priorityMeta } from '../../../shared/utils/priority'

const startOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

const classify = (ts) => {
  if (!ts) return null
  const tod = startOfDay()
  const deadline = startOfDay(new Date(ts))
  if (deadline < tod)  return 'overdue'
  if (deadline === tod) return 'today'
  return null
}

export default function TasksToday({ tasks }) {
  const urgentTasks = useMemo(() => {
    const buckets = { overdue: [], today: [] }

    tasks
      .filter((t) => !t.isDone)
      .forEach((t) => {
        const kind = classify(t.deadline)
        if (kind) buckets[kind].push({ ...t, _kind: kind, _score: computePriority(t) })
      })

    const sort = (arr) => arr.sort((a, b) => b._score - a._score)
    return [...sort(buckets.overdue), ...sort(buckets.today)]
  }, [tasks])

  const nudgeTask = useMemo(() => {
    if (urgentTasks.length > 0) return null
    return (
      tasks
        .filter((t) => !t.isDone && t.deadline)
        .map((t) => ({ ...t, _score: computePriority(t) }))
        .sort((a, b) => b._score - a._score)[0] ?? null
    )
  }, [tasks, urgentTasks])

  if (urgentTasks.length === 0) {
    return (
      <div className="flex items-center h-full">
        <p style={{ fontSize: '12px', color: 'var(--mochi-text-muted)', lineHeight: 1.7 }}>
          {nudgeTask ? (
            <>
              No urgent tasks — your next deadline is{' '}
              <span style={{ fontWeight: 700, color: 'var(--mochi-text)' }}>
                {nudgeTask.title}
              </span>
              . Utilize your time well!
            </>
          ) : (
            'No urgent tasks. You\'re all caught up!'
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '170px' }}>
      {urgentTasks.map((task) => {
        const meta     = priorityMeta(task._score)
        const overdue  = task._kind === 'overdue'
        return (
          <div key={task.id} className="flex items-center gap-2">
            {overdue ? (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)' }}
              >
                Overdue
              </span>
            ) : (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: meta.bg, color: meta.text }}
              >
                {meta.label}
              </span>
            )}
            <span
              style={{
                fontSize: '12px',
                color: overdue ? 'var(--mochi-pink-dark)' : 'var(--mochi-text)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: overdue ? 600 : 400,
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
