# Chantier `specs-rouges-3170`

## Reprendre ici

_Mis à jour le 2026-11-26, après le balayage (aucune PR)._

- **État** : constat fait, **aucune spec rouge** sur les 2 758 modèles publiés de la prod (28 431 specs, code de `main` à `3bd49f92bf`, #3170 et #3175 compris). Détail : § Balayage du 2026-11-26.
- **Prochaine action** : aucune correction n'est nécessaire. Clore le chantier (archiver ce journal) si David est d'accord.
- **En attente de David** : clore ? Et le brouillon `2dcb4b3c` (complexes, 1 spec rouge sans rapport avec #3170) : à traiter ou à laisser ?
- **Pièges en cours** : `checkTemplate` sur une ligne de la base → retirer `created_at`, `updated_at`, `created_by` (sinon « erreur de schéma » partout, comme `update-published-questions.ts`).
- **Worktree / branche** : aucun.

## Contexte

- #3170 (mergée le 2026-11-26) : réglages `;dN ;aN ;pN`, euro à deux décimales, zéros utiles au juge.
- #3175 : 32 modèles à `precision` décimale relevés, 27 migrés vers `;aN`, 11 specs de 7 modèles remises à la règle (journal archivé `docs/archive/wip/idees-6e-proportionnalite/idees-6e-proportionnalite-progress.md`, § « zéros des arrondis »).
- Le balayage n'a porté que sur ces 32 : les autres publiés n'ont pas été rejoués.

## Balayage du 2026-11-26

Instantané de `question_templates` de la PRODUCTION, en lecture seule (service role, `select` seulement) : 2 890 modèles, dont 2 758 publiés et 132 brouillons. Scripts jetables dans le scratchpad de la session, non versionnés.

- **Specs seules** (`runAllTestSpecs`, le juge de l'élève) : publiés 2 758 modèles, 28 431 specs, **0 rouge**, 0 plantage.
  - Témoin : 20 specs `correct` passées à `incorrect` dans une copie de l'instantané, 20 rouges sur 20. Le balayage voit donc une spec rouge.
- **`checkTemplate` complet** (10 tirages par variation) sur les publiés : **0 non importable**. Avertissements : 1 seul modèle, et aucun ne vient de #3170 (ni euros, ni `;dN`, ni `;aN`/`;pN` sans `precision`).
  - `9ed8c72e` « Résoudre une équation quotient », correction de la variation 2 : `x-{{k}}x` avec `k = -5` s'affiche `x--5x`.
- **Brouillons** : 132 modèles, 1 295 specs, 1 rouge. `2dcb4b3c` « Inverse et quotient de nombres complexes » (Tle expert, modifié pour la dernière fois le 2026-10-05), spec 10, `\frac{5+5i}{5}` : le juge rend `reducedFractions` + `factorOne`, la spec n'attend que `reducedFractions`. Aucun rapport avec #3170.

**Conclusion** : #3175 avait remis toutes les specs touchées par #3170. Il n'y a rien à migrer.
