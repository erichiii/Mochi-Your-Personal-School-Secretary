# Tiptap Configuration Reference

Full setup code for the Mochi notes editor. Read this when initializing Tiptap,
adding extensions, or debugging editor behaviour.

---

## Full Extension Config

```jsx
// src/components/notes/EditorPane.jsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'

const editor = useEditor({
  extensions: [
    // ⚠️ CRITICAL: disable codeBlock in StarterKit — we use the standalone extension
    StarterKit.configure({ codeBlock: false }),

    UnderlineExt,

    Placeholder.configure({
      placeholder: 'Start writing your note... ✍️',
    }),

    // Standalone CodeBlock (needed for syntax class support in future)
    CodeBlock,

    // Images — allowBase64 lets users paste/upload images stored as data URLs
    Image.configure({
      inline: false,
      allowBase64: true,
    }),

    // Task list (checklist) — nested: true allows sub-tasks
    TaskList,
    TaskItem.configure({ nested: true }),

    // Tables — resizable: true enables drag-to-resize columns
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,

    // Text highlight (yellow/peach marker)
    Highlight,
  ],

  content: '',   // loaded from Dexie on activeNoteId change

  onUpdate: ({ editor }) => {
    // Debounced auto-save — see auto-save section below
  },
})
```

---

## Auto-Save Pattern

```jsx
import { useRef, useEffect } from 'react'

const saveTimer = useRef(null)

// In useEditor onUpdate:
onUpdate: ({ editor }) => {
  if (!activeNoteId) return
  clearTimeout(saveTimer.current)
  saveTimer.current = setTimeout(() => {
    updateNote(activeNoteId, { content: editor.getHTML() })
  }, 600)  // 600ms debounce — fast enough to feel instant, slow enough to batch
},

// Load note when activeNoteId changes:
useEffect(() => {
  if (!activeNote || !editor) return
  const current = editor.getHTML()
  // Only update if content actually differs — prevents cursor jumping
  if (current !== activeNote.content) {
    editor.commands.setContent(activeNote.content || '')
  }
}, [activeNoteId])   // ← depend on ID, not the note object

// Cleanup timer on unmount:
useEffect(() => {
  return () => clearTimeout(saveTimer.current)
}, [])
```

---

## Toolbar Button Commands

Every formatting button maps to one of these editor chain calls:

```js
// Text formatting
editor.chain().focus().toggleBold().run()
editor.chain().focus().toggleItalic().run()
editor.chain().focus().toggleUnderline().run()
editor.chain().focus().toggleStrike().run()
editor.chain().focus().toggleHighlight().run()
editor.chain().focus().toggleCode().run()          // inline code

// Headings
editor.chain().focus().toggleHeading({ level: 1 }).run()
editor.chain().focus().toggleHeading({ level: 2 }).run()
editor.chain().focus().toggleHeading({ level: 3 }).run()

// Lists
editor.chain().focus().toggleBulletList().run()
editor.chain().focus().toggleOrderedList().run()
editor.chain().focus().toggleTaskList().run()       // checklist

// Blocks
editor.chain().focus().toggleBlockquote().run()
editor.chain().focus().toggleCodeBlock().run()
editor.chain().focus().setHorizontalRule().run()    // divider

// Tables
editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

// History
editor.chain().focus().undo().run()
editor.chain().focus().redo().run()

// Check if active (for toolbar highlight)
editor.isActive('bold')
editor.isActive('heading', { level: 1 })
editor.isActive('taskList')

// Check if command is available (for disabling undo/redo)
editor.can().undo()
editor.can().redo()
```

---

## Image Upload (from disk)

```js
// Triggered by toolbar Image button
const addImageFromDisk = () => {
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
    reader.readAsDataURL(file)   // stores as base64 — saved inside Tiptap HTML content
  }
  input.click()
}
```

Image is embedded as a base64 data URL inside the HTML string saved to Dexie.
This means no separate file storage is needed for note images.
Warn users to keep images reasonable in size (< 2MB per image) to avoid large DB entries.

---

## Table Controls

When cursor is inside a table, expose these extra toolbar buttons:

```js
// Add/remove rows and columns
editor.chain().focus().addRowAfter().run()
editor.chain().focus().addRowBefore().run()
editor.chain().focus().deleteRow().run()
editor.chain().focus().addColumnAfter().run()
editor.chain().focus().addColumnBefore().run()
editor.chain().focus().deleteColumn().run()
editor.chain().focus().deleteTable().run()

// Check if cursor is in a table
editor.isActive('table')   // show/hide table controls conditionally
```

---

## Inserting AI Content

When Gemini returns a Markdown string, convert and insert it into the editor:

```js
// Simple approach: replace entire content
editor.commands.setContent(`<p>${markdownString}</p>`)

// Better approach: convert markdown to HTML first, then set content
// Use a lightweight parser — the marked package works well
import { marked } from 'marked'   // npm install marked

const html = marked.parse(markdownString)
editor.commands.setContent(html)

// Insert at cursor position (instead of replacing):
editor.chain().focus().insertContent(html).run()
```

For Sprint 2, use the "replace entire content" approach first (simpler).
The "insert at cursor" approach is better UX but can be added in the polish sprint.

---

## Extracting Plain Text (for search + AI)

```js
// For full-text search — strip HTML tags
const getPlainText = (htmlString) =>
  htmlString.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// From the live editor instance
const plainText = editor.getText()   // Tiptap's built-in plain text extractor

// For Gemini prompts — use getText() for current note, getPlainText() for stored HTML
```

---

## Common Gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| CodeBlock not working | StarterKit includes its own | Use `StarterKit.configure({ codeBlock: false })` |
| Cursor jumps to top on save | `setContent()` called on every store update | Only call `setContent()` when `activeNoteId` changes, not on every note update |
| Images not persisting | Image src not base64 | Ensure `allowBase64: true` in Image config |
| Task checkboxes not toggling | TaskItem not imported | Import and add `TaskItem` extension separately |
| Table not rendering borders | Missing CSS | Add table styles in `index.css` under `.tiptap table` |
| Placeholder not showing | Wrong CSS selector | Use `.tiptap .is-editor-empty:first-child::before` |