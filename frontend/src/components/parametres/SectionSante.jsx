/**
 * SectionSante.jsx — Ralnejj Santé
 * Traduction FR/EN complète
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import { modifierProfil } from '../../services/api'
import { useStore } from '../../store/useStore'

const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function SectionSante({ isDark }) {
  const user       = useStore((s) => s.user)
  const updateUser = useStore((s) => s.updateUser)
  const langue     = user?.langue || 'fr'

  const [form, setForm] = useState({
    age:                 user?.age                 || '',
    poids:               user?.poids               || '',
    groupe_sanguin:      user?.groupe_sanguin       || '',
    maladies_chroniques: user?.maladies_chroniques  || '',
    allergies:           user?.allergies            || '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.age && (isNaN(form.age) || form.age < 0 || form.age > 120)) {
      toast.error(langue === 'en' ? 'Invalid age (0–120).' : 'Âge invalide (0-120 ans).')
      return
    }
    if (form.poids && (isNaN(form.poids) || form.poids < 0 || form.poids > 500)) {
      toast.error(langue === 'en' ? 'Invalid weight.' : 'Poids invalide.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        age:                 form.age   ? parseInt(form.age)     : null,
        poids:               form.poids ? parseFloat(form.poids) : null,
        groupe_sanguin:      form.groupe_sanguin      || null,
        maladies_chroniques: form.maladies_chroniques || null,
        allergies:           form.allergies           || null,
      }
      await modifierProfil(user.id, payload)
      updateUser(payload)
      toast.success(langue === 'en' ? 'Health profile saved!' : 'Profil santé sauvegardé !')
    } catch (err) {
      toast.error(err?.response?.data?.detail || (langue === 'en' ? 'Save error.' : 'Erreur lors de la sauvegarde.'))
    } finally {
      setLoading(false)
    }
  }

  const en = langue === 'en'

  return (
    <div className="flex flex-col gap-6">

      {/* Bandeau info */}
      <div className={`flex gap-3 p-4 rounded-2xl ${isDark ? 'bg-[#4F7EFF]/10 border border-[#4F7EFF]/20' : 'bg-[#EEF3FF] border border-[#DDE4FF]'}`}>
        <i className="ph ph-info text-[#4F7EFF] text-xl flex-shrink-0 mt-0.5" />
        <p className={`text-sm leading-relaxed ${isDark ? 'text-[#ECECEC]' : 'text-[#4F7EFF]'}`}>
          {en
            ? <><strong>Ralnejj AI</strong> uses this data to personalize its responses. It stays confidential.</>
            : <>Ces informations permettent à <strong>Ralnejj IA</strong> de personnaliser ses réponses selon votre profil médical. Elles restent confidentielles.</>
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Âge + Poids */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
              {en ? 'Age (years)' : 'Âge (ans)'}
            </label>
            <div className={`flex items-center gap-3 rounded-2xl px-4 border min-h-[52px] ${isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'}`}>
              <i className={`ph ph-calendar text-base flex-shrink-0 ${isDark ? 'text-[#444]' : 'text-[#A8B8D8]'}`} />
              <input
                type="number" name="age" value={form.age} onChange={handleChange}
                placeholder="25" min="0" max="120" style={{ fontSize: '16px' }}
                className={`flex-1 bg-transparent border-none outline-none py-3 w-full ${isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'}`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
              {en ? 'Weight (kg)' : 'Poids (kg)'}
            </label>
            <div className={`flex items-center gap-3 rounded-2xl px-4 border min-h-[52px] ${isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'}`}>
              <i className={`ph ph-scales text-base flex-shrink-0 ${isDark ? 'text-[#444]' : 'text-[#A8B8D8]'}`} />
              <input
                type="number" name="poids" value={form.poids} onChange={handleChange}
                placeholder="70" min="0" max="500" step="0.1" style={{ fontSize: '16px' }}
                className={`flex-1 bg-transparent border-none outline-none py-3 w-full ${isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'}`}
              />
            </div>
          </div>
        </div>

        {/* Groupe sanguin */}
        <div>
          <label className={`block text-xs font-semibold mb-3 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
            {en ? 'Blood type' : 'Groupe sanguin'}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GROUPES_SANGUINS.map((g) => (
              <button
                key={g} type="button"
                onClick={() => setForm({ ...form, groupe_sanguin: form.groupe_sanguin === g ? '' : g })}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px] ${
                  form.groupe_sanguin === g
                    ? 'bg-[#4F7EFF] text-white shadow-md shadow-blue-200'
                    : isDark
                      ? 'bg-[#111] border border-[#1A1A1A] text-[#555] hover:border-[#4F7EFF] hover:text-[#4F7EFF]'
                      : 'bg-[#F0F4FF] border border-[#E2E8FF] text-[#9AA5C0] hover:border-[#4F7EFF] hover:text-[#4F7EFF]'
                }`}
              >{g}</button>
            ))}
          </div>
        </div>

        {/* Maladies chroniques */}
        <div>
          <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
            {en ? 'Chronic conditions' : 'Maladies chroniques'}
          </label>
          <div className={`rounded-2xl px-4 py-3 border ${isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'}`}>
            <textarea
              name="maladies_chroniques" value={form.maladies_chroniques} onChange={handleChange}
              placeholder={en ? 'E.g. diabetes, hypertension, sickle cell...' : 'Ex : diabète de type 2, hypertension, drépanocytose...'}
              rows={3} style={{ fontSize: '16px' }}
              className={`w-full bg-transparent border-none outline-none resize-none leading-relaxed ${isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'}`}
            />
          </div>
          <p className={`text-[11px] mt-1.5 ml-1 ${isDark ? 'text-[#444]' : 'text-[#C0CCE8]'}`}>
            {en ? 'Separate with commas' : 'Séparez les maladies par des virgules'}
          </p>
        </div>

        {/* Allergies */}
        <div>
          <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
            {en ? 'Known allergies' : 'Allergies connues'}
          </label>
          <div className={`rounded-2xl px-4 py-3 border ${isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'}`}>
            <textarea
              name="allergies" value={form.allergies} onChange={handleChange}
              placeholder={en ? 'E.g. penicillin, peanuts, latex, pollen...' : 'Ex : pénicilline, arachides, latex, pollen...'}
              rows={3} style={{ fontSize: '16px' }}
              className={`w-full bg-transparent border-none outline-none resize-none leading-relaxed ${isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'}`}
            />
          </div>
          <p className={`text-[11px] mt-1.5 ml-1 ${isDark ? 'text-[#444]' : 'text-[#C0CCE8]'}`}>
            {en ? 'Separate with commas' : 'Séparez les allergies par des virgules'}
          </p>
        </div>

        {/* Bouton */}
        <button
          type="submit" disabled={loading}
          className="w-full sm:w-auto sm:self-start px-6 py-3 rounded-2xl bg-[#4F7EFF] text-white text-sm font-semibold hover:bg-[#3D6FEE] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {en ? 'Saving...' : 'Sauvegarde...'}</>
            : <><i className="ph ph-heart text-base" /> {en ? 'Save health profile' : 'Sauvegarder le profil santé'}</>
          }
        </button>
      </form>
    </div>
  )
}
