# Chantier `idees-6e-decimaux-materiel` : le matériel décimal (6N2autoB-2)

Suite du chantier [`idees-6e-decimaux`](../archive/wip/idees-6e-decimaux/idees-6e-decimaux-progress.md),
clos le 2026-11-23. Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md).

## Reprendre ici

_Mis à jour le 2026-11-23, modèle écrit (pas encore en prod)._

- **État** : modèle neuf « Lire un nombre décimal sur le matériel » écrit (2 variations, 13 specs
  vertes, essayé en base locale et dans l'aperçu de l'admin) ; rangement prévu : nœud
  « Nombres et calculs > Décimaux : numération > décomposition », point 6-102, niveau 10 ·
  **Prochaine action** : David lance `create-questions --publier` en prod, je commite l'id, puis
  `migration-rangement.ts`, test d'intégration, `security-auditor`, PR, `db:migrate` · **En attente
  de David** : la création en prod.
- **Pièges en cours** : lettre `e` réservée (Euler) ; le dessin ne porte aucune valeur, l'énoncé fixe
  gros cube = 1 unité.
- **Worktree / branche** : `ubumaths-wt-idees-6e-decimaux-materiel` / `feat/idees-6e-decimaux-materiel`.

## Historique

- 2026-11-23 : David signale que le bloc `collection` dessine déjà gros cubes, plaques, barres et
  petits cubes (le verdict « outil manquant » du relevé était faux). Il choisit d'écrire le modèle
  tout de suite. Script `docs/wip/questions/idees-6e-decimaux-materiel.py`. Variation a : lecture
  (pièges : lu comme un entier, plaques et barres échangées, lu à l'envers) ; b : un rang vide
  (dixièmes ou centièmes ; piège : rang sauté). Ligne 6N2 du tableau repassée à « prise ».
