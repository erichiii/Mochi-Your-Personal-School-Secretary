---
name: mochi-todo
description: >
  Build guide for Mochi's To-Do section (Sprint 3, Days 15-17). Read this skill
  when building tasks, the priority scoring system, the pomodoro timer, or anything
  related to task management. Trigger on "to-do", "tasks", "deadline", "priority",
  "pomodoro", "effort", "task list", or "smart prioritization".
---

# Mochi To-Do Section

**Sprint 3 — Days 15-17**
Build after the notes section is complete.

## Architecture

```
src/
├── components/todo/
│   ├── TaskList.jsx         ← sorted list of task cards
│   ├── TaskCard.jsx         ← individual task with pomodoro
│   ├── TaskForm.jsx         ← add/edit task form
│   └── PomodoroTimer.jsx    ← per-task 25/5 timer
├── pages/
│   └── TodoPage.jsx
```

## Task Data Model

```js
{
  id: number,          // auto-increment
  title: string,
  category: string,    // e.g. "Math", "Personal", free-form
  deadline: number,    // Unix timestamp (ms)
  effort: number,      // 1-5 (1 = very easy, 5 = very hard)
  priority: number,    // 0-100 computed score (or user override)
  userPriority: number|null,  // null = let Mochi decide
  isDone: boolean,
  pomodoroCount: number,      // how many pomodoros completed
  createdAt: number,
  updatedAt: number,
}
```

## Priority Scoring Algorithm

```js
// src/utils/priority.js
export const computePriority = (task) => {
  const now = Date.now()
  const msPerDay = 86400000

  // Urgency: 0-50 points based on days until deadline
  const daysLeft = (task.deadline - now) / msPerDay
  const urgency = daysLeft <= 0    ? 50
                : daysLeft <= 1    ? 45
                : daysLeft <= 3    ? 35
                : daysLeft <= 7    ? 25
                : daysLeft <= 14   ? 15
                :                    5

  // Effort: 0-30 points (harder tasks score higher — they need more time)
  const effortScore = (task.effort / 5) * 30

  // User override: if set, weight it heavily
  const userScore = task.userPriority != null ? task.userPriority * 0.2 : 0

  return Math.min(100, Math.round(urgency + effortScore + userScore))
}
```

Tasks are sorted by priority score descending. Done tasks are pushed to the bottom.

## Pomodoro Timer

```
Standard pomodoro: 25 min focus → 5 min break → repeat
After 4 pomodoros: 25 min focus → 15 min long break
```

State per task (local, not persisted — resets on refresh):
```js
{
  isRunning: boolean,
  isBreak: boolean,
  secondsLeft: number,   // starts at 25*60 or 5*60
  pomodorosThisSession: number,
}
```

On pomodoro complete: increment `task.pomodoroCount` in Dexie via store.

## UI Colors (Mint family)

Use mint tokens for the to-do section:
- Active/selected tasks: `--mochi-mint` background
- Priority badge: varies by score (mint = low, peach = medium, pink = high)
- Done tasks: muted text + strikethrough

## Priority Badge Colors

```js
const priorityColor = (score) =>
  score >= 70 ? { bg: 'var(--mochi-pink)',   text: 'var(--mochi-pink-dark)'  }
: score >= 40 ? { bg: 'var(--mochi-peach)',  text: 'var(--mochi-peach-dark)' }
:               { bg: 'var(--mochi-mint)',   text: 'var(--mochi-mint-dark)'  }
```

## Further Reading

- `references/priority-algorithm.md` — extended algorithm with AI assist option
- `mochi-ui/SKILL.md` — mint color tokens and component patterns
- `mochi-db/SKILL.md` — tasks schema and store actions