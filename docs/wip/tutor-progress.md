# Tuteur Pedagogique - Progression

## Etat Actuel

- Phase en cours : 2 COMPLETE
- Derniere etape completee : 2.6 (RAG Integration)
- Date derniere MAJ : 2025-11-26 23:15

## Decisions Prises

- Modele Opus pour prompts pedagogiques uniquement
- Sonnet pour tout le reste du developpement
- 15 methodes d'aide avec selection hybride (rules-based)
- Rate limiting: 15/exercice, 30/heure, 100/jour
- Anti-triche: detection demandes directes + refus poli
- RAG hybride: tsvector + HF embeddings (multilingual-e5-large, 1024 dimensions)
- HNSW index pour recherche vectorielle rapide
- RRF (Reciprocal Rank Fusion) pour combiner scores vector + FTS

## Phase 1 - COMPLETE

### Configuration (Phase 1.1)

- `src/lib/config/tutor-help-methods.ts` - 15 methodes d'aide avec selection rules
- `src/lib/config/tutor-grade-adaptations.ts` - Adaptation CP-Terminale
- `src/lib/config/tutor-prompts.ts` - Prompts pedagogiques Pere Ubu

### Logique Server (Phases 1.2-1.4)

- `src/lib/server/tutor/help-escalation.ts` - Escalade adaptative (effort scoring)
- `src/lib/server/tutor/cheat-detector.ts` - Detection anti-triche
- `src/lib/server/tutor/tutor-rate-limiter.ts` - Rate limiting tuteur

### Database (Phases 1.5-1.6)

- `supabase/migrations/20251126100000_add_tutor_config.sql` - Config classes
- `supabase/migrations/20251126100001_create_tutor_tables.sql` - Tables conversations/messages

### API & UI (Phases 1.7-1.9)

- `src/routes/api/chat/+server.ts` - Mode tuteur complet
- `src/routes/api/tutor/stats/+server.ts` - API stats
- `src/lib/components/tutor/` - Composants UI tuteur
- `src/routes/(protected)/tuteur/` - Page tuteur dediee
- `src/routes/(protected)/dashboard/tutor-stats/` - Dashboard prof

## Phase 2 - COMPLETE

### Migrations pgvector (Phase 2.1-2.2)

- `supabase/migrations/20251126200000_enable_pgvector.sql` - Extension pgvector
- `supabase/migrations/20251126200001_create_rag_tables.sql` - Tables RAG avec:
  - `rag_documents` - Documents sources avec metadata
  - `rag_chunks` - Chunks avec embeddings vector(1024) + tsvector
  - Index HNSW pour vector similarity (cosine)
  - Index GIN pour full-text search
  - Fonction `rag_hybrid_search()` avec RRF
  - RLS policies pour students/teachers/admins

### Service Embeddings (Phase 2.3)

- `src/lib/server/rag/embeddings.ts` - HuggingFace API service
  - Model: multilingual-e5-large (1024D)
  - Prefixes: "query:" et "passage:" per E5 spec
  - Batch processing avec retries
  - Rate limit handling

### Chunking (Phase 2.4)

- `src/lib/server/rag/chunker.ts` - Text chunking service
  - Sentence-aware chunking avec overlap
  - Markdown-aware chunking (preserve headers)
  - Exercise-specific chunking

### Hybrid Search (Phase 2.5)

- `src/lib/server/rag/search.ts` - Hybrid search service
  - Combine vector + FTS avec RRF
  - Fallback FTS-only si embeddings indisponibles
  - Filtrage par grade/topic
  - Format results for prompts

### Document Processing (Phase 2.6)

- `src/lib/server/rag/processor.ts` - Document indexation
  - Index/update/delete documents
  - Batch processing
  - Content deduplication (hash)

### Integration API (Phase 2.7)

- `src/routes/api/chat/+server.ts` - RAG context injection
- `src/lib/server/env.ts` - HF_API_KEY + ENABLE_RAG config

### Index module

- `src/lib/server/rag/index.ts` - Exports publics

## Prochaines Etapes (Phase 3)

1. Upload PDF documents
2. Google Drive sync
3. UI gestion documents
4. Security audit Phase 3

## Qualite

- Build: 0 errors
- Lint: 0 errors
- TypeScript: Valid
