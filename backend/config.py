import os
from dotenv import load_dotenv

load_dotenv()

# ── Groq ────────────────────────────────────────────────────────
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL         = "llama-3.3-70b-versatile"          # texte
GROQ_VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"  # images
GROQ_WHISPER_MODEL = "whisper-large-v3"                 # audio

# ── MySQL ────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":       os.getenv("DB_HOST",     "127.0.0.1"),
    "port":       int(os.getenv("DB_PORT", 3306)),
    "user":       os.getenv("DB_USER",     "root"),
    "password":   os.getenv("DB_PASSWORD", ""),
    "database":   os.getenv("DB_NAME",     "ralnejj"),
    "charset":    "utf8mb4",
    "autocommit": True,
}

# ── JWT ─────────────────────────────────────────────────────────
SECRET_KEY               = os.getenv("SECRET_KEY", "ralnejj_secret_2026")
ALGORITHM                = os.getenv("ALGORITHM",  "HS256")
TOKEN_EXPIRATION_MINUTES = int(os.getenv("TOKEN_EXPIRATION_MINUTES", 1440))

# ── App ──────────────────────────────────────────────────────────
APP_NOM     = os.getenv("APP_NOM",     "Ralnejj Santé")
APP_VERSION = os.getenv("APP_VERSION", "2.0.0")