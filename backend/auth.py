"""
auth.py — Authentification JWT pour Ralnejj Santé v2
"""
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from config import SECRET_KEY, ALGORITHM, TOKEN_EXPIRATION_MINUTES

# ── Hash mot de passe ────────────────────────────────────────────
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

def hasher_mot_de_passe(mot_de_passe: str) -> str:
    # On s'assure de convertir en bytes, tronquer, puis hacher
    # Cela évite que bcrypt essaie de traiter une chaîne trop longue
    password_bytes = mot_de_passe.encode('utf-8')
    if len(password_bytes) > 72:
        mot_de_passe = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(mot_de_passe)
    
def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    return pwd_context.verify(mot_de_passe, hash)

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