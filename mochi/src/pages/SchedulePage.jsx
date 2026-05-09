import { useEffect, useRef, useState } from 'react'
import {
  Calendar, Plus, Upload, X, Sparkles, Loader2, AlertCircle,
  Pencil, Trash2, Check, ImageIcon, Save,
} from 'lucide-react'
import useStore from '../store'
import { generateSchedule } from '../gemini'

// ── Constants ──────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DAY_COLORS = {
  Monday:    { bg: 'var(--mochi-lavender)',  border: 'var(--mochi-lavender-mid)',  text: 'var(--mochi-lavender-dark)' },
  Tuesday:   { bg: 'var(--mochi-pink)',      border: 'var(--mochi-pink-mid)',      text: 'var(--mochi-pink-dark)' },
  Wednesday: { bg: 'var(--mochi-mint)',      border: 'var(--mochi-mint-mid)',      text: 'var(--mochi-mint-dark)' },
  Thursday:  { bg: 'var(--mochi-peach)',     border: 'var(--mochi-peach-mid)',     text: 'var(--mochi-peach-dark)' },
  Friday:    { bg: 'var(--mochi-sky)',       border: 'var(--mochi-sky-mid)',       text: 'var(--mochi-sky-dark)' },
  Saturday:  { bg: 'var(--mochi-lavender)', border: 'var(--mochi-lavender-mid)', text: 'var(--mochi-lavender-dark)' },
  Sunday:    { bg: 'var(--mochi-pink)',      border: 'var(--mochi-pink-mid)',      text: 'var(--mochi-pink-dark)' },
}

const parseTimeForSort = (t) => {
  if (!t) return 0
  const m = t.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  const p = m[3].toUpperCase()
  if (p === 'PM' && h !== 12) h += 12
  if (p === 'AM' && h === 12) h = 0
  return h * 60 + min
}

// ── Shared field styles ────────────────────────────────────────
const fieldStyle = {
  background: 'var(--mochi-cream)',
  border: '1.5px solid var(--mochi-border)',
  color: 'var(--mochi-text)',
  borderRadius: '10px',
  padding: '4px 10px',
  fontSize: '12px',
  outline: 'none',
}

function DaySelect({ value, onChange, style }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...fieldStyle, ...style }}>
      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function SchedulePage() {
  const {
    scheduleItems, loadSchedule,
    createScheduleItem, updateScheduleItem, deleteScheduleItem,
  } = useStore()

  // Image upload
  const [image, setImage] = useState(null)   // { name, mimeType, base64, url }
  const [isDragOver, setIsDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const imageRef = useRef()

  // Pending items (parsed, not yet saved)
  const [pendingItems, setPendingItems] = useState([])  // [{tempId, day, time, subject, room}]
  const [editingPendingId, setEditingPendingId] = useState(null)
  const [pendingEditForm, setPendingEditForm] = useState({ day: 'Monday', time: '', subject: '', room: '' })

  // Saved item editing
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ day: 'Monday', time: '', subject: '', room: '' })

  // Add row form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ day: 'Monday', time: '', subject: '', room: '' })

  useEffect(() => { loadSchedule() }, [])

  // ── Image handlers ─────────────────────────────────────────
  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setParseError('Please upload an image file (JPG, PNG, etc.)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setImage({ name: file.name, mimeType: file.type, base64: dataUrl.split(',')[1], url: dataUrl })
      setParseError('')
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const clearImage = () => { setImage(null); setParseError('') }

  // ── Parse handler ──────────────────────────────────────────
  const handleParse = async () => {
    if (!image) return
    setParsing(true)
    setParseError('')
    try {
      const items = await generateSchedule(image.base64, image.mimeType)
      if (!items || items.length === 0) {
        setParseError('No schedule found in this image. Try a clearer photo of a class timetable.')
        return
      }
      setPendingItems(items.map((item, i) => ({
        ...item,
        tempId: `p-${Date.now()}-${i}`,
      })))
    } catch (err) {
      setParseError(err.message)
    } finally {
      setParsing(false)
    }
  }

  // ── Pending handlers ───────────────────────────────────────
  const saveAllPending = async () => {
    for (const item of pendingItems) {
      await createScheduleItem({ day: item.day, time: item.time, subject: item.subject, room: item.room ?? '' })
    }
    setPendingItems([])
    setImage(null)
  }

  const discardPending = () => setPendingItems([])

  const startEditPending = (item) => {
    setEditingPendingId(item.tempId)
    setPendingEditForm({ day: item.day, time: item.time, subject: item.subject, room: item.room ?? '' })
  }

  const savePendingEdit = () => {
    setPendingItems((prev) =>
      prev.map((p) => p.tempId === editingPendingId ? { ...p, ...pendingEditForm } : p)
    )
    setEditingPendingId(null)
  }

  const deletePending = (tempId) => setPendingItems((prev) => prev.filter((p) => p.tempId !== tempId))

  // ── Saved item handlers ────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({ day: item.day, time: item.time, subject: item.subject, room: item.room ?? '' })
  }

  const saveEdit = async () => {
    if (!editForm.subject.trim()) return
    await updateScheduleItem(editingId, editForm)
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  // ── Add row ────────────────────────────────────────────────
  const handleAddRow = async () => {
    if (!addForm.subject.trim()) return
    await createScheduleItem(addForm)
    setAddForm({ day: 'Monday', time: '', subject: '', room: '' })
    setShowAddForm(false)
  }

  // ── Group by day ───────────────────────────────────────────
  const itemsByDay = {}
  for (const day of DAYS) {
    const saved = scheduleItems
      .filter((i) => i.day === day)
      .sort((a, b) => parseTimeForSort(a.time) - parseTimeForSort(b.time))
    const pending = pendingItems
      .filter((i) => i.day === day)
      .sort((a, b) => parseTimeForSort(a.time) - parseTimeForSort(b.time))
    if (saved.length || pending.length) itemsByDay[day] = { saved, pending }
  }
  const activeDays = DAYS.filter((d) => itemsByDay[d])
  const hasContent = activeDays.length > 0

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="h-full flex overflow-hidden" style={{ background: 'var(--mochi-cream)' }}>

      {/* ── Left: Image upload panel ── */}
      <div
        className="flex-shrink-0 flex flex-col overflow-y-auto py-6 px-4 gap-4"
        style={{ width: '256px', borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--mochi-text-muted)' }}>
          Parse from image
        </p>

        {/* Drop zone / preview */}
        {image ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--mochi-border)' }}>
            <img src={image.url} alt={image.name} className="w-full object-cover" style={{ maxHeight: '180px' }} />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
            >
              <X size={12} />
            </button>
            <p className="text-[10px] px-2 py-1.5 truncate" style={{ color: 'var(--mochi-text-muted)' }}>{image.name}</p>
          </div>
        ) : (
          <div
            onClick={() => imageRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer transition-all"
            style={{
              minHeight: '140px',
              border: `2px dashed ${isDragOver ? 'var(--mochi-peach-mid)' : 'var(--mochi-border)'}`,
              background: isDragOver ? 'var(--mochi-peach)' : 'var(--mochi-cream)',
            }}
          >
            <ImageIcon size={28} style={{ color: isDragOver ? 'var(--mochi-peach-dark)' : 'var(--mochi-border)' }} />
            <p className="text-xs font-semibold text-center px-4" style={{ color: isDragOver ? 'var(--mochi-peach-dark)' : 'var(--mochi-text-muted)' }}>
              Drop image here<br />or click to upload
            </p>
            <p className="text-[10px]" style={{ color: 'var(--mochi-text-muted)' }}>JPG, PNG, WEBP</p>
          </div>
        )}
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}>
            <AlertCircle size={13} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: 'var(--mochi-pink-dark)' }}>{parseError}</p>
          </div>
        )}

        {/* Parse button */}
        <button
          onClick={handleParse}
          disabled={!image || parsing}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold"
          style={{
            background: image && !parsing ? 'var(--mochi-peach)' : 'var(--mochi-border)',
            border: `1.5px solid ${image && !parsing ? 'var(--mochi-peach-mid)' : 'transparent'}`,
            color: image && !parsing ? 'var(--mochi-peach-dark)' : 'var(--mochi-text-muted)',
            cursor: image && !parsing ? 'pointer' : 'not-allowed',
          }}
        >
          {parsing
            ? <><Loader2 size={13} className="animate-spin" />Parsing…</>
            : <><Sparkles size={13} />Parse with AI</>}
        </button>

        <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--mochi-text-muted)' }}>
          Upload a photo of your class schedule and Gemini will read the days, times, and subjects for you.
        </p>
      </div>

      {/* ── Right: Schedule table ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Pending banner */}
        {pendingItems.length > 0 && (
          <div
            className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
            style={{ background: 'var(--mochi-peach)', borderBottom: '1.5px solid var(--mochi-peach-mid)' }}
          >
            <Sparkles size={14} style={{ color: 'var(--mochi-peach-dark)', flexShrink: 0 }} />
            <p className="text-sm font-semibold flex-1" style={{ color: 'var(--mochi-peach-dark)' }}>
              {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} parsed — review and save
            </p>
            <button
              onClick={saveAllPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'var(--mochi-surface)', color: 'var(--mochi-peach-dark)', border: '1.5px solid var(--mochi-peach-mid)' }}
            >
              <Save size={12} />Save all
            </button>
            <button
              onClick={discardPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ color: 'var(--mochi-peach-dark)', border: '1.5px solid transparent' }}
            >
              <X size={12} />Discard
            </button>
          </div>
        )}

        {/* Table header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1.5px solid var(--mochi-border)' }}
        >
          <p className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-text)' }}>
            Weekly Schedule
          </p>
          <button
            onClick={() => { setShowAddForm(true); setAddForm({ day: 'Monday', time: '', subject: '', room: '' }) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)', border: '1.5px solid var(--mochi-peach-mid)' }}
          >
            <Plus size={12} />Add Row
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Add row form */}
          {showAddForm && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-2xl fade-in"
              style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-peach-mid)' }}
            >
              <DaySelect value={addForm.day} onChange={(v) => setAddForm((f) => ({ ...f, day: v }))} />
              <input
                autoFocus
                value={addForm.time}
                onChange={(e) => setAddForm((f) => ({ ...f, time: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); if (e.key === 'Escape') setShowAddForm(false) }}
                placeholder="8:00 AM - 9:00 AM"
                style={{ ...fieldStyle, width: '148px' }}
              />
              <input
                value={addForm.subject}
                onChange={(e) => setAddForm((f) => ({ ...f, subject: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); if (e.key === 'Escape') setShowAddForm(false) }}
                placeholder="Subject / class name"
                style={{ ...fieldStyle, flex: 1 }}
              />
              <input
                value={addForm.room}
                onChange={(e) => setAddForm((f) => ({ ...f, room: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); if (e.key === 'Escape') setShowAddForm(false) }}
                placeholder="Room"
                style={{ ...fieldStyle, width: '90px' }}
              />
              <button onClick={handleAddRow} disabled={!addForm.subject.trim()} className="p-1.5 rounded-lg"
                style={{ color: addForm.subject.trim() ? 'var(--mochi-mint-dark)' : 'var(--mochi-text-muted)', background: addForm.subject.trim() ? 'var(--mochi-mint)' : 'transparent' }}>
                <Check size={14} />
              </button>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--mochi-text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Day groups */}
          {hasContent ? activeDays.map((day) => {
            const { saved, pending } = itemsByDay[day]
            const colors = DAY_COLORS[day]
            return (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.text }}
                  >
                    {day}
                  </span>
                  <div className="flex-1" style={{ height: '1px', background: 'var(--mochi-border)' }} />
                </div>

                {/* Rows */}
                <div className="flex flex-col gap-1.5">
                  {/* Saved rows */}
                  {saved.map((item) => (
                    <div key={item.id}>
                      {editingId === item.id ? (
                        // Inline edit form
                        <div
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                          style={{ background: 'var(--mochi-surface)', border: `1.5px solid ${colors.border}` }}
                        >
                          <DaySelect value={editForm.day} onChange={(v) => setEditForm((f) => ({ ...f, day: v }))} />
                          <input
                            autoFocus
                            value={editForm.time}
                            onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            style={{ ...fieldStyle, width: '150px' }}
                          />
                          <input
                            value={editForm.subject}
                            onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            style={{ ...fieldStyle, flex: 1 }}
                          />
                          <input
                            value={editForm.room}
                            onChange={(e) => setEditForm((f) => ({ ...f, room: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                            placeholder="Room"
                            style={{ ...fieldStyle, width: '90px' }}
                          />
                          <button onClick={saveEdit} className="p-1.5 rounded-lg"
                            style={{ color: 'var(--mochi-mint-dark)', background: 'var(--mochi-mint)' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded-lg" style={{ color: 'var(--mochi-text-muted)' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        // Display row
                        <div
                          className="group flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all"
                          style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = colors.border)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--mochi-border)')}
                        >
                          <span className="text-xs font-semibold w-40 flex-shrink-0" style={{ color: 'var(--mochi-text-muted)' }}>
                            {item.time || <span style={{ opacity: 0.4 }}>No time</span>}
                          </span>
                          <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--mochi-text)' }}>
                            {item.subject}
                          </span>
                          {item.room && (
                            <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--mochi-border)', color: 'var(--mochi-text-muted)' }}>
                              {item.room}
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                            <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg"
                              style={{ color: 'var(--mochi-text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--mochi-text)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteScheduleItem(item.id)} className="p-1.5 rounded-lg"
                              style={{ color: 'var(--mochi-text-muted)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-text-muted)')}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pending rows */}
                  {pending.map((item) => (
                    <div key={item.tempId}>
                      {editingPendingId === item.tempId ? (
                        <div
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                          style={{ background: 'var(--mochi-peach)', border: `1.5px solid ${colors.border}` }}
                        >
                          <DaySelect value={pendingEditForm.day} onChange={(v) => setPendingEditForm((f) => ({ ...f, day: v }))} />
                          <input
                            autoFocus
                            value={pendingEditForm.time}
                            onChange={(e) => setPendingEditForm((f) => ({ ...f, time: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') savePendingEdit(); if (e.key === 'Escape') setEditingPendingId(null) }}
                            style={{ ...fieldStyle, width: '150px' }}
                          />
                          <input
                            value={pendingEditForm.subject}
                            onChange={(e) => setPendingEditForm((f) => ({ ...f, subject: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') savePendingEdit(); if (e.key === 'Escape') setEditingPendingId(null) }}
                            style={{ ...fieldStyle, flex: 1 }}
                          />
                          <input
                            value={pendingEditForm.room}
                            onChange={(e) => setPendingEditForm((f) => ({ ...f, room: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') savePendingEdit(); if (e.key === 'Escape') setEditingPendingId(null) }}
                            placeholder="Room"
                            style={{ ...fieldStyle, width: '90px' }}
                          />
                          <button onClick={savePendingEdit} className="p-1.5 rounded-lg"
                            style={{ color: 'var(--mochi-mint-dark)', background: 'var(--mochi-mint)' }}>
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditingPendingId(null)} className="p-1.5 rounded-lg" style={{ color: 'var(--mochi-text-muted)' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="group flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all"
                          style={{ background: 'var(--mochi-peach)', border: `1.5px solid ${colors.border}` }}
                        >
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--mochi-peach-mid)', color: 'var(--mochi-peach-dark)' }}>
                            new
                          </span>
                          <span className="text-xs font-semibold w-36 flex-shrink-0" style={{ color: 'var(--mochi-peach-dark)', opacity: 0.8 }}>
                            {item.time || <span style={{ opacity: 0.4 }}>No time</span>}
                          </span>
                          <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--mochi-peach-dark)' }}>
                            {item.subject}
                          </span>
                          {item.room && (
                            <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--mochi-peach-mid)', color: 'var(--mochi-peach-dark)' }}>
                              {item.room}
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                            <button onClick={() => startEditPending(item)} className="p-1.5 rounded-lg"
                              style={{ color: 'var(--mochi-peach-dark)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deletePending(item.tempId)} className="p-1.5 rounded-lg"
                              style={{ color: 'var(--mochi-peach-dark)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#E05050')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mochi-peach-dark)')}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          }) : (
            !showAddForm && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Calendar size={48} className="mb-4" style={{ color: 'var(--mochi-border)' }} />
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>No schedule yet</p>
                <p className="text-xs mb-6" style={{ color: 'var(--mochi-text-muted)' }}>
                  Upload a photo of your class schedule, or add rows manually
                </p>
                <button
                  onClick={() => { setShowAddForm(true) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)', border: '1.5px solid var(--mochi-peach-mid)' }}
                >
                  <Plus size={13} />Add Row
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
