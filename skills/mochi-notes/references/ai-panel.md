# AI Panel Reference

Full breakdown of the `AIPanel.jsx` component — the collapsible right-sidebar panel
in the notes editor that handles all AI-powered features.

---

## Layout & Positioning

The AI panel lives in the right column of the notes editor, fixed at **288px wide**,
full height, with its own scroll. It sits to the right of the writing area:

```
┌──────────────────────────────────────┬────────────────┐
│  EditorToolbar (full width)          │                │
├──────────────────────────────────────┤                │
│                                      │  AIPanel       │
│  EditorContent (flex-1, scrollable)  │  (w-72)        │
│                                      │  scrollable    │
│                                      │                │
└──────────────────────────────────────┴────────────────┘
```

```jsx
// In EditorPane.jsx
<div className="flex-1 flex overflow-hidden">
  <div className="flex-1 overflow-y-auto px-8 py-5">
    <EditorContent editor={editor} className="min-h-full" />
  </div>
  <div
    className="w-72 flex-shrink-0 overflow-y-auto p-4"
    style={{ borderLeft: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
  >
    <AIPanel editor={editor} noteId={activeNoteId} />
  </div>
</div>
```

---

## State Machine

The panel has 3 views controlled by a `view` state variable:

```
'menu'        → Default. Shows source picker + mode selector + action buttons.
'flashcards'  → Shows FlashcardView after generation.
'quiz'        → Shows QuizView after generation.
```

Additionally, a separate `open` boolean controls the whole panel collapse.

```js
const [open, setOpen]           = useState(false)   // panel open/closed
const [view, setView]           = useState('menu')  // menu | flashcards | quiz
const [mode, setMode]           = useState('primer')
const [loading, setLoading]     = useState(false)
const [error, setError]         = useState('')
const [docText, setDocText]     = useState('')      // text from uploaded file
const [fileName, setFileName]   = useState('')      // uploaded file name
const [quizData, setQuizData]   = useState(null)
const [flashcardData, setFlashcardData] = useState(null)
```

---

## Source Resolution

AI features can use two sources of text:

```js
const getSourceText = () => {
  if (docText) return docText           // uploaded file takes priority
  if (editor)  return editor.getText()  // fall back to current note content
  return ''
}
```

Show which source is active in the UI — file badge if uploaded, or hint text
"Using your current note" if falling back to editor content.

---

## File Upload

Accepts `.txt`, `.md`, `.csv` text files. PDFs require `pdf-parse` (add in Sprint 2 polish).

```jsx
const fileRef = useRef()

const handleFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  setFileName(file.name)
  const reader = new FileReader()
  reader.onload = (ev) => setDocText(ev.target.result)
  reader.readAsText(file)
}

// Trigger: <input ref={fileRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFile} />
// Button calls: fileRef.current.click()
```

---

## Generation Mode Definitions

| Key | Label | Icon | Color | Description |
|-----|-------|------|-------|-------------|
| `primer` | Primer | `BookOpen` | Lavender | Overview of key concepts |
| `reviewer` | Reviewer | `Brain` | Mint | Exam-ready study guide |
| `general` | General notes | `FileText` | Peach | Full organized notes |

```js
const MODES = [
  { key: 'primer',   label: 'Primer',        desc: 'Overview of key concepts',   color: 'var(--mochi-lavender)',  border: 'var(--mochi-lavender-mid)',  text: 'var(--mochi-lavender-dark)', icon: BookOpen  },
  { key: 'reviewer', label: 'Reviewer',       desc: 'Exam-ready study guide',     color: 'var(--mochi-mint)',      border: 'var(--mochi-mint-mid)',      text: 'var(--mochi-mint-dark)',     icon: Brain     },
  { key: 'general',  label: 'General notes',  desc: 'Organised notes from doc',   color: 'var(--mochi-peach)',     border: 'var(--mochi-peach-mid)',     text: 'var(--mochi-peach-dark)',    icon: FileText  },
]
```

---

## Action Handlers

### Generate Notes
```js
const handleGenerateNotes = async () => {
  const text = getSourceText()
  if (!text.trim()) { setError('No content to generate from. Write a note or upload a file first.'); return }
  setLoading(true); setError('')
  try {
    const markdown = await generateNotes(text, mode)
    // Convert markdown to HTML and insert into editor
    const html = marked.parse(markdown)
    editor.commands.setContent(html)
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

### Generate Flashcards
```js
const handleGenerateFlashcards = async () => {
  const text = getSourceText()
  if (!text.trim()) { setError('No content to generate from.'); return }
  setLoading(true); setError('')
  try {
    const cards = await generateFlashcards(text, 8)
    // Save each card to Dexie
    for (const c of cards) {
      await createFlashcard(noteId, null, c.front, c.back)
    }
    setFlashcardData(cards)
    setView('flashcards')
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

### Generate Quiz
```js
const handleGenerateQuiz = async () => {
  const text = getSourceText()
  if (!text.trim()) { setError('No content to generate from.'); return }
  setLoading(true); setError('')
  try {
    const quiz = await generateQuiz(text, 5)
    setQuizData(quiz)
    setView('quiz')
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

---

## FlashcardView State

```js
const [idx, setIdx]         = useState(0)
const [flipped, setFlipped] = useState(false)

// Reset flip when changing cards
const goNext = () => { setIdx(i => i + 1); setFlipped(false) }
const goPrev = () => { setIdx(i => i - 1); setFlipped(false) }
```

Click anywhere on the card → `setFlipped(f => !f)`
Front face: lavender background
Back face: pink background

---

## QuizView State

```js
const [current, setCurrent] = useState(0)
const [selected, setSelected] = useState(null)  // index of user's pick, or null
const [score, setScore]       = useState(0)
const [done, setDone]         = useState(false)

const pick = (i) => {
  if (selected !== null) return   // already answered
  setSelected(i)
  if (i === quiz[current].answer) setScore(s => s + 1)
}

const next = () => {
  if (current + 1 >= quiz.length) { setDone(true); return }
  setCurrent(c => c + 1)
  setSelected(null)
}
```

Option button colors after answer:
- Correct answer → mint green
- User's wrong pick → pink
- Other options → neutral (unchanged)

---

## Error Display

```jsx
{error && (
  <div
    className="flex items-start gap-2 px-3 py-2 rounded-xl fade-in"
    style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}
  >
    <AlertCircle size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
    <p className="text-xs" style={{ color: 'var(--mochi-pink-dark)' }}>{error}</p>
  </div>
)}
```

Clear error on every new generation attempt (`setError('')` at the top of each handler).