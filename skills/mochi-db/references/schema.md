# Mochi Schema Reference

Full field definitions for every Dexie table. Use this when you need to know
exactly what a record looks like or what fields are available.

## subjects

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| name | string | Subject name e.g. "Mathematics" |
| color | string | Hex color e.g. "#C9B8F5" |
| createdAt | number | Unix timestamp ms |

## notes

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| subjectId | number\|null | FK → subjects.id. null = no subject |
| title | string | Note title (editable input above editor) |
| content | string | HTML string from Tiptap `editor.getHTML()` |
| createdAt | number | Unix timestamp ms |
| updatedAt | number | Updated on every save |
| isPinned | boolean | Pinned notes sort to top (future feature) |

## flashcards

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| noteId | number\|null | FK → notes.id. null = standalone |
| subjectId | number\|null | FK → subjects.id |
| front | string | Question / front face text |
| back | string | Answer / back face text |
| createdAt | number | Unix timestamp ms |

## tasks

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| title | string | Task description |
| category | string | Free-form category e.g. "Math", "Personal" |
| deadline | number | Unix timestamp ms for due date |
| effort | number | 1-5 (1=very easy, 5=very hard) |
| priority | number | 0-100 computed score |
| userPriority | number\|null | Manual override. null = auto |
| isDone | boolean | Completion state |
| pomodoroCount | number | Completed pomodoros for this task |
| createdAt | number | Unix timestamp ms |
| updatedAt | number | Unix timestamp ms |

## schedule

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| day | string | "Monday", "Tuesday", etc. |
| time | string | "8:00 AM - 9:30 AM" |
| subject | string | Class name |
| room | string | Room number (optional, may be empty) |
| createdAt | number | Unix timestamp ms |

## studyPlan

| Field | Type | Description |
|-------|------|-------------|
| id | number (auto) | Primary key |
| title | string | Plan title e.g. "Midterms Study Plan" |
| content | string | Markdown string of the full plan |
| examDate | number | Unix timestamp ms |
| createdAt | number | Unix timestamp ms |

## aiCache

| Field | Type | Description |
|-------|------|-------------|
| id | string | Hash key: `{feature}_{mode}_{hash(input)}` |
| result | string | Cached AI output (markdown or JSON string) |
| createdAt | number | Unix timestamp ms — evict after 7 days |