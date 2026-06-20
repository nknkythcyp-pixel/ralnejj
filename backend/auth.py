"""
auth.py — Authentification JWT pour Ralnejj Santé v2
Utilise bcrypt directement (sans passlib) pour éviter le conflit
de version avec chromadb qui exige bcrypt>=4.0.1
"""
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM, TOKEN_EXPIRATION_MINUTES

# ── Hash mot de passe ────────────────────────────────────────────
def hasher_mot_de_passe(mot_de_passe: str) -> str:
    # bcrypt a une limite de 72 bytes — on tronque proprement si besoin
    password_bytes = mot_de_passe.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    salt = bcrypt.gensalt(rounds=12)
    hash_bytes = bcrypt.hashpw(password_bytes, salt)
    return hash_bytes.decode('utf-8')


def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    password_bytes = mot_de_passe.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    hash_bytes = hash.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except (ValueError, TypeError):
        return False


# ── JWT ──────────────────────────────────────────────────────────
def creer_token(donnees: dict) -> str:
    contenu = donnees.copy()
    expiration = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRATION_MINUTES)
    contenu.update({"exp": expiration})
    return jwt.encode(contenu, SECRET_KEY, algorithm=ALGORITHM)


def decoder_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None