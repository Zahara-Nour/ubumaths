# Tuteur Pedagogique avec RAG

Systeme de tutorat intelligent integrant le personnage Pere Ubu avec recherche RAG hybride.

## Vue d'ensemble

Le tuteur pedagogique aide les eleves a comprendre les mathematiques sans leur donner directement les reponses. Il utilise:

- **Personnalite Pere Ubu**: Ton humoristique et encourageant
- **15 methodes d'aide**: De l'indice subtil a l'explication detaillee
- **RAG hybride**: Contexte enrichi depuis les documents pedagogiques
- **Anti-triche**: Detection des demandes de reponses directes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Chat API                              │
│                   /api/chat (+server.ts)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Tutor Config │ │ RAG      │ │ Rate Limiter │
│ & Prompts    │ │ Search   │ │ & Anti-cheat │
└──────────────┘ └────┬─────┘ └──────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐ ┌──────────┐ ┌──────────┐
    │ Vector  │ │ FTS      │ │ Document │
    │ Search  │ │ tsvector │ │ Chunks   │
    └─────────┘ └──────────┘ └──────────┘
```

## Configuration

### Variables d'environnement

```env
# HuggingFace API (embeddings)
HF_API_KEY=hf_xxx

# Activer le RAG (optionnel, defaut: true si HF_API_KEY present)
ENABLE_RAG=true
```

### Configuration par classe

Les enseignants peuvent configurer le tuteur par classe:

- Activer/desactiver le tuteur
- Definir les limites de messages
- Choisir les methodes d'aide autorisees

## Methodes d'aide

Le tuteur dispose de 15 methodes progressives:

| Niveau | Methode                 | Description                     |
| ------ | ----------------------- | ------------------------------- |
| 1      | `subtle_hint`           | Indice subtil sans reveler      |
| 2      | `guiding_question`      | Question orientant la reflexion |
| 3      | `concept_reminder`      | Rappel du concept cle           |
| 4      | `similar_example`       | Exemple similaire resolu        |
| 5      | `step_breakdown`        | Decomposition en etapes         |
| 6      | `visual_aid`            | Schema ou representation        |
| 7      | `common_mistake`        | Erreur frequente a eviter       |
| 8      | `prerequisite_check`    | Verification des prerequis      |
| 9      | `real_world_connection` | Lien avec le quotidien          |
| 10     | `partial_solution`      | Debut de solution               |
| 11     | `formula_reminder`      | Rappel de formule               |
| 12     | `strategy_suggestion`   | Strategie de resolution         |
| 13     | `worked_example`        | Exemple travaille complet       |
| 14     | `detailed_explanation`  | Explication detaillee           |
| 15     | `full_walkthrough`      | Guide pas a pas complet         |

## RAG Hybride

### Recherche vectorielle

- Modele: `multilingual-e5-large` (1024 dimensions)
- Index: HNSW pour similarite cosinus
- Prefixes E5: `query:` et `passage:`

### Recherche full-text

- PostgreSQL tsvector avec configuration francaise
- Index GIN pour recherche rapide
- Stemming et stop words francais

### Fusion RRF

Les resultats sont combines avec Reciprocal Rank Fusion:

```
score = Σ (1 / (k + rank_i))
```

Avec `k=60` pour equilibrer les sources.

## Gestion des documents

### Upload de documents

Acces: `/dashboard/teacher/documents`

Formats supportes:

- PDF (texte extractible)
- Markdown (.md)
- Texte brut (.txt)

Limite: 10 MB par fichier

### Metadata

Chaque document peut avoir:

- Titre et description
- Niveaux scolaires (CP a Terminale)
- Themes (algebre, geometrie, etc.)
- Statut actif/inactif

## Rate Limiting

Limites par defaut:

- 15 messages par exercice
- 30 messages par heure
- 100 messages par jour

## Detection anti-triche

Le systeme detecte et refuse poliment:

- Demandes directes de reponses
- Tentatives de contournement
- Requetes hors contexte

## API

### POST /api/chat

Mode tuteur active avec `mode: 'tutor'`:

```typescript
{
  message: string;
  mode: 'tutor';
  context?: {
    questionId?: string;
    exerciseId?: string;
    questionText?: string;
    studentAnswer?: string;
    correctAnswer?: string;
  };
}
```

### GET /api/documents

Liste les documents RAG:

```typescript
{
	documents: Array<{
		id: string;
		title: string;
		sourceType: string;
		gradeLevels: string[];
		topics: string[];
		enabledForRag: boolean;
		chunkCount: number;
		createdAt: string;
	}>;
}
```

### POST /api/documents/upload

Upload un nouveau document:

```typescript
// FormData
{
  file: File;
  metadata: {
    title: string;
    description?: string;
    gradeLevels?: string[];
    topics?: string[];
    enabledForRag?: boolean;
  };
}
```

## Fichiers cles

### Configuration

- `src/lib/config/tutor-help-methods.ts` - Methodes d'aide
- `src/lib/config/tutor-grade-adaptations.ts` - Adaptations par niveau
- `src/lib/config/tutor-prompts.ts` - Prompts Pere Ubu

### Services RAG

- `src/lib/server/rag/embeddings.ts` - Service HuggingFace
- `src/lib/server/rag/chunker.ts` - Chunking de texte
- `src/lib/server/rag/search.ts` - Recherche hybride
- `src/lib/server/rag/processor.ts` - Indexation documents

### Documents

- `src/lib/server/documents/pdf-extractor.ts` - Extraction PDF
- `src/lib/server/validation/documents.ts` - Schemas Zod

### UI

- `src/lib/components/documents/` - Composants gestion docs
- `src/routes/(protected)/dashboard/teacher/documents/` - Page prof

## Migrations requises

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tables principales
- rag_documents
- rag_chunks (avec vector(1024) et tsvector)
- tutor_conversations
- tutor_messages
- tutor_class_config
```

## Utilisation

### Pour les eleves

1. Ouvrir le chatbot sur une question
2. Poser des questions sur l'exercice
3. Le tuteur guide sans donner la reponse

### Pour les enseignants

1. Aller dans Dashboard > Documents RAG
2. Telecharger des documents pedagogiques
3. Configurer les niveaux et themes
4. Les documents enrichissent automatiquement les reponses
