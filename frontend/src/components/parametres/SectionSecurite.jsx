/**
 * SectionSecurite.jsx — Ralnejj Santé
 * Traduction FR/EN complète
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { modifierProfil, supprimerCompte } from '../../services/api'
import { useStore } from '../../store/useStore'

export default function SectionSecurite({ isDark }) {
  const navigate = useNavigate()
  const user   = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const langue = user?.langue || 'fr'
  const en     = langue === 'en'

  const [formMdp, setFormMdp] = useState({
    ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmer: '',
  })
  const [showMdp, setShowMdp]         = useState(false)
  const [loadingMdp, setLoadingMdp]   = useState(false)
  const [modalSupp, setModalSupp]     = useState(false)
  const [confirmTexte, setConfirmTexte] = useState('')
  const [loadingSupp, setLoadingSupp] = useState(false)

  const handleMdpChange = (e) => setFormMdp({ ...formMdp, [e.target.name]: e.target.value })

  const handleChangerMdp = async (e) => {
    e.preventDefault()
    if (!formMdp.ancien_mot_de_passe) {
      toast.error(en ? 'Enter your current password.' : 'Entrez votre mot de passe actuel.')
      return
    }
    if (formMdp.nouveau_mot_de_passe.length < 6) {
      toast.error(en ? 'Minimum 6 characters.' : 'Le nouveau mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (formMdp.nouveau_mot_de_passe !== formMdp.confirmer) {
      toast.error(en ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.')
      return
    }
    if (formMdp.ancien_mot_de_passe === formMdp.nouveau_mot_de_passe) {
      toast.error(en ? 'Choose a different password.' : 'Le nouveau mot de passe doit être différent de l\'ancien.')
      return
    }
    setLoadingMdp(true)
    try {
      await modifierProfil(user.id, {
        ancien_mot_de_passe:  formMdp.ancien_mot_de_passe,
        nouveau_mot_de_passe: formMdp.nouveau_mot_de_passe,
      })
      toast.success(en ? 'Password changed!' : 'Mot de passe modifié avec succès !')
      setFormMdp({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmer: '' })
    } catch (err) {
      toast.error(err?.response?.data?.detail || (en ? 'Incorrect current password.' : 'Mot de passe actuel incorrect.'))
    } finally {
      setLoadingMdp(false)
    }
  }

  const CONFIRM_WORD = en ? 'DELETE' : 'SUPPRIMER'

  const handleSupprimerCompte = async () => {
    if (confirmTexte !== CONFIRM_WORD) {
      toast.error(en ? `Type exactly "${CONFIRM_WORD}" to confirm.` : 'Tapez exactement "SUPPRIMER" pour confirmer.')
      return
    }
    setLoadingSupp(true)
    try {
      await supprimerCompte(user.id)
      toast.success(en ? 'Account deleted.' : 'Compte supprimé.')
      logout()
      navigate('/connexion')
    } catch {
      toast.error(en ? 'Deletion error.' : 'Erreur lors de la suppression.')
    } finally {
      setLoadingSupp(false)
      setModalSupp(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Changement MDP */}
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
          {en ? 'Change password' : 'Changer le mot de passe'}
        </h3>
        <p className={`text-xs mb-5 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
          {en ? 'Use a strong password with at least 8 characters' : 'Utilisez un mot de passe fort d\'au moins 8 caractères'}
        </p>

        <form onSubmit={handleChangerMdp} className="flex flex-col gap-4">
          <ChampMdp
            label={en ? 'Current password' : 'Mot de passe actuel'}
            name="ancien_mot_de_passe" value={formMdp.ancien_mot_de_passe}
            onChange={handleMdpChange} placeholder="••••••••"
            show={showMdp} onToggle={() => setShowMdp(!showMdp)} isDark={isDark}
          />
          <ChampMdp
            label={en ? 'New password' : 'Nouveau mot de passe'}
            name="nouveau_mot_de_passe" value={formMdp.nouveau_mot_de_passe}
            onChange={handleMdpChange} placeholder={en ? 'Min. 6 characters' : 'Min. 6 caractères'}
            show={showMdp} onToggle={() => setShowMdp(!showMdp)} isDark={isDark}
          />
          <ChampMdp
            label={en ? 'Confirm new password' : 'Confirmer le nouveau mot de passe'}
            name="confirmer" value={formMdp.confirmer}
            onChange={handleMdpChange} placeholder={en ? 'Repeat password' : 'Répétez le mot de passe'}
            show={showMdp} onToggle={() => setShowMdp(!showMdp)} isDark={isDark}
            suffixe={formMdp.confirmer && (
              <i className={`ph text-base ${
                formMdp.confirmer === formMdp.nouveau_mot_de_passe
                  ? 'ph-check-circle text-green-500'
                  : 'ph-x-circle text-red-400'
              }`} />
            )}
          />
          <button
            type="submit" disabled={loadingMdp}
            className="w-full sm:w-auto sm:self-start px-6 py-3 rounded-2xl bg-[#4F7EFF] text-white text-sm font-semibold hover:bg-[#3D6FEE] active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {loadingMdp
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {en ? 'Updating...' : 'Modification...'}</>
              : <><i className="ph ph-lock-key text-base" /> {en ? 'Change password' : 'Changer le mot de passe'}</>
            }
          </button>
        </form>
      </div>

      <div className={`h-px ${isDark ? 'bg-[#1A1A1A]' : 'bg-[#EDF0FF]'}`} />

      {/* Zone danger */}
      <div>
        <h3 className="text-sm font-bold mb-1 text-red-500">
          {en ? 'Danger zone' : 'Zone de danger'}
        </h3>
        <p className={`text-xs mb-4 ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
          {en
            ? 'This action is irreversible. All your data will be permanently deleted.'
            : 'Cette action est irréversible. Toutes vos données seront définitivement supprimées.'}
        </p>

        <div className={`p-4 rounded-2xl border ${isDark ? 'border-red-900/40 bg-red-950/20' : 'border-red-100 bg-red-50'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {en ? 'Delete my account' : 'Supprimer mon compte'}
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-red-900' : 'text-red-400'}`}>
                {en ? 'Conversations, profile and data permanently deleted' : 'Conversations, profil et données supprimés définitivement'}
              </div>
            </div>
            <button
              onClick={() => setModalSupp(true)}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl border border-red-500 text-red-500 text-sm font-semibold hover:bg-red-500 hover:text-white transition-all active:scale-95 min-h-[44px]"
            >
              <i className="ph ph-trash mr-1.5" />
              {en ? 'Delete' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {modalSupp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in ${
            isDark ? 'bg-[#0A0A0A] border border-[#1A1A1A]' : 'bg-white border border-[#EDF0FF]'
          }`}>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="ph ph-warning text-red-500 text-2xl" />
            </div>
            <h3 className={`text-base font-bold text-center mb-2 ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
              {en ? 'Delete account?' : 'Supprimer le compte ?'}
            </h3>
            <p className={`text-xs text-center mb-5 leading-relaxed ${isDark ? 'text-[#555]' : 'text-[#9AA5C0]'}`}>
              {en
                ? <span>This action is <strong>irreversible</strong>. Type <strong>DELETE</strong> to confirm.</span>
                : <span>Cette action est <strong>irréversible</strong>. Tapez <strong>SUPPRIMER</strong> pour confirmer.</span>
              }
            </p>
            <input
              type="text" value={confirmTexte}
              onChange={(e) => setConfirmTexte(e.target.value)}
              placeholder={en ? 'Type "DELETE"' : 'Tapez "SUPPRIMER"'}
              style={{ fontSize: '16px' }}
              className={`w-full px-4 py-3 rounded-2xl border outline-none text-center font-bold tracking-wider mb-4 ${
                isDark
                  ? 'bg-[#111] border-[#1A1A1A] text-[#ECECEC] placeholder-[#444]'
                  : 'bg-[#F0F4FF] border-[#E2E8FF] text-[#1E2A45] placeholder-[#A8B8D8]'
              }`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setModalSupp(false); setConfirmTexte('') }}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold min-h-[48px] ${isDark ? 'bg-[#1A1A1A] text-[#ECECEC]' : 'bg-[#F0F4FF] text-[#1E2A45]'}`}
              >
                {en ? 'Cancel' : 'Annuler'}
              </button>
              <button
                onClick={handleSupprimerCompte}
                disabled={loadingSupp || confirmTexte !== CONFIRM_WORD}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-95 transition-all disabled:opacity-40 min-h-[48px] flex items-center justify-center gap-2"
              >
                {loadingSupp
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><i className="ph ph-trash" /> {en ? 'Delete' : 'Supprimer'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChampMdp({ label, name, value, onChange, placeholder, show, onToggle, isDark, suffixe }) {
  return (
    <div>
      <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-[#666]' : 'text-[#9AA5C0]'}`}>
        {label}
      </label>
      <div className={`flex items-center gap-3 rounded-2xl px-4 border min-h-[52px] ${isDark ? 'bg-[#111] border-[#1A1A1A]' : 'bg-[#F0F4FF] border-[#E2E8FF]'}`}>
        <i className={`ph ph-lock text-base flex-shrink-0 ${isDark ? 'text-[#444]' : 'text-[#A8B8D8]'}`} />
        <input
          type={show ? 'text' : 'password'} name={name} value={value}
          onChange={onChange} placeholder={placeholder} autoComplete="new-password"
          style={{ fontSize: '16px' }}
          className={`flex-1 bg-transparent border-none outline-none py-3 ${isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'}`}
        />
        {suffixe}
        <button type="button" onClick={onToggle}
          className={`transition-colors min-w-[24px] ${isDark ? 'text-[#444] hover:text-[#ECECEC]' : 'text-[#A8B8D8] hover:text-[#4F7EFF]'}`}>
          <i className={`ph ${show ? 'ph-eye-slash' : 'ph-eye'} text-base`} />
        </button>
      </div>
    </div>
  )
}
