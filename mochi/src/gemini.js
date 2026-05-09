import { GoogleGenerativeAI } from '@google/generative-ai'

const getModel = () => {
  const key = import.meta.env.VITE_GEMINI_KEY
  if (!key) throw new Error('Add VITE_GEMINI_KEY to your .env file')
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash' })
}

const parseJSON = (raw) => {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

const guardOnline = () => {
  if (!navigator.onLine) throw new Error('offline')
}

const wrapError = (e) => {
  console.error('[Mochi Gemini error]', e)

  if (e.message === 'offline') throw new Error("You're offline. AI features need internet.")

  const msg = e.message ?? ''
  const status = e.status

  const is429 =
    status === 429 ||
    msg.includes('429') ||
    msg.toLowerCase().includes('quota') ||
    msg.toLowerCase().includes('rate limit') ||
    msg.toLowerCase().includes('resource_exhausted')
  if (is429) throw new Error('Rate limit reached. Wait about a minute, then try again. (Free tier: 15 req/min)')

  const isAuthError =
    (msg.includes('API_KEY') || msg.includes('API key')) &&
    !msg.toLowerCase().includes('payload')
  if (isAuthError) throw new Error('Invalid API key. Check VITE_GEMINI_KEY in your .env file.')

  // Surface Gemini's own message — it's usually descriptive enough
  if (msg && msg !== 'Failed to fetch') throw new Error(msg)

  throw new Error('AI generation failed. Check the browser console for details.')
}

// ── Note generation ───────────────────────────────────────────
const NOTE_PROMPTS = {
  primer: (text) => `You are Mochi, a warm and helpful student secretary.
Respond in clean Markdown. No preamble. No "Here is your primer:". Start directly with the content.

Create a comprehensive PRIMER from the following document.
A primer is a structured overview containing:
- The main topic and its summary
- Key concepts and important definitions
- Related topics

Document:
${text}`,

  reviewer: (text) => `You are Mochi, a warm and helpful student secretary.
Respond in clean Markdown. No preamble. Start directly with content.

Create a REVIEWER from the following document for exam preparation.
Include:
1. **Key Facts & Definitions** — a table with Term | Definition | Notes
2. **Important Formulas / Dates / Figures** — bullet list
3. **Likely Exam Questions** — 5 questions with short answers
4. **Common Mistakes** — a "watch out for" bullet list
5. **Quick Summary** — 3 sentences max

Document:
${text}`,

  general: (text) => `You are Mochi, a warm and helpful student secretary.
Respond in clean Markdown. No preamble. Start directly with content.

Create well-organized GENERAL NOTES from the following document.
Use clear H2 headings for major sections, bullet points for details,
and bold for key terms. Include all important information.
Do not skip or summarize — capture everything relevant.

Document:
${text}`,
}

export const generateNotes = async (text, mode = 'primer') => {
  guardOnline()
  try {
    const model = getModel()
    const prompt = (NOTE_PROMPTS[mode] ?? NOTE_PROMPTS.primer)(text)
    const result = await model.generateContent(prompt)
    const candidate = result.response.candidates?.[0]
    if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'RECITATION') {
      throw new Error(`Response blocked (${candidate.finishReason}). Try reducing content or splitting into separate files.`)
    }
    return result.response.text()
  } catch (e) {
    wrapError(e)
  }
}

// ── Flashcard generation ──────────────────────────────────────
export const generateFlashcards = async (text, count = 8) => {
  guardOnline()
  try {
    const model = getModel()
    const result = await model.generateContent(
      `You are Mochi. Respond ONLY with a valid JSON array.
No markdown fences. No preamble. No explanation. Just the raw JSON array.

Create exactly ${count} flashcards from this content.
Make questions specific and testable. Answers should be 1-2 sentences max.
Vary question types: definitions, comparisons, applications, examples.

Format: [{"front": "question text", "back": "answer text"}, ...]

Content:
${text}`
    )
    return parseJSON(result.response.text())
  } catch (e) {
    wrapError(e)
  }
}

// ── Schedule parsing (vision) ─────────────────────────────────
export const generateSchedule = async (imageBase64, mimeType) => {
  guardOnline()
  try {
    const model = getModel()
    const result = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      `You are Mochi, a student schedule assistant.
Analyze this class/school schedule image and extract every schedule entry.
Respond ONLY with a valid JSON array. No markdown fences. No explanation.

Format: [{"day":"Monday","time":"9:00 AM - 10:50 AM","subject":"Mathematics","room":"Room 101"}, ...]

Day abbreviation map:
M=Monday, T=Tuesday, W=Wednesday, TH=Thursday, F=Friday, S=Saturday, SU=Sunday

IMPORTANT — multi-day rows: When a row has multiple days (e.g. "T / W" or "M / TH"), the time and room columns often contain slash-separated values in the same order (e.g. time "09:00-10:50 / 09:00-10:50", room "ONLINE / F608"). Split these into one entry PER day, matching each day to its corresponding time and room by position. If time or room has only one value, reuse it for all days.

Example: subject "NUMBER THEORY", days "T / W", time "09:00-10:50 / 09:00-10:50", room "ONLINE / F608"
→ [{"day":"Tuesday","time":"9:00 AM - 10:50 AM","subject":"NUMBER THEORY","room":"ONLINE"}, {"day":"Wednesday","time":"9:00 AM - 10:50 AM","subject":"NUMBER THEORY","room":"F608"}]

Other rules:
- day: full English day name
- time: convert 24h to "H:MM AM - H:MM AM" format. If only start time is visible, use just "H:MM AM"
- subject: preserve casing from the image
- room: room number or location if visible, otherwise use ""
- If the image is not a schedule, return []
- Include every distinct entry you can read`,
    ])
    return parseJSON(result.response.text())
  } catch (e) {
    wrapError(e)
  }
}

// ── Quiz generation ───────────────────────────────────────────
export const generateQuiz = async (text, count = 5) => {
  guardOnline()
  try {
    const model = getModel()
    const result = await model.generateContent(
      `You are Mochi. Respond ONLY with a valid JSON array.
No markdown fences. No preamble. No explanation. Just the raw JSON array.

Create ${count} multiple-choice questions from this content.
Make distractors plausible but clearly wrong on careful reflection.
Vary difficulty — some straightforward recall, some reasoning.

Format: [{"question": "...", "options": ["A text", "B text", "C text", "D text"], "answer": 0}, ...]
"answer" is the 0-based index of the correct option.

Content:
${text}`
    )
    return parseJSON(result.response.text())
  } catch (e) {
    wrapError(e)
  }
}
