# Normalisation des tags (math + Python) — progression

Remplace les colonnes `tags TEXT[]` sur `exercises` (math) et `python_exercises` par des tables de jonction N-N pointant vers les catalogues `tags` et `python_tags` existants. La colonne array est droppée. Le contrat API reste `tags: string[]` (résolu serveur).

Plan : `~/.claude/plans/shimmying-cooking-hamster.md`.

## Phase 1 — Migration DB ✅

**Fichier créé :** `supabase/migrations/20260509094828_normalize_exercise_tags.sql`.

Contenu (en transaction atomique) :

1. Création de `exercise_tags` et `python_exercise_tags` (FK CASCADE sur l'exo, RESTRICT sur le tag, PK composite).
2. Upsert des tags absents du catalogue (`INSERT ... ON CONFLICT (name) DO NOTHING`).
3. Population des jonctions via `CROSS JOIN LATERAL unnest(tags) JOIN <catalogue> ON name`.
4. DROP des indexes GIN et des colonnes `tags TEXT[]`.
5. RLS : SELECT ouvert (tags non-sensibles), INSERT/UPDATE/DELETE restreint à l'auteur de l'exo via EXISTS.

**Vérification après `pnpm db:migrate`** :

- `SELECT COUNT(*) FROM python_exercise_tags` doit donner ≥ N (au moins les tags des 5 exos seedés × 2-3 tags chacun).
- `\d exercises` et `\d python_exercises` ne doivent plus lister la colonne `tags`.

## Phase 2 — Helpers + APIs ⏳

## Phase 3 — Tests ⏳

## Phase 4 — Quality checks ⏳
