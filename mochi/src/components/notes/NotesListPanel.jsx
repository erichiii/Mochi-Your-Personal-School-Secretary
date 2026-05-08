import { useEffect, useRef, useState } from 'react'
import { Plus, FileText, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../../store'

const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function NotesListPanel() {
  const {
    notes, subjects, activeNoteId, activeSubjectFilter,
    loadNotes, loadSubjects, createNote, deleteNote, setActiveNote,
  } = useStore()

  const [collapsed, setCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(260)
  const drag = useRef({ active: false, startX: 0, startW: 0 })

  useEffect(() => { loadNotes(); loadSubjects() }, [])

  // ── Hierarchy-aware filter ────────────────────────────────
  const getFiltered = () => {
    if (activeSubjectFilter == null) return notes
    const match = subjects.find((s) => s.id === activeSubjectFilter)
    if (!match) return notes
    if (!match.parentId) {
      // section selected → include notes from all its subsections too
      const subIds = subjects.filter((s) => s.parentId === activeSubjectFilter).map((s) => s.id)
      return notes.filter((n) => n.subjectId === activeSubjectFilter || subIds.includes(n.subjectId))
    }
    return notes.filter((n) => n.subjectId === activeSubjectFilter)
  }

  const filtered = getFiltered()
  const activeSection = subjects.find((s) => s.id === activeSubjectFilter) ?? null

  const handleNew = () =>
    createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {})

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteNote(id)
  }

  // ── Resize drag ───────────────────────────────────────────
  const onResizeStart = (e) => {
    e.preventDefault()
    drag.current = { active: true, startX: e.clientX, startW: panelWidth }
    const onMove = (e) => {
      const delta = e.clientX - drag.current.startX
      setPanelWidth(Math.max(180, Math.min(420, drag.current.startW + delta)))
    }
    const onUp = () => {
      drag.current.active = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Collapsed strip ───────────────────────────────────────
  if (collapsed) {
    return (
      <div
        className="flex-shrink-0 flex flex-col items-center py-3 gap-3"
        style={{
          width: '40px',
          borderRight: '1.5px solid var(--mochi-border)',
          background: 'var(--mochi-surface)',
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Show notes list"
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          <PanelLeftOpen size={14} />
        </button>
        <div
          className="flex-1 flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', color: 'var(--mochi-text-muted)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transform: 'rotate(180deg)' }}
        >
          {activeSection ? activeSection.name : 'All Notes'}
        </div>
      </div>
    )
  }

  // ── Full panel ────────────────────────────────────────────
  return (
    <div
      className="relative flex-shrink-0 flex flex-col h-full"
      style={{ width: `${panelWidth}px`, borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{ borderBottom: '1.5px solid var(--mochi-border)' }}
      >
        <button
          onClick={() => setCollapsed(true)}
          title="Hide notes list"
          className="p-1 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          <PanelLeftClose size={14} />
        </button>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {activeSection && (
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: activeSection.color }} />
          )}
          <span className="text-sm font-bold truncate" style={{ color: 'var(--mochi-lavender-dark)' }}>
            {activeSection ? activeSection.name : 'All Notes'}
          </span>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 flex-shrink-0"
          style={{
            background: 'var(--mochi-lavender)',
            color: 'var(--mochi-lavender-dark)',
            border: '1.5px solid var(--mochi-lavender-mid)',
          }}
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText size={32} className="mb-3" style={{ color: 'var(--mochi-border)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
              {activeSection ? `No notes in ${activeSection.name}` : 'No notes yet'}
            </p>
            <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
              Click "New" to create one
            </p>
          </div>
        ) : (
          filtered.map((note) => {
            const isActive = note.id === activeNoteId
            const noteSub = subjects.find((s) => s.id === note.subjectId)
            const preview = stripHtml(note.content).slice(0, 100)

            return (
              <div
                key={note.id}
                onClick={() => setActiveNote(note.id)}
                className="group relative rounded-2xl p-3 transition-all fade-in cursor-pointer"
                style={
                  isActive
                    ? { background: 'var(--mochi-lavender)', border: '1.5px solid var(--mochi-lavender-mid)' }
                    : { background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }
                }
              >
                <p
                  className="text-sm font-semibold truncate pr-6"
                  style={{ color: isActive ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text)' }}
                >
                  {note.title || 'Untitled'}
                </p>

                {preview && (
                  <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--mochi-text-muted)' }}>
                    {preview}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {noteSub && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: noteSub.color + '44', color: 'var(--mochi-text-soft)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: noteSub.color }} />
                      {noteSub.name}
                    </span>
                  )}
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--mochi-text-muted)' }}>
                    {note.updatedAt ? formatDistanceToNow(note.updatedAt, { addSuffix: true }) : ''}
                  </span>
                </div>

                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = '#E05050' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize"
        onMouseDown={onResizeStart}
        style={{ zIndex: 10 }}
      />
    </div>
  )
}
