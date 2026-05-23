# Les presques évaluations — Progress

**Started**: 2026-05-24
**Goal**: Public page listing parody assessment PDFs uploaded by teachers. Visitors can preview (iframe) and download.

## Architecture

```
Supabase Storage bucket: parody-evaluations (public)
  └─ parody-evaluations/{timestamp}-{random}.pdf

Table: public.parody_evaluations
  ├─ Metadata: title, description, file_name, mime_type, file_size
  ├─ Categorization: grade_levels text[], tags text[]
  ├─ Audit: created_by, created_at, updated_at
  └─ RLS: SELECT public, INSERT teachers, UPDATE/DELETE owner only

Routes:
  ├─ (public)/presques-evaluations          — listing + filters + preview
  └─ (protected)/dashboard/teacher/presques-evaluations  — upload/edit/delete (owner)
```

## Decisions

- **Storage**: Supabase Storage (already in stack, free tier 1 GB sufficient)
- **Bucket public**: simpler than signed URLs, content is meant to be public
- **PDF only**: no images/docs (constraint at DB level via CHECK mime_type)
- **Max 10 MB**: matches existing chapter-documents pattern
- **Grade levels REQUIRED**: at least 1 (CHECK constraint at DB level)
- **Tags optional**: shared `tags` table for autocomplete
- **Edit/Delete owner-only**: teacher can only manage their own uploads
- **Filter intersection**: page publique applique ET logique entre filtres niveau et thème

## Reused components

- `GradeBadgeSelector` — already exists at `src/lib/components/GradeBadgeSelector.svelte`
- `TagBadgeSelector` — already exists at `src/lib/components/TagBadgeSelector.svelte`
- Pattern from `chapter-documents`: similar upload/delete flow

## Phases

| #   | Phase                               | Status  |
| --- | ----------------------------------- | ------- |
| 1   | Migration DB (table + RLS + bucket) | ✅ Done |
| 2   | Push migration + bucket Storage     | ✅ Done |
| 3   | Form actions teacher                | ✅ Done |
| 4   | Page teacher UI                     | ✅ Done |
| 5   | Page publique                       | ⏳ Next |
| 6   | Code review                         | pending |
| 7   | Quality checks                      | pending |
| 8   | Commit final                        | pending |

## Files created/modified

### Phase 1

- `supabase/migrations/20260524022316_create_parody_evaluations.sql` (new)
- `docs/wip/presques-evaluations-progress.md` (this file)

### Phase 2

- Migration pushed via `pnpm db:migrate` to remote DB
- `src/lib/types/database.ts` regenerated via `pnpm db:types`
- `src/lib/types/database-helpers.ts` — added `ParodyEvaluation` type alias

### Phase 3

- `src/lib/server/validation/parody-evaluations.ts` (new) — Zod schemas
- `src/routes/(protected)/dashboard/teacher/presques-evaluations/+page.server.ts` (new) — load + upload/update/delete actions
- Code-reviewer pass applied: added warning logs on tag upsert failures

### Phase 4

- `src/routes/(protected)/dashboard/teacher/presques-evaluations/+page.svelte` (new) — grid of cards, Upload/Edit/Delete dialogs, GradeBadgeSelector + TagBadgeSelector
- svelte-autofixer: clean (no issues)
- code-reviewer: no blocking issues; one project-wide a11y note (label `aria-labelledby` on shared selectors) left out of scope.
