import { useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { X, Bold, Italic, Underline, Strikethrough } from 'lucide-react'
import useStore from '../store'

const PALETTE = {
  peach:    { bg: '#FFE5CC', border: '#FFCBA4', text: '#7A3A10' },
  mint:     { bg: '#D4F5E9', border: '#A8E6CF', text: '#0F5535' },
  lavender: { bg: '#E8DEFF', border: '#C9B8F5', text: '#3A2080' },
  pink:     { bg: '#FFD6E0', border: '#FFB3C6', text: '#8A1840' },
  sky:      { bg: '#D6EEFF', border: '#A8D4F5', text: '#0A4080' },
}

const COLOR_ORDER = ['peach', 'mint', 'lavender', 'pink', 'sky']
const MIN_W = 180
const MIN_H = 140

function FmtBtn({ active, onMouseDown, children, colors }) {
  return (
    <button
      onMouseDown={onMouseDown}
      className="w-5 h-5 flex items-center justify-center rounded transition-all"
      style={{
        background: active ? colors.border : 'transparent',
        color: colors.text,
        opacity: active ? 1 : 0.5,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function StickyNote({ note }) {
  const { updateStickyNote, deleteStickyNote } = useStore()
  const colors = PALETTE[note.color] ?? PALETTE.peach
  const w = note.width  ?? 216
  const h = note.height ?? 200

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      UnderlineExt,
      Placeholder.configure({ placeholder: 'Write something…' }),
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => updateStickyNote(note.id, { content: editor.getHTML() }),
  })

  const onDragStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX - note.x
    const startY = e.clientY - note.y
    const onMove = (e) => updateStickyNote(note.id, {
      x: Math.max(0, Math.min(window.innerWidth  - w,  e.clientX - startX)),
      y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - startY)),
    })
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, [note.id, note.x, note.y, w, updateStickyNote])

  const onResizeStart = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const startW = w, startH = h
    const onMove = (e) => updateStickyNote(note.id, {
      width:  Math.max(MIN_W, startW + e.clientX - startX),
      height: Math.max(MIN_H, startH + e.clientY - startY),
    })
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, [note.id, w, h, updateStickyNote])

  const cycleColor = (e) => {
    e.stopPropagation()
    const idx = COLOR_ORDER.indexOf(note.color)
    updateStickyNote(note.id, { color: COLOR_ORDER[(idx + 1) % COLOR_ORDER.length] })
  }

  const fmt = (fn) => (e) => { e.preventDefault(); fn() }

  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl shadow-xl fade-in"
      style={{
        left: note.x, top: note.y,
        width: w, height: h,
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Top bar: drag + color + delete */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1 select-none flex-shrink-0"
        style={{ cursor: 'grab' }}
      >
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={cycleColor}
          title="Change color"
          className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
          style={{ background: colors.border }}
        />
        <div className="flex-1" />
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => deleteStickyNote(note.id)}
          title="Delete"
          className="p-0.5 rounded transition-opacity opacity-40 hover:opacity-100"
          style={{ color: colors.text }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Formatting toolbar */}
      <div
        className="flex items-center gap-0.5 px-2.5 pb-1.5 flex-shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <FmtBtn colors={colors} active={editor?.isActive('bold')}
          onMouseDown={fmt(() => editor?.chain().focus().toggleBold().run())}>
          <Bold size={11} />
        </FmtBtn>
        <FmtBtn colors={colors} active={editor?.isActive('italic')}
          onMouseDown={fmt(() => editor?.chain().focus().toggleItalic().run())}>
          <Italic size={11} />
        </FmtBtn>
        <FmtBtn colors={colors} active={editor?.isActive('underline')}
          onMouseDown={fmt(() => editor?.chain().focus().toggleUnderline().run())}>
          <Underline size={11} />
        </FmtBtn>
        <FmtBtn colors={colors} active={editor?.isActive('strike')}
          onMouseDown={fmt(() => editor?.chain().focus().toggleStrike().run())}>
          <Strikethrough size={11} />
        </FmtBtn>
      </div>

      {/* Editor body */}
      <div
        className="flex-1 overflow-y-auto px-3 pb-3 min-h-0 tiptap-sticky"
        style={{ color: colors.text, fontSize: '13px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 flex items-end justify-end"
        style={{ width: 18, height: 18, cursor: 'nwse-resize', paddingBottom: 3, paddingRight: 3 }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.35 }}>
          <circle cx="6" cy="6" r="1.2" fill={colors.text} />
          <circle cx="3" cy="6" r="1.2" fill={colors.text} />
          <circle cx="6" cy="3" r="1.2" fill={colors.text} />
        </svg>
      </div>
    </div>
  )
}

export default function StickyNotesLayer() {
  const { stickyNotes } = useStore()
  return (
    <>
      {stickyNotes.map((note) => (
        <StickyNote key={note.id} note={note} />
      ))}
    </>
  )
}
