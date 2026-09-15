import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, MoreVertical, Plus, Search, Trash2, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import ConfirmModal from '../../../shared/components/ConfirmModal'

const collectSubjectIds = (subjects, subjectId) => {
  const ids = new Set([subjectId])
  const queue = [subjectId]
  while (queue.length) {
    const parentId = queue.shift()
    subjects.filter((subject) => subject.parentId === parentId).forEach((subject) => {
      ids.add(subject.id)
      queue.push(subject.id)
    })
  }
  return ids
}

const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function ModuleSidebar({ notebookId }) {
  const { notes, subjects, activeNoteId, activeSubjectFilter, loadNotes, loadSubjects, createNote, deleteNote, setSubjectFilter, setActiveNote } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [menuId, setMenuId] = useState(null)
  const [confirmNote, setConfirmNote] = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { Promise.all([loadNotes(), loadSubjects()]) }, [loadNotes, loadSubjects])

  const notebook = subjects.find((subject) => subject.id === (notebookId ?? activeSubjectFilter)) ?? null
  const notebookSubjectIds = useMemo(
    () => notebook ? collectSubjectIds(subjects, notebook.id) : new Set(),
    [notebook, subjects],
  )
  const notebookNotes = useMemo(
    () => notes.filter((note) => notebookSubjectIds.has(note.subjectId)).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes, notebookSubjectIds],
  )
  const query = searchQuery.trim().toLowerCase()
  const visibleNotes = query
    ? notebookNotes.filter((note) => note.title.toLowerCase().includes(query) || stripHtml(note.content).toLowerCase().includes(query))
    : notebookNotes

  useEffect(() => {
    if (!notebook || activeNoteId && notebookSubjectIds.has(notes.find((note) => note.id === activeNoteId)?.subjectId)) return
    setActiveNote(notebookNotes[0]?.id ?? null)
  }, [activeNoteId, notebook, notebookNotes, notebookSubjectIds, notes, setActiveNote])

  const createPage = async () => {
    if (!notebook) return
    const id = await createNote({ subjectId: notebook.id })
    setSubjectFilter(notebook.id)
    setActiveNote(id)
  }

  if (collapsed) {
    return (
      <aside className="notes-module-sidebar notes-module-sidebar--collapsed">
        <button type="button" className="notes-module-edge-toggle" onClick={() => setCollapsed(false)} title="Show notebook sidebar" aria-label="Show notebook sidebar"><ChevronRight size={16} strokeWidth={2.5} /></button>
        <span aria-label={notebook?.name ?? 'Notes'}>{notebook?.name ?? 'Notes'}</span>
      </aside>
    )
  }

  return (
    <aside className="notes-module-sidebar">
      {confirmNote && <ConfirmModal
        title={`Delete \"${confirmNote.title || 'Untitled'}\"?`}
        onCancel={() => setConfirmNote(null)}
        onConfirm={async () => {
          setConfirmNote(null)
          await deleteNote(confirmNote.id)
        }}
      />}
      <header className="notes-module-sidebar__header">
        <h1>{notebook?.name ?? 'Notes'}</h1>
        <button type="button" className="notes-module-add" onClick={createPage} title="New page" aria-label="New page"><Plus size={25} /></button>
      </header>
      <label className="notes-module-search">
        <Search size={19} aria-hidden="true" />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
        {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={16} /></button>}
      </label>
      <div className="notes-module-list">
        {visibleNotes.map((note) => {
          const isActive = activeNoteId === note.id
          return <article key={note.id} className={`notes-module-card ${isActive ? 'is-active' : ''}`}>
            <button type="button" className="notes-module-card__select" onClick={() => { setActiveNote(note.id); setSubjectFilter(note.subjectId ?? notebook?.id) }}>
              <FileText size={17} aria-hidden="true" />
              <span>{note.title || 'Untitled'}</span>
            </button>
            <div className="notes-module-card__menu">
              <button type="button" onClick={() => setMenuId(menuId === note.id ? null : note.id)} aria-label={`Options for ${note.title || 'Untitled'}`}><MoreVertical size={21} /></button>
              {menuId === note.id && <div className="notes-module-card__dropdown"><button type="button" onClick={() => { setConfirmNote(note); setMenuId(null) }}><Trash2 size={15} /> Delete</button></div>}
            </div>
          </article>
        })}
        {!notebook && <p className="notes-module-empty">Select a notebook from the Notes overview.</p>}
        {notebook && visibleNotes.length === 0 && <p className="notes-module-empty">{query ? 'No notes match that search.' : 'No pages here yet.'}</p>}
      </div>
      <button type="button" className="notes-module-edge-toggle" onClick={() => setCollapsed(true)} title="Hide notebook sidebar" aria-label="Hide notebook sidebar"><ChevronLeft size={16} strokeWidth={2.5} /></button>
    </aside>
  )
}
