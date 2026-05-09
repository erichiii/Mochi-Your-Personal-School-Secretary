import { useEffect, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import useStore from '../store'
import TaskForm from '../components/todo/TaskForm'
import TaskList from '../components/todo/TaskList'

export default function TodoPage() {
  const { tasks, loadTasks, createTask, updateTask, deleteTask } = useStore()

  useEffect(() => {
    loadTasks()
  }, [])

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.isDone).length
    return { total: tasks.length, done }
  }, [tasks])

  const handleCreate = async (payload) => {
    await createTask({
      title: payload.title,
      category: payload.category || '',
      deadline: payload.deadline ?? null,
      effort: 3,
      priority: 0,
      userPriority: null,
      pomodoroCount: 0,
    })
  }

  const handleToggleDone = async (task) => {
    await updateTask(task.id, { isDone: !task.isDone })
  }

  const handleUpdate = async (id, data) => {
    await updateTask(id, data)
  }

  const handleDelete = async (task) => {
    await deleteTask(task.id)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', margin: 0, color: 'var(--mochi-mint-dark)' }}>
              To-Do Studio
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--mochi-text-muted)' }}>
              {stats.done} of {stats.total} tasks done
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', fontSize: '11px', fontWeight: 700 }}>
            <Sparkles size={12} /> Focus on what matters
          </div>
        </div>

        <div className="rounded-3xl p-5" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}>
          <TaskForm onCreate={handleCreate} />
        </div>

        <TaskList
          tasks={tasks}
          onToggleDone={handleToggleDone}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}
