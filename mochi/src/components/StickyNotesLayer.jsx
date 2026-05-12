import { useRef, useCallback } from 'react'
import { X, RotateCcw } from 'lucide-react'
import useStore from '../store'

const PALETTE = {
  peach:    { bg: '#FFE5CC', border: '#FFCBA4', text: '#7A3A10', placeholder: '#C09070' },
  mint:     { bg: '#D4F5E9', border: '#A8E6CF', text: '#0F5535', placeholder: '#60A882' },
  lavender: { bg: '#E8DEFF', border: '#C9B8F5', text: '#3A2080', placeholder: '#8870C0' },
  pink:     { bg: '#FFD6E0', border: '#FFB3C6', text: '#8A1840', placeholder: '#C07090' },
  sky:      { bg: '#D6EEFF', border: '#A8D4F5', text: '#0A4080', placeholder: '#5090C0' },
}

const COLOR_ORDER = ['peach', 'mint', 'lavender', 'pink', 'sky']

function StickyNote({ note }) {
  const { updateStickyNote, deleteStickyNote } = useStore()
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const colors = PALETTE[note.color] ?? PALETTE.peach

  const onDragStart = useCallback((e) => {
    dragging.current = true
    offset.current = { x: e.clientX - note.x, y: e.clientY - note.y }

    const onMove = (e) => {
      if (!dragging.current) return
      updateStickyNote(note.id, {
        x: Math.max(0, Math.min(window.innerWidth - 220, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 120, e.clientY - offset.current.y)),
      })
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [note.id, note.x, note.y, updateStickyNote])

  const cycleColor = (e) => {
    e.stopPropagation()
    const idx = COLOR_ORDER.indexOf(note.color)
    updateStickyNote(note.id, { color: COLOR_ORDER[(idx + 1) % COLOR_ORDER.length] })
  }

  const autoResize = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <div
      className="fixed z-50 flex flex-col rounded-2xl shadow-xl fade-in"
      style={{
        left: note.x,
        top: note.y,
        width: '216px',
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5 select-none flex-shrink-0"
        style={{ cursor: 'grab' }}
      >
        {/* Color dot — cycles color on click */}
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

      {/* Editable body */}
      <textarea
        value={note.content}
        onChange={(e) => {
          updateStickyNote(note.id, { content: e.target.value })
          autoResize(e)
        }}
        onFocus={(e) => autoResize(e)}
        placeholder="Write something…"
        className="w-full bg-transparent outline-none resize-none px-3 pb-3 text-sm leading-relaxed"
        style={{
          color: colors.text,
          minHeight: '100px',
          fontFamily: 'Nunito, sans-serif',
          caretColor: colors.text,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
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
