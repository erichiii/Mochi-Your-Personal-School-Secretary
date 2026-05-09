import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Pencil, Check, MoreHorizontal, ArrowRight } from 'lucide-react'
import useStore from '../../store'
import ConfirmModal from '../ConfirmModal'

const PRESET_COLORS = [
  '#FFB3C6', '#C9B8F5', '#A8E6CF', '#FFCBA4', '#A8D4F5', '#FFE899',
  '#F4A9A8', '#B5EAD7', '#FFDAC1', '#E2F0CB', '#C7CEEA', '#F8C8D4',
]

function NameInput({ value, onChange, onSave, onCancel, placeholder, style }) {
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (value.trim()) onSave(); else onCancel() }}
      onClick={(e) => e.stopPropagation()}
      className="bg-transparent outline-none min-w-0 flex-1 text-xs font-semibold"
      style={style}
    />
  )
}

function ColorPicker({ onSelect, onClose }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl shadow-lg fade-in"
      style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
    >
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110 hover:ring-2 ring-offset-1"
            style={{ background: c, ringColor: c }}
          />
        ))}
      </div>
    </div>
  )
}

function MenuItem({ onClick, icon, danger, children }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{ color: danger ? '#E05050' : 'var(--mochi-text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {children}
    </button>
  )
}

function RowMenu({ moveTargets = [], canMoveToRoot, onRename, onAddSub, onMoveTo, onMoveToRoot, onDelete, onClose }) {
  const ref = useRef()
  const [showMoveTo, setShowMoveTo] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-0.5 z-50 rounded-xl shadow-lg fade-in overflow-hidden py-1"
      style={{
        background: 'var(--mochi-surface)',
        border: '1.5px solid var(--mochi-border)',
        minWidth: '148px',
      }}
    >
      <MenuItem onClick={onRename} icon={<Pencil size={11} />}>Rename</MenuItem>
      <MenuItem onClick={onAddSub} icon={<Plus size={11} />}>Add subsection</MenuItem>
      {(moveTargets.length > 0 || canMoveToRoot) && (
        <>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowMoveTo((v) => !v)}
            className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ color: 'var(--mochi-text)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowRight size={11} />
            Move to…
            <ChevronRight size={10} style={{ marginLeft: 'auto', transform: showMoveTo ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {showMoveTo && (
            <>
              {canMoveToRoot && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onMoveToRoot(); onClose() }}
                  className="w-full text-left flex items-center gap-2 pl-6 pr-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--mochi-text-soft)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ border: '1px solid var(--mochi-border)' }} />
                  Top level
                </button>
              )}
              {moveTargets.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onMoveTo(s.id); onClose() }}
                  className="w-full text-left flex items-center gap-2 pl-6 pr-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--mochi-text-soft)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-cream)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  {s.name}
                </button>
              ))}
            </>
          )}
        </>
      )}
      <div className="mx-2 my-1" style={{ height: '1px', background: 'var(--mochi-border)' }} />
      <MenuItem onClick={onDelete} icon={<X size={11} />} danger>Delete</MenuItem>
    </div>
  )
}

export default function SubjectSection() {
  const {
    subjects, notes, loadSubjects,
    createSubject, updateSubject, deleteSubject,
    updateNote,
    activeSubjectFilter, setSubjectFilter,
  } = useStore()

  const [dropTargetId, setDropTargetId] = useState(null)
  const [draggingSubjectId, setDraggingSubjectId] = useState(null)

  const [headerOpen, setHeaderOpen] = useState(true)
  const [expanded, setExpanded] = useState(new Set())

  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const [adding, setAdding] = useState(null)
  const [newName, setNewName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)

  const [colorPickerId, setColorPickerId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null) // { title, message, onConfirm }

  useEffect(() => { loadSubjects() }, [])

  const topLevel = subjects.filter((s) => !s.parentId)
  const childrenOf = (id) => subjects.filter((s) => s.parentId === id)

  const isDescendant = (ancestorId, nodeId) => {
    let current = subjects.find((s) => s.id === nodeId)
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true
      current = subjects.find((s) => s.id === current.parentId)
    }
    return false
  }

  const getDescendantIds = (id) => {
    const ids = []
    const stack = [id]
    while (stack.length > 0) {
      const parentId = stack.pop()
      const children = childrenOf(parentId)
      for (const child of children) {
        ids.push(child.id)
        stack.push(child.id)
      }
    }
    return ids
  }

  const countForSubject = (id) => {
    const descendantIds = getDescendantIds(id)
    if (descendantIds.length === 0) {
      return notes.filter((n) => n.subjectId === id).length
    }
    const descendantSet = new Set(descendantIds)
    return notes.filter((n) => n.subjectId === id || descendantSet.has(n.subjectId)).length
  }

  const getMoveTargets = (subjectId) => {
    const descendants = new Set(getDescendantIds(subjectId))
    return subjects.filter((s) => s.id !== subjectId && !descendants.has(s.id))
  }

  const canDropSubject = (draggedId, targetId) =>
    draggedId && targetId && draggedId !== targetId && !isDescendant(draggedId, targetId)

  const toggleExpand = (id) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const startEdit = (id, name) => { setEditingId(id); setEditingName(name) }
  const saveEdit = async () => {
    if (!editingName.trim()) { cancelEdit(); return }
    await updateSubject(editingId, { name: editingName.trim() })
    setEditingId(null); setEditingName('')
  }
  const cancelEdit = () => { setEditingId(null); setEditingName('') }

  const handleAdd = async () => {
    if (!newName.trim()) { setAdding(null); setNewName(''); return }
    if (adding === 'section') {
      await createSubject({ name: newName.trim(), color: PRESET_COLORS[colorIdx], parentId: null })
      setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    } else {
      const parent = subjects.find((s) => s.id === adding)
      await createSubject({ name: newName.trim(), color: parent?.color ?? PRESET_COLORS[0], parentId: adding })
    }
    setNewName(''); setAdding(null)
  }

  const handleDelete = (s) => {
    setConfirmModal({
      title: `Delete "${s.name}"?`,
      message: s.parentId ? undefined : 'This will also remove all its subsections.',
      onConfirm: async () => {
        setConfirmModal(null)
        if (activeSubjectFilter === s.id) setSubjectFilter(null)
        await deleteSubject(s.id)
      },
    })
  }

  const startAddSub = (sectionId) => {
    setExpanded((prev) => new Set([...prev, sectionId]))
    setAdding(sectionId); setNewName('')
  }

  const activeStyle = (color) => ({
    background: color + '44',
    border: `1.5px solid ${color}`,
    color: 'var(--mochi-text)',
  })
  const ghost = { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }

  const renderRow = ({ subject, depth = 0 }) => {
    const isActive = activeSubjectFilter === subject.id
    const isEditing = editingId === subject.id
    const children = childrenOf(subject.id)
    const hasChildren = children.length > 0
    const isExpanded = hasChildren && expanded.has(subject.id)
    const count = countForSubject(subject.id)
    const menuOpen = menuId === subject.id

    const moveTargets = getMoveTargets(subject.id)
    const canMoveToRoot = Boolean(subject.parentId)

    const isDropTarget = dropTargetId === subject.id
    const isDragging = draggingSubjectId === subject.id
    const indent = depth * 12

    return (
      // Outer wrapper: covers header + expanded subsection list → valid drop zone for subject drags
      <div
        key={subject.id}
        onDragOver={(e) => {
          if (!draggingSubjectId || draggingSubjectId === subject.id) return
          if (!canDropSubject(draggingSubjectId, subject.id)) return
          e.preventDefault()
          setDropTargetId(subject.id)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetId(null)
        }}
        onDrop={(e) => {
          if (!draggingSubjectId) return
          e.preventDefault()
          setDropTargetId(null)
          try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'))
            if (data.type === 'subject' && canDropSubject(data.id, subject.id)) {
              updateSubject(data.id, { parentId: subject.id })
              setExpanded((prev) => new Set([...prev, subject.id]))
            }
          } catch {}
        }}
        style={isDropTarget && draggingSubjectId ? {
          outline: `2px dashed ${subject.color || '#C9B8F5'}`,
          outlineOffset: '-2px',
          borderRadius: '12px',
          background: (subject.color || '#C9B8F5') + '22',
        } : {}}
      >
        <div
          className="group flex items-center gap-0.5 rounded-xl transition-all"
          draggable
          onDragStart={(e) => {
            setDraggingSubjectId(subject.id)
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'subject', id: subject.id }))
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => { setDraggingSubjectId(null); setDropTargetId(null) }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (draggingSubjectId) return  // subject drags: outer section wrapper handles highlight/drop
            e.stopPropagation()            // prevent outer wrapper from overriding note-drop target
            setDropTargetId(subject.id)
          }}
          onDragLeave={(e) => {
            if (draggingSubjectId) return
            if (!e.currentTarget.contains(e.relatedTarget)) setDropTargetId(null)
          }}
          onDrop={(e) => {
            if (draggingSubjectId) return  // subject drops handled by outer wrapper
            e.preventDefault()
            e.stopPropagation()
            setDropTargetId(null)
            try {
              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
              if (data.type === 'note') updateNote(data.id, { subjectId: subject.id })
            } catch {}
          }}
          style={{
            paddingLeft: indent ? `${indent}px` : undefined,
            opacity: isDragging ? 0.4 : 1,
            ...(isDropTarget && !draggingSubjectId ? {
              background: (subject.color || '#C9B8F5') + '33',
              outline: `2px dashed ${subject.color || '#C9B8F5'}`,
              outlineOffset: '-1px',
            } : {}),
          }}
        >
          {/* Expand chevron — nodes with children */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(subject.id)}
              className="p-1 rounded flex-shrink-0 transition-colors"
              style={{ color: 'var(--mochi-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
            >
              <ChevronRight
                size={11}
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              />
            </button>
          )}
          {!hasChildren && <div className="w-4 flex-shrink-0" />}

          {/* Color dot */}
          <div className="relative flex-shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === subject.id ? null : subject.id) }}
              className="transition-transform hover:scale-125"
              style={{
                width: depth === 0 ? '10px' : '8px',
                height: depth === 0 ? '10px' : '8px',
                borderRadius: '50%',
                background: subject.color,
                display: 'block',
              }}
            />
            {colorPickerId === subject.id && (
              <ColorPicker
                onSelect={async (color) => { await updateSubject(subject.id, { color }); setColorPickerId(null) }}
                onClose={() => setColorPickerId(null)}
              />
            )}
          </div>

          {/* Name + filter button */}
          <button
            onClick={() => !isEditing && setSubjectFilter(isActive ? null : subject.id)}
            className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-w-0"
            style={isActive ? activeStyle(subject.color) : ghost}
          >
            {isEditing ? (
              <NameInput
                value={editingName}
                onChange={setEditingName}
                onSave={saveEdit}
                onCancel={cancelEdit}
                style={{ color: 'var(--mochi-text)' }}
              />
            ) : (
              <span className="flex-1 text-left" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {subject.name}
              </span>
            )}
            {!isEditing && <span className="flex-shrink-0" style={{ color: 'var(--mochi-text-muted)' }}>{count}</span>}
          </button>

          {/* "⋯" menu trigger + dropdown */}
          {!isEditing && (
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuId(menuOpen ? null : subject.id) }}
                title="Options"
                className="p-1 rounded transition-colors"
                style={{
                  color: 'var(--mochi-text-muted)',
                  opacity: menuOpen ? 1 : undefined,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
              >
                <MoreHorizontal size={12} />
              </button>
              {menuOpen && (
                <RowMenu
                  moveTargets={moveTargets}
                  canMoveToRoot={canMoveToRoot}
                  onRename={() => { startEdit(subject.id, subject.name); setMenuId(null) }}
                  onAddSub={() => { startAddSub(subject.id); setMenuId(null) }}
                  onMoveTo={(targetId) => { updateSubject(subject.id, { parentId: targetId }); setMenuId(null) }}
                  onMoveToRoot={() => { updateSubject(subject.id, { parentId: null }); setMenuId(null) }}
                  onDelete={() => { handleDelete(subject); setMenuId(null) }}
                  onClose={() => setMenuId(null)}
                />
              )}
            </div>
          )}
          {isEditing && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={saveEdit} className="p-1 rounded flex-shrink-0" style={{ color: 'var(--mochi-lavender-dark)' }}>
              <Check size={11} />
            </button>
          )}
        </div>

        {/* Subsections */}
        {isExpanded && (
          <div className="flex flex-col gap-0.5 mt-0.5 fade-in">
            {children.map((child) => renderRow({ subject: child, depth: depth + 1 }))}

            {adding === subject.id && (
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl fade-in"
                style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: subject.color }} />
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(null); setNewName('') }
                  }}
                  onBlur={() => { if (!newName.trim()) { setAdding(null); setNewName('') } else handleAdd() }}
                  placeholder="Subsection name"
                  className="flex-1 bg-transparent outline-none text-xs"
                  style={{ color: 'var(--mochi-text)' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    {confirmModal && (
      <ConfirmModal
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    <div className="px-1">
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
          {topLevel.map((section) => renderRow({ subject: section, depth: 0 }))}

          {adding === 'section' ? (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl fade-in"
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') { setAdding(null); setNewName('') }
                }}
                onBlur={() => { if (!newName.trim()) { setAdding(null); setNewName('') } else handleAdd() }}
                placeholder="Section name"
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: 'var(--mochi-text)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => { setAdding('section'); setNewName('') }}
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
