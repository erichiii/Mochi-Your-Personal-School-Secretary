---
name: mochi-ai
description: >
  Gemini API integration patterns for Mochi. Read this skill before writing any
  AI-powered feature — note generation, flashcard generation, quiz generation,
  schedule image parsing, study plan creation, or priority suggestions. Covers
  the API setup, prompt templates, JSON parsing, caching, error handling, and
  offline detection. Trigger on any task involving "AI", "Gemini", "generate",
  "let Mochi create", or any feature that calls the Gemini API.
---

# Mochi AI Integration

## Setup

```js
// src/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai'

const getModel = () => {
  const key = import.meta.env.VITE_GEMINI_KEY
  if (!key) throw new Error('Add VITE_GEMINI_KEY to your .env file')
  return new GoogleGenerativeAI(key)
    .getGenerativeModel({ model: 'gemini-2.0-flash' })
}
```

API key lives in `.env` as `VITE_GEMINI_KEY`. Never hardcode it.
Direct browser calls are safe for localhost (v1). For deployment, move to serverless functions.

## Offline Guard

Always check connectivity before calling the API:

```js
if (!navigator.onLine) {
  throw new Error('offline')  // caught by component, shows offline message
}
```

## Active Functions

| Function | Mode | Returns |
|----------|------|---------|
| `generateNotes(text, mode)` | text | Markdown string |
| `generateFlashcards(text, count)` | text | `{front, back}[]` |
| `generateQuiz(text, count)` | text | `{question, options[], answer}[]` |
| `parseScheduleImage(base64, mimeType)` | vision | `{day, time, subject}[]` |
| `generateStudyPlan(context)` | text | Markdown string |
| `suggestPriority(task)` | text | `{score: number, reason: string}` |

## JSON Parsing

All functions that return structured data must use this parser:

```js
const parseJSON = (raw) => {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
```

## Error Handling

```js
try {
  const result = await model.generateContent(prompt)
  return result.response.text()
} catch (e) {
  if (e.message === 'offline') throw new Error('You\'re offline. AI features need internet.')
  if (e.status === 429) throw new Error('Too many requests. Wait a moment and try again.')
  throw new Error('AI generation failed. Check your API key and try again.')
}
```

## UI Pattern (AI Panel)

```jsx
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

const handleGenerate = async () => {
  setLoading(true)
  setError('')
  try {
    const result = await generateNotes(text, mode)
    // use result
  } catch (e) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}
```

Loading state: show spinner + disable button
Error state: show pink error box with message
Success: insert result into editor or store

## Further Reading

- `references/prompts.md` — all prompt templates in full
- `agents/ai-agent.md` — AI Agent instructions for deep prompt work