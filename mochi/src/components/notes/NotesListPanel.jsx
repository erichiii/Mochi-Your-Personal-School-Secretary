import { useEffect } from 'react'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../../store'

const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function NotesListPanel() {
  const {
    notes, subjects, activeNoteId, activeSubjectFilter,
    loadNotes, createNote, deleteNote, setActiveNote,
  } = useStore()

  useEffect(() => { loadNotes() }, [])

  const activeSubject = subjects.find((s) => s.id === activeSubjectFilter) ?? null

  const filtered =
    activeSubjectFilter == null
      ? notes
      : notes.filter((n) => n.subjectId === activeSubjectFilter)

  const handleNew = () => {
    createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {})
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    deleteNote(id)
  }

  return (
    <div
      className="w-[260px] flex-shrink-0 flex flex-col h-full"
      style={{ borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1.5px solid var(--mochi-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeSubject && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: activeSubject.color }}
            />
          )}
          <span
            className="text-sm font-bold truncate"
            style={{ color: 'var(--mochi-lavender-dark)' }}
          >
            {activeSubject ? activeSubject.name : 'All Notes'}
          </span>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 flex-shrink-0"
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

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText size={32} className="mb-3" style={{ color: 'var(--mochi-border)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
              {activeSubject ? `No notes in ${activeSubject.name}` : 'No notes yet'}
            </p>
            <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
              Click "New" to create one
            </p>
          </div>
        ) : (
          filtered.map((note) => {
            const isActive = note.id === activeNoteId
            const subject = subjects.find((s) => s.id === note.subjectId)
            const preview = stripHtml(note.content).slice(0, 100)

            return (
              <div
                key={note.id}
                onClick={() => setActiveNote(note.id)}
                className="group relative rounded-2xl p-3 transition-all fade-in cursor-pointer"
                style={
                  isActive
                    ? {
                        background: 'var(--mochi-lavender)',
                        border: '1.5px solid var(--mochi-lavender-mid)',
                      }
                    : {
                        background: 'var(--mochi-surface)',
                        border: '1.5px solid var(--mochi-border)',
                      }
                }
              >
                {/* Title */}
                <p
                  className="text-sm font-semibold truncate pr-6"
                  style={{
                    color: isActive ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text)',
                  }}
                >
                  {note.title || 'Untitled'}
                </p>

                {/* Content preview */}
                {preview && (
                  <p
                    className="text-xs mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: 'var(--mochi-text-muted)' }}
                  >
                    {preview}
                  </p>
                )}

                {/* Footer: subject + timestamp */}
                <div className="flex items-center gap-2 mt-2">
                  {subject && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: subject.color + '44',
                        color: 'var(--mochi-text-soft)',
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: subject.color }}
                      />
                      {subject.name}
                    </span>
                  )}
                  <span
                    className="text-[10px] ml-auto"
                    style={{ color: 'var(--mochi-text-muted)' }}
                  >
                    {note.updatedAt
                      ? formatDistanceToNow(note.updatedAt, { addSuffix: true })
                      : ''}
                  </span>
                </div>

                {/* Delete button — appears on hover */}
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--mochi-border)'
                    e.currentTarget.style.color = 'var(--mochi-text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--mochi-text-muted)'
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
