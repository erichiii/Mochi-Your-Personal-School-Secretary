import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NotesPage from '../features/notes/NotesPage'
import TodoPage from '../features/todo/TodoPage'
import SchedulePage from '../features/schedule/SchedulePage'
import StudyPlanPage from '../features/study-plan/StudyPlanPage'
import FlashcardsPage from '../features/flashcards/FlashcardsPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import useStore from './store/useStore'
import StickyNotesLayer from '../features/sticky-notes/StickyNotesLayer'
import PomodoroTimer from '../features/todo/components/PomodoroTimer'
import TaskCelebration from './components/TaskCelebration'

export default function App() {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <StickyNotesLayer />
      <PomodoroTimer />
      <TaskCelebration />
      <div
        className="mochi-app-shell flex h-screen overflow-hidden"
        style={{ background: 'var(--mochi-cream)' }}
      >
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-hidden" style={{ height: '100vh' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/studyplan" element={<StudyPlanPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
