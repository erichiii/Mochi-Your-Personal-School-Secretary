# Mochi Skills & Agents

This directory contains all AI skill and agent definitions for the Mochi project.
Skills guide Claude to work efficiently on each part of the codebase.

## Directory Structure

```
mochi-skills/
├── README.md                  ← you are here
├── agents/
│   ├── agents.md              ← agent roster & orchestration rules
│   ├── builder.md             ← writes and edits feature code
│   ├── reviewer.md            ← reviews code for bugs and consistency
│   ├── db-agent.md            ← handles all Dexie schema and query work
│   └── ai-agent.md            ← handles all Gemini prompt engineering
│
├── mochi-setup/               ← project bootstrap & config
│   └── SKILL.md
│
├── mochi-ui/                  ← design system, theming, components
│   ├── SKILL.md
│   └── references/
│       ├── design-tokens.md
│       └── component-patterns.md
│
├── mochi-db/                  ← Dexie schema, queries, Zustand store
│   ├── SKILL.md
│   └── references/
│       └── schema.md
│
├── mochi-ai/                  ← Gemini integration, prompt templates
│   ├── SKILL.md
│   └── references/
│       └── prompts.md
│
├── mochi-notes/               ← notes section (priority feature)
│   ├── SKILL.md
│   └── references/
│       ├── tiptap-config.md
│       └── ai-panel.md
│
├── mochi-todo/                ← to-do section + pomodoro
│   ├── SKILL.md
│   └── references/
│       └── priority-algorithm.md
│
├── mochi-schedule/            ← schedule maker, .ics, wallpaper
│   ├── SKILL.md
│   └── references/
│       └── ics-wallpaper.md
│
└── mochi-studyplan/           ← study plan generator
    ├── SKILL.md
    └── references/
        └── plan-prompts.md
```

## How to Use

1. **Starting a new feature** → read the feature skill + `mochi-ui` + `mochi-db`
2. **Adding AI to a feature** → also read `mochi-ai`
3. **Setting up from scratch** → read `mochi-setup` first
4. **Fixing a bug** → invoke the `reviewer` agent
5. **Prompt engineering** → invoke the `ai-agent`

## Skill Loading Priority

| Task | Skills to load |
|------|---------------|
| Bootstrap project | `mochi-setup` |
| Build notes section | `mochi-notes` + `mochi-ui` + `mochi-db` + `mochi-ai` |
| Build to-do section | `mochi-todo` + `mochi-ui` + `mochi-db` |
| Build schedule maker | `mochi-schedule` + `mochi-ui` + `mochi-db` + `mochi-ai` |
| Build study plan | `mochi-studyplan` + `mochi-ai` + `mochi-db` |
| Any UI work | `mochi-ui` always |
| Any DB work | `mochi-db` always |
| Any AI feature | `mochi-ai` always |