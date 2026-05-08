---
name: mochi-studyplan
description: >
  Build guide for Mochi's Study Plan generator (Sprint 3, Days 20-21). Read this
  skill when building the study plan feature — exam date input, Gemini reading
  schedule and notes data, generating the plan, rendering it, and pushing tasks
  to the to-do section. Trigger on "study plan", "exam prep", "review schedule",
  "generate a plan", "what should I study", or "study plan generator".
---

# Mochi Study Plan

**Sprint 3 — Days 20-21**
Depends on: `mochi-ai`, `mochi-db` (reads notes + schedule), `mochi-todo` (pushes tasks)

## Architecture

```
src/
├── components/studyplan/
│   ├── StudyPlanForm.jsx    ← exam date + subject input
│   ├── StudyPlanView.jsx    ← rendered plan with day sections
│   └── PlanTaskCard.jsx     ← task card within the plan
├── pages/
│   └── StudyPlanPage.jsx
```

## Data Flow

```
User inputs exam date + selects subject
       ↓
Mochi reads: schedule rows + notes titles + content summaries
       ↓
Gemini generates Markdown study plan
       ↓
Plan rendered in StudyPlanView
       ↓
User clicks "Add to to-do" → tasks pushed to tasks table
```

## Gemini Context Assembly

```js
export const generateStudyPlan = async ({ examDate, subjectId, daysAvailable }) => {
  // Pull context from Dexie
  const schedule = await db.schedule.toArray()
  const notes = await db.notes
    .where('subjectId').equals(subjectId)
    .toArray()

  const context = {
    examDate: new Date(examDate).toDateString(),
    daysAvailable,
    schedule: schedule.map(s => `${s.day} ${s.time}: ${s.subject}`).join('\n'),
    topics: notes.map(n => n.title).join(', '),
    notesSummary: notes.slice(0, 5)
      .map(n => `${n.title}: ${n.content?.replace(/<[^>]+>/g, '').slice(0, 200)}`)
      .join('\n'),
  }

  // See mochi-ai/references/prompts.md for full prompt
  return callGemini(STUDY_PLAN_PROMPT, context)
}
```

## Pushing Tasks to To-Do

When user approves the plan, parse it and create tasks:

```js
const pushPlanToTodo = async (planMarkdown) => {
  // Parse "- Task: ..." lines from the plan
  const taskLines = planMarkdown
    .split('\n')
    .filter(line => line.match(/^- (Task|Review|Study|Practice):/i))
    .map(line => line.replace(/^- (Task|Review|Study|Practice):\s*/i, '').trim())

  const tasks = taskLines.map((title, i) => ({
    title,
    category: 'Study Plan',
    deadline: examDate - (taskLines.length - i) * 86400000,  // spread before exam
    effort: 3,
    priority: null,  // let scoring algorithm decide
    isDone: false,
    pomodoroCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))

  await db.tasks.bulkAdd(tasks)
  await useStore.getState().loadAll()
}
```

## Further Reading

- `references/plan-prompts.md` — full study plan prompt template
- `mochi-ai/SKILL.md` — Gemini integration
- `mochi-todo/SKILL.md` — task data model and store actions