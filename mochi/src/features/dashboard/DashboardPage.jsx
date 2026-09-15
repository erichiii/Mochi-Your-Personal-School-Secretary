import { useEffect } from 'react'
import { CalendarDays, CheckSquare, NotebookText } from 'lucide-react'
import useStore from '../../app/store/useStore'
import mochiLogo from '../../assets/mascots/mochi-logo.png'

const summaryCards = [
  { key: 'notes', label: 'Notes', Icon: NotebookText },
  { key: 'tasks', label: 'To-do', Icon: CheckSquare },
  { key: 'scheduleItems', label: 'Schedule items', Icon: CalendarDays },
]

export default function DashboardPage() {
  const { notes, tasks, scheduleItems, loadNotes, loadTasks, loadSchedule } = useStore()

  useEffect(() => {
    loadNotes()
    loadTasks()
    loadSchedule()
  }, [])

  const values = {
    notes: notes.length,
    tasks: tasks.filter((task) => !task.isDone).length,
    scheduleItems: scheduleItems.length,
  }

  return (
    <main className="h-full overflow-y-auto px-6 py-8" style={{ background: 'var(--mochi-cream)' }}>
      <div className="mx-auto max-w-5xl">
        <section className="mochi-panel flex items-center gap-5 p-6" style={{ maxWidth: '760px' }}>
          <img src={mochiLogo} alt="Mochi mascot" style={{ width: '82px', height: '82px', imageRendering: 'pixelated' }} />
          <div>
            <h1 className="mochi-page-title m-0 text-3xl">Your school desk</h1>
            <p className="mt-2 mb-0 text-sm" style={{ color: 'var(--mochi-text-soft)' }}>Your notes, tasks, and schedule are ready here.</p>
          </div>
        </section>
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {summaryCards.map(({ key, label, Icon }) => (
            <article key={key} className="mochi-panel p-5">
              <Icon size={24} style={{ color: 'var(--mochi-pink-dark)' }} />
              <p className="mt-5 mb-1 text-sm font-bold" style={{ color: 'var(--mochi-text)' }}>{label}</p>
              <p className="m-0 text-3xl font-bold" style={{ color: 'var(--mochi-pink-dark)', fontVariantNumeric: 'tabular-nums' }}>{values[key]}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
