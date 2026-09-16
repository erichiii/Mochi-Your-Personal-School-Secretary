import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import ModuleSidebar from './components/ModuleSidebar'
import EditorPane from './components/EditorPane'
import NotesOverview from './components/NotesOverview'

const NOTES_WORKSPACE_STORAGE_KEY = 'mochi.notes.workspaceNotebookId'

const readSavedWorkspaceNotebookId = () => {
  try {
    const savedValue = window.localStorage.getItem(NOTES_WORKSPACE_STORAGE_KEY)
    return savedValue ? JSON.parse(savedValue) : null
  } catch {
    return null
  }
}

export default function NotesPage() {
  const location = useLocation()
  const routeNotebookId = location.state?.notebookId ?? null
  const initialNotebookId = routeNotebookId ?? readSavedWorkspaceNotebookId()
  const [showWorkspace, setShowWorkspace] = useState(Boolean(initialNotebookId))
  const [workspaceNotebookId, setWorkspaceNotebookId] = useState(initialNotebookId)

  useEffect(() => {
    if (routeNotebookId === null) return
    window.localStorage.setItem(NOTES_WORKSPACE_STORAGE_KEY, JSON.stringify(routeNotebookId))
  }, [routeNotebookId])

  const openWorkspace = (notebookId) => {
    const nextNotebookId = notebookId ?? null
    setWorkspaceNotebookId(nextNotebookId)
    setShowWorkspace(true)
    if (nextNotebookId === null) {
      window.localStorage.removeItem(NOTES_WORKSPACE_STORAGE_KEY)
    } else {
      window.localStorage.setItem(NOTES_WORKSPACE_STORAGE_KEY, JSON.stringify(nextNotebookId))
    }
  }

  const returnToOverview = () => {
    setShowWorkspace(false)
    setWorkspaceNotebookId(null)
    window.localStorage.removeItem(NOTES_WORKSPACE_STORAGE_KEY)
  }

  if (!showWorkspace) {
    return <NotesOverview onOpenWorkspace={openWorkspace} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="notes-workspace-bar">
        <button type="button" onClick={returnToOverview}>
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
