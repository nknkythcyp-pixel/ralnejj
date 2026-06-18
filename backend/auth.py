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
    return pwd_context.hash(mot_de_passe[:72])

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