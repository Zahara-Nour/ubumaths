# Chantier garde-niveaux-tags — alerte quand un niveau de tag manque à `grades`

Suite de [questions-1techno-grades](questions-1techno-grades-progress.md) (sur sa branche jusqu'au merge de #2280) :
74 modèles tagués d'un point sans le niveau de ce point dans `grades`, invisibles du cahier de texte à ce niveau.
Option (a) retenue par David le 2026-11-03 : une garde d'alerte, rien ne change en base ; (b), un trigger, seulement
si l'oubli revient.

## Reprendre ici

_Mis à jour le 2026-11-03, avant la PR._

- **État** : `scripts/lib/niveaux-des-tags.ts` (fonctions pures + lecture paginée), `scripts/questions/garde-niveaux-tags.ts`
  (toute la base, code 1 si écart), alerte dans `publier-lot.ts`, 8 tests unitaires, doc `couvrir-un-niveau.md` § 8 ·
  **Prochaine action** : PR, CI, merge · **En attente de David** : les 7 écarts de Terminale (§ 1) · **Pièges en
  cours** : aucun · **Worktree / branche** : `../ubumaths-wt-garde-niveaux-tags`, `feat/garde-niveaux-tags`.

## 1. Premier passage en prod (2026-11-03, avant le `db:migrate` de #2280)

62 modèles sur 1889 tagués : 53 en 1TECHNO (#2280, dont 19 aussi en 1GEN), 2 en 1GEN seul (8ed02829, eb9517ed),
et **7 hors de ce qui a été tranché** :

- 4ff9d049 publié `[T_SPE, T_COMP]` + T_TECHNO (loi binomiale) ;
- 07bce646 publié `[T_SPE]` + T_COMP (opérations sur les limites) ;
- 5 brouillons de seconde `[2]` + T_COMP (1cfc575d aussi + T_SPE) : arbres pondérés, tableaux croisés.

Tests écrits après le code (fonctions pures, 8 cas), pas avant.
