"""
database.py — Gestion base de données Ralnejj Santé v2
"""
import mysql.connector
from mysql.connector import Error
from config import DB_CONFIG


# ── Connexion ────────────────────────────────────────────────────
def get_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"[DB ERREUR] Connexion impossible : {e}")
        return None


# ── CRUD Conversations ────────────────────────────────────────────
def creer_conversation(utilisateur_id: int, titre: str = "Nouvelle conversation"):
    conn = get_connection()
    if not conn:
        return None
    try:
        c = conn.cursor()
        c.execute(
            """INSERT INTO conversations (utilisateur_id, titre, derniere_activite)
               VALUES (%s, %s, NOW())""",
            (utilisateur_id, titre)
        )
        conv_id = c.lastrowid
        c.close()
        conn.close()
        return conv_id
    except Error as e:
        print(f"[DB ERREUR] creer_conversation : {e}")
        return None


def lister_conversations(utilisateur_id: int):
    conn = get_connection()
    if not conn:
        return []
    try:
        c = conn.cursor(dictionary=True)
        c.execute(
            """SELECT id, titre, epingle, created_at, derniere_activite
               FROM conversations
               WHERE utilisateur_id = %s
               ORDER BY epingle DESC, derniere_activite DESC""",
            (utilisateur_id,)
        )
        rows = c.fetchall()
        c.close()
        conn.close()
        return rows
    except Error as e:
        print(f"[DB ERREUR] lister_conversations : {e}")
        return []


def renommer_conversation(conversation_id: int, titre: str):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute(
            "UPDATE conversations SET titre = %s WHERE id = %s",
            (titre, conversation_id)
        )
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] renommer_conversation : {e}")
        return False


def epingler_conversation(conversation_id: int, epingle: bool):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute(
            "UPDATE conversations SET epingle = %s WHERE id = %s",
            (epingle, conversation_id)
        )
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] epingler_conversation : {e}")
        return False


def supprimer_conversation(conversation_id: int):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute("DELETE FROM conversations WHERE id = %s", (conversation_id,))
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] supprimer_conversation : {e}")
        return False


def supprimer_toutes_conversations(utilisateur_id: int):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute("DELETE FROM conversations WHERE utilisateur_id = %s", (utilisateur_id,))
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] supprimer_toutes_conversations : {e}")
        return False


# ── CRUD Messages ─────────────────────────────────────────────────
def sauvegarder_message(conversation_id: int, role: str, contenu: str):
    conn = get_connection()
    if not conn:
        return None
    try:
        c = conn.cursor()
        # Insérer le message
        c.execute(
            "INSERT INTO messages (conversation_id, role, contenu) VALUES (%s, %s, %s)",
            (conversation_id, role, contenu)
        )
        message_id = c.lastrowid

        # ← Mettre à jour la dernière activité de la conversation
        c.execute(
            "UPDATE conversations SET derniere_activite = NOW() WHERE id = %s",
            (conversation_id,)
        )

        c.close()
        conn.close()
        return message_id
    except Error as e:
        print(f"[DB ERREUR] sauvegarder_message : {e}")
        return None


def charger_historique(conversation_id: int, limite: int = 10):
    conn = get_connection()
    if not conn:
        return []
    try:
        c = conn.cursor(dictionary=True)
        c.execute(
            """SELECT id, role, contenu, created_at
               FROM messages
               WHERE conversation_id = %s
               ORDER BY created_at DESC LIMIT %s""",
            (conversation_id, limite)
        )
        rows = c.fetchall()
        c.close()
        conn.close()
        return list(reversed(rows))
    except Error as e:
        print(f"[DB ERREUR] charger_historique : {e}")
        return []


def modifier_message(message_id: int, nouveau_contenu: str):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute(
            "UPDATE messages SET contenu = %s WHERE id = %s",
            (nouveau_contenu, message_id)
        )
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] modifier_message : {e}")
        return False


# ── Recherche ─────────────────────────────────────────────────────
def rechercher_messages(utilisateur_id: int, query: str):
    conn = get_connection()
    if not conn:
        return []
    try:
        c = conn.cursor(dictionary=True)
        c.execute(
            """SELECT m.id, m.contenu, m.role, m.created_at,
                      c.id as conversation_id, c.titre
               FROM messages m
               JOIN conversations c ON m.conversation_id = c.id
               WHERE c.utilisateur_id = %s
               AND MATCH(m.contenu) AGAINST (%s IN BOOLEAN MODE)
               ORDER BY m.created_at DESC
               LIMIT 20""",
            (utilisateur_id, f"*{query}*")
        )
        rows = c.fetchall()
        c.close()
        conn.close()
        return rows
    except Error as e:
        print(f"[DB ERREUR] rechercher_messages : {e}")
        return []


# ── Feedback ──────────────────────────────────────────────────────
def sauvegarder_feedback(message_id: int, utilisateur_id: int, vote: int):
    conn = get_connection()
    if not conn:
        return False
    try:
        c = conn.cursor()
        c.execute(
            """INSERT INTO feedbacks (message_id, utilisateur_id, vote)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE vote = %s""",
            (message_id, utilisateur_id, vote, vote)
        )
        c.close()
        conn.close()
        return True
    except Error as e:
        print(f"[DB ERREUR] sauvegarder_feedback : {e}")
        return False


# ── Utilisateurs ──────────────────────────────────────────────────
def get_utilisateur(utilisateur_id: int):
    conn = get_connection()
    if not conn:
        return None
    try:
        c = conn.cursor(dictionary=True)
        c.execute(
            """SELECT id, nom, email, photo_profil, langue, theme,
                      age, poids, groupe_sanguin, maladies_chroniques, allergies
               FROM utilisateurs WHERE id = %s""",
            (utilisateur_id,)
        )
        user = c.fetchone()
        c.close()
        conn.close()
        return user
    except Error as e:
        print(f"[DB ERREUR] get_utilisateur : {e}")
        return None