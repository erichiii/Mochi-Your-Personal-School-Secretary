---
name: mochi-notes
description: >
  Complete build guide for Mochi's Notes section — the priority feature (Sprint 1-2).
  Read this skill when building anything related to notes: the Tiptap editor setup,
  note CRUD, subject/category sidebar, full-text search, the AI panel (Primer/Reviewer/
  General modes), flashcard generation and flip UI, quiz generation, or the notes list
  panel. Trigger on any mention of "notes", "editor", "Tiptap", "flashcards", "quiz",
  "subjects", "note search", or "AI note generation".
---

# Mochi Notes Section

**Priority: Sprint 1-2 (Days 1-14)**
This is the first feature to build. The goal is a fully usable notes app by Day 14.

## Architecture

```
src/
├── components/notes/
│   ├── Sidebar.jsx          ← subject list + nav
│   ├── NotesList.jsx        ← list of note cards
│   ├── EditorPane.jsx       ← main editor area
│   ├── EditorToolbar.jsx    ← formatting toolbar
│   ├── AIPanel.jsx          ← AI generation panel (collapsible)
│   ├── FlashcardView.jsx    ← flashcard flip UI
│   └── QuizView.jsx         ← MCQ quiz UI
├── pages/
│   └── NotesPage.jsx        ← composes the 3-column layout
```

## Sprint 1 — Editor (Days 1-7)

### Day 1-2: Foundation
Read `mochi-setup/SKILL.md` and `mochi-db/SKILL.md` first.
Set up Dexie tables `subjects` and `notes`. Set up Zustand notes store.
Build the 3-column app shell.

### Day 3-4: Tiptap Setup

```jsx
// Required Tiptap extensions for Mochi
import StarterKit from '@tiptap/starter-kit'              // headings, bold, italic, code, etc.
import UnderlineExt from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlock from '@tiptap/extension-code-block'
import Image from '@tiptap/extension-image'               // allowBase64: true
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'        // nested: true
import Table from '@tiptap/extension-table'               // resizable: true
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'
```

**Important:** Use `StarterKit.configure({ codeBlock: false })` to avoid conflict with the
standalone CodeBlock extension.

### Day 5: Auto-save to Dexie

```jsx
// In useEditor onUpdate callback
onUpdate: ({ editor }) => {
  clearTimeout(saveTimer.current)
  saveTimer.current = setTimeout(() => {
    updateNote(activeNoteId, { content: editor.getHTML() })
  }, 600)  // 600ms debounce
}
```

Load note content when activeNoteId changes:
```jsx
useEffect(() => {
  if (activeNote && editor) {
    editor.commands.setContent(activeNote.content || '')
  }
}, [activeNoteId])
```

### Day 6: Subjects sidebar
Color picker for subjects: 6 pastel options (pink, lavender, mint, peach, sky, yellow)
Inline rename on double-click. Delete cascades to notes (handled in store).

### Day 7: Search
Full-text search filters both title and content (strip HTML tags for content search):
```js
const q = searchQuery.toLowerCase()
filtered = notes.filter(n =>
  n.title.toLowerCase().includes(q) ||
  n.content?.replace(/<[^>]+>/g, ' ').toLowerCase().includes(q)
)
```

## Sprint 2 — AI Features (Days 8-14)

Read `mochi-ai/SKILL.md` before starting this sprint.

### Day 8-10: Note generation
Three modes: **Primer** (overview), **Reviewer** (exam guide), **General** (organized notes).
Source: uploaded .txt/.md file OR current note content (fallback).
Output: insert Gemini markdown into the Tiptap editor.

The AI Panel lives in the right sidebar of the editor (fixed 288px width).
It is collapsible. When collapsed, it shows only the "Let Mochi help ✨" header button.

### Day 11-12: Flashcards
Manual create: front/back text inputs, save to Dexie.
AI generate: call `generateFlashcards(text, 8)`, bulk save to `flashcards` table.
Flip UI: click card to toggle front/back. Prev/Next navigation.

### Day 13: Quiz
AI generate: call `generateQuiz(text, 5)`.
MCQ UI: show question, 4 options as buttons.
- Before answering: all buttons neutral
- After answering: correct → mint green, wrong pick → pink, others neutral
Score screen on completion.

### Day 14: QA pass
Test all editor features with real content.
Test AI generation with a real document.
Add loading skeletons and error states to AI panel.
Milestone: notes section complete.

## Key UX Details

- Note title is a plain `<input>` above the editor (not inside Tiptap)
- Subject picker is a small dropdown in the note header
- Toolbar uses icon-only buttons (no labels) — tooltips on hover
- The editor click area should be generous — click anywhere in the content area to focus
- Timestamps: show "updated X ago" using `date-fns formatDistanceToNow`

## Further Reading

- `references/tiptap-config.md` — full Tiptap extension config code
- `references/ai-panel.md` — AI panel component breakdown
- `mochi-ai/SKILL.md` — Gemini integration patterns
- `mochi-db/SKILL.md` — notes schema and store actions
- `mochi-ui/SKILL.md` — lavender color tokens for notes section