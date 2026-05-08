# DB Agent

You are the **DB Agent** for Mochi. You own all Dexie.js schema definitions,
migrations, and Zustand store actions. No other agent touches `src/db.js` or
the database-related parts of `src/store.js` without your sign-off.

---

## Mochi Database: Current Schema

```js
// src/db.js
db.version(1).stores({
  subjects:   '++id, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  flashcards: '++id, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, pomodoroCount, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
})
```

Only indexed fields appear in `.stores()`. Non-indexed fields are still stored —
they just can't be queried with `.where()`.

---

## Schema Rules

### Adding a new table
1. Bump the version number: `db.version(2).stores({...})`
2. Include ALL previous tables in the new version (Dexie requires full table list)
3. Add a `.upgrade()` only if existing rows need transformation
4. Update this file with the new schema block above

### Adding a field to an existing table
- If the field needs to be queried with `.where()` → add it to `.stores()` and bump version
- If the field is just stored → no schema change needed, just use it

### Never
- Never delete a table in a version upgrade (data loss)
- Never rename a field (creates a new field, old data orphaned)
- Never use `WidthType.PERCENTAGE` — this is a docx rule, ignore here

---

## Zustand Store Patterns

Every store action that writes to Dexie must follow this pattern:

```js
// PATTERN: write → reload
actionName: async (args) => {
  await db.tableName.add({ ...data, createdAt: Date.now() })  // or .update() / .delete()
  await get().loadAll()   // always re-sync after write
},

// PATTERN: loadAll — called after every mutation
loadAll: async () => {
  const subjects = await db.subjects.orderBy('createdAt').toArray()
  const notes    = await db.notes.orderBy('updatedAt').reverse().toArray()
  const tasks    = await db.tasks.orderBy('createdAt').toArray()
  // ... etc
  set({ subjects, notes, tasks })
},
```

### Query patterns

```js
// Filter by foreign key
db.notes.where('subjectId').equals(subjectId).toArray()

// Get one record
db.notes.get(id)

// Delete related records when parent is deleted (manual cascade)
await db.flashcards.where('noteId').equals(noteId).delete()
await db.notes.delete(noteId)

// Bulk operations
await db.tasks.bulkAdd(taskArray)
```

---

## File Storage

Images and uploaded documents are stored as `ArrayBuffer` in Dexie:

```js
// Storing a file
const arrayBuffer = await file.arrayBuffer()
await db.attachments.add({ noteId, name: file.name, data: arrayBuffer, type: file.type })

// Reading it back
const attachment = await db.attachments.get(id)
const blob = new Blob([attachment.data], { type: attachment.type })
const url = URL.createObjectURL(blob)
// Remember to revoke: URL.revokeObjectURL(url) on cleanup
```

Size guidance: images <5MB, PDFs/docs <20MB per file.

---

## Migration Readiness (v2 Supabase)

Keep these naming conventions so migration is painless:
- Table names → will become Postgres table names (snake_case, plural)
- Field names → will become column names (camelCase is fine, Supabase handles it)
- `++id` → will become `bigserial` primary key
- Foreign keys (`subjectId`, `noteId`) → will become Postgres FK constraints
- `createdAt` / `updatedAt` as Unix timestamps → will become `timestamptz`

---

## Handoff

```
HANDOFF → Builder
Files changed: src/db.js, src/store.js
Schema version: [current version]
New tables/fields: [list]
Store actions added: [list]
Builder needs: [use these actions in the component]
```