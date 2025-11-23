# Worksheet Merge Progress

## Statut: Phase 3 - En cours

## Objectif

Fusionner les pages view (`/worksheets/[id]`) et edit (`/worksheets/[id]/edit`) en une seule page avec toggle de mode.

## Phases

- [x] Phase 1: Extraction utilitaires partagés ✓ (commit 82fad175)
- [x] Phase 2: Composants metadata + security audit ✓ (commit 206ababe)
  - MetadataCards.svelte créé
  - MetadataForm.svelte créé avec validation Zod
  - Security audit: fixes appliqués (parseInt, tags validation)
- [ ] Phase 3: Fusion page + security/perf audit
- [ ] Phase 4: Nettoyage
- [ ] Phase 5: Validation finale

## Fichiers à modifier

### Phase 1

- `src/lib/utils/worksheet-constants.ts` (créer)
- `src/routes/(protected)/dashboard/teacher/worksheets/[id]/+page.svelte` (imports)
- `src/routes/(protected)/dashboard/teacher/worksheets/[id]/edit/+page.svelte` (imports)

### Phase 2

- `src/lib/components/worksheets/MetadataCards.svelte` (créer)
- `src/lib/components/worksheets/MetadataForm.svelte` (créer)

### Phase 3

- `src/routes/(protected)/dashboard/teacher/worksheets/[id]/+page.svelte` (refactor majeur)

### Phase 4

- `src/routes/(protected)/dashboard/teacher/worksheets/[id]/edit/` (supprimer)
- `src/hooks.server.ts` (redirect)

## Décisions prises

- Phase 1: Constantes centralisées dans `worksheet-constants.ts`

## Audits effectués

- Security Phase 2: ✓ Complété (3 fixes appliqués)
- Security Phase 3: En attente
- Performance Phase 3: En attente

## Prochaines étapes

1. Intégrer MetadataCards et MetadataForm dans la page view
2. Ajouter toggle mode view/edit
3. Implémenter handleSave avec API PATCH
