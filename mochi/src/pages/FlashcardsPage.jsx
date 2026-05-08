import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Layers, Plus, X, ChevronLeft, ChevronRight,
  Shuffle, Pencil, Trash2, RotateCcw,
  Sparkles, Loader2, Upload, FileUp, AlertCircle,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import useStore from '../store'
import { generateFlashcards } from '../gemini'
import ConfirmModal from '../components/ConfirmModal'

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
  const valid = front.trim() && back.trim()

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
          <h2 className="text-sm font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
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
            style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
          >
            <option value="">General</option>
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
  const [showManage, setShowManage] = useState(false)

  // Card form
  const [showCardForm, setShowCardForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [confirmCardDelete, setConfirmCardDelete] = useState(null)

  // AI generation
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
    if (activeDeckId === null) return flashcards
    if (activeDeckId === 'unlinked') return flashcards.filter((c) => !c.deckId)
    return flashcards.filter((c) => c.deckId === activeDeckId)
  }, [flashcards, activeDeckId])

  const displayCards = shuffledCards ?? deckCards

  useEffect(() => {
    setCurrentIndex(0)
    setFlipped(false)
    setShuffledCards(null)
    setShowManage(false)
    setAiError('')
    setAiSuccess(0)
    setAiExpanded(false)
  }, [activeDeckId])

  const card = displayCards[currentIndex] ?? null
  const total = displayCards.length

  const deckLabel =
    activeDeckId === null ? 'All Cards'
    : activeDeckId === 'unlinked' ? 'General'
    : (decks.find((d) => d.id === activeDeckId)?.name || 'Deck')

  // ── Handlers ──────────────────────────────────────────────
  const goNext = () => { setCurrentIndex((i) => (i + 1) % total); setFlipped(false) }
  const goPrev = () => { setCurrentIndex((i) => (i - 1 + total) % total); setFlipped(false) }

  const handleShuffle = () => {
    setShuffledCards(shuffledCards ? null : [...deckCards].sort(() => Math.random() - 0.5))
    setCurrentIndex(0); setFlipped(false)
  }

  const handleCardSave = async (data) => {
    if (editingCard) await updateFlashcard(editingCard.id, data)
    else await createFlashcard(data)
    setShowCardForm(false); setEditingCard(null)
  }

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
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const defaultDeckIdForForm = typeof activeDeckId === 'number' ? activeDeckId : null
  const canAiGenerate = typeof activeDeckId === 'number'

  // ── Empty states ──────────────────────────────────────────
  if (activeDeckId === null && flashcards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ background: 'var(--mochi-cream)' }}>
        <Layers size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>No flashcards yet</p>
        <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
          Create a deck in the sidebar, then add cards
        </p>
      </div>
    )
  }

  if (activeDeckId !== null && total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8" style={{ background: 'var(--mochi-cream)' }}>
        <Layers size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
          {deckLabel} is empty
        </p>
        <p className="text-xs mb-5" style={{ color: 'var(--mochi-text-muted)' }}>
          Add cards manually or generate them with AI
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCardForm(true); setEditingCard(null) }}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }}
          >
            New Card
          </button>
          {canAiGenerate && (
            <button
              onClick={() => setAiExpanded(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }}
            >
              <Sparkles size={13} />Generate with AI
            </button>
          )}
        </div>

        {/* AI panel in empty state */}
        {aiExpanded && canAiGenerate && (
          <div className="w-full max-w-md mt-6 text-left">
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

        {showCardForm && (
          <CardFormModal decks={decks} defaultDeckId={defaultDeckIdForForm}
            onSave={handleCardSave}
            onClose={() => { setShowCardForm(false); setEditingCard(null) }}
          />
        )}
      </div>
    )
  }

  // ── Study area ────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto px-8 py-8" style={{ background: 'var(--mochi-cream)' }}>

      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-3">
        <div>
          <p className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
            {deckLabel}
          </p>
          <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>{currentIndex + 1} of {total}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowCardForm(true); setEditingCard(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }}
          >
            <Plus size={12} />New Card
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
            onClick={() => { setCurrentIndex(0); setFlipped(false); setShuffledCards(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
          >
            <RotateCcw size={12} />Restart
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6" style={{ height: '4px', background: 'var(--mochi-border)', borderRadius: '9999px' }}>
        <div style={{ height: '100%', borderRadius: '9999px', background: 'var(--mochi-lavender-mid)', width: `${((currentIndex + 1) / total) * 100}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Flip card */}
      <div
        style={{ width: '100%', maxWidth: '480px', height: '240px', perspective: '1000px', cursor: 'pointer', flexShrink: 0 }}
        onClick={() => setFlipped((v) => !v)}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.45s ease', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px', borderRadius: '20px', background: 'var(--mochi-surface)', border: '2px solid var(--mochi-lavender-mid)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-text-muted)' }}>Front</p>
            <p style={{ color: 'var(--mochi-text)', fontSize: '17px', fontWeight: 600, lineHeight: 1.5 }}>{card.front}</p>
            <p className="text-[10px] mt-5" style={{ color: 'var(--mochi-text-muted)' }}>Click to reveal answer</p>
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px', borderRadius: '20px', background: 'var(--mochi-lavender)', border: '2px solid var(--mochi-lavender-mid)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-lavender-dark)', opacity: 0.7 }}>Answer</p>
            <p style={{ color: 'var(--mochi-lavender-dark)', fontSize: '15px', lineHeight: 1.6 }}>{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
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

      {/* Manage cards */}
      <div className="w-full max-w-lg mt-8" style={{ borderTop: '1px solid var(--mochi-border)', paddingTop: '20px' }}>
        <button onClick={() => setShowManage((v) => !v)} className="flex items-center gap-2 text-xs font-bold mb-3" style={{ color: 'var(--mochi-text-muted)' }}>
          <span style={{ fontSize: '9px' }}>{showManage ? '▼' : '▶'}</span>
          Manage cards ({total})
        </button>
        {showManage && (
          <div className="flex flex-col gap-1.5 fade-in">
            {displayCards.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: i === currentIndex ? 'var(--mochi-lavender)' : 'var(--mochi-surface)', border: `1.5px solid ${i === currentIndex ? 'var(--mochi-lavender-mid)' : 'var(--mochi-border)'}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--mochi-text)' }}>{c.front}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>{c.back}</p>
                </div>
                <button onClick={() => { setEditingCard(c); setShowCardForm(true) }} className="p-1.5 rounded-lg" style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => setConfirmCardDelete({ id: c.id, front: c.front })} className="p-1.5 rounded-lg" style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI generate — only for specific named decks */}
      {canAiGenerate && (
        <div className="w-full max-w-lg mt-6" style={{ borderTop: '1px solid var(--mochi-border)', paddingTop: '20px' }}>
          <button
            onClick={() => setAiExpanded((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold mb-3"
            style={{ color: 'var(--mochi-text-muted)' }}
          >
            <Sparkles size={12} style={{ color: 'var(--mochi-mint-dark)' }} />
            Generate with AI
            <span style={{ fontSize: '9px', marginLeft: 'auto' }}>{aiExpanded ? '▼' : '▶'}</span>
          </button>

          {aiExpanded && (
            <AiGeneratePanel
              notes={notes} aiSourceTab={aiSourceTab} setAiSourceTab={setAiSourceTab}
              aiNoteId={aiNoteId} setAiNoteId={setAiNoteId}
              aiFile={aiFile} setAiFile={setAiFile} aiFileLoading={aiFileLoading}
              aiFileRef={aiFileRef} handleAiFile={handleAiFile}
              aiCount={aiCount} setAiCount={setAiCount}
              aiError={aiError} aiSuccess={aiSuccess}
              aiLoading={aiLoading} handleAiGenerate={handleAiGenerate}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {showCardForm && (
        <CardFormModal decks={decks} initial={editingCard} defaultDeckId={defaultDeckIdForForm}
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

// ── AI generate panel (shared between empty + study states) ────
function AiGeneratePanel({
  notes, aiSourceTab, setAiSourceTab,
  aiNoteId, setAiNoteId,
  aiFile, setAiFile, aiFileLoading, aiFileRef, handleAiFile,
  aiCount, setAiCount,
  aiError, aiSuccess, aiLoading, handleAiGenerate,
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl fade-in" style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}>
      {/* Source tabs */}
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

      {/* Note picker */}
      {aiSourceTab === 'note' && (
        <select
          value={aiNoteId}
          onChange={(e) => setAiNoteId(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: aiNoteId ? 'var(--mochi-text)' : 'var(--mochi-text-muted)' }}
        >
          <option value="">Select a note…</option>
          {notes.map((n) => <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>)}
        </select>
      )}

      {/* File upload */}
      {aiSourceTab === 'file' && (
        aiFile ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}>
            <FileUp size={11} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
            <span className="flex-1 text-xs font-semibold truncate" style={{ color: 'var(--mochi-mint-dark)' }}>{aiFile.name}</span>
            <button onClick={() => setAiFile(null)} style={{ color: 'var(--mochi-mint-dark)' }}><X size={11} /></button>
          </div>
        ) : aiFileLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}>
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--mochi-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>Reading…</span>
          </div>
        ) : (
          <button onClick={() => aiFileRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Upload size={12} />Upload (.txt, .md, .csv, .pdf)
          </button>
        )
      )}
      <input ref={aiFileRef} type="file" accept=".txt,.md,.csv,.pdf,application/pdf" className="hidden" onChange={handleAiFile} />

      {/* Count */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs flex-1" style={{ color: 'var(--mochi-text-soft)' }}>Count</span>
        {[4, 8, 12, 16].map((n) => (
          <button key={n} onClick={() => setAiCount(n)}
            className="px-2 py-0.5 rounded-lg text-xs font-semibold"
            style={aiCount === n
              ? { background: 'var(--mochi-mint)', color: 'var(--mochi-mint-dark)', border: '1.5px solid var(--mochi-mint-mid)' }
              : { color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
          >{n}</button>
        ))}
      </div>

      {/* Error / success */}
      {aiError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl fade-in" style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}>
          <AlertCircle size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs" style={{ color: 'var(--mochi-pink-dark)' }}>{aiError}</p>
        </div>
      )}
      {aiSuccess > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl fade-in" style={{ background: 'var(--mochi-mint)', border: '1.5px solid var(--mochi-mint-mid)' }}>
          <Layers size={13} style={{ color: 'var(--mochi-mint-dark)', flexShrink: 0 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--mochi-mint-dark)' }}>{aiSuccess} flashcard{aiSuccess !== 1 ? 's' : ''} added!</p>
        </div>
      )}

      {/* Generate button */}
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
