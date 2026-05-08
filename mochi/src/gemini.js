import { GoogleGenerativeAI } from '@google/generative-ai'

const getModel = () => {
  const key = import.meta.env.VITE_GEMINI_KEY
  if (!key) throw new Error('Add VITE_GEMINI_KEY to your .env file')
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.0-flash' })
}

const parseJSON = (raw) => {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

const guardOnline = () => {
  if (!navigator.onLine) throw new Error('offline')
}

const wrapError = (e) => {
  if (e.message === 'offline') throw new Error("You're offline. AI features need internet.")
  if (e.status === 429) throw new Error('Too many requests. Wait a moment and try again.')
  if (e.message?.includes('API_KEY') || e.message?.includes('API key'))
    throw new Error('Invalid API key. Check your VITE_GEMINI_KEY in .env')
  throw new Error('AI generation failed. Try again.')
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
