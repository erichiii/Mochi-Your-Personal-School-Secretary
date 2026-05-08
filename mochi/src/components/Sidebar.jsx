import { NavLink } from 'react-router-dom'
import { BookOpen, CheckSquare, Calendar, Brain } from 'lucide-react'

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
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full py-5 px-3 gap-1"
      style={{ borderRight: '1.5px solid var(--mochi-border)', background: 'var(--mochi-surface)' }}
    >
      {/* Logo */}
      <div className="px-3 mb-5">
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

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, Icon, bg, border, color }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={
                  isActive
                    ? { background: bg, border: `1.5px solid ${border}`, color }
                    : {
                        color: 'var(--mochi-text-soft)',
                        border: '1.5px solid transparent',
                      }
                }
              >
                <Icon size={16} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
