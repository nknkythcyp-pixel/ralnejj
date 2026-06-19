import os
from dotenv import load_dotenv

load_dotenv()

# ── Groq ────────────────────────────────────────────────────────
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL         = "llama-3.3-70b-versatile"          # texte
GROQ_VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct"  # images
GROQ_WHISPER_MODEL = "whisper-large-v3"                 # audio

# ── Tavily (Recherche Web) ──────────────────────────────────────
TAVILY_API_KEY     = os.getenv("TAVILY_API_KEY", "")

# ── MySQL ────────────────────────────────────────────────────────
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")

DB_CONFIG = {
    "host":       DB_HOST,
    "port":       int(os.getenv("DB_PORT", 3306)),
    "user":       os.getenv("DB_USER",     "root"),
    "password":   os.getenv("DB_PASSWORD", ""),
    "database":   os.getenv("DB_NAME",     "ralnejj"),
    "charset":    "utf8mb4",
    "autocommit": True,
}

# Configuration SSL correcte pour mysql-connector-python sur Aiven Cloud
if "aivencloud.com" in DB_HOST:
    # Au lieu de ssl_mode, on demande au connecteur d'activer le SSL pur
    DB_CONFIG["ssl_disabled"] = False

# ── JWT ─────────────────────────────────────────────────────────
SECRET_KEY               = os.getenv("SECRET_KEY", "ralnejj_secret_2026")
ALGORITHM                = os.getenv("ALGORITHM",  "HS256")
TOKEN_EXPIRATION_MINUTES = int(os.getenv("TOKEN_EXPIRATION_MINUTES", 1440))

# ── App ──────────────────────────────────────────────────────────
APP_NOM     = os.getenv("APP_NOM",     "Ralnejj Santé")
APP_VERSION = os.getenv("APP_VERSION", "3.0.0")