import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Flashcard from '../components/Features/Flashcard'
import StudyModeSelector from '../components/Features/StudyModeSelector'
import Timer from '../components/Study/Timer'
import ProgressBar from '../components/Study/ProgressBar'
import SessionConfigModal from '../components/Study/SessionConfigModal'
import { useFlashcardStore } from '../context/FlashcardContext'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { toast } from 'react-hot-toast'
import { saveSessionToSupabase, loadSessionFromSupabase, updateSessionMeta, deleteSessionFromSupabase } from '../lib/sessions'
import ConfirmDialog from '../components/Layout/ConfirmDialog'
import { exportSession } from '../lib/export'
import { xpForSession } from '../lib/leveling'
import { sampleDeck } from '../data/sampleDeck'
import { Flashcard as FlashcardType, StudySession } from '../types'
import {
  applyOrder,
  type SessionConfig,
  type StudyMode,
  TIMED_SECONDS_PER_CARD,
} from '../context/SettingsContext'
import {
  RotateCcw,
  Check,
  X,
  Pause,
  Play,
  BookOpen,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flame,
  Sparkles,
  SlidersHorizontal,
  Clock,
  ListX,
  ChevronDown,
  Coffee,
  Library as LibraryIcon,
  FolderInput,
  Trash2,
} from 'lucide-react'

const STUDY_STATE_KEY = 'studyspark.study.state'

const StudyPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const { user, profile, addXp } = useAuth()
  const { prefs } = useSettings()

  // Session from store (needed early for persistence effects).
  const { state, loadSession, setCurrentSession, removeSession } = useFlashcardStore()
  const currentSession = state.currentSession

  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [startTime, setStartTime] = useState(Date.now())
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [completed, setCompleted] = useState(false)
  const [awardedXp, setAwardedXp] = useState(0)
  const [loadedFromCloud, setLoadedFromCloud] = useState(false)
  // Guards XP against spamming "finish / review": each session id may only be
  // awarded once per browser session. Persisted in sessionStorage so it also
  // survives finishing → reviewing → finishing within the same visit.
  const awardedSessionsRef = useRef<Set<string>>(new Set())
  const [cardTimers, setCardTimers] = useState<Record<number, number>>({})
  const [timedLeft, setTimedLeft] = useState(TIMED_SECONDS_PER_CARD)
  const [isPaused, setIsPaused] = useState(false)

  // Persist study state (card index, timers, elapsed) so returning from another tab
  // resumes exactly where the user left off.
  useEffect(() => {
    if (!currentSession || !didInit.current) return
    const state = {
      cardIndex: currentCardIndex,
      elapsedTime,
      timers: cardTimers,
      answered: !!answered,
      isCorrect: isCorrect,
      completed,
      isPaused,
    }
    try {
      sessionStorage.setItem(STUDY_STATE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [currentCardIndex, elapsedTime, cardTimers, answered, isCorrect, completed, isPaused, currentSession])

  // A config passed through navigation state means the user just started a
  // brand-new study session from the pre-study modal. In that case we must NOT
  // restore the persisted state of a previous session (which could carry
  // completed:true and jump straight to the results screen).
  const isFreshStart = Boolean((location.state as { config?: SessionConfig } | null)?.config)

  // Restore persisted state ONCE on mount, before any session-dependent effect
  // runs. This guarantees the timers survive tab switching / navigation back
  // into the study page even when currentSession arrives asynchronously.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    // Restore the set of sessions already awarded XP this visit (anti-spam).
    try {
      const rawAwarded = sessionStorage.getItem('studyspark.awarded.sessions')
      if (rawAwarded) awardedSessionsRef.current = new Set(JSON.parse(rawAwarded))
    } catch {
      /* ignore */
    }
    // Fresh session: clear any stale persisted state and start from scratch.
    if (isFreshStart) {
      try {
        sessionStorage.removeItem(STUDY_STATE_KEY)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      const raw = sessionStorage.getItem(STUDY_STATE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const idx = saved.cardIndex ?? 0
        setCurrentCardIndex(idx)
        setElapsedTime(saved.elapsedTime ?? 0)
        setCardTimers(saved.timers ?? {})
        setTimedLeft(saved.timers?.[idx] ?? TIMED_SECONDS_PER_CARD)
        setAnswered(!!saved.answered)
        setIsCorrect(saved.isCorrect ?? null)
        setCompleted(!!saved.completed)
        setIsPaused(!!saved.isPaused)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // The config chosen in the pre-study modal is passed through navigation state.
  // Use it as the initial config so the user's choices (mode, order, direction,
  // autoplay) are honored instead of resetting to the default preferences.
  const navConfig = (location.state as { config?: SessionConfig } | null)?.config
  const [config, setConfig] = useState<SessionConfig>(
    navConfig ?? {
      mode: prefs.defaultMode,
      order: 'default',
      direction: 'qa',
      autoplay: prefs.autoplay,
    }
  )
  const [configOpen, setConfigOpen] = useState(false)
  const [demoPending, setDemoPending] = useState(false)
  const [showWrongList, setShowWrongList] = useState(false)
  // Folder chosen on the completion screen to file this deck under (''=root).
  const [saveFolder, setSaveFolder] = useState<string>('')
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  // Confirmation before leaving the results screen in a way that discards the
  // current (unsaved) deck (point 2): "Subir otro archivo" and "Desechar".
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const timedTick = useRef<number | null>(null)

  // Refs that always hold the latest study state, so the timed countdown
  // (which runs inside a stable interval closure) never acts on a stale card.
  const stateRef = useRef({ currentCardIndex: 0, answered: false, completed: false, configOpen: false, showAnswer: false, isPaused: false })
  stateRef.current = { currentCardIndex, answered, completed, configOpen, showAnswer, isPaused }

  // Track elapsed time separately from the running interval so we can pause/resume.
  const elapsedRef = useRef(0)

  // Load a saved session from Supabase when opened by id and not in local store.
  useEffect(() => {
    let active = true
    if (sessionId && !currentSession) {
      loadSessionFromSupabase(sessionId).then((s) => {
        if (active && s) {
          setCurrentSession(s)
          setLoadedFromCloud(true)
        }
      })
    }
    return () => {
      active = false
    }
  }, [sessionId, currentSession, setCurrentSession])

  // The deck after applying the chosen order. Direction is applied per-card at render.
  const baseFlashcards = useMemo(
    () => currentSession?.flashcards ?? [],
    [currentSession]
  )
  const flashcards = useMemo(
    () => applyOrder(baseFlashcards, config.order),
    [baseFlashcards, config.order]
  )
  const currentCard = flashcards[currentCardIndex]

  // Guard: keep the index inside bounds if the deck changed underneath us.
  useEffect(() => {
    if (flashcards.length > 0 && currentCardIndex > flashcards.length - 1) {
      setCurrentCardIndex(flashcards.length - 1)
      setShowAnswer(false)
      setAnswered(false)
      setIsCorrect(null)
    }
  }, [flashcards.length, currentCardIndex])

  // Working study timer (counts up) for the basic/spaced feel.
  useEffect(() => {
    if (!isTimerRunning || completed) return
    const id = window.setInterval(() => {
      elapsedRef.current += 1
      setElapsedTime(elapsedRef.current)
    }, 1000)
    return () => window.clearInterval(id)
  }, [isTimerRunning, completed])

  const stopTimedCountdown = useCallback(() => {
    if (timedTick.current) {
      window.clearInterval(timedTick.current)
      timedTick.current = null
    }
  }, [])

  // Ensure the visible timer reflects the current card's stored time.
  // A card that has never been visited starts fresh at the full duration.
  useEffect(() => {
    setTimedLeft(cardTimers[currentCardIndex] ?? TIMED_SECONDS_PER_CARD)
  }, [currentCardIndex, cardTimers])

  // Timed mode: each card owns a 30s countdown. The timer only ticks while the
  // card is unanswered, the answer is hidden, and the config modal is closed.
  // Navigating to a card resumes its saved time; a brand-new card starts at 30.
  const startTimedCountdown = useCallback(() => {
    if (timedTick.current) return
    const idx = stateRef.current.currentCardIndex
    // Seed this card's timer the first time we land on it.
    setCardTimers((prev) => (prev[idx] === undefined ? { ...prev, [idx]: TIMED_SECONDS_PER_CARD } : prev))
    timedTick.current = window.setInterval(() => {
      const cur = stateRef.current.currentCardIndex
      setCardTimers((prev) => {
        const remaining = (prev[cur] ?? TIMED_SECONDS_PER_CARD) - 1
        if (remaining <= 0) {
          window.clearInterval(timedTick.current!)
          timedTick.current = null
          if (!stateRef.current.answered && !stateRef.current.completed) {
            handleAnswerRef.current(false)
          }
          return { ...prev, [cur]: 0 }
        }
        return { ...prev, [cur]: remaining }
      })
    }, 1000)
  }, [])

  useEffect(() => {
    if (config.mode !== 'timed' || completed) {
      stopTimedCountdown()
      return
    }
    if (!showAnswer && !answered && !configOpen && !isPaused) {
      startTimedCountdown()
    } else {
      stopTimedCountdown()
    }
    return () => stopTimedCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mode, showAnswer, answered, currentCardIndex, completed, configOpen, isPaused])

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= flashcards.length) return
      stopTimedCountdown()
      setCurrentCardIndex(index)
      setShowAnswer(false)
      setAnswered(false)
      setIsCorrect(null)
      setIsPaused(false)
      setIsTimerRunning(true)
      setStartTime(Date.now() - elapsedRef.current * 1000)
    },
    [flashcards.length, stopTimedCountdown]
  )

  // Pause/resume: covers the card so the user cannot peek while paused.
  const togglePause = useCallback(() => {
    setIsPaused((p) => !p)
  }, [])

  const handleNext = () => goTo(currentCardIndex + 1)
  const handlePrevious = () => goTo(currentCardIndex - 1)

  const handleAnswer = (correct: boolean) => {
    if (answered || !currentCard) return
    stopTimedCountdown()
    setIsCorrect(correct)
    setAnswered(true)
    setIsTimerRunning(false)

    const elapsed = elapsedRef.current

    const updatedFlashcard: FlashcardType = {
      ...currentCard,
      studied: true,
      correct: correct,
      timeSpent: elapsed,
      lastReviewed: new Date(),
      nextReview: new Date(Date.now() + (correct ? 86400000 : 3600000)),
    }

    const updatedFlashcards = [...flashcards]
    updatedFlashcards[currentCardIndex] = updatedFlashcard

    const updatedSession: StudySession = {
      ...currentSession!,
      flashcards: updatedFlashcards,
      timeSpent: (currentSession!.timeSpent || 0) + elapsed,
    }

    setCurrentSession(updatedSession)
  }

  // Stable ref so the timed countdown can call the latest handleAnswer.
  const handleAnswerRef = useRef(handleAnswer)
  handleAnswerRef.current = handleAnswer

  const AWARDED_KEY = 'studyspark.awarded.sessions'

  const finishSession = useCallback(async () => {
    setCompleted(true)
    setIsTimerRunning(false)
    stopTimedCountdown()

    // The demo deck (id 'demo') is a throwaway preview: never award XP and
    // never persist it to the cloud (it would collide on the shared id and
    // pollute the user's real progress).
    const isDemo = currentSession?.id === 'demo'

    // XP is based on the difficulty of each card (wrong/unanswered = 10%).
    const earned = xpForSession(flashcards)

    // Only award XP the FIRST time a given session is finished (anti-spam).
    const sid = currentSession?.id
    const alreadyAwarded = !sid || awardedSessionsRef.current.has(sid)
    setAwardedXp(!isDemo && !alreadyAwarded ? earned : 0)

    if (user && currentSession && sid && !alreadyAwarded && !isDemo) {
      awardedSessionsRef.current.add(sid)
      try {
        sessionStorage.setItem(AWARDED_KEY, JSON.stringify([...awardedSessionsRef.current]))
      } catch {
        /* ignore */
      }
      const finalSession: StudySession = { ...currentSession, completedAt: new Date() }
      setCurrentSession(finalSession)
      saveSessionToSupabase(finalSession)
      addXp(earned)
    }
  }, [flashcards, user, currentSession, setCurrentSession, addXp, stopTimedCountdown])

  const resetStudy = useCallback(
    (deck?: FlashcardType[]) => {
      setCurrentCardIndex(0)
      setShowAnswer(false)
      setIsTimerRunning(false)
      setElapsedTime(0)
      elapsedRef.current = 0
      setTimedLeft(TIMED_SECONDS_PER_CARD)
      setCardTimers({})
      setAnswered(false)
      setIsCorrect(null)
      setCompleted(false)
      setAwardedXp(0)
      setShowWrongList(false)
      if (currentSession) {
        const resetCards = (deck ?? currentSession.flashcards).map((f) => ({
          ...f,
          studied: false,
          correct: undefined,
        }))
        setCurrentSession({ ...currentSession, flashcards: resetCards })
      }
    },
    [currentSession, setCurrentSession]
  )

  // Retry only the cards the user got wrong.
  const retryWrong = () => {
    const wrong = (currentSession?.flashcards ?? []).filter((f) => f.correct === false)
    if (!currentSession || wrong.length === 0) return
    setCurrentSession({
      ...currentSession,
      flashcards: wrong.map((f) => ({ ...f, studied: false, correct: undefined })),
    })
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setAnswered(false)
    setIsCorrect(null)
    setCompleted(false)
    setAwardedXp(0)
    setShowWrongList(false)
    setElapsedTime(0)
    elapsedRef.current = 0
    setTimedLeft(TIMED_SECONDS_PER_CARD)
    setCardTimers({})
    setStartTime(Date.now())
  }

  const handleStartFromConfig = (cfg: SessionConfig) => {
    setConfig(cfg)
    setConfigOpen(false)
    resetStudy()
  }

  const handleDemoStart = (cfg: SessionConfig) => {
    setConfig(cfg)
    setConfigOpen(false)
    setDemoPending(false)
    setCurrentCardIndex(0)
    setShowAnswer(false)
    setAnswered(false)
    setIsCorrect(null)
    setIsTimerRunning(false)
    setElapsedTime(0)
    elapsedRef.current = 0
    setTimedLeft(TIMED_SECONDS_PER_CARD)
    setCardTimers({})
    setAwardedXp(0)
    setShowWrongList(false)
    // Clear any stale completed state so the demo never opens on the final screen.
    setCompleted(false)
    try {
      sessionStorage.removeItem(STUDY_STATE_KEY)
    } catch {
      /* ignore */
    }
    // Start the demo with fresh (unanswered) cards.
    setCurrentSession({
      ...sampleDeck,
      studyMode: cfg.mode,
      flashcards: sampleDeck.flashcards.map((f) => ({ ...f, studied: false, correct: undefined })),
    })
  }

  const handleModeChange = (mode: StudyMode) => {
    setConfig((c) => ({ ...c, mode }))
  }

  // Available folders for the "save to folder" picker on the completion screen:
  // folders that already contain sessions + locally-created empty folders.
  const availableFolders = useMemo(() => {
    const set = new Set<string>()
    state.sessions.forEach((s) => { if (s.folder) set.add(s.folder) })
    try {
      const raw = localStorage.getItem('studyspark.folders.v1')
      if (raw) (JSON.parse(raw) as string[]).forEach((p) => p && set.add(p))
    } catch {
      /* ignore */
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [state.sessions])

  // Save the finished deck into the chosen folder (persists to the cloud).
  const handleSaveToFolder = useCallback(() => {
    if (!currentSession) return
    const updated: StudySession = { ...currentSession, folder: saveFolder }
    setCurrentSession(updated)
    saveSessionToSupabase(updated)
    updateSessionMeta(updated.id, { folder: saveFolder })
    setSavedToLibrary(true)
    toast.success(t('reward.saved'))
  }, [currentSession, saveFolder, setCurrentSession, t])

  // Discard the finished deck (remove from cloud + local store) and go home.
  const handleDiscardSession = useCallback(async () => {
    if (currentSession) {
      await deleteSessionFromSupabase(currentSession.id)
      removeSession(currentSession.id)
    }
    toast.success(t('reward.discarded'))
    navigate('/')
  }, [currentSession, removeSession, navigate, t])

  // Keyboard shortcuts: space = flip, arrows = navigate.
  useEffect(() => {
    if (!currentSession || completed) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      if (e.code === 'Space') {
        e.preventDefault()
        setShowAnswer((s) => !s)
      } else if (e.code === 'ArrowRight') {
        handleNext()
      } else if (e.code === 'ArrowLeft') {
        handlePrevious()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentSession, completed, handleNext, handlePrevious])

  // Stats derived from the deck.
  const answeredCount = flashcards.filter((f) => f.studied).length
  const correctCount = flashcards.filter((f) => f.correct === true).length
  const wrongCount = flashcards.filter((f) => f.correct === false).length
  const unansweredCount = flashcards.length - answeredCount
  const progress = flashcards.length ? (answeredCount / flashcards.length) * 100 : 0
  const isLast = currentCardIndex === flashcards.length - 1
  const today = new Date().toISOString().slice(0, 10)
  const streakActiveToday = Boolean(profile?.last_study_date) && profile?.last_study_date === today

  // Direction: if aq, swap question<->answer for this card.
  const displayCard = useMemo(() => {
    if (config.direction === 'aq' && currentCard) {
      return { ...currentCard, question: currentCard.answer, answer: currentCard.question }
    }
    return currentCard
  }, [config.direction, currentCard])

  // ---- Empty state: guide the user to where decks are created. ----
  if (!currentSession || flashcards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-paper-raised dark:bg-sepia-900 rounded-3xl shadow-soft ring-1 ring-slate-200/70 dark:ring-sepia-800 p-10 transition-colors">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-ink dark:bg-sepia-100 flex items-center justify-center text-paper dark:text-ink mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink dark:text-sepia-50 mb-3">{t('study.empty.title')}</h1>
          <p className="text-ink-muted dark:text-sepia-300 mb-8">{t('study.empty.desc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Upload className="w-5 h-5" /> {t('study.empty.cta')}
            </button>
            <button
              onClick={() => navigate('/library')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 font-semibold hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
            >
              <LibraryIcon className="w-5 h-5" /> {t('study.empty.library')}
            </button>
          </div>
          <div className="mt-5">
            <button
              onClick={() => {
                setDemoPending(true)
                setConfigOpen(true)
              }}
              className="inline-flex items-center gap-1 text-sm text-ember-600 dark:text-ember-400 hover:underline"
            >
              {t('study.demo')}
            </button>
          </div>
        </div>

        <SessionConfigModal
          open={configOpen}
          onClose={() => {
            setConfigOpen(false)
            setDemoPending(false)
          }}
          onStart={demoPending ? handleDemoStart : handleStartFromConfig}
          deckTitle="Demo"
        />
      </div>
    )
  }

  // ---- Completion summary ----
  if (completed) {
    const wrongCards = flashcards.filter((f) => f.correct === false)
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-paper-raised dark:bg-sepia-900 rounded-3xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-10 text-center transition-colors"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="w-20 h-20 mx-auto rounded-2xl bg-ember-500 flex items-center justify-center text-paper shadow-lg"
          >
            <Trophy className="w-10 h-10" />
          </motion.div>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink dark:text-sepia-50">{t('reward.title')}</h1>
          <p className="mt-2 text-ink-muted dark:text-sepia-300">
            {t('reward.subtitle')} <span className="font-semibold text-ink dark:text-sepia-100">{flashcards.length}</span> {t('reward.cards')}
            {' · '}
            <span className="font-semibold text-emerald-600">{correctCount}</span> {t('reward.known')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
              <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">{t('reward.known')}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-4">
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{wrongCount}</p>
              <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{t('reward.wrong.list')}</p>
            </div>
            <div className="bg-ember-50 dark:bg-ember-500/10 rounded-2xl p-4">
              <p className="text-2xl font-bold text-ember-600 dark:text-ember-400">
                {flashcards.length ? Math.round((correctCount / flashcards.length) * 100) : 0}%
              </p>
              <p className="text-xs text-ember-500 dark:text-ember-400 mt-1">{t('reward.accuracy')}</p>
            </div>
            <div className="bg-slate-100 dark:bg-sepia-800 rounded-2xl p-4">
              <p className="text-2xl font-bold text-ink dark:text-sepia-100 tabular-nums">{elapsedTime}s</p>
              <p className="text-xs text-ink-muted dark:text-sepia-300 mt-1">{t('reward.time')}</p>
            </div>
          </div>

          {/* Support Ko-fi button */}
          <div className="mt-8">
            <a
              href="https://ko-fi.com/mvalera_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Coffee className="w-5 h-5" /> {t('support.kofi')}
            </a>
            <p className="mt-2 text-sm text-ink-muted dark:text-sepia-300">{t('support.thanks')}</p>
          </div>

          {user ? (
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember-100 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300 font-semibold">
                <Sparkles className="w-4 h-4" /> {awardedXp > 0 ? t('reward.xp', { amount: awardedXp }) : t('reward.xp.already')}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 font-semibold">
                <Flame className={`w-4 h-4 ${streakActiveToday ? 'text-orange-500' : 'text-orange-300'}`} /> {t('reward.streak', { days: profile?.study_streak ?? 1 })}
              </span>
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-muted dark:text-sepia-300">{t('auth.login.desc')}</p>
          )}

          {/* Save to a folder — only offered when the deck is NOT yet saved (point 2) */}
          {user && currentSession && currentSession.id !== 'demo' && !savedToLibrary && (
            <div className="mt-6 rounded-2xl border border-slate-200 dark:border-sepia-700 p-4 text-left">
              <p className="text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-3 flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-ember-500" /> {t('reward.save.title')}
              </p>
              {savedToLibrary ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" /> {t('reward.saved')}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={saveFolder}
                    onChange={(e) => setSaveFolder(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 text-sm outline-none focus:ring-2 focus:ring-ember-500"
                  >
                    <option value="">SparkDrive</option>
                    {availableFolders.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveToFolder}
                    className="px-5 py-2.5 rounded-xl bg-ember-500 text-paper text-sm font-bold shadow-soft hover:shadow-lift transition-all flex items-center justify-center gap-2"
                  >
                    <FolderInput className="w-4 h-4" /> {t('reward.save.cta')}
                  </button>
                  <button
                    onClick={handleDiscardSession}
                    className="px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> {t('reward.discard')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* List of missed cards (collapsible) */}
          {wrongCards.length > 0 && (
            <div className="mt-6 text-left">
              <button
                onClick={() => setShowWrongList((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ListX className="w-4 h-4" /> {t('reward.show.wrong')} ({wrongCards.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showWrongList ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {showWrongList && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-2">
                      {wrongCards.map((c) => (
                        <div key={c.id} className="text-left bg-paper-sunken dark:bg-sepia-800 rounded-xl p-3 border border-slate-200 dark:border-sepia-700">
                          <p className="text-sm font-semibold text-ink dark:text-sepia-100">{c.question}</p>
                          <p className="text-sm text-ink-muted dark:text-sepia-300 mt-1">{c.answer}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
            {wrongCards.length > 0 && (
              <button
                onClick={retryWrong}
                className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> {t('reward.retry.wrong')}
              </button>
            )}
            <button
              onClick={() => resetStudy()}
              className="px-6 py-3 bg-ember-500 text-paper rounded-xl font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> {t('reward.review')}
            </button>
            <button
              onClick={() => exportSession(currentSession, 'csv')}
              className="px-6 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors flex items-center justify-center gap-2"
            >
              {t('export.single')}
            </button>
            <button
              onClick={() => setConfirmDiscard(true)}
              className="px-6 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> {t('reward.upload.another')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header — study dashboard card */}
        <div className="bg-paper-raised dark:bg-sepia-900 rounded-3xl shadow-soft ring-1 ring-slate-200/70 dark:ring-sepia-800 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-ink dark:bg-sepia-100 flex items-center justify-center text-paper dark:text-ink font-display font-bold">
                {String(answeredCount + 1)}
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-ink dark:text-sepia-50 leading-tight">{currentSession.title}</h1>
                <p className="text-ink-muted dark:text-sepia-300">
                  {t('study.card')} {currentCardIndex + 1} {t('study.of')} {flashcards.length}
                  {unansweredCount > 0 && (
                    <span className="ml-2 text-xs text-ember-600 dark:text-ember-400">· {t('reward.unanswered', { count: unansweredCount })}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {config.mode === 'timed' && !showAnswer && !answered ? (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono tabular-nums ${
                    timedLeft <= 5 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 animate-pulse' : 'bg-ember-100 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-lg font-semibold">{timedLeft}s</span>
                </div>
              ) : (
                <Timer time={elapsedTime} isRunning={isTimerRunning} />
              )}
              <StudyModeSelector mode={config.mode} onModeChange={handleModeChange} />
              {config.mode === 'timed' && !answered && (
                <button
                  onClick={togglePause}
                  title={isPaused ? t('study.resume') : t('study.pause')}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    isPaused
                      ? 'border-ember-300 dark:border-ember-500/50 bg-ember-50 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300'
                      : 'border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-300 hover:bg-slate-100 dark:hover:bg-sepia-800'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => setConfigOpen(true)}
                title={t('config.title')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-sepia-700 text-ink-soft dark:text-sepia-300 hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ProgressBar progress={progress} />
        </div>

        {/* Card */}
        <div className="mb-4 relative">
          {displayCard && (
            <Flashcard
              flashcard={displayCard}
              showAnswer={showAnswer}
              onToggleAnswer={() => setShowAnswer(!showAnswer)}
              autoplay={config.autoplay}
            />
          )}

          {/* Pause cover: hides the card so the user cannot peek while paused. */}
          {isPaused && !answered && config.mode === 'timed' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-ink/85 dark:bg-sepia-900/80 backdrop-blur-sm text-paper">
              <Pause className="w-10 h-10 mb-3" />
              <p className="text-lg font-semibold">{t('study.paused')}</p>
              <button
                onClick={togglePause}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-paper/15 hover:bg-paper/25 text-paper font-medium transition-colors"
              >
                <Play className="w-4 h-4" /> {t('study.resume')}
              </button>
            </div>
          )}
        </div>

        {/* Flip hint */}
        <p className="text-center text-sm text-ink-muted dark:text-sepia-300 mb-4">
          {showAnswer ? '' : t('study.flip.hint')}
        </p>

        {/* Controls */}
        <div className="bg-paper-raised dark:bg-sepia-900 rounded-3xl shadow-soft ring-1 ring-slate-200/70 dark:ring-sepia-800 p-6">
          {!showAnswer ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentCardIndex === 0}
                className="inline-flex items-center gap-1 px-5 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> {t('study.prev')}
              </button>
              <button
                onClick={() => setShowAnswer(true)}
                className="flex-1 px-6 py-3 bg-ember-500 text-paper rounded-xl font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
              >
                {t('study.show')}
              </button>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-5 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('study.next')} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : answered ? (
            <div className="space-y-4">
              <div className={`text-center p-4 rounded-xl ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'}`}>
                <div className="flex items-center justify-center mb-1">
                  {isCorrect ? <Check className="w-6 h-6 mr-2" /> : <X className="w-6 h-6 mr-2" />}
                  <span className="font-semibold">{isCorrect ? t('study.answered.correct') : t('study.answered.wrong')}</span>
                </div>
                <p className="text-sm">
                  {t('study.time')}: {elapsedRef.current} s
                </p>
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {!isLast ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-ember-500 text-paper rounded-xl font-bold hover:shadow-lift hover:-translate-y-0.5 transition-all"
                  >
                    {t('study.next')} <ChevronRight className="w-4 h-4 inline" />
                  </button>
                ) : (
                  <button
                    onClick={finishSession}
                    className="px-6 py-3 bg-ember-500 text-paper rounded-xl font-bold hover:shadow-lift hover:-translate-y-0.5 transition-all"
                  >
                    {t('reward.finish')} <Trophy className="w-4 h-4 inline" />
                  </button>
                )}
                <button
                  onClick={() => resetStudy()}
                  className="px-6 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> {t('study.restart')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-center text-ink-soft dark:text-sepia-300 mb-4 font-medium">{t('study.wasit')}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center"
                >
                  <Check className="w-4 h-4 mr-2" /> {t('study.known')}
                </button>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 px-5 py-3 bg-ember-500 text-paper rounded-xl font-semibold hover:bg-ember-600 transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4 mr-2" /> {t('study.again')}
                </button>
                <button
                  onClick={() => setShowAnswer(false)}
                  className="px-5 py-3 border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 rounded-xl hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
                >
                  {t('study.hide')}
                </button>
              </div>
            </div>
          )}

          {/* Finish button (always available, even if not on the last card). */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-sepia-800 flex justify-center">
            <button
              onClick={finishSession}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-ink-soft dark:text-sepia-300 font-medium hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
            >
              <Check className="w-4 h-4" /> {t('study.end')}
              {unansweredCount > 0 && (
                <span className="text-xs text-ember-600 dark:text-ember-400">({t('study.unanswered.warn', { count: unansweredCount })})</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDiscard}
        title={t('reward.discard')}
        message={t('reward.discard.warn')}
        confirmLabel={t('reward.discard')}
        onConfirm={() => {
          setConfirmDiscard(false)
          if (!savedToLibrary) {
            handleDiscardSession()
          } else {
            navigate('/')
          }
        }}
        onCancel={() => setConfirmDiscard(false)}
      />

      <SessionConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onStart={handleStartFromConfig}
        deckTitle={currentSession?.title}
      />
    </div>
  )
}

export default StudyPage
