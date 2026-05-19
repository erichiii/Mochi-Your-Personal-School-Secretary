import { useEffect, useRef, useState } from 'react'
import { Plus, FileText, Trash2, PanelLeftClose, PanelLeftOpen, Search, X, Pin, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../../store'
import ConfirmModal from '../ConfirmModal'

const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function NotesListPanel() {
  const {
    notes, subjects, activeNoteId, activeSubjectFilter,
    loadNotes, loadSubjects, createNote, deleteNote, setActiveNote, updateNote,
  } = useStore()

  const [draggingNoteId, setDraggingNoteId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [collapsed, setCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(260)
  const [confirmModal, setConfirmModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const drag = useRef({ active: false, startX: 0, startW: 0 })

  useEffect(() => {
    Promise.all([loadNotes(), loadSubjects()]).finally(() => setLoading(false))
  }, [])

  // ── Hierarchy-aware filter ────────────────────────────────
  const getDescendantIds = (id) => {
    const ids = []
    const stack = [id]
    while (stack.length > 0) {
      const parentId = stack.pop()
      const children = subjects.filter((s) => s.parentId === parentId)
      for (const child of children) {
        ids.push(child.id)
        stack.push(child.id)
      }
    }
    return ids
  }

  const getFiltered = () => {
    if (activeSubjectFilter == null) return []
    const match = subjects.find((s) => s.id === activeSubjectFilter)
    if (!match) return notes
    const descendantIds = getDescendantIds(activeSubjectFilter)
    if (descendantIds.length === 0) {
      return notes.filter((n) => n.subjectId === activeSubjectFilter)
    }
    const descendantSet = new Set(descendantIds)
    return notes.filter((n) => n.subjectId === activeSubjectFilter || descendantSet.has(n.subjectId))
  }

  const bySubject = getFiltered()
  const searched = searchQuery.trim()
    ? bySubject.filter((n) => {
        const q = searchQuery.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q)
        )
      })
    : bySubject
  // Pinned notes always appear first
  const filtered = [...searched].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  const activeSection = subjects.find((s) => s.id === activeSubjectFilter) ?? null

  const handleNew = () =>
    createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {})

  const handleDelete = (e, id) => {
    e.stopPropagation()
    const note = notes.find((n) => n.id === id)
    setConfirmModal({
      title: `Delete "${note?.title || 'Untitled'}"?`,
      onConfirm: () => { setConfirmModal(null); deleteNote(id) },
    })
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
      <>
        {confirmModal && (
          <ConfirmModal
            title={confirmModal.title}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
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
            {activeSection ? activeSection.name : 'Notes'}
          </div>
        </div>
      </>
    )
  }

  // ── Full panel ────────────────────────────────────────────
  return (
    <>
    {confirmModal && (
      <ConfirmModal
        title={confirmModal.title}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
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
            {activeSection ? activeSection.name : 'Notes'}
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

      {/* Search bar */}
      <div className="px-3 py-2" style={{ borderBottom: '1.5px solid var(--mochi-border)' }}>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <Search size={12} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="flex-1 bg-transparent outline-none text-xs min-w-0"
            style={{ color: 'var(--mochi-text)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--mochi-text-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText size={32} className="mb-3" style={{ color: 'var(--mochi-border)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
              {searchQuery ? 'No results found' : activeSection ? `No notes in ${activeSection.name}` : 'No section selected'}
            </p>
            <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
              {searchQuery ? 'Try a different search term' : activeSection ? 'Click "New" to create one' : 'Select a section from the sidebar to view notes'}
            </p>
          </div>
        ) : (
          filtered.map((note) => {
            const isActive = note.id === activeNoteId
            const noteSub = subjects.find((s) => s.id === note.subjectId)
            const isDragging = draggingNoteId === note.id

            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => {
                  setDraggingNoteId(note.id)
                  e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'note', id: note.id }))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDraggingNoteId(null)}
                onClick={() => setActiveNote(note.id)}
                className="group relative rounded-2xl p-3 transition-all fade-in"
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.45 : 1,
                  ...(isActive
                    ? { background: 'var(--mochi-lavender)', border: '1.5px solid var(--mochi-lavender-mid)' }
                    : { background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }),
                }}
              >
                <div className="flex items-start gap-1.5 pr-6">
                  {note.isPinned && (
                    <Pin size={10} className="flex-shrink-0 mt-0.5" style={{ color: isActive ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)', transform: 'rotate(45deg)' }} />
                  )}
                  <p
                    className="text-sm font-semibold break-words flex-1"
                    style={{ color: isActive ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {note.title || 'Untitled'}
                  </p>
                </div>

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

                {/* Hover actions: pin + delete */}
                <div className="absolute top-2.5 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isPinned: !note.isPinned }) }}
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                    className="p-1 rounded-lg"
                    style={{ color: note.isPinned ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Pin size={11} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="p-1 rounded-lg"
                    style={{ color: 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = '#E05050' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
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
    </>
  )
}
