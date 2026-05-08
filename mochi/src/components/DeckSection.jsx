import { useEffect, useState } from 'react'
import { Layers, Plus, X, Pencil, Trash2, GalleryHorizontal, ChevronRight, ChevronDown } from 'lucide-react'
import useStore from '../store'
import ConfirmModal from './ConfirmModal'

export default function DeckSection() {
  const {
    subjects, loadSubjects, createSubject, updateSubject, deleteSubject,
    decks, loadDecks, createDeck, updateDeck, deleteDeck,
    flashcards, loadFlashcards,
    activeDeckId, setActiveDeck,
  } = useStore()

  // Section (subject) state
  const [creatingSection, setCreatingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [renamingSectionId, setRenamingSectionId] = useState(null)
  const [renameSectionValue, setRenameSectionValue] = useState('')
  const [hoveredSectionId, setHoveredSectionId] = useState(null)

  // Deck state
  const [creatingForSubject, setCreatingForSubject] = useState(null) // subjectId | 'none' | null
  const [newDeckName, setNewDeckName] = useState('')
  const [renamingDeckId, setRenamingDeckId] = useState(null)
  const [renameDeckValue, setRenameDeckValue] = useState('')
  const [hoveredDeckId, setHoveredDeckId] = useState(null)
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(null)
  const [confirmDeleteSection, setConfirmDeleteSection] = useState(null)

  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [dropTargetSectionId, setDropTargetSectionId] = useState(null)

  useEffect(() => {
    loadSubjects()
    loadDecks()
    loadFlashcards()
  }, [])

  const countFor = (deckId) => flashcards.filter((c) => c.deckId === deckId).length
  const generalCount = flashcards.filter((c) => !c.deckId).length

  const topLevel = subjects.filter((s) => !s.parentId)
  const subsOf = (id) => subjects.filter((s) => s.parentId === id)
  const decksFor = (subjectId) => decks.filter((d) => d.subjectId === subjectId)
  const unsectionedDecks = decks.filter((d) => !d.subjectId)

  const toggleGroup = (key) => setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  // ── Section handlers ────────────────────────────────────────
  const handleCreateSection = async () => {
    const name = newSectionName.trim()
    setCreatingSection(false)
    setNewSectionName('')
    if (!name) return
    await createSubject({ name, color: null })
  }

  const handleRenameSectionSubmit = async () => {
    const trimmed = renameSectionValue.trim()
    if (trimmed) await updateSubject(renamingSectionId, { name: trimmed })
    setRenamingSectionId(null)
  }

  // ── Deck handlers ───────────────────────────────────────────
  const handleCreateDeck = async (subjectId) => {
    const name = newDeckName.trim()
    setCreatingForSubject(null)
    setNewDeckName('')
    if (!name) return
    const sid = subjectId === 'none' ? null : subjectId
    const id = await createDeck(name, sid)
    setActiveDeck(id)
  }

  const handleRenameDeckSubmit = async () => {
    const trimmed = renameDeckValue.trim()
    if (trimmed) await updateDeck(renamingDeckId, { name: trimmed })
    setRenamingDeckId(null)
  }

  const handleDeleteDeckConfirmed = async () => {
    await deleteDeck(confirmDeleteDeck.id)
    setConfirmDeleteDeck(null)
  }

  // ── Render helpers ──────────────────────────────────────────
  const renderNewDeckInput = (subjectId) => (
    <div
      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl mb-0.5"
      style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
    >
      <Layers size={12} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
      <input
        autoFocus
        value={newDeckName}
        onChange={(e) => setNewDeckName(e.target.value)}
        onBlur={() => handleCreateDeck(subjectId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCreateDeck(subjectId)
          if (e.key === 'Escape') { setCreatingForSubject(null); setNewDeckName('') }
        }}
        placeholder="Deck name…"
        className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
        style={{ color: 'var(--mochi-text)' }}
      />
      <button
        onMouseDown={() => { setCreatingForSubject(null); setNewDeckName('') }}
        style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}
      >
        <X size={11} />
      </button>
    </div>
  )

  const renderDeckItem = (deck, indent = false) => {
    const isActive = activeDeckId === deck.id
    const isRenaming = renamingDeckId === deck.id
    const isHovered = hoveredDeckId === deck.id
    const count = countFor(deck.id)

    return (
      <div
        key={deck.id}
        className="relative"
        style={indent ? { paddingLeft: '10px' } : {}}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'deck', id: deck.id }))
          e.dataTransfer.effectAllowed = 'move'
          e.stopPropagation()
        }}
        onMouseEnter={() => setHoveredDeckId(deck.id)}
        onMouseLeave={() => setHoveredDeckId(null)}
      >
        <div
          onClick={() => { if (!isRenaming) setActiveDeck(deck.id) }}
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl font-semibold transition-all cursor-pointer"
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
              value={renameDeckValue}
              onChange={(e) => setRenameDeckValue(e.target.value)}
              onBlur={handleRenameDeckSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameDeckSubmit()
                if (e.key === 'Escape') setRenamingDeckId(null)
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
              style={{ color: 'var(--mochi-text)' }}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-xs">{deck.name}</span>
          )}

          {!isRenaming && !isHovered && (
            <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isActive ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
              }}>
              {count}
            </span>
          )}

          {!isRenaming && isHovered && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                title="Rename"
                onClick={(e) => { e.stopPropagation(); setRenamingDeckId(deck.id); setRenameDeckValue(deck.name) }}
                className="p-0.5 rounded"
                style={{ color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)')}
              >
                <Pencil size={11} />
              </button>
              <button
                title="Delete"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteDeck({ id: deck.id, name: deck.name }) }}
                className="p-0.5 rounded"
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
  }

  const renderSectionHeader = (subject, indent = false) => {
    const key = `s-${subject.id}`
    const isCollapsed = collapsedGroups[key]
    const isRenamingSection = renamingSectionId === subject.id
    const isHovered = hoveredSectionId === subject.id
    const groupDecks = decksFor(subject.id)
    const subs = subsOf(subject.id)

    return (
      <div key={subject.id} style={indent ? { paddingLeft: '8px' } : {}}>
        <div
          className="flex items-center px-1 mb-0.5 mt-2 rounded-lg transition-all"
          onMouseEnter={() => setHoveredSectionId(subject.id)}
          onMouseLeave={() => setHoveredSectionId(null)}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetSectionId(subject.id) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetSectionId(null) }}
          onDrop={(e) => {
            e.preventDefault()
            setDropTargetSectionId(null)
            try {
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              if (data.type === 'deck') updateDeck(data.id, { subjectId: subject.id })
            } catch {}
          }}
          style={dropTargetSectionId === subject.id ? { background: 'var(--mochi-pink)', outline: '2px dashed var(--mochi-pink-mid)', outlineOffset: '-1px' } : {}}
        >
          <button onClick={() => toggleGroup(key)} className="flex-shrink-0 mr-0.5" style={{ color: 'var(--mochi-text-muted)' }}>
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          </button>

          {isRenamingSection ? (
            <input
              autoFocus
              value={renameSectionValue}
              onChange={(e) => setRenameSectionValue(e.target.value)}
              onBlur={handleRenameSectionSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSectionSubmit()
                if (e.key === 'Escape') setRenamingSectionId(null)
              }}
              className="flex-1 min-w-0 bg-transparent outline-none text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--mochi-text-muted)' }}
            />
          ) : (
            <span
              className="flex-1 min-w-0 truncate text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              style={{ color: 'var(--mochi-text-muted)' }}
              onClick={() => toggleGroup(key)}
            >
              {subject.name}
            </span>
          )}

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isHovered && !isRenamingSection && (
              <>
                <button
                  title="Rename section"
                  onClick={() => { setRenamingSectionId(subject.id); setRenameSectionValue(subject.name) }}
                  className="p-0.5 rounded"
                  style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                >
                  <Pencil size={10} />
                </button>
                <button
                  title="Delete section"
                  onClick={() => setConfirmDeleteSection({ id: subject.id, name: subject.name })}
                  className="p-0.5 rounded"
                  style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                >
                  <Trash2 size={10} />
                </button>
              </>
            )}
            <button
              onClick={() => { setCreatingForSubject(subject.id); setNewDeckName('') }}
              title="New deck in this section"
              className="p-0.5 rounded transition-colors"
              style={{ color: 'var(--mochi-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
            >
              <Plus size={11} />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div>
            {creatingForSubject === subject.id && renderNewDeckInput(subject.id)}
            {groupDecks.map((d) => renderDeckItem(d))}
            {subs.map((sub) => renderSectionHeader(sub, true))}
            {groupDecks.length === 0 && subs.length === 0 && creatingForSubject !== subject.id && (
              <p className="text-[10px] px-5 py-1 italic" style={{ color: 'var(--mochi-text-muted)' }}>No decks yet</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const hasSections = topLevel.length > 0

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
          Decks
        </p>
        <button
          onClick={() => { setCreatingSection(true); setNewSectionName('') }}
          title="New section"
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* New section inline input */}
      {creatingSection && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl mb-0.5"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <input
            autoFocus
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onBlur={handleCreateSection}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSection()
              if (e.key === 'Escape') { setCreatingSection(false); setNewSectionName('') }
            }}
            placeholder="Section name…"
            className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
            style={{ color: 'var(--mochi-text)' }}
          />
          <button
            onMouseDown={() => { setCreatingSection(false); setNewSectionName('') }}
            style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* All sections */}
      {topLevel.map((s) => renderSectionHeader(s))}

      {/* Decks not in any section */}
      {unsectionedDecks.length > 0 && (
        <div>
          {hasSections && (
            <div className="flex items-center px-1 mb-0.5 mt-2">
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
                Other
              </span>
              <button
                onClick={() => { setCreatingForSubject('none'); setNewDeckName('') }}
                title="New deck"
                className="p-0.5 rounded transition-colors"
                style={{ color: 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
              >
                <Plus size={11} />
              </button>
            </div>
          )}
          {creatingForSubject === 'none' && renderNewDeckInput('none')}
          {unsectionedDecks.map((d) => renderDeckItem(d))}
        </div>
      )}

      {/* No sections and no decks yet */}
      {!hasSections && unsectionedDecks.length === 0 && !creatingSection && (
        <div className="flex flex-col gap-1.5 mt-1">
          <button
            onClick={() => { setCreatingSection(true); setNewSectionName('') }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold w-full"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={12} />New section
          </button>
          <button
            onClick={() => { setCreatingForSubject('none'); setNewDeckName('') }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold w-full"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Layers size={12} />New deck (no section)
          </button>
          {creatingForSubject === 'none' && renderNewDeckInput('none')}
        </div>
      )}

      {/* General: flashcards with no deck at all */}
      {generalCount > 0 && (
        <>
          <div className="my-1.5 mx-1" style={{ borderTop: '1px solid var(--mochi-border)' }} />
          <div
            onClick={() => setActiveDeck('unlinked')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl font-semibold transition-all cursor-pointer"
            style={
              activeDeckId === 'unlinked'
                ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
                : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
            }
            onMouseEnter={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'var(--mochi-cream)' }}
            onMouseLeave={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'transparent' }}
          >
            <GalleryHorizontal size={13} style={{ flexShrink: 0 }} />
            <span className="flex-1 min-w-0 truncate text-xs">General</span>
            <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: activeDeckId === 'unlinked' ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                color: activeDeckId === 'unlinked' ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
              }}>
              {generalCount}
            </span>
          </div>
        </>
      )}

      {confirmDeleteDeck && (
        <ConfirmModal
          title="Delete deck?"
          message={`"${confirmDeleteDeck.name}" will be deleted. Its cards will be moved to General.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteDeckConfirmed}
          onCancel={() => setConfirmDeleteDeck(null)}
        />
      )}

      {confirmDeleteSection && (
        <ConfirmModal
          title="Delete section?"
          message={`"${confirmDeleteSection.name}" and its subsections will be removed. Decks inside will move to Other.`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteSubject(confirmDeleteSection.id); setConfirmDeleteSection(null) }}
          onCancel={() => setConfirmDeleteSection(null)}
        />
      )}
    </div>
  )
}
