/**
 * api.js — Service API Ralnejj Santé v3
 * Toutes les fonctions d'appel au backend FastAPI
 * Base URL : http://127.0.0.1:8000
 */

import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 30000,
})

// ── Intercepteur token JWT ────────────────────────────────────
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('ralnejj-store')
  if (raw) {
    try {
      const { state } = JSON.parse(raw)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    } catch (_) {}
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────
export const inscription = (data) => api.post('/inscription', data)
export const connexion   = (data) => api.post('/connexion',   data)

// ── Profil ────────────────────────────────────────────────────
export const getProfil      = (id)       => api.get(`/utilisateurs/${id}`)
export const modifierProfil = (id, data) => api.put(`/utilisateurs/${id}`, data)
export const supprimerCompte = (id)      => api.delete(`/utilisateurs/${id}`)

// ── Chat classique (POST /chat) ───────────────────────────────
export const envoyerMessage = (data) => api.post('/chat', data)

// ── Chat streaming SSE (POST /chat/stream) ────────────────────
// Retourne un AbortController pour pouvoir annuler la requête
export const streamMessage = (data, onDelta, onDone, onError) => {
  let token = null
  try {
    const raw = localStorage.getItem('ralnejj-store')
    if (raw) {
      const { state } = JSON.parse(raw)
      token = state?.token || null
    }
  } catch (_) {}

  const controller = new AbortController()

  fetch('http://127.0.0.1:8000/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`Erreur HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // stream: true → gère les accents coupés entre deux chunks
        buffer += decoder.decode(value, { stream: true })

        // Les événements SSE sont séparés par "\n\n"
        let sepIndex
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex + 2)

          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr)
              if (event.type === 'init') {
                onDone?.({ conversation_id: event.conversation_id, init: true })
              } else if (event.type === 'delta') {
                onDelta?.(event.delta)
              } else if (event.type === 'done') {
                onDone?.({ urgence: event.urgence, init: false })
              } else if (event.type === 'error') {
                onError?.(new Error(event.message))
              }
            } catch (err) {
              console.error('Erreur parsing SSE:', err, jsonStr)
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err)
    })

  return controller
}

// ── Conversations ─────────────────────────────────────────────
export const getConversations     = (uid)          => api.get(`/conversations/${uid}`)
export const getMessages          = (convId)       => api.get(`/messages/${convId}`)
export const renommerConversation = (convId, titre) => api.put(`/conversations/${convId}/renommer`, { titre })
export const epinglerConversation = (convId, val)  => api.put(`/conversations/${convId}/epingler?epingle=${val}`)
export const supprimerConversation = (convId)      => api.delete(`/conversations/${convId}`)
export const viderHistorique      = (uid)          => api.delete(`/conversations/tout/${uid}`)

// ── Messages ──────────────────────────────────────────────────
export const modifierMessage = (msgId, contenu) => api.put(`/messages/${msgId}`, { contenu })

// ── Feedback ──────────────────────────────────────────────────
export const envoyerFeedback = (data) => api.post('/feedback', data)

// ── Recherche ─────────────────────────────────────────────────
export const rechercherMessages = (uid, q) =>
  api.get(`/recherche/${uid}?q=${encodeURIComponent(q)}`)

// ── Upload fichier (PDF, Word, Excel, Image) ──────────────────
// Route backend : POST /upload-fichier
export const uploaderFichier = (fichier) => {
  const formData = new FormData()
  formData.append('fichier', fichier)
  return api.post('/upload-fichier', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

// ── Transcription audio (notes vocales) ───────────────────────
// Route backend : POST /transcription
export const transcrireAudio = (blob, langue = 'fr') => {
  const formData = new FormData()
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  formData.append('fichier', blob, `note_vocale.${ext}`)
  formData.append('langue', langue)
  return api.post('/transcription', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

export default api