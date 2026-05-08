# Mochi Agents

This file defines all agents available for the Mochi project, when to invoke them,
and how they coordinate. Read this before spawning any agent.

---

## Agent Roster

| Agent | File | Role | Invoke When |
|-------|------|------|-------------|
| Builder | `builder.md` | Writes and edits feature code | Building any component, hook, or utility |
| Reviewer | `reviewer.md` | Audits code for correctness | After any significant code change |
| DB Agent | `db-agent.md` | Dexie schema + Zustand store work | Adding/changing any data model |
| AI Agent | `ai-agent.md` | Gemini prompt engineering | Writing or tuning any AI feature |

---

## When to Use Agents vs. Direct Work

**Work directly (no agent needed):**
- Small edits under ~30 lines
- CSS/style-only changes
- Fixing a single known bug
- Adding a new route or page shell with no logic

**Invoke an agent:**
- Building a full feature component (Builder)
- Touching the Dexie schema or store (DB Agent)
- Writing or tuning a Gemini prompt (AI Agent)
- Any PR-ready code review (Reviewer)

---

## Orchestration Rules

1. **DB Agent always runs before Builder** when a new data model is needed.
   The schema must exist before UI code references it.

2. **AI Agent runs before Builder** when a new AI feature is being added.
   The prompt template must be finalized before the component calls it.

3. **Reviewer runs after Builder** for any feature that touches:
   - Dexie reads/writes
   - Gemini API calls
   - State mutations in Zustand

4. **Never run Builder and DB Agent on the same file simultaneously.**
   One agent writes, the other reviews after.

---

## Shared Context All Agents Need

Before any agent starts work, provide this context block:

```
Project: Mochi — offline-first student secretary app
Stack: React + Vite, Tailwind CSS v4, Dexie.js (IndexedDB), Zustand, Tiptap, Gemini 2.5 Flash
Style: Soft pastel aesthetic — fonts: Nunito (body), Fraunces (headings)
Storage: All data local via Dexie. No backend. No auth.
AI: Gemini API key in import.meta.env.VITE_GEMINI_KEY. Direct browser calls OK for localhost.
File paths: src/components/, src/hooks/, src/db.js, src/store.js, src/gemini.js
```

---

## Agent Handoff Protocol

When one agent finishes and hands off to another:

1. Agent outputs a **handoff summary** at the end of its response:
   ```
   HANDOFF → [next agent]
   Files changed: [list]
   Next agent needs: [what to do next]
   Blockers: [anything unresolved]
   ```

2. The receiving agent reads the handoff summary before starting.

3. If a blocker exists, surface it to the user before proceeding.

---

## Reference Agent Files

- [`builder.md`](builder.md) — Full instructions for the Builder agent
- [`reviewer.md`](reviewer.md) — Full instructions for the Reviewer agent
- [`db-agent.md`](db-agent.md) — Full instructions for the DB Agent
- [`ai-agent.md`](ai-agent.md) — Full instructions for the AI Agent