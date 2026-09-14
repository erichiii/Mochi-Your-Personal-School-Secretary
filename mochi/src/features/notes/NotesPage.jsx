import NotesListPanel from './components/NotesListPanel'
import EditorPane from './components/EditorPane'

export default function NotesPage() {
  return (
    <div className="flex h-full">
      <NotesListPanel />
      <EditorPane />
    </div>
  )
}
