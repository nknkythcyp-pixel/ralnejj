/**
 * Sidebar.jsx — Ralnejj Santé
 * - Même logo dans les deux thèmes
 * - Sidebar redimensionnable par drag
 * - Titre conversation actif : même style highlight dans les deux thèmes
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useStore } from '../../store/useStore'
import {
  getConversations, renommerConversation, epinglerConversation,
  supprimerConversation, viderHistorique, rechercherMessages,
} from '../../services/api'
import logoRalnejj from '../../logoral.png'

function Highlight({ text, query, className }) {
  if (!query || !text) return <span className={className}>{text}</span>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? <strong key={i} style={{ fontWeight: 700 }}>{part}</strong> : part
      )}
    </span>
  )
}

const MIN_WIDTH = 180
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 228

export default function Sidebar({ onSelectConv, onNewConv, refreshTrigger }) {
  const navigate     = useNavigate()
  const user         = useStore((s) => s.user)
  const logout       = useStore((s) => s.logout)
  const theme        = useStore((s) => s.theme)
  const toggleTheme  = useStore((s) => s.toggleTheme)
  const activeConvId = useStore((s) => s.activeConvId)

  const isDark = theme === 'dark'
  const langue = user?.langue || 'fr'
  const en     = langue === 'en'

  const [conversations, setConversations] = useState([])
  const [recherche, setRecherche]         = useState('')
  const [resultats, setResultats]         = useState([])
  const [menuConvId, setMenuConvId]       = useState(null)
  const [renomId, setRenomId]             = useState(null)
  const [renomVal, setRenomVal]           = useState('')
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [sidebarWidth, setSidebarWidth]   = useState(DEFAULT_WIDTH)
  const menuRef    = useRef(null)
  const isDragging = useRef(false)
  const startX     = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  // ── Drag to resize ───────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    isDragging.current = true
    startX.current     = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor    = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return
      const delta    = e.clientX - startX.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setSidebarWidth(newWidth)
    }
    const onUp = () => {
      isDragging.current            = false
      document.body.style.cursor    = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const charger = async () => {
    if (!user?.id) return
    try {
      const { data } = await getConversations(user.id)
      const convs = data.conversations || []
      convs.sort((a, b) => {
        if (a.epingle && !b.epingle) return -1
        if (!a.epingle && b.epingle) return 1
        return new Date(b.derniere_activite || b.created_at) - new Date(a.derniere_activite || a.created_at)
      })
      setConversations(convs)
    } catch (_) {}
  }

  useEffect(() => { charger() }, [user?.id, refreshTrigger])

  useEffect(() => {
    if (!recherche.trim()) { setResultats([]); return }
    const t = setTimeout(async () => {
      try {
        const { data } = await rechercherMessages(user.id, recherche)
        setResultats(data.resultats || [])
      } catch (_) {}
    }, 400)
    return () => clearTimeout(t)
  }, [recherche])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuConvId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleEpingler = async (e, conv) => {
    e.stopPropagation()
    await epinglerConversation(conv.id, !conv.epingle)
    setMenuConvId(null); charger()
  }

  const handleSupprimer = async (e, convId) => {
    e.stopPropagation()
    await supprimerConversation(convId)
    setMenuConvId(null); charger()
    if (activeConvId === convId) onNewConv()
  }

  const handleRenommer = async (convId) => {
    if (!renomVal.trim()) return
    await renommerConversation(convId, renomVal)
    setRenomId(null); charger()
  }

  const handleVider = async () => {
    if (!window.confirm(en ? 'Delete all conversations?' : 'Supprimer toutes les conversations ?')) return
    await viderHistorique(user.id)
    charger(); onNewConv()
    toast.success(en ? 'History cleared.' : 'Historique effacé.')
  }

  const handleLogout = () => { logout(); navigate('/connexion') }

  const initiales = user?.nom
    ? user.nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const lightBg         = '#040d22'
  const lightHaloTop    = { position: 'absolute', width: 200, height: 200, top: -80, left: -40, background: 'radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none' }
  const lightHaloBottom = { position: 'absolute', width: 160, height: 160, bottom: -60, right: -50, background: 'radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }

  const ConvItem = ({ conv }) => {
    const isActive   = activeConvId === conv.id
    const isRenaming = renomId === conv.id

    return (
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl cursor-pointer mb-0.5 group transition-all relative ${
          isActive
            ? isDark
              ? 'bg-[#111] border border-[#222]'
              : 'border'
            : isDark
              ? 'hover:bg-white/5 border border-transparent'
              : 'hover:bg-white/6 border border-transparent'
        }`}
        style={isActive && !isDark ? {
          background: 'rgba(255,255,255,0.08)',
          borderColor: 'rgba(120,160,210,0.3)',
        } : undefined}
        onClick={() => { onSelectConv(conv.id); setMobileOpen(false) }}
      >
        {conv.epingle
          ? <i className="ph-fill ph-push-pin text-sm flex-shrink-0 text-[#4F7EFF]" />
          : <i className={`ph ph-chat-circle-dots text-sm flex-shrink-0 ${isDark ? 'text-[#555]' : 'text-[#5C7AA8]'}`} />
        }

        {isRenaming ? (
          <input
            autoFocus value={renomVal}
            onChange={(e) => setRenomVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenommer(conv.id)
              if (e.key === 'Escape') setRenomId(null)
            }}
            onBlur={() => handleRenommer(conv.id)}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 bg-transparent border-none outline-none text-[12px] font-medium ${isDark ? 'text-[#ECECEC]' : 'text-[#EAF2FF]'}`}
          />
        ) : (
          <span className={`flex-1 text-[12px] truncate ${
            isActive
              ? isDark ? 'text-[#ECECEC] font-semibold' : 'text-[#EAF2FF] font-semibold'
              : isDark ? 'text-[#ECECEC] font-medium' : 'text-[#EAF2FF] font-medium'
          }`}>
            {conv.titre}
          </span>
        )}

        {conv.epingle && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? 'bg-[#4F7EFF]' : 'bg-[#2DD4BF]'}`} />}

        <button
          onClick={(e) => { e.stopPropagation(); setMenuConvId(menuConvId === conv.id ? null : conv.id) }}
          className={`opacity-0 group-hover:opacity-100 ml-1 w-6 h-6 flex items-center justify-center rounded-lg transition-opacity ${
            isDark ? 'hover:bg-white/10 text-[#ECECEC]' : 'hover:bg-white/10 text-[#EAF2FF]'
          }`}
        >
          <i className="ph ph-dots-three text-sm" />
        </button>

        {menuConvId === conv.id && (
          <div ref={menuRef} className={`absolute right-2 top-9 z-50 rounded-2xl shadow-xl border py-1 min-w-[150px] ${isDark ? 'bg-[#111] border-[#222]' : 'bg-[#0A1A38] border-[rgba(120,160,210,0.2)]'}`}>
            <MenuBtn icon="ph-pencil-simple" label={en ? 'Rename' : 'Renommer'} onClick={(e) => {
              e.stopPropagation(); setRenomId(conv.id); setRenomVal(conv.titre); setMenuConvId(null)
            }} isDark={isDark} />
            <MenuBtn
              icon={conv.epingle ? 'ph-push-pin-slash' : 'ph-push-pin'}
              label={conv.epingle ? (en ? 'Unpin' : 'Désépingler') : (en ? 'Pin' : 'Épingler')}
              onClick={(e) => handleEpingler(e, conv)} isDark={isDark}
            />
            <MenuBtn icon="ph-trash" label={en ? 'Delete' : 'Supprimer'} onClick={(e) => handleSupprimer(e, conv.id)} isDark={isDark} danger />
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <div
      className={`flex flex-col h-full relative overflow-hidden ${isDark ? 'bg-black border-r border-[#111]' : ''}`}
      style={!isDark ? { background: lightBg } : undefined}
    >
      {!isDark && <div style={lightHaloTop} />}
      {!isDark && <div style={lightHaloBottom} />}

      <div className="p-4 pb-3 relative z-10">
        {/* Logo — même image dans les deux thèmes */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src={logoRalnejj}
            alt="Ralnejj Santé"
            className="w-9 h-9 rounded-2xl flex-shrink-0 object-contain"
            style={{ background: isDark ? '#1A1A1A' : 'white' }}
          />
          <div>
            <div className={`text-[16px] font-bold tracking-tight ${isDark ? 'text-[#ECECEC]' : 'text-[#EAF2FF]'}`}>Ralnejj</div>
            <div className={`text-[9px] tracking-widest uppercase mt-0.5 ${isDark ? 'text-[#444]' : 'text-[rgba(150,180,220,0.65)]'}`}>
              {en ? 'HEALTH AI' : 'Santé IA'}
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`ml-auto w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isDark ? 'bg-[#111] text-[#444] hover:text-[#ECECEC] hover:bg-[#1A1A1A]' : 'bg-white/8 text-[rgba(150,180,220,0.7)] hover:bg-white/16 hover:text-white'
            }`}
          >
            <i className={`ph ${isDark ? 'ph-sun' : 'ph-moon'} text-base`} />
          </button>
        </div>

        {/* Nouvelle conv */}
        <button
          onClick={onNewConv}
          className={`w-full py-2.5 px-4 rounded-full text-[12px] font-semibold flex items-center justify-center gap-2 mb-2.5 transition-colors ${
            isDark
              ? 'bg-transparent border border-[#222] text-[#ECECEC] hover:bg-[#111]'
              : 'text-white hover:opacity-90'
          }`}
          style={!isDark ? { background: 'linear-gradient(135deg, #1d4ed8, #2DD4BF)' } : undefined}
        >
          <i className="ph ph-plus-circle text-sm" />
          {en ? 'New conversation' : 'Nouvelle conversation'}
        </button>

        {/* Recherche */}
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${isDark ? 'bg-[#111]' : 'bg-white/5 border border-[rgba(120,160,210,0.2)]'}`}>
          <i className={`ph ph-magnifying-glass text-sm ${isDark ? 'text-[#777]' : 'text-[rgba(150,180,220,0.6)]'}`} />
          <input
            value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder={en ? 'Search...' : 'Rechercher...'}
            className={`flex-1 bg-transparent border-none outline-none text-[11.5px] ${isDark ? 'text-[#ECECEC] placeholder-[#555]' : 'text-[#EAF2FF] placeholder-[rgba(150,180,220,0.5)]'}`}
          />
          {recherche && (
            <button onClick={() => setRecherche('')} className={isDark ? 'text-[#777]' : 'text-[rgba(150,180,220,0.6)]'}>
              <i className="ph ph-x text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-3 scrollbar-none relative z-10">
        {recherche && resultats.length > 0 ? (
          <>
            <div className={`text-[9px] font-semibold tracking-widest uppercase px-1 pt-2 pb-1 ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.55)]'}`}>
              {en ? 'Results' : 'Résultats'}
            </div>
            {resultats.map((r) => (
              <div key={r.id} onClick={() => { onSelectConv(r.conversation_id); setRecherche('') }}
                className={`px-3 py-2.5 rounded-2xl cursor-pointer mb-0.5 transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-white/6'}`}>
                <Highlight text={r.titre} query={recherche} className={`block text-[12px] font-semibold truncate ${isDark ? 'text-[#ECECEC]' : 'text-[#EAF2FF]'}`} />
                <Highlight text={r.contenu} query={recherche} className={`block text-[10.5px] truncate mt-0.5 ${isDark ? 'text-[#777]' : 'text-[rgba(150,180,220,0.6)]'}`} />
              </div>
            ))}
          </>
        ) : recherche && resultats.length === 0 ? (
          <div className={`text-center text-[11px] mt-8 ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.5)]'}`}>
            {en ? 'No results' : 'Aucun résultat'}
          </div>
        ) : (
          <>
            {conversations.filter(c => c.epingle).length > 0 && (
              <div className={`text-[9px] font-semibold tracking-widest uppercase px-3 pt-3 pb-1 ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.55)]'}`}>
                {en ? 'Pinned' : 'Épinglées'}
              </div>
            )}
            {conversations.filter(c => c.epingle).map((c) => <ConvItem key={c.id} conv={c} />)}

            {conversations.filter(c => !c.epingle).length > 0 && (
              <div className={`text-[9px] font-semibold tracking-widest uppercase px-3 pt-3 pb-1 ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.55)]'}`}>
                {en ? 'Recent' : 'Récentes'}
              </div>
            )}
            {conversations.filter(c => !c.epingle).map((c) => <ConvItem key={c.id} conv={c} />)}

            {conversations.length === 0 && (
              <div className={`text-center text-[11px] mt-12 ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.5)]'}`}>
                {en ? 'No conversations.\nStart chatting!' : 'Aucune conversation.\nCommencez à discuter !'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t relative z-10 ${isDark ? 'border-[#111]' : 'border-[rgba(120,160,210,0.15)]'}`}>
        {conversations.length > 0 && (
          <button onClick={handleVider}
            className={`w-full text-[11px] text-center mb-3 transition-colors ${isDark ? 'text-[#555] hover:text-red-400' : 'text-[rgba(150,180,220,0.5)] hover:text-red-400'}`}>
            <i className="ph ph-trash mr-1" />
            {en ? 'Clear history' : 'Effacer l\'historique'}
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${isDark ? 'bg-[#1A1A1A]' : 'bg-white/10'}`}>
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[12px] font-semibold truncate ${isDark ? 'text-[#ECECEC]' : 'text-[#EAF2FF]'}`}>{user?.nom}</div>
            <div className={`text-[10px] ${isDark ? 'text-[#555]' : 'text-[rgba(150,180,220,0.5)]'}`}>
              {en ? 'Free plan' : 'Plan gratuit'}
            </div>
          </div>
          <button onClick={() => navigate('/parametres')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-[#777] hover:text-[#ECECEC] hover:bg-[#111]' : 'text-[rgba(150,180,220,0.7)] hover:text-white hover:bg-white/8'}`}>
            <i className="ph ph-gear text-base" />
          </button>
          <button onClick={handleLogout}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'text-[#777] hover:text-red-400 hover:bg-[#111]' : 'text-[rgba(150,180,220,0.7)] hover:text-white hover:bg-white/8'}`}>
            <i className="ph ph-sign-out text-base" />
          </button>
        </div>
      </div>

      {/* Handle de redimensionnement */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 hover:bg-[#4F7EFF]/30 transition-colors"
      />
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden md:flex h-full flex-col flex-shrink-0 relative"
        style={{ width: sidebarWidth }}
      >
        {sidebarContent}
      </div>

      {/* Mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${isDark ? 'bg-[#111] text-[#ECECEC]' : 'text-white'}`}
        style={!isDark ? { background: '#040d22' } : undefined}
      >
        <i className="ph ph-list text-lg" />
      </button>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-[260px] h-full">{sidebarContent}</div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}

function MenuBtn({ icon, label, onClick, isDark, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : isDark ? 'text-[#ECECEC] hover:bg-[#1A1A1A]' : 'text-[#EAF2FF] hover:bg-white/8'
      }`}>
      <i className={`ph ${icon} text-sm`} />
      {label}
    </button>
  )
}