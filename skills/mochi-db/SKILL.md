---
name: mochi-db
description: >
  Dexie.js schema, migrations, and Zustand store patterns for Mochi. Always read
  this skill before touching src/db.js or src/store.js, adding a new data model,
  writing a Dexie query, or wiring up a store action. Trigger on any task that
  involves saving, loading, deleting, or querying data — including "persist this",
  "save to local", "load from storage", or "add a field to the schema".
---

# Mochi Database & State

## Files

- `src/db.js` — Dexie instance and schema versions
- `src/store.js` — Zustand store with all actions

## Current Schema (v1)

```js
db.version(1).stores({
  subjects:   '++id, name, color, createdAt',
  notes:      '++id, subjectId, title, content, createdAt, updatedAt, isPinned',
  flashcards: '++id, noteId, subjectId, front, back, createdAt',
  tasks:      '++id, title, category, deadline, effort, priority, isDone, createdAt, updatedAt',
  schedule:   '++id, day, time, subject, createdAt',
  studyPlan:  '++id, title, content, examDate, createdAt',
  aiCache:    'id, createdAt',
})
```

Only fields listed here are indexed (queryable with `.where()`).
All other fields on objects are stored but not indexed — that's fine.

## Rules for Schema Changes

1. **Bump version**: `db.version(2).stores({...})`
2. **Include all tables** in each version object (Dexie requires the full list)
3. **Add `.upgrade()`** only if existing rows need data transformation
4. **Never delete** a table or rename a field in a migration
5. **New queryable field** → add to `.stores()` string and bump version
6. **New stored-only field** → no schema change, just start using it

For full patterns see the DB Agent: `agents/db-agent.md`

## Store Structure

Each feature section of the store follows this shape:

```js
// Reading
items: [],
loadAll: async () => { /* query Dexie, call set() */ },

// Writing (always call loadAll after)
createItem: async (data) => { await db.table.add(data); await get().loadAll() },
updateItem: async (id, data) => { await db.table.update(id, data); await get().loadAll() },
deleteItem: async (id) => { await db.table.delete(id); await get().loadAll() },

// UI state (no Dexie)
activeItemId: null,
setActiveItem: (id) => set({ activeItemId: id }),
```

## Common Query Patterns

```js
// All records ordered by date
await db.notes.orderBy('updatedAt').reverse().toArray()

// Filter by foreign key
await db.notes.where('subjectId').equals(subjectId).toArray()

// Get by primary key
await db.notes.get(id)

// Delete related records (manual cascade)
await db.flashcards.where('noteId').equals(noteId).delete()
await db.notes.delete(noteId)

// Bulk insert
await db.tasks.bulkAdd(taskArray)
```

## Further Reading

- `references/schema.md` — full field definitions per table with types and constraints