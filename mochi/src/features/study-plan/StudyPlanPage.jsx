import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Calendar, Check, Coffee, Loader2,
  MoreHorizontal, Pencil, Plus, Sparkles, Target,
  Trash2, X, Zap,
} from 'lucide-react'
import useStore from '../../app/store/useStore'
import { generateStudyPlan } from '../../shared/lib/gemini'
import ConfirmModal from '../../shared/components/ConfirmModal'

// ── Helpers ────────────────────────────────────────────────────

const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtExamDate = (ts) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const fmtDayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const daysUntilExam = (examTs) =>
  Math.round((examTs - Date.now()) / 86_400_000)

// ── Visual config ──────────────────────────────────────────────

const LOAD = {
  light:    { bg: 'var(--mochi-mint)',    color: 'var(--mochi-mint-dark)',    border: 'var(--mochi-mint-mid)',    label: 'Light'    },
  moderate: { bg: 'var(--mochi-peach)',   color: 'var(--mochi-peach-dark)',   border: 'var(--mochi-peach-mid)',   label: 'Moderate' },
  heavy:    { bg: 'var(--mochi-pink)',    color: 'var(--mochi-pink-dark)',    border: 'var(--mochi-pink-mid)',    label: 'Heavy'    },
}

const TASK_TYPE = {
  review:   { icon: <BookOpen size={10} />, color: 'var(--mochi-lavender-dark)', bg: 'var(--mochi-lavender)' },
  practice: { icon: <Pencil   size={10} />, color: 'var(--mochi-mint-dark)',     bg: 'var(--mochi-mint)'     },
  memorize: { icon: <Zap      size={10} />, color: 'var(--mochi-sky-dark)',      bg: 'var(--mochi-sky)'      },
  rest:     { icon: <Coffee   size={10} />, color: 'var(--mochi-text-muted)',    bg: 'var(--mochi-cream)'    },
}

const parsePlan = (content) => {
  try { return JSON.parse(content) } catch { return null }
}

// ── New plan form ──────────────────────────────────────────────

function NewPlanForm({ subjects, notes, scheduleItems, onCreate, onCancel }) {
  const [examName,  setExamName]  = useState('')
  const [examDate,  setExamDate]  = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const topLevel = subjects.filter((s) => !s.parentId)

  const minDate = toLocalDateStr(new Date(Date.now() + 86_400_000))

  const daysLeft = examDate
    ? Math.round((new Date(examDate + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
    : 0

  const canGenerate = examName.trim() && examDate && daysLeft >= 1 && !loading

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true); setError('')
    try {
      const relevantNotes = subjectId
        ? notes.filter((n) => n.subjectId === Number(subjectId))
        : notes

      const notesContext = relevantNotes.slice(0, 12).map((n) => ({
        title:   n.title || 'Untitled',
        content: (n.content || '').replace(/<[^>]+>/g, '').slice(0, 400),
      }))

      const examTs = new Date(examDate + 'T00:00:00').getTime()
      const plan   = await generateStudyPlan({ examName: examName.trim(), examDate: examTs, scheduleItems, notesContext })
      await onCreate({ examName: examName.trim(), examTs, plan })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex items-start justify-center px-8 py-10" style={{ background: 'var(--mochi-cream)' }}>
      <div className="w-full max-w-lg flex flex-col gap-5">

        {/* Title */}
        <div>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: 'var(--mochi-sky-dark)', marginBottom: '4px' }}>
            New Study Plan
          </p>
          <p style={{ fontSize: '12px', color: 'var(--mochi-text-muted)' }}>
            Mochi will read your schedule and notes to build a personalized day-by-day plan.
          </p>
        </div>

        {/* Form card */}
        <div
          className="flex flex-col gap-4 rounded-3xl p-6"
          style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)', boxShadow: '0 4px 24px -8px rgba(0,0,0,0.06)' }}
        >
          {/* Exam name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
              Exam / Subject Name
            </label>
            <input
              autoFocus
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. Math Finals, Physics Midterm…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
            />
          </div>

          {/* Exam date + subject (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
                Exam Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={examDate}
                  min={minDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: examDate ? 'var(--mochi-text)' : 'var(--mochi-text-muted)' }}
                />
              </div>
              {examDate && daysLeft >= 1 && (
                <span style={{ fontSize: '10px', color: 'var(--mochi-sky-dark)', fontWeight: 600 }}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} away — {Math.min(daysLeft, 14)}-day plan
                </span>
              )}
              {examDate && daysLeft < 1 && (
                <span style={{ fontSize: '10px', color: 'var(--mochi-pink-dark)', fontWeight: 600 }}>
                  Date must be at least tomorrow
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
                Notes Source
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
              >
                <option value="">All notes</option>
                {topLevel.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Context summary */}
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--mochi-sky)', border: '1.5px solid var(--mochi-sky-mid)' }}
          >
            <Sparkles size={13} style={{ color: 'var(--mochi-sky-dark)', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: 'var(--mochi-sky-dark)', lineHeight: 1.5 }}>
              Mochi will use <strong>{scheduleItems.length} schedule entries</strong> and <strong>{subjectId ? (notes.filter((n) => n.subjectId === Number(subjectId)).length) : notes.length} notes</strong> to create your plan.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}
            >
              <X size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '11px', color: 'var(--mochi-pink-dark)' }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold ml-auto"
              style={{
                background: canGenerate ? 'var(--mochi-sky)' : 'var(--mochi-border)',
                color:      canGenerate ? 'var(--mochi-sky-dark)' : 'var(--mochi-text-muted)',
                border:     `1.5px solid ${canGenerate ? 'var(--mochi-sky-mid)' : 'transparent'}`,
                cursor:     canGenerate ? 'pointer' : 'not-allowed',
              }}
            >
              {loading
                ? <><Loader2 size={13} className="spin" />Generating…</>
                : <><Sparkles size={13} />Generate Plan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Plan view ──────────────────────────────────────────────────

function PlanView({ plan, planData, onPushTodo, onDelete }) {
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [pushing,   setPushing]   = useState(false)
  const [pushed,    setPushed]    = useState(false)

  const countdown = daysUntilExam(plan.examDate)
  const isPast    = countdown < 0

  const handlePush = async () => {
    if (pushing || plan.pushedAt) return
    setPushing(true)
    try {
      await onPushTodo(planData, plan)
      setPushed(true)
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-8" style={{ background: 'var(--mochi-cream)' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: '24px', fontWeight: 700, color: 'var(--mochi-sky-dark)', lineHeight: 1.2 }}>
              {plan.title}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: isPast ? 'var(--mochi-pink)' : 'var(--mochi-sky)', color: isPast ? 'var(--mochi-pink-dark)' : 'var(--mochi-sky-dark)', border: `1.5px solid ${isPast ? 'var(--mochi-pink-mid)' : 'var(--mochi-sky-mid)'}` }}
              >
                <Calendar size={9} />
                Exam: {fmtExamDate(plan.examDate)}
                {!isPast && ` · ${countdown} day${countdown !== 1 ? 's' : ''} left`}
                {isPast && ' · Past'}
              </span>
              {(plan.pushedAt || pushed) && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
                >
                  <Check size={9} />Tasks added to To-Do
                </span>
              )}
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-xl transition-colors"
              style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl shadow-lg overflow-hidden py-1 fade-in"
                style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)', minWidth: '160px', zIndex: 50 }}
              >
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onDelete(plan); setMenuOpen(false) }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
                  style={{ color: '#E05050' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={11} />Delete plan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        {planData.overview && (
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: 'var(--mochi-sky)', border: '1.5px solid var(--mochi-sky-mid)' }}
          >
            <p style={{ fontSize: '12px', color: 'var(--mochi-sky-dark)', lineHeight: 1.7 }}>{planData.overview}</p>
          </div>
        )}

        {/* Day cards */}
        <div className="flex flex-col gap-3">
          {(planData.days || []).map((day, i) => {
            const load    = LOAD[day.load] || LOAD.moderate
            const isToday = day.date === toLocalDateStr(new Date())
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{
                  border:    `1.5px solid ${load.border}`,
                  background: 'var(--mochi-surface)',
                  boxShadow:  isToday ? `0 0 0 2px ${load.color}` : 'none',
                }}
              >
                {/* Day header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: load.bg, borderBottom: `1px solid ${load.border}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isToday && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: load.color, color: load.bg }}
                      >Today</span>
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: load.color }}>
                      {fmtDayLabel(day.date)}
                    </span>
                    {day.focus && (
                      <span style={{ fontSize: '11px', color: load.color, opacity: 0.75 }}>— {day.focus}</span>
                    )}
                  </div>
                  <span
                    className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: load.color + '22', color: load.color, border: `1px solid ${load.color}44` }}
                  >
                    {load.label}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex flex-col divide-y" style={{ '--tw-divide-color': 'var(--mochi-border)' }}>
                  {(day.tasks || []).map((task, j) => {
                    const tt = TASK_TYPE[task.type] || TASK_TYPE.review
                    return (
                      <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0"
                          style={{ background: tt.bg, color: tt.color }}
                        >
                          {tt.icon}
                        </span>
                        <span style={{ flex: 1, fontSize: '12px', color: 'var(--mochi-text)', fontWeight: 500 }}>
                          {task.title}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--mochi-text-muted)', flexShrink: 0 }}>
                          {task.duration}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips */}
        {planData.tips?.length > 0 && (
          <div
            className="flex flex-col gap-2 px-4 py-4 rounded-2xl"
            style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--mochi-text-muted)' }}>
              Exam Tips
            </p>
            {planData.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <Target size={11} style={{ color: 'var(--mochi-sky-dark)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: '12px', color: 'var(--mochi-text-soft)', lineHeight: 1.6 }}>{tip}</p>
              </div>
            ))}
          </div>
        )}

        {/* Push to To-Do */}
        {!plan.pushedAt && !pushed && (
          <button
            onClick={handlePush}
            disabled={pushing}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-bold"
            style={{
              background: pushing ? 'var(--mochi-border)' : 'var(--mochi-mint)',
              color:      pushing ? 'var(--mochi-text-muted)' : 'var(--mochi-mint-dark)',
              border:     `1.5px solid ${pushing ? 'transparent' : 'var(--mochi-mint-mid)'}`,
              cursor:     pushing ? 'not-allowed' : 'pointer',
            }}
          >
            {pushing
              ? <><Loader2 size={14} className="spin" />Adding tasks…</>
              : <><Check size={14} />Push all tasks to To-Do</>}
          </button>
        )}

        {(plan.pushedAt || pushed) && (
          <div
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold"
            style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
          >
            <Check size={14} />Tasks are in your To-Do list
          </div>
        )}

      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function StudyPlanPage() {
  const {
    studyPlans, loadStudyPlans, createStudyPlan, updateStudyPlan, deleteStudyPlan,
    subjects, loadSubjects,
    notes, loadNotes,
    scheduleItems, loadSchedule,
    createTask, loadTasks,
  } = useStore()

  const [activePlanId, setActivePlanId] = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [hoveredId,    setHoveredId]    = useState(null)

  useEffect(() => {
    loadStudyPlans()
    loadSubjects()
    loadNotes()
    loadSchedule()
  }, [])

  // Auto-select first plan when plans load
  useEffect(() => {
    if (!activePlanId && !showForm && studyPlans.length > 0) {
      setActivePlanId(studyPlans[0].id)
    }
  }, [studyPlans])

  const activePlan = studyPlans.find((p) => p.id === activePlanId) ?? null
  const planData   = activePlan ? parsePlan(activePlan.content) : null

  const handleCreate = async ({ examName, examTs, plan }) => {
    const id = await createStudyPlan({
      title:    examName,
      content:  JSON.stringify(plan),
      examDate: examTs,
    })
    setActivePlanId(id)
    setShowForm(false)
  }

  const handlePushTodo = async (planData, plan) => {
    const tasksBatch = []
    for (const day of planData.days || []) {
      if (!day.tasks?.length) continue
      const deadline = new Date(day.date + 'T23:59:00').getTime()
      for (const task of day.tasks) {
        if (task.type === 'rest') continue
        tasksBatch.push({
          title:           task.title,
          category:        plan.title,
          deadline,
          effort:          task.type === 'practice' ? 4 : 3,
          additionalNotes: task.duration ? `${task.duration}` : '',
        })
      }
    }
    for (const t of tasksBatch) await createTask(t)
    await loadTasks()
    await updateStudyPlan(plan.id, { pushedAt: Date.now() })
  }

  const handleDelete = (plan) => {
    setConfirmDel(plan)
  }

  const confirmDeletePlan = async () => {
    if (!confirmDel) return
    await deleteStudyPlan(confirmDel.id)
    if (activePlanId === confirmDel.id) {
      const remaining = studyPlans.filter((p) => p.id !== confirmDel.id)
      setActivePlanId(remaining[0]?.id ?? null)
    }
    setConfirmDel(null)
  }

  // ── Main content ─────────────────────────────────────────────
  const showEmpty = !showForm && !activePlan

  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--mochi-cream)' }}>

      {/* ── Left sidebar ─── */}
      <div
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ width: '220px', borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-3 py-3"
          style={{ borderBottom: '1px solid var(--mochi-border)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--mochi-text-muted)' }}>
            Study Plans
          </span>
          <button
            onClick={() => { setShowForm(true); setActivePlanId(null) }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: 'var(--mochi-sky)', color: 'var(--mochi-sky-dark)', border: '1.5px solid var(--mochi-sky-mid)' }}
            title="New study plan"
          >
            <Plus size={11} />New
          </button>
        </div>

        {/* Plan list */}
        <div className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
          {studyPlans.length === 0 && !showForm && (
            <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
              <p style={{ fontSize: '11px', color: 'var(--mochi-text-muted)', lineHeight: 1.5 }}>
                No plans yet.<br />Click <strong>New</strong> to create one.
              </p>
            </div>
          )}

          {studyPlans.map((plan) => {
            const isActive  = activePlanId === plan.id && !showForm
            const isHovered = hoveredId === plan.id
            const countdown = daysUntilExam(plan.examDate)
            const isPast    = countdown < 0

            return (
              <div
                key={plan.id}
                onClick={() => { setActivePlanId(plan.id); setShowForm(false) }}
                onMouseEnter={() => setHoveredId(plan.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="flex items-start gap-2 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all"
                style={isActive
                  ? { background: 'var(--mochi-sky)', border: '1.5px solid var(--mochi-sky-mid)' }
                  : { border: '1.5px solid transparent', background: isHovered ? 'var(--mochi-cream)' : 'transparent' }
                }
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-xs font-semibold"
                    style={{ color: isActive ? 'var(--mochi-sky-dark)' : 'var(--mochi-text)' }}
                  >
                    {plan.title}
                  </p>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: isActive ? 'var(--mochi-sky-dark)' : 'var(--mochi-text-muted)', opacity: isActive ? 0.8 : 1 }}
                  >
                    {fmtExamDate(plan.examDate)}
                    {!isPast && ` · ${countdown}d`}
                    {isPast && ' · Done'}
                  </p>
                </div>
                {isHovered && !isActive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(plan) }}
                    className="p-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right content ─── */}
      <div className="flex-1 overflow-hidden">
        {showForm && (
          <NewPlanForm
            subjects={subjects}
            notes={notes}
            scheduleItems={scheduleItems}
            onCreate={handleCreate}
            onCancel={studyPlans.length > 0 ? () => { setShowForm(false); setActivePlanId(studyPlans[0].id) } : null}
          />
        )}

        {!showForm && activePlan && planData && (
          <PlanView
            plan={activePlan}
            planData={planData}
            onPushTodo={handlePushTodo}
            onDelete={handleDelete}
          />
        )}

        {!showForm && activePlan && !planData && (
          <div className="h-full flex items-center justify-center" style={{ background: 'var(--mochi-cream)' }}>
            <p style={{ fontSize: '12px', color: 'var(--mochi-text-muted)' }}>Could not parse plan data.</p>
          </div>
        )}

        {showEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center px-8" style={{ background: 'var(--mochi-cream)' }}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: 'var(--mochi-sky)', border: '2px solid var(--mochi-sky-mid)' }}
            >
              <Sparkles size={28} style={{ color: 'var(--mochi-sky-dark)' }} />
            </div>
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: '20px', fontWeight: 700, color: 'var(--mochi-text)', marginBottom: '8px' }}>
              Study smarter, not harder
            </p>
            <p style={{ fontSize: '12px', color: 'var(--mochi-text-muted)', maxWidth: '280px', lineHeight: 1.6, marginBottom: '20px' }}>
              Create a study plan and Mochi will use your schedule and notes to build a personalized day-by-day roadmap.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--mochi-sky)', color: 'var(--mochi-sky-dark)', border: '1.5px solid var(--mochi-sky-mid)' }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              <Plus size={14} />Create Study Plan
            </button>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDel && (
        <ConfirmModal
          title={`Delete "${confirmDel.title}"?`}
          message="This study plan will be permanently removed."
          confirmLabel="Delete"
          onConfirm={confirmDeletePlan}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
