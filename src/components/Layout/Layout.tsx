import React, { useState, useRef, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Home, Globe, User, LogOut, Settings, BookOpen, MessageCircle, Coffee, Moon, Sun, Library as LibraryIcon } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useFlashcardStore } from '../../context/FlashcardContext'
import ProfileMenu from './ProfileMenu'
import Chatbot from '../Chatbot/Chatbot'
import ConfirmDialog from './ConfirmDialog'

const KOFI_URL = 'https://ko-fi.com/mvalera_dev'

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { t, toggle, lang } = useLanguage()
  const { user, profile, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const { state: flashState } = useFlashcardStore()
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Sign out immediately, or warn first if a study session is in progress.
  const requestLogout = () => {
    if (flashState.currentSession && flashState.currentSession.id !== 'demo') {
      setConfirmLogout(true)
    } else {
      signOut()
    }
  }

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.study'), href: '/study', icon: BookOpen },
    { name: t('library.title'), href: '/library', icon: LibraryIcon },
    { name: t('nav.contact'), href: '/contact', icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen bg-paper dark:bg-[#0b1220] dark:text-sepia-100 flex flex-col transition-colors">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 bg-paper/85 dark:bg-[#0b1220]/85 backdrop-blur-md border-b border-slate-200/70 dark:border-sepia-800/70">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            {/* Logo (left) */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-ink dark:bg-sepia-100 flex items-center justify-center text-paper dark:text-ink font-display font-bold text-lg shadow-soft">
                S
              </span>
              <span className="text-xl font-display font-bold tracking-tight text-ink dark:text-sepia-50 hidden sm:inline">
                Study<span className="text-ember-500">Spark</span>
              </span>
            </Link>

            {/* Centered desktop nav: absolutely positioned at the horizontal
                center of the header so the buttons stay perfectly centered
                regardless of how wide the logo / right cluster are. */}
            <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center gap-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                const href = item.href === '/library' && !user ? '/auth?next=library' : item.href
                return (
                  <Link
                    key={item.name}
                    to={href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-ember-700 dark:text-ember-400 bg-ember-50 dark:bg-ember-500/10'
                        : 'text-ink-soft dark:text-sepia-300 hover:text-ink dark:hover:text-sepia-50 hover:bg-slate-100 dark:hover:bg-sepia-800'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Right cluster: theme + language + ko-fi + login/profile + mobile button. */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0 flex-nowrap min-w-0">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-300 hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors shrink-0"
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                onClick={toggle}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors shrink-0"
                title="Cambiar idioma"
              >
                <Globe className="w-4 h-4" />
                {lang === 'es' ? 'ES' : 'EN'}
              </button>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg bg-ember-500 text-paper font-semibold text-sm shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all shrink-0"
              >
                <Coffee className="w-4 h-4" /> {t('support.kofi')}
              </a>
              {user ? (
                <ProfileMenu />
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg border border-ink text-ink dark:border-sepia-200 dark:text-sepia-100 text-sm font-semibold hover:bg-ink hover:text-paper dark:hover:bg-sepia-100 dark:hover:text-ink transition-colors shrink-0 whitespace-nowrap"
                >
                  <User className="w-4 h-4" /> {t('nav.login')}
                </Link>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 shrink-0"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-ink/40 dark:bg-sepia-900/50" onClick={() => setIsSidebarOpen(false)}>
          <div className="absolute right-0 top-16 w-64 h-full bg-paper dark:bg-[#0b1220] shadow-xl p-4 border-l border-slate-200 dark:border-sepia-800" onClick={(e) => e.stopPropagation()}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              const href = item.href === '/library' && !user ? '/auth?next=library' : item.href
              return (
                <Link
                  key={item.name}
                  to={href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg mb-2 transition-colors ${
                    isActive
                      ? 'bg-ember-50 dark:bg-ember-500/10 text-ember-700 dark:text-ember-400 font-semibold'
                      : 'text-ink-soft dark:text-sepia-300 hover:bg-slate-100 dark:hover:bg-sepia-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsSidebarOpen(false)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-ember-500 text-paper font-semibold"
            >
              <Coffee className="w-4 h-4" /> {t('support.kofi')}
            </a>
            {user && (
              <button
                onClick={() => { setIsSidebarOpen(false); requestLogout() }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-200 font-medium"
              >
                <LogOut className="w-4 h-4" />
                {t('profile.logout')}
              </button>
            )}
            <button
              onClick={toggle}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-200 font-medium"
            >
              <Globe className="w-4 h-4" />
              {lang === 'es' ? 'Español' : 'English'}
            </button>
            {user && (
              <button
                onClick={() => { setIsSidebarOpen(false); navigate('/settings') }}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-200 font-medium"
              >
                <Settings className="w-4 h-4" />
                {t('profile.settings')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Chatbot */}
      <Chatbot />

      {/* Warn that signing out discards an in-progress study session. */}
      <ConfirmDialog
        open={confirmLogout}
        title={t('profile.logout')}
        message={t('profile.logout.warn')}
        confirmLabel={t('profile.logout')}
        destructive={false}
        onConfirm={() => {
          setConfirmLogout(false)
          signOut()
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      {/* Footer */}
      <footer className="bg-paper-sunken dark:bg-[#0b1220] border-t border-slate-200 dark:border-sepia-800 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-ink dark:bg-sepia-100 flex items-center justify-center text-paper dark:text-ink font-display font-bold">
                S
              </span>
              <span className="font-display font-bold text-ink dark:text-sepia-50">StudySpark</span>
            </div>
            <p className="text-sm text-ink-muted dark:text-sepia-300">
              © {new Date().getFullYear()} StudySpark. {t('footer.copy')}
            </p>
            <div className="flex gap-6 text-sm text-ink-muted dark:text-sepia-300">
              <Link to="/contact" className="hover:text-ember-600 dark:hover:text-ember-400 transition-colors">{t('footer.privacy')}</Link>
              <Link to="/contact" className="hover:text-ember-600 dark:hover:text-ember-400 transition-colors">{t('footer.terms')}</Link>
              <Link to="/contact" className="hover:text-ember-600 dark:hover:text-ember-400 transition-colors">{t('footer.contact')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
