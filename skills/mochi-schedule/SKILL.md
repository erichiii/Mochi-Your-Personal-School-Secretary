---
name: mochi-schedule
description: >
  Build guide for Mochi's Schedule Maker (Sprint 3, Days 18-19). Read this skill
  when building the schedule image upload, Gemini Vision parsing, the editable
  schedule table, .ics file export for Google Calendar, or the wallpaper PNG export.
  Trigger on "schedule", "class schedule", "timetable", ".ics", "Google Calendar",
  "wallpaper", "schedule image", or "parse schedule".
---

# Mochi Schedule Maker

**Sprint 3 — Days 18-19**
Depends on: `mochi-ai` (Gemini Vision), `mochi-db`, `mochi-ui`

## Architecture

```
src/
├── components/schedule/
│   ├── ScheduleUpload.jsx   ← image upload + Gemini Vision trigger
│   ├── ScheduleTable.jsx    ← editable Day/Time/Subject grid
│   ├── WallpaperPreview.jsx ← styled schedule for PNG export
│   └── ExportBar.jsx        ← .ics and wallpaper download buttons
├── pages/
│   └── SchedulePage.jsx
```

## Schedule Data Model

```js
// One row per class slot
{
  id: number,
  day: string,      // "Monday", "Tuesday", etc.
  time: string,     // "8:00 AM - 9:30 AM"
  subject: string,  // "Mathematics"
  room: string,     // optional, may be empty
  createdAt: number,
}
```

## Gemini Vision: Image → Schedule

```js
// src/gemini.js
export const parseScheduleImage = async (base64, mimeType) => {
  const model = getModel()
  const result = await model.generateContent([
    {
      inlineData: { data: base64, mimeType }   // e.g. "image/jpeg"
    },
    {
      text: `Extract all class schedule entries from this image.
Return ONLY a valid JSON array. No markdown, no preamble.
Each entry: {"day": "Monday", "time": "8:00 AM", "subject": "Math", "room": ""}
Include every visible entry. If a field is unclear, make your best guess.`
    }
  ])
  return parseJSON(result.response.text())
}
```

Converting image file to base64:
```js
const fileToBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = (e) => resolve(e.target.result.split(',')[1])  // strip data URL prefix
  reader.readAsDataURL(file)
})
```

## Editable Table

After parsing, show an editable table. Each cell is an `<input>`.
User can fix any parsing errors before saving.
Save to Dexie on "Save schedule" button click (not auto-save — user must confirm).

## .ics Export

```js
import { createEvents } from 'ics'

export const exportToICS = (scheduleRows) => {
  // Map day names to next occurrence dates
  const dayToDate = (dayName) => { /* find next Monday, Tuesday, etc. */ }

  const events = scheduleRows.map(row => ({
    title: row.subject,
    start: parseDateTime(dayToDate(row.day), row.time),  // [year, month, day, hour, min]
    duration: { hours: 1, minutes: 30 },
    recurrenceRule: 'FREQ=WEEKLY',
  }))

  const { error, value } = createEvents(events)
  if (error) throw error

  // Trigger download
  const blob = new Blob([value], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'mochi-schedule.ics'; a.click()
  URL.revokeObjectURL(url)
}
```

## Wallpaper PNG Export

```jsx
import { toPng } from 'html-to-image'

// WallpaperPreview renders a styled 1080x1920 (or 1242x2208) schedule
// Use a ref on the wrapper div

const exportWallpaper = async () => {
  const dataUrl = await toPng(wallpaperRef.current, { pixelRatio: 2 })
  const a = document.createElement('a')
  a.href = dataUrl; a.download = 'mochi-schedule-wallpaper.png'; a.click()
}
```

Wallpaper themes: use the `--mochi-*` pastel palette. Offer 3 presets:
- Pink (default), Lavender, Mint

## Further Reading

- `references/ics-wallpaper.md` — full ICS date parsing helpers + wallpaper layout templates
- `mochi-ai/SKILL.md` — Gemini Vision setup
- `mochi-ui/SKILL.md` — peach color tokens for schedule section