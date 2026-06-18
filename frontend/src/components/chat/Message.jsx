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

  const isUser      = msg.role === 'user'
  const isStreaming  = typeof msg.id === 'string' && msg.id.startsWith('stream-')
  const [vote, setVote]         = useState(null)
  const [enEdition, setEnEdition] = useState(false)
  const [texteEdite, setTexteEdite] = useState(msg.contenu)
  const textareaRef = useRef(null)

  const initiales = user?.nom
    ? user.nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  useEffect(() => {
    if (enEdition && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [enEdition])

  const handleVote = async (val) => {
    if (vote === val) return
    setVote(val)
    try {
      await envoyerFeedback({ message_id: msg.id, utilisateur_id: user.id, vote: val })
      toast.success(val === 1 ? 'Merci pour votre retour !' : 'Retour enregistré.')
    } catch (_) {}
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.contenu)
    toast.success('Copié !')
  }

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
    if (!nouveau || nouveau === msg.contenu) {
      setEnEdition(false)
      return
    }
    setEnEdition(false)
    onModifier?.(msg, nouveau)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnvoyerModification()
    }
    if (e.key === 'Escape') {
      handleAnnulerEdition()
    }
  }

  // ── Couleur de la bulle utilisateur ─────────────────────────────
  // Sombre : bleu accent existant. Clair : même bleu nuit que la sidebar.
  const userBubbleClass = isDark ? 'bg-[#4F7EFF] text-white' : 'text-[#EAF2FF]'
  const userBubbleStyle = !isDark ? { background: '#040d22', border: '1px solid rgba(120,160,210,0.18)' } : undefined

  return (
    <div className={`flex gap-2.5 max-w-[84%] animate-fade-in ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>

      {/* Avatar */}
      <div className={`w-[29px] h-[29px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
        isUser
          ? isDark ? 'bg-[#1A1A1A] text-[#ECECEC]' : 'bg-[#040d22] text-[#EAF2FF]'
          : isDark ? 'bg-[#4F7EFF] text-white' : 'bg-[#040d22] text-white'
      }`}>
        {isUser ? initiales : 'R'}
      </div>

      <div className={isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'}>

        {/* ── Mode édition (message utilisateur) ───────────────── */}
        {isUser && enEdition ? (
          <div
            className={`w-full rounded-[20px] rounded-br-[5px] overflow-hidden ${isDark ? 'bg-[#1A1A1A]' : ''}`}
            style={!isDark ? { background: '#040d22' } : undefined}
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
              style={{ fontSize: '13px', minHeight: '44px', maxHeight: '200px' }}
              className={`w-full px-4 pt-3 pb-2 bg-transparent border-none outline-none resize-none leading-relaxed ${
                isDark ? 'text-[#ECECEC]' : 'text-[#EAF2FF]'
              }`}
            />
            <div className="flex justify-end gap-2 px-3 pb-2.5">
              <button
                onClick={handleAnnulerEdition}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  isDark
                    ? 'bg-[#2A2A2A] text-[#888] hover:text-[#ECECEC]'
                    : 'bg-white/10 text-[rgba(150,180,220,0.7)] hover:text-white'
                }`}
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
          /* ── Bulle normale ────────────────────────────────────── */
          <div
            className={`group relative px-4 py-3 text-[13px] leading-relaxed ${
              isUser
                ? `${userBubbleClass} rounded-[20px] rounded-br-[5px]`
                : isDark
                  ? 'bg-[#111] text-[#ECECEC] rounded-[20px] rounded-bl-[5px]'
                  : 'bg-white text-[#1E2A45] rounded-[20px] rounded-bl-[5px] border border-[#E2E8FF] shadow-[0_1px_3px_rgba(29,110,245,0.06)]'
            }`}
            style={isUser ? userBubbleStyle : undefined}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.contenu}</p>
            ) : isStreaming ? (
              <p className="whitespace-pre-wrap">{msg.contenu}</p>
            ) : (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.contenu}
                </ReactMarkdown>
              </div>
            )}

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

        {/* ── Actions message IA ────────────────────────────────── */}
        {!isUser && !isStreaming && (
          <div className="flex gap-0.5 mt-1.5 ml-1">
            <ActionBtn
              icon={vote === 1 ? 'ph-fill ph-thumbs-up' : 'ph ph-thumbs-up'}
              label="Utile"
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
            <ActionBtn icon="ph ph-copy" label="Copier" onClick={handleCopy} isDark={isDark} />
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

export default memo(Message, (prev, next) => {
  return (
    prev.msg.contenu === next.msg.contenu &&
    prev.msg.id     === next.msg.id &&
    prev.onModifier === next.onModifier
  )
})