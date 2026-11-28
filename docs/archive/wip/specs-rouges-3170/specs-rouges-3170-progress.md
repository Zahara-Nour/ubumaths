# Chantier `specs-rouges-3170`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3198 : chantier clos, journal archivé._

- **État** : clos. Balayage : aucune spec rouge sur les 2 758 modèles publiés. Correctif de `9ed8c72e` (`x--5x`) mergé (#3198), `db:migrate` joué le 2026-11-26 (question d'accès confirmée par David : personne ne gagne d'accès), prod vérifiée au MCP.
- **Prochaine action** : aucune.
- **En attente de David** : rien. Laissé de côté, sur sa décision : le brouillon `2dcb4b3c` (1 spec rouge, à revoir avant sa publication).
- **Worktree / branche** : retirés par `pr:merger`.

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

## Correctif de `9ed8c72e` (2026-11-26)

- Recos validées par David : corriger `9ed8c72e`, laisser le brouillon `2dcb4b3c` (une spec rouge bloque de toute façon sa publication ; décider d'abord si `factorOne` est juste pour `\frac{5+5i}{5}`), clore après le merge.
- Variation d'index 1 (« n° 2 » dans les messages), 3e étape de la correction : `x-{{k}}x` → `x{{eval:-(k);+}}x`, l'écriture déjà employée sur la même ligne pour `p`. `k = -2` : `x+2x` (au lieu de `x--2x`) ; `k = 3` : `x-3x`.
- `question:specs --apercu 40` : 6/6 specs, 150/150 tirages, plus aucun avertissement ; aucun `--` dans les 40 aperçus.
- Migration générée par `migration-contenu.ts` (lot `scripts/questions/specs-rouges-3170/`). Accès : aucune policy ne change, personne ne gagne ni ne perd d'accès. Additive (contenu d'un modèle), rollback écrit dans le fichier.
- `migrations-contenu-publie.test.ts` : vert (257) ; corps remplacé par `select 1;` → 4 échecs, tous sur elle ; fichier restauré (`cmp` identique).
- `security-auditor` : aucun finding ; une seule ligne écrite, sous garde du contenu exact, rollback symétrique, aucune donnée réelle.
