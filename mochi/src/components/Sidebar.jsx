import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, CheckSquare, Calendar, Brain, Layers, ChevronLeft, Sun, Moon, StickyNote } from 'lucide-react'
import SubjectSection from './notes/SubjectSection'
import DeckSection from './DeckSection'
import useStore from '../store'

const NAV = [
  {
    to: '/notes',
    label: 'Notes',
    Icon: BookOpen,
    bg: 'var(--mochi-lavender)',
    border: 'var(--mochi-lavender-mid)',
    color: 'var(--mochi-lavender-dark)',
  },
  {
    to: '/flashcards',
    label: 'Flashcards',
    Icon: Layers,
    bg: 'var(--mochi-pink)',
    border: 'var(--mochi-pink-mid)',
    color: 'var(--mochi-pink-dark)',
  },
  {
    to: '/todo',
    label: 'To-Do',
    Icon: CheckSquare,
    bg: 'var(--mochi-mint)',
    border: 'var(--mochi-mint-mid)',
    color: 'var(--mochi-mint-dark)',
  },
  {
    to: '/schedule',
    label: 'Schedule',
    Icon: Calendar,
    bg: 'var(--mochi-peach)',
    border: 'var(--mochi-peach-mid)',
    color: 'var(--mochi-peach-dark)',
  },
  {
    to: '/studyplan',
    label: 'Study Plan',
    Icon: Brain,
    bg: 'var(--mochi-sky)',
    border: 'var(--mochi-sky-mid)',
    color: 'var(--mochi-sky-dark)',
  },
]

export default function Sidebar() {
  const location = useLocation()
  const onNotes = location.pathname === '/notes'
  const onFlashcards = location.pathname === '/flashcards'
  const [collapsed, setCollapsed] = useState(false)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const createStickyNote = useStore((s) => s.createStickyNote)

  return (
    <aside
      className="flex-shrink-0 flex flex-col h-full"
      style={{
        width: collapsed ? '64px' : '224px',
        borderRight: '1px solid var(--mochi-border)',
        background: 'var(--mochi-surface)',
        transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* ── Logo / header ─────────────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          padding: collapsed ? '16px 0' : '16px 12px 16px 14px',
          minHeight: '64px',
          borderBottom: '1px solid var(--mochi-border)',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {collapsed ? (
          /* Mini "m" badge — click to expand */
          <button
            onClick={() => setCollapsed(false)}
            className="sidebar-btn w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: 'var(--mochi-pink)',
              border: '1.5px solid var(--mochi-pink-mid)',
              color: 'var(--mochi-pink-dark)',
              fontFamily: 'Fraunces, serif',
              fontSize: '18px',
            }}
            title="Expand sidebar"
          >
            m
          </button>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span
                className="font-bold"
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontSize: '20px',
                  color: 'var(--mochi-pink-dark)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                mochi
              </span>
              <p
                className="truncate"
                style={{ fontSize: '10px', marginTop: '3px', color: 'var(--mochi-text-muted)', letterSpacing: '0.01em' }}
              >
                your personal school secretary
              </p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="sidebar-btn p-1.5 rounded-lg flex-shrink-0"
              style={{ color: 'var(--mochi-text-muted)' }}
              title="Collapse sidebar"
            >
              <span className="sidebar-icon"><ChevronLeft size={14} strokeWidth={2} /></span>
            </button>
          </>
        )}
      </div>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ to, label, Icon, bg, border, color }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}>
            {({ isActive }) => (
              <div
                data-active={isActive || undefined}
                className="sidebar-btn relative flex items-center gap-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  padding: collapsed ? '10px 0' : '9px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  ...(isActive
                    ? { background: bg, border: `1.5px solid ${border}`, color }
                    : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }),
                }}
              >
                <span className="sidebar-icon flex-shrink-0">
                  <Icon size={15} strokeWidth={2} />
                </span>
                {!collapsed && <span className="truncate leading-none">{label}</span>}

                {/* Active dot in collapsed mode */}
                {isActive && collapsed && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: color }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}

        {/* Contextual sections */}
        {onNotes && !collapsed && (
          <>
            <div className="my-2" style={{ borderTop: '1px solid var(--mochi-border)', marginLeft: '4px', marginRight: '4px' }} />
            <SubjectSection />
          </>
        )}
        {onFlashcards && !collapsed && (
          <>
            <div className="my-2" style={{ borderTop: '1px solid var(--mochi-border)', marginLeft: '4px', marginRight: '4px' }} />
            <DeckSection />
          </>
        )}
      </nav>

      {/* ── Bottom actions ─────────────────────────────────────── */}
      <div
        className="flex flex-col gap-0.5 p-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--mochi-border)' }}
      >
        <button
          onClick={createStickyNote}
          title="New sticky note"
          className="sidebar-btn flex items-center gap-2.5 w-full rounded-xl text-sm font-semibold"
          style={{
            padding: collapsed ? '9px 0' : '9px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'var(--mochi-text-soft)',
          }}
        >
          <span className="sidebar-icon flex-shrink-0"><StickyNote size={15} strokeWidth={2} /></span>
          {!collapsed && 'Sticky note'}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="sidebar-btn flex items-center gap-2.5 w-full rounded-xl text-sm font-semibold"
          style={{
            padding: collapsed ? '9px 0' : '9px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'var(--mochi-text-soft)',
          }}
        >
          <span className="sidebar-icon flex-shrink-0">
            {theme === 'dark'
              ? <Sun  size={15} strokeWidth={2} />
              : <Moon size={15} strokeWidth={2} />}
          </span>
          {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
      </div>
    </aside>
  )
}
