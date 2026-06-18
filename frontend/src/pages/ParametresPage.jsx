/**
 * ParametresPage.jsx — Ralnejj Santé
 * Traduction FR/EN complète
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import SectionProfil   from '../components/parametres/SectionProfil'
import SectionSante    from '../components/parametres/SectionSante'
import SectionLangue   from '../components/parametres/SectionLangue'
import SectionSecurite from '../components/parametres/SectionSecurite'

export default function ParametresPage() {
  const navigate = useNavigate()
  const theme    = useStore((s) => s.theme)
  const user     = useStore((s) => s.user)
  const isDark   = theme === 'dark'
  const langue   = user?.langue || 'fr'

  // ── Onglets traduits dynamiquement ──────────────────────────
  const ONGLETS = [
    {
      id: 'profil',
      label:       langue === 'en' ? 'Profile'  : 'Profil',
      icone:       'ph-user-circle',
      description: langue === 'en' ? 'Name and avatar'    : 'Nom, email, avatar',
    },
    {
      id: 'sante',
      label:       langue === 'en' ? 'Health'   : 'Santé',
      icone:       'ph-heart',
      description: langue === 'en' ? 'Medical profile'    : 'Données médicales',
    },
    {
      id: 'langue',
      label:       langue === 'en' ? 'Language' : 'Langue',
      icone:       'ph-translate',
      description: langue === 'en' ? 'Language & theme'   : 'Langue et apparence',
    },
    {
      id: 'securite',
      label:       langue === 'en' ? 'Security' : 'Sécurité',
      icone:       'ph-shield-check',
      description: langue === 'en' ? 'Password & account' : 'Mot de passe et compte',
    },
  ]

  const [ongletActif, setOngletActif] = useState('profil')

  const initiales = user?.nom
    ? user.nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const renderContenu = () => {
    switch (ongletActif) {
      case 'profil':   return <SectionProfil   isDark={isDark} />
      case 'sante':    return <SectionSante    isDark={isDark} />
      case 'langue':   return <SectionLangue   isDark={isDark} />
      case 'securite': return <SectionSecurite isDark={isDark} />
      default:         return null
    }
  }

  const ongletCourant = ONGLETS.find((o) => o.id === ongletActif)

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black' : 'bg-[#F5F7FF]'}`}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className={`sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b ${
        isDark ? 'bg-[#0A0A0A] border-[#1A1A1A]' : 'bg-white border-[#EDF0FF]'
      }`}>
        <button
          onClick={() => navigate('/chat')}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] ${
            isDark ? 'bg-[#1A1A1A] text-[#ECECEC] hover:bg-[#222]' : 'bg-[#F0F3FF] text-[#4F7EFF] hover:bg-[#E2EAFF]'
          }`}
        >
          <i className="ph ph-arrow-left text-base" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className={`text-base font-bold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
            {langue === 'en' ? 'Settings' : 'Paramètres'}
          </h1>
          <p className={`text-xs truncate ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
            {ongletCourant?.description}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[#4F7EFF] flex-shrink-0">
          {initiales}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">

        {/* ════ DESKTOP ════ */}
        <div className="hidden md:flex gap-6 p-6">

          <nav className="w-56 flex-shrink-0">
            <div className={`rounded-3xl p-2 sticky top-24 ${
              isDark ? 'bg-[#0A0A0A] border border-[#1A1A1A]' : 'bg-white border border-[#EDF0FF]'
            }`}>
              {ONGLETS.map((onglet) => {
                const actif = ongletActif === onglet.id
                return (
                  <button
                    key={onglet.id}
                    onClick={() => setOngletActif(onglet.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all mb-1 last:mb-0 min-h-[52px] ${
                      actif
                        ? isDark ? 'bg-[#4F7EFF]/15 text-[#4F7EFF]' : 'bg-[#EEF3FF] text-[#4F7EFF]'
                        : isDark ? 'text-[#555] hover:bg-[#111] hover:text-[#ECECEC]' : 'text-[#9AA5C0] hover:bg-[#F5F7FF] hover:text-[#1E2A45]'
                    }`}
                  >
                    <i className={`ph ${onglet.icone} text-lg flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${actif ? 'text-[#4F7EFF]' : ''}`}>{onglet.label}</div>
                      <div className={`text-[10px] mt-0.5 truncate ${actif ? 'text-[#4F7EFF]/70' : isDark ? 'text-[#444]' : 'text-[#C0CCE8]'}`}>
                        {onglet.description}
                      </div>
                    </div>
                    {actif && <div className="w-1.5 h-1.5 rounded-full bg-[#4F7EFF] flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            <div className={`rounded-3xl p-6 ${isDark ? 'bg-[#0A0A0A] border border-[#1A1A1A]' : 'bg-white border border-[#EDF0FF]'}`}>
              <div className={`flex items-center gap-3 mb-6 pb-5 border-b ${isDark ? 'border-[#1A1A1A]' : 'border-[#EDF0FF]'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#4F7EFF]/15' : 'bg-[#EEF3FF]'}`}>
                  <i className={`ph ${ongletCourant?.icone} text-xl text-[#4F7EFF]`} />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>{ongletCourant?.label}</h2>
                  <p className={`text-xs ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>{ongletCourant?.description}</p>
                </div>
              </div>
              <div className="animate-fade-in">{renderContenu()}</div>
            </div>
          </div>
        </div>

        {/* ════ MOBILE ════ */}
        <div className="md:hidden">
          <div className={`flex overflow-x-auto scrollbar-none gap-2 px-4 py-3 border-b ${
            isDark ? 'border-[#1A1A1A] bg-[#0A0A0A]' : 'border-[#EDF0FF] bg-white'
          }`}>
            {ONGLETS.map((onglet) => {
              const actif = ongletActif === onglet.id
              return (
                <button
                  key={onglet.id}
                  onClick={() => setOngletActif(onglet.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all min-h-[44px] ${
                    actif
                      ? 'bg-[#4F7EFF] text-white shadow-md shadow-blue-200'
                      : isDark ? 'bg-[#111] text-[#555]' : 'bg-[#F0F4FF] text-[#9AA5C0]'
                  }`}
                >
                  <i className={`ph ${onglet.icone} text-base`} />
                  <span>{onglet.label}</span>
                </button>
              )
            })}
          </div>

          <div className="px-4 py-5 animate-fade-in">
            <div className={`rounded-3xl p-5 ${isDark ? 'bg-[#0A0A0A] border border-[#1A1A1A]' : 'bg-white border border-[#EDF0FF]'}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#4F7EFF]/15' : 'bg-[#EEF3FF]'}`}>
                  <i className={`ph ${ongletCourant?.icone} text-lg text-[#4F7EFF]`} />
                </div>
                <div>
                  <h2 className={`text-sm font-bold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>{ongletCourant?.label}</h2>
                  <p className={`text-xs ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>{ongletCourant?.description}</p>
                </div>
              </div>
              {renderContenu()}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}