# Chantier garde-niveaux-tags — alerte quand un niveau de tag manque à `grades`

Suite du chantier `questions-1techno-grades` (journal `docs/wip/questions-1techno-grades-progress.md`, #2280) :
74 modèles tagués d'un point sans le niveau de ce point dans `grades`, invisibles du cahier de texte à ce niveau.
Option (a) retenue par David le 2026-11-03 : une garde d'alerte, rien ne change en base ; (b), un trigger, seulement
si l'oubli revient.

## Reprendre ici

_Mis à jour le 2026-11-03 ; #2284 ouverte._

- **État** : #2284 OUVERTE (garde + `EXCEPTIONS_NIVEAUX` pour les 5 brouillons de seconde, 11 tests verts) ; CI du
  dernier commit `3ba91ce26` en cours au `/clear`, avec **Client Tests (browser, shard 1/2) en échec** (le diff ne
  touche que `scripts/` et la doc : à lire avant de conclure) · **Prochaine action** : lire le job en échec
  (`gh run view <run> --log-failed`) ; sans lien → relancer (`gh run rerun <run> --failed`), CI verte → merger ;
  après le `db:migrate` de #2285, la garde doit sortir en code 0 (5 écarts voulus) · **En attente de David** : rien ·
  **Pièges en cours** : les scripts ne sont pas dans le périmètre du typecheck · **Worktree / branche** :
  `../ubumaths-wt-garde-niveaux-tags`, `feat/garde-niveaux-tags`.

## 1. Premier passage en prod (2026-11-03, avant le `db:migrate` de #2280)

62 modèles sur 1889 tagués : 53 en 1TECHNO (#2280, dont 19 aussi en 1GEN), 2 en 1GEN seul (8ed02829, eb9517ed),
et **7 hors de ce qui a été tranché** :

- 4ff9d049 publié `[T_SPE, T_COMP]` + T_TECHNO (loi binomiale) ;
- 07bce646 publié `[T_SPE]` + T_COMP (opérations sur les limites) ;
- 5 brouillons de seconde `[2]` + T_COMP (1cfc575d aussi + T_SPE) : arbres pondérés, tableaux croisés.

Tests écrits après le code (fonctions pures, 8 cas), pas avant.

## 2. Les 7 écarts de Terminale tranchés (David, 2026-11-03, « oui » à mes recos)

- 4ff9d049 (+ T_TECHNO) et 07bce646 (+ T_COMP), publiés : **corrigés** par une migration de même forme (chantier
  `questions-1techno-grades`).
- Les 5 brouillons de seconde (`[2]`, tagués TCOMP-302, 1cfc575d aussi TSPE-616) : **laissés** — décision
  `questions-2de` Q7 (c) (« `['2']` seul »). Ils entrent dans `EXCEPTIONS_NIVEAUX` (ids, niveaux tolérés, raison
  citée) : la garde les montre à part sans échouer ; un AUTRE niveau manquant chez eux reste un écart. À rouvrir
  si on les publie pour la Terminale complémentaire.

Tests de `separerExceptions` écrits d'abord (3 rouges), puis le code : 11/11. Prod : 23 écarts (21 de #2285,
pas encore migrée, + 2 de Terminale), 5 voulus.
