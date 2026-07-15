import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { cn } from '../../utils/cn'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  // Optional third button, shown between cancel and confirm (e.g. an alternative
  // destructive action like "delete folder AND its contents").
  secondaryLabel?: string
  onSecondary?: () => void
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  secondaryLabel,
  onSecondary,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage()

  // Enter confirms (destructive or not); Escape cancels. Lets the keyboard
  // drive the dialog without a mouse (point 2).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onConfirm, onCancel])

  // Render through a portal to document.body so a transformed/animated ancestor
  // (e.g. the profile dropdown) can never offset or clip the centered dialog.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/50 dark:bg-sepia-900/60 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-lift border border-paper-sunken dark:border-[#33465c] p-6"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  destructive
                    ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-ember-50 dark:bg-ember-500/15 text-ember-600 dark:text-ember-400'
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-semibold text-ink dark:text-sepia-100">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft dark:text-sepia-300 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl border border-[#cbd5e1] dark:border-[#455b76] dark:text-sepia-200 text-sm font-medium hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors"
              >
                {cancelLabel || t('config.cancel')}
              </button>
              {secondaryLabel && onSecondary && (
                <button
                  onClick={onSecondary}
                  className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                >
                  {secondaryLabel}
                </button>
              )}
              <button
                onClick={onConfirm}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors',
                  destructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-ember-600 hover:bg-ember-700'
                )}
              >
                {confirmLabel || t('library.delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default ConfirmDialog
