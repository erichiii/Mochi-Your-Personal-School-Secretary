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

// v4: add subjectId index to decks for subject-grouped sidebar
db.version(4).stores({
  subjects:   '++id, parentId, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  decks:      '++id, subjectId, name, createdAt',
  flashcards: '++id, deckId, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})

// v5: add room column to schedule
db.version(5).stores({
  subjects:   '++id, parentId, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  decks:      '++id, subjectId, name, createdAt',
  flashcards: '++id, deckId, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, room, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})

// v6: add scheduleSections table; add sectionId index to schedule
db.version(6).stores({
  subjects:         '++id, parentId, name, color, createdAt',
  notes:            '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  decks:            '++id, subjectId, name, createdAt',
  flashcards:       '++id, deckId, noteId, subjectId, front, back, createdAt',
  tasks:            '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:         '++id, day, time, subject, room, sectionId, createdAt',
  scheduleSections: '++id, name, color, createdAt',
  studyPlan:        '++id, title, content, examDate, createdAt',
  aiCache:          'id, createdAt',
})

// v7: add deckGroups table; add groupId index to decks (independent of notes subjects)
db.version(7).stores({
  subjects:         '++id, parentId, name, color, createdAt',
  notes:            '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  decks:            '++id, subjectId, groupId, name, createdAt',
  flashcards:       '++id, deckId, noteId, subjectId, front, back, createdAt',
  tasks:            '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:         '++id, day, time, subject, room, sectionId, createdAt',
  scheduleSections: '++id, name, color, createdAt',
  studyPlan:        '++id, title, content, examDate, createdAt',
  deckGroups:       '++id, name, createdAt',
  aiCache:          'id, createdAt',
})
