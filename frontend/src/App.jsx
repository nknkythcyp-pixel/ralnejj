import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import ConnexionPage    from './pages/ConnexionPage'
import InscriptionPage  from './pages/InscriptionPage'
import ChatPage         from './pages/ChatPage'
import ParametresPage   from './pages/ParametresPage'

// ── Guard routes protégées ───────────────────────────────────
function PrivateRoute({ children }) {
  const token = useStore((s) => s.token)
  return token ? children : <Navigate to="/connexion" replace />
}

// ── Guard routes publiques (redirect si déjà connecté) ───────
function PublicRoute({ children }) {
  const token = useStore((s) => s.token)
  return token ? <Navigate to="/chat" replace /> : children
}

export default function App() {
  const applyTheme = useStore((s) => s.applyTheme)

  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: '-apple-system, SF Pro Display, Segoe UI, sans-serif',
            fontSize: '13px',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#4F7EFF', secondary: '#fff' } },
        }}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />

        <Route path="/connexion" element={
          <PublicRoute><ConnexionPage /></PublicRoute>
        } />

        <Route path="/inscription" element={
          <PublicRoute><InscriptionPage /></PublicRoute>
        } />

        <Route path="/chat" element={
          <PrivateRoute><ChatPage /></PrivateRoute>
        } />

        <Route path="/parametres" element={
          <PrivateRoute><ParametresPage /></PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </>
  )
}
