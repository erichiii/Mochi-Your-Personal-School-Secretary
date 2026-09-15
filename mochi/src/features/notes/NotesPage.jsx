import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import ModuleSidebar from './components/ModuleSidebar'
import EditorPane from './components/EditorPane'
import NotesOverview from './components/NotesOverview'

export default function NotesPage() {
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [workspaceNotebookId, setWorkspaceNotebookId] = useState(null)

  if (!showWorkspace) {
    return <NotesOverview onOpenWorkspace={(notebookId) => {
      setWorkspaceNotebookId(notebookId ?? null)
      setShowWorkspace(true)
    }} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="notes-workspace-bar">
        <button type="button" onClick={() => setShowWorkspace(false)}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to notes
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <ModuleSidebar notebookId={workspaceNotebookId} />
        <EditorPane notebookId={workspaceNotebookId} />
      </div>
    </div>
  )
}
