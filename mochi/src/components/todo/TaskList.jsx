import TaskCard from './TaskCard'

const sortTasks = (tasks) => {
  return [...tasks].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
    const aDeadline = a.deadline ?? Number.MAX_SAFE_INTEGER
    const bDeadline = b.deadline ?? Number.MAX_SAFE_INTEGER
    if (aDeadline !== bDeadline) return aDeadline - bDeadline
    return (b.updatedAt || 0) - (a.updatedAt || 0)
  })
}

export default function TaskList({ tasks, onToggleDone, onDelete, onUpdate }) {
  const sorted = sortTasks(tasks)

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6" style={{ borderColor: 'var(--mochi-border)' }}>
        <p className="text-sm" style={{ color: 'var(--mochi-text-muted)' }}>
          No tasks yet. Add your first one above.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggleDone={onToggleDone}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}
