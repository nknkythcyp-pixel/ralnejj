"""
principal.py — Serveur FastAPI Ralnejj Santé v3
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import uvicorn
import tempfile
import os
import json

from config import APP_NOM, APP_VERSION
from database import (
    get_connection,
    creer_conversation,
    lister_conversations,
    renommer_conversation,
    epingler_conversation,
    supprimer_conversation,
    supprimer_toutes_conversations,
    charger_historique,
    modifier_message,
    sauvegarder_feedback,
    rechercher_messages,
    get_utilisateur,
)
from agent import executer_agent, executer_agent_stream
from auth import hasher_mot_de_passe, verifier_mot_de_passe, creer_token
from transcription import transcrire_audio
from extraction_fichiers import extraire_fichier


# ── Application ──────────────────────────────────────────────────
app = FastAPI(title=APP_NOM, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modèles Pydantic ─────────────────────────────────────────────
class RequeteInscription(BaseModel):
    nom:          str
    email:        str
    mot_de_passe: str

class RequeteConnexion(BaseModel):
    email:        str
    mot_de_passe: str

class RequeteChat(BaseModel):
    message:             str
    conversation_id:     Optional[int]  = None
    utilisateur_id:      Optional[int]  = 1
    langue:              Optional[str]  = "fr"
    piece_jointe_texte:  Optional[str]  = None
    piece_jointe_nom:    Optional[str]  = None
    piece_jointe_image:  Optional[dict] = None   # {base64, media_type}

class ReponseSante(BaseModel):
    reponse:         str
    urgence:         bool
    conversation_id: int

class RequeteModifierProfil(BaseModel):
    nom:                  Optional[str]   = None
    email:                Optional[str]   = None
    langue:               Optional[str]   = None
    theme:                Optional[str]   = None
    age:                  Optional[int]   = None
    poids:                Optional[float] = None
    groupe_sanguin:       Optional[str]   = None
    maladies_chroniques:  Optional[str]   = None
    allergies:            Optional[str]   = None
    ancien_mot_de_passe:  Optional[str]   = None
    nouveau_mot_de_passe: Optional[str]   = None

class RequeteRenommer(BaseModel):
    titre: str

class RequeteFeedback(BaseModel):
    message_id:     int
    utilisateur_id: int
    vote:           int

class RequeteModifierMessage(BaseModel):
    contenu: str


# ── Extensions acceptées ─────────────────────────────────────────
EXTENSIONS_ACCEPTEES = {
    ".pdf", ".docx", ".doc", ".xlsx", ".xls",
    ".jpg", ".jpeg", ".png", ".webp", ".gif",
}


# ── Démarrage ────────────────────────────────────────────────────
@app.on_event("startup")
async def demarrage():
    print(f"\n{'='*50}")
    print(f"  {APP_NOM} v{APP_VERSION}")
    print(f"{'='*50}")
    print(f"[OK] Serveur prêt   → http://127.0.0.1:8000")
    print(f"[OK] Docs           → http://127.0.0.1:8000/docs\n")


# ════════════════════════════════════════════════════════════════
# STATUT
# ════════════════════════════════════════════════════════════════
@app.get("/")
async def racine():
    return {"status": "ok", "app": APP_NOM, "version": APP_VERSION}


# ════════════════════════════════════════════════════════════════
# AUTHENTIFICATION
# ════════════════════════════════════════════════════════════════
@app.post("/inscription")
async def inscription(requete: RequeteInscription):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erreur base de données.")
    try:
        c = conn.cursor(dictionary=True)
        c.execute("SELECT id FROM utilisateurs WHERE email = %s", (requete.email,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

        hash_mdp = hasher_mot_de_passe(requete.mot_de_passe)
        c.execute(
            "INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES (%s, %s, %s)",
            (requete.nom, requete.email, hash_mdp)
        )
        utilisateur_id = c.lastrowid
        c.close()
        conn.close()

        token = creer_token({"sub": str(utilisateur_id), "email": requete.email})
        return {
            "token": token,
            "utilisateur": {
                "id":     utilisateur_id,
                "nom":    requete.nom,
                "email":  requete.email,
                "langue": "fr",
                "theme":  "dark",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur : {str(e)}")


@app.post("/connexion")
async def connexion(requete: RequeteConnexion):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erreur base de données.")
    try:
        c = conn.cursor(dictionary=True)
        c.execute(
            "SELECT id, nom, email, mot_de_passe, langue, theme FROM utilisateurs WHERE email = %s",
            (requete.email,)
        )
        utilisateur = c.fetchone()
        c.close()
        conn.close()

        if not utilisateur or not verifier_mot_de_passe(requete.mot_de_passe, utilisateur["mot_de_passe"]):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

        token = creer_token({"sub": str(utilisateur["id"]), "email": utilisateur["email"]})
        return {
            "token": token,
            "utilisateur": {
                "id":     utilisateur["id"],
                "nom":    utilisateur["nom"],
                "email":  utilisateur["email"],
                "langue": utilisateur["langue"] or "fr",
                "theme":  utilisateur["theme"]  or "dark",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur : {str(e)}")


# ════════════════════════════════════════════════════════════════
# PROFIL UTILISATEUR
# ════════════════════════════════════════════════════════════════
@app.get("/utilisateurs/{utilisateur_id}")
async def get_profil(utilisateur_id: int):
    user = get_utilisateur(utilisateur_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return user


@app.put("/utilisateurs/{utilisateur_id}")
async def modifier_profil(utilisateur_id: int, requete: RequeteModifierProfil):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erreur base de données.")
    try:
        c = conn.cursor(dictionary=True)

        if requete.ancien_mot_de_passe and requete.nouveau_mot_de_passe:
            c.execute("SELECT mot_de_passe FROM utilisateurs WHERE id = %s", (utilisateur_id,))
            user = c.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
            if not verifier_mot_de_passe(requete.ancien_mot_de_passe, user["mot_de_passe"]):
                raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect.")
            nouveau_hash = hasher_mot_de_passe(requete.nouveau_mot_de_passe)
            c.execute("UPDATE utilisateurs SET mot_de_passe = %s WHERE id = %s", (nouveau_hash, utilisateur_id))
            c.close()
            conn.close()
            return {"status": "ok", "message": "Mot de passe mis à jour."}

        champs = {}
        for field in ["nom", "email", "langue", "theme", "age", "poids",
                      "groupe_sanguin", "maladies_chroniques", "allergies"]:
            val = getattr(requete, field)
            if val is not None:
                champs[field] = val

        if not champs:
            raise HTTPException(status_code=400, detail="Aucune donnée à modifier.")

        if requete.email:
            c.execute(
                "SELECT id FROM utilisateurs WHERE email = %s AND id != %s",
                (requete.email, utilisateur_id)
            )
            if c.fetchone():
                raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

        set_clause = ", ".join([f"{k} = %s" for k in champs.keys()])
        valeurs    = list(champs.values()) + [utilisateur_id]
        c.execute(f"UPDATE utilisateurs SET {set_clause} WHERE id = %s", valeurs)
        c.close()
        conn.close()
        return {"status": "ok", "message": "Profil mis à jour."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur : {str(e)}")


@app.delete("/utilisateurs/{utilisateur_id}")
async def supprimer_compte(utilisateur_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Erreur base de données.")
    try:
        c = conn.cursor()
        c.execute("DELETE FROM utilisateurs WHERE id = %s", (utilisateur_id,))
        c.close()
        conn.close()
        return {"status": "ok", "message": "Compte supprimé."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur : {str(e)}")


# ════════════════════════════════════════════════════════════════
# CHAT
# ════════════════════════════════════════════════════════════════
@app.post("/chat", response_model=ReponseSante)
async def chat(requete: RequeteChat):
    conv_id = requete.conversation_id
    if not conv_id:
        conv_id = creer_conversation(
            utilisateur_id=requete.utilisateur_id or 1,
            titre=requete.message[:60],
        )
        if not conv_id:
            raise HTTPException(status_code=500, detail="Impossible de créer une conversation.")

    profil = get_utilisateur(requete.utilisateur_id or 1) or {}

    try:
        resultat = executer_agent(
            message=requete.message,
            conversation_id=conv_id,
            utilisateur_id=requete.utilisateur_id or 1,
            langue=requete.langue or "fr",
            profil_sante=profil,
            piece_jointe_texte=requete.piece_jointe_texte,
            piece_jointe_nom=requete.piece_jointe_nom,
            piece_jointe_image=requete.piece_jointe_image,
        )
    except Exception as e:
        print(f"[ERREUR AGENT] {e}")
        raise HTTPException(status_code=500, detail=f"Erreur agent : {str(e)}")

    return ReponseSante(
        reponse=resultat["reponse"],
        urgence=resultat["urgence"],
        conversation_id=conv_id,
    )


# ════════════════════════════════════════════════════════════════
# CHAT STREAMING
# ════════════════════════════════════════════════════════════════
@app.post("/chat/stream")
async def chat_stream(requete: RequeteChat):
    conv_id = requete.conversation_id
    if not conv_id:
        conv_id = creer_conversation(
            utilisateur_id=requete.utilisateur_id or 1,
            titre=requete.message[:60],
        )
        if not conv_id:
            raise HTTPException(status_code=500, detail="Impossible de créer une conversation.")

    profil = get_utilisateur(requete.utilisateur_id or 1) or {}

    def generate():
        yield f"data: {json.dumps({'type': 'init', 'conversation_id': conv_id})}\n\n"

        try:
            for chunk in executer_agent_stream(
                message=requete.message,
                conversation_id=conv_id,
                utilisateur_id=requete.utilisateur_id or 1,
                langue=requete.langue or "fr",
                profil_sante=profil,
                piece_jointe_texte=requete.piece_jointe_texte,
                piece_jointe_nom=requete.piece_jointe_nom,
                piece_jointe_image=requete.piece_jointe_image,
            ):
                if chunk["done"]:
                    yield f"data: {json.dumps({'type': 'done', 'urgence': chunk['urgence']})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'delta', 'delta': chunk['token']})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ════════════════════════════════════════════════════════════════
# CONVERSATIONS
# ════════════════════════════════════════════════════════════════
@app.get("/conversations/{utilisateur_id}")
async def get_conversations(utilisateur_id: int):
    conversations = lister_conversations(utilisateur_id)
    return {"conversations": conversations}


@app.get("/messages/{conversation_id}")
async def get_messages(conversation_id: int):
    messages = charger_historique(conversation_id, limite=100)
    return {"messages": messages}


@app.put("/conversations/{conversation_id}/renommer")
async def renommer(conversation_id: int, requete: RequeteRenommer):
    ok = renommer_conversation(conversation_id, requete.titre)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors du renommage.")
    return {"status": "ok"}


@app.put("/conversations/{conversation_id}/epingler")
async def epingler(conversation_id: int, epingle: bool = True):
    ok = epingler_conversation(conversation_id, epingle)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de l'épinglage.")
    return {"status": "ok"}


@app.delete("/conversations/{conversation_id}")
async def supprimer_une_conversation(conversation_id: int):
    ok = supprimer_conversation(conversation_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression.")
    return {"status": "ok"}


@app.delete("/conversations/tout/{utilisateur_id}")
async def vider_historique(utilisateur_id: int):
    ok = supprimer_toutes_conversations(utilisateur_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression.")
    return {"status": "ok"}


# ════════════════════════════════════════════════════════════════
# MESSAGES
# ════════════════════════════════════════════════════════════════
@app.put("/messages/{message_id}")
async def modifier_un_message(message_id: int, requete: RequeteModifierMessage):
    ok = modifier_message(message_id, requete.contenu)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors de la modification.")
    return {"status": "ok"}


# ════════════════════════════════════════════════════════════════
# FEEDBACK
# ════════════════════════════════════════════════════════════════
@app.post("/feedback")
async def feedback(requete: RequeteFeedback):
    ok = sauvegarder_feedback(requete.message_id, requete.utilisateur_id, requete.vote)
    if not ok:
        raise HTTPException(status_code=500, detail="Erreur lors du feedback.")
    return {"status": "ok"}


# ════════════════════════════════════════════════════════════════
# RECHERCHE
# ════════════════════════════════════════════════════════════════
@app.get("/recherche/{utilisateur_id}")
async def recherche(utilisateur_id: int, q: str):
    resultats = rechercher_messages(utilisateur_id, q)
    return {"resultats": resultats}


# ════════════════════════════════════════════════════════════════
# TRANSCRIPTION AUDIO
# ════════════════════════════════════════════════════════════════
@app.post("/transcription")
async def transcription(
    fichier: UploadFile = File(...),
    langue: str = Form("fr"),
):
    tmp_path = None
    try:
        suffix = os.path.splitext(fichier.filename or "")[1] or ".webm"
        contenu = await fichier.read()
        if not contenu:
            raise HTTPException(status_code=400, detail="Fichier audio vide.")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contenu)
            tmp_path = tmp.name

        texte = transcrire_audio(tmp_path, langue=langue or "fr")
        if not texte:
            raise HTTPException(status_code=422, detail="Impossible de transcrire l'audio (vide ou inaudible).")

        return {"texte": texte}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERREUR TRANSCRIPTION] {e}")
        raise HTTPException(status_code=500, detail=f"Erreur transcription : {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# ════════════════════════════════════════════════════════════════
# UPLOAD FICHIER (PDF, Word, Excel, Image)
# ════════════════════════════════════════════════════════════════
@app.post("/upload-fichier")
async def upload_fichier(fichier: UploadFile = File(...)):
    nom    = fichier.filename or ""
    suffix = Path(nom).suffix.lower()

    if suffix not in EXTENSIONS_ACCEPTEES:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Acceptés : PDF, Word (.docx), Excel (.xlsx), JPG, PNG, WEBP, GIF."
        )

    tmp_path = None
    try:
        contenu = await fichier.read()
        if not contenu:
            raise HTTPException(status_code=400, detail="Fichier vide.")
        if len(contenu) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 15 Mo).")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contenu)
            tmp_path = tmp.name

        resultat = extraire_fichier(tmp_path)

        if resultat.get("erreur") and not resultat.get("contenu") and not resultat.get("image_data"):
            raise HTTPException(status_code=422, detail=resultat["erreur"])

        return {
            "nom_fichier": nom,
            "type":        resultat["type"],
            "texte":       resultat.get("contenu", ""),
            "image_data":  resultat.get("image_data"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement fichier : {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


# Compatibilité ancien endpoint PDF
@app.post("/upload-pdf")
async def upload_pdf(fichier: UploadFile = File(...)):
    return await upload_fichier(fichier)


# ── Lancement ────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("principal:app", host="127.0.0.1", port=8000, reload=True)