import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Pencil, Check, MoreHorizontal } from 'lucide-react'
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

function RowMenu({ isSection, onRename, onAddSub, onDelete, onClose }) {
  const ref = useRef()
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
      {isSection && <MenuItem onClick={onAddSub} icon={<Plus size={11} />}>Add subsection</MenuItem>}
      <div className="mx-2 my-1" style={{ height: '1px', background: 'var(--mochi-border)' }} />
      <MenuItem onClick={onDelete} icon={<X size={11} />} danger>Delete</MenuItem>
    </div>
  )
}

export default function SubjectSection() {
  const {
    subjects, notes, loadSubjects,
    createSubject, updateSubject, deleteSubject,
    activeSubjectFilter, setSubjectFilter,
  } = useStore()

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

  const sections = subjects.filter((s) => !s.parentId)
  const subsOf = (id) => subjects.filter((s) => s.parentId === id)

  const countForSection = (id) => {
    const subIds = subsOf(id).map((s) => s.id)
    return notes.filter((n) => n.subjectId === id || subIds.includes(n.subjectId)).length
  }
  const countForSub = (id) => notes.filter((n) => n.subjectId === id).length

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

  const renderRow = ({ subject, isSection }) => {
    const isActive = activeSubjectFilter === subject.id
    const isEditing = editingId === subject.id
    const subs = isSection ? subsOf(subject.id) : []
    const isExpanded = isSection && expanded.has(subject.id)
    const count = isSection ? countForSection(subject.id) : countForSub(subject.id)
    const menuOpen = menuId === subject.id

    return (
      <div key={subject.id}>
        <div className="group flex items-center gap-0.5">
          {/* Expand chevron — sections only */}
          {isSection && (
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
          {!isSection && <div className="w-4 flex-shrink-0" />}

          {/* Color dot */}
          <div className="relative flex-shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setColorPickerId(colorPickerId === subject.id ? null : subject.id) }}
              className="transition-transform hover:scale-125"
              style={{
                width: isSection ? '10px' : '8px',
                height: isSection ? '10px' : '8px',
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
                  isSection={isSection}
                  onRename={() => { startEdit(subject.id, subject.name); setMenuId(null) }}
                  onAddSub={() => { startAddSub(subject.id); setMenuId(null) }}
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
        {isSection && isExpanded && (
          <div className="ml-5 flex flex-col gap-0.5 mt-0.5 fade-in">
            {subs.map((sub) => renderRow({ subject: sub, isSection: false }))}

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
          {sections.map((section) => renderRow({ subject: section, isSection: true }))}

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
