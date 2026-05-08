import NotesListPanel from '../components/notes/NotesListPanel'
import EditorPane from '../components/notes/EditorPane'

export default function NotesPage() {
  return (
    <div className="flex h-full">
      <NotesListPanel />
      <EditorPane />
    </div>
  )
}
