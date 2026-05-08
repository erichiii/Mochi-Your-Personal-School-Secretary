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
import { FileText } from 'lucide-react'
import useStore from '../../store'
import EditorToolbar from './EditorToolbar'

export default function EditorPane() {
  const { notes, activeNoteId, updateNote, createNote } = useStore()
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null

  const [title, setTitle] = useState('')
  const saveTimer = useRef(null)
  const titleTimer = useRef(null)

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
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (!activeNoteId) return
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateNote(activeNoteId, { content: editor.getHTML() })
      }, 600)
    },
  })

  // Load note content when active note changes
  useEffect(() => {
    if (!editor) return
    if (!activeNote) {
      editor.commands.setContent('')
      setTitle('')
      return
    }
    const current = editor.getHTML()
    if (current !== activeNote.content) {
      editor.commands.setContent(activeNote.content || '')
    }
    setTitle(activeNote.title || '')
  }, [activeNoteId, editor])

  // Cleanup timers
  useEffect(() => () => {
    clearTimeout(saveTimer.current)
    clearTimeout(titleTimer.current)
  }, [])

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    if (!activeNoteId) return
    clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      updateNote(activeNoteId, { title: val })
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

  if (!activeNote) {
    return (
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
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-8 pt-6 pb-3" style={{ borderBottom: '1.5px solid var(--mochi-border)' }}>
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent outline-none text-2xl font-bold placeholder:opacity-30"
          style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}
        />
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  )
}
