# Notebook templates — progression

> Plan validé 2026-06-04, auto-mode.

## Décisions techniques

1. Schema option A : single table `python_notebooks` + colonnes `is_template` boolean + `template_category` text nullable
2. Pas de templates système seedés en V1 (l'utilisateur en créera à partir du démo notebook)
3. Catégories : texte libre en V1
4. Pas d'aperçu inline du contenu en V1 (juste titre + description + bouton)
5. `is_public` du clone : toujours false (sécurité)
6. « Save as template » crée une **copie**, pas une conversion
7. Owner detection : flag `canEdit` déjà passé par +page.server.ts
8. Étudiants : 403 sur l'API templates ET sur la route

## Infrastructure réutilisée

- RLS existante sur `python_notebooks` (own + public+teacher + assignment student)
- Schéma Zod `notebookContentSchema` pour la validation des cells au clone
- `generateCellId` pattern pour régénérer les IDs
- Dialog / Button / MyCheckbox / MySelect existants
- Toaster pour les notifications

## Phases

| Phase                                | Statut   | Fichiers                                                                                       |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| 1 — Migration + types                | ✅       | `supabase/migrations/20260604080553_python_notebook_templates.sql`, `database.ts` patch manuel |
| 2 — API endpoints                    | ✅       | 3 +server.ts + `notebook-templates.ts` Zod + filtre `is_template=false` sur GET existant       |
| 3 — Gallery + Card + route           | ✅       | `TemplateGallery.svelte`, `TemplateCard.svelte`, `templates/+page.*`                           |
| 4 — SaveAsTemplate dialog + toolbar  | ✅       | `SaveAsTemplateDialog.svelte`, `NotebookToolbar.svelte` modifié                                |
| 5 — Bouton Templates dans page liste | ✅       | `dashboard/.../notebooks/+page.svelte`                                                         |
| 6 — Review + commit + push           | en cours | —                                                                                              |

## Code review — fixes appliqués

Le code-reviewer a relevé :

- **#9** typographie : `font-mono` → `font-medium` sur le label « Enregistrer comme template » (gallery empty state)
- **#9** vouvoyer pour cohérence avec la sibling notebooks page (tutoyer → vouvoyer)
- **#10** commentaire explicite sur `.or()` narrower than RLS by design
- **#2 IMPORTANT** : guard anti-share-template ajouté dans `/api/python-notebooks/[id]/share` → un template ne peut pas être assigné directement à une classe (refuse avec 400 et message demandant de cloner d'abord)

Non-actionables :

- **#1** : cell ID generation pattern `cell-${ts}-${rand}` (au lieu de crypto.randomUUID()) — cohérent avec `notebookStore.svelte.ts:61` qui définit le standard. Mixer les deux serait incohérent.
- **#6** : `$effect` resetting inputs on `open` flip → pattern intentionnel, confirmé par le reviewer comme correct (same as NotebookPdfDialog)

## Quality checks finaux

- `pnpm check:incremental` : 1650 fichiers, **9 ERRORS / 46 WARNINGS** — baseline maintenue
- `svelte-autofixer` : 4 .svelte fichiers, 0 issue actionable (le warning `goto()` sans `resolve()` est le pattern existant partout dans le projet)

## TODOs côté utilisateur après merge

1. `pnpm db:migrate` pour appliquer la migration (prod Supabase distante)
2. `pnpm db:types` pour régénérer `database.ts` proprement (j'ai patché à la main pour le typecheck en P1, la regen rendra le fichier identique)

## Connu — à reporter V2

- Aperçu inline des premières cellules dans `TemplateCard` (juste titre + description en V1)
- Catégories prédéfinies (dropdown vs texte libre)
- Templates système UbuMaths seedés par migration
- Statistiques d'usage par template (combien de clones)

## TODOs côté utilisateur après merge

1. `pnpm db:migrate` pour appliquer la migration (prod Supabase)
2. `pnpm db:types` pour régénérer `database.ts` proprement (j'aurai patché à la main pour le typecheck en P1, mais la regen est plus propre)
