import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, X, Pencil, Check } from 'lucide-react'
import useStore from '../../store'

const PRESET_COLORS = [
  '#FFB3C6', '#C9B8F5', '#A8E6CF', '#FFCBA4', '#A8D4F5', '#FFE899',
]

function NameInput({ value, onChange, onSave, onCancel, className, style }) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onSave}
      onClick={(e) => e.stopPropagation()}
      className={`bg-transparent outline-none min-w-0 flex-1 ${className ?? ''}`}
      style={style}
    />
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
  const [adding, setAdding] = useState(null) // null | 'section' | <parentId>
  const [newName, setNewName] = useState('')
  const [colorIdx, setColorIdx] = useState(0)

  useEffect(() => { loadSubjects() }, [])

  const sections = subjects.filter((s) => !s.parentId)
  const subsOf = (id) => subjects.filter((s) => s.parentId === id)

  const countForSection = (id) => {
    const subIds = subsOf(id).map((s) => s.id)
    return notes.filter((n) => n.subjectId === id || subIds.includes(n.subjectId)).length
  }
  const countForSub = (id) => notes.filter((n) => n.subjectId === id).length

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const startEdit = (s) => { setEditingId(s.id); setEditingName(s.name) }

  const saveEdit = async () => {
    if (editingName.trim() && editingId) {
      await updateSubject(editingId, { name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }

  const cancelEdit = () => { setEditingId(null); setEditingName('') }

  const handleAdd = async () => {
    if (!newName.trim()) { setAdding(null); setNewName(''); return }
    const isSection = adding === 'section'
    if (isSection) {
      await createSubject({ name: newName.trim(), color: PRESET_COLORS[colorIdx], parentId: null })
      setColorIdx((i) => (i + 1) % PRESET_COLORS.length)
    } else {
      const parent = subjects.find((s) => s.id === adding)
      await createSubject({ name: newName.trim(), color: parent?.color ?? PRESET_COLORS[0], parentId: adding })
    }
    setNewName('')
    setAdding(null)
  }

  const handleDelete = async (s) => {
    if (activeSubjectFilter === s.id) setSubjectFilter(null)
    await deleteSubject(s.id)
  }

  const startAddSub = (sectionId) => {
    setExpanded((prev) => new Set([...prev, sectionId]))
    setAdding(sectionId)
    setNewName('')
  }

  // ── Shared row styles ──────────────────────────────────────
  const activeStyle = (s) => ({
    background: s.color + '44',
    border: `1.5px solid ${s.color}`,
    color: 'var(--mochi-text)',
  })
  const inactiveStyle = { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }

  return (
    <div className="px-1">
      {/* "Sections" collapsible header */}
      <button
        onClick={() => setHeaderOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1 transition-colors"
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mochi-border)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--mochi-text-muted)' }}
        >
          Sections
        </span>
        <ChevronDown
          size={11}
          style={{
            color: 'var(--mochi-text-muted)',
            transform: headerOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {headerOpen && (
        <div className="flex flex-col gap-0.5 fade-in">
          {/* All Notes row */}
          <button
            onClick={() => setSubjectFilter(null)}
            className="flex items-center gap-2 px-2 py-2 rounded-xl text-xs font-semibold w-full text-left transition-all"
            style={
              activeSubjectFilter === null
                ? { background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)', color: 'var(--mochi-pink-dark)' }
                : inactiveStyle
            }
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--mochi-text-muted)' }} />
            <span className="flex-1">All Notes</span>
            <span style={{ color: 'var(--mochi-text-muted)' }}>{notes.length}</span>
          </button>

          {/* Section rows */}
          {sections.map((section) => {
            const isActive = activeSubjectFilter === section.id
            const isExpanded = expanded.has(section.id)
            const isEditing = editingId === section.id
            const subs = subsOf(section.id)

            return (
              <div key={section.id}>
                {/* Section row */}
                <div className="group flex items-center gap-0.5">
                  {/* Expand chevron */}
                  <button
                    onClick={() => toggleExpand(section.id)}
                    className="p-1 rounded flex-shrink-0 transition-colors"
                    style={{ color: 'var(--mochi-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}
                  >
                    <ChevronRight
                      size={11}
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                    />
                  </button>

                  {/* Name + filter button */}
                  <button
                    onClick={() => !isEditing && setSubjectFilter(isActive ? null : section.id)}
                    className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-w-0"
                    style={isActive ? activeStyle(section) : inactiveStyle}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: section.color }} />
                    {isEditing ? (
                      <NameInput
                        value={editingName}
                        onChange={setEditingName}
                        onSave={saveEdit}
                        onCancel={cancelEdit}
                        className="text-xs font-semibold"
                        style={{ color: 'var(--mochi-text)' }}
                      />
                    ) : (
                      <span className="flex-1 truncate text-left">{section.name}</span>
                    )}
                    {!isEditing && (
                      <span style={{ color: 'var(--mochi-text-muted)' }}>{countForSection(section.id)}</span>
                    )}
                  </button>

                  {/* Hover actions */}
                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                      <button
                        onClick={() => startEdit(section)}
                        title="Rename"
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--mochi-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => startAddSub(section.id)}
                        title="Add subsection"
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--mochi-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => handleDelete(section)}
                        title="Delete section"
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--mochi-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = '#E05050' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  {isEditing && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={saveEdit}
                      className="p-1 rounded flex-shrink-0"
                      style={{ color: 'var(--mochi-lavender-dark)' }}
                    >
                      <Check size={11} />
                    </button>
                  )}
                </div>

                {/* Subsections */}
                {isExpanded && (
                  <div className="ml-5 flex flex-col gap-0.5 mt-0.5 fade-in">
                    {subs.map((sub) => {
                      const isSubActive = activeSubjectFilter === sub.id
                      const isSubEditing = editingId === sub.id
                      return (
                        <div key={sub.id} className="group flex items-center gap-0.5">
                          <button
                            onClick={() => !isSubEditing && setSubjectFilter(isSubActive ? null : sub.id)}
                            className="flex-1 flex items-center gap-1.5 px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-w-0"
                            style={isSubActive ? activeStyle(sub) : inactiveStyle}
                          >
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sub.color }} />
                            {isSubEditing ? (
                              <NameInput
                                value={editingName}
                                onChange={setEditingName}
                                onSave={saveEdit}
                                onCancel={cancelEdit}
                                className="text-xs font-semibold"
                                style={{ color: 'var(--mochi-text)' }}
                              />
                            ) : (
                              <span className="flex-1 truncate text-left">{sub.name}</span>
                            )}
                            {!isSubEditing && (
                              <span style={{ color: 'var(--mochi-text-muted)' }}>{countForSub(sub.id)}</span>
                            )}
                          </button>

                          {!isSubEditing && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                              <button
                                onClick={() => startEdit(sub)}
                                title="Rename"
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--mochi-text-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => handleDelete(sub)}
                                title="Delete subsection"
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--mochi-text-muted)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = '#E05050' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                          {isSubEditing && (
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={saveEdit}
                              className="p-1 rounded flex-shrink-0"
                              style={{ color: 'var(--mochi-lavender-dark)' }}
                            >
                              <Check size={11} />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Add subsection inline form */}
                    {adding === section.id && (
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 rounded-xl fade-in"
                        style={{ border: '1.5px solid var(--mochi-border)', background: 'var(--mochi-cream)' }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: section.color }} />
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
          })}

          {/* Add section inline form */}
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
              <Plus size={12} />
              New section
            </button>
          )}
        </div>
      )}
    </div>
  )
}
