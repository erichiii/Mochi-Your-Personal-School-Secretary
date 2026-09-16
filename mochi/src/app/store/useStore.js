import { create } from 'zustand'
import { db } from '../../shared/lib/db'

const useStore = create((set, get) => ({
  // ── Theme ─────────────────────────────────────────────────
  theme: localStorage.getItem('mochi_theme') || 'light',
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('mochi_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },


  // ── Sticky Notes (scratchpad widgets) ────────────────────
  stickyNotes: JSON.parse(localStorage.getItem('mochi_sticky_notes') || '[]'),
  createStickyNote: () => {
    const COLORS = ['peach', 'mint', 'lavender', 'pink', 'sky']
    const existing = get().stickyNotes
    const color = COLORS[existing.length % COLORS.length]
    const note = {
      id: crypto.randomUUID(),
      content: '',
      color,
      x: 80 + (existing.length % 5) * 24,
      y: 80 + (existing.length % 5) * 24,
      width: 216,
      height: 180,
    }
    const next = [...existing, note]
    localStorage.setItem('mochi_sticky_notes', JSON.stringify(next))
    set({ stickyNotes: next })
  },
  updateStickyNote: (id, data) => {
    const next = get().stickyNotes.map((n) => n.id === id ? { ...n, ...data } : n)
    localStorage.setItem('mochi_sticky_notes', JSON.stringify(next))
    set({ stickyNotes: next })
  },
  deleteStickyNote: (id) => {
    const next = get().stickyNotes.filter((n) => n.id !== id)
    localStorage.setItem('mochi_sticky_notes', JSON.stringify(next))
    set({ stickyNotes: next })
  },
  pomodoro: JSON.parse(localStorage.getItem('mochi_pomodoro') || '{"taskId":null,"isRunning":false,"isBreak":false,"isLongBreak":false,"secondsLeft":1500,"sessionPomos":0,"focusMinutes":25}'),
  setPomodoro: (data) => {
    const next = { ...get().pomodoro, ...data }
    localStorage.setItem('mochi_pomodoro', JSON.stringify(next))
    set({ pomodoro: next })
  },
  startPomodoro: (taskId) => {
    const current = get().pomodoro
    const next = current.taskId === taskId
      ? { ...current, isRunning: !current.isRunning }
      : { taskId, isRunning: false, isBreak: false, isLongBreak: false, secondsLeft: current.focusMinutes * 60, sessionPomos: 0, focusMinutes: current.focusMinutes }
    localStorage.setItem('mochi_pomodoro', JSON.stringify(next))
    set({ pomodoro: next })
  },
  setPomodoroFocusMinutes: (minutes) => {
    const focusMinutes = Math.max(1, Math.min(120, Number(minutes) || 25))
    const current = get().pomodoro
    const next = { ...current, focusMinutes, ...(current.isRunning || current.isBreak ? {} : { secondsLeft: focusMinutes * 60 }) }
    localStorage.setItem('mochi_pomodoro', JSON.stringify(next))
    set({ pomodoro: next })
  },
  closePomodoro: () => {
    const next = { ...get().pomodoro, taskId: null, isRunning: false }
    localStorage.setItem('mochi_pomodoro', JSON.stringify(next))
    set({ pomodoro: next })
  },

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
    const allSubjects = await db.subjects.toArray()
    const descendants = []
    const collect = (parentId) => {
      const children = allSubjects.filter((s) => s.parentId === parentId)
      for (const child of children) {
        descendants.push(child.id)
        collect(child.id)
      }
    }
    collect(id)

    for (const subId of descendants) {
      await db.notes.where('subjectId').equals(subId).modify({ subjectId: null })
      await db.decks.where('subjectId').equals(subId).modify({ subjectId: null })
      await db.subjects.delete(subId)
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

  // ── Deck Groups (independent from notes subjects) ─────────
  deckGroups: [],
  loadDeckGroups: async () => {
    const deckGroups = await db.deckGroups.orderBy('createdAt').toArray()
    set({ deckGroups })
  },
  createDeckGroup: async (name, color) => {
    const id = await db.deckGroups.add({ name, color: color || '#C9B8F5', createdAt: Date.now() })
    await get().loadDeckGroups()
    return id
  },
  updateDeckGroup: async (id, data) => {
    await db.deckGroups.update(id, data)
    await get().loadDeckGroups()
  },
  deleteDeckGroup: async (id) => {
    await db.decks.where('groupId').equals(id).modify({ groupId: null })
    await db.deckGroups.delete(id)
    await get().loadDeckGroups()
    await get().loadDecks()
  },

  // ── Decks ─────────────────────────────────────────────────
  decks: [],
  loadDecks: async () => {
    const decks = await db.decks.orderBy('createdAt').toArray()
    set({ decks })
  },
  createDeck: async (name, groupId = null) => {
    const id = await db.decks.add({ name, groupId, subjectId: null, createdAt: Date.now() })
    await get().loadDecks()
    return id
  },
  updateDeck: async (id, data) => {
    await db.decks.update(id, data)
    await get().loadDecks()
  },
  deleteDeck: async (id) => {
    await db.flashcards.where('deckId').equals(id).delete()
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
    await db.tasks.add({
      title: '',
      category: '',
      deadline: null,
      additionalNotes: '',
      effort: 3,
      priority: 0,
      userPriority: null,
      pomodoroCount: 0,
      reminder: null,
      isDone: false,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
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

  // ── Schedule Sections ─────────────────────────────────────
  scheduleSections: [],
  loadScheduleSections: async () => {
    const scheduleSections = await db.scheduleSections.orderBy('createdAt').toArray()
    set({ scheduleSections })
  },
  createScheduleSection: async (name, color) => {
    const id = await db.scheduleSections.add({ name, color, isActive: false, createdAt: Date.now() })
    await get().loadScheduleSections()
    return id
  },
  updateScheduleSection: async (id, data) => {
    await db.scheduleSections.update(id, data)
    await get().loadScheduleSections()
  },
  setActiveScheduleSection: async (id) => {
    await db.transaction('rw', db.scheduleSections, async () => {
      await db.scheduleSections.toCollection().modify({ isActive: false })
      await db.scheduleSections.update(id, { isActive: true })
    })
    await get().loadScheduleSections()
  },
  deleteScheduleSection: async (id) => {
    await db.schedule.where('sectionId').equals(id).modify({ sectionId: null })
    await db.scheduleSections.delete(id)
    await get().loadScheduleSections()
    await get().loadSchedule()
  },

  // ── Study Plans ───────────────────────────────────────────
  studyPlans: [],
  loadStudyPlans: async () => {
    const studyPlans = await db.studyPlan.orderBy('createdAt').reverse().toArray()
    set({ studyPlans })
  },
  createStudyPlan: async (data) => {
    const id = await db.studyPlan.add({ ...data, createdAt: Date.now() })
    await get().loadStudyPlans()
    return id
  },
  updateStudyPlan: async (id, data) => {
    await db.studyPlan.update(id, data)
    await get().loadStudyPlans()
  },
  deleteStudyPlan: async (id) => {
    await db.studyPlan.delete(id)
    await get().loadStudyPlans()
  },
}))

export default useStore
