/**
 * SectionProfil.jsx — Ralnejj Santé
 * Traduction FR/EN complète
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { modifierProfil } from '../../services/api'
import { useStore } from '../../store/useStore'

export default function SectionProfil({ isDark }) {
  const user       = useStore((s) => s.user)
  const updateUser = useStore((s) => s.updateUser)
  const langue     = user?.langue || 'fr'

  const [form, setForm]       = useState({ nom: user?.nom || '' })
  const [loading, setLoading] = useState(false)

  const initiales = user?.nom
    ? user.nom.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nom.trim()) {
      toast.error(langue === 'en' ? 'Name is required.' : 'Le nom est obligatoire.')
      return
    }
    setLoading(true)
    try {
      await modifierProfil(user.id, { nom: form.nom })
      updateUser({ nom: form.nom })
      toast.success(langue === 'en' ? 'Profile updated!' : 'Profil mis à jour !')
    } catch (err) {
      toast.error(err?.response?.data?.detail || (langue === 'en' ? 'Update error.' : 'Erreur lors de la mise à jour.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Avatar et nom */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-[#4F7EFF] shadow-lg">
            {initiales}
          </div>
          <div className={`absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 cursor-pointer ${
            isDark ? 'bg-[#1A1A1A] border-black' : 'bg-white border-white'
          }`}>
            <i className="ph ph-camera text-sm text-[#4F7EFF]" />
          </div>
        </div>

        <div className="text-center sm:text-left">
          <div className={`text-lg font-bold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
            {user?.nom}
          </div>
          <div className={`text-sm mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
            {user?.email}
          </div>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium ${
            isDark ? 'bg-[#1A1A1A] text-[#4F7EFF]' : 'bg-[#EEF3FF] text-[#4F7EFF]'
          }`}>
            <i className="ph ph-star text-xs" />
            {langue === 'en' ? 'Free plan' : 'Plan gratuit'}
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Nom */}
        <div>
          <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
            {langue === 'en' ? 'Full name' : 'Nom complet'}
          </label>
          <div className={`flex items-center gap-3 rounded-2xl px-4 border min-h-[52px] ${
            isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'
          }`}>
            <i className={`ph ph-user text-base flex-shrink-0 ${isDark ? 'text-[#444]' : 'text-[#A8B8D8]'}`} />
            <input
              type="text"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              placeholder={langue === 'en' ? 'Jean Mbarga' : 'Jean Mbarga'}
              style={{ fontSize: '16px' }}
              className={`flex-1 bg-transparent border-none outline-none py-3 ${
                isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'
              }`}
            />
          </div>
        </div>

        {/* Email — lecture seule */}
        <div>
          <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
            {langue === 'en' ? 'Email address' : 'Adresse email'}
          </label>
          <div className={`flex items-center gap-3 rounded-2xl px-4 border min-h-[52px] ${
            isDark ? 'bg-[#0A0A0A] border-[#111]' : 'bg-[#F8F9FF] border-[#E2E8FF]'
          }`}>
            <i className={`ph ph-envelope text-base flex-shrink-0 ${isDark ? 'text-[#333]' : 'text-[#C0CCE8]'}`} />
            <span style={{ fontSize: '16px' }} className={`flex-1 py-3 ${isDark ? 'text-[#444]' : 'text-[#9AA5C0]'}`}>
              {user?.email}
            </span>
            <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full flex-shrink-0 ${
              isDark ? 'bg-[#111] text-[#333]' : 'bg-[#EDF0FF] text-[#C0CCE8]'
            }`}>
              <i className="ph ph-lock text-xs" />
              {langue === 'en' ? 'Read only' : 'Non modifiable'}
            </div>
          </div>
          <p className={`text-[10px] mt-1.5 ml-1 ${isDark ? 'text-[#333]' : 'text-[#C0CCE8]'}`}>
            {langue === 'en'
              ? 'Your email is your login identifier and cannot be changed.'
              : "L'email est votre identifiant de connexion et ne peut pas être changé."}
          </p>
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full sm:w-auto sm:self-start px-6 py-3 rounded-2xl bg-[#4F7EFF] text-white text-sm font-semibold hover:bg-[#3D6FEE] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {langue === 'en' ? 'Saving...' : 'Sauvegarde...'}</>
            : <><i className="ph ph-check text-base" /> {langue === 'en' ? 'Save' : 'Sauvegarder'}</>
          }
        </button>
      </form>
    </div>
  )
}