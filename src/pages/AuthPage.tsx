import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { supabase as supabaseClient } from '../lib/supabase'
import { Mail, Lock, User, ArrowRight, Loader2, MailCheck, RefreshCw, CheckCircle2, Dices, Shuffle } from 'lucide-react'
import { avatarUrl, randomAvatarSeed, AVATAR_STYLES, type AvatarStyle } from '../lib/avatars'

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatarSeed, setAvatarSeed] = useState(() => randomAvatarSeed())
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('shapes')
  const [busy, setBusy] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [resending, setResending] = useState(false)
  const { t } = useLanguage()
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      toast.error(t('auth.email') + ' inválido')
      return
    }
    if (password.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        const { needsConfirmation } = await signUp(email, password, name, avatarSeed)
        if (needsConfirmation) {
          setConfirmEmail(email)
        } else {
          toast.success('¡Cuenta creada!')
          navigate('/')
        }
      } else {
        await signIn(email, password)
        toast.success('¡Sesión iniciada!')
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Algo salió mal')
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    if (!supabaseClient) return
    setResending(true)
    try {
      const { error } = await supabaseClient.auth.resend({ type: 'signup', email: confirmEmail })
      if (error) toast.error(error.message)
      else toast.success(t('auth.checkmail.sent'))
    } catch {
      toast.error('No se pudo reenviar')
    } finally {
      setResending(false)
    }
  }

  // ---- Email confirmation pending screen ----
  if (confirmEmail) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-paper-raised dark:bg-sepia-900 rounded-2xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-16 h-16 mx-auto rounded-2xl bg-ember-500 flex items-center justify-center text-paper mb-5 shadow-md"
            >
              <MailCheck className="w-8 h-8" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-ink dark:text-sepia-50">{t('auth.checkmail')}</h1>
            <p className="text-ink-muted dark:text-sepia-300 text-sm mt-2">
              {t('auth.checkmail.desc')} <span className="font-semibold text-ink-soft dark:text-sepia-200">{confirmEmail}</span>
            </p>

            <a
              href={`https://${confirmEmail.split('@')[1]}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Mail className="w-5 h-5" /> {t('auth.checkmail.open')}
            </a>

            <p className="text-xs text-ink-muted dark:text-sepia-300 mt-5">{t('auth.checkmail.note')}</p>

            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-4 inline-flex items-center gap-2 text-sm text-ember-600 dark:text-ember-400 font-semibold hover:underline disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? t('auth.checkmail.resending') : t('auth.checkmail.resend')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ---- Login / Register form ----
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-paper-raised dark:bg-sepia-900 rounded-2xl shadow-lift ring-1 ring-slate-200/70 dark:ring-sepia-800 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-ember-500 flex items-center justify-center text-paper mb-4 shadow-md">
              <User className="w-7 h-7" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink dark:text-sepia-50">
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </h1>
            <p className="text-ink-muted dark:text-sepia-300 text-sm mt-1">
              {mode === 'login' ? t('auth.login.desc') : t('auth.register.desc')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="w-5 h-5 text-ink-muted absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.name')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            {mode === 'register' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink-soft dark:text-sepia-200 flex items-center gap-2">
                    <Dices className="w-4 h-4 text-ember-500" /> {t('auth.avatar')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setAvatarSeed(randomAvatarSeed())}
                    title={t('auth.avatar.random')}
                    className="inline-flex items-center gap-1 text-xs text-ember-600 dark:text-ember-400 font-semibold hover:underline"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> {t('auth.avatar.random')}
                  </button>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] p-3">
                  <img
                    src={avatarUrl(avatarSeed, avatarStyle)}
                    alt="avatar"
                    className="w-14 h-14 rounded-full ring-2 ring-ember-500/40 bg-paper-sunken dark:bg-sepia-800 shrink-0"
                  />
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setAvatarStyle(style)}
                        title={t(`auth.avatar.${style}` as any)}
                        className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${
                          avatarStyle === style ? 'ring-ember-500 scale-105' : 'ring-transparent hover:ring-ember-300'
                        }`}
                      >
                        <img src={avatarUrl(avatarSeed, style)} alt={style} className="w-full h-full bg-paper-sunken dark:bg-sepia-800" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-ink-muted dark:text-sepia-300 mt-2">{t('auth.avatar.hint')}</p>
              </div>
            )}
            <div className="relative">
              <Mail className="w-5 h-5 text-ink-muted absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-ink-muted absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('auth.enter') : t('auth.create')} <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted dark:text-sepia-300 mt-6">
            {mode === 'login' ? t('auth.noaccount') : t('auth.hasaccount')}{' '}
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-ember-600 dark:text-ember-400 font-semibold hover:underline"
            >
              {mode === 'login' ? t('auth.toregister') : t('auth.tologin')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default AuthPage
