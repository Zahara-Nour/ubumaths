# Chantier `idees-6e-decimaux-materiel` : le matériel décimal (6N2autoB-2)

Suite du chantier [`idees-6e-decimaux`](idees-6e-decimaux-progress.md),
clos le 2026-11-23. Skill [`idees-rubrique`](../../../../.claude/skills/idees-rubrique/SKILL.md).

## Reprendre ici

_Mis à jour le 2026-11-23, chantier clos._

- **État** : 111ba9c5 « Lire un nombre décimal sur le matériel » validé par David et publié (vérifié
  par MCP) ; ligne 6N2 du tableau à « publiée » ; journal archivé · **Prochaine action** : aucune ·
  **En attente de David** : rien.
- **Pièges retenus** : lettre `e` réservée (Euler) ; `question:specs` ne voit pas une erreur prévue
  égale à la réponse (énumérer les tirages) ; un verdict « outil manquant » se vérifie dans le code.
- **Worktree / branche** : aucun.

## Historique

- 2026-11-23 : David signale que le bloc `collection` dessine déjà gros cubes, plaques, barres et
  petits cubes (le verdict « outil manquant » du relevé était faux). Il choisit d'écrire le modèle
  tout de suite. Script `docs/wip/questions/idees-6e-decimaux-materiel.py`. Variation a : lecture
  (pièges : lu comme un entier, plaques et barres échangées, lu à l'envers) ; b : un rang vide
  (dixièmes ou centièmes ; piège : rang sauté). Ligne 6N2 du tableau repassée à « prise ».
- 2026-11-23 : brouillon 111ba9c5 créé en prod (David). Migration de rangement générée ; le test
  générique échouait sur un lot d'un seul modèle sans niveau ajouté (4 cas sans assertion) : cas
  sautés par `it.skipIf`. Vert avec la migration, 3 rouges sans.
- 2026-11-23 : revues. Erreurs prévues de la variation b confondues (avec la réponse si plaques =
  petits cubes sans barre ; entre elles si barres = petits cubes sans plaque) : conditions ajoutées,
  énumération complète sans collision.
- 2026-11-23 : #3024 mergée ; `db:migrate` (seule migration en attente), état vérifié en prod.
- 2026-11-23 : validé et publié par David ; chantier clos, journal archivé.
