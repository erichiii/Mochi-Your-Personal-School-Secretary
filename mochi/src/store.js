import { create } from 'zustand'
import { db } from './db'

const useStore = create((set, get) => ({
  // ── Subjects ──────────────────────────────────────────────
  subjects: [],
  loadSubjects: async () => {
    const subjects = await db.subjects.orderBy('name').toArray()
    set({ subjects })
  },
  createSubject: async (data) => {
    const id = await db.subjects.add({ parentId: null, ...data, createdAt: Date.now() })
    await get().loadSubjects()
    return id
  },
  updateSubject: async (id, data) => {
    await db.subjects.update(id, data)
    await get().loadSubjects()
  },
  deleteSubject: async (id) => {
    const subs = await db.subjects.where('parentId').equals(id).toArray()
    for (const sub of subs) {
      await db.notes.where('subjectId').equals(sub.id).modify({ subjectId: null })
      await db.decks.where('subjectId').equals(sub.id).modify({ subjectId: null })
      await db.subjects.delete(sub.id)
    }
    await db.notes.where('subjectId').equals(id).modify({ subjectId: null })
    await db.decks.where('subjectId').equals(id).modify({ subjectId: null })
    await db.subjects.delete(id)
    await get().loadSubjects()
    await get().loadDecks()
  },

  // ── All Notes label (persisted to localStorage) ───────────
  allNotesLabel: localStorage.getItem('mochi_all_notes_label') || 'All Notes',
  setAllNotesLabel: (label) => {
    localStorage.setItem('mochi_all_notes_label', label)
    set({ allNotesLabel: label })
  },

  // ── Notes ─────────────────────────────────────────────────
  notes: [],
  activeNoteId: null,
  activeSubjectFilter: null,
  setSubjectFilter: (id) => set({ activeSubjectFilter: id }),
  loadNotes: async () => {
    const notes = await db.notes.orderBy('updatedAt').reverse().toArray()
    set({ notes })
  },
  createNote: async (data = {}) => {
    const id = await db.notes.add({
      title: '',
      content: '',
      subjectId: null,
      isPinned: false,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await get().loadNotes()
    set({ activeNoteId: id })
    return id
  },
  updateNote: async (id, data) => {
    await db.notes.update(id, { ...data, updatedAt: Date.now() })
    await get().loadNotes()
  },
  deleteNote: async (id) => {
    await db.flashcards.where('noteId').equals(id).delete()
    await db.notes.delete(id)
    const { notes, activeNoteId } = get()
    const remaining = notes.filter((n) => n.id !== id)
    set({ activeNoteId: activeNoteId === id ? (remaining[0]?.id ?? null) : activeNoteId })
    await get().loadNotes()
  },
  setActiveNote: (id) => set({ activeNoteId: id }),

  // ── Decks ─────────────────────────────────────────────────
  decks: [],
  loadDecks: async () => {
    const decks = await db.decks.orderBy('createdAt').toArray()
    set({ decks })
  },
  createDeck: async (name, subjectId = null) => {
    const id = await db.decks.add({ name, subjectId, createdAt: Date.now() })
    await get().loadDecks()
    return id
  },
  updateDeck: async (id, data) => {
    await db.decks.update(id, data)
    await get().loadDecks()
  },
  deleteDeck: async (id) => {
    await db.flashcards.where('deckId').equals(id).modify({ deckId: null })
    await db.decks.delete(id)
    if (get().activeDeckId === id) set({ activeDeckId: null })
    await get().loadDecks()
    await get().loadFlashcards()
  },
  activeDeckId: null,
  setActiveDeck: (id) => set({ activeDeckId: id }),

  // ── Flashcards ────────────────────────────────────────────
  flashcards: [],
  loadFlashcards: async () => {
    const flashcards = await db.flashcards.orderBy('createdAt').toArray()
    set({ flashcards })
  },
  createFlashcard: async (data) => {
    await db.flashcards.add({ deckId: null, noteId: null, subjectId: null, ...data, createdAt: Date.now() })
    await get().loadFlashcards()
  },
  updateFlashcard: async (id, data) => {
    await db.flashcards.update(id, data)
    await get().loadFlashcards()
  },
  deleteFlashcard: async (id) => {
    await db.flashcards.delete(id)
    await get().loadFlashcards()
  },

  // ── Tasks ─────────────────────────────────────────────────
  tasks: [],
  loadTasks: async () => {
    const tasks = await db.tasks.orderBy('createdAt').reverse().toArray()
    set({ tasks })
  },
  createTask: async (data) => {
    await db.tasks.add({ isDone: false, ...data, createdAt: Date.now(), updatedAt: Date.now() })
    await get().loadTasks()
  },
  updateTask: async (id, data) => {
    await db.tasks.update(id, { ...data, updatedAt: Date.now() })
    await get().loadTasks()
  },
  deleteTask: async (id) => {
    await db.tasks.delete(id)
    await get().loadTasks()
  },

  // ── Schedule ──────────────────────────────────────────────
  scheduleItems: [],
  loadSchedule: async () => {
    const scheduleItems = await db.schedule.orderBy('createdAt').toArray()
    set({ scheduleItems })
  },
  createScheduleItem: async (data) => {
    await db.schedule.add({ ...data, createdAt: Date.now() })
    await get().loadSchedule()
  },
  updateScheduleItem: async (id, data) => {
    await db.schedule.update(id, data)
    await get().loadSchedule()
  },
  deleteScheduleItem: async (id) => {
    await db.schedule.delete(id)
    await get().loadSchedule()
  },

  // ── Study Plans ───────────────────────────────────────────
  studyPlans: [],
  loadStudyPlans: async () => {
    const studyPlans = await db.studyPlan.orderBy('createdAt').reverse().toArray()
    set({ studyPlans })
  },
  createStudyPlan: async (data) => {
    await db.studyPlan.add({ ...data, createdAt: Date.now() })
    await get().loadStudyPlans()
  },
  deleteStudyPlan: async (id) => {
    await db.studyPlan.delete(id)
    await get().loadStudyPlans()
  },
}))

export default useStore
