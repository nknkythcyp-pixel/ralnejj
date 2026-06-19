"""
base_connaissance.py — Base de connaissances RAG avec ChromaDB
Ralnejj Santé v3 · Version optimisée Cloud (Hugging Face Router API)
"""
import os
import requests
import numpy as np
from pathlib import Path
import chromadb
from chromadb.api.types import EmbeddingFunction
from dotenv import load_dotenv

load_dotenv(override=True)

# ── Configuration ────────────────────────────────────────────────
DOSSIER_DOCS    = Path(__file__).parent / "base_de_connaissances"
DOSSIER_CHROMA  = Path(__file__).parent / "chroma_db"
NOM_COLLECTION  = "ralnejj_sante"
TAILLE_CHUNK    = 400
CHEVAUCHEMENT   = 80
N_RESULTATS     = 3

HF_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


# ── Fonction d'embedding personnalisée via le nouveau routeur HF ─
# L'ancienne classe HuggingFaceEmbeddingFunction de chromadb utilise
# une URL dépréciée (api-inference.huggingface.co). On utilise donc
# directement le nouveau endpoint officiel : router.huggingface.co
class HFRouterEmbeddingFunction(EmbeddingFunction):
    def __init__(self, api_key: str, model_name: str = HF_MODEL):
        self.api_key = api_key
        self.model_name = model_name
        self.url = (
            f"https://router.huggingface.co/hf-inference/models/"
            f"{model_name}/pipeline/feature-extraction"
        )
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def __call__(self, input):
        # 'input' est la liste de textes à transformer en embeddings
        try:
            response = requests.post(
                self.url,
                headers=self.headers,
                json={"inputs": input, "options": {"wait_for_model": True}},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return [np.array(vec, dtype=np.float32) for vec in data]
        except Exception as e:
            print(f"[RAG] Erreur appel Hugging Face Router API : {e}")
            raise


# ── Initialisation de la fonction d'embedding ─────────────────────
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY")

if not HF_TOKEN:
    print("[RAG ⚠️] HUGGINGFACE_API_KEY manquante. Tentative avec embeddings locaux...")
    from chromadb.utils import embedding_functions
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )
else:
    print("[RAG] Mode API Hugging Face Router activé (Gain de RAM optimal).")
    embedding_fn = HFRouterEmbeddingFunction(api_key=HF_TOKEN, model_name=HF_MODEL)

client_chroma = chromadb.PersistentClient(path=str(DOSSIER_CHROMA))


def obtenir_collection():
    """Retourne la collection ChromaDB (la crée si elle n'existe pas)."""
    return client_chroma.get_or_create_collection(
        name=NOM_COLLECTION,
        embedding_function=embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )


# ── Découpage en chunks ──────────────────────────────────────────
def decouper_en_chunks(texte: str, source: str) -> list[dict]:
    chunks = []
    texte  = texte.strip()
    paragraphes = [p.strip() for p in texte.split("\n\n") if p.strip()]

    chunk_actuel = ""
    chunk_index  = 0

    for para in paragraphes:
        if len(chunk_actuel) + len(para) > TAILLE_CHUNK and chunk_actuel:
            chunks.append({
                "texte":  chunk_actuel.strip(),
                "source": source,
                "index":  chunk_index,
            })
            chunk_actuel = chunk_actuel[-CHEVAUCHEMENT:] + "\n\n" + para
            chunk_index += 1
        else:
            chunk_actuel += ("\n\n" if chunk_actuel else "") + para

    if chunk_actuel.strip():
        chunks.append({
            "texte":  chunk_actuel.strip(),
            "source": source,
            "index":  chunk_index,
        })

    return chunks


# ── Indexation des documents ─────────────────────────────────────
def indexer_documents(forcer: bool = False):
    collection = obtenir_collection()

    if not forcer and collection.count() > 0:
        print(f"[RAG] Collection déjà indexée — {collection.count()} chunks. (forcer=True pour réindexer)")
        return collection

    if forcer and collection.count() > 0:
        print(f"[RAG] Réindexation forcée — suppression des {collection.count()} chunks existants...")
        client_chroma.delete_collection(NOM_COLLECTION)
        collection = obtenir_collection()

    fichiers_md = list(DOSSIER_DOCS.glob("*.md"))
    if not fichiers_md:
        print(f"[RAG] ⚠️  Aucun fichier .md trouvé dans {DOSSIER_DOCS}")
        return collection

    print(f"[RAG] Indexation de {len(fichiers_md)} fichiers...")

    tous_ids       = []
    tous_textes    = []
    tous_metadatas = []

    for fichier in fichiers_md:
        try:
            texte  = fichier.read_text(encoding="utf-8")
            source = fichier.stem
            chunks = decouper_en_chunks(texte, source)

            for chunk in chunks:
                chunk_id = f"{source}__{chunk['index']}"
                tous_ids.append(chunk_id)
                tous_textes.append(chunk["texte"])
                tous_metadatas.append({"source": source, "index": chunk["index"]})

            print(f"  ✓ {fichier.name} → {len(chunks)} chunks")

        except Exception as e:
            print(f"  ✗ {fichier.name} → ERREUR : {e}")

    if tous_ids:
        try:
            # Batch plus petit pour l'API HF (évite timeout / payload trop gros)
            batch_size = 32
            for i in range(0, len(tous_ids), batch_size):
                collection.add(
                    ids=tous_ids[i:i+batch_size],
                    documents=tous_textes[i:i+batch_size],
                    metadatas=tous_metadatas[i:i+batch_size],
                )
                print(f"  → batch {i//batch_size + 1}/{(len(tous_ids)-1)//batch_size + 1} indexé")

            print(f"[RAG] ✅ Indexation terminée — {len(tous_ids)} chunks au total")
        except Exception as e:
            print(f"[RAG ERREUR INDEXATION] {e}")

    return collection


# ── Recherche RAG ────────────────────────────────────────────────
def chercher_base_connaissance(
    question: str,
    n_resultats: int = N_RESULTATS,
    seuil_pertinence: float = 0.5,
) -> str:
    try:
        collection = obtenir_collection()

        if collection.count() == 0:
            print("[RAG] Collection vide — indexation en cours...")
            indexer_documents()
            collection = obtenir_collection()

        if collection.count() == 0:
            print("[RAG] Indexation échouée — collection toujours vide.")
            return ""

        resultats = collection.query(
            query_texts=[question],
            n_results=min(n_resultats, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        documents = resultats.get("documents", [[]])[0]
        metadatas = resultats.get("metadatas", [[]])[0]
        distances = resultats.get("distances", [[]])[0]

        if not documents:
            return ""

        extraits_pertinents = []
        for doc, meta, dist in zip(documents, metadatas, distances):
            if dist <= seuil_pertinence:
                source = meta.get("source", "inconnu").replace("_", " ").title()
                extraits_pertinents.append(f"📄 **{source}**\n{doc}")
                print(f"[RAG] ✓ {meta['source']} (distance={dist:.3f})")
            else:
                print(f"[RAG] ✗ {meta['source']} ignoré (distance={dist:.3f} > seuil={seuil_pertinence})")

        if not extraits_pertinents:
            return ""

        contexte = "\n\n---\n\n".join(extraits_pertinents)
        print(f"[RAG] {len(extraits_pertinents)} extraits pertinents trouvés")
        return contexte

    except Exception as e:
        print(f"[RAG ERREUR] {e}")
        return ""


# ── Lancement au démarrage ───────────────────────────────────────
def initialiser_rag():
    """À appeler au démarrage du serveur."""
    print("[RAG] Initialisation de la base de connaissances...")
    collection = obtenir_collection()
    print(f"[RAG] Prêt — {collection.count()} chunks détectés dans la base.")
    return collection


if __name__ == "__main__":
    import sys
    forcer = "--forcer" in sys.argv or "-f" in sys.argv
    print("=" * 50)
    print("  Ralnejj — Indexation base de connaissances")
    print("=" * 50)
    indexer_documents(forcer=forcer)