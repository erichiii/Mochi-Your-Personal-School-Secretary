import { useEffect, useRef, useState } from 'react'
import { Paperclip, X, ExternalLink, FileText, StickyNote, Link2, Upload, Search, ChevronDown } from 'lucide-react'
import useStore from '../../../app/store/useStore'

function labelFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function ResourceIcon({ r }) {
  if (r.type === 'url') return <ExternalLink size={11} style={{ flexShrink: 0, color: 'var(--mochi-lavender-dark)' }} />
  if (r.type === 'note') return <StickyNote size={11} style={{ flexShrink: 0, color: 'var(--mochi-mint-dark)' }} />
  if (r.type === 'file') {
    return r.mimeType?.startsWith('image/')
      ? <Paperclip size={11} style={{ flexShrink: 0, color: 'var(--mochi-peach-dark)' }} />
      : <FileText size={11} style={{ flexShrink: 0, color: 'var(--mochi-peach-dark)' }} />
  }
  return <Paperclip size={11} style={{ flexShrink: 0 }} />
}

function AddTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
      style={
        active
          ? { background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }
          : { color: 'var(--mochi-text-muted)', border: '1.5px solid transparent' }
      }
    >
      {children}
    </button>
  )
}

export default function ResourcesPanel({ noteId, resources = [], forceOpen = false, showTrigger = true, inline = false }) {
  const { updateNote, notes, setActiveNote } = useStore()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(null) // 'url' | 'file' | 'note'
  const [url, setUrl] = useState('')
  const [urlLabel, setUrlLabel] = useState('')
  const [noteSearch, setNoteSearch] = useState('')
  const ref = useRef()
  const fileRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); resetForm() } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setOpen(forceOpen && !inline) }, [forceOpen, inline])

  const resetForm = () => { setTab(null); setUrl(''); setUrlLabel(''); setNoteSearch('') }

  const save = (list) => updateNote(noteId, { resources: list })

  const handleAddUrl = () => {
    const trimUrl = url.trim()
    if (!trimUrl) { setTab(null); setUrl(''); setUrlLabel(''); return }
    const full = /^https?:\/\//i.test(trimUrl) ? trimUrl : `https://${trimUrl}`
    save([...resources, { id: crypto.randomUUID(), type: 'url', url: full, label: urlLabel.trim() || labelFromUrl(full) }])
    setUrl(''); setUrlLabel(''); setTab(null)
  }

  const handleAddFile = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const additions = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve({ id: crypto.randomUUID(), type: 'file', name: file.name, mimeType: file.type, dataUrl: ev.target.result })
      reader.onerror = reject
      reader.readAsDataURL(file)
    })))
    save([...resources, ...additions])
    e.target.value = ''
    setTab(null)
  }

  const handleAddNote = (note) => {
    if (resources.some((r) => r.type === 'note' && r.noteId === note.id)) return
    save([...resources, { id: crypto.randomUUID(), type: 'note', noteId: note.id, label: note.title || 'Untitled' }])
    setNoteSearch(''); setTab(null)
  }

  const handleDelete = (id) => save(resources.filter((r) => r.id !== id))

  const openResource = (r) => {
    if (r.type === 'url') { window.open(r.url, '_blank', 'noopener,noreferrer'); return }
    if (r.type === 'file') {
      const canPreview = r.mimeType?.startsWith('image/') || r.mimeType === 'application/pdf' || r.mimeType?.startsWith('text/')
      if (canPreview && r.dataUrl) {
        const [header, b64] = r.dataUrl.split(',')
        const bytes = Uint8Array.from(atob(b64 ?? ''), (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: r.mimeType })
        const blobUrl = URL.createObjectURL(blob)
        const win = window.open(blobUrl, '_blank')
        if (win) setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
        return
      }
      const a = document.createElement('a')
      a.href = r.dataUrl; a.download = r.name; a.click()
      return
    }
    if (r.type === 'note') {
      const exists = notes.find((n) => n.id === r.noteId)
      if (exists) { setActiveNote(r.noteId); setOpen(false) }
    }
  }

  const otherNotes = notes.filter((n) => n.id !== noteId && (
    !noteSearch.trim() ||
    (n.title || 'Untitled').toLowerCase().includes(noteSearch.toLowerCase())
  ))

  return (
    <div className={inline ? 'notes-resources-panel' : 'relative'} ref={ref}>
      {showTrigger && (
        <button
          onClick={() => { setOpen((v) => !v); if (open) resetForm() }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
          style={
            resources.length > 0
              ? { background: 'var(--mochi-peach)', border: '1.5px solid var(--mochi-peach-mid)', color: 'var(--mochi-peach-dark)' }
              : { background: 'var(--mochi-border)', color: 'var(--mochi-text-muted)', border: '1.5px solid transparent' }
          }
        >
          <Paperclip size={11} />
          <span>{resources.length > 0 ? `${resources.length} resource${resources.length > 1 ? 's' : ''}` : 'Resources'}</span>
          <ChevronDown size={10} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        </button>
      )}

      {(inline || open) && (
        <div
          className={inline ? 'notes-resources-panel__content fade-in' : 'absolute left-0 top-full mt-1.5 z-50 rounded-2xl shadow-xl fade-in'}
          style={{
            background: 'var(--mochi-surface)',
            border: '1.5px solid var(--mochi-border)',
            width: inline ? 'min(100%, 44rem)' : '260px',
          }}
        >
          {/* Existing resources */}
          {resources.length > 0 && (
            <div className="p-2 flex flex-col gap-1" style={{ borderBottom: '1.5px solid var(--mochi-border)' }}>
              {resources.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors"
                  style={{ background: 'var(--mochi-cream)' }}
                  onClick={() => openResource(r)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                >
                  <ResourceIcon r={r} />
                  <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--mochi-text)' }}>
                    {r.label ?? r.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    style={{ color: 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add section */}
          <div className="p-2">
            {/* Type tabs */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: 'var(--mochi-text-muted)' }}>Add:</span>
              <AddTab active={tab === 'url'} onClick={() => setTab(tab === 'url' ? null : 'url')}>
                <Link2 size={10} /> Link
              </AddTab>
              <AddTab active={tab === 'file'} onClick={() => { setTab(tab === 'file' ? null : 'file'); if (tab !== 'file') setTimeout(() => fileRef.current?.click(), 50) }}>
                <Upload size={10} /> File
              </AddTab>
              <AddTab active={tab === 'note'} onClick={() => setTab(tab === 'note' ? null : 'note')}>
                <StickyNote size={10} /> Note
              </AddTab>
            </div>

            {/* URL form */}
            {tab === 'url' && (
              <div className="flex flex-col gap-1.5 fade-in">
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); if (e.key === 'Escape') setTab(null) }}
                  placeholder="https://example.com"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
                />
                <input
                  value={urlLabel}
                  onChange={(e) => setUrlLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddUrl(); if (e.key === 'Escape') setTab(null) }}
                  onBlur={handleAddUrl}
                  placeholder="Label (optional)"
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none"
                  style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
                />
              </div>
            )}

            {/* Note picker */}
            {tab === 'note' && (
              <div className="flex flex-col gap-1 fade-in">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
                >
                  <Search size={11} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search notes…"
                    className="flex-1 bg-transparent outline-none text-xs"
                    style={{ color: 'var(--mochi-text)' }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                  {otherNotes.length === 0 ? (
                    <p className="text-xs px-2 py-1.5" style={{ color: 'var(--mochi-text-muted)' }}>No notes found</p>
                  ) : (
                    otherNotes.map((n) => {
                      const already = resources.some((r) => r.type === 'note' && r.noteId === n.id)
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleAddNote(n)}
                          disabled={already}
                          className="text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold truncate transition-colors"
                          style={{ color: already ? 'var(--mochi-text-muted)' : 'var(--mochi-text)', opacity: already ? 0.5 : 1 }}
                          onMouseEnter={(e) => { if (!already) e.currentTarget.style.background = 'var(--mochi-cream)' }}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {n.title || 'Untitled'}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input ref={fileRef} type="file" className="hidden" onChange={handleAddFile} multiple />
        </div>
      )}
    </div>
  )
}
