# Chantier `idees-1re-geometrie-reperee`

## Reprendre ici

_Mis à jour le 2026-11-27, lot écrit, PR ouverte._

- **État** : N1 et N2 écrits (`scripts/questions/idees-1re-geometrie-reperee-neufs/`), simulation verte, essayés en base locale · **Prochaine action** : après le merge, David lance `create-questions --publier` en prod, je commite les ids puis génère les migrations de rangement (projeté orthogonal, niveaux 4 et 5, 1SPE-437) · **En attente de David** : la création en brouillon en prod · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-idees-1re-geometrie-reperee`, `feat/idees-1re-geometrie-reperee`

## Historique

### 2026-11-27 — prise et relevé

- Rubrique 1G2 réservée sur `main` (390bb6f4c2).
- 5 exercices lus dans la copie locale (1G20-1, 1G20-2, 1G20-3, 1G21-1, 1G21-2 ; `Old` ignorés).
- Prod (lecture seule) : 16 modèles publiés sur les points de géométrie repérée de 1re spé, tous
  rangés sous « Géométrie repérée ». Les deux synthèses sont les seuls manques.
- [Relevé](idees-1re-geometrie-reperee-releve.md) · [fiches](idees-1re-geometrie-reperee-fiches.md).
- Question d'accès de la migration : personne (on range deux modèles).
- Page à cocher de la phase 0 : https://claude.ai/artifact/KcQ3rQhyGqn2jhJFDjgcBJ (verdicts en base, collection `verdicts`).

### 2026-11-27 — phase 0 tranchée, lot écrit

- David : « je valide tes recos » → F1 et F2 oui, point 1SPE-437 pour les deux (sous-notion
  « projeté orthogonal », niveaux 4 et 5).
- Script `docs/wip/questions/idees-1re-geometrie-reperee-neufs.py` → N1 (2 variations, 15 specs),
  N2 (2 variations, 14 specs). N1 a 8 cases (et non 9 comme l'annonçait la page à cocher).
- Écarts aux fiches, faits en écrivant :
  - N1 V2 : AB² ⩽ 50 en plus, pour que H n'ait pas des fractions énormes.
  - N2 : le cercle passe par un point entier M0 de (CH), pour que le cas « sur les deux » existe ;
    son rayon est donc √n/2, et non une demi-longueur entière comme chez eux. Condition `N4 != 0`
    (cercle de rayon nul vu au rejeu).
  - N2 : OH avec une racine au dénominateur est refusé comme mauvaise forme (réglage par défaut) ;
    l'élève rend le dénominateur rationnel, comme le dit la fiche.
- Contrôles : `create-questions` en simulation vert ; `question:specs` 15/15 et 14/14, 400 tirages ;
  `sonde-figures` 0 problème (300 blocs) ; 210 formules des aperçus : accolades et `validateLatex`
  0 problème.
- Base locale : les deux modèles créés en brouillon, aperçus vus avec `pnpm voir` (figure, cases,
  choix, 0 erreur de console) ; le jugement des réponses justes et des erreurs prévues est vérifié
  par les specs. Ids locaux retirés des fichiers.
