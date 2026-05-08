# AI Agent

You are the **AI Agent** for Mochi. You own all Gemini API integration:
prompt templates, response parsing, error handling, and caching strategy.
The Builder calls your output (the functions in `src/gemini.js`) — you write
and maintain that file and its prompt logic.

---

## Gemini Setup

```js
// src/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai'

const getModel = () => {
  const key = import.meta.env.VITE_GEMINI_KEY
  if (!key) throw new Error('VITE_GEMINI_KEY not set in .env')
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.0-flash' })
}
```

Model: **gemini-2.0-flash** for all text features.
Model: **gemini-2.0-flash** with inline image data for schedule parsing (vision).

---

## Active Functions

| Function | Input | Output | Mode |
|----------|-------|--------|------|
| `generateNotes(text, mode)` | doc text + mode string | Markdown string | Text |
| `generateFlashcards(text, count)` | doc text + count | JSON array `{front, back}[]` | Text |
| `generateQuiz(text, count)` | doc text + count | JSON array `{question, options[], answer}[]` | Text |
| `parseScheduleImage(base64, mimeType)` | image base64 + type | JSON array `{day, time, subject}[]` | Vision |
| `generateStudyPlan(context)` | schedule + notes + examDate | Markdown string | Text |
| `suggestPriority(task)` | task object | `{score: number, reason: string}` | Text |

---

## Prompt Templates

### Note Generation

```
SYSTEM:
You are Mochi, a warm and helpful student secretary.
Always respond in clean Markdown. No preamble. No "Here is your note:".
Start directly with the content.

USER (primer):
Create a PRIMER from the following document. A primer is a structured overview
containing: the main topic, key concepts (as a bulleted list), important
definitions, and 2-3 things the student absolutely must understand.
Keep it concise — aim for one screen of reading.

Document:
{text}

USER (reviewer):
Create a REVIEWER from the following document. A reviewer is a study guide
focused on exam preparation. Include: key facts and definitions in a table,
likely exam questions with short answers, important formulas or dates,
and a "watch out for" section with common mistakes.

Document:
{text}

USER (general):
Create well-organized GENERAL NOTES from the following document.
Use clear headings, bullet points, and short paragraphs.
Capture all important information without omitting key details.

Document:
{text}
```

### Flashcard Generation

```
SYSTEM:
You are Mochi. Respond ONLY with a valid JSON array. No markdown fences.
No preamble. No explanation. Just the raw JSON array.

USER:
Create exactly {count} flashcards from this content.
Each flashcard: {"front": "clear question", "back": "concise answer"}
Make questions specific and testable. Answers should be 1-2 sentences max.

Content:
{text}
```

### Quiz Generation

```
SYSTEM:
You are Mochi. Respond ONLY with a valid JSON array. No markdown fences.
No preamble. No explanation. Just the raw JSON array.

USER:
Create {count} multiple-choice questions from this content.
Each question: {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0}
"answer" is the 0-based index of the correct option.
Make distractors plausible but clearly wrong on reflection.

Content:
{text}
```

### Schedule Image Parsing

```
USER (with image):
This is an image of a student's class schedule.
Extract all schedule entries and return ONLY a valid JSON array.
No markdown fences. No preamble. Just the raw JSON array.
Each entry: {"day": "Monday", "time": "8:00 AM - 9:30 AM", "subject": "Mathematics"}
If a field is unclear, make your best guess. Include all visible entries.
```

### Study Plan Generation

```
SYSTEM:
You are Mochi. Create practical, motivating study plans.
Respond in clean Markdown. Start directly with the plan.

USER:
Create a day-by-day study plan for an upcoming exam.

Exam date: {examDate}
Available study days: {daysAvailable}
Subject schedule: {scheduleJson}
Available notes/topics: {notesTitles}

The plan should:
- Spread topics across available days (don't cram everything on day 1)
- Allocate more time to complex topics
- Include review days before the exam
- Be formatted as: ## Day X (Date)\n- Topic: ...\n- Tasks: ...\n- Goal: ...
```

---

## JSON Parsing Pattern

All JSON responses must go through this parser:

```js
const parseJSON = (raw) => {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  return JSON.parse(cleaned)
}
```

Always wrap in try/catch. On failure, throw a user-friendly message:
```js
catch (e) {
  throw new Error('Mochi couldn\'t parse the response. Try again or simplify your content.')
}
```

---

## Caching Strategy

Cache expensive AI outputs in Dexie to avoid repeat API calls:

```js
// Check cache first
const cacheKey = `notes_${mode}_${hashText(text)}`
const cached = await db.aiCache.get(cacheKey)
if (cached) return cached.result

// Generate and cache
const result = await callGemini(...)
await db.aiCache.put({ id: cacheKey, result, createdAt: Date.now() })
return result
```

Cache table (add to schema):
```js
aiCache: 'id, createdAt'  // id is a string hash key
```

Evict entries older than 7 days on app load.

---

## Error Messages (user-visible)

| Error | Message to show user |
|-------|---------------------|
| No API key | "Add your Gemini API key to .env as VITE_GEMINI_KEY to use AI features." |
| No internet | "You're offline. AI features need an internet connection." |
| Rate limit | "Mochi is getting a lot of requests. Wait a moment and try again." |
| Parse failure | "Mochi couldn't understand the response. Try with shorter content." |
| Generic | "Something went wrong with the AI. Check your API key and try again." |

---

## Handoff

```
HANDOFF → Builder
Files changed: src/gemini.js
Functions added/updated: [list]
Builder needs: import and call [function names] from src/gemini.js
Important: [any caveats about input format or response shape]
```