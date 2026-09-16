import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Layers, Plus, X, ChevronLeft, ChevronRight,
  Shuffle, Pencil, Trash2, RotateCcw,
  Sparkles, Loader2, Upload, FileUp, AlertCircle,
  Check, ThumbsDown, ThumbsUp, Target,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import useStore from '../../app/store/useStore'
import { generateFlashcards } from '../../shared/lib/gemini'
import ConfirmModal from '../../shared/components/ConfirmModal'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

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

const readTextFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => resolve(ev.target.result)
    reader.readAsText(file)
  })

const extractNoteText = (html) => {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return div.textContent || div.innerText || ''
}

// ── Card form modal ────────────────────────────────────────────
function CardFormModal({ decks, initial, defaultDeckId, onSave, onClose }) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [deckId, setDeckId] = useState(
    initial != null ? (initial.deckId ?? null) : (defaultDeckId ?? null)
  )
  const valid = front.trim() && back.trim() && deckId !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={onClose}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ front: front.trim(), back: back.trim(), deckId }) }}
        className="flex flex-col gap-3 rounded-2xl shadow-xl p-5 w-full max-w-sm"
        style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--mochi-text)' }}>
            {initial ? 'Edit Card' : 'New Card'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--mochi-text-muted)' }}><X size={15} /></button>
        </div>

        {[['Front', front, setFront, 'Question or term…'], ['Back', back, setBack, 'Answer or definition…']].map(([label, val, setter, ph]) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>{label}</label>
            <textarea
              autoFocus={label === 'Front'}
              value={val}
              onChange={(e) => setter(e.target.value)}
              rows={3}
              placeholder={ph}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
            />
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>Deck</label>
          <select
            value={deckId ?? ''}
            onChange={(e) => setDeckId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: deckId !== null ? 'var(--mochi-text)' : 'var(--mochi-text-muted)' }}
          >
            {deckId === null && <option value="" disabled>Select a deck…</option>}
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}>
            Cancel
          </button>
          <button type="submit" disabled={!valid} className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{
              background: valid ? 'var(--mochi-lavender)' : 'var(--mochi-border)',
              color: valid ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)',
              border: `1.5px solid ${valid ? 'var(--mochi-lavender-mid)' : 'transparent'}`,
              cursor: valid ? 'pointer' : 'not-allowed',
            }}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

// ── AI generate panel ──────────────────────────────────────────
function AiGeneratePanel({
  notes, aiSourceTab, setAiSourceTab,
  aiNoteId, setAiNoteId,
  aiFile, setAiFile, aiFileLoading, aiFileRef, handleAiFile,
  aiCount, setAiCount,
  aiError, aiSuccess, aiLoading, handleAiGenerate,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 rounded-2xl" style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--mochi-text-muted)' }}>Source</p>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--mochi-border)' }}>
          {[['note', 'From Note'], ['file', 'Upload File']].map(([tab, lbl]) => (
            <button key={tab} onClick={() => setAiSourceTab(tab)}
              className="flex-1 py-1.5 text-xs font-semibold"
              style={aiSourceTab === tab
                ? { background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)' }
                : { background: 'transparent', color: 'var(--mochi-text-muted)' }}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {aiSourceTab === 'note' && (
        <select
          value={aiNoteId}
          onChange={(e) => setAiNoteId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)', color: aiNoteId ? 'var(--mochi-text)' : 'var(--mochi-text-muted)' }}
        >
          <option value="">Select a note…</option>
          {notes.map((n) => <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>)}
        </select>
      )}

      {aiSourceTab === 'file' && (
        aiFile ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}>
            <FileUp size={11} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
            <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--mochi-mint-dark)' }}>{aiFile.name}</span>
            <button onClick={() => setAiFile(null)} style={{ color: 'var(--mochi-mint-dark)' }}><X size={11} /></button>
          </div>
        ) : aiFileLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}>
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--mochi-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>Reading…</span>
          </div>
        ) : (
          <button onClick={() => aiFileRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Upload size={12} />Upload (.txt, .md, .csv, .pdf)
          </button>
        )
      )}
      <input ref={aiFileRef} type="file" accept=".txt,.md,.csv,.pdf,application/pdf" className="hidden" onChange={handleAiFile} />

      <div className="flex items-center gap-2">
        <span className="text-xs flex-1" style={{ color: 'var(--mochi-text-soft)' }}>Cards to generate</span>
        <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--mochi-border)' }}>
          <button onClick={() => setAiCount((v) => Math.max(1, v - 1))} className="px-2 py-1 text-xs font-bold"
            style={{ color: 'var(--mochi-text-muted)', background: 'var(--mochi-surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
          >−</button>
          <input type="number" min="1" value={aiCount}
            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setAiCount(v) }}
            className="w-10 text-center text-xs outline-none py-1"
            style={{ background: 'var(--mochi-cream)', color: 'var(--mochi-text)', border: 'none' }}
          />
          <button onClick={() => setAiCount((v) => v + 1)} className="px-2 py-1 text-xs font-bold"
            style={{ color: 'var(--mochi-text-muted)', background: 'var(--mochi-surface)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
          >+</button>
        </div>
      </div>

      {aiError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}>
          <AlertCircle size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'var(--mochi-pink-dark)' }}>{aiError}</p>
        </div>
      )}
      {aiSuccess > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}>
          <Layers size={13} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--mochi-mint-dark)' }}>{aiSuccess} flashcard{aiSuccess !== 1 ? 's' : ''} added!</p>
        </div>
      )}

      <button onClick={handleAiGenerate} disabled={aiLoading}
        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold"
        style={{
          background: aiLoading ? 'var(--mochi-border)' : 'var(--mochi-mint)',
          border: `1.5px solid ${aiLoading ? 'transparent' : 'var(--mochi-mint-mid)'}`,
          color: aiLoading ? 'var(--mochi-text-muted)' : 'var(--mochi-mint-dark)',
          cursor: aiLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {aiLoading ? <><Loader2 size={13} className="animate-spin" />Generating…</> : <><Sparkles size={13} />Generate Flashcards</>}
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function FlashcardsPage() {
  const {
    activeDeckId, decks,
    flashcards, loadFlashcards, createFlashcard, updateFlashcard, deleteFlashcard,
    notes, loadNotes,
  } = useStore()

  // Study state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffledCards, setShuffledCards] = useState(null)

  // Track progress mode
  const [trackMode, setTrackMode] = useState(false)
  const [results, setResults] = useState({})   // { [cardId]: 'correct' | 'incorrect' }
  const [completed, setCompleted] = useState(false)
  const [reviewCards, setReviewCards] = useState(null) // array of cards to review, or null

  // Card form
  const [showCardForm, setShowCardForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [confirmCardDelete, setConfirmCardDelete] = useState(null)

  // Right panel state
  const [aiExpanded, setAiExpanded] = useState(false)
  const [aiSourceTab, setAiSourceTab] = useState('note')
  const [aiNoteId, setAiNoteId] = useState('')
  const [aiFile, setAiFile] = useState(null)
  const [aiFileLoading, setAiFileLoading] = useState(false)
  const [aiCount, setAiCount] = useState(8)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuccess, setAiSuccess] = useState(0)
  const aiFileRef = useRef()

  useEffect(() => {
    loadFlashcards()
    loadNotes()
  }, [])

  // ── Derived cards ─────────────────────────────────────────
  const deckCards = useMemo(() => {
    if (activeDeckId === null) return []
    return flashcards.filter((c) => c.deckId === activeDeckId)
  }, [flashcards, activeDeckId])

  const displayCards = reviewCards ?? shuffledCards ?? deckCards

  useEffect(() => {
    setCurrentIndex(0)
    setFlipped(false)
    setShuffledCards(null)
    setTrackMode(false)
    setResults({})
    setCompleted(false)
    setReviewCards(null)
    setAiError('')
    setAiSuccess(0)
    setAiExpanded(false)
  }, [activeDeckId])

  const card = displayCards[currentIndex] ?? null
  const total = displayCards.length

  const deckLabel = decks.find((d) => d.id === activeDeckId)?.name || 'Deck'

  // ── Study handlers ────────────────────────────────────────
  const goNext = () => {
    const next = currentIndex + 1
    if (next >= total) {
      setCompleted(true)
    } else {
      setCurrentIndex(next)
      setFlipped(false)
    }
  }

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + total) % total)
    setFlipped(false)
  }

  const markCard = (verdict) => {
    setResults((prev) => ({ ...prev, [card.id]: verdict }))
    const next = currentIndex + 1
    if (next >= total) {
      setCompleted(true)
    } else {
      setCurrentIndex(next)
      setFlipped(false)
    }
  }

  const handleShuffle = () => {
    setShuffledCards(shuffledCards ? null : [...deckCards].sort(() => Math.random() - 0.5))
    setCurrentIndex(0); setFlipped(false); setCompleted(false); setResults({})
  }

  const handleRestart = () => {
    setCurrentIndex(0); setFlipped(false); setCompleted(false); setResults({})
    setReviewCards(null)
  }

  const handleReviewMissed = () => {
    const missed = displayCards.filter((c) => results[c.id] === 'incorrect')
    setReviewCards(missed)
    setCurrentIndex(0); setFlipped(false); setCompleted(false); setResults({})
  }

  // ── Keyboard controls (liveRef pattern) ──────────────────
  const liveRef = useRef({})
  liveRef.current = {
    flipped, setFlipped,
    completed, total,
    trackMode,
    goNext, goPrev, markCard,
  }

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const r = liveRef.current
      if (r.completed || r.total === 0) return

      if (e.key === ' ') {
        e.preventDefault()
        r.setFlipped((v) => !v)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (r.trackMode) r.markCard('correct')
        else r.goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (r.trackMode) r.markCard('incorrect')
        else r.goPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── AI handlers ───────────────────────────────────────────
  const handleAiFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAiFileLoading(true); setAiError('')
    try {
      const text = file.type === 'application/pdf' ? await extractPdfText(file) : await readTextFile(file)
      setAiFile({ name: file.name, text })
    } catch {
      setAiError(`Could not read "${file.name}".`)
    }
    setAiFileLoading(false)
  }

  const handleAiGenerate = async () => {
    let text = ''
    if (aiSourceTab === 'note') {
      const note = notes.find((n) => n.id === Number(aiNoteId))
      if (!note) { setAiError('Select a note first.'); return }
      text = extractNoteText(note.content)
    } else {
      if (!aiFile) { setAiError('Upload a file first.'); return }
      text = aiFile.text
    }
    if (!text.trim()) { setAiError('The selected source has no readable content.'); return }

    const targetDeckId = typeof activeDeckId === 'number' ? activeDeckId : null
    setAiLoading(true); setAiError(''); setAiSuccess(0)
    try {
      const cards = await generateFlashcards(text, aiCount)
      for (const c of cards) {
        await createFlashcard({
          front: c.front, back: c.back,
          deckId: targetDeckId,
          noteId: aiSourceTab === 'note' ? Number(aiNoteId) : null,
        })
      }
      setAiSuccess(cards.length)
      setTimeout(() => setAiSuccess(0), 4000)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleCardSave = async (data) => {
    if (editingCard) await updateFlashcard(editingCard.id, data)
    else await createFlashcard(data)
    setShowCardForm(false); setEditingCard(null)
  }

  const defaultDeckIdForForm = typeof activeDeckId === 'number' ? activeDeckId : null
  const canAiGenerate = typeof activeDeckId === 'number'

  // ── Score ─────────────────────────────────────────────────
  const correctCount = Object.values(results).filter((v) => v === 'correct').length
  const incorrectCount = Object.values(results).filter((v) => v === 'incorrect').length

  // ── No deck selected ──────────────────────────────────────
  if (activeDeckId === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8" style={{ background: 'var(--mochi-cream)' }}>
        <Layers size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
          {decks.length === 0 ? 'No decks yet' : 'Select a deck'}
        </p>
        <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
          {decks.length === 0
            ? 'Create a section and deck in the sidebar to get started'
            : 'Pick a deck from the sidebar to start studying'}
        </p>
      </div>
    )
  }

  // ── Empty deck ────────────────────────────────────────────
  if (activeDeckId !== null && total === 0) {
    return (
      <div className="h-full flex" style={{ background: 'var(--mochi-cream)' }}>
        {/* Left: empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Layers size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
          <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>{deckLabel} is empty</p>
          <p className="text-xs mb-5" style={{ color: 'var(--mochi-text-muted)' }}>Add cards in the panel →</p>
        </div>

        {/* Right panel */}
        <RightPanel
          decks={decks} deckCards={deckCards} displayCards={displayCards}
          currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} setFlipped={setFlipped}
          showCardForm={showCardForm} setShowCardForm={setShowCardForm}
          editingCard={editingCard} setEditingCard={setEditingCard}
          confirmCardDelete={confirmCardDelete} setConfirmCardDelete={setConfirmCardDelete}
          handleCardSave={handleCardSave} deleteFlashcard={deleteFlashcard}
          defaultDeckIdForForm={defaultDeckIdForForm}
          canAiGenerate={canAiGenerate} aiExpanded={aiExpanded} setAiExpanded={setAiExpanded}
          notes={notes} aiSourceTab={aiSourceTab} setAiSourceTab={setAiSourceTab}
          aiNoteId={aiNoteId} setAiNoteId={setAiNoteId}
          aiFile={aiFile} setAiFile={setAiFile} aiFileLoading={aiFileLoading}
          aiFileRef={aiFileRef} handleAiFile={handleAiFile}
          aiCount={aiCount} setAiCount={setAiCount}
          aiError={aiError} aiSuccess={aiSuccess} aiLoading={aiLoading} handleAiGenerate={handleAiGenerate}
        />
      </div>
    )
  }

  // ── Study: two-column layout ──────────────────────────────
  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--mochi-cream)' }}>

      {/* ── Left column: card study ── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-8 py-8 min-w-0">

        {/* Header */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--mochi-text)' }}>
              {reviewCards ? 'Review Missed' : deckLabel}
            </p>
            {!completed && (
              <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
                {currentIndex + 1} of {total}
                {trackMode && ` · ${correctCount} correct · ${incorrectCount} missed`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTrackMode((v) => !v); setResults({}); setCurrentIndex(0); setFlipped(false); setCompleted(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={trackMode
                ? { background: 'var(--mochi-sky)', color: 'var(--mochi-sky-dark)', border: '1.5px solid var(--mochi-sky-mid)' }
                : { color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
            >
              <Target size={12} />Track Progress
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={shuffledCards
                ? { background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)', border: '1.5px solid var(--mochi-peach-mid)' }
                : { color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
            >
              <Shuffle size={12} />{shuffledCards ? 'Shuffled' : 'Shuffle'}
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
            >
              <RotateCcw size={12} />Restart
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {!completed && (
          <div className="w-full max-w-2xl mb-6" style={{ height: '4px', background: 'var(--mochi-border)', borderRadius: '9999px' }}>
            <div style={{
              height: '100%', borderRadius: '9999px',
              background: trackMode ? 'var(--mochi-sky-mid)' : 'var(--mochi-lavender-mid)',
              width: `${((currentIndex + 1) / total) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {/* Completed screen */}
        {completed ? (
          <div className="w-full max-w-2xl flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: 'var(--mochi-mint)', border: '2px solid var(--mochi-mint-mid)' }}>
              <Check size={28} style={{ color: 'var(--mochi-mint-dark)' }} />
            </div>
            <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--mochi-text)' }}>
              Set Complete!
            </p>
            {trackMode && (
              <p className="text-sm mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
                {correctCount} correct · {incorrectCount} missed out of {total}
              </p>
            )}
            <p className="text-xs mb-8" style={{ color: 'var(--mochi-text-muted)' }}>
              {trackMode && incorrectCount > 0 ? 'Review the ones you missed, or restart the full set.' : 'Great job going through all the cards!'}
            </p>
            <div className="flex items-center gap-3">
              <button onClick={handleRestart}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ color: 'var(--mochi-text-soft)', border: '1.5px solid var(--mochi-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <RotateCcw size={14} />Restart
              </button>
              {trackMode && incorrectCount > 0 && (
                <button onClick={handleReviewMissed}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)', border: '1.5px solid var(--mochi-pink-mid)' }}
                >
                  Review {incorrectCount} missed
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Flip card */}
            <div
              style={{ width: '100%', maxWidth: '640px', height: '300px', perspective: '1000px', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setFlipped((v) => !v)}
            >
              <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.45s ease', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px', borderRadius: '20px', background: 'var(--mochi-surface)', border: '2px solid var(--mochi-lavender-mid)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-text-muted)' }}>Front</p>
                  <p style={{ color: 'var(--mochi-text)', fontSize: '19px', fontWeight: 600, lineHeight: 1.5 }}>{card.front}</p>
                  <p className="text-[10px] mt-5" style={{ color: 'var(--mochi-text-muted)' }}>
                    Click or press Space to reveal
                  </p>
                </div>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px', borderRadius: '20px', background: 'var(--mochi-lavender)', border: '2px solid var(--mochi-lavender-mid)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-lavender-dark)', opacity: 0.7 }}>Answer</p>
                  <p style={{ color: 'var(--mochi-lavender-dark)', fontSize: '17px', lineHeight: 1.6 }}>{card.back}</p>
                </div>
              </div>
            </div>

            {/* Navigation / Track controls */}
            {trackMode ? (
              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => markCard('incorrect')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)', border: '1.5px solid var(--mochi-pink-mid)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                >
                  <ThumbsDown size={15} />Missed  <kbd className="text-[10px] opacity-60 ml-1">←</kbd>
                </button>
                <button
                  onClick={() => markCard('correct')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.95)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                >
                  Got it  <kbd className="text-[10px] opacity-60 ml-1">→</kbd><ThumbsUp size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-6">
                {[['prev', <><ChevronLeft size={15} />Prev</>, goPrev], ['next', <>Next<ChevronRight size={15} /></>, goNext]].map(([key, children, fn]) => (
                  <button key={key} onClick={fn} disabled={total <= 1}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ color: 'var(--mochi-text-soft)', border: '1.5px solid var(--mochi-border)', opacity: total <= 1 ? 0.35 : 1, cursor: total <= 1 ? 'not-allowed' : 'pointer' }}
                    onMouseEnter={(e) => { if (total > 1) e.currentTarget.style.background = 'var(--mochi-surface)' }}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >{children}</button>
                ))}
              </div>
            )}

            {/* Keyboard hint */}
            <p className="text-[10px] mt-3" style={{ color: 'var(--mochi-text-muted)' }}>
              {trackMode ? '← missed · Space flip · → got it' : '← prev · Space flip · → next'}
            </p>
          </>
        )}
      </div>

      {/* ── Right panel ── */}
      <RightPanel
        decks={decks} deckCards={deckCards} displayCards={displayCards}
        currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} setFlipped={setFlipped}
        showCardForm={showCardForm} setShowCardForm={setShowCardForm}
        editingCard={editingCard} setEditingCard={setEditingCard}
        confirmCardDelete={confirmCardDelete} setConfirmCardDelete={setConfirmCardDelete}
        handleCardSave={handleCardSave} deleteFlashcard={deleteFlashcard}
        defaultDeckIdForForm={defaultDeckIdForForm}
        canAiGenerate={canAiGenerate} aiExpanded={aiExpanded} setAiExpanded={setAiExpanded}
        notes={notes} aiSourceTab={aiSourceTab} setAiSourceTab={setAiSourceTab}
        aiNoteId={aiNoteId} setAiNoteId={setAiNoteId}
        aiFile={aiFile} setAiFile={setAiFile} aiFileLoading={aiFileLoading}
        aiFileRef={aiFileRef} handleAiFile={handleAiFile}
        aiCount={aiCount} setAiCount={setAiCount}
        aiError={aiError} aiSuccess={aiSuccess} aiLoading={aiLoading} handleAiGenerate={handleAiGenerate}
      />
    </div>
  )
}

// ── Right panel: manage cards + AI generate ────────────────────
function RightPanel({
  decks, deckCards, displayCards, currentIndex, setCurrentIndex, setFlipped,
  showCardForm, setShowCardForm, editingCard, setEditingCard,
  confirmCardDelete, setConfirmCardDelete, handleCardSave, deleteFlashcard,
  defaultDeckIdForForm,
  canAiGenerate, aiExpanded, setAiExpanded,
  notes, aiSourceTab, setAiSourceTab,
  aiNoteId, setAiNoteId,
  aiFile, setAiFile, aiFileLoading, aiFileRef, handleAiFile,
  aiCount, setAiCount,
  aiError, aiSuccess, aiLoading, handleAiGenerate,
}) {
  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-y-auto"
      style={{
        width: '280px',
        borderLeft: '1.5px solid var(--mochi-border)',
        background: 'var(--mochi-surface)',
      }}
    >
      {/* Cards header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--mochi-border)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
          Cards ({deckCards.length})
        </p>
        <button
          onClick={() => { setShowCardForm(true); setEditingCard(null) }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }}
        >
          <Plus size={11} />Add
        </button>
      </div>

      {/* Card list */}
      <div className="flex flex-col gap-1 p-2 flex-1">
        {displayCards.map((c, i) => (
          <div
            key={c.id}
            onClick={() => { setCurrentIndex(i); setFlipped(false) }}
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
            style={{
              background: i === currentIndex ? 'var(--mochi-lavender)' : 'transparent',
              border: `1.5px solid ${i === currentIndex ? 'var(--mochi-lavender-mid)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => { if (i !== currentIndex) e.currentTarget.style.background = 'var(--mochi-cream)' }}
            onMouseLeave={(e) => { if (i !== currentIndex) e.currentTarget.style.background = 'transparent' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--mochi-text)' }}>{c.front}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>{c.back}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingCard(c); setShowCardForm(true) }}
                className="p-1 rounded-lg"
                style={{ color: i === currentIndex ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = i === currentIndex ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)')}
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmCardDelete({ id: c.id, front: c.front }) }}
                className="p-1 rounded-lg"
                style={{ color: i === currentIndex ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                onMouseLeave={(e) => (e.currentTarget.style.color = i === currentIndex ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)')}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}

        {deckCards.length === 0 && (
          <p className="text-xs px-2 py-3 text-center italic" style={{ color: 'var(--mochi-text-muted)' }}>
            No cards yet. Add one above.
          </p>
        )}
      </div>

      {/* AI generate section */}
      {canAiGenerate && (
        <div style={{ borderTop: '1px solid var(--mochi-border)' }}>
          <button
            onClick={() => setAiExpanded((v) => !v)}
            className="flex items-center gap-2 w-full px-4 py-3 text-xs font-bold"
            style={{ color: 'var(--mochi-text-muted)' }}
          >
            <Sparkles size={12} style={{ color: 'var(--mochi-mint-dark)' }} />
            Generate with AI
            <span style={{ fontSize: '9px', marginLeft: 'auto' }}>{aiExpanded ? '▼' : '▶'}</span>
          </button>

          {aiExpanded && (
            <div className="px-3 pb-3">
              <AiGeneratePanel
                notes={notes} aiSourceTab={aiSourceTab} setAiSourceTab={setAiSourceTab}
                aiNoteId={aiNoteId} setAiNoteId={setAiNoteId}
                aiFile={aiFile} setAiFile={setAiFile} aiFileLoading={aiFileLoading}
                aiFileRef={aiFileRef} handleAiFile={handleAiFile}
                aiCount={aiCount} setAiCount={setAiCount}
                aiError={aiError} aiSuccess={aiSuccess}
                aiLoading={aiLoading} handleAiGenerate={handleAiGenerate}
              />
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCardForm && (
        <CardFormModal
          decks={decks} initial={editingCard} defaultDeckId={defaultDeckIdForForm}
          onSave={handleCardSave}
          onClose={() => { setShowCardForm(false); setEditingCard(null) }}
        />
      )}
      {confirmCardDelete && (
        <ConfirmModal
          title="Delete card?"
          message={`"${confirmCardDelete.front}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteFlashcard(confirmCardDelete.id); setConfirmCardDelete(null) }}
          onCancel={() => setConfirmCardDelete(null)}
        />
      )}
    </div>
  )
}
