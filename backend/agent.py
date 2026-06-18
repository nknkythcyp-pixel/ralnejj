"""
agent.py — Moteur IA Ralnejj Santé v3
LangGraph · Prompt riche · Contexte africain · Tavily · RAG ChromaDB · Vision
"""

import os
from typing import TypedDict, List, Dict, Optional
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv
load_dotenv(override=True)

from config import GROQ_API_KEY, GROQ_MODEL
from database import charger_historique, sauvegarder_message
from recherche_web import chercher_web, doit_chercher_web
from base_connaissance import chercher_base_connaissance, initialiser_rag

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_VISION_MODEL

class EtatAgent(TypedDict):
    message_utilisateur : str
    conversation_id     : int
    utilisateur_id      : int
    langue              : str
    urgence             : bool
    profil_sante        : dict
    piece_jointe_texte  : str
    piece_jointe_nom    : str
    piece_jointe_image  : dict
    historique          : List[Dict]
    messages_llm        : list
    contexte_web        : str
    contexte_rag        : str
    reponse_brute       : str
    reponse_finale      : str


llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model=GROQ_MODEL,
    temperature=0.7,
    max_tokens=1500,
    streaming=True,
)

llm_vision = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model=GROQ_VISION_MODEL,
    temperature=0.7,
    max_tokens=1500,
    streaming=True,
)

initialiser_rag()


def _detecter_contexte_geo(message: str) -> str:
    msg = message.lower()
    mots_cameroun = [
        "cameroun", "cameroon", "yaoundé", "yaounde", "douala",
        "bafoussam", "garoua", "maroua", "ngaoundéré", "ngaoundere",
        "bertoua", "ebolowa", "kribi", "limbe", "buea", "bamenda",
        "camerounais", "camerounaise",
    ]
    mots_afrique = [
        "afrique", "africa", "africain", "africaine", "continent",
        "subsaharienne", "afrique centrale", "congo", "gabon", "tchad",
        "rca", "centrafrique", "nigeria", "ghana", "sénégal",
        "côte d'ivoire", "mali", "burkina", "niger", "guinée", "togo", "bénin",
    ]
    if any(mot in msg for mot in mots_cameroun):
        return "cameroun"
    elif any(mot in msg for mot in mots_afrique):
        return "afrique"
    return "neutre"


def noeud_analyser(etat: EtatAgent) -> dict:
    msg = etat["message_utilisateur"].lower()
    mots_urgence = [
        "urgence", "urgent", "mourir", "mort", "saignement", "sang",
        "inconscient", "ne respire plus", "convulsion", "overdose",
        "empoisonnement", "brûlure grave", "fracture ouverte",
        "emergency", "dying", "bleeding", "unconscious", "je vais mourir",
        "aide moi", "au secours", "help me", "accident grave",
        "crise cardiaque", "avc", "stroke", "heart attack",
    ]
    urgence = any(mot in msg for mot in mots_urgence)
    print(f"[ANALYSER] urgence={urgence}")
    return {"urgence": urgence}


def noeud_contexte(etat: EtatAgent) -> dict:
    historique = charger_historique(etat["conversation_id"], limite=10)
    print(f"[CONTEXTE] {len(historique)} messages chargés")
    return {"historique": historique}


def noeud_recherche_web(etat: EtatAgent) -> dict:
    message = etat["message_utilisateur"]
    langue  = etat["langue"]
    if not doit_chercher_web(message):
        print("[RECHERCHE WEB] Pas nécessaire.")
        return {"contexte_web": ""}
    print("[RECHERCHE WEB] Recherche Tavily en cours...")
    contexte_web = chercher_web(query=message, langue=langue, max_resultats=3)
    print(f"[RECHERCHE WEB] {len(contexte_web)} caractères trouvés." if contexte_web else "[RECHERCHE WEB] Aucun résultat.")
    return {"contexte_web": contexte_web}


def noeud_rag(etat: EtatAgent) -> dict:
    message = etat["message_utilisateur"]
    if len(message.strip()) < 10:
        return {"contexte_rag": ""}
    print("[RAG] Recherche dans la base de connaissances...")
    contexte_rag = chercher_base_connaissance(message, n_resultats=3)
    print(f"[RAG] {len(contexte_rag)} caractères trouvés." if contexte_rag else "[RAG] Aucun extrait pertinent.")
    return {"contexte_rag": contexte_rag}


def _construire_prompt(langue, profil_sante, contexte_web, contexte_rag="", message=""):
    contexte_geo = _detecter_contexte_geo(message)
    print(f"[PROMPT] Contexte géo : {contexte_geo}")

    if contexte_geo == "cameroun":
        if langue == "fr":
            intro      = "Tu es Ralnejj Santé, un assistant médical intelligent et bienveillant, spécialisé pour l'Afrique centrale et particulièrement le Cameroun."
            geo_detail = "- Utilise des références spécifiques au Cameroun (hôpitaux, villes, prix locaux, épidémies en cours)"
        else:
            intro      = "You are Ralnejj Santé, an intelligent and caring medical assistant specialized for Central Africa, particularly Cameroon."
            geo_detail = "- Use specific Cameroon references (hospitals, cities, local prices, current epidemics)"
    elif contexte_geo == "afrique":
        if langue == "fr":
            intro      = "Tu es Ralnejj Santé, un assistant médical intelligent et bienveillant, spécialisé pour l'Afrique."
            geo_detail = "- Réponds de façon adaptée au contexte africain mentionné, sans te limiter au Cameroun"
        else:
            intro      = "You are Ralnejj Santé, an intelligent and caring medical assistant specialized for Africa."
            geo_detail = "- Respond adapted to the African context mentioned by the user"
    else:
        if langue == "fr":
            intro      = "Tu es Ralnejj Santé, un assistant médical intelligent et bienveillant, spécialisé pour l'Afrique centrale."
            geo_detail = "- Réponds de façon générale et adaptée au contexte de l'utilisateur\n- Si l'utilisateur mentionne le Cameroun, adapte ta réponse au contexte camerounais"
        else:
            intro      = "You are Ralnejj Santé, an intelligent and caring medical assistant specialized for Central Africa."
            geo_detail = "- Respond in a general way adapted to the user's context\n- If Cameroon is mentioned, adapt to the Cameroonian context"

    profil_texte = ""
    if profil_sante:
        infos = []
        if profil_sante.get("age"):                 infos.append(f"âge: {profil_sante['age']} ans")
        if profil_sante.get("poids"):               infos.append(f"poids: {profil_sante['poids']} kg")
        if profil_sante.get("groupe_sanguin"):      infos.append(f"groupe sanguin: {profil_sante['groupe_sanguin']}")
        if profil_sante.get("maladies_chroniques"): infos.append(f"maladies chroniques: {profil_sante['maladies_chroniques']}")
        if profil_sante.get("allergies"):           infos.append(f"allergies: {profil_sante['allergies']}")
        if infos:
            profil_texte = f"\n\nPROFIL DE L'UTILISATEUR : {', '.join(infos)}. Tiens compte de ces informations dans ta réponse."

    contexte_rag_texte = ""
    if contexte_rag:
        if langue == "fr":
            contexte_rag_texte = f"\n\nBASE DE CONNAISSANCES RALNEJJ (extraits de documents médicaux africains) :\n{contexte_rag}\n\nUtilise ces informations en priorité pour répondre à la question."
        else:
            contexte_rag_texte = f"\n\nRALNEJJ KNOWLEDGE BASE (extracts from African medical documents):\n{contexte_rag}\n\nUse this information as a priority to answer the question."

    contexte_web_texte = ""
    if contexte_web:
        if langue == "fr":
            contexte_web_texte = f"\n\nINFORMATIONS LOCALES RÉCENTES (trouvées via recherche web) :\n{contexte_web}"
        else:
            contexte_web_texte = f"\n\nRECENT LOCAL INFORMATION (found via web search):\n{contexte_web}"

    if langue == "fr":
        systeme = f"""{intro}

IDENTITÉ ET DÉVELOPPEURS :
- Tu as été développé par des étudiants en Licence Professionnelle à l'Institut Universitaire de la Côte (IUC) au Cameroun
- Tes créateurs sont : MBIANDJA MBIADOU RALPH KEVIN et NKEM EBONG ESSOUA JOEL JORDAN
- Tu es basé sur un modèle de langage (LLM) Groq, intégré avec LangGraph et LangChain
- Si on te demande comment tu as été développé ou par qui, réponds avec ces informations précisément

CONTEXTE GÉOGRAPHIQUE :
{geo_detail}

PERSONNALITÉ ET TON :
- Tu es chaleureux, empathique et professionnel comme un médecin de famille
- Tu t'exprimes clairement et simplement, accessible à tous les niveaux d'éducation
- Tu poses des questions de suivi pertinentes quand une situation est ambiguë
- Tu ne paniques jamais mais tu prends toujours les symptômes au sérieux

DOMAINES D'EXPERTISE :
- Maladies tropicales : paludisme, typhoïde, choléra, dengue, fièvre jaune
- Santé maternelle et infantile
- Nutrition avec les aliments locaux d'Afrique centrale
- Maladies chroniques : diabète, hypertension, drépanocytose
- Médecine préventive et hygiène
- Médecine traditionnelle et plantes médicinales africaines
- Premiers secours et gestion des urgences
- Analyse d'images médicales (photos de lésions, résultats d'analyses, radiographies)

FORMAT DE RÉPONSE :
- Utilise des emojis avec modération, uniquement pour les éléments clés (1 à 3 emojis maximum par réponse) : 🌡️ fièvre, 💊 médicaments, ⚠️ avertissement important, ✅ conseil clé, 🏥 hôpital
- Ne mets jamais d'emoji après chaque mot ou chaque bullet point
- Structure tes réponses avec des titres clairs quand nécessaire
- Utilise des listes à puces pour les symptômes, traitements, conseils
- Mets en gras les informations importantes
- Termine toujours par une question de suivi ou une recommandation concrète
- Pour les questions médicales, rappelle toujours de consulter un professionnel

LIMITES IMPORTANTES :
- Tu ne poses jamais de diagnostic définitif
- Tu recommandes toujours une consultation médicale pour tout symptôme sérieux
- Tu es honnête quand tu ne sais pas quelque chose
- Tu ne prescris jamais de médicaments avec des doses précises
- Tu ne mentionnes JAMAIS les balises internes dans tes réponses
- Si aucun document n'est joint, tu ne fais aucune référence à des documents{profil_texte}{contexte_rag_texte}{contexte_web_texte}"""

    else:
        systeme = f"""{intro}

IDENTITY AND DEVELOPERS:
- You were developed by students in a Professional Bachelor's degree at the Institut Universitaire de la Côte (IUC) in Cameroon
- Your creators are: MBIANDJA MBIADOU RALPH KEVIN and NKEM EBONG ESSOUA JOEL JORDAN
- You are based on a Groq language model (LLM), integrated with LangGraph and LangChain

GEOGRAPHIC CONTEXT:
{geo_detail}

PERSONALITY AND TONE:
- Warm, empathetic and professional like a family doctor
- Clear and simple language, accessible to all education levels
- Ask relevant follow-up questions when a situation is ambiguous
- Never panic but always take symptoms seriously

AREAS OF EXPERTISE:
- Tropical diseases: malaria, typhoid, cholera, dengue, yellow fever
- Maternal and child health
- Nutrition with local Central African foods
- Chronic diseases: diabetes, hypertension, sickle cell disease
- Preventive medicine and hygiene
- Traditional medicine and African medicinal plants
- First aid and emergency management
- Medical image analysis (wound photos, lab results, X-rays)

RESPONSE FORMAT:
- Use emojis sparingly, only for key elements (maximum 1 to 3 emojis per response) : 🌡️ fever, 💊 medication, ⚠️ important warning, ✅ key advice, 🏥 hospital
- Never add an emoji after every word or every bullet point
- Structure responses with clear headings when necessary
- Use bullet points for symptoms, treatments, advice
- Bold important information
- Always end with a follow-up question or concrete recommendation
- For medical questions, always remind to consult a professional{profil_texte}{contexte_rag_texte}{contexte_web_texte}"""

    return systeme


def _construire_message_utilisateur(
    message: str,
    piece_jointe_texte: str = "",
    piece_jointe_nom: str = "",
    piece_jointe_image: dict = None,
):
    if piece_jointe_image and piece_jointe_image.get("base64"):
        texte_question = message or "Analyse cette image médicale et donne-moi ton avis."
        msg = HumanMessage(content=[
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{piece_jointe_image['media_type']};base64,{piece_jointe_image['base64']}"
                }
            },
            {"type": "text", "text": texte_question}
        ])
        return msg, llm_vision

    if piece_jointe_texte:
        contenu = (
            f"{message}\n\n"
            f"--- Document joint : {piece_jointe_nom or 'document'} ---\n"
            f"{piece_jointe_texte}\n"
            f"--- Fin du document ---"
        )
        return HumanMessage(content=contenu), llm

    return HumanMessage(content=message), llm


def noeud_generer(etat: EtatAgent) -> dict:
    langue             = etat["langue"]
    profil             = etat.get("profil_sante", {})
    contexte_web       = etat.get("contexte_web", "")
    contexte_rag       = etat.get("contexte_rag", "")
    message            = etat["message_utilisateur"]
    piece_jointe_texte = etat.get("piece_jointe_texte", "")
    piece_jointe_nom   = etat.get("piece_jointe_nom", "")
    piece_jointe_image = etat.get("piece_jointe_image") or {}

    systeme  = _construire_prompt(langue, profil, contexte_web, contexte_rag, message)
    messages = [SystemMessage(content=systeme)]

    for msg in etat.get("historique", []):
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["contenu"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["contenu"]))

    msg_utilisateur, llm_a_utiliser = _construire_message_utilisateur(
        message, piece_jointe_texte, piece_jointe_nom, piece_jointe_image
    )
    messages.append(msg_utilisateur)

    type_fichier = "image" if piece_jointe_image else ("texte" if piece_jointe_texte else "aucun")
    print(f"[GENERER] Appel Groq — {len(messages)} messages | web={'oui' if contexte_web else 'non'} | rag={'oui' if contexte_rag else 'non'} | fichier={type_fichier}")

    try:
        reponse       = llm_a_utiliser.invoke(messages)
        reponse_brute = reponse.content
    except Exception as e:
        print(f"[GENERER ERREUR] {e}")
        reponse_brute = (
            "Je suis désolé, une erreur est survenue. Veuillez réessayer."
            if langue == "fr" else
            "Sorry, an error occurred. Please try again."
        )

    return {"messages_llm": messages, "reponse_brute": reponse_brute}


def noeud_formater(etat: EtatAgent) -> dict:
    reponse = etat["reponse_brute"]
    urgence = etat["urgence"]
    conv_id = etat["conversation_id"]
    langue  = etat["langue"]

    if urgence:
        if langue == "fr":
            bandeau = (
                "🚨 **URGENCE MÉDICALE DÉTECTÉE**\n"
                "**Appelez immédiatement :**\n"
                "- SAMU Cameroun : **15**\n"
                "- Urgences : **17**\n"
                "- Croix Rouge : **+237 222 22 25 25**\n\n"
                "---\n\n"
            )
        else:
            bandeau = (
                "🚨 **MEDICAL EMERGENCY DETECTED**\n"
                "**Call immediately:**\n"
                "- SAMU Cameroon: **15**\n"
                "- Emergency: **17**\n"
                "- Red Cross: **+237 222 22 25 25**\n\n"
                "---\n\n"
            )
        reponse = bandeau + reponse

    message_a_sauvegarder = etat["message_utilisateur"]
    if etat.get("piece_jointe_nom"):
        message_a_sauvegarder += f"\n\n📎 **Document joint :** {etat['piece_jointe_nom']}"

    sauvegarder_message(conv_id, "user",      message_a_sauvegarder)
    sauvegarder_message(conv_id, "assistant", reponse)

    print(f"[FORMATER] Réponse sauvegardée — {len(reponse)} caractères")
    return {"reponse_finale": reponse}


def construire_graphe():
    graphe = StateGraph(EtatAgent)
    graphe.add_node("analyser",      noeud_analyser)
    graphe.add_node("contexte",      noeud_contexte)
    graphe.add_node("recherche_web", noeud_recherche_web)
    graphe.add_node("rag",           noeud_rag)
    graphe.add_node("generer",       noeud_generer)
    graphe.add_node("formater",      noeud_formater)
    graphe.set_entry_point("analyser")
    graphe.add_edge("analyser",      "contexte")
    graphe.add_edge("contexte",      "recherche_web")
    graphe.add_edge("recherche_web", "rag")
    graphe.add_edge("rag",           "generer")
    graphe.add_edge("generer",       "formater")
    graphe.add_edge("formater",      END)
    return graphe.compile()


graphe_sante = construire_graphe()
print("[AGENT v3] Graphe LangGraph compilé — Tavily + RAG + Vision activés.")


def executer_agent(
    message: str,
    conversation_id: int,
    utilisateur_id: int = 1,
    langue: str = "fr",
    profil_sante: dict = None,
    piece_jointe_texte: str = None,
    piece_jointe_nom: str = None,
    piece_jointe_image: dict = None,
) -> dict:

    etat_initial: EtatAgent = {
        "message_utilisateur": message,
        "conversation_id":     conversation_id,
        "utilisateur_id":      utilisateur_id,
        "langue":              langue,
        "urgence":             False,
        "profil_sante":        profil_sante or {},
        "piece_jointe_texte":  piece_jointe_texte or "",
        "piece_jointe_nom":    piece_jointe_nom   or "",
        "piece_jointe_image":  piece_jointe_image or {},
        "historique":          [],
        "messages_llm":        [],
        "contexte_web":        "",
        "contexte_rag":        "",
        "reponse_brute":       "",
        "reponse_finale":      "",
    }

    resultat = graphe_sante.invoke(etat_initial)
    return {
        "reponse":         resultat["reponse_finale"],
        "urgence":         resultat["urgence"],
        "conversation_id": conversation_id,
    }


def executer_agent_stream(
    message: str,
    conversation_id: int,
    utilisateur_id: int = 1,
    langue: str = "fr",
    profil_sante: dict = None,
    piece_jointe_texte: str = None,
    piece_jointe_nom: str = None,
    piece_jointe_image: dict = None,
):
    profil_sante       = profil_sante or {}
    piece_jointe_image = piece_jointe_image or {}

    etat = {
        "message_utilisateur": message,
        "conversation_id":     conversation_id,
        "utilisateur_id":      utilisateur_id,
        "langue":              langue,
        "urgence":             False,
        "profil_sante":        profil_sante,
        "piece_jointe_texte":  piece_jointe_texte or "",
        "piece_jointe_nom":    piece_jointe_nom   or "",
        "piece_jointe_image":  piece_jointe_image,
        "historique":          [],
        "messages_llm":        [],
        "contexte_web":        "",
        "contexte_rag":        "",
        "reponse_brute":       "",
        "reponse_finale":      "",
    }

    etat.update(noeud_analyser(etat))
    etat.update(noeud_contexte(etat))
    etat.update(noeud_recherche_web(etat))
    etat.update(noeud_rag(etat))

    urgence      = etat["urgence"]
    contexte_web = etat.get("contexte_web", "")
    contexte_rag = etat.get("contexte_rag", "")

    systeme      = _construire_prompt(langue, profil_sante, contexte_web, contexte_rag, message)
    messages_llm = [SystemMessage(content=systeme)]

    for msg in etat.get("historique", []):
        if msg["role"] == "user":
            messages_llm.append(HumanMessage(content=msg["contenu"]))
        elif msg["role"] == "assistant":
            messages_llm.append(AIMessage(content=msg["contenu"]))

    msg_utilisateur, llm_a_utiliser = _construire_message_utilisateur(
        message,
        piece_jointe_texte or "",
        piece_jointe_nom   or "",
        piece_jointe_image,
    )
    messages_llm.append(msg_utilisateur)

    bandeau = ""
    if urgence:
        if langue == "fr":
            bandeau = (
                "🚨 **URGENCE MÉDICALE DÉTECTÉE**\n"
                "**Appelez immédiatement :**\n"
                "- SAMU Cameroun : **15**\n"
                "- Urgences : **17**\n"
                "- Croix Rouge : **+237 222 22 25 25**\n\n---\n\n"
            )
        else:
            bandeau = (
                "🚨 **MEDICAL EMERGENCY DETECTED**\n"
                "**Call immediately:**\n"
                "- SAMU Cameroon: **15**\n"
                "- Emergency: **17**\n\n---\n\n"
            )
        yield {"token": bandeau, "urgence": urgence, "done": False}

    message_a_sauvegarder = message
    if piece_jointe_nom:
        message_a_sauvegarder += f"\n\n📎 **Document joint :** {piece_jointe_nom}"
    sauvegarder_message(conversation_id, "user", message_a_sauvegarder)

    reponse_complete = bandeau
    try:
        for chunk in llm_a_utiliser.stream(messages_llm):
            token = chunk.content
            if token:
                reponse_complete += token
                yield {"token": token, "urgence": urgence, "done": False}
    except Exception as e:
        print(f"[STREAM ERREUR] {e}")
        yield {"token": f"\n\n[Erreur : {str(e)}]", "urgence": False, "done": True}
        return

    sauvegarder_message(conversation_id, "assistant", reponse_complete)
    yield {"token": "", "urgence": urgence, "done": True}