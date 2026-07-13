import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mail, Send, Loader2, ArrowLeft, MessageCircle, CheckCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

const ContactPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user, profile } = useAuth()

  // Pre-fill name/email from the signed-in profile whenever available.
  const [formData, setFormData] = useState(() => ({
    name: profile?.name || user?.name || '',
    email: user?.email || profile?.email || '',
    subject: '',
    message: '',
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to send')
    } catch {
      toast.error('No se pudo enviar el mensaje. Inténtalo de nuevo.')
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setShowSuccess(true)
    setFormData({
      name: profile?.name || user?.name || '',
      email: user?.email || profile?.email || '',
      subject: '',
      message: '',
    })
    toast.success(t('contact.sent'))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-paper-raised dark:bg-[#1e2c3c] rounded-3xl shadow-lift border border-paper-sunken dark:border-[#33465c] p-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="w-20 h-20 mx-auto rounded-2xl bg-ember-50 dark:bg-ember-500/15 flex items-center justify-center text-ember-600 dark:text-ember-400 shadow-soft"
          >
            <CheckCircle className="w-10 h-10" />
          </motion.div>
          <h1 className="mt-6 font-display text-3xl font-semibold text-ink dark:text-sepia-100">{t('contact.success.title')}</h1>
          <p className="mt-2 text-ink-muted dark:text-sepia-300">{t('contact.success.desc')}</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => { setShowSuccess(false); navigate(-1) }}
              className="px-6 py-3 bg-ember-500 text-paper rounded-xl font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> {t('contact.another')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-[#cbd5e1] dark:border-[#455b76] dark:text-sepia-200 text-ink-soft dark:text-sepia-300 rounded-xl hover:bg-paper-sunken dark:hover:bg-[#111d2a] transition-colors"
            >
              {t('contact.home')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <motion.div
        initial="hidden" animate="show" variants={fade}
        className="text-center mb-10"
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ember-50 dark:bg-ember-500/15 text-ember-600 dark:text-ember-300 text-sm font-medium mb-4">
          <MessageCircle className="w-4 h-4" /> {t('contact.title')}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-sepia-100">{t('contact.title')}</h1>
        <p className="mt-3 text-ink-muted dark:text-sepia-300">{t('contact.subtitle')}</p>
      </motion.div>

      <motion.form
        initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}
        onSubmit={handleSubmit}
        className="bg-paper-raised dark:bg-[#1e2c3c] rounded-3xl shadow-soft border border-paper-sunken dark:border-[#33465c] p-8"
      >
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-2">
              {t('contact.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] dark:text-sepia-100 dark:placeholder-sepia-300 rounded-xl focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-2">
              {t('contact.email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] dark:text-sepia-100 dark:placeholder-sepia-300 rounded-xl focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="subject" className="block text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-2">
            {t('contact.subject')}
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] dark:text-sepia-100 dark:placeholder-sepia-300 rounded-xl focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition"
            placeholder="Asunto del mensaje"
          />
        </div>

        <div className="mb-8">
          <label htmlFor="message" className="block text-sm font-semibold text-ink-soft dark:text-sepia-200 mb-2">
            {t('contact.message')}
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full px-4 py-3 border border-paper-sunken dark:border-[#33465c] dark:bg-[#111d2a] dark:text-sepia-100 dark:placeholder-sepia-300 rounded-xl focus:ring-2 focus:ring-ember-500 focus:border-transparent outline-none transition resize-none"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 rounded-xl bg-ember-500 text-paper font-semibold shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {t('contact.sending')}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> {t('contact.send')}
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-ink-muted dark:text-sepia-300">
          {t('contact.privacy')}
        </p>
      </motion.form>

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-ember-600 dark:text-ember-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> {t('study.back')}
        </button>
      </div>
    </div>
  )
}

export default ContactPage
