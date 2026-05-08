import Dexie from 'dexie'

export const db = new Dexie('MochiDB')

db.version(1).stores({
  subjects:   '++id, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  flashcards: '++id, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})

// v2: add parentId to subjects for section → subsection hierarchy
db.version(2).stores({
  subjects:   '++id, parentId, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  flashcards: '++id, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})

// v3: add named decks table; add deckId index to flashcards
db.version(3).stores({
  subjects:   '++id, parentId, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  decks:      '++id, name, createdAt',
  flashcards: '++id, deckId, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})
