"""
recherche_web.py — Module de recherche web avec Tavily
Ralnejj Santé v3

Rôle : Chercher des informations LOCALES et RÉCENTES uniquement
- Hôpitaux, cliniques, pharmacies au Cameroun
- Épidémies et alertes sanitaires en cours
- Prix de médicaments actuels
- Ressources sanitaires locales

NE PAS utiliser pour : questions médicales générales, définitions,
symptômes courants — l'IA répond directement depuis ses connaissances.
"""

import os
from dotenv import load_dotenv
load_dotenv()

# ── Import Tavily ────────────────────────────────────────────────
try:
    from tavily import TavilyClient
    TAVILY_DISPONIBLE = True
except ImportError:
    print("[TAVILY] tavily-python non installé — pip install tavily-python")
    TAVILY_DISPONIBLE = False

# ── Client Tavily ────────────────────────────────────────────────
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

if TAVILY_DISPONIBLE and TAVILY_API_KEY:
    client_tavily = TavilyClient(api_key=TAVILY_API_KEY)
    print("[TAVILY] Client initialisé avec succès.")
else:
    client_tavily = None
    print("[TAVILY] Client non disponible — clé API manquante ou bibliothèque non installée.")


# ════════════════════════════════════════════════════════════════
# CATÉGORIE 1 — Ressources locales (hôpitaux, cliniques, pharmacies)
# Déclenche Tavily : l'IA ne peut pas connaître les adresses actuelles
# ════════════════════════════════════════════════════════════════
MOTS_RESSOURCES_LOCALES = [
    # Établissements de santé
    "hôpital", "hopital", "clinique", "pharmacie", "centre de santé",
    "centre hospitalier", "dispensaire", "maternité",
    "hospital", "clinic", "pharmacy",

    # Villes du Cameroun — chercher des ressources locales
    "douala", "yaoundé", "yaounde", "bafoussam", "garoua",
    "limbe", "kribi", "ebolowa", "ngaoundéré", "maroua", "bamenda",

    # Demandes de contact / adresse
    "adresse", "contact", "numéro", "téléphone", "où aller",
    "où trouver", "trouve moi", "cherche moi",
    "address", "phone", "where to find",

    # Médecins spécialistes locaux
    "spécialiste", "cardiologue", "dermatologue", "gynécologue",
    "pédiatre", "ophtalmologue", "dentiste",
]

# ════════════════════════════════════════════════════════════════
# CATÉGORIE 2 — Épidémies et alertes sanitaires récentes
# Déclenche Tavily : info qui change chaque semaine
# ════════════════════════════════════════════════════════════════
MOTS_EPIDEMIES = [
    "épidémie", "epidemie", "pandémie", "flambée", "outbreak",
    "alerte sanitaire", "cas confirmés", "propagation",
    "contamination", "foyer", "cluster",
    "en ce moment", "actuellement", "cette semaine", "ce mois",
    "2025", "2026",
]

# ════════════════════════════════════════════════════════════════
# CATÉGORIE 3 — Prix et disponibilité de médicaments
# Déclenche Tavily : les prix changent, les stocks varient
# ════════════════════════════════════════════════════════════════
MOTS_PRIX_MEDICAMENTS = [
    "prix", "coût", "cout", "combien coûte", "combien ça coûte",
    "disponible en pharmacie", "en stock", "rupture de stock",
    "ordonnance obligatoire", "sans ordonnance",
    "price", "cost", "available",
]

# ════════════════════════════════════════════════════════════════
# CATÉGORIE 4 — Vaccins et campagnes de vaccination
# Déclenche Tavily : calendriers et campagnes changent
# ════════════════════════════════════════════════════════════════
MOTS_VACCINS = [
    "vaccin", "vaccination", "se faire vacciner", "rappel vaccinal",
    "campagne de vaccination", "centre de vaccination",
    "vaccine", "immunization",
]

# Toutes les catégories combinées
TOUS_MOTS_CLES = (
    MOTS_RESSOURCES_LOCALES +
    MOTS_EPIDEMIES +
    MOTS_PRIX_MEDICAMENTS +
    MOTS_VACCINS
)


def doit_chercher_web(message: str) -> bool:
    """
    Détermine si le message nécessite une recherche web Tavily.

    Règle : chercher UNIQUEMENT si le message demande
    des infos locales, récentes, ou sur les prix/vaccins.
    Pour tout le reste → l'IA répond depuis ses connaissances.

    Args:
        message: Le message de l'utilisateur

    Returns:
        bool: True si recherche web nécessaire, False sinon
    """
    # Messages trop courts — pas besoin de chercher
    if len(message.strip()) < 8:
        return False

    message_lower = message.lower()

    # Chercher web UNIQUEMENT si mot-clé spécifique détecté
    if any(mot in message_lower for mot in TOUS_MOTS_CLES):
        print(f"[TAVILY] Mot-clé détecté → recherche web activée")
        return True

    # Par défaut : répondre depuis les connaissances de l'IA
    # Pas de recherche web pour les questions médicales générales
    return False


def chercher_web(
    query: str,
    langue: str = "fr",
    max_resultats: int = 3,
) -> str:
    """
    Effectue une recherche web avec Tavily et retourne
    un résumé formaté des résultats.

    Args:
        query:          La requête de recherche
        langue:         Langue de la recherche ('fr' ou 'en')
        max_resultats:  Nombre maximum de résultats (défaut: 3)

    Returns:
        str: Résumé formaté des résultats, ou chaîne vide si échec
    """
    if not client_tavily:
        print("[TAVILY] Recherche impossible — client non initialisé.")
        return ""

    try:
        print(f"[TAVILY] Recherche : '{query}'")

        # Contextualiser la recherche pour le Cameroun / Afrique
        if langue == "fr":
            query_complete = f"{query} Cameroun Afrique centrale"
        else:
            query_complete = f"{query} Cameroon Central Africa"

        # Appel API Tavily
        resultats = client_tavily.search(
            query=query_complete,
            search_depth="basic",
            max_results=max_resultats,
            include_answer=True,
            include_raw_content=False,
        )

        if not resultats:
            return ""

        resume  = resultats.get("answer", "")
        sources = resultats.get("results", [])

        if not resume and not sources:
            return ""

        # Construction du texte de contexte
        if langue == "fr":
            contexte = "\n\n🔍 **Informations locales trouvées :**\n"
        else:
            contexte = "\n\n🔍 **Local information found:**\n"

        if resume:
            contexte += f"\n{resume}\n"

        if sources:
            if langue == "fr":
                contexte += "\n**Sources :**\n"
            else:
                contexte += "\n**Sources:**\n"

            for i, source in enumerate(sources[:max_resultats], 1):
                titre   = source.get("title",   "Sans titre")
                url     = source.get("url",     "")
                extrait = source.get("content", "")

                if len(extrait) > 200:
                    extrait = extrait[:200] + "..."

                contexte += f"{i}. **{titre}**\n"
                if extrait:
                    contexte += f"   {extrait}\n"
                if url:
                    contexte += f"   🔗 {url}\n"

        print(f"[TAVILY] {len(sources)} résultats trouvés.")
        return contexte

    except Exception as e:
        print(f"[TAVILY ERREUR] {e}")
        return ""


def chercher_ressources_locales(ville: str = "Cameroun") -> str:
    """
    Recherche spécialisée pour les ressources sanitaires locales.
    """
    if not client_tavily:
        return ""

    try:
        query = f"hôpitaux cliniques santé {ville} Cameroun contacts adresses"
        resultats = client_tavily.search(
            query=query,
            search_depth="basic",
            max_results=3,
            include_answer=True,
        )

        resume = resultats.get("answer", "")
        if resume:
            return f"\n\n🏥 **Ressources sanitaires à {ville} :**\n{resume}"
        return ""

    except Exception as e:
        print(f"[TAVILY RESSOURCES ERREUR] {e}")
        return ""