import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Circle, Clock3, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import useStore from '../../app/store/useStore'
import mochiDashboard from '../../assets/mascots/mochi-dashboard.png'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const getGreeting = (date) => {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

const endOfWeek = (date) => {
  const end = new Date(date)
  end.setDate(date.getDate() + (6 - date.getDay()))
  end.setHours(23, 59, 59, 999)
  return end.getTime()
}

const timeScore = (time = '') => {
  const match = time.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
  if (!match) return Number.MAX_SAFE_INTEGER
  let hour = Number(match[1])
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0
  return hour * 60 + Number(match[2] || 0)
}

const dueLabel = (deadline) => {
  if (!deadline) return 'No due date'
  const due = new Date(deadline)
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

const daysLeftLabel = (deadline, todayStart) => {
  if (!Number.isFinite(deadline)) return 'No due date'
  const due = new Date(deadline)
  due.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((due.getTime() - todayStart) / 86_400_000)
  if (daysLeft < 0) return 'Overdue'
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return '1 day left'
  return `${daysLeft} days left`
}

export default function DashboardPage() {
  const [now, setNow] = useState(() => new Date())
  const {
    notes, tasks, scheduleItems, scheduleSections, subjects,
    loadNotes, loadTasks, loadSchedule, loadScheduleSections, loadSubjects,
    setActiveNote, setSubjectFilter, updateTask,
  } = useStore()

  useEffect(() => {
    loadNotes()
    loadTasks()
    loadSchedule()
    loadScheduleSections()
    loadSubjects()
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const todayStart = startOfDay(now)
  const todayName = DAY_NAMES[now.getDay()]
  const thisWeekEnd = endOfWeek(now)

  const dueThisWeek = useMemo(() => tasks
    .filter((task) => !task.isDone && Number.isFinite(task.deadline) && task.deadline >= todayStart && task.deadline <= thisWeekEnd)
    .sort((a, b) => a.deadline - b.deadline), [tasks, todayStart, thisWeekEnd])

  const otherTasks = useMemo(() => tasks
    .filter((task) => !task.isDone && !dueThisWeek.some((dueTask) => dueTask.id === task.id))
    .sort((a, b) => (a.deadline || Number.MAX_SAFE_INTEGER) - (b.deadline || Number.MAX_SAFE_INTEGER)), [tasks, dueThisWeek])

  const activeScheduleSection = scheduleSections.find((section) => section.isActive) ?? null
  const todayClasses = useMemo(() => scheduleItems
    .filter((item) => activeScheduleSection && item.sectionId === activeScheduleSection.id && item.day === todayName)
    .sort((a, b) => timeScore(a.time) - timeScore(b.time)), [scheduleItems, activeScheduleSection, todayName])

  const recentNotes = useMemo(() => [...notes]
    .sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0))
    .slice(0, 5), [notes])
  const recentNotebooks = useMemo(() => {
    const folderIds = new Set(subjects.filter((subject) => !subject.parentId).map((subject) => subject.id))
    const notebooks = subjects.filter((subject) => folderIds.has(subject.parentId))

    const subjectTree = (notebookId) => {
      const ids = new Set([notebookId])
      const queue = [notebookId]
      while (queue.length) {
        const parentId = queue.shift()
        subjects.filter((subject) => subject.parentId === parentId).forEach((subject) => {
          ids.add(subject.id)
          queue.push(subject.id)
        })
      }
      return ids
    }

    return notebooks
      .map((notebook) => {
        const notebookSubjectIds = subjectTree(notebook.id)
        const notebookNotes = notes.filter((note) => notebookSubjectIds.has(note.subjectId))
        const mostRecentNote = notebookNotes.reduce((latest, note) => Math.max(latest, note.updatedAt ?? note.createdAt ?? 0), 0)
        return { notebook, noteCount: notebookNotes.length, activityAt: mostRecentNote || notebook.createdAt || 0 }
      })
      .sort((a, b) => b.activityAt - a.activityAt)
      .slice(0, 5)
  }, [notes, subjects])
  const tasksForPanel = dueThisWeek.length > 0 ? dueThisWeek.slice(0, 3) : otherTasks.slice(0, 3)
  const taskHeading = dueThisWeek.length > 0
    ? `You have ${dueThisWeek.length} task${dueThisWeek.length === 1 ? '' : 's'} due this week.`
    : otherTasks.length > 0
      ? 'You have no tasks due this week. Want to stay ahead?'
      : 'Wohoo! A free day today!'
  const taskSupportingText = dueThisWeek.length === 0 && otherTasks.length === 0
    ? 'Use your time productively or rest as needed. Good job!'
    : null

  const toggleTaskStatus = async (task) => {
    await updateTask(task.id, { isDone: !task.isDone })
  }

  return (
    <main className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8" style={{ background: 'var(--mochi-cream)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-7">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="mochi-panel relative overflow-hidden p-6 sm:p-8" style={{ minHeight: '302px' }}>
            <div className="flex items-start gap-4">
              <img src={mochiDashboard} alt="Mochi relaxing at a school desk" style={{ width: '112px', height: '112px', objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
              <div className="min-w-0 pt-2">
                <p className="mochi-page-title m-0 text-3xl sm:text-4xl">{getGreeting(now)}, Angel!</p>
                <p className="mt-2 mb-0 text-sm sm:text-base" style={{ color: 'var(--mochi-text-soft)' }}>Here is your school desk for {todayName}.</p>
              </div>
            </div>

            <div className="mt-6 border-t-2 pt-5" style={{ borderColor: 'var(--mochi-pink)' }}>
              <Link to="/todo" className="group block rounded-2xl" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={25} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                  <p className="mochi-page-title m-0 flex-1 text-xl sm:text-2xl" style={{ color: 'var(--mochi-text)' }}>{taskHeading}</p>
                  <ArrowRight size={28} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                </div>
              </Link>

              {taskSupportingText ? (
                <p className="mb-0 mt-3 text-sm" style={{ color: 'var(--mochi-text-soft)' }}>{taskSupportingText}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {tasksForPanel.map((task) => (
                    <div key={task.id} className="group flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--mochi-hover)' }}>
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task)}
                        title="Mark task complete"
                        aria-label={`Mark ${task.title || 'task'} complete`}
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }}
                      >
                        <Circle size={18} strokeWidth={2.4} />
                      </button>
                      <Link to="/todo" className="flex min-w-0 flex-1 items-center gap-3" style={{ color: 'inherit', textDecoration: 'none' }}>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{task.title || 'Untitled task'}</span>
                        <span className="flex-shrink-0 text-xs font-bold" style={{ color: 'var(--mochi-pink-dark)' }} title={dueLabel(task.deadline)}>{daysLeftLabel(task.deadline, todayStart)}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="mochi-panel p-6" aria-labelledby="today-schedule-title">
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays size={28} style={{ color: 'var(--mochi-pink-dark)' }} />
              <h2 id="today-schedule-title" className="mochi-page-title m-0 text-2xl">Your schedule today <span style={{ color: 'var(--mochi-pink-dark)' }}>({todayName})</span></h2>
            </div>
            <div className="flex flex-col gap-3">
              {todayClasses.length > 0 ? todayClasses.map((item) => (
                <Link key={item.id} to="/schedule" className="group flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--mochi-pink)', border: '2px solid var(--mochi-border)', color: 'inherit', textDecoration: 'none' }}>
                  <span className="min-w-[88px] text-xs font-bold sm:min-w-[108px]" style={{ color: 'var(--mochi-pink-dark)' }}>{item.time || 'Time TBA'}</span>
                  <span className="min-w-0 flex-1 text-sm font-bold">{item.subject || 'Class'}</span>
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                </Link>
              )) : (
                <Link to="/schedule" className="flex flex-col items-center rounded-2xl px-4 py-8 text-center" style={{ background: 'var(--mochi-hover)', border: '2px dashed var(--mochi-border)', color: 'inherit', textDecoration: 'none' }}>
                  <Clock3 size={28} style={{ color: 'var(--mochi-pink-dark)' }} />
                  <span className="mt-3 text-sm font-bold">{activeScheduleSection ? 'No classes are scheduled today.' : 'Choose an active term first.'}</span>
                  <span className="mt-1 text-xs" style={{ color: 'var(--mochi-text-soft)' }}>{activeScheduleSection ? 'Open Schedule to add one.' : 'Open Schedule and mark the current term with the check icon.'}</span>
                </Link>
              )}
            </div>
          </section>
        </section>

        <section className="grid gap-7 xl:grid-cols-2">
          <section aria-labelledby="recent-notes-title">
            <div className="mb-3 flex items-center gap-3">
              <Link to="/notes" className="group flex items-center gap-1.5" style={{ color: 'inherit', textDecoration: 'none' }}>
                <h2 id="recent-notes-title" className="mochi-page-title m-0 text-2xl">Recent notes</h2>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--mochi-pink-dark)' }} aria-hidden="true" />
              </Link>
              <div className="h-0 flex-1 border-t-2" style={{ borderColor: 'var(--mochi-pink-mid)' }} />
            </div>
            <div className="flex flex-col gap-3">
              {recentNotes.length > 0 ? recentNotes.map((note) => (
                <Link key={note.id} to="/notes" onClick={() => setActiveNote(note.id)} className="group flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'var(--mochi-surface)', border: '2px solid var(--mochi-border)', color: 'inherit', textDecoration: 'none' }}>
                  <FileText size={20} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                  <span className="min-w-0 flex-1 truncate text-base font-bold">{note.title?.trim() || 'Untitled note'}</span>
                  <ArrowRight size={23} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                </Link>
              )) : (
                <Link to="/notes" className="rounded-2xl px-5 py-6 text-sm font-semibold" style={{ display: 'block', background: 'var(--mochi-hover)', border: '2px dashed var(--mochi-border)', color: 'var(--mochi-text-soft)', textDecoration: 'none' }}>No notes yet. Start your first note.</Link>
              )}
            </div>
          </section>

          <section aria-labelledby="recent-notebooks-title">
            <div className="mb-3 flex items-center gap-3">
              <Link to="/notes" className="group flex items-center gap-1.5" style={{ color: 'inherit', textDecoration: 'none' }}>
                <h2 id="recent-notebooks-title" className="mochi-page-title m-0 text-2xl">Recent notebooks</h2>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" style={{ color: 'var(--mochi-pink-dark)' }} aria-hidden="true" />
              </Link>
              <div className="h-0 flex-1 border-t-2" style={{ borderColor: 'var(--mochi-pink-mid)' }} />
            </div>
            <div className="flex flex-col gap-3">
              {recentNotebooks.length > 0 ? recentNotebooks.map(({ notebook, noteCount }) => (
                <Link key={notebook.id} to="/notes" state={{ notebookId: notebook.id }} onClick={() => { setSubjectFilter(notebook.id); setActiveNote(null) }} className="group flex items-center gap-3 rounded-2xl px-5 py-4" style={{ background: 'var(--mochi-pink-dark)', border: '2px solid var(--mochi-pink-dark)', color: 'var(--mochi-surface)', textDecoration: 'none' }}>
                  <BookOpen size={21} style={{ flexShrink: 0 }} />
                  <span className="min-w-0 flex-1 truncate text-base font-bold">{notebook.name}</span>
                  <span className="text-xs font-semibold" style={{ opacity: 0.84 }}>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
                  <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" style={{ flexShrink: 0 }} />
                </Link>
              )) : (
                <Link to="/notes" className="rounded-2xl px-5 py-6 text-sm font-semibold" style={{ display: 'block', background: 'var(--mochi-hover)', border: '2px dashed var(--mochi-border)', color: 'var(--mochi-text-soft)', textDecoration: 'none' }}>No notebooks yet. Add one from Notes.</Link>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
