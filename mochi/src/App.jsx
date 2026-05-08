import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NotesPage from './pages/NotesPage'
import TodoPage from './pages/TodoPage'
import SchedulePage from './pages/SchedulePage'
import StudyPlanPage from './pages/StudyPlanPage'

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: 'var(--mochi-cream)' }}
      >
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/notes" replace />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/studyplan" element={<StudyPlanPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
