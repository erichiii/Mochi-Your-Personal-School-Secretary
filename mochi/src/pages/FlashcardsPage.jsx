import { useEffect, useState, useMemo } from 'react'
import {
  Layers, Plus, X, ChevronLeft, ChevronRight,
  Shuffle, Pencil, Trash2, RotateCcw,
} from 'lucide-react'
import useStore from '../store'
import ConfirmModal from '../components/ConfirmModal'

function CardFormModal({ notes, initial, defaultNoteId, onSave, onClose }) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [noteId, setNoteId] = useState(
    initial != null ? (initial.noteId ?? null) : (defaultNoteId ?? null)
  )

  const valid = front.trim() && back.trim()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSave({ front: front.trim(), back: back.trim(), noteId })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl shadow-xl p-5 w-full max-w-sm"
        style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
            {initial ? 'Edit Card' : 'New Card'}
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--mochi-text-muted)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
            Front
          </label>
          <textarea
            autoFocus
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={3}
            placeholder="Question or term…"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
            Back
          </label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={3}
            placeholder="Answer or definition…"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
            Deck
          </label>
          <select
            value={noteId ?? ''}
            onChange={(e) => setNoteId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)', color: 'var(--mochi-text)' }}
          >
            <option value="">General</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{
              background: valid ? 'var(--mochi-lavender)' : 'var(--mochi-border)',
              color: valid ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)',
              border: `1.5px solid ${valid ? 'var(--mochi-lavender-mid)' : 'transparent'}`,
              cursor: valid ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

export default function FlashcardsPage() {
  const { flashcards, loadFlashcards, createFlashcard, updateFlashcard, deleteFlashcard, notes, loadNotes } = useStore()

  const [deckFilter, setDeckFilter] = useState(null) // null=all | 'unlinked' | noteId (number)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [shuffledCards, setShuffledCards] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, front }
  const [showManage, setShowManage] = useState(false)

  useEffect(() => {
    loadFlashcards()
    loadNotes()
  }, [])

  const deckCards = useMemo(() => {
    if (deckFilter === null) return flashcards
    if (deckFilter === 'unlinked') return flashcards.filter((c) => !c.noteId)
    return flashcards.filter((c) => c.noteId === deckFilter)
  }, [flashcards, deckFilter])

  const displayCards = shuffledCards ?? deckCards

  // Reset position when deck or card count changes
  useEffect(() => {
    setCurrentIndex(0)
    setFlipped(false)
    setShuffledCards(null)
  }, [deckFilter, flashcards.length])

  const decks = useMemo(() => {
    const result = [{ key: null, label: 'All Cards', count: flashcards.length }]
    for (const note of notes) {
      const count = flashcards.filter((c) => c.noteId === note.id).length
      if (count > 0) result.push({ key: note.id, label: note.title || 'Untitled', count })
    }
    const unlinked = flashcards.filter((c) => !c.noteId).length
    if (unlinked > 0) result.push({ key: 'unlinked', label: 'General', count: unlinked })
    return result
  }, [flashcards, notes])

  const card = displayCards[currentIndex] ?? null
  const total = displayCards.length

  const goNext = () => { setCurrentIndex((i) => (i + 1) % total); setFlipped(false) }
  const goPrev = () => { setCurrentIndex((i) => (i - 1 + total) % total); setFlipped(false) }

  const handleShuffle = () => {
    if (shuffledCards) {
      setShuffledCards(null)
    } else {
      setShuffledCards([...deckCards].sort(() => Math.random() - 0.5))
    }
    setCurrentIndex(0)
    setFlipped(false)
  }

  const handleSave = async (data) => {
    if (editingCard) {
      await updateFlashcard(editingCard.id, data)
    } else {
      await createFlashcard(data)
    }
    setShowForm(false)
    setEditingCard(null)
  }

  const handleEdit = (c) => { setEditingCard(c); setShowForm(true) }

  const handleDeleteConfirmed = async () => {
    await deleteFlashcard(confirmDelete.id)
    setConfirmDelete(null)
  }

  const deckLabel =
    deckFilter === null ? 'All Cards'
    : deckFilter === 'unlinked' ? 'General'
    : (notes.find((n) => n.id === deckFilter)?.title || 'Untitled')

  const defaultNoteIdForForm = deckFilter !== null && deckFilter !== 'unlinked' ? deckFilter : null

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Deck list sidebar ───────────────────────── */}
      <aside
        className="flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ width: '220px', borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
      >
        <div className="px-4 pt-5 pb-2">
          <p className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
            Flashcards
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>
            {flashcards.length} card{flashcards.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={() => { setShowForm(true); setEditingCard(null) }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }}
          >
            <Plus size={13} />
            New Card
          </button>
        </div>

        <div className="h-px mx-3" style={{ background: 'var(--mochi-border)' }} />

        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {decks.map(({ key, label, count }) => {
            const active = deckFilter === key
            return (
              <button
                key={String(key)}
                onClick={() => setDeckFilter(key)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left"
                style={
                  active
                    ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
                    : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
                }
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--mochi-cream)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="truncate">{label}</span>
                <span
                  className="ml-2 flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                    color: active ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Study area ──────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center overflow-y-auto px-8 py-8" style={{ background: 'var(--mochi-cream)' }}>
        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Layers size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
              No cards in this deck
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--mochi-text-muted)' }}>
              Add cards manually or generate them with AI in a note
            </p>
            <button
              onClick={() => { setShowForm(true); setEditingCard(null) }}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)', border: '1.5px solid var(--mochi-lavender-mid)' }}
            >
              New Card
            </button>
          </div>
        ) : (
          <>
            {/* Deck header */}
            <div className="w-full max-w-lg flex items-center justify-between mb-5">
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
                  {deckLabel}
                </p>
                <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
                  {currentIndex + 1} of {total}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={
                    shuffledCards
                      ? { background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)', border: '1.5px solid var(--mochi-peach-mid)' }
                      : { color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }
                  }
                >
                  <Shuffle size={12} />
                  {shuffledCards ? 'Shuffled' : 'Shuffle'}
                </button>
                <button
                  onClick={() => { setCurrentIndex(0); setFlipped(false); setShuffledCards(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ color: 'var(--mochi-text-muted)', border: '1.5px solid var(--mochi-border)' }}
                >
                  <RotateCcw size={12} />
                  Restart
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-lg mb-6" style={{ height: '4px', background: 'var(--mochi-border)', borderRadius: '9999px' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  background: 'var(--mochi-lavender-mid)',
                  width: `${((currentIndex + 1) / total) * 100}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            {/* Flip card */}
            <div
              style={{ width: '100%', maxWidth: '480px', height: '240px', perspective: '1000px', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setFlipped((v) => !v)}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.45s ease',
                  transform: flipped ? 'rotateY(180deg)' : 'none',
                }}
              >
                {/* Front face */}
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '28px',
                    borderRadius: '20px',
                    background: 'var(--mochi-surface)',
                    border: '2px solid var(--mochi-lavender-mid)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    textAlign: 'center',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-text-muted)' }}>
                    Front
                  </p>
                  <p style={{ color: 'var(--mochi-text)', fontSize: '17px', fontWeight: 600, lineHeight: 1.5 }}>
                    {card.front}
                  </p>
                  <p className="text-[10px] mt-5" style={{ color: 'var(--mochi-text-muted)' }}>
                    Click to reveal answer
                  </p>
                </div>

                {/* Back face */}
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: '28px',
                    borderRadius: '20px',
                    background: 'var(--mochi-lavender)',
                    border: '2px solid var(--mochi-lavender-mid)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    textAlign: 'center',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--mochi-lavender-dark)', opacity: 0.7 }}>
                    Answer
                  </p>
                  <p style={{ color: 'var(--mochi-lavender-dark)', fontSize: '15px', lineHeight: 1.6 }}>
                    {card.back}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={goPrev}
                disabled={total <= 1}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: 'var(--mochi-text-soft)', border: '1.5px solid var(--mochi-border)', opacity: total <= 1 ? 0.35 : 1, cursor: total <= 1 ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (total > 1) e.currentTarget.style.background = 'var(--mochi-surface)' }}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={15} />
                Prev
              </button>
              <button
                onClick={goNext}
                disabled={total <= 1}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ color: 'var(--mochi-text-soft)', border: '1.5px solid var(--mochi-border)', opacity: total <= 1 ? 0.35 : 1, cursor: total <= 1 ? 'not-allowed' : 'pointer' }}
                onMouseEnter={(e) => { if (total > 1) e.currentTarget.style.background = 'var(--mochi-surface)' }}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Manage cards section */}
            <div className="w-full max-w-lg mt-8" style={{ borderTop: '1px solid var(--mochi-border)', paddingTop: '20px' }}>
              <button
                onClick={() => setShowManage((v) => !v)}
                className="flex items-center gap-2 text-xs font-bold mb-3"
                style={{ color: 'var(--mochi-text-muted)' }}
              >
                <span style={{ fontSize: '9px' }}>{showManage ? '▼' : '▶'}</span>
                Manage cards ({total})
              </button>

              {showManage && (
                <div className="flex flex-col gap-1.5 fade-in">
                  {displayCards.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{
                        background: i === currentIndex ? 'var(--mochi-lavender)' : 'var(--mochi-surface)',
                        border: `1.5px solid ${i === currentIndex ? 'var(--mochi-lavender-mid)' : 'var(--mochi-border)'}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--mochi-text)' }}>
                          {c.front}
                        </p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>
                          {c.back}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                        style={{ color: 'var(--mochi-text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: c.id, front: c.front })}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                        style={{ color: 'var(--mochi-text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showForm && (
        <CardFormModal
          notes={notes}
          initial={editingCard}
          defaultNoteId={defaultNoteIdForForm}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingCard(null) }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete card?"
          message={`"${confirmDelete.front}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
