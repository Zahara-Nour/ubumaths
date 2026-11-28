# Chantier `idees-3e-algorithmique` — idées de la rubrique « Algorithmique et programmation » de 3e

## Reprendre ici

_Mis à jour le 2026-11-28, phase 0 en attente de David._

- **État** : relevé fait ([idees-3e-algorithmique-releve.md](idees-3e-algorithmique-releve.md)), phase 0
  publiée en page à cocher. · **Prochaine action** : lire les verdicts de la page (collection
  `verdicts`), consigner les décisions, réserver les 6 modèles publiés visés, écrire le gros lot. · **En
  attente de David** : verdicts des fiches A à H, R, Q1. · **Pièges en cours** : E est un modèle de
  **5e** (point 5-011, `grades` `['5']`), jamais tagué en 3e. · **Worktree / branche** :
  `../ubumaths-wt-idees-3e-algorithmique`, `feat/idees-3e-algorithmique`.

## Rubrique

« Algorithmique et programmation » de 3e (code 3I1, 11 exercices), réservée le 2026-11-28 dans
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md).

## Phase 0 (2026-11-28)

Page à cocher : https://claude.ai/artifact/Mv3B7G3XB2r8X3jjjYoE4u (collection `verdicts`, une entrée par
fiche A à H, R, Q1). Une case par question, coup de pouce et trois erreurs prévues par case, `testSpecs`
sur chaque variation, programmes en ` ```scratch ` (blocs `aller à x: y:`, `ajouter … à x`, `abscisse x`
et `modulo` vérifiés dans le dictionnaire français de scratchblocks).

| Fiche | Idée                                                                                                                                         | Recommandation                                                                    | Point         |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| A     | Position finale du lutin (3I1, 3I10-1)                                                                                                       | 9f9bddbd v5, v6 ; 4ce8eb3c v5                                                     | 3-048 ; 3-049 |
| B     | Syracuse : compteur, plus grande valeur (3I1-1, 3I12-6)                                                                                      | 4ce8eb3c v6, v7                                                                   | 3-049         |
| C     | Écrire le programme de Syracuse (` ```calcul `)                                                                                              | 6e99d291 v4                                                                       | 3-051         |
| D     | Quelle valeur saisir (Thalès, équation, produit nul, Pythagore) (3I12-6)                                                                     | 962da675 v4 à v7                                                                  | 3-047         |
| E     | Diviseurs et multiples avec un programme (3I12-1 à 4)                                                                                        | **modèle neuf de 5e**, 5 variations, sous-notion « instructions conditionnelles » | 5-011         |
| F     | Écrire le programme qui compte les diviseurs                                                                                                 | 6e99d291 v5                                                                       | 3-051         |
| G     | Tableur : moyenne d'une semaine de températures (3I13-1)                                                                                     | 5c092e43 v5 (``choix, décision Q22 du 2026-11-18)                                 | 3-032         |
| H     | Paramètres d'un bloc personnalisé (3I1DNB-0)                                                                                                 | 0a470416 v4                                                                       | 3-050         |
| R     | 3I12-5 (copie de 6I1B-6) → session 6I1 ; dichotomie (2de), tableur hors statistique, questions descriptives, figure à choisir, bloc à écrire | rien                                                                              | —             |

Questions :

- **Q1** : E (5-011, 5e) dans ce chantier, ou en « Idées en attente » ? Recommandation : dans ce chantier.
- **Accès de la migration** : personne ne gagne d'accès, on range un modèle et on complète des modèles.

Aucun outil manquant : le plateau de couleurs de 3I10-1 devient une position (x ; y), et la formule de
tableur reste à choisir (Q22).
