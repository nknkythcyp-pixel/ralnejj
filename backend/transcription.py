"""
transcription.py — Transcription audio via Groq Whisper
"""
from dotenv import load_dotenv
load_dotenv(override=True)

from groq import Groq
from config import GROQ_API_KEY, GROQ_WHISPER_MODEL

client = Groq(api_key=GROQ_API_KEY)


# Hallucinations textuelles connues (filet de sécurité supplémentaire)
HALLUCINATIONS_CONNUES = [
    "sous-titrage société radio-canada",
    "sous-titrage st'501",
    "sous-titres réalisés par la communauté d'amara.org",
    "sous-titres par la communauté d'amara.org",
    "merci d'avoir regardé cette vidéo",
    "merci d'avoir regardé",
    "abonnez-vous",
    "n'hésitez pas à vous abonner",
    "thanks for watching",
    "thank you for watching",
    "subtitles by",
    "translated by",
    "www.amara.org",
]


def _est_hallucination_texte(texte: str) -> bool:
    t = texte.strip().lower().strip(".!? ")
    if not t:
        return True
    for phrase in HALLUCINATIONS_CONNUES:
        if phrase in t:
            return True
    # Mots/expressions très courts typiques des hallucinations sur silence
    if t in {"you", "yeah", "okay", "ok", "bye", "thank you", "thanks"}:
        return True
    return False


def transcrire_audio(chemin_fichier: str, langue: str = "fr") -> str:
    try:
        with open(chemin_fichier, "rb") as f:
            resultat = client.audio.transcriptions.create(
                file=f,
                model=GROQ_WHISPER_MODEL,
                response_format="verbose_json",
            )
    except Exception as e:
        print(f"[TRANSCRIPTION ERREUR API] {type(e).__name__}: {e}")
        raise

    texte = (getattr(resultat, "text", "") or "").strip()
    segments = getattr(resultat, "segments", None) or []

    print(f"[TRANSCRIPTION] texte brut={texte!r} | nb_segments={len(segments)}")

    # ── Filtrage via no_speech_prob ───────────────────────────────
    if segments:
        # Si TOUS les segments ont une forte probabilité de "pas de parole",
        # on considère qu'il n'y a rien à transcrire.
        seuil = 0.6
        no_speech_probs = []
        for seg in segments:
            if isinstance(seg, dict):
                p = seg.get("no_speech_prob")
            else:
                p = getattr(seg, "no_speech_prob", None)
            if p is not None:
                no_speech_probs.append(p)
                print(f"[TRANSCRIPTION] segment no_speech_prob={p}")

        if no_speech_probs and all(p >= seuil for p in no_speech_probs):
            print("[TRANSCRIPTION] Tous les segments indiquent une absence de parole.")
            return ""

    # ── Filtrage textuel (filet de sécurité) ──────────────────────
    if _est_hallucination_texte(texte):
        print(f"[TRANSCRIPTION] Hallucination textuelle détectée et ignorée : {texte!r}")
        return ""

    return texte.strip()