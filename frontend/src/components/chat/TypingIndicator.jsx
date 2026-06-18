/**
 * TypingIndicator.jsx — Indicateur de frappe Ralnejj
 * Thème clair : même couleur bleu nuit que la sidebar (#040d22)
 */
import { useStore } from '../../store/useStore'

export default function TypingIndicator() {
  const theme  = useStore((s) => s.theme)
  const user   = useStore((s) => s.user)
  const isDark = theme === 'dark'
  const langue = user?.langue || 'fr'

  return (
    <div className="flex gap-2.5 self-start animate-fade-in">
      {/* Avatar R — même couleur sidebar clair */}
      <div
        className="w-[29px] h-[29px] rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
        style={{ background: isDark ? '#4F7EFF' : '#040d22' }}
      >
        R
      </div>
      <div>
        <div className={`px-4 py-3 rounded-[20px] rounded-bl-[5px] flex items-center gap-1.5 ${
          isDark ? 'bg-[#111]' : 'bg-white border border-[#E2E8FF] shadow-sm'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full animate-bounce-dot ${isDark ? 'bg-[#ECECEC]' : 'bg-[#040d22]'}`} />
          <div className={`w-1.5 h-1.5 rounded-full animate-bounce-dot-2 ${isDark ? 'bg-[#ECECEC]' : 'bg-[#040d22]'}`} />
          <div className={`w-1.5 h-1.5 rounded-full animate-bounce-dot-3 ${isDark ? 'bg-[#ECECEC]' : 'bg-[#040d22]'}`} />
        </div>
        <div className={`text-[10.5px] mt-1 ml-1 ${isDark ? 'text-[#444]' : 'text-[#9AA5C0]'}`}>
          {langue === 'en' ? 'Ralnejj is typing...' : 'Ralnejj est en train d\'écrire...'}
        </div>
      </div>
    </div>
  )
}
