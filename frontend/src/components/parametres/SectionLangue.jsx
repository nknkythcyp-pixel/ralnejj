/**
 * SectionLangue.jsx — Ralnejj Santé
 * Traduction FR/EN instantanée basée sur langueChoisie (état local)
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { modifierProfil } from '../../services/api'
import { useStore } from '../../store/useStore'

const LANGUES = [
  { code: 'fr', label: 'Français', drapeau: '🇫🇷', description_fr: "L'IA vous répondra en français", description_en: 'The AI will respond in French' },
  { code: 'en', label: 'English',  drapeau: '🇬🇧', description_fr: "L'IA vous répondra en anglais",  description_en: 'The AI will respond in English' },
]

const THEMES = [
  {
    code: 'dark',
    label_fr: 'Sombre', label_en: 'Dark',
    icone: 'ph-moon',
    description_fr: 'Fond noir, idéal la nuit',
    description_en: 'Dark background, ideal at night',
    preview: 'bg-[#0A0A0A] border-[#1A1A1A]',
    previewInner: 'bg-[#111]',
  },
  {
    code: 'light',
    label_fr: 'Clair', label_en: 'Light',
    icone: 'ph-sun',
    description_fr: 'Fond blanc, idéal en journée',
    description_en: 'Light background, ideal during the day',
    preview: 'bg-white border-[#EDF0FF]',
    previewInner: 'bg-[#F0F4FF]',
  },
]

export default function SectionLangue({ isDark }) {
  const user        = useStore((s) => s.user)
  const updateUser  = useStore((s) => s.updateUser)
  const theme       = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  const [langueChoisie, setLangueChoisie] = useState(user?.langue || 'fr')
  const [loading, setLoading]             = useState(false)

  // ui = langue de l'interface (change immédiatement au clic)
  const ui = langueChoisie

  const handleLangue = async (code) => {
    if (code === langueChoisie) return
    setLangueChoisie(code)
    setLoading(true)
    try {
      await modifierProfil(user.id, { langue: code })
      updateUser({ langue: code })
      toast.success(code === 'fr' ? 'Langue changée en Français !' : 'Language changed to English!')
    } catch (err) {
      toast.error('Erreur lors du changement de langue.')
      setLangueChoisie(langueChoisie)
    } finally {
      setLoading(false)
    }
  }

  const handleTheme = async (code) => {
    if (code === theme) return
    toggleTheme()
    try {
      await modifierProfil(user.id, { theme: code })
      updateUser({ theme: code })
    } catch (_) {}
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Section Langue ─────────────────────────────────────── */}
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
          {ui === 'en' ? 'Assistant language' : "Langue de l'assistant"}
        </h3>
        <p className={`text-xs mb-4 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
          {ui === 'en' ? 'Choose the language Ralnejj AI will respond in' : 'Choisissez dans quelle langue Ralnejj IA vous répondra'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LANGUES.map((langue) => {
            const estActive = langueChoisie === langue.code
            return (
              <button
                key={langue.code}
                onClick={() => handleLangue(langue.code)}
                disabled={loading}
                className={`flex items-center gap-4 p-3 rounded-2xl border-2 text-left transition-all min-h-[60px] active:scale-95 ${
                  estActive
                    ? 'border-[#4F7EFF] bg-[#4F7EFF]/10'
                    : isDark
                      ? 'border-[#1A1A1A] bg-[#111] hover:border-[#333]'
                      : 'border-[#E2E8FF] bg-[#F0F4FF] hover:border-[#C0CFFF]'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{langue.drapeau}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${estActive ? 'text-[#4F7EFF]' : isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
                    {langue.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
                    {ui === 'en' ? langue.description_en : langue.description_fr}
                  </div>
                </div>
                {estActive && (
                  <div className="w-5 h-5 rounded-full bg-[#4F7EFF] flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Séparateur ─────────────────────────────────────────── */}
      <div className={`h-px ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#EDF0FF]'}`} />

      {/* ── Section Thème ──────────────────────────────────────── */}
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
          {ui === 'en' ? 'Interface theme' : "Thème de l'interface"}
        </h3>
        <p className={`text-xs mb-4 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
          {ui === 'en' ? 'Customize the appearance of the app' : "Personnalisez l'apparence de l'application"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const estActif = theme === t.code
            return (
              <button
                key={t.code}
                onClick={() => handleTheme(t.code)}
                className={`flex flex-col p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  estActif
                    ? 'border-[#4F7EFF]'
                    : isDark
                      ? 'border-[#1A1A1A] hover:border-[#333]'
                      : 'border-[#E2E8FF] hover:border-[#C0CFFF]'
                }`}
              >
                <div className={`w-full h-12 rounded-xl border mb-3 flex flex-col gap-1.5 p-2 overflow-hidden ${t.preview}`}>
                  <div className={`h-1.5 w-14 rounded-full ${t.previewInner}`} />
                  <div className={`h-1.5 w-10 rounded-full ${t.previewInner}`} />
                  <div className={`h-1.5 w-12 rounded-full ${t.previewInner}`} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-bold flex items-center gap-2 ${
                      estActif ? 'text-[#4F7EFF]' : isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'
                    }`}>
                      <i className={`ph ${t.icone} text-base`} />
                      {ui === 'en' ? t.label_en : t.label_fr}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
                      {ui === 'en' ? t.description_en : t.description_fr}
                    </div>
                  </div>
                  {estActif && (
                    <div className="w-5 h-5 rounded-full bg-[#4F7EFF] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
