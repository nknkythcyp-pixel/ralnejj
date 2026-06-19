/**
 * InputZone.jsx — Zone de saisie du chat Ralnejj Santé v3
 *
 * Modifications v3.1 :
 *  - Zone de saisie plus compacte (py-1 au lieu de py-1.5)
 *  - Bouton envoi : dégradé bleu nuit (#040d22 → #1d4ed8) en thème clair
 *  - Menu attachement : 4 options (Photo, Image, PDF/Word, Excel)
 *  - Responsive mobile → desktop
 */

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useStore } from '../../store/useStore'
import { transcrireAudio, uploaderFichier } from '../../services/api'

const SUGGESTIONS_FR = [
  "J'ai de la fièvre depuis 2 jours",
  "Symptômes du paludisme ?",
  "Comment prévenir la typhoïde ?",
  "Mon enfant a des diarrhées",
]
const SUGGESTIONS_EN = [
  "I have had fever for 2 days",
  "Malaria symptoms?",
  "How to prevent typhoid?",
  "My child has diarrhea",
]

const OPTIONS_MENU = [
  {
    id: 'camera', icone: 'ph-camera',
    label_fr: 'Prendre une photo', label_en: 'Take a photo',
    desc_fr: 'Utiliser la caméra', desc_en: 'Use camera',
    accept: 'image/*', capture: 'environment', couleur: '#4F7EFF',
  },
  {
    id: 'image', icone: 'ph-image',
    label_fr: 'Choisir une image', label_en: 'Choose an image',
    desc_fr: 'Depuis la galerie', desc_en: 'From gallery',
    accept: '.jpg,.jpeg,.png,.webp,.gif', capture: null, couleur: '#10B981',
  },
  {
    id: 'document', icone: 'ph-file-pdf',
    label_fr: 'Document PDF / Word', label_en: 'PDF / Word document',
    desc_fr: 'Analyser ou résumer', desc_en: 'Analyze or summarize',
    accept: '.pdf,.docx,.doc', capture: null, couleur: '#EF4444',
  },
  {
    id: 'tableur', icone: 'ph-microsoft-excel-logo',
    label_fr: 'Fichier Excel', label_en: 'Excel file',
    desc_fr: 'Données ou résultats', desc_en: 'Data or results',
    accept: '.xlsx,.xls', capture: null, couleur: '#22C55E',
  },
]

// Dégradé bouton envoi thème clair — identique sidebar
const GRAD_BTN = 'linear-gradient(135deg, #040d22 0%, #1d4ed8 100%)'

export default function InputZone({ onEnvoyer, loading, suggestions = [], onStop }) {
  const theme  = useStore((s) => s.theme)
  const user   = useStore((s) => s.user)
  const isDark = theme === 'dark'
  const langue = user?.langue || 'fr'

  const textareaRef   = useRef(null)
  const menuRef       = useRef(null)
  const fileInputRefs = useRef({})

  const [texte, setTexte]                   = useState('')
  const [menuOuvert, setMenuOuvert]         = useState(false)
  const [fichierEnCours, setFichierEnCours] = useState(false)
  const [fichierJoint, setFichierJoint]     = useState(null)
  const fichierJointRef                     = useRef(null)

  const [enregistrement, setEnregistrement] = useState(false)
  const [transcription, setTranscription]   = useState(false)
  const [dureeEnreg, setDureeEnreg]         = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const streamRef        = useRef(null)
  const timerRef         = useRef(null)

  const chips = suggestions.length > 0
    ? suggestions
    : langue === 'fr' ? SUGGESTIONS_FR : SUGGESTIONS_EN

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 140) + 'px'
    }
  }, [texte])

  // Fermer menu au clic extérieur
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOuvert(false)
    }
    document.addEventListener('mousedown', h)
    document.addEventListener('touchstart', h)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h) }
  }, [])

  // Nettoyage
  useEffect(() => {
    return () => {
      arreterTimer()
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const arreterTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  // Envoi message
  const handleEnvoyer = () => {
    const fichier = fichierJointRef.current
    if ((!texte.trim() && !fichier) || loading) return
    const messageFinal = texte.trim() || (
      langue === 'fr'
        ? `Voici un fichier joint : ${fichier?.nom}. Peux-tu l'analyser ?`
        : `Here is an attached file: ${fichier?.nom}. Can you analyze it?`
    )
    onEnvoyer(messageFinal, {
      piece_jointe_texte:  fichier?.type === 'texte' ? fichier.texte      : null,
      piece_jointe_nom:    fichier?.nom   || null,
      piece_jointe_image:  fichier?.type === 'image' ? fichier.image_data : null,
    })
    setTexte('')
    setFichierJoint(null)
    fichierJointRef.current = null
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnvoyer() }
  }

  const handleBoutonPrincipal = () => {
    if (loading) onStop?.()
    else handleEnvoyer()
  }

  // Menu fichier
  const handleOptionMenu = (option) => {
    setMenuOuvert(false)
    fileInputRefs.current[option.id]?.click()
  }

  // Upload fichier
  const handleFichierChange = async (e) => {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    e.target.value = ''
    if (fichier.size > 15 * 1024 * 1024) {
      toast.error(langue === 'fr' ? 'Fichier trop volumineux (max 15 Mo).' : 'File too large (max 15MB).')
      return
    }
    setFichierEnCours(true)
    try {
      const { data } = await uploaderFichier(fichier)
      const nouveau = { nom: data.nom_fichier || fichier.name, type: data.type, texte: data.texte || null, image_data: data.image_data || null }
      setFichierJoint(nouveau)
      fichierJointRef.current = nouveau
      toast.success(langue === 'fr' ? `Fichier joint : ${fichier.name}` : `File attached: ${fichier.name}`)
    } catch (err) {
      toast.error(err?.response?.data?.detail || (langue === 'fr' ? 'Erreur chargement.' : 'Load error.'))
    } finally {
      setFichierEnCours(false)
    }
  }

  const retirerFichier = () => { setFichierJoint(null); fichierJointRef.current = null }

  // Enregistrement vocal
  const demarrerEnregistrement = async () => {
    if (loading || transcription) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      let mimeType = ''
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))      mimeType = 'audio/webm;codecs=opus'
      else if (MediaRecorder.isTypeSupported('audio/webm'))              mimeType = 'audio/webm'
      else if (MediaRecorder.isTypeSupported('audio/mp4'))               mimeType = 'audio/mp4'
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        arreterTimer()
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size < 1000) { toast.error(langue === 'fr' ? 'Enregistrement trop court.' : 'Recording too short.'); return }
        setTranscription(true)
        try {
          const { data } = await transcrireAudio(blob, langue)
          const t = (data?.texte || '').trim()
          if (!t) toast.error(langue === 'fr' ? 'Aucun texte détecté.' : 'No speech detected.')
          else { setTexte((prev) => prev ? `${prev} ${t}` : t); textareaRef.current?.focus() }
        } catch { toast.error(langue === 'fr' ? 'Erreur de transcription.' : 'Transcription error.') }
        finally { setTranscription(false) }
      }
      recorder.start()
      setEnregistrement(true)
      setDureeEnreg(0)
      timerRef.current = setInterval(() => setDureeEnreg((d) => d + 1), 1000)
    } catch {
      toast.error(langue === 'fr' ? "Impossible d'accéder au microphone." : "Cannot access microphone.")
    }
  }

  const arreterEnregistrement = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    setEnregistrement(false)
  }

  const annulerEnregistrement = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null }
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    }
    arreterTimer(); chunksRef.current = []; setEnregistrement(false); setDureeEnreg(0)
  }

  const formatDuree = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className={isDark ? 'bg-black' : 'bg-[#F7F9FF]'}>

      {/* ── Chips suggestions ────────────────────────────────── */}
      {!loading && !enregistrement && !texte.trim() && !fichierJoint && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2 pt-1">
          {chips.map((chip, i) => (
            <button key={i}
              onClick={() => { setTexte(chip); textareaRef.current?.focus() }}
              className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors ${
                isDark
                  ? 'bg-transparent border border-[#222] text-[#ECECEC] hover:bg-[#111]'
                  : 'bg-white border border-[#DDE4FF] text-[#1d4ed8] hover:bg-[#EEF2FF]'
              }`}
            >{chip}</button>
          ))}
        </div>
      )}

      {/* ── Fichier joint ─────────────────────────────────────── */}
      {fichierJoint && (
        <div className={`flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 rounded-xl text-[12px] ${
          isDark ? 'bg-[#111] text-[#ECECEC]' : 'bg-[#EEF2FF] text-[#1d4ed8]'
        }`}>
          <i className={`ph ${fichierJoint.type === 'image' ? 'ph-image' : 'ph-file-text'} text-sm flex-shrink-0`} />
          <span className="flex-1 truncate">{fichierJoint.nom}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-[#222] text-[#888]' : 'bg-[#DDE4FF] text-[#1d4ed8]'}`}>
            {fichierJoint.type === 'image' ? 'Image' : 'Document'}
          </span>
          <button onClick={retirerFichier} className="opacity-60 hover:opacity-100 p-1">
            <i className="ph ph-x text-xs" />
          </button>
        </div>
      )}

      {/* ── Zone saisie principale ────────────────────────────── */}
      <div className={`px-4 pb-3 relative ${isDark ? 'bg-black' : 'bg-white border-t border-[#E2E8FF]'}`}>

        {/* Inputs fichier cachés */}
        {OPTIONS_MENU.map((opt) => (
          <input key={opt.id}
            ref={(el) => { fileInputRefs.current[opt.id] = el }}
            type="file" accept={opt.accept}
            capture={opt.capture || undefined}
            className="hidden"
            onChange={handleFichierChange}
          />
        ))}

        {/* ── Menu popup attachement ───────────────────────────── */}
        {menuOuvert && (
          <div ref={menuRef}
            className={`absolute bottom-full left-4 mb-2 w-[240px] rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fade-in ${
              isDark ? 'bg-[#0A0A0A] border-[#1A1A1A]' : 'bg-white border-[#E2E8FF]'
            }`}
          >
            <div className={`px-4 py-2.5 border-b text-[11px] font-semibold tracking-widest uppercase ${
              isDark ? 'border-[#1A1A1A] text-[#444]' : 'border-[#E2E8FF] text-[#C0CCE8]'
            }`}>
              {langue === 'fr' ? 'Joindre un fichier' : 'Attach a file'}
            </div>
            {OPTIONS_MENU.map((opt, i) => (
              <button key={opt.id} onClick={() => handleOptionMenu(opt)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[56px] ${
                  i < OPTIONS_MENU.length - 1
                    ? isDark ? 'border-b border-[#111]' : 'border-b border-[#F5F7FF]'
                    : ''
                } ${isDark ? 'hover:bg-[#111]' : 'hover:bg-[#F5F7FF]'}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: opt.couleur + '20' }}>
                  <i className={`ph ${opt.icone} text-lg`} style={{ color: opt.couleur }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
                    {langue === 'fr' ? opt.label_fr : opt.label_en}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-[#444]' : 'text-[#9AA5C0]'}`}>
                    {langue === 'fr' ? opt.desc_fr : opt.desc_en}
                  </div>
                </div>
                <i className={`ph ph-caret-right text-sm ${isDark ? 'text-[#333]' : 'text-[#C0CCE8]'}`} />
              </button>
            ))}
          </div>
        )}

        {/* ── Bandeau enregistrement ────────────────────────────── */}
        {enregistrement ? (
          <div className={`flex items-center gap-3 rounded-full px-4 py-2 border ${
            isDark ? 'bg-[#111] border-transparent' : 'bg-[#F0F4FF] border-[#E2E8FF]'
          }`}>
            <button onClick={annulerEnregistrement}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDark ? 'text-[#888] hover:text-[#ECECEC]' : 'text-[#9AA5C0] hover:text-[#040d22]'
              }`}>
              <i className="ph ph-x text-sm" />
            </button>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className={`text-[12px] font-medium ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
                {langue === 'fr' ? 'Enregistrement…' : 'Recording…'} {formatDuree(dureeEnreg)}
              </span>
            </div>
            <button onClick={arreterEnregistrement}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white active:scale-90 transition-all"
              style={{ background: isDark ? '#4F7EFF' : GRAD_BTN }}>
              <i className="ph-fill ph-stop text-sm" />
            </button>
          </div>

        ) : (
          /* ── Barre de saisie compacte ────────────────────────── */
          <div className={`flex items-end gap-2 rounded-full px-3 py-1 border ${
            isDark ? 'bg-[#111] border-transparent' : 'bg-[#F0F4FF] border-[#E2E8FF]'
          }`}>

            {/* Bouton trombone */}
            <button
              onClick={() => !loading && !transcription && !fichierEnCours && setMenuOuvert(!menuOuvert)}
              disabled={loading || transcription || fichierEnCours}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
                menuOuvert || fichierJoint
                  ? isDark ? 'text-[#4F7EFF]' : 'text-[#1d4ed8]'
                  : isDark ? 'text-[#444] hover:text-[#ECECEC]' : 'text-[#A8B8D8] hover:text-[#040d22]'
              }`}
            >
              {fichierEnCours
                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <i className={`ph ${menuOuvert ? 'ph-x' : 'ph-paperclip'} text-base`} />
              }
            </button>

            {/* Textarea compact */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                transcription
                  ? (langue === 'fr' ? 'Transcription…' : 'Transcribing…')
                  : fichierJoint
                    ? (langue === 'fr' ? 'Question sur ce fichier…' : 'Ask about this file…')
                    : (langue === 'fr' ? 'Décrivez vos symptômes...' : 'Describe your symptoms...')
              }
              disabled={transcription}
              style={{ maxHeight: '140px', fontSize: '16px' }}
              className={`flex-1 bg-transparent border-none outline-none resize-none leading-relaxed py-2 ${
                isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'
              }`}
            />

            {/* Microphone */}
            <button
              onClick={enregistrement ? arreterEnregistrement : demarrerEnregistrement}
              disabled={loading || transcription}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
                isDark ? 'text-[#444] hover:text-[#ECECEC]' : 'text-[#A8B8D8] hover:text-[#040d22]'
              }`}
            >
              {transcription
                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <i className="ph ph-microphone text-base" />
              }
            </button>

            {/* Bouton envoi / stop — dégradé bleu nuit en clair */}
            <button
              onClick={handleBoutonPrincipal}
              disabled={!loading && ((!texte.trim() && !fichierJoint) || transcription || fichierEnCours)}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? '#EF4444'
                  : isDark ? '#4F7EFF' : GRAD_BTN,
              }}
            >
              {loading
                ? <i className="ph-fill ph-stop text-sm" />
                : <i className="ph-fill ph-paper-plane-tilt text-sm" />
              }
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className={`text-center text-[10px] mt-1.5 ${isDark ? 'text-[#222]' : 'text-[#C0CCE8]'}`}>
          Ralnejj peut faire des erreurs. Consultez toujours un médecin pour les urgences.
        </p>
      </div>
    </div>
  )
}