# Chantier `specs-rouges-3170`

## Reprendre ici

_Mis à jour le 2026-11-26, ouverture du chantier._

- **État** : rien de fait. Question de David (2026-11-26) : « regarde le point resté ouvert » du chantier `idees-6e-proportionnalite` : des modèles publiés hors des 32 relevés peuvent avoir des `testSpecs` rouges depuis #3170 (réglages `;dN` `;aN` `;pN`, euro à deux décimales, zéros utiles au juge).
- **Prochaine action** : balayer TOUS les modèles publiés de la prod (lecture seule) avec `checkTemplate` (`#lib/questions/review/check-template.ts`, celui de `migration-contenu.ts`), compter les specs rouges par modèle et les classer (ancienne règle assertée par la spec, ou vrai changement de jugement) ; rendre le compte à David avant toute correction.
- **En attente de David** : rien (le constat d'abord).
- **Pièges en cours** : #3175 a déjà remis 11 specs de 7 modèles (sur les 32 à `precision` décimale) ; une spec rouge peut aussi venir d'un autre changement que #3170 : regarder ce qu'elle assertait. Correction éventuelle = migration de contenu (`migration-contenu.ts`), jamais d'écriture directe en prod.
- **Worktree / branche** : aucun pour l'instant (constat en lecture seule) ; un worktree si une migration suit.

## Contexte

- #3170 (mergée le 2026-11-26) : réglages `;dN ;aN ;pN`, euro à deux décimales, zéros utiles au juge.
- #3175 : 32 modèles à `precision` décimale relevés, 27 migrés vers `;aN`, 11 specs de 7 modèles remises à la règle (journal archivé `docs/archive/wip/idees-6e-proportionnalite/idees-6e-proportionnalite-progress.md`, § « zéros des arrondis »).
- Le balayage n'a porté que sur ces 32 : les autres publiés n'ont pas été rejoués.
