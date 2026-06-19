import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useStore } from '../store/useStore'
import { streamMessage, getMessages } from '../services/api'
import Sidebar         from '../components/sidebar/Sidebar'
import Message         from '../components/chat/Message'
import TypingIndicator from '../components/chat/TypingIndicator'
import InputZone       from '../components/chat/InputZone'

export default function ChatPage() {
  const navigate      = useNavigate()
  const user          = useStore((s) => s.user)
  const theme         = useStore((s) => s.theme)
  const activeConvId  = useStore((s) => s.activeConvId)
  const setActiveConv = useStore((s) => s.setActiveConv)
  const isDark        = theme === 'dark'
  const langue        = user?.langue || 'fr'

  const [messages, setMessages]             = useState([])
  const [loading, setLoading]               = useState(false)
  const [convTitre, setConvTitre]           = useState('')
  const [refreshSidebar, setRefreshSidebar] = useState(0)
  const [mobileOpen, setMobileOpen]         = useState(false)
  const messagesEndRef = useRef(null)
  const controllerRef  = useRef(null)

  const scrollBas = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => { scrollBas() }, [messages, loading])

  const chargerMessages = useCallback(async (convId) => {
    if (!convId) return
    try {
      const { data } = await getMessages(convId)
      setMessages(data.messages || [])
    } catch (_) {
      toast.error('Impossible de charger les messages.')
    }
  }, [])

  useEffect(() => {
    if (activeConvId) {
      chargerMessages(activeConvId)
    } else {
      setMessages([])
      setConvTitre('')
    }
  }, [activeConvId, chargerMessages])

  const handleSelectConv = (convId) => {
    setActiveConv(convId)
    setMobileOpen(false)
  }

  const handleNewConv = () => {
    setActiveConv(null)
    setMessages([])
    setConvTitre('')
    setMobileOpen(false)
  }

  const typewriterQueue = useRef('')
  const typewriterRaf   = useRef(null)
  const lastUpdateTime  = useRef(0)

  const arreterTypewriter = () => {
    if (typewriterRaf.current) {
      cancelAnimationFrame(typewriterRaf.current)
      typewriterRaf.current = null
    }
  }

  const demarrerTypewriter = (streamId) => {
    arreterTypewriter()
    lastUpdateTime.current = 0
    const tick = (now) => {
      if (now - lastUpdateTime.current >= 33) {
        const queue = typewriterQueue.current
        if (queue.length > 0) {
          let chunkSize
          if (queue.length > 200)     chunkSize = 16
          else if (queue.length > 80) chunkSize = 8
          else if (queue.length > 30) chunkSize = 4
          else                        chunkSize = 2
          const chunk = queue.slice(0, chunkSize)
          typewriterQueue.current = queue.slice(chunkSize)
          setMessages((prev) =>
            prev.map((m) => m.id === streamId ? { ...m, contenu: m.contenu + chunk } : m)
          )
        }
        lastUpdateTime.current = now
      }
      typewriterRaf.current = requestAnimationFrame(tick)
    }
    typewriterRaf.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => arreterTypewriter(), [])

  const handleStop = () => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    arreterTypewriter()
    typewriterQueue.current = ''
    setLoading(false)
    setRefreshSidebar((n) => n + 1)
  }

  const envoyerRequete = useCallback(async (
    texte, pieceJointe,
    convIdForce = null,
    suppresserAnciens = false,
    ancienMsgId = null,
  ) => {
    if (loading) return
    const convIdDepart = convIdForce ?? activeConvId

    if (suppresserAnciens && ancienMsgId) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === ancienMsgId)
        return idx >= 0 ? prev.slice(0, idx) : prev
      })
    }

    let contenuAffiche = texte
    if (pieceJointe?.piece_jointe_nom) {
      contenuAffiche += `\n\n📎 **Document joint :** ${pieceJointe.piece_jointe_nom}`
    }

    const msgUser = { id: Date.now(), role: 'user', contenu: contenuAffiche, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, msgUser])
    setLoading(true)
    setRefreshSidebar((n) => n + 1)

    const streamId = `stream-${Date.now()}`
    setMessages((prev) => [...prev, { id: streamId, role: 'assistant', contenu: '', created_at: new Date().toISOString() }])

    typewriterQueue.current = ''
    demarrerTypewriter(streamId)

    let convIdRecu = convIdDepart

    const controller = streamMessage(
      {
        message:            texte,
        conversation_id:    convIdDepart || null,
        utilisateur_id:     user.id,
        langue:             user.langue || 'fr',
        piece_jointe_texte: pieceJointe?.piece_jointe_texte  || null,
        piece_jointe_nom:   pieceJointe?.piece_jointe_nom    || null,
        piece_jointe_image: pieceJointe?.piece_jointe_image  || null,
      },
      (delta) => { typewriterQueue.current += delta },
      async ({ conversation_id, init }) => {
        if (init) {
          convIdRecu = conversation_id
          if (!convIdDepart || convIdDepart !== conversation_id) {
            setActiveConv(conversation_id)
            setRefreshSidebar((n) => n + 1)
            if (!convTitre) setConvTitre(texte.slice(0, 50))
          }
        } else {
          const attendre = () => {
            if (typewriterQueue.current.length === 0) {
              arreterTypewriter()
              setLoading(false)
              chargerMessages(convIdRecu).then(() => setRefreshSidebar((n) => n + 1))
            } else {
              setTimeout(attendre, 30)
            }
          }
          attendre()
        }
      },
      (err) => {
        if (err?.name === 'AbortError') return
        arreterTypewriter()
        toast.error("Erreur lors de l'envoi. Vérifiez votre connexion.")
        setMessages((prev) => prev.filter((m) => m.id !== msgUser.id && m.id !== streamId))
        setLoading(false)
      }
    )
    controllerRef.current = controller
  }, [loading, activeConvId, convTitre, user, chargerMessages])

  const handleEnvoyer  = useCallback((texte, pj) => envoyerRequete(texte, pj), [envoyerRequete])
  const handleModifier = useCallback((msgOrig, nouveau) => envoyerRequete(nouveau, null, activeConvId, true, msgOrig.id), [envoyerRequete, activeConvId])

  const msgBienvenue = {
    id: 'welcome', role: 'assistant',
    contenu: langue === 'en'
      ? `Hello! I'm **Ralnejj**, your AI health assistant specialized for Central Africa.\n\nI can help you with:\n- **Symptoms** and tropical diseases\n- **Nutrition** with local foods\n- **Maternal and child health**\n- **Prevention** and hygiene\n\nHow can I help you today?`
      : `Bonjour ! Je suis **Ralnejj**, votre assistant santé IA spécialisé pour l'Afrique centrale.\n\nJe peux vous aider avec :\n- **Symptômes** et maladies tropicales\n- **Nutrition** avec les aliments locaux\n- **Santé maternelle et infantile**\n- **Prévention** et hygiène\n\nComment puis-je vous aider aujourd'hui ?`,
  }

  const affichageMessages = messages.length === 0 && !activeConvId ? [msgBienvenue] : messages

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-black' : 'bg-[#F7F9FF]'}`}>

      {/* Sidebar desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar
          onSelectConv={handleSelectConv}
          onNewConv={handleNewConv}
          refreshTrigger={refreshSidebar}
          mobileOpen={false}
          setMobileOpen={() => {}}
        />
      </div>

      {/* Sidebar mobile — overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-[270px] h-full">
            <Sidebar
              onSelectConv={handleSelectConv}
              onNewConv={handleNewConv}
              refreshTrigger={refreshSidebar}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
            />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Header — fixed mobile, sticky desktop */}
        <div className={`flex items-center justify-between px-4 py-3 flex-shrink-0 fixed top-0 left-0 right-0 z-30 md:sticky md:relative md:top-auto md:left-auto md:right-auto ${
          isDark ? 'bg-[#0A0A0A] border-b border-[#1A1A1A]' : 'bg-white border-b border-[#E2E8FF]'
        }`}>
          <div className="flex items-center gap-3">

            {/* Bouton hamburger — visible uniquement mobile, intégré dans le header */}
            <button
              onClick={() => setMobileOpen(true)}
              className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                isDark ? 'bg-[#111] text-[#ECECEC] hover:bg-[#1A1A1A]' : 'text-white'
              }`}
              style={!isDark ? { background: '#040d22' } : undefined}
            >
              <i className="ph ph-list text-lg" />
            </button>

            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#EEF3FF]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-400 animate-pulse' : isDark ? 'bg-[#4F7EFF] animate-blink' : 'bg-[#1d4ed8] animate-blink'}`} />
              <span className={`text-[11.5px] font-bold ${isDark ? 'text-[#ECECEC]' : 'text-[#1d4ed8]'}`}>
                Ralnejj IA
              </span>
            </div>

            {(convTitre || (activeConvId && messages.length > 0)) && (
              <span className={`text-[13px] truncate max-w-[140px] sm:max-w-xs ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
                {convTitre || messages[0]?.contenu?.slice(0, 40) || ''}
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            <HBtn icon="ph-arrow-counter-clockwise" onClick={() => activeConvId && chargerMessages(activeConvId)} isDark={isDark} title="Actualiser" />
            <HBtn icon="ph-pencil-simple"           onClick={handleNewConv}   isDark={isDark} title="Nouveau chat" />
            <HBtn icon="ph ph-gear"                 onClick={() => navigate('/parametres')} isDark={isDark} title="Paramètres" />
          </div>
        </div>

        {/* Zone messages */}
        <div className={`flex-1 overflow-y-auto px-4 py-5 pt-20 md:pt-5 flex flex-col gap-3.5 scrollbar-thin ${
          isDark ? 'bg-black' : 'bg-[#F7F9FF]'
        }`}>
          {affichageMessages.map((msg, i) => (
            <Message
              key={msg.id || i}
              msg={msg}
              isLast={i === affichageMessages.length - 1}
              onModifier={!loading ? handleModifier : null}
            />
          ))}
          {loading && !affichageMessages[affichageMessages.length - 1]?.contenu && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone saisie */}
        <div className="flex-shrink-0">
          <InputZone onEnvoyer={handleEnvoyer} loading={loading} onStop={handleStop} />
        </div>
      </div>
    </div>
  )
}

function HBtn({ icon, onClick, isDark, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
        isDark
          ? 'bg-[#1A1A1A] text-[#555] hover:text-[#ECECEC] hover:bg-[#222]'
          : 'bg-[#F0F3FF] text-[#9AA5C0] hover:bg-[#E2EAFF] hover:text-[#1d4ed8]'
      }`}
    >
      <i className={`ph ${icon} text-base`} />
    </button>
  )
}