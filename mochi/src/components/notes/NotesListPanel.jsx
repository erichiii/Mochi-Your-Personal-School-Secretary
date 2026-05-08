import { useEffect } from 'react'
import { Plus, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import useStore from '../../store'

export default function NotesListPanel() {
  const { notes, activeNoteId, loadNotes, createNote, setActiveNote } = useStore()

  useEffect(() => { loadNotes() }, [])

  const handleNew = async () => { await createNote() }

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
        <span className="text-sm font-bold" style={{ color: 'var(--mochi-lavender-dark)' }}>
          Notes
        </span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
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
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <FileText size={32} className="mb-3" style={{ color: 'var(--mochi-border)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
              No notes yet
            </p>
            <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
              Click "New" to create your first note
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = note.id === activeNoteId
            return (
              <button
                key={note.id}
                onClick={() => setActiveNote(note.id)}
                className="w-full text-left rounded-2xl p-3 transition-all fade-in"
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
                <p
                  className="text-sm font-semibold truncate mb-1"
                  style={{ color: isActive ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text)' }}
                >
                  {note.title || 'Untitled'}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--mochi-text-muted)' }}>
                  {note.updatedAt
                    ? formatDistanceToNow(note.updatedAt, { addSuffix: true })
                    : ''}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
