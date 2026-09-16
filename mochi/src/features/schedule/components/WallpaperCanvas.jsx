import { forwardRef } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SECTION_PALETTE = {
  lavender: { pageBg: '#EDE9F8', headerText: '#6B5FA8', dayBg: '#E3DDF5', dayText: '#6B5FA8', dayBorder: '#C9B8F5' },
  mint:     { pageBg: '#E6F4EE', headerText: '#3D8A6A', dayBg: '#D8EDDF', dayText: '#3D8A6A', dayBorder: '#A8D9BC' },
  sky:      { pageBg: '#E0F0FB', headerText: '#3A7DB5', dayBg: '#D0E8F7', dayText: '#3A7DB5', dayBorder: '#A0C8EE' },
  pink:     { pageBg: '#FFE8F0', headerText: '#C4547A', dayBg: '#FFD8E6', dayText: '#C4547A', dayBorder: '#F0A8C0' },
  peach:    { pageBg: '#FFF0E0', headerText: '#C4743A', dayBg: '#FFDFC0', dayText: '#C4743A', dayBorder: '#F0C098' },
}

const DEFAULT_PALETTE = {
  pageBg: '#FFF8F0', headerText: '#3D2C35', dayBg: '#F5EDE5', dayText: '#7A5A68', dayBorder: '#E8D4C8',
}

function parseSort(t) {
  if (!t) return 0
  const m = t.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = m[2] ? parseInt(m[2]) : 0
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

const WallpaperCanvas = forwardRef(function WallpaperCanvas({ items = [], section, variant = 'desktop' }, ref) {
  const pal = section ? (SECTION_PALETTE[section.color] ?? DEFAULT_PALETTE) : DEFAULT_PALETTE

  const byDay = {}
  for (const day of DAYS) {
    const dayItems = items
      .filter((i) => i.day === day)
      .sort((a, b) => parseSort(a.time) - parseSort(b.time))
    if (dayItems.length) byDay[day] = dayItems
  }
  const activeDays = DAYS.filter((d) => byDay[d])

  // ── Mobile (portrait, 390 px) ────────────────────────────────
  if (variant === 'mobile') {
    return (
      <div
        ref={ref}
        style={{
          width: '390px',
          background: pal.pageBg,
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: '52px 20px 36px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', color: pal.headerText, opacity: 0.5, marginBottom: '8px' }}>
            Mochi · Schedule
          </div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '26px', fontWeight: '800', color: pal.headerText, lineHeight: 1.15 }}>
            {section?.name ?? 'My Schedule'}
          </div>
          <div style={{ fontSize: '11px', color: pal.headerText, opacity: 0.45, marginTop: '6px' }}>
            {items.length} class{items.length !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Days — vertical list */}
        {activeDays.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeDays.map((day) => (
              <div key={day}>
                {/* Day pill */}
                <div style={{
                  display: 'inline-block',
                  background: pal.dayBg,
                  border: `1.5px solid ${pal.dayBorder}`,
                  borderRadius: '16px',
                  padding: '5px 14px',
                  fontSize: '10px', fontWeight: '800',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: pal.dayText,
                  marginBottom: '7px',
                }}>
                  {day}
                </div>

                {/* Class cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {byDay[day].map((item, i) => (
                    <div key={i} style={{
                      background: '#FFFFFF',
                      border: `1.5px solid ${pal.dayBorder}`,
                      borderRadius: '12px',
                      padding: '9px 13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#2D2030', lineHeight: 1.3, wordBreak: 'break-word' }}>
                          {item.subject}
                        </div>
                        {item.time && (
                          <div style={{ fontSize: '10px', color: '#999', marginTop: '3px' }}>
                            {item.time}
                          </div>
                        )}
                      </div>
                      {item.room && (
                        <div style={{
                          flexShrink: 0,
                          fontSize: '9px', fontWeight: '700',
                          color: pal.dayText,
                          background: pal.dayBg,
                          borderRadius: '8px',
                          padding: '2px 8px',
                        }}>
                          {item.room}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: pal.headerText, opacity: 0.4, textAlign: 'center', padding: '32px 0' }}>
            No schedule items
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '28px', fontSize: '9px', color: pal.headerText, opacity: 0.3, textAlign: 'center', fontStyle: 'italic' }}>
          made with Mochi
        </div>
      </div>
    )
  }

  // ── Desktop (landscape, 900 px) ──────────────────────────────
  return (
    <div
      ref={ref}
      style={{
        width: '900px',
        background: pal.pageBg,
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '36px 32px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', color: pal.headerText, opacity: 0.55, marginBottom: '6px' }}>
          Mochi · Schedule
        </div>
        <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '30px', fontWeight: '800', color: pal.headerText, lineHeight: 1.1 }}>
          {section?.name ?? 'Weekly Schedule'}
        </div>
        <div style={{ fontSize: '12px', color: pal.headerText, opacity: 0.5, marginTop: '6px' }}>
          {items.length} class{items.length !== 1 ? 'es' : ''} · {activeDays.length} day{activeDays.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Day columns */}
      {activeDays.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeDays.length}, 1fr)`, gap: '10px', alignItems: 'start' }}>
          {activeDays.map((day) => (
            <div key={day}>
              <div style={{
                background: pal.dayBg, border: `1.5px solid ${pal.dayBorder}`, borderRadius: '20px',
                padding: '4px 0', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: pal.dayText, textAlign: 'center', marginBottom: '8px',
              }}>
                {day.slice(0, 3)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {byDay[day].map((item, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: `1.5px solid ${pal.dayBorder}`, borderRadius: '12px', padding: '9px 11px' }}>
                    {item.time && (
                      <div style={{ fontSize: '9px', color: '#999', marginBottom: '4px', fontWeight: '600' }}>{item.time}</div>
                    )}
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#2D2030', lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {item.subject}
                    </div>
                    {item.room && (
                      <div style={{ display: 'inline-block', marginTop: '5px', fontSize: '9px', fontWeight: '600', color: pal.dayText, background: pal.dayBg, borderRadius: '8px', padding: '1px 6px' }}>
                        {item.room}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: pal.headerText, opacity: 0.4, textAlign: 'center', padding: '32px 0' }}>
          No schedule items
        </div>
      )}

      <div style={{ marginTop: '24px', fontSize: '9px', color: pal.headerText, opacity: 0.3, textAlign: 'right', fontStyle: 'italic' }}>
        made with Mochi
      </div>
    </div>
  )
})

export default WallpaperCanvas
