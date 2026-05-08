# Priority Algorithm Reference

Full implementation of Mochi's smart task prioritization system.
Read this when building `src/utils/priority.js` or the to-do sort logic.

---

## Scoring Formula

Priority is a **0–100 score**. Higher = do this sooner.
Three components combine to produce the final score:

```
priority = urgency (0–50) + effort (0–30) + userBoost (0–20)
         = capped at 100
```

### Component 1 — Urgency (0–50 pts)

Based on days remaining until deadline:

```js
const urgencyScore = (deadline) => {
  const msPerDay   = 86_400_000
  const daysLeft   = (deadline - Date.now()) / msPerDay

  if (daysLeft <= 0)   return 50   // overdue
  if (daysLeft <= 1)   return 45   // due today/tomorrow
  if (daysLeft <= 3)   return 35   // due this week (early)
  if (daysLeft <= 7)   return 25   // due next week
  if (daysLeft <= 14)  return 15   // due in 2 weeks
  return 5                          // far future
}
```

### Component 2 — Effort (0–30 pts)

Harder tasks score higher — they need to be started sooner:

```js
const effortScore = (effort) => {
  // effort is 1–5 (1 = very easy, 5 = very hard)
  return Math.round((effort / 5) * 30)
  // 1 → 6 pts,  2 → 12 pts,  3 → 18 pts,  4 → 24 pts,  5 → 30 pts
}
```

### Component 3 — User boost (0–20 pts)

Optional manual override. When the user sets a priority (1–5 stars):

```js
const userBoostScore = (userPriority) => {
  if (userPriority == null) return 0       // no override = no boost
  return Math.round((userPriority / 5) * 20)
  // 1 → 4 pts,  2 → 8 pts,  3 → 12 pts,  4 → 16 pts,  5 → 20 pts
}
```

---

## Full Function

```js
// src/utils/priority.js

export const computePriority = (task) => {
  const urgency   = urgencyScore(task.deadline)
  const effort    = effortScore(task.effort ?? 3)
  const userBoost = userBoostScore(task.userPriority)

  return Math.min(100, urgency + effort + userBoost)
}

export const urgencyScore = (deadline) => {
  const msPerDay = 86_400_000
  const daysLeft = (deadline - Date.now()) / msPerDay
  if (daysLeft <= 0)  return 50
  if (daysLeft <= 1)  return 45
  if (daysLeft <= 3)  return 35
  if (daysLeft <= 7)  return 25
  if (daysLeft <= 14) return 15
  return 5
}

export const effortScore = (effort) =>
  Math.round((effort / 5) * 30)

export const userBoostScore = (userPriority) =>
  userPriority == null ? 0 : Math.round((userPriority / 5) * 20)
```

---

## Sorting Tasks

```js
// src/store.js — inside the tasks store slice
getSortedTasks: () => {
  const { tasks } = get()
  return [...tasks]
    .map(t => ({ ...t, _score: computePriority(t) }))
    .sort((a, b) => {
      // Done tasks always go to the bottom
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
      // Sort by score descending
      return b._score - a._score
    })
},
```

---

## Priority Badge Labels & Colors

| Score | Label | Background | Text |
|-------|-------|-----------|------|
| 70–100 | 🔴 Urgent | `--mochi-pink` | `--mochi-pink-dark` |
| 40–69 | 🟡 Soon | `--mochi-peach` | `--mochi-peach-dark` |
| 0–39 | 🟢 Later | `--mochi-mint` | `--mochi-mint-dark` |

```js
export const priorityMeta = (score) => {
  if (score >= 70) return { label: 'Urgent', bg: 'var(--mochi-pink)',  text: 'var(--mochi-pink-dark)'  }
  if (score >= 40) return { label: 'Soon',   bg: 'var(--mochi-peach)', text: 'var(--mochi-peach-dark)' }
  return              { label: 'Later',  bg: 'var(--mochi-mint)',  text: 'var(--mochi-mint-dark)'  }
}
```

---

## AI Priority Suggestion (Optional)

If the user clicks "Let Mochi decide" instead of setting priority manually:

```js
// src/gemini.js
export const suggestPriority = async (task) => {
  const model = getModel()
  const deadline = task.deadline
    ? new Date(task.deadline).toDateString()
    : 'No deadline set'

  const prompt = `
You are Mochi. Respond ONLY with a valid JSON object. No markdown. No preamble.
Suggest a priority score 0-100 and a brief reason for this task.

Task:
- Title: ${task.title}
- Deadline: ${deadline}
- Effort: ${task.effort ?? 'unknown'}/5
- Category: ${task.category ?? 'none'}

Format: {"score": 75, "reason": "Due soon and requires significant effort"}
  `.trim()

  const result = await model.generateContent(prompt)
  return parseJSON(result.response.text())
  // Returns: { score: number, reason: string }
}
```

UI flow: button "Let Mochi decide" → spinner → show `reason` as tooltip → update `userPriority` in store.

---

## Pomodoro Count Influence (Future)

Not in v1, but designed for easy addition:
Tasks with more `pomodoroCount` completed relative to estimated effort
could reduce their urgency score slightly — acknowledging work already done.

```js
// Future enhancement sketch:
const progressDiscount = Math.min(10, task.pomodoroCount * 2)
return Math.max(0, Math.min(100, urgency + effort + userBoost - progressDiscount))
```

---

## Edge Cases

| Case | Handling |
|------|---------|
| No deadline set | `urgencyScore` receives `undefined` → `daysLeft` = `NaN` → returns `5` (lowest urgency) |
| Effort not set | Default to `3` (medium) in `computePriority` |
| userPriority = 0 | Treated as "no override" (same as `null`). Min meaningful value is 1. |
| Overdue task | Score = 50 + effort + userBoost, always shown at the top |
| All tasks overdue | Sort by effort score as tiebreaker |