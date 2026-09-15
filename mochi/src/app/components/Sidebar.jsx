import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, CheckSquare, Calendar, Brain, Layers, ChevronLeft, Sun, Moon, StickyNote } from 'lucide-react'
import SubjectSection from '../../features/notes/components/SubjectSection'
import DeckSection from '../../features/flashcards/components/DeckSection'
import useStore from '../store/useStore'
import mochiLogo from '../../assets/mascots/mochi-logo.png'

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
      className="mochi-sidebar flex-shrink-0 flex flex-col h-full"
      style={{
        width: collapsed ? '72px' : '244px',
        borderRight: 'none',
        background: 'var(--mochi-pink)',
        transition: 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      {/* ── Logo / header ─────────────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          padding: collapsed ? '16px 0' : '16px 12px 16px 14px',
          minHeight: '64px',
          borderBottom: '2px solid rgba(255,255,255,0.7)',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'padding 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {collapsed ? (
          /* Mini "m" badge — click to expand */
          <button
            onClick={() => setCollapsed(false)}
            className="sidebar-btn w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: 'var(--mochi-surface)',
              border: '2px solid var(--mochi-border)',
              color: 'var(--mochi-pink-dark)',
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
            }}
            title="Expand sidebar"
          >
            <img src={mochiLogo} alt="Mochi" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </button>
        ) : (
          <>
            <div className="mochi-wordmark flex items-center gap-2 flex-1 min-w-0">
              <img src={mochiLogo} alt="Mochi mascot" style={{ width: '38px', height: '38px', objectFit: 'contain', imageRendering: 'pixelated' }} />
              <div className="min-w-0">
              <span
                className="font-bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  color: 'var(--mochi-text)',
                  letterSpacing: '0',
                  lineHeight: 1,
                }}
              >
                mochi
              </span>
              <p
                className="truncate"
                style={{ fontSize: '10px', marginTop: '3px', color: 'var(--mochi-text-soft)', letterSpacing: '0' }}
              >
                your personal school secretary
              </p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="sidebar-btn p-1.5 rounded-lg flex-shrink-0"
              style={{ color: 'var(--mochi-text)' }}
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
                {!collapsed && <span className="sidebar-label truncate leading-none">{label}</span>}

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
            <div className="sidebar-context">
              <div className="my-2" style={{ borderTop: '2px solid rgba(255,255,255,0.7)', marginLeft: '4px', marginRight: '4px' }} />
              <SubjectSection />
            </div>
          </>
        )}
        {onFlashcards && !collapsed && (
          <>
            <div className="sidebar-context">
              <div className="my-2" style={{ borderTop: '2px solid rgba(255,255,255,0.7)', marginLeft: '4px', marginRight: '4px' }} />
              <DeckSection />
            </div>
          </>
        )}
      </nav>

      {/* ── Bottom actions ─────────────────────────────────────── */}
      <div
        className="flex flex-col gap-0.5 p-2 flex-shrink-0"
        style={{ borderTop: '2px solid rgba(255,255,255,0.7)' }}
      >
        <button
          onClick={createStickyNote}
          title="New sticky note"
          className="sidebar-btn flex items-center gap-2.5 w-full rounded-xl text-sm font-semibold"
          style={{
            padding: collapsed ? '9px 0' : '9px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'var(--mochi-text)',
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
            color: 'var(--mochi-text)',
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
