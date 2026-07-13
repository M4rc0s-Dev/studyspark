import React, { useState } from 'react'
import { HelpCircle, MessageCircle, Copy, Check, Volume2, VolumeX } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useLanguage } from '../../context/LanguageContext'
import type { Difficulty } from '../../types'

interface FlashcardProps {
  flashcard: {
    question: string
    answer: string
    concept?: string
    difficulty?: Difficulty
  }
  showAnswer: boolean
  onToggleAnswer: () => void
  autoplay?: boolean
}

const difficultyStyles: Record<string, { ring: string; chip: string; key: string }> = {
  'very-easy': {
    ring: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    key: 'card.very-easy',
  },
  easy: {
    ring: 'border-teal-200',
    chip: 'bg-teal-100 text-teal-700',
    key: 'card.easy',
  },
  medium: {
    ring: 'border-amber-200',
    chip: 'bg-amber-100 text-amber-700',
    key: 'card.medium',
  },
  hard: {
    ring: 'border-orange-200',
    chip: 'bg-orange-100 text-orange-700',
    key: 'card.hard',
  },
  'very-hard': {
    ring: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    key: 'card.very-hard',
  },
}

const conceptStyles: Record<string, string> = {
  Politics: 'bg-ember-50 text-ember-700 dark:bg-ember-500/15 dark:text-ember-300',
  Economics: 'bg-slate-100 text-slate-700 dark:bg-sepia-700/40 dark:text-sepia-200',
  Military: 'bg-slate-100 text-slate-700 dark:bg-sepia-700/40 dark:text-sepia-200',
  Science: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  History: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  Física: 'bg-ember-50 text-ember-700 dark:bg-ember-500/15 dark:text-ember-300',
  Biología: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Ciencia: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  Historia: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
}

const Flashcard: React.FC<FlashcardProps> = ({ flashcard, showAnswer, onToggleAnswer, autoplay }) => {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const diff = flashcard.difficulty ? difficultyStyles[flashcard.difficulty] : null
  const conceptClass =
    (flashcard.concept && conceptStyles[flashcard.concept]) || 'bg-ember-50 text-ember-700 dark:bg-ember-500/15 dark:text-ember-300'
  const noDifficultyLabel = t('card.no.difficulty')

  const handleCopy = async () => {
    const text = `Q: ${flashcard.question}\nA: ${flashcard.answer}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard not available */
    }
  }

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = /[áéíóúñ¿¡]/i.test(text) ? 'es-ES' : 'en-US'
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return
    if (speaking) {
      speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    speak(showAnswer ? flashcard.answer : flashcard.question)
  }

  // Auto-play when the card flips to reveal the answer.
  React.useEffect(() => {
    if (autoplay && showAnswer && 'speechSynthesis' in window) {
      speak(flashcard.answer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnswer, autoplay])

  const FaceWrapper: React.FC<{ back?: boolean; children: React.ReactNode }> = ({
    back,
    children,
  }) => (
    <div
      className={cn(
        'absolute inset-0 backface-hidden overflow-hidden rounded-3xl border-2',
        diff ? diff.ring : 'border-slate-200 dark:border-sepia-700',
        back
          ? 'rotate-y-180 bg-ember-50 dark:bg-ember-500/10'
          : 'bg-paper-raised dark:bg-sepia-900 card-sheen'
      )}
    >
      {children}
    </div>
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto select-none">
      <div
        onClick={onToggleAnswer}
        className={cn(
          'relative w-full h-72 cursor-pointer transition-transform duration-700 preserve-3d',
          showAnswer ? 'rotate-y-180' : ''
        )}
      >
        {/* FRONT — Question */}
        <FaceWrapper>
          <div className="flex h-full flex-col p-7">
            <div className="mb-3 flex items-start justify-between">
              <span className="inline-flex items-center gap-2 text-ember-600 dark:text-ember-400">
                <HelpCircle className="w-6 h-6" />
                <span className="text-xs font-semibold uppercase tracking-wide text-ember-500 dark:text-ember-400">
                  {t('card.question')}
                </span>
              </span>
              {diff ? (
                <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', diff.chip)}>
                  {t(diff.key as any)}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-sepia-700 text-ink-muted dark:text-sepia-300">
                  {noDifficultyLabel}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center">
              <p className="font-display text-2xl font-semibold leading-snug text-ink dark:text-sepia-50">
                {flashcard.question}
              </p>
            </div>
            <div className="flex items-center justify-between">
              {flashcard.concept ? (
                <span className={cn('px-3 py-1 rounded-full text-xs font-medium', conceptClass)}>
                  {flashcard.concept}
                </span>
              ) : (
                <span />
              )}
              <span className="text-xs text-ink-muted/70 dark:text-sepia-300 italic">
                Toca para ver la respuesta
              </span>
            </div>
          </div>
        </FaceWrapper>

        {/* BACK — Answer */}
        <FaceWrapper back>
          <div className="flex h-full flex-col p-7">
            <div className="mb-3 flex items-start justify-between">
              <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <MessageCircle className="w-6 h-6" />
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                  {t('card.answer')}
                </span>
              </span>
              {diff ? (
                <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', diff.chip)}>
                  {t(diff.key as any)}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-sepia-700 text-ink-muted dark:text-sepia-300">
                  {noDifficultyLabel}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <p className="text-lg leading-relaxed text-ink-soft dark:text-sepia-100">{flashcard.answer}</p>
            </div>
            {flashcard.concept && (
              <div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-medium', conceptClass)}>
                  {flashcard.concept}
                </span>
              </div>
            )}
          </div>
        </FaceWrapper>
      </div>

      {/* Toolbar (sits below the card, does not flip) */}
      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-paper-raised dark:bg-sepia-800 text-ink-soft dark:text-sepia-300 text-sm font-medium shadow-soft border border-slate-200 dark:border-sepia-700 hover:bg-paper-sunken dark:hover:bg-sepia-700 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? t('card.copied') : t('card.copy')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSpeak()
          }}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-soft border transition-colors',
            speaking
              ? 'bg-ember-500 text-paper border-ember-500'
              : 'bg-paper-raised dark:bg-sepia-800 text-ink-soft dark:text-sepia-300 border-slate-200 dark:border-sepia-700 hover:bg-paper-sunken dark:hover:bg-sepia-700'
          )}
        >
          {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {speaking ? t('card.stop') : t('card.listen')}
        </button>
      </div>
    </div>
  )
}

export default Flashcard
