# Study Plan Prompts & Context Assembly Reference

Full prompt templates and data assembly code for the study plan generator.
Read this when building `src/components/studyplan/` or the `generateStudyPlan`
function in `src/gemini.js`.

---

## Context Assembly

The study plan needs 4 pieces of data pulled from Dexie before calling Gemini:

```js
// src/gemini.js
export const generateStudyPlan = async ({ subjectId, examDate, daysAvailable }) => {
  if (!navigator.onLine) throw new Error('offline')

  // 1. Pull schedule (to avoid planning on busy class days)
  const schedule = await db.schedule.toArray()

  // 2. Pull notes for this subject
  const notes = subjectId
    ? await db.notes.where('subjectId').equals(subjectId).toArray()
    : await db.notes.toArray()

  // 3. Build schedule string
  const scheduleStr = schedule.length > 0
    ? schedule.map(s => `${s.day} ${s.time}: ${s.subject}${s.room ? ` (${s.room})` : ''}`).join('\n')
    : 'No class schedule saved yet.'

  // 4. Build topics list and content snippets
  const topicsList = notes.map(n => n.title).join(', ') || 'No notes found for this subject.'

  const noteSnippets = notes
    .slice(0, 6)   // limit context size — take first 6 notes
    .map(n => {
      const plainText = n.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''
      return `"${n.title}": ${plainText.slice(0, 300)}${plainText.length > 300 ? '...' : ''}`
    })
    .join('\n\n')

  // 5. Format exam date
  const examDateStr = new Date(examDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // 6. Build study window dates
  const studyDates = buildStudyDates(examDate, daysAvailable)

  // 7. Call Gemini
  const prompt = buildStudyPlanPrompt({
    examDateStr, daysAvailable, scheduleStr, topicsList, noteSnippets, studyDates
  })

  const model = getModel()
  const result = await model.generateContent(prompt)
  return result.response.text()
}
```

### Build Study Window Dates

```js
// Returns array of date strings for the study window, excluding exam day
const buildStudyDates = (examDate, daysAvailable) => {
  const dates = []
  const exam  = new Date(examDate)

  for (let i = daysAvailable; i >= 1; i--) {
    const d = new Date(exam)
    d.setDate(exam.getDate() - i)
    dates.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  }
  return dates
  // e.g. ["Mon, Jun 2", "Tue, Jun 3", "Wed, Jun 4", ...]
}
```

---

## Full Prompt Template

```js
const buildStudyPlanPrompt = ({
  examDateStr, daysAvailable, scheduleStr, topicsList, noteSnippets, studyDates
}) => `
You are Mochi, a warm and helpful student secretary.
Create a realistic, motivating day-by-day study plan.
Respond ONLY in clean Markdown. No preamble. Start directly with the plan.

EXAM DETAILS:
- Exam date: ${examDateStr}
- Study days available: ${daysAvailable} days before the exam
- Study window: ${studyDates.join(', ')}

CLASS SCHEDULE (avoid scheduling heavy study on days with many classes):
${scheduleStr}

TOPICS TO COVER (from saved notes):
${topicsList}

NOTES CONTENT SNIPPETS (for topic difficulty estimation):
${noteSnippets}

INSTRUCTIONS:
1. Distribute topics evenly — don't cram everything on the last day
2. Identify 1-2 hardest topics (long notes = harder) and give them 2 days each
3. Avoid scheduling more than 3 hours of study on heavy class days
4. Day before exam: light review only — no new topics
5. Include at least one "Practice & Quiz" session in the last 3 days
6. Each day must have 2-4 specific, actionable tasks

OUTPUT FORMAT — use EXACTLY this structure for each day:

## Day {N} — {date}
**Focus:** {main topic or theme for today}
**Tasks:**
- [ ] {specific task 1}
- [ ] {specific task 2}
- [ ] {specific task 3}
**Goal:** {what the student should be able to do or know by end of day}

---

After the last day, add a brief section:

## Tips for Exam Day
- {2-3 practical tips}
`.trim()
```

---

## Parsing the Plan into Tasks

After the plan is generated and approved by the user, extract tasks and push them
to the to-do list:

```js
// src/utils/studyPlanParser.js

export const extractTasksFromPlan = (planMarkdown, examDate) => {
  const lines   = planMarkdown.split('\n')
  const tasks   = []
  let   dayNum  = 0
  let   dayDate = null

  for (const line of lines) {
    // Detect day heading: "## Day 1 — Mon, Jun 2"
    const dayMatch = line.match(/^## Day (\d+) — (.+)/)
    if (dayMatch) {
      dayNum  = parseInt(dayMatch[1])
      dayDate = new Date(dayMatch[2] + ', ' + new Date().getFullYear())
      continue
    }

    // Detect task line: "- [ ] Do something"
    const taskMatch = line.match(/^- \[ \] (.+)/)
    if (taskMatch && dayDate) {
      tasks.push({
        title:        taskMatch[1].trim(),
        category:     'Study Plan',
        deadline:     dayDate.getTime(),
        effort:       3,                   // default medium effort
        priority:     null,                // let algorithm decide
        userPriority: null,
        isDone:       false,
        pomodoroCount: 0,
        createdAt:    Date.now(),
        updatedAt:    Date.now(),
      })
    }
  }

  return tasks
}
```

### Pushing to To-Do Store

```js
// In StudyPlanView.jsx — "Add all to To-Do" button handler
const handleAddToTodo = async () => {
  const tasks = extractTasksFromPlan(planContent, examDate)
  await db.tasks.bulkAdd(tasks)
  await useStore.getState().loadAll()
  showToast(`Added ${tasks.length} tasks to your to-do list!`, 'success')
}
```

---

## StudyPlanForm Fields

```jsx
// src/components/studyplan/StudyPlanForm.jsx

// Fields needed:
// 1. Subject selector (dropdown from subjects table, or "All subjects")
// 2. Exam date (date input — must be in the future)
// 3. Days available (number input, 1–30, default 7)

const [subjectId,     setSubjectId]     = useState(null)
const [examDate,      setExamDate]      = useState('')
const [daysAvailable, setDaysAvailable] = useState(7)
const [loading,       setLoading]       = useState(false)
const [error,         setError]         = useState('')

// Validation before calling Gemini
const validate = () => {
  if (!examDate)                return 'Please pick an exam date.'
  if (new Date(examDate) < new Date()) return 'Exam date must be in the future.'
  if (daysAvailable < 1)        return 'Need at least 1 study day.'
  if (daysAvailable > 30)       return 'Maximum 30 study days.'
  return null
}
```

---

## StudyPlanView Rendering

The Markdown output from Gemini should be rendered with:
1. `## Day N — date` headings styled with sky color tokens
2. `- [ ]` checkboxes rendered as actual interactive checkboxes
3. "**Focus:**" and "**Goal:**" lines styled as highlighted labels

Simple approach — render raw markdown in a styled `<div>` using `marked`:

```jsx
import { marked } from 'marked'
import DOMPurify from 'dompurify'  // npm install dompurify — sanitize AI output

// In StudyPlanView.jsx
const html = DOMPurify.sanitize(marked.parse(planContent))

<div
  className="prose max-w-none"
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

Always sanitize AI-generated HTML before using `dangerouslySetInnerHTML`.

---

## Saving the Plan to Dexie

```js
// Save the generated plan so it can be viewed later
await db.studyPlan.add({
  title:     `Study Plan — ${subjectName} — ${examDateStr}`,
  content:   planMarkdown,    // raw markdown string from Gemini
  examDate:  new Date(examDate).getTime(),
  createdAt: Date.now(),
})
```

Only one active plan is needed for v1. Clear old plans before saving a new one:

```js
await db.studyPlan.clear()  // replace, don't accumulate
await db.studyPlan.add({ ... })
```