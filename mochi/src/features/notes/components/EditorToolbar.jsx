import {
  Bold, Italic, Underline, Strikethrough, Highlighter, Code, Code2,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Minus, Table2, ImageIcon,
  Undo2, Redo2,
  RowsIcon, Columns2, Trash2,
} from 'lucide-react'

function Btn({ onMouseDown, active, disabled, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown?.() }}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg transition-all flex-shrink-0"
      style={{
        background: active ? 'var(--mochi-lavender)' : 'transparent',
        color: active
          ? 'var(--mochi-lavender-dark)'
          : 'var(--mochi-text-soft)',
        border: active
          ? '1.5px solid var(--mochi-lavender-mid)'
          : '1.5px solid transparent',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return (
    <div
      className="w-px h-5 flex-shrink-0 mx-0.5 self-center"
      style={{ background: 'var(--mochi-border)' }}
    />
  )
}

export default function EditorToolbar({ editor, onImageUpload, aiOpen, onToggleAI }) {
  if (!editor) return null

  const inTable = editor.isActive('table')

  return (
    <div style={{ borderBottom: '1.5px solid var(--mochi-border)' }}>
      {/* Main toolbar row */}
      <div className="flex items-center gap-0.5 px-4 py-2 flex-wrap">
        {/* History */}
        <Btn
          title="Undo"
          disabled={!editor.can().undo()}
          onMouseDown={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={14} />
        </Btn>
        <Btn
          title="Redo"
          disabled={!editor.can().redo()}
          onMouseDown={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={14} />
        </Btn>

        <Sep />

        {/* Headings */}
        <Btn
          title="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onMouseDown={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={14} />
        </Btn>
        <Btn
          title="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </Btn>
        <Btn
          title="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </Btn>

        <Sep />

        {/* Inline formatting */}
        <Btn
          title="Bold"
          active={editor.isActive('bold')}
          onMouseDown={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </Btn>
        <Btn
          title="Italic"
          active={editor.isActive('italic')}
          onMouseDown={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </Btn>
        <Btn
          title="Underline"
          active={editor.isActive('underline')}
          onMouseDown={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={14} />
        </Btn>
        <Btn
          title="Strikethrough"
          active={editor.isActive('strike')}
          onMouseDown={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={14} />
        </Btn>
        <Btn
          title="Highlight"
          active={editor.isActive('highlight')}
          onMouseDown={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={14} />
        </Btn>
        <Btn
          title="Inline code"
          active={editor.isActive('code')}
          onMouseDown={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={14} />
        </Btn>

        <Sep />

        {/* Lists */}
        <Btn
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onMouseDown={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </Btn>
        <Btn
          title="Ordered list"
          active={editor.isActive('orderedList')}
          onMouseDown={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </Btn>
        <Btn
          title="Checklist"
          active={editor.isActive('taskList')}
          onMouseDown={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks size={14} />
        </Btn>

        <Sep />

        {/* Blocks */}
        <Btn
          title="Code block"
          active={editor.isActive('codeBlock')}
          onMouseDown={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 size={14} />
        </Btn>
        <Btn
          title="Blockquote"
          active={editor.isActive('blockquote')}
          onMouseDown={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </Btn>
        <Btn
          title="Divider"
          onMouseDown={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={14} />
        </Btn>

        <Sep />

        {/* Font size */}
        {(() => {
          const raw = editor.getAttributes('textStyle')?.fontSize
          const size = raw ? parseInt(raw) : 16
          const decrease = () => {
            const next = Math.max(size - 2, 10)
            if (next === 16 && !raw) return
            editor.chain().focus().setFontSize(next).run()
          }
          const increase = () => {
            editor.chain().focus().setFontSize(Math.min(size + 2, 72)).run()
          }
          return (
            <div className="flex items-center gap-0.5">
              <Btn title="Decrease font size" onMouseDown={decrease}>
                <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>A-</span>
              </Btn>
              <span
                className="w-6 text-center text-[10px] font-semibold select-none"
                style={{ color: 'var(--mochi-text-muted)' }}
              >
                {size}
              </span>
              <Btn title="Increase font size" onMouseDown={increase}>
                <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>A+</span>
              </Btn>
            </div>
          )
        })()}

        <Sep />

        {/* Insert */}
        <Btn
          title="Insert table"
          active={inTable}
          onMouseDown={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <Table2 size={14} />
        </Btn>
        <Btn title="Insert image" onMouseDown={onImageUpload}>
          <ImageIcon size={14} />
        </Btn>

      </div>

      {/* Table controls row — only when cursor is inside a table */}
      {inTable && (
        <div
          className="flex items-center gap-0.5 px-4 py-1.5 fade-in"
          style={{ background: 'var(--mochi-lavender)', borderTop: '1px solid var(--mochi-lavender-mid)' }}
        >
          <span className="text-[10px] font-bold mr-1.5" style={{ color: 'var(--mochi-lavender-dark)' }}>
            Table:
          </span>

          <Btn title="Add row above" onMouseDown={() => editor.chain().focus().addRowBefore().run()}>
            <RowsIcon size={13} />
          </Btn>
          <Btn title="Add row below" onMouseDown={() => editor.chain().focus().addRowAfter().run()}>
            <RowsIcon size={13} style={{ transform: 'scaleY(-1)' }} />
          </Btn>
          <Btn title="Delete row" onMouseDown={() => editor.chain().focus().deleteRow().run()}>
            <Trash2 size={13} />
          </Btn>

          <Sep />

          <Btn title="Add column before" onMouseDown={() => editor.chain().focus().addColumnBefore().run()}>
            <Columns2 size={13} />
          </Btn>
          <Btn title="Add column after" onMouseDown={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns2 size={13} style={{ transform: 'scaleX(-1)' }} />
          </Btn>
          <Btn title="Delete column" onMouseDown={() => editor.chain().focus().deleteColumn().run()}>
            <Trash2 size={13} />
          </Btn>

          <Sep />

          <Btn title="Delete table" onMouseDown={() => editor.chain().focus().deleteTable().run()}>
            <Trash2 size={13} style={{ color: '#E05050' }} />
          </Btn>
        </div>
      )}
    </div>
  )
}
