# Chantier garde-niveaux-tags — alerte quand un niveau de tag manque à `grades`

Suite du chantier `questions-1techno-grades` (journal `docs/wip/questions-1techno-grades-progress.md`, #2280) :
74 modèles tagués d'un point sans le niveau de ce point dans `grades`, invisibles du cahier de texte à ce niveau.
Option (a) retenue par David le 2026-11-03 : une garde d'alerte, rien ne change en base ; (b), un trigger, seulement
si l'oubli revient.

## Reprendre ici

_Mis à jour le 2026-11-03, après #2284 et le `db:migrate` de #2285. **Chantier clos, versé.**_

- **État** : garde en prod, code 0 (1892 modèles tagués, 2061 tags, aucun niveau manquant ; 5 écarts voulus à
  part). Durable : `docs/pratiques/couvrir-un-niveau.md` § 8 et `EXCEPTIONS_NIVEAUX` dans le code · **Prochaine
  action** : aucune · **En attente de David** : rien · **Pièges** : les 5 exceptions de seconde sont désormais
  PUBLIÉES ; à rouvrir si on les ouvre à la Terminale complémentaire · **Worktree / branche** : retirés.

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

## 3. Clôture (2026-11-03)

Après le `db:migrate` de #2285 (2 migrations, appliquées à 11:53), garde relancée en prod : code 0, 5 écarts voulus.
Branche distante `feat/garde-niveaux-tags` supprimée ; worktree déjà retiré. Journal archivé.
