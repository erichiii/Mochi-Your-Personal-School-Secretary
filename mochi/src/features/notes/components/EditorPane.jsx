import { useEffect, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { FileText, Plus, CheckCheck, AlertCircle, Loader2, Download } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import EditorToolbar from './EditorToolbar'
import SubjectPicker from './SubjectPicker'
import ResourcesPanel from './ResourcesPanel'
import AIPanel from './AIPanel'
import { FontSize } from '../../../shared/extensions/FontSize'

const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.can().sinkListItem('listItem')) return this.editor.commands.sinkListItem('listItem')
        if (this.editor.can().sinkListItem('taskItem')) return this.editor.commands.sinkListItem('taskItem')
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        if (this.editor.can().liftListItem('listItem')) return this.editor.commands.liftListItem('listItem')
        if (this.editor.can().liftListItem('taskItem')) return this.editor.commands.liftListItem('taskItem')
        return false
      },
    }
  },
})

export default function EditorPane() {
  const { notes, subjects, activeNoteId, activeSubjectFilter, updateNote, createNote, loadNotes } = useStore()
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  const [title, setTitle] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null)
  const titleTimer = useRef(null)
  const savedTimer = useRef(null)
  const lastLoadedId = useRef(null)

  // Ensure data is fresh on remount (tab switch back to Notes)
  useEffect(() => { loadNotes() }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Start writing your note... ✍️' }),
      CodeBlock,
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
      TextStyle,
      FontSize,
      TabIndent,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (!activeNoteId) return
      setSaveStatus('saving')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          await updateNote(activeNoteId, { content: editor.getHTML() })
          setSaveStatus('saved')
          clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, 600)
    },
  })

  // Load content when the active note changes
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (!activeNote) {
      if (lastLoadedId.current !== null) {
        editor.commands.setContent('')
        setTitle('')
        lastLoadedId.current = null
      }
      return
    }

    // Only reset content when switching to a different note
    if (lastLoadedId.current !== activeNote.id) {
      editor.commands.setContent(activeNote.content || '')
      setTitle(activeNote.title || '')
      lastLoadedId.current = activeNote.id
    }
  }, [activeNoteId, editor])

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(saveTimer.current)
    clearTimeout(titleTimer.current)
    clearTimeout(savedTimer.current)
  }, [])

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    if (!activeNoteId) return
    setSaveStatus('saving')
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      try {
        await updateNote(activeNoteId, { title: val })
        setSaveStatus('saved')
        clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 600)
  }

  const handleExportPDF = () => {
    if (!editor || !activeNote) return
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const subject = subjects.find((s) => s.id === activeNote.subjectId)
    const dateStr = activeNote.updatedAt
      ? new Date(activeNote.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title || 'Untitled')}</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#2d2030;max-width:720px;margin:0 auto;padding:56px 48px}
  .meta{margin-bottom:28px}
  .subject{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#999;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${subject?.color || '#ccc'}}
  h1.title{font-size:30px;font-weight:800;line-height:1.2;margin:0 0 6px;color:#1a1020}
  .date{font-size:12px;color:#bbb;margin-top:4px}
  hr{border:none;border-top:1px solid #eee;margin:24px 0}
  .content p{margin:0 0 1em}
  .content p:last-child{margin-bottom:0}
  .content h1{font-size:24px;font-weight:700;margin:1.6em 0 .5em}
  .content h2{font-size:20px;font-weight:700;margin:1.4em 0 .4em}
  .content h3{font-size:17px;font-weight:700;margin:1.2em 0 .4em}
  .content ul,.content ol{padding-left:1.6em;margin:.5em 0}
  .content li{margin-bottom:.25em}
  .content strong{font-weight:700}
  .content em{font-style:italic}
  .content u{text-decoration:underline}
  .content s{text-decoration:line-through}
  .content code{font-family:'Courier New',monospace;font-size:.88em;background:#f5f0fa;padding:2px 6px;border-radius:4px;color:#6b5fa8}
  .content pre{background:#f5f0fa;border-radius:8px;padding:16px 20px;overflow-x:auto;margin:1em 0}
  .content pre code{background:none;padding:0;color:#3d2c35}
  .content blockquote{border-left:4px solid #c9b8f5;margin:1em 0;padding:4px 16px;color:#666;font-style:italic}
  .content mark{background:#fff3a3;padding:0 2px;border-radius:2px}
  .content a{color:#6b5fa8}
  .content img{max-width:100%;border-radius:8px;margin:1em 0;display:block}
  .content table{border-collapse:collapse;width:100%;margin:1em 0}
  .content th,.content td{border:1px solid #e0d8f0;padding:8px 12px;text-align:left}
  .content th{background:#f5f0fa;font-weight:700}
  .content ul[data-type="taskList"]{list-style:none;padding-left:0}
  .content ul[data-type="taskList"]>li{display:flex;align-items:flex-start;gap:8px;margin-bottom:.3em}
  @media print{body{padding:0}@page{margin:.75in;size:A4}}
</style></head><body>
<div class="meta">
  ${subject ? `<div class="subject"><span class="dot"></span>${esc(subject.name)}</div>` : ''}
  <h1 class="title">${esc(title || 'Untitled')}</h1>
  ${dateStr ? `<div class="date">Last updated ${dateStr}</div>` : ''}
</div>
<hr>
<div class="content">${editor.getHTML()}</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`)
    win.document.close()
  }

  const handleImageUpload = () => {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        editor.chain().focus().setImage({ src: ev.target.result }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* ── Active note header ─────────────────────────────── */}
      {activeNote && (
        <div className="px-8 pt-6 pb-3" style={{ borderBottom: '1.5px solid var(--mochi-border)' }}>
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full bg-transparent outline-none text-2xl font-bold placeholder:opacity-30 mb-2"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--mochi-text)' }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <SubjectPicker noteId={activeNoteId} />
            <ResourcesPanel noteId={activeNoteId} resources={activeNote.resources ?? []} />
            <button
              onClick={handleExportPDF}
              title="Export as PDF"
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80 flex-shrink-0"
              style={{
                background: 'var(--mochi-peach)',
                color: 'var(--mochi-peach-dark)',
                border: '1.5px solid var(--mochi-peach-mid)',
              }}
            >
              <Download size={12} />
              Export PDF
            </button>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--mochi-text-muted)' }}>
              {saveStatus === 'saving' && <><Loader2 size={10} className="animate-spin" />Saving…</>}
              {saveStatus === 'saved' && <><CheckCheck size={10} style={{ color: 'var(--mochi-mint-dark)' }} /><span style={{ color: 'var(--mochi-mint-dark)' }}>Saved</span></>}
              {saveStatus === 'error' && <><AlertCircle size={10} style={{ color: '#E05050' }} /><span style={{ color: '#E05050' }}>Save failed</span></>}
            </span>
          </div>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────── */}
      {activeNote && (
        <EditorToolbar
          editor={editor}
          onImageUpload={handleImageUpload}
          aiOpen={aiOpen}
          onToggleAI={() => setAiOpen((v) => !v)}
        />
      )}

      {/* ── Editor + AI panel row ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor content — ALWAYS mounted so Tiptap keeps its DOM node */}
        <div className="flex-1 overflow-y-auto px-8 py-6" style={{ display: activeNote ? 'block' : 'none' }}>
          <EditorContent editor={editor} />
        </div>

        {/* Empty state — shown when no note selected */}
        {!activeNote && (
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
                onClick={() => createNote(activeSubjectFilter ? { subjectId: activeSubjectFilter } : {})}
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
        )}

        {/* AI panel */}
        {activeNote && aiOpen && (
          <AIPanel editor={editor} noteId={activeNoteId} onClose={() => setAiOpen(false)} />
        )}
      </div>
    </div>
  )
}
