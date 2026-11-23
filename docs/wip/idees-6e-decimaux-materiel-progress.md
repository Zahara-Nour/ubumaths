# Chantier `idees-6e-decimaux-materiel` : le matériel décimal (6N2autoB-2)

Suite du chantier [`idees-6e-decimaux`](../archive/wip/idees-6e-decimaux/idees-6e-decimaux-progress.md),
clos le 2026-11-23. Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md).

## Reprendre ici

_Mis à jour le 2026-11-23, PR à ouvrir._

- **État** : brouillon 111ba9c5 créé en prod par David ; migration de rangement générée
  (6-102, « Décimaux : numération > décomposition », niveau 10), test vert, rouge sans elle ;
  test générique corrigé (cas sans objet pour un lot d'un modèle : sautés au lieu de vides) ·
  **Prochaine action** : revue (`security-auditor` + `code-reviewer`), PR, CI, merge, `db:migrate`,
  puis relecture par David dans `/dev/modeles?point=6-102` et `publier-lot.ts` · **En attente de
  David** : rien avant la relecture.
- **Pièges en cours** : lettre `e` réservée (Euler) ; le dessin ne porte aucune valeur, l'énoncé fixe
  gros cube = 1 unité.
- **Worktree / branche** : `ubumaths-wt-idees-6e-decimaux-materiel` / `feat/idees-6e-decimaux-materiel`.

## Historique

- 2026-11-23 : David signale que le bloc `collection` dessine déjà gros cubes, plaques, barres et
  petits cubes (le verdict « outil manquant » du relevé était faux). Il choisit d'écrire le modèle
  tout de suite. Script `docs/wip/questions/idees-6e-decimaux-materiel.py`. Variation a : lecture
  (pièges : lu comme un entier, plaques et barres échangées, lu à l'envers) ; b : un rang vide
  (dixièmes ou centièmes ; piège : rang sauté). Ligne 6N2 du tableau repassée à « prise ».
- 2026-11-23 : brouillon 111ba9c5 créé en prod (David). Migration de rangement générée ; le test
  générique échouait sur un lot d'un seul modèle sans niveau ajouté (4 cas sans assertion) : cas
  sautés par `it.skipIf`. Vert avec la migration, 3 rouges sans.
