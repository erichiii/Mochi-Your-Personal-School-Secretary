import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, CheckSquare, Calendar, Brain, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import SubjectSection from './notes/SubjectSection'

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
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className="flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{
        width: collapsed ? '56px' : '220px',
        borderRight: '1.5px solid var(--mochi-border)',
        background: 'var(--mochi-surface)',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo + collapse toggle */}
      <div
        className="flex items-center px-3 py-5"
        style={{ gap: collapsed ? 0 : '8px', justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: 'Fraunces, serif', color: 'var(--mochi-pink-dark)' }}
            >
              mochi
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--mochi-text-muted)' }}>
              your personal school secretary
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'var(--mochi-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mochi-border)'; e.currentTarget.style.color = 'var(--mochi-text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mochi-text-muted)' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-2">
        {NAV.map(({ to, label, Icon, bg, border, color }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  ...(isActive
                    ? { background: bg, border: `1.5px solid ${border}`, color }
                    : { color: 'var(--mochi-text-soft)', border: '1.5px solid transparent' }),
                }}
              >
                <Icon size={16} />
                {!collapsed && label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Subjects — only on /notes and expanded */}
      {onNotes && !collapsed && (
        <>
          <div
            className="my-3 mx-2"
            style={{ borderTop: '1px solid var(--mochi-border)' }}
          />
          <SubjectSection />
        </>
      )}
    </aside>
  )
}
