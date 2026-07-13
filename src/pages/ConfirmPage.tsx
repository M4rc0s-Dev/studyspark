import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ConfirmPage: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { refreshSessions } = useAuth()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'recovery'>('loading')

  // New-password form state (only used in the recovery branch).
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const type = params.get('type')

  useEffect(() => {
    const token_hash = params.get('token_hash')

    const finish = (ok: boolean) => {
      setStatus(ok ? 'ok' : 'error')
      if (ok) window.setTimeout(() => navigate('/', { replace: true }), 1800)
    }

    // Password reset: verify the OTP, then let the user set a new password.
    if (type === 'recovery' && token_hash && supabase) {
      supabase.auth
        .verifyOtp({ token_hash, type: 'recovery' })
        .then(async ({ error }) => {
          if (error) {
            finish(false)
            return
          }
          // Session is now active; show the new-password form.
          setStatus('recovery')
        })
        .catch(() => finish(false))
      return
    }

    if (token_hash && type && supabase) {
      supabase.auth
        .verifyOtp({ token_hash, type: type as any })
        .then(({ error }) => finish(!error))
        .catch(() => finish(false))
    } else {
      finish(false)
    }
  }, [params, navigate, type])

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Mínimo 6 caracteres')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase!.auth.updateUser({ password: newPassword })
      if (error) throw error
      setDone(true)
      window.setTimeout(() => navigate('/', { replace: true }), 1600)
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="bg-paper-raised dark:bg-[#1e2c3c] rounded-2xl shadow-lift border border-paper-sunken dark:border-[#33465c] p-10">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 mx-auto text-ember-500 animate-spin" />
              <p className="mt-4 text-ink-soft dark:text-sepia-300">{t('auth.checkmail')}…</p>
            </>
          )}

          {status === 'recovery' && !done && (
            <form onSubmit={handleSavePassword}>
              <div className="w-16 h-16 mx-auto rounded-full bg-ember-50 dark:bg-ember-500/15 flex items-center justify-center text-ember-600 dark:text-ember-400 mb-4">
                <Lock className="w-9 h-9" />
              </div>
              <h1 className="mt-2 font-display text-xl font-semibold text-ink dark:text-sepia-100">{t('auth.recovery.title')}</h1>
              <p className="mt-1 text-sm text-ink-muted dark:text-sepia-300 mb-5">{t('auth.recovery.desc')}</p>
              <div className="relative">
                <Lock className="w-5 h-5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.password')}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-sepia-600 dark:bg-sepia-800 dark:text-sepia-50 dark:placeholder-sepia-300 focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ember-500 text-paper font-bold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t('auth.recovery.save')} <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          )}

          {status === 'recovery' && done && (
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          )}

          {status === 'ok' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto rounded-full bg-ember-50 dark:bg-ember-500/15 flex items-center justify-center text-ember-600 dark:text-ember-400"
              >
                <CheckCircle2 className="w-9 h-9" />
              </motion.div>
              <h1 className="mt-4 font-display text-xl font-semibold text-ink dark:text-sepia-100">{t('auth.confirmed')}</h1>
              <p className="mt-1 text-sm text-ink-muted dark:text-sepia-300">{t('auth.confirmed.desc')}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <XCircle className="w-9 h-9" />
              </div>
              <h1 className="mt-4 font-display text-xl font-semibold text-ink dark:text-sepia-100">{t('auth.confirm.error')}</h1>
              <button
                onClick={() => navigate('/auth', { replace: true })}
                className="mt-5 inline-flex items-center px-5 py-2.5 rounded-xl border border-ember-600 text-ember-600 dark:text-ember-400 font-semibold hover:bg-ember-50 dark:hover:bg-ember-500/10 transition-colors"
              >
                {t('auth.backto.login')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ConfirmPage
