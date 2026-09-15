import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CalendarDays, CheckSquare, ChevronLeft, ChevronRight, House, Moon, NotebookText, StickyNote, Sun } from 'lucide-react'
import useStore from '../store/useStore'
import mochiLogo from '../../assets/mascots/mochi-logo.png'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: House },
  { to: '/notes', label: 'Notes', Icon: NotebookText },
  { to: '/todo', label: 'To-do', Icon: CheckSquare },
  { to: '/schedule', label: 'Schedule', Icon: CalendarDays },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const createStickyNote = useStore((s) => s.createStickyNote)

  const itemStyle = (isActive) => ({
    background: isActive ? 'var(--mochi-cream)' : 'transparent',
    border: isActive ? '2px solid var(--mochi-border)' : '2px solid transparent',
    color: isActive ? 'var(--mochi-pink-dark)' : 'var(--mochi-surface)',
    boxShadow: isActive ? '2px 2px 0 rgba(224, 33, 137, 0.18)' : 'none',
  })

  return (
    <aside
      className="mochi-sidebar flex flex-col h-full flex-shrink-0"
      style={{
        width: collapsed ? '72px' : 'clamp(200px, 19vw, 244px)',
        background: 'var(--mochi-pink-mid)',
        transition: 'width var(--dur-base) var(--ease-spring)',
        overflow: 'visible',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div className="flex items-center flex-shrink-0" style={{ minHeight: '112px', padding: collapsed ? '20px 0' : '20px 20px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <img src={mochiLogo} alt="Mochi mascot" style={{ width: collapsed ? '42px' : '58px', height: collapsed ? '42px' : '58px', objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }} />
        {!collapsed && <span className="sidebar-label" style={{ marginLeft: '12px', color: 'var(--mochi-surface)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', lineHeight: 1 }}>MOCHI</span>}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex items-center justify-center"
        style={{ position: 'absolute', top: '50%', right: '-18px', width: '36px', height: '72px', transform: 'translateY(-50%)', background: 'var(--mochi-pink-mid)', border: 'none', borderRadius: '0 18px 18px 0', color: 'var(--mochi-surface)', boxShadow: 'none' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
      </button>

      <nav className="flex flex-col gap-2 px-3 pt-5 flex-1 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}>
            {({ isActive }) => (
              <div className="sidebar-btn flex items-center gap-3 rounded-full text-base font-bold" data-active={isActive || undefined} style={{ padding: collapsed ? '12px 0' : '12px 18px', justifyContent: collapsed ? 'center' : 'flex-start', ...itemStyle(isActive) }}>
                <Icon size={24} strokeWidth={2.3} className="flex-shrink-0" />
                {!collapsed && <span className="sidebar-label truncate">{label}</span>}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2 px-3 pb-6 pt-4 flex-shrink-0" style={{ borderTop: '2px solid rgba(255, 255, 255, 0.62)' }}>
        <button onClick={createStickyNote} title="New sticky note" className="sidebar-btn flex items-center gap-3 rounded-full text-base font-bold" style={{ padding: collapsed ? '12px 0' : '12px 18px', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--mochi-surface)' }}>
          <StickyNote size={24} strokeWidth={2.3} className="flex-shrink-0" />
          {!collapsed && <span className="sidebar-label">Sticky Note</span>}
        </button>
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="sidebar-btn flex items-center gap-3 rounded-full text-base font-bold" style={{ padding: collapsed ? '12px 0' : '12px 18px', justifyContent: collapsed ? 'center' : 'flex-start', color: 'var(--mochi-surface)' }}>
          {theme === 'dark' ? <Sun size={24} strokeWidth={2.3} /> : <Moon size={24} strokeWidth={2.3} />}
          {!collapsed && <span className="sidebar-label">Theme</span>}
        </button>
      </div>
    </aside>
  )
}
