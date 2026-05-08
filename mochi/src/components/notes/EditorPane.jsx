import { useEffect, useRef, useState } from 'react'
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
import { FileText, Plus, CheckCheck, AlertCircle, Loader2 } from 'lucide-react'
import useStore from '../../store'
import EditorToolbar from './EditorToolbar'
import SubjectPicker from './SubjectPicker'
import ResourcesPanel from './ResourcesPanel'
import AIPanel from './AIPanel'
import { FontSize } from '../../extensions/FontSize'

export default function EditorPane() {
  const { notes, activeNoteId, updateNote, createNote, loadNotes } = useStore()
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
            style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <SubjectPicker noteId={activeNoteId} />
            <ResourcesPanel noteId={activeNoteId} resources={activeNote.resources ?? []} />
            <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: 'var(--mochi-text-muted)' }}>
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
                onClick={() => createNote()}
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
