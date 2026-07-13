import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'

const ConfirmPage: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const token_hash = params.get('token_hash')
    const type = params.get('type')

    const finish = (ok: boolean) => {
      setStatus(ok ? 'ok' : 'error')
      // Give the user a moment to read the result, then go home.
      window.setTimeout(() => navigate('/', { replace: true }), ok ? 1800 : 2600)
    }

    if (token_hash && type && supabase) {
      supabase.auth
        .verifyOtp({ token_hash, type: type as any })
        .then(({ error }) => finish(!error))
        .catch(() => finish(false))
    } else {
      finish(false)
    }
  }, [params, navigate])

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
