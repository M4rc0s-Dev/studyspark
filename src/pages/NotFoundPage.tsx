import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext'
import { Home } from 'lucide-react'

const NotFoundPage: React.FC = () => {
  const { t } = useLanguage()
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="font-display text-7xl font-black text-ink dark:text-sepia-100">
          404
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-sepia-100">{t('notfound.title')}</h1>
        <p className="mt-2 text-ink-muted dark:text-sepia-300 max-w-md">{t('notfound.desc')}</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
        >
          <Home className="w-5 h-5" /> {t('notfound.home')}
        </Link>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
