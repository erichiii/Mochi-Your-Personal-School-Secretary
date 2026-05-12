import { useEffect, useRef, useState } from 'react'
import {
  Sparkles, BookOpen, Brain, FileText, Upload, X,
  AlertCircle, Loader2, FileUp, Layers,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { marked } from 'marked'
import { generateNotes, generateFlashcards } from '../../gemini'
import useStore from '../../store'

marked.use({ gfm: true, breaks: false })

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

const MODES = [
  {
    key: 'primer',
    label: 'Primer',
    desc: 'Overview of key concepts',
    bg: 'var(--mochi-lavender)',
    border: 'var(--mochi-lavender-mid)',
    text: 'var(--mochi-lavender-dark)',
    Icon: BookOpen,
  },
  {
    key: 'reviewer',
    label: 'Reviewer',
    desc: 'Exam-ready study guide',
    bg: 'var(--mochi-mint)',
    border: 'var(--mochi-mint-mid)',
    text: 'var(--mochi-mint-dark)',
    Icon: Brain,
  },
  {
    key: 'general',
    label: 'General notes',
    desc: 'Organised notes from doc',
    bg: 'var(--mochi-peach)',
    border: 'var(--mochi-peach-mid)',
    text: 'var(--mochi-peach-dark)',
    Icon: FileText,
  },
]

const extractPdfText = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return pages.join('\n\n')
}

export default function AIPanel({ editor, noteId, onClose }) {
  const { createFlashcard, notes, decks, loadDecks } = useStore()

  const [mode, setMode] = useState('primer')
  const [customInstructions, setCustomInstructions] = useState('')
  const [insertMode, setInsertMode] = useState('replace') // 'replace' | 'append'
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([]) // [{ name, text }]
  const [fcCount, setFcCount] = useState(8)
  const [fcDeckId, setFcDeckId] = useState(null) // null = General
  const [fcLoading, setFcLoading] = useState(false)
  const [fcSuccess, setFcSuccess] = useState(0) // number of cards generated
  const fileRef = useRef()

  useEffect(() => { loadDecks() }, [])

  const getSourceText = () => {
    if (uploadedFiles.length > 0) return uploadedFiles.map((f) => f.text).join('\n\n---\n\n')
    if (editor) return editor.getText()
    return ''
  }

  const readTextFile = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.readAsText(file)
    })

  const handleFile = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''
    setError('')
    setPdfLoading(true)

    const results = []
    for (const file of files) {
      try {
        const text = file.type === 'application/pdf'
          ? await extractPdfText(file)
          : await readTextFile(file)
        results.push({ name: file.name, text })
      } catch {
        setError(`Could not read "${file.name}". PDFs must be text-based, not scanned images.`)
      }
    }

    setUploadedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...results.filter((r) => !names.has(r.name))]
    })
    setPdfLoading(false)
  }

  const removeFile = (name) => setUploadedFiles((prev) => prev.filter((f) => f.name !== name))
  const clearFiles = () => setUploadedFiles([])

  const handleGenerateNotes = async () => {
    const text = getSourceText()
    if (!text.trim()) {
      setError('No content to generate from. Write a note or upload a file first.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const markdown = await generateNotes(text, mode, customInstructions)
      const html = marked.parse(markdown)
      const noteIsEmpty = !editor.getText().trim()
      if (insertMode === 'replace' || noteIsEmpty) {
        editor.commands.setContent(html)
      } else {
        editor.commands.focus('end')
        editor.commands.insertContent(html)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    const text = getSourceText()
    if (!text.trim()) {
      setError('No content to generate from. Write a note or upload a file first.')
      return
    }
    setFcLoading(true)
    setError('')
    setFcSuccess(0)
    try {
      const cards = await generateFlashcards(text, fcCount, customInstructions)
      const activeNote = notes.find((n) => n.id === noteId)
      for (const card of cards) {
        await createFlashcard({
          front: card.front,
          back: card.back,
          deckId: fcDeckId,
          noteId: noteId ?? null,
          subjectId: activeNote?.subjectId ?? null,
        })
      }
      setFcSuccess(cards.length)
      setTimeout(() => setFcSuccess(0), 4000)
    } catch (e) {
      setError(e.message)
    } finally {
      setFcLoading(false)
    }
  }

  const activeMode = MODES.find((m) => m.key === mode)

  return (
    <div
      className="flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        width: '272px',
        borderLeft: '1.5px solid var(--mochi-border)',
        background: 'var(--mochi-surface)',
      }}
    >
      <div className="flex flex-col gap-4 px-4 py-4 flex-1">

        {/* Source indicator */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>
            Source
          </p>

          {/* Uploaded file list */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-col gap-1 mb-2">
              {uploadedFiles.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                  style={{ background: 'var(--mochi-lavender)', border: '1.5px solid var(--mochi-lavender-mid)' }}
                >
                  <FileUp size={11} style={{ color: 'var(--mochi-lavender-dark)', flexShrink: 0 }} />
                  <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--mochi-lavender-dark)' }}>
                    {f.name}
                  </span>
                  <button onClick={() => removeFile(f.name)} style={{ color: 'var(--mochi-lavender-dark)', flexShrink: 0 }} title="Remove">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Loading / fallback */}
          {pdfLoading ? (
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
              style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
              <span className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>Reading files…</span>
            </div>
          ) : uploadedFiles.length === 0 && (
            <p className="text-xs italic" style={{ color: 'var(--mochi-text-muted)' }}>
              Using your current note
            </p>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={pdfLoading}
            className="mt-2 flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              color: 'var(--mochi-text-muted)',
              border: '1.5px dashed var(--mochi-border)',
              opacity: pdfLoading ? 0.5 : 1,
              cursor: pdfLoading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => { if (!pdfLoading) e.currentTarget.style.background = 'var(--mochi-cream)' }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Upload size={12} />
            Upload files (.txt, .md, .csv, .pdf)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--mochi-border)' }} />

        {/* Mode selector */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>
            Mode
          </p>
          <div className="flex flex-col gap-1.5">
            {MODES.map((m) => {
              const active = mode === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left"
                  style={
                    active
                      ? { background: m.bg, border: `1.5px solid ${m.border}`, color: m.text }
                      : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
                  }
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--mochi-cream)' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <m.Icon size={14} style={{ flexShrink: 0 }} />
                  <div>
                    <div>{m.label}</div>
                    <div className="text-[10px] font-normal opacity-70">{m.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--mochi-border)' }} />

        {/* Custom instructions */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>
            Custom instructions
          </p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Focus on formulas only. Use Filipino. Keep it under 300 words."
            rows={3}
            className="w-full px-2.5 py-2 rounded-xl text-xs outline-none resize-none"
            style={{
              background: 'var(--mochi-cream)',
              border: '1.5px solid var(--mochi-border)',
              color: 'var(--mochi-text)',
              lineHeight: '1.5',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--mochi-lavender-mid)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--mochi-border)')}
          />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--mochi-border)' }} />

        {/* Insert mode toggle */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>
            Insert as
          </p>
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: '1.5px solid var(--mochi-border)' }}
          >
            {[{ key: 'replace', label: 'Replace' }, { key: 'append', label: 'Append' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setInsertMode(key)}
                className="flex-1 py-1.5 text-xs font-semibold transition-all"
                style={
                  insertMode === key
                    ? { background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)' }
                    : { background: 'transparent', color: 'var(--mochi-text-muted)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--mochi-text-muted)' }}>
            {insertMode === 'replace'
              ? 'Generated content will replace the current note.'
              : 'Generated content will be added at the end.'}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--mochi-border)' }} />

        {/* Success */}
        {success && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl fade-in"
            style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}
          >
            <Sparkles size={13} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--mochi-mint-dark)' }}>Done! Notes inserted.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 px-3 py-2 rounded-xl fade-in"
            style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}
          >
            <AlertCircle size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: 'var(--mochi-pink-dark)' }}>{error}</p>
          </div>
        )}

        {/* Generate Notes button */}
        <button
          onClick={handleGenerateNotes}
          disabled={loading || pdfLoading}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: (loading || pdfLoading) ? 'var(--mochi-border)' : activeMode.bg,
            border: `1.5px solid ${(loading || pdfLoading) ? 'transparent' : activeMode.border}`,
            color: (loading || pdfLoading) ? 'var(--mochi-text-muted)' : activeMode.text,
            cursor: (loading || pdfLoading) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Generate {activeMode.label}
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--mochi-border)' }} />

        {/* Generate Flashcards */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>
            Flashcards
          </p>

          {/* Deck picker */}
          <div className="flex flex-col gap-1 mb-2">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>Save to deck</label>
            <select
              value={fcDeckId ?? ''}
              onChange={(e) => setFcDeckId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
            >
              <option value="">General</option>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Count selector */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs flex-1" style={{ color: 'var(--mochi-text-soft)' }}>Cards</span>
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--mochi-border)' }}>
              <button
                onClick={() => setFcCount((v) => Math.max(1, v - 1))}
                className="px-2 py-1 text-xs font-bold"
                style={{ color: 'var(--mochi-text-muted)', background: 'var(--mochi-surface)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
              >−</button>
              <input
                type="number"
                min="1"
                value={fcCount}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setFcCount(v) }}
                className="w-10 text-center text-xs outline-none py-1"
                style={{ background: 'var(--mochi-cream)', color: 'var(--mochi-text)', border: 'none' }}
              />
              <button
                onClick={() => setFcCount((v) => v + 1)}
                className="px-2 py-1 text-xs font-bold"
                style={{ color: 'var(--mochi-text-muted)', background: 'var(--mochi-surface)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
              >+</button>
            </div>
          </div>

          {/* Flashcard success */}
          {fcSuccess > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl fade-in mb-2"
              style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}
            >
              <Layers size={13} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--mochi-mint-dark)' }}>
                {fcSuccess} flashcard{fcSuccess !== 1 ? 's' : ''} added!
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateFlashcards}
            disabled={fcLoading || pdfLoading}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: (fcLoading || pdfLoading) ? 'var(--mochi-border)' : 'var(--mochi-mint)',
              border: `1.5px solid ${(fcLoading || pdfLoading) ? 'transparent' : 'var(--mochi-mint-mid)'}`,
              color: (fcLoading || pdfLoading) ? 'var(--mochi-text-muted)' : 'var(--mochi-mint-dark)',
              cursor: (fcLoading || pdfLoading) ? 'not-allowed' : 'pointer',
            }}
          >
            {fcLoading ? (
              <><Loader2 size={13} className="animate-spin" />Generating…</>
            ) : (
              <><Sparkles size={13} />Generate Flashcards</>
            )}
          </button>
        </div>

        {/* Coming soon: Quiz */}
        <div
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
            Coming soon
          </p>
          <div
            className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', opacity: 0.5 }}
          >
            <Sparkles size={11} />
            Generate Quiz
          </div>
        </div>

      </div>
    </div>
  )
}
