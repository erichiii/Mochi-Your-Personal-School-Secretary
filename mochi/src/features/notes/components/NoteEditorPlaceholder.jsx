import { FileText } from 'lucide-react'
import useStore from '../../../app/store/useStore'

export default function NoteEditorPlaceholder() {
  const { activeNoteId, createNote } = useStore()

  if (activeNoteId !== null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--mochi-lavender-mid)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--mochi-text-soft)' }}>
            Tiptap editor coming in the next sprint
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--mochi-text-muted)' }}>
            Note ID: {activeNoteId}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--mochi-border)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
          Select a note to open it
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--mochi-text-muted)' }}>
          or create a new one
        </p>
        <button
          onClick={() => createNote()}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{
            background: 'var(--mochi-lavender)',
            color: 'var(--mochi-lavender-dark)',
            border: '1.5px solid var(--mochi-lavender-mid)',
          }}
        >
          New note
        </button>
      </div>
    </div>
  )
}
