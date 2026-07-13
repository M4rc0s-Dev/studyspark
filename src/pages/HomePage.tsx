import React, { useState, useRef, useEffect } from 'react'
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
import { FileText, Wand2, Brain, Sparkles, Zap, Layers, Trophy, ArrowRight, Star, Quote } from 'lucide-react'
import { avatarUrl } from '../lib/avatars'

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

  // A few sample cards that flip automatically so the upload feels alive.
  const sampleCards = [
    {
      q: '¿Cuál es la función de los cloroplastos?',
      a: 'Realizan la fotosíntesis: convierten luz, agua y CO₂ en glucosa y oxígeno.',
    },
    {
      q: '¿Qué es la repetición espaciada?',
      a: 'Un método que repasa cada tarjeta justo antes de olvidarla, para recordar más con menos tiempo.',
    },
    {
      q: '¿Qué es la mitosis?',
      a: 'División celular que genera dos células idénticas a la original, con el mismo ADN.',
    },
  ]

  const testimonials = [
    { name: 'Lucía M.', role: 'Medicina', text: 'Hice 200 tarjetas de anatomía en una tarde. Aprobé.', initial: 'L', avatar: avatarUrl('Lucia-M', 'shapes'), rating: 5 },
    { name: 'Carlos R.', role: 'Ingeniería', text: 'La repetición espaciada me salvó la carrera. Clarísimo.', initial: 'C', avatar: avatarUrl('Carlos-R', 'ring'), rating: 5 },
    { name: 'Marta G.', role: 'Oposiciones', text: 'Subí mis temas y salieron flashcards perfectas.', initial: 'M', avatar: avatarUrl('Marta-G', 'bauhaus'), rating: 4 },
  ]

  const stats = [
    { icon: Zap, value: '< 10s', label: 'Por mazo' },
    { icon: Layers, value: '4 formatos', label: 'Pregunta tipo' },
    { icon: Trophy, value: '∞', label: 'Repaso' },
  ]

  return (
    <div>
      {/* HERO — centered and serene */}
      <section className="relative overflow-hidden bg-paper text-ink dark:bg-night dark:text-sepia-100 paper-grain">
        {/* Soft floating blobs — scaled down so they never wash out the text */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[28rem] h-72 rounded-full bg-ember-400/10 dark:bg-ember-400/12 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-ember-300/10 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ember-500/30 bg-ember-500/10 text-ember-700 dark:text-ember-200 text-sm font-medium mb-7"
          >
            <Sparkles className="w-4 h-4" /> {t('hero.badge')}
          </motion.span>

          <motion.h1
            initial="hidden" animate="show" variants={fade} transition={{ duration: 0.5 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink dark:text-sepia-50 leading-[1.08] tracking-tight"
          >
            {t('hero.title.1')}{' '}
            <span className="text-ember-600 dark:text-ember-300">
              {t('hero.title.2')}
            </span>{' '}
            {t('hero.title.3')}
          </motion.h1>

          <motion.p
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.1, duration: 0.5 }}
            className="mt-6 text-lg text-ink-muted dark:text-sepia-300 max-w-xl mx-auto"
          >
            {t('hero.subtitle')}
          </motion.p>

          <motion.button
            initial="hidden" animate="show" variants={fade} transition={{ delay: 0.18, duration: 0.5 }}
            onClick={scrollToUpload}
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-ember-500 text-paper text-lg font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-5 h-5" /> {t('cta.create')}
          </motion.button>
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

      {/* UPLOAD — centered, serene, with a live sample card below it */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <UploadArea onUpload={handleUpload} isUploading={isUploading} innerRef={uploadRef} />
        </motion.div>

        {/* Live demo: the card the user is about to get, flipping on its own */}
        <div className="mt-16 max-w-xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted dark:text-sepia-300 mb-6">
            Así serán tus tarjetas
          </p>
          <SampleCardStack cards={sampleCards} centered />
        </div>
      </section>

      {/* HOW IT WORKS — minimal horizontal timeline with connectors */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.h2
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="font-display text-3xl font-bold text-center text-ink dark:text-sepia-50 mb-3"
        >
          {t('how.title')}
        </motion.h2>
        <p className="text-center text-ink-muted dark:text-sepia-300 mb-16 max-w-xl mx-auto">
          Tres pasos y empiezas a repasar. Sin configuraciones raras.
        </p>

        <div className="relative grid md:grid-cols-3 gap-y-12 md:gap-y-0 md:gap-x-8">
          {/* connecting line behind the nodes */}
          <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ember-500/40 to-transparent" aria-hidden />
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.key}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative text-center md:px-4"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-paper-raised dark:bg-sepia-900 ring-2 ring-ember-500/40 shadow-soft flex items-center justify-center mb-5 relative z-10">
                  <Icon className="w-5 h-5 text-ember-600 dark:text-ember-300" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ember-600 dark:text-ember-400">
                  0{i + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-ink dark:text-sepia-100 mb-2">{t(step.key as any)}</h3>
                <p className="text-ink-muted dark:text-sepia-300 text-sm leading-relaxed max-w-xs mx-auto">
                  {t(step.descKey as any)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* TESTIMONIALS — clean cards with avatar */}
      <section className="bg-paper-sunken dark:bg-night-soft border-t border-slate-200 dark:border-sepia-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
            className="font-display text-3xl font-bold text-center text-ink dark:text-sepia-50 mb-12"
          >
            {t('testi.title')}
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((tm, i) => (
              <motion.figure
                key={tm.name}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative bg-paper-raised dark:bg-sepia-900 rounded-3xl p-7 pt-9 ring-1 ring-slate-200/70 dark:ring-sepia-800 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all overflow-hidden"
              >
                {/* ember top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ember-500/0 via-ember-500/70 to-ember-500/0" aria-hidden />
                {/* soft quote detail */}
                <Quote className="absolute top-5 right-5 w-7 h-7 text-ember-500/15 dark:text-ember-400/15" aria-hidden />

                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={tm.avatar}
                    alt={tm.name}
                    loading="lazy"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-ember-500/30 shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-sepia-100">{tm.name}</p>
                    <p className="text-xs text-ink-muted dark:text-sepia-300">{tm.role}</p>
                  </div>
                </div>

                {/* rating */}
                <div className="flex items-center gap-0.5 mb-4" aria-label={`${tm.rating} de 5 estrellas`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s < tm.rating ? 'text-ember-500 fill-ember-500' : 'text-slate-300 dark:text-sepia-700'}`}
                    />
                  ))}
                </div>

                <blockquote className="text-ink-soft dark:text-sepia-200 text-sm leading-relaxed">
                  {tm.text}
                </blockquote>
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

// Auto-flipping sample flashcard: shows a question, flips to the answer after a
// beat, advances to the next card, and loops. Keeps the "this is what you get"
// idea alive without a single static, boxed card.
const SampleCardStack: React.FC<{ cards: { q: string; a: string }[]; centered?: boolean }> = ({ cards, centered }) => {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (cards.length === 0) return
    const flip = setTimeout(() => setFlipped(true), 2200)
    const next = setTimeout(() => {
      setFlipped(false)
      setIndex((i) => (i + 1) % cards.length)
    }, 4200)
    return () => {
      clearTimeout(flip)
      clearTimeout(next)
    }
  }, [index, cards.length])

  const card = cards[index]
  if (!card) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className={`relative [perspective:1200px] ${centered ? 'block' : 'hidden lg:block'}`}
    >
      <div
        className="relative w-full rounded-3xl transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front — question */}
        <div className="bg-paper-raised dark:bg-sepia-900 rounded-3xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-7 backface-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-ember-600 dark:text-ember-400">Pregunta</span>
            <span className="text-xs text-ink-muted dark:text-sepia-300">{index + 1} / {cards.length}</span>
          </div>
          <p className="font-display text-xl font-semibold text-ink dark:text-sepia-100 leading-snug min-h-[3.5rem]">
            {card.q}
          </p>
          <p className="mt-6 text-xs text-ink-muted dark:text-sepia-300 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" /> Pasa a la respuesta…
          </p>
        </div>

        {/* Back — answer */}
        <div
          className="absolute inset-0 bg-ember-500 rounded-3xl shadow-lift p-7 backface-hidden flex flex-col justify-center"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-paper/80 mb-3">Respuesta</span>
          <p className="text-paper text-base leading-relaxed font-medium">{card.a}</p>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-5 w-20 h-20 rounded-2xl bg-ember-500/10 ring-1 ring-ember-500/20 blur-[1px]" aria-hidden />
    </motion.div>
  )
}

export default HomePage
