import NotesListPanel from '../components/notes/NotesListPanel'
import NoteEditorPlaceholder from '../components/notes/NoteEditorPlaceholder'

export default function NotesPage() {
  return (
    <div className="flex h-full">
      <NotesListPanel />
      <NoteEditorPlaceholder />
    </div>
  )
}
