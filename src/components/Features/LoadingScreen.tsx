import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, FileText, Brain, PenLine, Sparkles, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

interface LoadingScreenProps {
  // Elapsed time in ms since the job started; drives which stage is shown.
  elapsedMs: number
  // Lets the user bail out of a stuck/errored generation instead of waiting
  // out the full timeout on a frozen screen.
  onCancel?: () => void
  // When set, the screen shows this error instead of the animated stages.
  error?: string | null
}

// The staged messages advance purely on elapsed time. Generation timing on the
// free AI tier is unpredictable, so this is a friendly approximation rather
// than a real per-step progress bar.
const STAGES = [
  { key: 'loading.step.reading', icon: FileText, until: 10000 },
  { key: 'loading.step.thinking', icon: Brain, until: 36000 },
  { key: 'loading.step.writing', icon: PenLine, until: 90000 },
  { key: 'loading.step.almost', icon: Sparkles, until: Infinity },
] as const

const LoadingScreen: React.FC<LoadingScreenProps> = ({ elapsedMs, onCancel, error }) => {
  const { t } = useLanguage()
  const [dots, setDots] = useState('')

  // Animated trailing dots for a lively feel.
  useEffect(() => {
    const id = window.setInterval(() =>
    {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 450)
    return () => window.clearInterval(id)
  }, [])

  const stageIndex = STAGES.findIndex((s) => elapsedMs < s.until)
  const current = STAGES[stageIndex === -1 ? STAGES.length - 1 : stageIndex]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-paper-sunken/95 dark:bg-[#0b1220]/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-paper-raised dark:bg-[#1e2c3c] rounded-3xl shadow-lift p-8 text-center"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl bg-ember-500 opacity-15 animate-ping" />
          <div className="relative w-20 h-20 rounded-2xl bg-ember-500 flex items-center justify-center text-paper">
            <Icon className="w-9 h-9" />
          </div>
        </div>

        <h2 className="font-display text-xl font-semibold text-ink dark:text-sepia-100">{t('loading.title')}</h2>

        <motion.p
          key={current.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-ink-soft dark:text-sepia-300 font-medium min-h-[1.5rem]"
        >
          {t(current.key as any)}
          {dots}
        </motion.p>

        {/* Stage progress dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {STAGES.map((s, i) => {
            const activeIdx = stageIndex === -1 ? STAGES.length - 1 : stageIndex
            const active = i <= activeIdx
            return (
              <span
                key={s.key}
                className={`h-2 rounded-full transition-all duration-500 ${
                  active ? 'w-8 bg-ember-500' : 'w-2 bg-paper-sunken dark:bg-[#33465c]'
                }`}
              />
            )
          })}
        </div>


        {error ? (
          <div className="mt-6">
            <p className="text-rose-600 dark:text-rose-400 font-medium">{error}</p>
            <button
              onClick={onCancel}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#455b76] dark:text-sepia-200 text-sm font-semibold hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        ) : (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-sepia-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('loading.hint')}</span>
        </div>
        )}

      </motion.div>
    </div>
  )
}

export default LoadingScreen
