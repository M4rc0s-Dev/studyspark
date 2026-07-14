import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { FlashcardProvider } from './context/FlashcardContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout/Layout'
import HomePage from './pages/HomePage'
import StudyPage from './pages/StudyPage'
import SettingsPage from './pages/SettingsPage'
import LibraryPage from './pages/LibraryPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthPage from './pages/AuthPage'
import ConfirmPage from './pages/ConfirmPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ContactPage from './pages/ContactPage'

function App() {
  return (
    <ThemeProvider>
      <FlashcardProvider>
        <LanguageProvider>
          <AuthProvider>
            <SettingsProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="study" element={<StudyPage />} />
                    <Route path="study/:sessionId" element={<StudyPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="library" element={<LibraryPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="auth" element={<AuthPage />} />
                    <Route path="auth/confirm" element={<ConfirmPage />} />
                    <Route path="reset-password" element={<ResetPasswordPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '14px',
                  background: '#1e2a38',
                  color: '#f3f5f8',
                  fontSize: '14px',
                  padding: '12px 16px',
                  boxShadow: '0 10px 40px rgba(30, 42, 56, 0.35)',
                  maxWidth: '360px',
                },
                success: { iconTheme: { primary: '#34d399', secondary: '#1e2a38' } },
                error: { iconTheme: { primary: '#fb7185', secondary: '#1e2a38' } },
              }}
            />
          </Router>
          </SettingsProvider>
        </AuthProvider>
          </LanguageProvider>
        </FlashcardProvider>
      </ThemeProvider>
  )
}

export default App
