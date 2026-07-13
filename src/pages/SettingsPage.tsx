import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Globe, Coffee, Sparkles, Download, Trash2, Brain, Clock, Repeat, ArrowLeft, Check, Layers, ChevronDown, Dices, KeyRound, Lock, Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { exportSessions } from '../lib/export'
import { CARD_COUNT_OPTIONS, CARD_COUNT_AUTO, MAX_CARDS } from '../context/SettingsContext'
import type { StudyMode } from '../context/SettingsContext'
import type { StudySession } from '../types'
import { AVATAR_SEEDS } from '../lib/avatars'
import AvatarPicker from '../components/Layout/AvatarPicker'
import ConfirmDialog from '../components/Layout/ConfirmDialog'

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

const defaultModes: { id: StudyMode; icon: typeof Brain; key: string }[] = [
  { id: 'basic', icon: Brain, key: 'mode.basic' },
  { id: 'timed', icon: Clock, key: 'mode.timed' },
  { id: 'spaced-repetition', icon: Repeat, key: 'mode.spaced' },
]

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t, lang, toggle } = useLanguage()
  const { user, profile, sessions, updateAvatar, updatePassword } = useAuth()
  const { prefs, setPrefs, resetLocalProgress } = useSettings()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [avatarSeed, setAvatarSeed] = useState(() => profile?.avatar || AVATAR_SEEDS[0])
  const [showPw, setShowPw] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [newPw, setNewPw] = useState('')

  // Keep the local preview in sync when the profile loads/changes.
  useEffect(() => {
    if (profile?.avatar) setAvatarSeed(profile.avatar)
  }, [profile?.avatar])

  const handleAvatarChange = async (seed: string) => {
    setAvatarSeed(seed)
    await updateAvatar(seed)
    toast.success(t('settings.avatar.saved'))
  }

  const handleChangePassword = async () => {
    if (newPw.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    setPwBusy(true)
    try {
      await updatePassword(newPw)
      toast.success(t('settings.password.saved'))
      setNewPw('')
      setShowPw(false)
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cambiar')
    } finally {
      setPwBusy(false)
    }
  }

  const handleDelete = () => {
    resetLocalProgress()
    setConfirmDelete(false)
    toast.success(t('settings.deleted'))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-ink-muted dark:text-sepia-300 hover:text-ink dark:hover:text-sepia-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t('study.back')}
      </button>

      <motion.h1
        initial="hidden" animate="show" variants={fade}
        className="font-display text-3xl font-semibold text-ink dark:text-sepia-100"
      >
        {t('settings.title')}
      </motion.h1>
      <p className="text-ink-muted dark:text-sepia-300 mb-8">{t('settings.subtitle')}</p>

      <div className="space-y-6">
        {/* Language */}
        <motion.section
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-6"
        >
          <h2 className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2 mb-4 font-display">
            <Globe className="w-5 h-5 text-ember-500" /> {t('settings.language')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => { if (lang !== l) toggle() }}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  lang === l
                    ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300 font-semibold'
                    : 'border-paper-sunken dark:border-[#33465c] text-ink-muted dark:text-sepia-300 hover:border-ember-300'
                }`}
              >
                {lang === l && <Check className="w-4 h-4" />}
                {l === 'es' ? t('settings.lang.es') : t('settings.lang.en')}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Study preferences */}
        <motion.section
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-6"
        >
          <h2 className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2 mb-4 font-display">
            <Sparkles className="w-5 h-5 text-ember-500" /> {t('settings.studyprefs')}
          </h2>

          <div className="mb-5">
            <p className="text-sm font-medium text-ink-soft dark:text-sepia-200 mb-2">{t('settings.defaultmode')}</p>
            <div className="grid grid-cols-3 gap-2">
              {defaultModes.map((m) => {
                const Icon = m.icon
                const active = prefs.defaultMode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setPrefs({ defaultMode: m.id })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                      active
                        ? 'border-ember-500 bg-ember-50 dark:bg-ember-500/15'
                        : 'border-paper-sunken dark:border-[#33465c] hover:border-ember-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-ember-600 dark:text-ember-400' : 'text-ink-muted'}`} />
                    <span className="text-xs font-medium text-ink-soft dark:text-sepia-200">{t(m.key as any)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm font-medium text-ink-soft dark:text-sepia-200 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-ember-500" /> {t('settings.cardcount')}
            </p>
            <div className="relative">
              <select
                value={prefs.cardCount}
                onChange={(e) => setPrefs({ cardCount: Number(e.target.value) })}
                className="w-full appearance-none px-4 py-3 rounded-xl border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] dark:text-sepia-100 text-sm font-medium text-ink focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none cursor-pointer transition"
              >
                <option value={CARD_COUNT_AUTO}>{t('upload.cardcount.auto')}</option>
                {CARD_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} {n === MAX_CARDS ? `(${t('settings.cardcount.max')})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-ink-muted absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-paper-sunken dark:border-[#33465c] p-3 cursor-pointer hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ember-500" />
              <span>
                <span className="block text-sm font-medium text-ink-soft dark:text-sepia-200">{t('settings.speak')}</span>
                <span className="block text-xs text-ink-muted dark:text-sepia-300">{t('settings.speak.desc')}</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={prefs.autoplay}
              onChange={(e) => setPrefs({ autoplay: e.target.checked })}
              className="w-5 h-5 accent-ember-600 cursor-pointer"
            />
          </label>
        </motion.section>

        {/* Profile avatar */}
        <motion.section
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-6"
        >
          <h2 className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2 mb-4 font-display">
            <Dices className="w-5 h-5 text-ember-500" /> {t('settings.avatar')}
          </h2>
          <div className="flex items-center gap-4">
            <AvatarPicker value={avatarSeed} onSelect={handleAvatarChange} size="md" label={t('settings.avatar')} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-soft dark:text-sepia-200 truncate">{profile?.name || user?.name}</p>
              <p className="text-xs text-ink-muted dark:text-sepia-300 truncate">{user?.email}</p>
            </div>
          </div>
        </motion.section>

        {/* Account / support */}
        <motion.section
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-6"
        >
          <h2 className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2 mb-4 font-display">
            <Coffee className="w-5 h-5 text-ember-500" /> {t('settings.account')}
          </h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted dark:text-sepia-300">{t('settings.plan')}</p>
              <p className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ember-500" /> {t('profile.free')}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-paper-sunken dark:border-[#33465c] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-soft dark:text-sepia-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-ember-500" /> {t('settings.password')}
              </p>
              <p className="text-xs text-ink-muted dark:text-sepia-300">{t('settings.password.desc')}</p>
            </div>
            <button
              onClick={() => setShowPw(true)}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ember-500 text-paper text-sm font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Lock className="w-4 h-4" /> {t('settings.password.change')}
            </button>
          </div>
          <a
            href="https://ko-fi.com/mvalera_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ember-500 text-paper text-sm font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
          >
            <Coffee className="w-4 h-4" /> {t('support.kofi')}
          </a>
          <p className="mt-3 text-xs text-ink-muted dark:text-sepia-300 text-center">{t('support.thanks')}</p>
        </motion.section>

        {/* Data */}
        <motion.section
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-6"
        >
          <h2 className="font-semibold text-ink dark:text-sepia-100 flex items-center gap-2 mb-4 font-display">
            <Download className="w-5 h-5 text-ember-600" /> {t('settings.data')}
          </h2>

          <div className="rounded-xl border border-paper-sunken dark:border-[#33465c] p-3 mb-3">
            <p className="text-sm font-medium text-ink-soft dark:text-sepia-200">{t('settings.export')}</p>
            <p className="text-xs text-ink-muted dark:text-sepia-300 mb-2">{t('settings.export.desc')}</p>
            <button
              onClick={() => {
                const decks: StudySession[] = sessions.map((s) => ({
                  id: s.id,
                  title: s.title,
                  flashcards: (s.flashcards as StudySession['flashcards']) || [],
                  createdAt: new Date(s.created_at),
                  studyMode: (s.study_mode as StudySession['studyMode']) || 'basic',
                }))
                exportSessions(decks, 'csv')
                toast.success(t('export.done'))
              }}
              disabled={sessions.length === 0}
              className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ember-600 text-white text-sm font-semibold hover:bg-ember-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> {t('export.csv')}
            </button>
          </div>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> {t('settings.delete')}
            </button>
          ) : (
            <div className="rounded-xl border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-4">
              <p className="text-sm text-rose-700 dark:text-rose-300 mb-3">{t('settings.delete.confirm')}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
                >
                  {t('settings.delete')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 rounded-xl border border-[#cbd5e1] dark:border-[#455b76] dark:text-sepia-200 text-ink-muted dark:text-sepia-300 text-sm font-medium hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors"
                >
                  {t('config.cancel')}
                </button>
              </div>
            </div>
          )}

          {!user && (
            <p className="mt-3 text-xs text-ink-muted dark:text-sepia-300">{t('auth.login.desc')}</p>
          )}
        </motion.section>

        {/* Change password modal */}
        {showPw && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/50 dark:bg-sepia-900/60 backdrop-blur-sm" onClick={() => setShowPw(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-paper-raised dark:bg-sepia-900 rounded-2xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-6"
            >
              <h3 className="font-display text-lg font-bold text-ink dark:text-sepia-50 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-ember-500" /> {t('settings.password.change')}
              </h3>
              <div className="relative mt-4">
                <Lock className="w-5 h-5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoFocus
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                  placeholder={t('settings.password.new')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 text-sm outline-none focus:ring-2 focus:ring-ember-500"
                />
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => { setShowPw(false); setNewPw('') }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-sepia-600 dark:text-sepia-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-sepia-800 transition-colors"
                >
                  {t('config.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={pwBusy}
                  className="px-4 py-2.5 rounded-xl bg-ember-500 text-paper text-sm font-bold shadow-soft hover:shadow-lift transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {pwBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {t('settings.password.change')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
