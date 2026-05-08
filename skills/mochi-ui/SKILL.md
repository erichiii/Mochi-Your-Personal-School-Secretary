---
name: mochi-ui
description: >
  Design system, theming, and component patterns for Mochi. Always read this skill
  before building any UI component, page layout, or visual element. Covers the pastel
  color palette, typography (Nunito + Fraunces), CSS variables, reusable component
  patterns, spacing rules, and animation conventions. Trigger on any task involving
  styling, layout, visual design, or building a new component.
---

# Mochi UI & Design System

## Aesthetic Direction

**Soft & playful — pastel, rounded, cozy.**
The app should feel like a warm notebook, not a corporate dashboard.
Reduce study anxiety through gentle colors and friendly typography.

## Typography

```css
/* Loaded from Google Fonts in index.css */
body font:     Nunito — weights 400, 500, 600, 700, 800
heading font:  Fraunces (serif) — note titles, section headings, logo

/* Usage rules */
/* Nunito: all UI labels, buttons, body text, nav items */
/* Fraunces: note title input, page section headings, the Mochi logo word */
```

## Color Palette — CSS Variables

```css
/* Neutrals */
--mochi-cream:   #FFF8F0   /* page background */
--mochi-surface: #FFFBF8   /* cards, panels */
--mochi-border:  #F0E4EC   /* all borders */

/* Text */
--mochi-text:       #3D2C35   /* primary text */
--mochi-text-soft:  #7A5F6A   /* secondary text */
--mochi-text-muted: #B8A0A8   /* placeholders, timestamps */

/* Feature colors — light / mid / dark per ramp */
--mochi-pink:        #FFD6E0   /* global accents, active states */
--mochi-pink-mid:    #FFB3C6
--mochi-pink-dark:   #E8789A

--mochi-lavender:      #E8DEFF  /* notes section */
--mochi-lavender-mid:  #C9B8F5
--mochi-lavender-dark: #9B7FD4

--mochi-mint:      #D4F5E9   /* to-do section */
--mochi-mint-mid:  #A8E6CF
--mochi-mint-dark: #5BB98B

--mochi-peach:      #FFE5CC   /* schedule section */
--mochi-peach-mid:  #FFCBA4
--mochi-peach-dark: #E8935A

--mochi-sky:      #D6EEFF   /* study plan section */
--mochi-sky-mid:  #A8D4F5
--mochi-sky-dark: #5B9FD4
```

**Color assignment rule:**
- Use the `light` tone for backgrounds/fills
- Use the `mid` tone for borders
- Use the `dark` tone for text on colored backgrounds and icons

- **Note:** Add a corresponding color for dark mode. Dark mode should be the default.

## Layout

### App shell (3-column)

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (220px)  │  List panel (260px)  │  Editor   │
│  - Logo           │  - Section header    │  (flex-1) │
│  - Nav items      │  - Item cards        │           │
│  - Subject list   │  - New button        │           │
└─────────────────────────────────────────────────────┘
```

```jsx
<div className="flex h-screen overflow-hidden" style={{ background: 'var(--mochi-cream)' }}>
  <div className="w-[220px] flex-shrink-0">  {/* Sidebar */} </div>
  <div className="w-[260px] flex-shrink-0">  {/* List */} </div>
  <div className="flex-1 min-w-0">           {/* Editor/Content */} </div>
</div>
```

## Reusable Patterns

### Pill / Badge

```jsx
<span
  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
  style={{ background: 'var(--mochi-lavender)', color: 'var(--mochi-lavender-dark)' }}
>
  Label
</span>
```

### Card

```jsx
<div
  className="rounded-2xl p-4 transition-all cursor-pointer"
  style={{ background: 'var(--mochi-surface)', border: '1.5px solid var(--mochi-border)' }}
>
  content
</div>
```

Active card (selected state):
```jsx
style={{ background: 'var(--mochi-pink)', border: '1.5px solid var(--mochi-pink-mid)' }}
```

### Button — primary

```jsx
<button
  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
  style={{ background: 'var(--mochi-pink)', color: 'var(--mochi-pink-dark)', border: '1.5px solid var(--mochi-pink-mid)' }}
>
  <Plus size={13} />
  New
</button>
```

### Button — ghost

```jsx
<button
  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
  style={{ color: 'var(--mochi-text-muted)', border: '1.5px dashed var(--mochi-border)' }}
  onMouseEnter={e => e.currentTarget.style.background = 'var(--mochi-border)'}
  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
>
  <Plus size={13} />
  Add item
</button>
```

### Input field

```jsx
<div
  className="flex items-center gap-2 px-3 py-2 rounded-xl"
  style={{ background: 'var(--mochi-cream)', border: '1.5px solid var(--mochi-border)' }}
>
  <SearchIcon size={14} style={{ color: 'var(--mochi-text-muted)' }} />
  <input
    className="flex-1 bg-transparent text-sm outline-none"
    style={{ color: 'var(--mochi-text)' }}
    placeholder="Search..."
  />
</div>
```

### Empty state

```jsx
<div className="flex flex-col items-center justify-center h-full text-center py-12">
  <div className="text-4xl mb-3">📝</div>
  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--mochi-text-soft)' }}>
    No notes yet
  </p>
  <p className="text-xs" style={{ color: 'var(--mochi-text-muted)' }}>
    Click "New" to create your first note
  </p>
</div>
```

### Loading spinner

```jsx
<div className="flex items-center justify-center p-4">
  <Loader size={18} className="spin" style={{ color: 'var(--mochi-text-muted)' }} />
</div>
```
(`.spin` class is defined in `index.css`)

## Border Radius Convention

| Element | Radius |
|---------|--------|
| Cards, panels | `rounded-2xl` (16px) |
| Buttons, pills, badges | `rounded-xl` (12px) |
| Inputs, small chips | `rounded-xl` |
| Tags, very small pills | `rounded-full` |
| Toolbar buttons | `rounded-lg` (8px) |

## Spacing

Padding inside panels: `px-4 py-3` or `px-5 py-4` for headers
Gap between items: `gap-2` (8px) for tight, `gap-3` (12px) for normal
Margin between sections: `mb-4` or `space-y-3` on lists

## Animations

```css
/* All defined in index.css */
.fade-in  { animation: fadeSlideIn 0.2s ease forwards; }
.spin     { animation: spin 0.8s linear infinite; }
.shimmer  { animation: shimmer 1.5s ease infinite; }
```

Use `fade-in` on any element that appears dynamically (dropdowns, panels, new cards).

## Section Color Mapping

| Section | Background | Border | Text | Icon color |
|---------|-----------|--------|------|-----------|
| Notes | `--mochi-lavender` | `--mochi-lavender-mid` | `--mochi-lavender-dark` | lavender-dark |
| To-do | `--mochi-mint` | `--mochi-mint-mid` | `--mochi-mint-dark` | mint-dark |
| Schedule | `--mochi-peach` | `--mochi-peach-mid` | `--mochi-peach-dark` | peach-dark |
| Study Plan | `--mochi-sky` | `--mochi-sky-mid` | `--mochi-sky-dark` | sky-dark |
| Active/Selected | `--mochi-pink` | `--mochi-pink-mid` | `--mochi-pink-dark` | pink-dark |

## Further Reading

- `references/design-tokens.md` — full token list with hex values
- `references/component-patterns.md` — more complex component examples (modals, dropdowns, pomodoro display)