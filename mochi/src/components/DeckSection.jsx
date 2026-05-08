import { useEffect, useState } from 'react'
import { Layers, Plus, X, Pencil, Trash2, GalleryHorizontal } from 'lucide-react'
import useStore from '../store'
import ConfirmModal from './ConfirmModal'

export default function DeckSection() {
  const {
    decks, loadDecks, createDeck, updateDeck, deleteDeck,
    flashcards, loadFlashcards,
    activeDeckId, setActiveDeck,
  } = useStore()

  const [creatingDeck, setCreatingDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [hoveredId, setHoveredId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, name }

  useEffect(() => {
    loadDecks()
    loadFlashcards()
  }, [])

  const countFor = (deckId) => flashcards.filter((c) => c.deckId === deckId).length
  const generalCount = flashcards.filter((c) => !c.deckId).length

  const handleCreateDeck = async () => {
    const name = newDeckName.trim()
    if (!name) { setCreatingDeck(false); setNewDeckName(''); return }
    const id = await createDeck(name)
    setActiveDeck(id)
    setCreatingDeck(false)
    setNewDeckName('')
  }

  const handleRenameSubmit = async () => {
    const trimmed = renameValue.trim()
    if (trimmed) await updateDeck(renamingId, { name: trimmed })
    setRenamingId(null)
  }

  const handleDeleteConfirmed = async () => {
    await deleteDeck(confirmDelete.id)
    setConfirmDelete(null)
  }

  const startRename = (deck) => {
    setRenamingId(deck.id)
    setRenameValue(deck.name)
  }

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
          Decks
        </p>
        <button
          onClick={() => { setCreatingDeck(true); setNewDeckName('') }}
          title="New deck"
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* New deck inline input */}
      {creatingDeck && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl mb-0.5"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <Layers size={12} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
          <input
            autoFocus
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onBlur={handleCreateDeck}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateDeck()
              if (e.key === 'Escape') { setCreatingDeck(false); setNewDeckName('') }
            }}
            placeholder="Deck name…"
            className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
            style={{ color: 'var(--mochi-text)' }}
          />
          <button
            onMouseDown={() => { setCreatingDeck(false); setNewDeckName('') }}
            style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Deck items */}
      {decks.map((deck) => {
        const isActive = activeDeckId === deck.id
        const isRenaming = renamingId === deck.id
        const isHovered = hoveredId === deck.id
        const count = countFor(deck.id)

        return (
          <div
            key={deck.id}
            className="relative"
            onMouseEnter={() => setHoveredId(deck.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              onClick={() => { if (!isRenaming) setActiveDeck(deck.id) }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={
                isActive
                  ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
                  : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
              }
              onMouseEnter={(e) => { if (!isActive && !isRenaming) e.currentTarget.style.background = 'var(--mochi-cream)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <Layers size={13} style={{ flexShrink: 0 }} />

              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit()
                    if (e.key === 'Escape') setRenamingId(null)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold"
                  style={{ color: 'var(--mochi-text)' }}
                />
              ) : (
                <span className="flex-1 min-w-0 truncate">{deck.name}</span>
              )}

              {/* Count badge — hidden when renaming or action icons visible */}
              {!isRenaming && !isHovered && (
                <span
                  className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                    color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
                  }}
                >
                  {count}
                </span>
              )}

              {/* Action icons — appear on hover */}
              {!isRenaming && isHovered && (
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    title="Rename"
                    onClick={(e) => { e.stopPropagation(); startRename(deck) }}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)')}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: deck.id, name: deck.name }) }}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)')}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* General (uncategorized) */}
      {generalCount > 0 && (
        <div
          onClick={() => setActiveDeck('unlinked')}
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          style={
            activeDeckId === 'unlinked'
              ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
              : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
          }
          onMouseEnter={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'var(--mochi-cream)' }}
          onMouseLeave={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'transparent' }}
        >
          <GalleryHorizontal size={13} style={{ flexShrink: 0 }} />
          <span className="flex-1 min-w-0 truncate">General</span>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: activeDeckId === 'unlinked' ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
              color: activeDeckId === 'unlinked' ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
            }}
          >
            {generalCount}
          </span>
        </div>
      )}

      {/* Empty hint */}
      {decks.length === 0 && !creatingDeck && (
        <p className="text-xs px-2.5 py-1 italic" style={{ color: 'var(--mochi-text-muted)' }}>
          No decks yet
        </p>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete deck?"
          message={`"${confirmDelete.name}" will be deleted. Its cards will be moved to General.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
