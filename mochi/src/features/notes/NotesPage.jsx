import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import useStore from '../../app/store/useStore'
import ModuleSidebar from './components/ModuleSidebar'
import EditorPane from './components/EditorPane'
import NotesOverview from './components/NotesOverview'

const NOTES_WORKSPACE_STORAGE_KEY = 'mochi.notes.workspaceNotebookId'

const readSavedWorkspace = () => {
  try {
    const savedValue = window.localStorage.getItem(NOTES_WORKSPACE_STORAGE_KEY)
    if (!savedValue) return null
    const savedWorkspace = JSON.parse(savedValue)
    // Support the notebook-only value stored by earlier versions.
    return typeof savedWorkspace === 'object' && savedWorkspace !== null
      ? savedWorkspace
      : { notebookId: savedWorkspace, noteId: null, folderId: null }
  } catch {
    return null
  }
}

export default function NotesPage() {
  const { activeNoteId, loadNotes, loadSubjects, setActiveNote, setSubjectFilter } = useStore()
  const location = useLocation()
  const routeNotebookId = location.state?.notebookId ?? null
  const savedWorkspace = readSavedWorkspace()
  const initialWorkspace = routeNotebookId === null
    ? savedWorkspace
    : { notebookId: routeNotebookId, noteId: null, folderId: location.state?.folderId ?? null }
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [showWorkspace, setShowWorkspace] = useState(Boolean(initialWorkspace?.notebookId))
  const [workspaceReady, setWorkspaceReady] = useState(!initialWorkspace?.notebookId)

  useEffect(() => {
    if (!showWorkspace || !workspace?.notebookId) return undefined
    let cancelled = false

    const restoreWorkspace = async () => {
      setWorkspaceReady(false)
      await Promise.all([loadNotes(), loadSubjects()])
      if (cancelled) return

      const savedNoteExists = workspace.noteId !== null && useStore.getState().notes.some((note) => note.id === workspace.noteId)
      setSubjectFilter(workspace.notebookId)
      setActiveNote(savedNoteExists ? workspace.noteId : null)
      setWorkspaceReady(true)
    }

    restoreWorkspace()
    return () => { cancelled = true }
  }, [showWorkspace, workspace?.notebookId, workspace?.noteId, loadNotes, loadSubjects, setActiveNote, setSubjectFilter])

  useEffect(() => {
    if (!showWorkspace || !workspace?.notebookId || !workspaceReady) return
    window.localStorage.setItem(NOTES_WORKSPACE_STORAGE_KEY, JSON.stringify({ ...workspace, noteId: activeNoteId }))
  }, [activeNoteId, showWorkspace, workspace, workspaceReady])

  const openWorkspace = (notebookId, folderId = null, noteId = null) => {
    const nextNotebookId = notebookId ?? null
    setShowWorkspace(true)
    setWorkspaceReady(false)
    if (nextNotebookId === null) {
      setWorkspace(null)
      window.localStorage.removeItem(NOTES_WORKSPACE_STORAGE_KEY)
    } else {
      const nextWorkspace = { notebookId: nextNotebookId, folderId, noteId }
      setWorkspace(nextWorkspace)
      window.localStorage.setItem(NOTES_WORKSPACE_STORAGE_KEY, JSON.stringify(nextWorkspace))
    }
  }

  const returnToOverview = () => {
    setShowWorkspace(false)
    setWorkspaceReady(true)
    setActiveNote(null)
    setSubjectFilter(workspace?.folderId ?? null)
    window.localStorage.removeItem(NOTES_WORKSPACE_STORAGE_KEY)
  }

  if (!showWorkspace) {
    return <NotesOverview onOpenWorkspace={openWorkspace} />
  }

  if (!workspaceReady) {
    return <div className="flex h-full items-center justify-center" aria-busy="true" aria-label="Restoring your notes" />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="notes-workspace-bar">
        <button type="button" onClick={returnToOverview}>
          <ArrowLeft size={18} aria-hidden="true" /> Back to notes
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <ModuleSidebar notebookId={workspace?.notebookId} />
        <EditorPane notebookId={workspace?.notebookId} />
      </div>
    </div>
  )
}
