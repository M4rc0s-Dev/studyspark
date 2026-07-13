import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, Sparkles, Loader2, MessageSquare, CornerDownLeft, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { cn } from '../../utils/cn'

type FollowUp = { label: string; answer: string }
type Topic = { label: string; answer: string; followups: FollowUp[] }

type ChatMessage = {
  role: 'user' | 'bot'
  content: string
}

// Conversación por árbol: primero temas generales, luego el usuario puede
// profundizar en preguntas específicas de ese tema. No hay texto libre, así
// que siempre se entrega la respuesta correcta asociada a cada opción.
const TOPICS_ES: Topic[] = [
  {
    label: 'Crear mazos',
    answer:
      'Para crear un mazo ve a Inicio, pega tus apuntes o sube un archivo (PDF, TXT o DOCX) y pulsa "Generar". La IA convierte tus notas en preguntas y respuestas en segundos. ¿Quieres saber algo más concreto sobre la creación? 😊',
    followups: [
      {
        label: '¿Qué archivos acepta?',
        answer:
          'Aceptamos PDF, TXT y DOCX. También puedes pegar tu texto directamente en el cuadro de notas, sin necesidad de subir ningún archivo. 📄',
      },
      {
        label: '¿Cuántas tarjetas genera?',
        answer:
          'Tú eliges la cantidad antes de generar: 5, 10, 15, 20 o 25 tarjetas por mazo. Elige la que mejor se adapte a lo que tengas que estudiar. 🃏',
      },
      {
        label: '¿Marca la dificultad?',
        answer:
          'Sí. La IA etiqueta cada tarjeta con su dificultad (muy fácil, fácil, media, difícil o muy difícil) y además puedes filtrar tu mazo para repasar primero las más difíciles. 🎯',
      },
    ],
  },
  {
    label: 'Modos de estudio',
    answer:
      'Tenemos 3 modos: Básico (a tu ritmo, sin prisas), Contrarreloj (30s fijos por tarjeta, te entrena a pensar rápido) y Repetición Espaciada (la IA repite cada tarjeta justo antes de que la olvides). ¿Sobre cuál quieres más detalle? ⚙️',
    followups: [
      {
        label: '¿Cómo va el contrarreloj?',
        answer:
          'En contrarreloj cada tarjeta tiene su propio temporizador de 30 segundos. Si se acaba el tiempo, la tarjeta cuenta como fallada. Puedes pausar en cualquier momento (al pausar se tapa la tarjeta para que no haya trampa). ⏱️',
      },
      {
        label: '¿Qué es repetición espaciada?',
        answer:
          'Es un método científico: la IA te muestra cada tarjeta justo antes de que la olvidarías, optimizando cuánto recuerdas con menos tiempo de estudio. 🧠',
      },
      {
        label: '¿Puedo cambiar el orden?',
        answer:
          'Claro. Antes de empezar puedes elegir el orden original, barajar las tarjetas al azar, o repasar las más difíciles primero. También puedes invertir la dirección (respuesta → pregunta). 🔀',
      },
    ],
  },
  {
    label: 'Exportar mis tarjetas',
    answer:
      'Cuando terminas una sesión ves botones para exportar ese mazo a CSV o JSON, y desde Ajustes > Mis datos puedes descargar todas tus sesiones de golpe. Así tus tarjetas viajan contigo. ¿Necesitas algo más? 📤',
    followups: [
      {
        label: '¿En qué formato?',
        answer:
          'Exportamos a CSV (ideal para hojas de cálculo y otras apps de estudio) y a JSON (para mantener toda la información, incluidas dificultades y respuestas). 📊',
      },
      {
        label: '¿Puedo llevarlas a otra app?',
        answer:
          'Sí. El CSV y el JSON son formatos universales: los abres en Excel, Google Sheets o los importas a otras aplicaciones de flashcards sin problema. 🔁',
      },
    ],
  },
  {
    label: 'Mi cuenta',
    answer:
      'Crea tu cuenta con tu email y tu progreso, racha y puntos se guardan automáticamente. Abres sesión en cualquier dispositivo y te encuentras todo tal como lo dejaste. ¿Hay algo concreto que quieras saber? 🔐',
    followups: [
      {
        label: '¿Cómo funciona la racha?',
        answer:
          'Cada día que estudias al menos una tarjeta se enciende tu llama de racha 🔥. Si un día no estudias, la racha vuelve a 1, pero tus puntos acumulados se quedan contigo. ¡Tus puntos nunca se pierden!',
      },
      {
        label: '¿Qué son los puntos y los niveles?',
        answer:
          'Ganas puntos por cada tarjeta que estudias y dominas. Cada 100 puntos subes de nivel, y en el menú de tu perfil ves una barra con el progreso hacia el siguiente nivel. 🌟',
      },
      {
        label: '¿Está seguro mi progreso?',
        answer:
          'Sí. Tus apuntes se usan solo para crear tus tarjetas en el momento y tu progreso se guarda de forma segura. No los compartimos ni vendemos. 🛡️',
      },
    ],
  },
  {
    label: 'Apoyar el proyecto',
    answer:
      'StudySpark es gratis y de código abierto, y quiero que siga siéndolo para siempre ☕ Si te resulta útil y quieres invitarme a un café, aquí tienes mi Ko-fi: https://ko-fi.com/mvalera_dev. Pero ojo: nunca es obligatorio, todos los modos son gratis igualmente. ¡Gracias de corazón! ❤️',
    followups: [
      {
        label: '¿En qué se gasta?',
        answer:
          'Tu apoyo va a servidores y hosting, al desarrollo de nuevas funciones y a mantener StudySpark gratis para todos los estudiantes. Cada aporte, por pequeño que sea, cuenta. 🙏',
      },
      {
        label: '¿Es realmente gratis?',
        answer:
          'Sí, totalmente. No hay suscripciones ni paywalls: los tres modos de estudio (básico, contrarreloj y repetición espaciada) están abiertos para siempre. La ko-fi es solo una opción, nunca una obligación. ☕',
      },
    ],
  },
]

const TOPICS_EN: Topic[] = [
  {
    label: 'Create decks',
    answer:
      'To build a deck go to Home, paste your notes or upload a file (PDF, TXT or DOCX) and hit "Generate". The AI turns your notes into questions and answers in seconds. Want to know something more specific about creating decks? 😊',
    followups: [
      {
        label: 'What files are accepted?',
        answer:
          'We accept PDF, TXT and DOCX. You can also just paste your text straight into the notes box — no file needed at all. 📄',
      },
      {
        label: 'How many cards are made?',
        answer:
          'You pick the amount before generating: 5, 10, 15, 20 or 25 cards per deck. Choose whatever fits what you need to study. 🃏',
      },
      {
        label: 'Does it tag difficulty?',
        answer:
          'Yes. The AI labels each card with its difficulty (very easy, easy, medium, hard or very hard) and you can filter your deck to review the hardest ones first. 🎯',
      },
    ],
  },
  {
    label: 'Study modes',
    answer:
      'We have 3 modes: Basic (your pace, no rush), Timed (a fixed 30s per card, trains you to think fast) and Spaced Repetition (the AI repeats each card just before you would forget it). Which would you like more detail on? ⚙️',
    followups: [
      {
        label: 'How does timed work?',
        answer:
          'In timed mode each card has its own 30-second timer. When time runs out the card counts as missed. You can pause anytime (pausing covers the card so there is no cheating). ⏱️',
      },
      {
        label: 'What is spaced repetition?',
        answer:
          'It is a scientific method: the AI shows each card just before you would forget it, optimizing how much you remember with less study time. 🧠',
      },
      {
        label: 'Can I change the order?',
        answer:
          'Of course. Before you start you can keep the original order, shuffle the cards, or review the hardest first. You can also flip the direction (answer → question). 🔀',
      },
    ],
  },
  {
    label: 'Export my cards',
    answer:
      'When you finish a session you see buttons to export that deck to CSV or JSON, and from Settings > My Data you can grab all your sessions at once. Your cards travel with you. Anything else? 📤',
    followups: [
      {
        label: 'In what format?',
        answer:
          'We export to CSV (great for spreadsheets and other study apps) and JSON (keeps everything, including difficulties and answers). 📊',
      },
      {
        label: 'Can I use them elsewhere?',
        answer:
          'Yes. CSV and JSON are universal formats: open them in Excel, Google Sheets, or import them into other flashcard apps without trouble. 🔁',
      },
    ],
  },
  {
    label: 'My account',
    answer:
      'Create your account with your email and your progress, streak and points are saved automatically. Open it on any device and everything is right where you left it. Anything specific you want to know? 🔐',
    followups: [
      {
        label: 'How does the streak work?',
        answer:
          'Every day you study at least one card your streak flame lights up 🔥. Skip a day and the streak resets to 1, but your accumulated points stay with you. Your points are never lost!',
      },
      {
        label: 'What are points and levels?',
        answer:
          'You earn points for every card studied and mastered. Every 100 points you level up, and your profile menu shows a bar with progress to the next level. 🌟',
      },
      {
        label: 'Is my progress safe?',
        answer:
          'Yes. Your notes are used only to create your cards in the moment and your progress is stored securely. We do not share or sell it. 🛡️',
      },
    ],
  },
  {
    label: 'Support the project',
    answer:
      'StudySpark is free and open source, and I want it to stay that way forever ☕ If it helps you and you would like to buy me a coffee, here is my Ko-fi: https://ko-fi.com/mvalera_dev. But heads up: it is never required, every mode is free regardless. Thank you from the bottom of my heart! ❤️',
    followups: [
      {
        label: 'Where does it go?',
        answer:
          'Your support funds servers and hosting, new feature development, and keeping StudySpark free for every student. Every bit, however small, helps. 🙏',
      },
      {
        label: 'Is it really free?',
        answer:
          'Yes, completely. No subscriptions, no paywalls: all three modes (basic, timed and spaced repetition) are open forever. Ko-fi is only an option, never an obligation. ☕',
      },
    ],
  },
]

const Chatbot: React.FC = () => {
  const { t, lang } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [openTopic, setOpenTopic] = useState<number | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingFollowups, setTypingFollowups] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const topics = lang === 'es' ? TOPICS_ES : TOPICS_EN

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingFollowups])

  // Greet the user the first time the window opens.
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'bot', content: t('chatbot.welcome') }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Reset the conversation tree when switching language so labels stay correct.
  useEffect(() => {
    if (isOpen) {
      setOpenTopic(null)
      setMessages([{ role: 'bot', content: t('chatbot.welcome') }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const pushBot = (content: string) => {
    setIsTyping(false)
    setTypingFollowups(false)
    setMessages((prev) => [...prev, { role: 'bot', content }])
  }

  const selectTopic = (index: number) => {
    if (isTyping) return
    const topic = topics[index]
    setOpenTopic(index)
    setMessages((prev) => [...prev, { role: 'user', content: topic.label }])
    setIsTyping(true)
    setTimeout(() => {
      pushBot(topic.answer)
      setTypingFollowups(true)
    }, 600 + Math.random() * 600)
  }

  const selectFollowup = (topicIndex: number, followupIndex: number) => {
    if (isTyping) return
    const topic = topics[topicIndex]
    const followup = topic.followups[followupIndex]
    setMessages((prev) => [...prev, { role: 'user', content: followup.label }])
    setIsTyping(true)
    setTypingFollowups(false)
    setTimeout(() => {
      pushBot(followup.answer)
      setTypingFollowups(true)
    }, 600 + Math.random() * 600)
  }

  const goBack = () => {
    if (isTyping) return
    setOpenTopic(null)
    setTypingFollowups(true)
  }

  // Chips shown at the bottom depend on the current branch of the conversation.
  const showRootChips = openTopic === null
  const activeTopic = openTopic !== null ? topics[openTopic] : null

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl transition-all',
          isOpen
            ? 'bg-ink rotate-45'
            : 'bg-ember-500 hover:scale-105'
        )}
        aria-label={isOpen ? t('chatbot.title') + ' - cerrar' : t('chatbot.title') + ' - abrir'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white mx-auto my-auto" />
        ) : (
          <MessageSquare className="w-7 h-7 text-white mx-auto my-auto" />
        )}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-full max-w-sm md:max-w-md bg-paper-raised dark:bg-[#161210] rounded-2xl shadow-lift border border-paper-sunken dark:border-[#2a2420] overflow-hidden flex flex-col"
            role="dialog"
            aria-label={t('chatbot.title')}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-paper-sunken dark:bg-[#0f0d0b] text-ink dark:text-stone-100 border-b border-paper-sunken dark:border-[#2a2420]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ember-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-ink" />
                </div>
                <div>
                  <p className="font-semibold font-display">{t('chatbot.title')}</p>
                  <p className="text-xs text-ember-50 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    {t('chatbot.help')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px] bg-paper-sunken dark:bg-[#0c0a09]">
              <AnimatePresence initial={false} mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'flex gap-3 max-w-[85%]',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-ink" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-ember-600 text-white rounded-br-md'
                          : 'bg-paper-raised dark:bg-[#1c1917] text-ink dark:text-stone-100 rounded-bl-md shadow-sm'
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-ink" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%]"
                >
                  <div className="w-7 h-7 rounded-full bg-ember-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-paper-raised dark:bg-[#1c1917] text-ink dark:text-stone-100 rounded-2xl px-4 py-2.5 text-sm shadow-sm">
                    <Loader2 className="w-5 h-5 text-ember-600 animate-spin mx-auto" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Conversation chips */}
            {!isTyping && (
              <div className="p-4 pt-3 flex flex-wrap gap-2 border-t border-paper-sunken dark:border-[#2a2420] bg-paper-raised dark:bg-[#161210]">
                {showRootChips ? (
                  topics.map((topic, i) => (
                    <button
                      key={topic.label}
                      onClick={() => selectTopic(i)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors bg-ember-50 dark:bg-ember-500/15 text-ember-700 dark:text-ember-300 hover:bg-ember-100 dark:hover:bg-ember-500/25"
                    >
                      {topic.label}
                    </button>
                  ))
                ) : (
                  <>
                    {activeTopic?.followups.map((followup, i) => (
                      <button
                        key={followup.label}
                        onClick={() => selectFollowup(openTopic!, i)}
                        className="text-xs px-3 py-1.5 rounded-full transition-colors bg-paper-raised dark:bg-[#1c1917] border border-ember-200 dark:border-ember-500/30 text-ember-700 dark:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/15 flex items-center gap-1"
                      >
                        <CornerDownLeft className="w-3 h-3" /> {followup.label}
                      </button>
                    ))}
                    <button
                      onClick={goBack}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors bg-paper-sunken dark:bg-[#1c1917] text-ink-muted dark:text-stone-300 hover:bg-[#e7e5e4] dark:hover:bg-[#2a2420] flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" /> {t('chatbot.back')}
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Chatbot
