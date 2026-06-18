/**
 * InputZone.jsx — Zone de saisie du chat Ralnejj Santé v3
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

const EXT_DOCUMENTS = '.pdf,.docx,.doc'
const EXT_TABLEURS  = '.xlsx,.xls'
const EXT_IMAGES    = '.jpg,.jpeg,.png,.webp,.gif'

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
    accept: EXT_IMAGES, capture: null, couleur: '#10B981',
  },
  {
    id: 'document', icone: 'ph-file-pdf',
    label_fr: 'Document PDF / Word', label_en: 'PDF / Word document',
    desc_fr: 'Analyser ou résumer', desc_en: 'Analyze or summarize',
    accept: EXT_DOCUMENTS, capture: null, couleur: '#EF4444',
  },
  {
    id: 'tableur', icone: 'ph-microsoft-excel-logo',
    label_fr: 'Fichier Excel', label_en: 'Excel file',
    desc_fr: 'Données ou résultats', desc_en: 'Data or results',
    accept: EXT_TABLEURS, capture: null, couleur: '#22C55E',
  },
]

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [texte])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOuvert(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  useEffect(() => {
    return () => {
      arreterTimer()
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const arreterTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

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

  const handleOptionMenu = (option) => {
    setMenuOuvert(false)
    fileInputRefs.current[option.id]?.click()
  }

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
      const nouveau = {
        nom: data.nom_fichier || fichier.name,
        type: data.type,
        texte: data.texte || null,
        image_data: data.image_data || null,
      }
      setFichierJoint(nouveau)
      fichierJointRef.current = nouveau
      toast.success(langue === 'fr' ? `Fichier joint : ${fichier.name}` : `File attached: ${fichier.name}`)
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(detail || (langue === 'fr' ? 'Erreur lors du chargement.' : 'Error loading file.'))
    } finally {
      setFichierEnCours(false)
    }
  }

  const retirerFichier = () => {
    setFichierJoint(null)
    fichierJointRef.current = null
  }

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

        if (blob.size < 1000) {
          toast.error(langue === 'fr' ? 'Enregistrement trop court.' : 'Recording too short.')
          return
        }

        setTranscription(true)
        try {
          const { data } = await transcrireAudio(blob, langue)
          const texteTranscrit = (data?.texte || '').trim()
          if (!texteTranscrit) {
            toast.error(langue === 'fr' ? 'Aucun texte détecté.' : 'No speech detected.')
          } else {
            setTexte((prev) => (prev ? `${prev} ${texteTranscrit}` : texteTranscrit))
            textareaRef.current?.focus()
          }
        } catch {
          toast.error(langue === 'fr' ? 'Erreur de transcription.' : 'Transcription error.')
        } finally {
          setTranscription(false)
        }
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
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    }
    arreterTimer()
    chunksRef.current = []
    setEnregistrement(false)
    setDureeEnreg(0)
  }

  const formatDuree = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const handleBoutonPrincipal = () => {
    if (loading) {
      onStop?.()
    } else {
      handleEnvoyer()
    }
  }

  return (
    <div className={isDark ? 'bg-black' : 'bg-[#F7F9FF]'}>

      {!loading && !enregistrement && !texte.trim() && !fichierJoint && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2 pt-1">
          {chips.map((chip, i) => (
            <button
              key={i}
              onClick={() => { setTexte(chip); textareaRef.current?.focus() }}
              className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-colors min-h-[36px] ${
                isDark
                  ? 'bg-transparent border border-[#222] text-[#ECECEC] hover:bg-[#111]'
                  : 'bg-white border border-[#DDE4FF] text-[#1d4ed8] hover:bg-[#EEF2FF]'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {fichierJoint && (
        <div className={`flex items-center gap-2 mx-4 mb-2 px-3 py-2 rounded-xl text-[12px] ${
          isDark ? 'bg-[#111] text-[#ECECEC]' : 'bg-[#EEF2FF] text-[#1d4ed8]'
        }`}>
          <i className={`ph ${fichierJoint.type === 'image' ? 'ph-image' : 'ph-file-text'} text-base flex-shrink-0`} />
          <span className="flex-1 truncate text-[12px]">{fichierJoint.nom}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
            isDark ? 'bg-[#222] text-[#888]' : 'bg-[#DDE4FF] text-[#1d4ed8]'
          }`}>
            {fichierJoint.type === 'image' ? 'Image' : 'Document'}
          </span>
          <button
            onClick={retirerFichier}
            className="opacity-60 hover:opacity-100 flex-shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
          >
            <i className="ph ph-x text-sm" />
          </button>
        </div>
      )}

      <div className={`px-4 pb-4 relative ${isDark ? 'bg-black' : 'bg-white border-t border-[#E2E8FF]'}`}>

        {OPTIONS_MENU.map((option) => (
          <input
            key={option.id}
            ref={(el) => { fileInputRefs.current[option.id] = el }}
            type="file"
            accept={option.accept}
            capture={option.capture || undefined}
            className="hidden"
            onChange={handleFichierChange}
          />
        ))}

        {menuOuvert && (
          <div
            ref={menuRef}
            className={`absolute bottom-full left-4 mb-2 w-[240px] rounded-2xl shadow-2xl border overflow-hidden z-50 animate-fade-in ${
              isDark ? 'bg-[#0A0A0A] border-[#1A1A1A]' : 'bg-white border-[#E2E8FF]'
            }`}
          >
            <div className={`px-4 py-2.5 border-b text-[11px] font-semibold tracking-widest uppercase ${
              isDark ? 'border-[#1A1A1A] text-[#444]' : 'border-[#E2E8FF] text-[#C0CCE8]'
            }`}>
              {langue === 'fr' ? 'Joindre un fichier' : 'Attach a file'}
            </div>

            {OPTIONS_MENU.map((option, i) => (
              <button
                key={option.id}
                onClick={() => handleOptionMenu(option)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[56px] ${
                  i < OPTIONS_MENU.length - 1
                    ? isDark ? 'border-b border-[#111]' : 'border-b border-[#F5F7FF]'
                    : ''
                } ${isDark ? 'hover:bg-[#111] active:bg-[#1A1A1A]' : 'hover:bg-[#F5F7FF] active:bg-[#EEF2FF]'}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: option.couleur + '20' }}
                >
                  <i className={`ph ${option.icone} text-lg`} style={{ color: option.couleur }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
                    {langue === 'fr' ? option.label_fr : option.label_en}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-[#444]' : 'text-[#9AA5C0]'}`}>
                    {langue === 'fr' ? option.desc_fr : option.desc_en}
                  </div>
                </div>
                <i className={`ph ph-caret-right text-sm flex-shrink-0 ${isDark ? 'text-[#333]' : 'text-[#C0CCE8]'}`} />
              </button>
            ))}
          </div>
        )}

        {enregistrement ? (
          <div className={`flex items-center gap-3 rounded-full px-4 py-2.5 border ${
            isDark ? 'bg-[#111] border-transparent' : 'bg-[#F0F4FF] border-[#E2E8FF]'
          }`}>
            <button
              onClick={annulerEnregistrement}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px] ${
                isDark ? 'text-[#888] hover:text-[#ECECEC]' : 'text-[#9AA5C0] hover:text-[#1d4ed8]'
              }`}
            >
              <i className="ph ph-x text-base" />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className={`text-[12.5px] font-medium ${isDark ? 'text-[#ECECEC]' : 'text-[#1E2A45]'}`}>
                {langue === 'fr' ? 'Enregistrement…' : 'Recording…'} {formatDuree(dureeEnreg)}
              </span>
            </div>
            <button
              onClick={arreterEnregistrement}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white active:scale-90 transition-all min-h-[44px] ${
                isDark ? 'bg-[#4F7EFF] hover:bg-[#3D6FEE]' : ''
              }`}
              style={!isDark ? { background: '#040d22' } : undefined}
            >
              <i className="ph-fill ph-stop text-base" />
            </button>
          </div>

        ) : (
          <div className={`flex items-end gap-2 rounded-full px-4 py-1.5 border ${
            isDark ? 'bg-[#111] border-transparent' : 'bg-[#F0F4FF] border-[#E2E8FF]'
          }`}>

            <button
              onClick={() => !loading && !transcription && !fichierEnCours && setMenuOuvert(!menuOuvert)}
              disabled={loading || transcription || fichierEnCours}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] ${
                menuOuvert || fichierJoint
                  ? isDark ? 'text-[#4F7EFF]' : 'text-[#1d4ed8]'
                  : isDark
                    ? 'text-[#444] hover:text-[#ECECEC] hover:bg-white/5'
                    : 'text-[#A8B8D8] hover:text-[#1d4ed8] hover:bg-[#E2E8FF]'
              }`}
              title={langue === 'fr' ? 'Joindre un fichier' : 'Attach a file'}
            >
              {fichierEnCours
                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <i className={`ph ${menuOuvert ? 'ph-x' : 'ph-paperclip'} text-base`} />
              }
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                transcription
                  ? (langue === 'fr' ? 'Transcription en cours…' : 'Transcribing…')
                  : fichierJoint
                    ? (langue === 'fr' ? 'Posez une question sur ce fichier…' : 'Ask about this file…')
                    : (langue === 'fr' ? 'Décrivez vos symptômes...' : 'Describe your symptoms...')
              }
              disabled={transcription}
              style={{ maxHeight: '160px', fontSize: '16px' }}
              className={`flex-1 bg-transparent border-none outline-none resize-none leading-relaxed py-1 ${
                isDark ? 'text-[#ECECEC] placeholder-[#444]' : 'text-[#1E2A45] placeholder-[#A8B8D8]'
              }`}
            />

            <button
              onClick={enregistrement ? arreterEnregistrement : demarrerEnregistrement}
              disabled={loading || transcription}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] ${
                isDark ? 'text-[#444] hover:text-[#ECECEC] hover:bg-white/5' : 'text-[#A8B8D8] hover:text-[#1d4ed8] hover:bg-[#E2E8FF]'
              }`}
              title={langue === 'fr' ? 'Note vocale' : 'Voice note'}
            >
              {transcription
                ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <i className="ph ph-microphone text-base" />
              }
            </button>

            {/* Bouton envoi → rouge stop pendant loading */}
            <button
              onClick={handleBoutonPrincipal}
              disabled={!loading && ((!texte.trim() && !fichierJoint) || transcription || fichierEnCours)}
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-all active:scale-90 min-h-[44px] ${
                loading
                  ? 'bg-red-500 hover:bg-red-600'
                  : isDark
                    ? 'bg-[#4F7EFF] hover:bg-[#3D6FEE] disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
              }`}
              style={!loading && !isDark ? { background: '#040d22' } : undefined}
            >
              {loading
                ? <i className="ph-fill ph-stop text-base" />
                : <i className="ph-fill ph-paper-plane-tilt text-base" />
              }
            </button>
          </div>
        )}

        <p className={`text-center text-[10px] mt-2 ${isDark ? 'text-[#222]' : 'text-[#C0CCE8]'}`}>
          Ralnejj peut faire des erreurs. Consultez toujours un médecin pour les urgences.
        </p>
      </div>
    </div>
  )
}