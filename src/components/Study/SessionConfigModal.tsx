import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Clock, Repeat, X, Shuffle, ArrowDownWideNarrow, ListOrdered, ArrowRightLeft, Sparkles } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import type { SessionConfig, StudyMode, CardOrder, CardDirection } from '../../context/SettingsContext'

interface SessionConfigModalProps {
  open: boolean
  onClose: () => void
  onStart: (config: SessionConfig) => void
  deckTitle?: string
}

const modes: { id: StudyMode; icon: typeof Brain; key: string; descKey: string }[] = [
  { id: 'basic', icon: Brain, key: 'mode.basic', descKey: 'mode.basic.desc' },
  { id: 'timed', icon: Clock, key: 'mode.timed', descKey: 'mode.timed.desc' },
  { id: 'spaced-repetition', icon: Repeat, key: 'mode.spaced', descKey: 'mode.spaced.desc' },
]

// Per-mode accent kept within the calm slate-blue palette for coherence,
// with a single warm "timed" accent to signal urgency.
const modeAccent: Record<StudyMode, string> = {
  basic: 'bg-ember-500',
  timed: 'bg-amber-500',
  'spaced-repetition': 'bg-slate-600',
}

const orders: { id: CardOrder; icon: typeof ListOrdered; key: string }[] = [
  { id: 'default', icon: ListOrdered, key: 'config.order.default' },
  { id: 'shuffle', icon: Shuffle, key: 'config.order.shuffle' },
  { id: 'hard', icon: ArrowDownWideNarrow, key: 'config.order.hard' },
]

const directions: { id: CardDirection; icon: typeof ArrowRightLeft; key: string }[] = [
  { id: 'qa', icon: ArrowRightLeft, key: 'config.direction.qa' },
  { id: 'aq', icon: ArrowRightLeft, key: 'config.direction.aq' },
]

const SessionConfigModal: React.FC<SessionConfigModalProps> = ({ open, onClose, onStart, deckTitle }) => {
  const { t } = useLanguage()
  const { prefs } = useSettings()

  const [mode, setMode] = useState<StudyMode>(prefs.defaultMode)
  const [order, setOrder] = useState<CardOrder>('default')
  const [direction, setDirection] = useState<CardDirection>('qa')
  const [autoplay, setAutoplay] = useState<boolean>(prefs.autoplay)

  const handleStart = () => {
    onStart({ mode, order, direction, autoplay })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-paper-raised dark:bg-[#1e2c3c] rounded-3xl shadow-lift overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-5 bg-paper-sunken dark:bg-[#243547] text-ink dark:text-sepia-100 border-b border-paper-sunken dark:border-[#33465c]">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-ink-muted dark:text-sepia-300 hover:text-ink dark:hover:text-sepia-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-semibold">{t('config.title')}</h2>
              <p className="text-sm text-ember-50 mt-1">
                {deckTitle ? <span className="font-medium">{deckTitle}</span> : t('config.subtitle')}
              </p>
            </div>

            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Mode */}
              <div>
                <p className="text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-3">{t('config.mode')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {modes.map((m) => {
                    const Icon = m.icon
                    const active = mode === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`relative text-left rounded-2xl border-2 p-4 transition-all ${
                          active
                            ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/15 shadow-soft'
                            : 'border-paper-sunken dark:border-[#33465c] hover:border-ember-300 hover:bg-ember-50/40 dark:hover:bg-ember-500/5'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${modeAccent[m.id]}`}
                        >
                          <Icon className="w-5 h-5" />
                        </span>
                        <p className="mt-2 font-semibold text-ink dark:text-sepia-100 text-sm">{t(m.key as any)}</p>
                        <p className="text-xs text-ink-muted dark:text-sepia-300 mt-1 leading-snug">{t(m.descKey as any)}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Order */}
              <div>
                <p className="text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-3">{t('config.order')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {orders.map((o) => {
                    const Icon = o.icon
                    const active = order === o.id
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOrder(o.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                          active
                            ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/15'
                            : 'border-paper-sunken dark:border-[#33465c] hover:border-ember-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? 'text-ember-600 dark:text-ember-400' : 'text-ink-muted'}`} />
                        <span className="text-xs font-medium text-ink-soft dark:text-sepia-200 text-center leading-tight">
                          {t(o.key as any)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Direction */}
              <div>
                <p className="text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-3">{t('config.direction')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {directions.map((d) => {
                    const Icon = d.icon
                    const active = direction === d.id
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDirection(d.id)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all ${
                          active
                            ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/15'
                            : 'border-paper-sunken dark:border-[#33465c] hover:border-ember-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-ember-600 dark:text-ember-400' : 'text-ink-muted'}`} />
                        <span className="text-xs font-medium text-ink-soft dark:text-sepia-200">{t(d.key as any)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Autoplay */}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-paper-sunken dark:border-[#33465c] p-3 cursor-pointer hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-ember-500" />
                  <span className="text-sm font-medium text-ink-soft dark:text-sepia-200">{t('config.autoplay')}</span>
                </span>
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                  className="w-5 h-5 accent-ember-600 cursor-pointer"
                />
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-paper-sunken dark:border-[#33465c] flex items-center gap-3 bg-paper-sunken dark:bg-[#111d2a]">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#455b76] dark:text-sepia-200 font-medium hover:bg-[#e2e8f0] dark:hover:bg-[#33465c] transition-colors"
              >
                {t('config.cancel')}
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-5 py-2.5 rounded-xl bg-ember-500 text-paper font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
              >
                {t('config.start')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SessionConfigModal
