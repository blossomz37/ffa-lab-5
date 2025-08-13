import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ModernHome from './components/ModernHome'
import ExportDocx from './pages/ExportDocx'
import './styles/globals.css'

/**
 * Main application component with routing
 * Sets up the basic layout and navigation between pages
 */
function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<ModernHome />} />
          <Route path="/export" element={<ExportDocx />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
