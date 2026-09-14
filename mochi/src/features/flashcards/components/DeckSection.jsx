import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Layers, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import useStore from '../../../app/store/useStore'
import ConfirmModal from '../../../shared/components/ConfirmModal'

const PRESET_COLORS = [
  '#FFB3C6', '#FF8FAB', '#F7A8A8', '#FFD1D1', '#E8A0A0', '#FABDB0',
  '#FFCBA4', '#FF9B7A', '#FFDAC1', '#FFB085', '#FFA07A', '#F4A460',
  '#FFE899', '#FFD580', '#FFF0A0', '#F7DC6F', '#FFEAA7', '#FAD65A',
  '#A8E6CF', '#85C1A8', '#C1E1C1', '#6DB88B', '#D4F5E9', '#8CC8A0',
  '#A8D4F5', '#7EC8E3', '#C4E4FF', '#86B5FF', '#AEC6CF', '#B0E0E6',
  '#C9B8F5', '#D8B4FE', '#CDB4DB', '#B8A9E0', '#C7CEEA', '#E2BFD9',
]

function ColorPicker({ position, onSelect, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const left = Math.min(position.left, window.innerWidth - 228)

  return createPortal(
    <div
      ref={ref}
      className="p-3 rounded-xl shadow-xl fade-in"
      style={{
        position: 'fixed', top: position.top, left, zIndex: 9999, width: '220px',
        background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.18)',
      }}
    >
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
            style={{ background: c, outline: '2px solid transparent', outlineOffset: '2px' }}
            onMouseEnter={(e) => { e.currentTarget.style.outline = `2px solid ${c}` }}
            onMouseLeave={(e) => { e.currentTarget.style.outline = '2px solid transparent' }}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

function GroupMenu({ onRename, onAddDeck, onDelete, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const item = (onClick, icon, label, danger) => (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{ color: danger ? '#E05050' : 'var(--mochi-text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-0.5 z-50 rounded-xl shadow-lg fade-in overflow-hidden py-1"
      style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)', minWidth: '148px' }}
    >
      {item(onRename,  <Pencil size={11} />, 'Rename')}
      {item(onAddDeck, <Plus size={11} />,   'Add deck')}
      <div className="mx-2 my-1" style={{ height: '1px', background: 'var(--mochi-border)' }} />
      {item(onDelete, <X size={11} />, 'Delete', true)}
    </div>
  )
}

export default function DeckSection() {
  const {
    deckGroups, loadDeckGroups, createDeckGroup, updateDeckGroup, deleteDeckGroup,
    decks, loadDecks, createDeck, updateDeck, deleteDeck,
    flashcards, loadFlashcards,
    activeDeckId, setActiveDeck,
  } = useStore()

  const [headerOpen, setHeaderOpen] = useState(true)
  const [expanded, setExpanded] = useState(new Set())
  const [colorIdx, setColorIdx] = useState(0)

  // Group (section) state
  const [addingGroup,      setAddingGroup]      = useState(false)
  const [newGroupName,     setNewGroupName]      = useState('')
  const [editingGroupId,   setEditingGroupId]   = useState(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [menuGroupId,      setMenuGroupId]      = useState(null)
  const [colorPickerId,    setColorPickerId]    = useState(null)
  const [colorPickerPos,   setColorPickerPos]   = useState({ top: 0, left: 0 })
  const [confirmGroup,     setConfirmGroup]     = useState(null)

  // Deck state
  const [creatingForGroup, setCreatingForGroup] = useState(null)
  const [newDeckName,      setNewDeckName]      = useState('')
  const [editingDeckId,    setEditingDeckId]    = useState(null)
  const [editingDeckName,  setEditingDeckName]  = useState('')
  const [hoveredDeckId,    setHoveredDeckId]    = useState(null)
  const [confirmDeck,      setConfirmDeck]      = useState(null)
  const [dropTargetId,     setDropTargetId]     = useState(null)

  useEffect(() => {
    loadDeckGroups()
    loadDecks()
    loadFlashcards()
  }, [])

  const decksFor   = (groupId) => decks.filter((d) => d.groupId === groupId)
  const ungrouped  = decks.filter((d) => !d.groupId)
  const countFor   = (deckId) => flashcards.filter((c) => c.deckId === deckId).length

  const toggleExpand = (id) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Group handlers ──────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    setAddingGroup(false); setNewGroupName('')
    if (!name) return
    const color = PRESET_COLORS[colorIdx]
    setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    await createDeckGroup(name, color)
  }

  const handleRenameGroup = async () => {
    const trimmed = editingGroupName.trim()
    if (trimmed) await updateDeckGroup(editingGroupId, { name: trimmed })
    setEditingGroupId(null)
  }

  const handleDeleteGroup = (group) => {
    setConfirmGroup({
      title: `Delete "${group.name}"?`,
      message: 'Decks inside will move to Other.',
      onConfirm: async () => { setConfirmGroup(null); await deleteDeckGroup(group.id) },
    })
    setMenuGroupId(null)
  }

  // ── Deck handlers ───────────────────────────────────────────
  const handleCreateDeck = async (groupId) => {
    const name = newDeckName.trim()
    setCreatingForGroup(null); setNewDeckName('')
    if (!name) return
    const gid = groupId === 'none' ? null : groupId
    const id = await createDeck(name, gid)
    setActiveDeck(id)
    if (gid) setExpanded((prev) => new Set([...prev, gid]))
  }

  const handleRenameDeck = async () => {
    const trimmed = editingDeckName.trim()
    if (trimmed) await updateDeck(editingDeckId, { name: trimmed })
    setEditingDeckId(null)
  }

  // ── Render: deck row ────────────────────────────────────────
  const renderDeck = (deck, indent = 16) => {
    const isActive  = activeDeckId === deck.id
    const isEditing = editingDeckId === deck.id
    const isHovered = hoveredDeckId === deck.id
    const count     = countFor(deck.id)

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
        style={{ paddingLeft: `${indent}px` }}
      >
        <div
          onClick={() => { if (!isEditing) setActiveDeck(deck.id) }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
          style={isActive
            ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
            : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }
          }
          onMouseEnter={(e) => { if (!isActive && !isEditing) e.currentTarget.style.background = 'var(--mochi-cream)' }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
        >
          <Layers size={13} style={{ flexShrink: 0 }} />

          {isEditing ? (
            <input
              autoFocus
              value={editingDeckName}
              onChange={(e) => setEditingDeckName(e.target.value)}
              onBlur={handleRenameDeck}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleRenameDeck()
                if (e.key === 'Escape') setEditingDeckId(null)
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold"
              style={{ color: 'var(--mochi-text)' }}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-xs">{deck.name}</span>
          )}

          {!isEditing && !isHovered && (
            <span
              className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isActive ? 'var(--mochi-pink-mid)'  : 'var(--mochi-border)',
                color:      isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)',
              }}
            >{count}</span>
          )}

          {!isEditing && isHovered && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                title="Rename"
                onClick={(e) => { e.stopPropagation(); setEditingDeckId(deck.id); setEditingDeckName(deck.name) }}
                className="p-0.5 rounded"
                style={{ color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)')}
              ><Pencil size={11} /></button>
              <button
                title="Delete"
                onClick={(e) => { e.stopPropagation(); setConfirmDeck({ id: deck.id, name: deck.name }) }}
                className="p-0.5 rounded"
                style={{ color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                onMouseLeave={(e) => (e.currentTarget.style.color = isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-text-muted)')}
              ><Trash2 size={11} /></button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render: new deck inline input ───────────────────────────
  const renderNewDeckInput = (groupId, indent = 24) => (
    <div
      className="flex items-center gap-1.5 py-2 rounded-xl"
      style={{
        background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)',
        paddingLeft: `${indent}px`, paddingRight: '8px',
      }}
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

  // ── Render: group (section) ─────────────────────────────────
  const renderGroup = (group) => {
    const isExpanded  = expanded.has(group.id)
    const isEditing   = editingGroupId === group.id
    const isDropTarget = dropTargetId === group.id
    const menuOpen    = menuGroupId === group.id
    const groupDecks  = decksFor(group.id)
    const color       = group.color || '#C9B8F5'

    return (
      <div
        key={group.id}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTargetId(group.id) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetId(null) }}
        onDrop={(e) => {
          e.preventDefault(); setDropTargetId(null)
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'))
            if (data.type === 'deck') {
              updateDeck(data.id, { groupId: group.id })
              setExpanded((prev) => new Set([...prev, group.id]))
            }
          } catch {}
        }}
        style={isDropTarget ? {
          outline: `2px dashed ${color}`, outlineOffset: '-2px',
          borderRadius: '12px', background: color + '22',
        } : {}}
      >
        <div className="group flex items-center gap-0.5 rounded-xl transition-all">
          {/* Expand chevron */}
          <button
            onClick={() => toggleExpand(group.id)}
            className="p-1 rounded flex-shrink-0 transition-colors"
            style={{ color: 'var(--mochi-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
          >
            <ChevronRight size={11} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {/* Color dot */}
          <div className="flex-shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                if (colorPickerId === group.id) { setColorPickerId(null); return }
                const rect = e.currentTarget.getBoundingClientRect()
                setColorPickerPos({ top: rect.bottom + 6, left: rect.left })
                setColorPickerId(group.id)
              }}
              className="transition-transform hover:scale-125"
              style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'block' }}
            />
          </div>

          {/* Name */}
          {isEditing ? (
            <input
              autoFocus
              value={editingGroupName}
              onChange={(e) => setEditingGroupName(e.target.value)}
              onBlur={handleRenameGroup}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  handleRenameGroup()
                if (e.key === 'Escape') setEditingGroupId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs font-semibold px-1.5 py-1.5"
              style={{ color: 'var(--mochi-text)' }}
            />
          ) : (
            <button
              onClick={() => toggleExpand(group.id)}
              className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-w-0"
              style={{ color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span className="flex-1 text-left truncate">{group.name}</span>
              <span className="flex-shrink-0" style={{ color: 'var(--mochi-text-muted)' }}>{groupDecks.length}</span>
            </button>
          )}

          {/* ⋯ menu */}
          {!isEditing && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuGroupId(menuOpen ? null : group.id) }}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--mochi-text-muted)', opacity: menuOpen ? 1 : undefined }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
              >
                <MoreHorizontal size={12} />
              </button>
              {menuOpen && (
                <GroupMenu
                  onRename={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); setMenuGroupId(null) }}
                  onAddDeck={() => { setCreatingForGroup(group.id); setNewDeckName(''); setExpanded((prev) => new Set([...prev, group.id])); setMenuGroupId(null) }}
                  onDelete={() => handleDeleteGroup(group)}
                  onClose={() => setMenuGroupId(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Decks list */}
        {(isExpanded || creatingForGroup === group.id) && (
          <div className="flex flex-col gap-0.5 mt-0.5 fade-in">
            {groupDecks.map((deck) => renderDeck(deck))}
            {creatingForGroup === group.id && renderNewDeckInput(group.id)}
          </div>
        )}
      </div>
    )
  }

  const activeColorGroup = colorPickerId ? deckGroups.find((g) => g.id === colorPickerId) : null

  return (
    <>
      {activeColorGroup && (
        <ColorPicker
          position={colorPickerPos}
          onSelect={async (color) => { await updateDeckGroup(activeColorGroup.id, { color }); setColorPickerId(null) }}
          onClose={() => setColorPickerId(null)}
        />
      )}
      {confirmGroup && (
        <ConfirmModal
          title={confirmGroup.title}
          message={confirmGroup.message}
          onConfirm={confirmGroup.onConfirm}
          onCancel={() => setConfirmGroup(null)}
        />
      )}
      {confirmDeck && (
        <ConfirmModal
          title="Delete deck?"
          message={`"${confirmDeck.name}" and all its cards will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteDeck(confirmDeck.id); setConfirmDeck(null) }}
          onCancel={() => setConfirmDeck(null)}
        />
      )}

      <div className="px-1">
        {/* Sections header */}
        <button
          onClick={() => setHeaderOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-border)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--mochi-text-muted)' }}>
            Sections
          </span>
          <ChevronDown size={11} style={{ color: 'var(--mochi-text-muted)', transform: headerOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        </button>

        {headerOpen && (
          <div className="flex flex-col gap-0.5 fade-in">
            {deckGroups.map(renderGroup)}

            {/* Ungrouped decks → "Other" */}
            {ungrouped.length > 0 && (
              <div>
                <div className="flex items-center px-2 mb-0.5 mt-2">
                  <span className="flex-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>Other</span>
                  <button
                    onClick={() => { setCreatingForGroup('none'); setNewDeckName('') }}
                    className="p-0.5 rounded transition-colors"
                    style={{ color: 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                  ><Plus size={11} /></button>
                </div>
                {creatingForGroup === 'none' && renderNewDeckInput('none', 8)}
                {ungrouped.map((deck) => renderDeck(deck, 8))}
              </div>
            )}

            {/* New section */}
            {addingGroup ? (
              <div
                className="flex items-center gap-2 px-2 py-2 rounded-xl fade-in mt-0.5"
                style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
              >
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setColorIdx((i) => (i + 1) % PRESET_COLORS.length)}
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-transform hover:scale-125"
                  style={{ background: PRESET_COLORS[colorIdx] }}
                  title="Cycle color"
                />
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  handleCreateGroup()
                    if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
                  }}
                  onBlur={() => { if (!newGroupName.trim()) { setAddingGroup(false); setNewGroupName('') } else handleCreateGroup() }}
                  placeholder="Section name"
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: 'var(--mochi-text)' }}
                />
              </div>
            ) : (
              <button
                onClick={() => { setAddingGroup(true); setNewGroupName('') }}
                className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs w-full text-left transition-all mt-0.5"
                style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Plus size={12} /> New section
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
