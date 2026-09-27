import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronDown, FileText, Folder, MoreVertical, Plus, Search, Trash2, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import ConfirmModal from '../../../shared/components/ConfirmModal'
import notesMascot from '../../../assets/mascots/mochi-notes.png'

const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function NotesOverview({ onOpenWorkspace }) {
  const { notes, subjects, activeSubjectFilter, loadNotes, loadSubjects, createNote, createSubject, updateSubject, deleteSubject, setActiveNote, setSubjectFilter } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [creating, setCreating] = useState(null)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [itemMenuId, setItemMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => { Promise.all([loadNotes(), loadSubjects()]) }, [loadNotes, loadSubjects])

  const folders = useMemo(() => subjects.filter((subject) => !subject.parentId), [subjects])
  const selectedFolder = folders.find((folder) => folder.id === activeSubjectFilter) ?? null
  const childNotebooks = selectedFolder ? subjects.filter((subject) => subject.parentId === selectedFolder.id) : folders
  // All notes includes notebooks directly inside folders, not deeper organizing sections.
  const allNotebooks = subjects.filter((subject) => folders.some((folder) => folder.id === subject.parentId))
  const notebooks = selectedFolder
    ? (childNotebooks.length === 0 ? [selectedFolder] : childNotebooks)
    : allNotebooks

  const getNoteCount = (subjectId) => {
    const subjectIds = new Set([subjectId])
    const queue = [subjectId]
    while (queue.length > 0) {
      const parentId = queue.shift()
      subjects.filter((subject) => subject.parentId === parentId).forEach((subject) => {
        subjectIds.add(subject.id)
        queue.push(subject.id)
      })
    }
    return notes.filter((note) => subjectIds.has(note.subjectId)).length
  }
  const query = searchQuery.trim().toLowerCase()
  const visibleNotebooks = query
    ? subjects.filter((subject) => {
        const subjectNotes = notes.filter((note) => note.subjectId === subject.id)
        return subject.name.toLowerCase().includes(query) || subjectNotes.some((note) =>
          note.title.toLowerCase().includes(query) || stripHtml(note.content).toLowerCase().includes(query)
        )
      })
    : notebooks

  const openNotebook = (subject) => {
    setSubjectFilter(subject.id)
    setActiveNote(null)
    onOpenWorkspace(subject.id, selectedFolder?.id ?? subject.parentId ?? null)
  }
  const selectFolder = (folderId) => { setSubjectFilter(folderId); setSearchQuery('') }

  const startRename = (subject) => {
    setEditingId(subject.id)
    setEditingName(subject.name)
    setItemMenuId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveRename = async (event) => {
    event.preventDefault()
    const trimmedName = editingName.trim()
    if (!trimmedName || editingId === null) return
    await updateSubject(editingId, { name: trimmedName })
    cancelRename()
  }

  const handleDelete = (subject) => {
    const isFolder = !subject.parentId
    setConfirmDelete({
      title: `Delete "${subject.name}"?`,
      message: isFolder
        ? 'The folder and its notebooks will be removed. Notes will be kept without a folder.'
        : 'The notebook will be removed. Its notes will be kept without a notebook.',
      onConfirm: async () => {
        setConfirmDelete(null)
        if (activeSubjectFilter === subject.id || (isFolder && selectedFolder?.id === subject.id)) setSubjectFilter(null)
        await deleteSubject(subject.id)
      },
    })
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName || !creating) return
    const parentId = creating === 'notebook' ? selectedFolder?.id ?? null : null
    const id = await createSubject({
      name: trimmedName,
      parentId,
      color: creating === 'folder' ? '#FF8FAB' : selectedFolder?.color ?? '#C9B8F5',
    })
    setName('')
    setCreating(null)
    setMenuOpen(false)
    if (creating === 'folder') setSubjectFilter(id)
  }

  const handleNewNote = async () => {
    setMenuOpen(false)
    const noteId = await createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {})
    onOpenWorkspace(activeSubjectFilter, selectedFolder?.id ?? activeSubjectFilter ?? null, noteId)
  }

  const startCreating = (type) => { setCreating(type); setName(''); setMenuOpen(false) }

  return (
    <main className="notes-overview">
      <header className="notes-overview__header">
        <div className="notes-overview__title-wrap">
          <img src={notesMascot} alt="Mochi reading beside a stack of books" className="notes-overview__mascot" />
          <h1 className="mochi-page-title notes-overview__title">Notes</h1>
        </div>
        <div className="notes-overview__actions">
          <label className="notes-search">
            <Search size={22} aria-hidden="true" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"><X size={17} /></button>}
          </label>
          <div className="notes-new-menu">
            <button type="button" className="notes-new-button" onClick={handleNewNote}><Plus size={28} aria-hidden="true" /><span>New</span></button>
            <button type="button" className="notes-new-chevron" onClick={() => setMenuOpen((open) => !open)} aria-label="Show new item options" aria-expanded={menuOpen}><ChevronDown size={25} aria-hidden="true" /></button>
            {menuOpen && <div className="notes-new-dropdown">
              <button type="button" onClick={() => startCreating('folder')}><Folder size={25} /> Folder</button>
              <button type="button" onClick={() => startCreating('notebook')}><BookOpen size={25} /> Notebook</button>
            </div>}
          </div>
        </div>
      </header>

      <section className="notes-overview__folders" aria-labelledby="folders-heading">
        <h2 id="folders-heading">Folders</h2>
        <div className="notes-folder-list">
          <button type="button" onClick={() => selectFolder(null)} className={`notes-folder-pill ${activeSubjectFilter == null ? 'is-active' : ''}`}><Folder size={27} aria-hidden="true" /> All notes</button>
          {folders.map((folder) => {
            const isEditing = editingId === folder.id
            return <div className={`notes-folder-pill-wrap ${selectedFolder?.id === folder.id ? 'is-active' : ''}`} key={folder.id}>
              {isEditing ? <form className="notes-folder-rename-form" onSubmit={saveRename}>
                <Folder size={22} aria-hidden="true" />
                <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Rename folder ${folder.name}`} />
                <button type="submit" aria-label="Save folder name" title="Save"><Check size={16} /></button>
                <button type="button" onClick={cancelRename} aria-label="Cancel renaming" title="Cancel"><X size={16} /></button>
              </form> : <>
                <button type="button" onClick={() => selectFolder(folder.id)} className={`notes-folder-pill ${selectedFolder?.id === folder.id ? 'is-active' : ''}`}><Folder size={27} aria-hidden="true" /> <span>{folder.name}</span></button>
                <div className="notes-item-menu">
                  <button type="button" className="notes-item-menu__trigger" onClick={() => setItemMenuId(itemMenuId === folder.id ? null : folder.id)} aria-label={`Options for folder ${folder.name}`} aria-expanded={itemMenuId === folder.id}><MoreVertical size={19} /></button>
                  {itemMenuId === folder.id && <div className="notes-item-menu__dropdown" role="menu">
                    <button type="button" onClick={() => startRename(folder)}><FileText size={15} /> Rename</button>
                    <button type="button" onClick={() => { setItemMenuId(null); handleDelete(folder) }}><Trash2 size={15} /> Delete</button>
                  </div>}
                </div>
              </>}
            </div>
          })}
        </div>
        {creating === 'folder' && <form className="notes-create-form" onSubmit={(event) => { event.preventDefault(); handleCreate() }}>
          <Folder size={20} aria-hidden="true" /><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Folder name" />
          <button type="submit">Add</button><button type="button" className="notes-create-cancel" onClick={() => setCreating(null)} aria-label="Cancel creating folder"><X size={18} /></button>
        </form>}
      </section>

      <section className="notes-overview__notebooks" aria-labelledby="notebooks-heading">
        <div className="notes-overview__section-heading">
          <h2 id="notebooks-heading">{query ? 'Search results' : selectedFolder ? `${selectedFolder.name} notebooks` : 'Notebooks'}</h2>
          {selectedFolder && <span>{notebooks.length} {notebooks.length === 1 ? 'notebook' : 'notebooks'}</span>}
        </div>
        {creating === 'notebook' && <form className="notes-create-form" onSubmit={(event) => { event.preventDefault(); handleCreate() }}>
          <BookOpen size={20} aria-hidden="true" /><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Notebook name" />
          <button type="submit">Add</button><button type="button" className="notes-create-cancel" onClick={() => setCreating(null)} aria-label="Cancel creating notebook"><X size={18} /></button>
        </form>}
        <div className="notes-notebook-list">
          {visibleNotebooks.map((notebook) => {
            const count = getNoteCount(notebook.id)
            const isEditing = editingId === notebook.id
            return <div key={notebook.id} className="notes-notebook-row">
              {isEditing ? <form className="notes-notebook-rename-form" onSubmit={saveRename}>
                <FileText size={27} aria-hidden="true" />
                <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Rename notebook ${notebook.name}`} />
                <button type="submit" aria-label="Save notebook name" title="Save"><Check size={17} /></button>
                <button type="button" onClick={cancelRename} aria-label="Cancel renaming" title="Cancel"><X size={17} /></button>
              </form> : <>
                <button type="button" className="notes-notebook-row__open" onClick={() => openNotebook(notebook)}>
                  <span className="notes-notebook-row__icon"><FileText size={27} aria-hidden="true" /></span><span className="notes-notebook-row__name">{notebook.name}</span><span className="notes-notebook-row__count">{count} {count === 1 ? 'note' : 'notes'}</span><ArrowRight size={31} aria-hidden="true" />
                </button>
                <div className="notes-item-menu">
                  <button type="button" className="notes-item-menu__trigger" onClick={() => setItemMenuId(itemMenuId === notebook.id ? null : notebook.id)} aria-label={`Options for notebook ${notebook.name}`} aria-expanded={itemMenuId === notebook.id}><MoreVertical size={21} /></button>
                  {itemMenuId === notebook.id && <div className="notes-item-menu__dropdown" role="menu">
                    <button type="button" onClick={() => startRename(notebook)}><FileText size={15} /> Rename</button>
                    <button type="button" onClick={() => { setItemMenuId(null); handleDelete(notebook) }}><Trash2 size={15} /> Delete</button>
                  </div>}
                </div>
              </>}
            </div>
          })}
          {visibleNotebooks.length === 0 && <div className="notes-overview__empty"><BookOpen size={36} aria-hidden="true" /><p>{query ? 'No notebooks or notes match that search.' : 'No notebooks here yet.'}</p></div>}
        </div>
      </section>
      {confirmDelete && <ConfirmModal
        title={confirmDelete.title}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onCancel={() => setConfirmDelete(null)}
      />}
    </main>
  )
}
