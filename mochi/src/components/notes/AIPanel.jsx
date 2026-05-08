import { useRef, useState } from 'react'
import {
  Sparkles, BookOpen, Brain, FileText, Upload, X,
  AlertCircle, Loader2, FileUp,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { marked } from 'marked'
import { generateNotes } from '../../gemini'

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
  const [mode, setMode] = useState('primer')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState('')
  const [docText, setDocText] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  const getSourceText = () => {
    if (docText) return docText
    if (editor) return editor.getText()
    return ''
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileName(file.name)
    setError('')

    if (file.type === 'application/pdf') {
      setPdfLoading(true)
      try {
        const text = await extractPdfText(file)
        setDocText(text)
      } catch {
        setError('Could not read PDF. Try a text-based PDF (not scanned image).')
        setFileName('')
      } finally {
        setPdfLoading(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => setDocText(ev.target.result)
      reader.readAsText(file)
    }
  }

  const clearFile = () => { setDocText(''); setFileName('') }

  const handleGenerateNotes = async () => {
    const text = getSourceText()
    if (!text.trim()) {
      setError('No content to generate from. Write a note or upload a file first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const markdown = await generateNotes(text, mode)
      const html = marked.parse(markdown)
      editor.commands.setContent(html)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
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

          {pdfLoading ? (
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
              style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
            >
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
              <span className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>Reading PDF…</span>
            </div>
          ) : fileName ? (
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
              style={{ background: 'var(--mochi-lavender)', border: '1.5px solid var(--mochi-lavender-mid)' }}
            >
              <FileUp size={12} style={{ color: 'var(--mochi-lavender-dark)', flexShrink: 0 }} />
              <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--mochi-lavender-dark)' }}>
                {fileName}
              </span>
              <button onClick={clearFile} style={{ color: 'var(--mochi-lavender-dark)', flexShrink: 0 }} title="Remove file">
                <X size={11} />
              </button>
            </div>
          ) : (
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
            Upload file (.txt, .md, .csv, .pdf)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,application/pdf"
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

        {/* Coming in next tasks */}
        <div
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
            Coming soon
          </p>
          {['Generate Flashcards', 'Generate Quiz'].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 text-xs font-semibold"
              style={{ color: 'var(--mochi-text-muted)', opacity: 0.5 }}
            >
              <Sparkles size={11} />
              {label}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
