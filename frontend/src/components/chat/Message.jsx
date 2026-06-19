/**
 * Message.jsx — Bulle de message Ralnejj Santé v3
 *
 * Thème clair :
 *  - Bulle utilisateur : même dégradé bleu nuit que la sidebar (#040d22)
 *  - Avatar utilisateur : même couleur (#040d22)
 *  - Avatar IA : même couleur (#040d22)
 * Thème sombre : comportement inchangé
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState, memo, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { envoyerFeedback } from '../../services/api'
import { useStore } from '../../store/useStore'

function Message({ msg, isLast, onModifier }) {
  const user   = useStore((s) => s.user)
  const theme  = useStore((s) => s.theme)
  const isDark = theme === 'dark'
  const langue = user?.langue || 'fr'

  const isUser     = msg.role === 'user'
  const isStreaming = typeof msg.id === 'string' && msg.id.startsWith('stream-')

  const [vote, setVote]             = useState(null)
  const [enEdition, setEnEdition]   = useState(false)
  const [texteEdite, setTexteEdite] = useState(msg.contenu)
  const textareaRef = useRef(null)

  // Initiales de l'avatar utilisateur
  const initiales = user?.nom
    ? user.nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  // Auto-resize du textarea en mode édition
  useEffect(() => {
    if (enEdition && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [enEdition])

  // ── Feedback (pouce haut/bas) ────────────────────────────────
  const handleVote = async (val) => {
    if (vote === val) return
    setVote(val)
    try {
      await envoyerFeedback({ message_id: msg.id, utilisateur_id: user.id, vote: val })
      toast.success(val === 1 ? 'Merci pour votre retour !' : 'Retour enregistré.')
    } catch (_) {}
  }

  // ── Copier le message ────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.contenu)
    toast.success('Copié !')
  }

  // ── Édition message utilisateur ──────────────────────────────
  const handleClickModifier = () => {
    setTexteEdite(msg.contenu)
    setEnEdition(true)
  }

  const handleAnnulerEdition = () => {
    setEnEdition(false)
    setTexteEdite(msg.contenu)
  }

  const handleEnvoyerModification = () => {
    const nouveau = texteEdite.trim()
    if (!nouveau || nouveau === msg.contenu) { setEnEdition(false); return }
    setEnEdition(false)
    onModifier?.(msg, nouveau)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyerModification() }
    if (e.key === 'Escape') handleAnnulerEdition()
  }

  // ── Couleurs thème clair — identiques à la sidebar ───────────
  const DARK_NAV  = '#040d22'   // bleu nuit sidebar
  const GRAD_USER = 'linear-gradient(135deg, #040d22 0%, #0d2257 50%, #1d4ed8 100%)'

  return (
    <div className={`flex gap-2.5 max-w-[84%] animate-fade-in ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>

      {/* ── Avatar ────────────────────────────────────────────── */}
      <div
        className="w-[29px] h-[29px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
        style={{
          background: isUser
            ? isDark ? '#1A1A1A' : DARK_NAV
            : isDark ? '#4F7EFF' : DARK_NAV,
          color: isUser && isDark ? '#ECECEC' : 'white',
        }}
      >
        {isUser ? initiales : 'R'}
      </div>

      <div className={isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}>

        {/* ── Mode édition ──────────────────────────────────────── */}
        {isUser && enEdition ? (
          <div
            className="w-full rounded-[20px] rounded-br-[5px] overflow-hidden"
            style={{ background: isDark ? '#1A1A1A' : DARK_NAV }}
          >
            <textarea
              ref={textareaRef}
              value={texteEdite}
              onChange={(e) => {
                setTexteEdite(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ fontSize: '13px', minHeight: '44px', maxHeight: '200px', color: '#EAF2FF' }}
              className="w-full px-4 pt-3 pb-2 bg-transparent border-none outline-none resize-none leading-relaxed"
            />
            <div className="flex justify-end gap-2 px-3 pb-2.5">
              <button
                onClick={handleAnnulerEdition}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                {langue === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleEnvoyerModification}
                disabled={!texteEdite.trim()}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#4F7EFF] text-white hover:bg-[#3D6FEE] disabled:opacity-40 transition-colors"
              >
                {langue === 'fr' ? 'Envoyer' : 'Send'}
              </button>
            </div>
          </div>

        ) : (
          /* ── Bulle normale ──────────────────────────────────── */
          <div
            className={`group relative px-4 py-3 text-[13px] leading-relaxed ${
              isUser
                ? 'text-white rounded-[20px] rounded-br-[5px]'
                : isDark
                  ? 'bg-[#111] text-[#ECECEC] rounded-[20px] rounded-bl-[5px]'
                  : 'bg-white text-[#1E2A45] rounded-[20px] rounded-bl-[5px] border border-[#E2E8FF] shadow-sm'
            }`}
            style={isUser
              ? { background: isDark ? '#4F7EFF' : GRAD_USER }
              : undefined
            }
          >
            {/* Contenu */}
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.contenu}</p>
            ) : isStreaming ? (
              <p className="whitespace-pre-wrap">{msg.contenu}</p>
            ) : (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.contenu}</ReactMarkdown>
              </div>
            )}

            {/* Bouton modifier (au survol, message utilisateur) */}
            {isUser && !isStreaming && onModifier && (
              <button
                onClick={handleClickModifier}
                className={`absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark ? 'text-[#555] hover:text-[#ECECEC]' : 'text-[#9AA5C0] hover:text-[#040d22]'
                }`}
                title={langue === 'fr' ? 'Modifier' : 'Edit'}
              >
                <i className="ph ph-pencil-simple text-xs" />
              </button>
            )}
          </div>
        )}

        {/* ── Actions message IA (feedback + copier) ─────────── */}
        {!isUser && !isStreaming && (
          <div className="flex gap-0.5 mt-1.5 ml-1">
            <ActionBtn
              icon={vote === 1 ? 'ph-fill ph-thumbs-up' : 'ph ph-thumbs-up'}
              label={langue === 'fr' ? 'Utile' : 'Helpful'}
              onClick={() => handleVote(1)}
              active={vote === 1}
              isDark={isDark}
            />
            <ActionBtn
              icon={vote === -1 ? 'ph-fill ph-thumbs-down' : 'ph ph-thumbs-down'}
              onClick={() => handleVote(-1)}
              active={vote === -1}
              isDark={isDark}
            />
            <ActionBtn
              icon="ph ph-copy"
              label={langue === 'fr' ? 'Copier' : 'Copy'}
              onClick={handleCopy}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, active, isDark }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors ${
        active
          ? 'text-[#4F7EFF]'
          : isDark
            ? 'text-[#444] hover:bg-[#1A1A1A] hover:text-[#ECECEC]'
            : 'text-[#9AA5C0] hover:bg-[#EEF2FF] hover:text-[#040d22]'
      }`}
    >
      <i className={`${icon} text-xs`} />
      {label && <span>{label}</span>}
    </button>
  )
}

export default memo(Message, (prev, next) =>
  prev.msg.contenu === next.msg.contenu &&
  prev.msg.id      === next.msg.id &&
  prev.onModifier  === next.onModifier
)