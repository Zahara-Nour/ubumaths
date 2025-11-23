# Worksheet Merge Progress

## Statut: Phase 1 - En attente

## Objectif

Fusionner les pages view (`/worksheets/[id]`) et edit (`/worksheets/[id]/edit`) en une seule page avec toggle de mode.

## Phases

- [ ] Phase 1: Extraction utilitaires partagés
- [ ] Phase 2: Composants metadata + security audit
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

- (aucune pour l'instant)

## Audits effectués

- Security Phase 2: En attente
- Security Phase 3: En attente
- Performance Phase 3: En attente

## Prochaines étapes

1. Lancer l'agent backend-developer pour Phase 1
