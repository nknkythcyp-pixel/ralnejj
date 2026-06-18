import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { connexion } from '../services/api'
import { useStore } from '../store/useStore'
import logoRalnejj from '../logoral.png'

export default function ConnexionPage() {
  const navigate = useNavigate()
  const setAuth  = useStore((s) => s.setAuth)

  const [form, setForm]       = useState({ email: '', mot_de_passe: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.mot_de_passe) {
      toast.error('Remplissez tous les champs.')
      return
    }
    setLoading(true)
    try {
      const { data } = await connexion(form)
      setAuth(data.utilisateur, data.token)
      toast.success(`Bienvenue, ${data.utilisateur.nom} !`)
      navigate('/chat')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Email ou mot de passe incorrect.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{cssAnimations}</style>

      <div style={{ ...styles.halo, width: 520, height: 520, top: -210, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 65%)', animationDelay: '0s' }} />
      <div style={{ ...styles.halo, width: 300, height: 300, bottom: -80, right: -60, background: 'radial-gradient(circle, rgba(45,212,191,0.18) 0%, transparent 70%)', animationDelay: '2.5s' }} />
      <div style={{ ...styles.halo, width: 220, height: 220, top: '32%', left: -60, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', animationDelay: '1.2s' }} />

      <div style={{ ...styles.wrapper, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)' }}>

        <div style={styles.logoZone}>
          <div style={styles.logoFloat}>
            <img src={logoRalnejj} alt="Ralnejj Santé" style={{ width: 78, height: 78, objectFit: 'contain', borderRadius: 16 }} />
          </div>
        </div>

        <div style={styles.headline}>
          <h1 style={styles.h1}>
            Bon retour sur <em style={styles.em}>Ralnejj Santé</em>
          </h1>
          <p style={styles.sub}>Votre assistant médical IA pour l'Afrique centrale vous attend.</p>
        </div>

        <div style={styles.card}>
          <form onSubmit={handleSubmit} style={styles.form}>

            <div>
              <label style={styles.label}>Adresse email</label>
              <div style={styles.fieldBox}>
                <i className="ph ph-envelope" style={styles.fieldIcon} />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  style={styles.fieldInput}
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>Mot de passe</label>
              <div style={styles.fieldBox}>
                <i className="ph ph-lock" style={styles.fieldIcon} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="mot_de_passe"
                  value={form.mot_de_passe}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={styles.fieldInput}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.eyeBtn} aria-label="Afficher le mot de passe">
                  <i className={`ph ${showPwd ? 'ph-eye-slash' : 'ph-eye'}`} style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? (
                <>
                  <div style={styles.spinner} />
                  Connexion...
                </>
              ) : (
                <>
                  <i className="ph ph-sign-in" style={{ fontSize: 15 }} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          <p style={styles.switchText}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" style={styles.link}>S'inscrire</Link>
          </p>

          <p style={styles.secureText}>
            <i className="ph ph-lock" style={{ fontSize: 10, marginRight: 4, verticalAlign: -1 }} />
            Données chiffrées &amp; sécurisées
          </p>
        </div>
      </div>
    </div>
  )
}

const cssAnimations = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
  :root {
    --bg-from: #06122b; --bg-mid: #04102a; --bg-to: #020817;
    --card-bg: rgba(8, 22, 48, 0.55); --card-border: rgba(120, 160, 210, 0.16);
    --field-bg: rgba(255,255,255,0.05); --field-border: rgba(120,160,210,0.20);
    --text-main: #EAF2FF; --text-mute: rgba(150,180,220,0.75); --text-faint: rgba(150,180,220,0.45);
  }
  @keyframes floatLogo { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes haloPulse { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.06); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  input::placeholder { color: var(--text-faint); }
`

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(16px, 5vw, 32px)',
    background: 'radial-gradient(ellipse 140% 90% at 50% 0%, var(--bg-from) 0%, var(--bg-mid) 45%, var(--bg-to) 100%)',
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
    filter: 'blur(90px)',
    animation: 'haloPulse 8s ease-in-out infinite',
  },
  wrapper: {
    width: '100%',
    maxWidth: 400,
    position: 'relative',
    zIndex: 2,
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  logoZone: { textAlign: 'center', marginBottom: 14 },
  logoFloat: { display: 'inline-flex', animation: 'floatLogo 4s ease-in-out infinite', marginBottom: 6 },
  brandName: { fontSize: 'clamp(16px, 4vw, 19px)', fontWeight: 900, letterSpacing: 4, color: '#C1E8FF', marginTop: 2 },
  brandSub: { fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-mute)', marginTop: 2 },
  headline: { textAlign: 'center', marginBottom: 18 },
  h1: { fontSize: 'clamp(17px, 4.2vw, 21px)', fontWeight: 900, lineHeight: 1.25, letterSpacing: -0.3, color: '#FFFFFF', marginBottom: 4 },
  em: {
    fontStyle: 'normal',
    background: 'linear-gradient(90deg, #60a5fa, #2DD4BF)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  sub: { fontSize: 11.5, fontWeight: 400, color: 'var(--text-mute)', padding: '0 8px' },
  card: {
    borderRadius: 22,
    padding: 'clamp(20px, 4.5vw, 26px) clamp(18px, 4vw, 22px) 18px',
    background: 'var(--card-bg)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--card-border)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 4 },
  fieldBox: {
    display: 'flex', alignItems: 'center', gap: 7,
    borderRadius: 50, padding: '0 13px', height: 38,
    border: '1px solid var(--field-border)', background: 'var(--field-bg)',
    transition: 'all 0.18s ease',
  },
  fieldIcon: { fontSize: 13.5, color: 'var(--text-mute)', flexShrink: 0 },
  fieldInput: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
    color: 'var(--text-main)', fontSize: 12.5, fontFamily: 'inherit', padding: 0, height: '100%',
  },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-mute)', flexShrink: 0 },
  submitBtn: {
    width: '100%', padding: '11px', borderRadius: 50, border: 'none',
    fontSize: 12.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff',
    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #2DD4BF 100%)',
    boxShadow: '0 6px 20px rgba(29,110,245,0.4)',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    marginTop: 4,
  },
  spinner: { width: 13, height: 13, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  switchText: { textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text-mute)', marginTop: 16 },
  link: { fontWeight: 700, color: '#7DC4FF', cursor: 'pointer', textDecoration: 'none' },
  secureText: { textAlign: 'center', fontSize: 9.5, fontWeight: 500, color: 'var(--text-faint)', marginTop: 14 },
}