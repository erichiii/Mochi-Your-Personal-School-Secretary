---
name: mochi-setup
description: >
  Bootstrap and configure the Mochi project from scratch. Use this skill when
  setting up the Vite + React project, installing dependencies, configuring
  Tailwind CSS v4, initializing Dexie, setting up Zustand, or scaffolding the
  folder structure. Trigger on any "start the project", "set up from scratch",
  "initialize Mochi", or "install dependencies" request.
---

# Mochi Project Setup

## Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | latest | Dev server + build tool |
| React | 18+ | UI framework |
| Tailwind CSS | v4 | Styling via @tailwindcss/vite plugin |
| Dexie.js | 4+ | IndexedDB wrapper (offline storage) |
| Zustand | 4+ | Global state management |
| Tiptap | 2+ | Rich text editor (notes section) |
| Gemini SDK | @google/generative-ai | AI features |
| Lucide React | latest | Icons |
| date-fns | latest | Date formatting |

## Step 1 — Scaffold

```bash
npm create vite@latest mochi -- --template react
cd mochi
npm install
```

## Step 2 — Install all dependencies

```bash
# Styling
npm install tailwindcss @tailwindcss/vite

# Storage + State
npm install dexie zustand

# Editor (notes)
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-underline @tiptap/extension-placeholder \
  @tiptap/extension-code-block @tiptap/extension-image \
  @tiptap/extension-task-list @tiptap/extension-task-item \
  @tiptap/extension-table @tiptap/extension-table-row \
  @tiptap/extension-table-cell @tiptap/extension-table-header \
  @tiptap/extension-highlight

# AI
npm install @google/generative-ai

# Utilities
npm install lucide-react date-fns uuid

# Schedule exports (Sprint 3)
npm install ics html-to-image
```

## Step 3 — Configure Vite

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

## Step 4 — Environment file

```bash
# .env (never commit this)
VITE_GEMINI_KEY=your_key_here
```

```bash
# .gitignore — add these lines
.env
.env.local
```

## Step 5 — Folder structure

```
src/
├── components/
│   ├── notes/
│   ├── todo/
│   ├── schedule/
│   └── studyplan/
├── pages/
│   ├── NotesPage.jsx
│   ├── TodoPage.jsx
│   ├── SchedulePage.jsx
│   └── StudyPlanPage.jsx
├── hooks/
├── utils/
├── constants.js
├── db.js          ← Dexie schema
├── store.js       ← Zustand store
├── gemini.js      ← Gemini API functions
├── App.jsx
├── main.jsx
└── index.css      ← Tailwind + CSS variables
```

## Step 6 — App shell with routing

```jsx
// App.jsx — 3 states: sidebar, notes list, editor
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// npm install react-router-dom

// Install router:
// npm install react-router-dom
```

## Verify Setup

Run `npm run dev` — should open on `http://localhost:5173` with no errors.
Check DevTools console for any missing dependency warnings.

## Next

After setup, read `mochi-ui/SKILL.md` to build the app shell and layout.
Then read `mochi-notes/SKILL.md` to start the priority feature.