import { useEffect, useState } from 'react'
import { Layers, Plus, X, Pencil, Trash2, GalleryHorizontal, ChevronRight, ChevronDown } from 'lucide-react'
import useStore from '../store'
import ConfirmModal from './ConfirmModal'

export default function DeckSection() {
  const {
    deckGroups, loadDeckGroups, createDeckGroup, updateDeckGroup, deleteDeckGroup,
    decks, loadDecks, createDeck, updateDeck, deleteDeck,
    flashcards, loadFlashcards,
    activeDeckId, setActiveDeck,
  } = useStore()

  // Group state
  const [creatingGroup,    setCreatingGroup]    = useState(false)
  const [newGroupName,     setNewGroupName]      = useState('')
  const [renamingGroupId,  setRenamingGroupId]   = useState(null)
  const [renameGroupValue, setRenameGroupValue]  = useState('')
  const [hoveredGroupId,   setHoveredGroupId]    = useState(null)
  const [collapsedGroups,  setCollapsedGroups]   = useState({})
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null)

  // Deck state
  const [creatingForGroup, setCreatingForGroup] = useState(null) // groupId | 'none' | null
  const [newDeckName,      setNewDeckName]       = useState('')
  const [renamingDeckId,   setRenamingDeckId]    = useState(null)
  const [renameDeckValue,  setRenameDeckValue]   = useState('')
  const [hoveredDeckId,    setHoveredDeckId]     = useState(null)
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(null)
  const [dropTargetGroupId, setDropTargetGroupId] = useState(null)

  useEffect(() => {
    loadDeckGroups()
    loadDecks()
    loadFlashcards()
  }, [])

  const countFor    = (deckId) => flashcards.filter((c) => c.deckId === deckId).length
  const generalCount = flashcards.filter((c) => !c.deckId).length
  const decksFor    = (groupId) => decks.filter((d) => d.groupId === groupId)
  const ungrouped   = decks.filter((d) => !d.groupId)

  const toggleGroup = (id) =>
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }))

  // ── Group handlers ──────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    setCreatingGroup(false); setNewGroupName('')
    if (!name) return
    await createDeckGroup(name)
  }

  const handleRenameGroup = async () => {
    const trimmed = renameGroupValue.trim()
    if (trimmed) await updateDeckGroup(renamingGroupId, { name: trimmed })
    setRenamingGroupId(null)
  }

  // ── Deck handlers ───────────────────────────────────────────
  const handleCreateDeck = async (groupId) => {
    const name = newDeckName.trim()
    setCreatingForGroup(null); setNewDeckName('')
    if (!name) return
    const gid = groupId === 'none' ? null : groupId
    const id = await createDeck(name, gid)
    setActiveDeck(id)
  }

  const handleRenameDeck = async () => {
    const trimmed = renameDeckValue.trim()
    if (trimmed) await updateDeck(renamingDeckId, { name: trimmed })
    setRenamingDeckId(null)
  }

  // ── Render: new deck inline input ───────────────────────────
  const renderNewDeckInput = (groupId) => (
    <div
      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl mb-0.5"
      style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
    >
      <Layers size={12} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }} />
      <input
        autoFocus
        value={newDeckName}
        onChange={(e) => setNewDeckName(e.target.value)}
        onBlur={() => handleCreateDeck(groupId)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  handleCreateDeck(groupId)
          if (e.key === 'Escape') { setCreatingForGroup(null); setNewDeckName('') }
        }}
        placeholder="Deck name…"
        className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
        style={{ color: 'var(--mochi-text)' }}
      />
      <button onMouseDown={() => { setCreatingForGroup(null); setNewDeckName('') }} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}>
        <X size={11} />
      </button>
    </div>
  )

  // ── Render: deck row ────────────────────────────────────────
  const renderDeck = (deck) => {
    const isActive   = activeDeckId === deck.id
    const isRenaming = renamingDeckId === deck.id
    const isHovered  = hoveredDeckId === deck.id
    const count      = countFor(deck.id)

    return (
      <div
        key={deck.id}
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
          style={isActive
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
              onBlur={handleRenameDeck}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleRenameDeck()
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
            <span
              className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isActive ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                color:      isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
              }}
            >
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

  // ── Render: group section ────────────────────────────────────
  const renderGroup = (group) => {
    const isCollapsed  = collapsedGroups[group.id]
    const isRenaming   = renamingGroupId === group.id
    const isHovered    = hoveredGroupId === group.id
    const isDropTarget = dropTargetGroupId === group.id
    const groupDecks   = decksFor(group.id)

    return (
      <div key={group.id}>
        <div
          className="flex items-center px-1 mb-0.5 mt-2 rounded-lg transition-all"
          onMouseEnter={() => setHoveredGroupId(group.id)}
          onMouseLeave={() => setHoveredGroupId(null)}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetGroupId(group.id) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetGroupId(null) }}
          onDrop={(e) => {
            e.preventDefault(); setDropTargetGroupId(null)
            try {
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              if (data.type === 'deck') updateDeck(data.id, { groupId: group.id })
            } catch {}
          }}
          style={isDropTarget ? { background: 'var(--mochi-pink)', outline: '2px dashed var(--mochi-pink-mid)', outlineOffset: '-1px', borderRadius: '8px' } : {}}
        >
          <button onClick={() => toggleGroup(group.id)} className="flex-shrink-0 mr-0.5" style={{ color: 'var(--mochi-text-muted)' }}>
            {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          </button>

          {isRenaming ? (
            <input
              autoFocus
              value={renameGroupValue}
              onChange={(e) => setRenameGroupValue(e.target.value)}
              onBlur={handleRenameGroup}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleRenameGroup()
                if (e.key === 'Escape') setRenamingGroupId(null)
              }}
              className="flex-1 min-w-0 bg-transparent outline-none text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--mochi-text-muted)' }}
            />
          ) : (
            <span
              className="flex-1 min-w-0 truncate text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              style={{ color: 'var(--mochi-text-muted)' }}
              onClick={() => toggleGroup(group.id)}
            >
              {group.name}
            </span>
          )}

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isHovered && !isRenaming && (
              <>
                <button
                  title="Rename group"
                  onClick={() => { setRenamingGroupId(group.id); setRenameGroupValue(group.name) }}
                  className="p-0.5 rounded"
                  style={{ color: 'var(--mochi-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                >
                  <Pencil size={10} />
                </button>
                <button
                  title="Delete group"
                  onClick={() => setConfirmDeleteGroup({ id: group.id, name: group.name })}
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
              onClick={() => { setCreatingForGroup(group.id); setNewDeckName('') }}
              title="New deck in this group"
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
            {creatingForGroup === group.id && renderNewDeckInput(group.id)}
            {groupDecks.map(renderDeck)}
            {groupDecks.length === 0 && creatingForGroup !== group.id && (
              <p className="text-[10px] px-5 py-1 italic" style={{ color: 'var(--mochi-text-muted)' }}>No decks yet</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const hasGroups = deckGroups.length > 0

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
          Decks
        </p>
        <button
          onClick={() => { setCreatingGroup(true); setNewGroupName('') }}
          title="New group"
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* New group input */}
      {creatingGroup && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl mb-0.5"
          style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
        >
          <input
            autoFocus
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onBlur={handleCreateGroup}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  handleCreateGroup()
              if (e.key === 'Escape') { setCreatingGroup(false); setNewGroupName('') }
            }}
            placeholder="Group name…"
            className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
            style={{ color: 'var(--mochi-text)' }}
          />
          <button onMouseDown={() => { setCreatingGroup(false); setNewGroupName('') }} style={{ color: 'var(--mochi-text-muted)', flexShrink: 0 }}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Groups */}
      {deckGroups.map(renderGroup)}

      {/* Ungrouped decks */}
      {ungrouped.length > 0 && (
        <div>
          {hasGroups && (
            <div className="flex items-center px-1 mb-0.5 mt-2">
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>Other</span>
              <button
                onClick={() => { setCreatingForGroup('none'); setNewDeckName('') }}
                title="New ungrouped deck"
                className="p-0.5 rounded transition-colors"
                style={{ color: 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
              >
                <Plus size={11} />
              </button>
            </div>
          )}
          {creatingForGroup === 'none' && renderNewDeckInput('none')}
          {ungrouped.map(renderDeck)}
        </div>
      )}

      {/* Empty state */}
      {!hasGroups && ungrouped.length === 0 && !creatingGroup && (
        <div className="flex flex-col gap-1.5 mt-1">
          <button
            onClick={() => { setCreatingGroup(true); setNewGroupName('') }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold w-full"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Plus size={12} />New group
          </button>
          <button
            onClick={() => { setCreatingForGroup('none'); setNewDeckName('') }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold w-full"
            style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Layers size={12} />New deck
          </button>
          {creatingForGroup === 'none' && renderNewDeckInput('none')}
        </div>
      )}

      {/* Add deck button when groups exist but no ungrouped decks */}
      {(hasGroups || ungrouped.length > 0) && creatingForGroup !== 'none' && ungrouped.length === 0 && (
        <button
          onClick={() => { setCreatingForGroup('none'); setNewDeckName('') }}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold w-full mt-1"
          style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Layers size={12} />New deck
        </button>
      )}

      {/* General: flashcards with no deck */}
      {generalCount > 0 && (
        <>
          <div className="my-1.5 mx-1" style={{ borderTop: '1px solid var(--mochi-border)' }} />
          <div
            onClick={() => setActiveDeck('unlinked')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl font-semibold transition-all cursor-pointer"
            style={activeDeckId === 'unlinked'
              ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
              : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
            }
            onMouseEnter={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'var(--mochi-cream)' }}
            onMouseLeave={(e) => { if (activeDeckId !== 'unlinked') e.currentTarget.style.background = 'transparent' }}
          >
            <GalleryHorizontal size={13} style={{ flexShrink: 0 }} />
            <span className="flex-1 min-w-0 truncate text-xs">General</span>
            <span
              className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: activeDeckId === 'unlinked' ? 'var(--mochi-pink-mid)' : 'var(--mochi-border)',
                color:      activeDeckId === 'unlinked' ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
              }}
            >
              {generalCount}
            </span>
          </div>
        </>
      )}

      {/* Confirm: delete deck */}
      {confirmDeleteDeck && (
        <ConfirmModal
          title="Delete deck?"
          message={`"${confirmDeleteDeck.name}" will be deleted. Its cards will be moved to General.`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteDeck(confirmDeleteDeck.id); setConfirmDeleteDeck(null) }}
          onCancel={() => setConfirmDeleteDeck(null)}
        />
      )}

      {/* Confirm: delete group */}
      {confirmDeleteGroup && (
        <ConfirmModal
          title="Delete group?"
          message={`"${confirmDeleteGroup.name}" will be removed. Decks inside will move to Other.`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteDeckGroup(confirmDeleteGroup.id); setConfirmDeleteGroup(null) }}
          onCancel={() => setConfirmDeleteGroup(null)}
        />
      )}
    </div>
  )
}
