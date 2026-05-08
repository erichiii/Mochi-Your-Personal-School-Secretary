# ICS Export & Wallpaper Reference

Full implementation details for exporting the schedule as a `.ics` calendar file
and as a PNG wallpaper. Read this when building `ExportBar.jsx` or `WallpaperPreview.jsx`.

---

## ICS Export

### Install

```bash
npm install ics
```

### Day Name → Next Date

The schedule stores day names (e.g. "Monday") not actual dates.
To create a recurring calendar event, find the next occurrence of each day:

```js
// src/utils/dateHelpers.js
export const nextOccurrenceOf = (dayName) => {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const targetDay = days.indexOf(dayName)
  if (targetDay === -1) return null

  const now = new Date()
  const todayDay = now.getDay()
  let daysUntil = (targetDay - todayDay + 7) % 7
  if (daysUntil === 0) daysUntil = 7   // if today, use next week

  const result = new Date(now)
  result.setDate(now.getDate() + daysUntil)
  return result
}
```

### Parse Time String

Schedule times come as strings like "8:00 AM", "1:30 PM - 3:00 PM".
Convert to a `[year, month, day, hour, minute]` array for the `ics` package:

```js
// src/utils/dateHelpers.js
export const parseTimeString = (timeStr) => {
  // Handle "8:00 AM - 9:30 AM" — take only the start time
  const startTime = timeStr.split('-')[0].trim()
  const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return [8, 0]   // fallback

  let [, hours, minutes, period] = match
  hours = parseInt(hours)
  minutes = parseInt(minutes)

  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0

  return [hours, minutes]
}

// Combine date + time into ics format array
export const toICSDate = (date, timeStr) => {
  const [hours, minutes] = parseTimeString(timeStr)
  return [
    date.getFullYear(),
    date.getMonth() + 1,   // ics uses 1-based months
    date.getDate(),
    hours,
    minutes,
  ]
}
```

### Full ICS Export Function

```js
// src/utils/icsExport.js
import { createEvents } from 'ics'
import { nextOccurrenceOf, toICSDate } from './dateHelpers'

export const exportScheduleToICS = (scheduleRows) => {
  const events = scheduleRows
    .filter(row => row.day && row.time && row.subject)
    .map(row => {
      const date = nextOccurrenceOf(row.day)
      if (!date) return null

      return {
        title: row.subject,
        location: row.room || '',
        start: toICSDate(date, row.time),
        duration: { hours: 1, minutes: 30 },   // default class duration
        recurrenceRule: 'FREQ=WEEKLY',
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }
    })
    .filter(Boolean)

  const { error, value } = createEvents(events)

  if (error) {
    console.error('ICS generation error:', error)
    throw new Error('Could not generate calendar file. Check schedule data.')
  }

  // Trigger browser download
  const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'mochi-schedule.ics'
  a.click()
  URL.revokeObjectURL(url)
}
```

### Testing

After export, open the `.ics` file or drag it into Google Calendar.
Google Calendar should show weekly recurring events for each class.

---

## Wallpaper PNG Export

### Install

```bash
npm install html-to-image
```

### Wallpaper Layout Component

The wallpaper is a styled React component rendered off-screen (or on-screen in a preview).
Use a `ref` to capture it as a PNG:

```jsx
// src/components/schedule/WallpaperPreview.jsx
import { forwardRef } from 'react'

// Standard phone wallpaper ratio: 9:19.5 (iPhone) or 9:16 (Android)
// At 2x pixel ratio this renders at ~1080 x 2340px

const THEME_PRESETS = {
  pink:     { bg: '#FFF0F5', accent: '#E8789A', card: '#FFD6E0', text: '#3D2C35', border: '#FFB3C6' },
  lavender: { bg: '#F5F0FF', accent: '#9B7FD4', card: '#E8DEFF', text: '#3D2C35', border: '#C9B8F5' },
  mint:     { bg: '#F0FFF8', accent: '#5BB98B', card: '#D4F5E9', text: '#3D2C35', border: '#A8E6CF' },
}

const WallpaperPreview = forwardRef(({ scheduleRows, theme = 'pink' }, ref) => {
  const t = THEME_PRESETS[theme] || THEME_PRESETS.pink

  // Group rows by day
  const byDay = scheduleRows.reduce((acc, row) => {
    if (!acc[row.day]) acc[row.day] = []
    acc[row.day].push(row)
    return acc
  }, {})

  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const sortedDays = DAY_ORDER.filter(d => byDay[d])

  return (
    <div
      ref={ref}
      style={{
        width: '390px',          // will be 2x via pixelRatio
        minHeight: '844px',
        background: t.bg,
        padding: '48px 24px 32px',
        fontFamily: 'Nunito, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '32px', marginBottom: '4px' }}>🍡</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: t.accent, fontFamily: 'Fraunces, serif' }}>
          My Schedule
        </div>
      </div>

      {/* Day groups */}
      {sortedDays.map(day => (
        <div key={day}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: t.accent,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: '6px',
          }}>
            {day}
          </div>
          {byDay[day].map((row, i) => (
            <div
              key={i}
              style={{
                background: t.card,
                border: `1.5px solid ${t.border}`,
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: t.text }}>
                {row.subject}
              </div>
              <div style={{ fontSize: '12px', color: t.accent, fontWeight: 600 }}>
                {row.time}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
})

export default WallpaperPreview
```

### Export Handler

```js
// In ExportBar.jsx or SchedulePage.jsx
import { toPng } from 'html-to-image'

const wallpaperRef = useRef()

const handleExportWallpaper = async () => {
  try {
    const dataUrl = await toPng(wallpaperRef.current, {
      pixelRatio: 3,           // 3x = ~1170 x 2532 (iPhone 14 size)
      backgroundColor: null,   // use the component's own background
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'mochi-schedule-wallpaper.png'
    a.click()
  } catch (e) {
    console.error('Wallpaper export failed:', e)
    throw new Error('Could not export wallpaper. Try again.')
  }
}
```

### Theme Switcher UI

```jsx
// In SchedulePage.jsx — above or below the wallpaper preview
const [wallpaperTheme, setWallpaperTheme] = useState('pink')

const THEMES = [
  { key: 'pink',     color: '#FFD6E0', label: 'Pink'     },
  { key: 'lavender', color: '#E8DEFF', label: 'Lavender' },
  { key: 'mint',     color: '#D4F5E9', label: 'Mint'     },
]

// Render 3 color swatches to pick theme before exporting
```

---

## ExportBar Component

```jsx
// src/components/schedule/ExportBar.jsx
export default function ExportBar({ scheduleRows, wallpaperRef }) {
  const [exporting, setExporting] = useState(false)

  const handleICS = async () => {
    try {
      exportScheduleToICS(scheduleRows)
      // show toast: "Calendar file downloaded!"
    } catch (e) {
      // show error toast
    }
  }

  const handleWallpaper = async () => {
    setExporting(true)
    try {
      await handleExportWallpaper(wallpaperRef)
      // show toast: "Wallpaper saved!"
    } catch (e) {
      // show error
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleICS} className="..." style={{ background: 'var(--mochi-sky)', color: 'var(--mochi-sky-dark)' }}>
        <Calendar size={13} />
        Export to Google Calendar
      </button>
      <button onClick={handleWallpaper} disabled={exporting} className="..." style={{ background: 'var(--mochi-peach)', color: 'var(--mochi-peach-dark)' }}>
        {exporting ? <Loader size={13} className="spin" /> : <Image size={13} />}
        Save as Wallpaper
      </button>
    </div>
  )
}
```

---

## Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| ICS shows wrong dates | `nextOccurrenceOf` returning today | Add `if (daysUntil === 0) daysUntil = 7` |
| ICS times off by 12hr | AM/PM parsing wrong | Check 12:00 AM/PM edge cases in `parseTimeString` |
| Wallpaper cuts off | Container not tall enough | Use `minHeight` not `height` in wallpaper component |
| Wallpaper fonts wrong | Google Fonts not loaded in canvas | Embed fonts as base64 or use system fonts only |
| `toPng` returns blank | Component not mounted | Ensure `wallpaperRef.current` is not null before calling |
| Low resolution PNG | Default pixelRatio is 1 | Set `pixelRatio: 3` in `toPng` options |