import { useEffect, useRef, useState } from 'react'
import { format, addMonths } from 'date-fns'
import {
  X, Download, FileDown, Loader2, CalendarDays, ImageIcon, AlertCircle,
} from 'lucide-react'
import WallpaperCanvas from './WallpaperCanvas'

// ── Helpers ────────────────────────────────────────────────────
const DAY_BYDAY = {
  Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE',
  Thursday: 'TH', Friday: 'FR', Saturday: 'SA', Sunday: 'SU',
}

const DAY_JS_INDEX = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
}

function parseTimeRange(t) {
  if (!t) return null
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return null
  let [, sh, sm, sp, eh, em, ep] = m
  sh = parseInt(sh); sm = parseInt(sm); eh = parseInt(eh); em = parseInt(em)
  if (sp.toUpperCase() === 'PM' && sh !== 12) sh += 12
  if (sp.toUpperCase() === 'AM' && sh === 12) sh = 0
  if (ep.toUpperCase() === 'PM' && eh !== 12) eh += 12
  if (ep.toUpperCase() === 'AM' && eh === 12) eh = 0
  return { startH: sh, startMin: sm, endH: eh, endMin: em }
}

function firstOccurrence(dayName, startDate) {
  const d = new Date(startDate)
  const delta = (DAY_JS_INDEX[dayName] - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta)
  return d
}

function toUntilString(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setUTCHours(23, 59, 59, 0)
  return d.toISOString().replace(/[-:]/g, '').replace('.000', '')
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Field style (reused) ────────────────────────────────────────
const fieldStyle = {
  background: 'var(--mochi-cream)',
  border: '1.5px solid var(--mochi-border)',
  color: 'var(--mochi-text)',
  borderRadius: '10px',
  padding: '6px 10px',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

// ── ExportModal ────────────────────────────────────────────────
export default function ExportModal({ items = [], section, onClose }) {
  const [tab, setTab] = useState('ics')

  // ICS state
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(addMonths(new Date(), 4), 'yyyy-MM-dd'))
  const [icsError, setIcsError] = useState('')
  const [icsExporting, setIcsExporting] = useState(false)

  // PNG state
  const canvasRef = useRef(null)
  const [pngExporting, setPngExporting] = useState(false)
  const [pngError, setPngError] = useState('')

  // Escape to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── ICS export ───────────────────────────────────────────────
  const handleExportICS = async () => {
    setIcsError('')
    if (!startDate || !endDate) { setIcsError('Select both a start and end date.'); return }
    if (new Date(endDate) <= new Date(startDate)) { setIcsError('End date must be after start date.'); return }
    if (items.length === 0) { setIcsError('No schedule items to export.'); return }

    setIcsExporting(true)
    try {
      const { createEvents } = await import('ics')
      const untilStr = toUntilString(endDate)
      const startDt = new Date(startDate + 'T00:00:00')
      const endDt = new Date(endDate + 'T23:59:59')

      const events = []
      for (const item of items) {
        if (!DAY_BYDAY[item.day]) continue
        const parsed = parseTimeRange(item.time)
        if (!parsed) continue
        const first = firstOccurrence(item.day, startDt)
        if (first > endDt) continue

        events.push({
          start: [first.getFullYear(), first.getMonth() + 1, first.getDate(), parsed.startH, parsed.startMin],
          end:   [first.getFullYear(), first.getMonth() + 1, first.getDate(), parsed.endH,   parsed.endMin],
          title: item.subject,
          ...(item.room ? { location: item.room } : {}),
          recurrenceRule: `FREQ=WEEKLY;BYDAY=${DAY_BYDAY[item.day]};UNTIL=${untilStr}`,
        })
      }

      if (events.length === 0) {
        setIcsError('No exportable events found. Make sure items have times like "9:00 AM - 10:50 AM".')
        return
      }

      const { error, value } = createEvents(events)
      if (error) { setIcsError(`ICS generation failed: ${error.message}`); return }

      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mochi-schedule-${slugify(section?.name ?? 'all')}.ics`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setIcsError(`Export failed: ${e.message}`)
    } finally {
      setIcsExporting(false)
    }
  }

  // ── PNG export ───────────────────────────────────────────────
  const handleExportPNG = async () => {
    if (!canvasRef.current) return
    setPngExporting(true)
    setPngError('')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(canvasRef.current, { pixelRatio: 2, backgroundColor: '#FFF8F0' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `mochi-schedule-${slugify(section?.name ?? 'all')}.png`
      a.click()
    } catch (e) {
      setPngError(`Export failed: ${e.message}`)
    } finally {
      setPngExporting(false)
    }
  }

  // Count items with no parseable time (for info label in ICS tab)
  const noTimeCount = items.filter((i) => !parseTimeRange(i.time)).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--mochi-surface)',
          border: '1.5px solid var(--mochi-border)',
          borderRadius: '24px',
          width: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header + tabs */}
        <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: '18px', fontWeight: '700', color: 'var(--mochi-text)', margin: 0 }}>
              Export{section ? ` — ${section.name}` : ' Schedule'}
            </p>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mochi-text-muted)', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid var(--mochi-border)' }}>
            {[
              { key: 'ics', icon: <CalendarDays size={13} />, label: 'Calendar (.ics)' },
              { key: 'png', icon: <ImageIcon size={13} />, label: 'Wallpaper (.png)' },
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px',
                  fontSize: '12px', fontWeight: '700',
                  borderBottom: tab === key ? '2px solid var(--mochi-peach-dark)' : '2px solid transparent',
                  marginBottom: '-1.5px',
                  color: tab === key ? 'var(--mochi-peach-dark)' : 'var(--mochi-text-muted)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>

          {/* ── ICS tab ── */}
          {tab === 'ics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--mochi-text-muted)', margin: 0 }}>
                Adds your weekly classes as recurring events. Choose a date range so they don't repeat forever — a semester is typically 4–5 months.
              </p>

              {/* Date range */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mochi-text-muted)', marginBottom: '5px' }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setIcsError('') }}
                    style={fieldStyle}
                  />
                </div>
                <span style={{ paddingBottom: '8px', fontSize: '14px', color: 'var(--mochi-text-muted)', flexShrink: 0 }}>→</span>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mochi-text-muted)', marginBottom: '5px' }}>
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => { setEndDate(e.target.value); setIcsError('') }}
                    style={fieldStyle}
                  />
                </div>
              </div>

              {/* Info: items without times */}
              {noTimeCount > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--mochi-text-muted)', margin: 0 }}>
                  ℹ {noTimeCount} item{noTimeCount !== 1 ? 's' : ''} without a time range will be skipped.
                </p>
              )}

              {/* Error */}
              {icsError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}>
                  <AlertCircle size={12} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                  <p style={{ fontSize: '12px', color: 'var(--mochi-pink-dark)', margin: 0 }}>{icsError}</p>
                </div>
              )}

              <button
                onClick={handleExportICS}
                disabled={icsExporting || !startDate || !endDate}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '13px', fontWeight: '700',
                  background: startDate && endDate ? 'var(--mochi-lavender)' : 'var(--mochi-border)',
                  border: `1.5px solid ${startDate && endDate ? 'var(--mochi-lavender-mid)' : 'transparent'}`,
                  color: startDate && endDate ? 'var(--mochi-lavender-dark)' : 'var(--mochi-text-muted)',
                  cursor: startDate && endDate && !icsExporting ? 'pointer' : 'not-allowed',
                }}
              >
                {icsExporting
                  ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                  : <><FileDown size={13} />Export to Google Calendar</>}
              </button>
            </div>
          )}

          {/* ── PNG tab ── */}
          {tab === 'png' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--mochi-text-muted)', margin: 0 }}>
                Exports your schedule as a clean image — save it as a wallpaper or share with classmates.
              </p>

              {/* Preview (zoom: 0.5 shrinks layout footprint from 900px → 450px) */}
              <div style={{
                width: '450px',
                overflow: 'hidden',
                borderRadius: '14px',
                border: '1.5px solid var(--mochi-border)',
              }}>
                <div style={{ zoom: 0.5, pointerEvents: 'none' }}>
                  <WallpaperCanvas ref={canvasRef} items={items} section={section} />
                </div>
              </div>

              {/* Error */}
              {pngError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}>
                  <AlertCircle size={12} style={{ color: 'var(--mochi-pink-dark)', flexShrink: 0 }} />
                  <p style={{ fontSize: '12px', color: 'var(--mochi-pink-dark)', margin: 0 }}>{pngError}</p>
                </div>
              )}

              <button
                onClick={handleExportPNG}
                disabled={pngExporting}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '13px', fontWeight: '700',
                  background: 'var(--mochi-mint)',
                  border: '1.5px solid var(--mochi-mint-mid)',
                  color: 'var(--mochi-mint-dark)',
                  cursor: pngExporting ? 'not-allowed' : 'pointer',
                }}
              >
                {pngExporting
                  ? <><Loader2 size={13} className="animate-spin" />Exporting…</>
                  : <><Download size={13} />Download PNG</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
