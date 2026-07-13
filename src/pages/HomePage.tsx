import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import UploadArea from '../components/Features/UploadArea'
import SessionConfigModal from '../components/Study/SessionConfigModal'
import LoadingScreen from '../components/Features/LoadingScreen'
import { toast } from 'react-hot-toast'
import FlashcardAPI from '../services/apiService'
import { useLanguage } from '../context/LanguageContext'
import { useFlashcardStore } from '../context/FlashcardContext'
import { useSettings } from '../context/SettingsContext'
import { saveSessionToSupabase } from '../lib/sessions'
import { StudySession } from '../types'
import type { SessionConfig } from '../context/SettingsContext'
import { FileText, Wand2, Brain, Sparkles, Zap, Layers, Trophy, Quote } from 'lucide-react'

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
}

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [isUploading, setIsUploading] = useState(false)
  // Last generation error, shown on the loading screen with a Cancel button.
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loadingElapsed, setLoadingElapsed] = useState(0)
  const [pendingCards, setPendingCards] = useState<{ title: string; cards: StudySession['flashcards'] } | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const uploadRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()
  const { createSession } = useFlashcardStore()
  const { prefs } = useSettings()

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Called from the loading screen's Cancel button: abort the poll loop and
  // drop the overlay so the user is never stuck on a frozen screen.
  const cancelUpload = () => {
    try { FlashcardAPI.cancel() } catch {}
    setIsUploading(false)
    setUploadError(null)
  }

  const handleUpload = async (file?: File, text?: string, fileName?: string, cardCount?: number) => {
    setIsUploading(true)
    setLoadingElapsed(0)
    setUploadError(null)
    try {
      // cardCount may be -1 (let the AI decide); only fall back to the default
      // when nothing was provided at all.
      const finalCount = cardCount === undefined ? prefs.cardCount : cardCount
      // Async flow: the Worker returns a jobId immediately and we poll Supabase
      // until the AI finishes, driving the staged loading screen with onTick.
      const response = await FlashcardAPI.generateFlashcards(
        text || '',
        file,
        fileName,
        finalCount,
        (elapsedMs) => setLoadingElapsed(elapsedMs)
      )
      const cards = response.flashcards || []
      if (!cards.length) {
        toast.error('La IA no devolvió tarjetas. Prueba con más texto.')
        return
      }
      const title = fileName?.trim() || 'Mis flashcards'
      setPendingCards({ title, cards })
      setConfigOpen(true)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudieron generar las flashcards. Inténtalo de nuevo.'
      setUploadError(msg)
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const startStudy = (cfg: SessionConfig) => {
    if (!pendingCards) return
    const id = createSession(pendingCards.title, pendingCards.cards, cfg.mode)
    const session: StudySession = {
      id,
      title: pendingCards.title,
      fileName: pendingCards.title,
      flashcards: pendingCards.cards,
      createdAt: new Date(),
      studyMode: cfg.mode,
      timeSpent: 0,
      score: 0,
    }
    // Persist the chosen order/direction on the session so it survives reload.
    saveSessionToSupabase(session)
    toast.success('¡Flashcards generadas!')
    setConfigOpen(false)
    setPendingCards(null)
    // Pass the full session config (mode, order, direction, autoplay) through
    // navigation state so StudyPage starts with exactly what the user chose
    // instead of falling back to the default preferences.
    navigate('/study', { state: { config: cfg } })
  }

  const steps = [
    { icon: FileText, key: 'how.step1', descKey: 'how.step1.desc' },
    { icon: Wand2, key: 'how.step2', descKey: 'how.step2.desc' },
    { icon: Brain, key: 'how.step3', descKey: 'how.step3.desc' },
  ]

  const testimonials = [
    { name: 'Lucía M.', role: 'Medicina', text: 'Hice 200 tarjetas de anatomía en una tarde. Aprobé.', initial: 'L' },
    { name: 'Carlos R.', role: 'Ingeniería', text: 'La repetición espaciada me salvó la carrera. Clarísimo.', initial: 'C' },
    { name: 'Marta G.', role: 'Oposiciones', text: 'Subí mis temas y salieron flashcards perfectas.', initial: 'M' },
  ]

  const stats = [
    { icon: Zap, value: '< 10s', label: 'Por mazo' },
    { icon: Layers, value: '4 formatos', label: 'Pregunta tipo' },
    { icon: Trophy, value: '∞', label: 'Repaso' },
  ]

  return (
    <div>
      {/* HERO — asymmetric editorial split: pitch left, illustration right */}
      <section className="relative overflow-hidden bg-paper text-ink dark:bg-gradient-to-br dark:from-[#111f36] dark:via-[#16273f] dark:to-[#1d3350] dark:text-sepia-100 paper-grain">
        {/* Soft floating blobs — scaled down so they never wash out the text */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-ember-400/10 dark:bg-ember-400/15 blur-2xl animate-blob" />
        <div className="absolute top-32 -right-16 w-80 h-80 rounded-full bg-ember-300/10 dark:bg-ember-300/10 blur-2xl animate-blob animation-delay-2000" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div>
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ember-500/30 bg-ember-500/10 text-ember-700 dark:text-ember-200 text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" /> {t('hero.badge')}
            </motion.span>

            <motion.h1
              initial="hidden" animate="show" variants={fade} transition={{ duration: 0.5 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink dark:text-sepia-50 leading-[1.05] tracking-tight"
            >
              {t('hero.title.1')}{' '}
              <span className="text-ember-600 dark:text-ember-300">
                {t('hero.title.2')}
              </span>{' '}
              {t('hero.title.3')}
            </motion.h1>

            <motion.p
              initial="hidden" animate="show" variants={fade} transition={{ delay: 0.1, duration: 0.5 }}
              className="mt-5 text-lg text-ink-muted dark:text-sepia-300 max-w-xl"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.button
              initial="hidden" animate="show" variants={fade} transition={{ delay: 0.18, duration: 0.5 }}
              onClick={scrollToUpload}
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-ember-500 text-paper text-base font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-5 h-5" /> {t('cta.create')}
            </motion.button>
          </div>

          {/* Editorial illustration panel — visible on large screens */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="relative hidden lg:block"
          >
            <div className="bg-paper-raised dark:bg-sepia-800/90 rounded-3xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-700/60 p-7">
              <StudyIllustration />
              <p className="mt-5 font-display text-lg font-semibold text-ink dark:text-sepia-50 leading-snug">
                Tu material, convertido en repaso inteligente.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft dark:text-sepia-300">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ember-500" /> Sube PDF, Word o texto</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ember-500" /> La IA crea las tarjetas</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-ember-500" /> Estudia con repetición espaciada</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS band — quiet, sits on the page */}
      <section className="bg-paper-sunken dark:bg-night-soft border-y border-slate-200 dark:border-sepia-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-3 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <Icon className="w-7 h-7 mx-auto mb-2 text-ember-600 dark:text-ember-300" />
                <p className="text-2xl font-display font-bold text-ink dark:text-sepia-50">{s.value}</p>
                <p className="text-xs text-ink-muted dark:text-sepia-300">{s.label}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* UPLOAD — its own dedicated, calm section */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          transition={{ duration: 0.5 }}
        >
          <UploadArea onUpload={handleUpload} isUploading={isUploading} innerRef={uploadRef} />
        </motion.div>
      </section>

      {/* HOW IT WORKS — symmetric numbered steps */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.h2
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="font-display text-3xl font-bold text-center text-ink dark:text-sepia-50 mb-4"
        >
          {t('how.title')}
        </motion.h2>
        <p className="text-center text-ink-muted dark:text-sepia-300 mb-12 max-w-xl mx-auto">
          Tres pasos y empiezas a repasar. Sin configuraciones raras.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.key}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative bg-paper-raised dark:bg-sepia-900 rounded-3xl p-7 ring-1 ring-slate-200/70 dark:ring-sepia-800 shadow-soft hover:shadow-lift transition-all"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-11 h-11 rounded-2xl bg-ember-500 text-paper flex items-center justify-center font-display font-bold text-lg">
                    {i + 1}
                  </span>
                  <Icon className="w-6 h-6 text-ink-soft dark:text-sepia-300" />
                </div>
                <h3 className="text-lg font-semibold text-ink dark:text-sepia-100 mb-2">{t(step.key as any)}</h3>
                <p className="text-ink-muted dark:text-sepia-300 text-sm leading-relaxed">{t(step.descKey as any)}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* TESTIMONIALS — editorial pull-quotes */}
      <section className="bg-paper-sunken dark:bg-night-soft border-t border-slate-200 dark:border-sepia-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="font-display text-3xl font-bold text-center text-ink dark:text-sepia-50 mb-12 flex items-center justify-center gap-3"
          >
            <Quote className="w-7 h-7 text-ember-600 dark:text-ember-400" />
            {t('testi.title')}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((tm, i) => (
              <motion.figure
                key={tm.name}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative bg-paper-raised dark:bg-sepia-900 rounded-3xl p-7 ring-1 ring-slate-200/70 dark:ring-sepia-800 shadow-soft hover:shadow-lift transition-all"
              >
                <span className="font-display text-5xl text-ember-400/60 leading-none block mb-2 select-none">"</span>
                <blockquote className="text-ink-soft dark:text-sepia-200 text-sm leading-relaxed -mt-4 mb-5">
                  {tm.text}
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ink dark:bg-sepia-100 flex items-center justify-center text-paper dark:text-ink font-semibold text-sm">
                    {tm.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-sepia-100">{tm.name}</p>
                    <p className="text-xs text-ink-muted dark:text-sepia-300">{tm.role}</p>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-ink dark:bg-gradient-to-br dark:from-[#16273f] dark:via-[#16273f] dark:to-[#1d3350] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="font-display text-3xl font-bold text-paper dark:text-sepia-50"
          >
            {t('cta.bottom')}
          </motion.h2>
          <motion.button
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade} transition={{ delay: 0.1 }}
            onClick={scrollToUpload}
            className="mt-8 inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-ember-500 text-paper text-lg font-bold shadow-xl hover:-translate-y-0.5 hover:shadow-lift transition-all"
          >
            <Sparkles className="w-5 h-5" /> {t('cta.create')}
          </motion.button>
        </div>
      </section>

      <SessionConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onStart={startStudy}
        deckTitle={pendingCards?.title}
      />

      {isUploading && <LoadingScreen elapsedMs={loadingElapsed} error={uploadError} onCancel={cancelUpload} />}
    </div>
  )
}

// Inline editorial illustration — no external assets, scales cleanly, theme-aware.
const StudyIllustration: React.FC = () => (
  <svg viewBox="0 0 320 200" className="w-full h-auto" role="img" aria-label="Ilustración de estudio con tarjetas">
    <defs>
      <linearGradient id="ss-book" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e2a38" />
        <stop offset="100%" stopColor="#3a4a5c" />
      </linearGradient>
      <linearGradient id="ss-card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6a88ab" />
        <stop offset="100%" stopColor="#3a5670" />
      </linearGradient>
    </defs>
    {/* open book */}
    <path d="M40 60 C70 40 110 40 150 58 L150 150 C110 132 70 132 40 152 Z" fill="url(#ss-book)" />
    <path d="M280 60 C250 40 210 40 170 58 L170 150 C210 132 250 132 280 152 Z" fill="url(#ss-book)" />
    <path d="M150 58 L170 58 L170 150 L150 150 Z" fill="#0a1420" opacity="0.6" />
    {/* lines on pages */}
    <g stroke="#f3f5f8" strokeOpacity="0.35" strokeWidth="2">
      <line x1="60" y1="80" x2="135" y2="72" />
      <line x1="60" y1="96" x2="135" y2="88" />
      <line x1="60" y1="112" x2="135" y2="104" />
      <line x1="185" y1="72" x2="260" y2="80" />
      <line x1="185" y1="88" x2="260" y2="96" />
      <line x1="185" y1="104" x2="260" y2="112" />
    </g>
    {/* floating flashcards */}
    <g transform="rotate(-8 250 40)">
      <rect x="222" y="20" width="64" height="40" rx="8" fill="url(#ss-card)" />
      <rect x="230" y="30" width="40" height="4" rx="2" fill="#f3f5f8" opacity="0.7" />
      <rect x="230" y="40" width="30" height="4" rx="2" fill="#f3f5f8" opacity="0.5" />
    </g>
    <g transform="rotate(6 70 170)">
      <rect x="44" y="150" width="56" height="36" rx="8" fill="#f3f5f8" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="72" cy="168" r="7" fill="#4a6c86" />
    </g>
    {/* spark */}
    <path d="M155 18 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5 Z" fill="#6a88ab" />
  </svg>
)

export default HomePage
