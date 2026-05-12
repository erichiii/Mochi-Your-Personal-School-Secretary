import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NotesPage from './pages/NotesPage'
import TodoPage from './pages/TodoPage'
import SchedulePage from './pages/SchedulePage'
import StudyPlanPage from './pages/StudyPlanPage'
import FlashcardsPage from './pages/FlashcardsPage'
import useStore from './store'
import StickyNotesLayer from './components/StickyNotesLayer'

export default function App() {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <StickyNotesLayer />
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: 'var(--mochi-cream)' }}
      >
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-hidden" style={{ height: '100vh' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/notes" replace />} />
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
