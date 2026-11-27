---
title: V35, le i derrière la fraction — journal
date: 2026-11-27
status: #3240 mergée ; journal archivé
---

## Reprendre ici

_Mis à jour le 2026-11-27, après #3240._

- **État** : #3240 mergée : V35 corrigé et clos au registre ; L137 ajouté (reste de la revue). Journal archivé.
- **Prochaine action** : aucune ici ; la suite est dans [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : le port 5176 peut être pris par le serveur d'un autre worktree : `test:verifs` s'y branche sans le dire (vérifier le dossier du process, ou `VERIFS_PORT`).
- **Worktree / branche** : aucun (retirés au merge de #3240).

---

Chantier fils de [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).

## Phase 0 (validée par David le 2026-11-27, « oui » aux trois questions)

Décision du 2026-11-03 : `-1/2 + (√3/2)i`, le `i` après la fraction.

- Numérateur entier : `1 + (3/2)i` (avant : `1 + 3i/2`).
- `i` seul au numérateur : `√3/2 + (1/2)i` (avant : `√3/2 + i/2`).
- Imaginaire pur, sans partie réelle : `(√3/2)i` (avant : `i√3/2`).
- Inchangé : sans fraction (`-1 + i√3`, `2i√3`, `3i`, `0,5i`) ; avec π (`e^{iπ/3}`, `1 + 2iπ/3`) ; avec une inconnue (`ix/2`, `i/x`) ; `1/i`, `i²/2`.

## Ce qui a été fait

- `imaginaryBehindFraction` (`tidy/order.ts`) dit si la règle s'applique ; `buildTermMagnitude` (`tidy/build.ts`) écrit la fraction sans `i`, puis `i`.
- Écritures relues par le parseur (LaTeX et linéaire) puis repassées par `tidy` : stables.
- Un attendu mis à jour hors de `tidy` : `simplify/__tests__/unite-imaginaire.test.ts` (`i/2` → `(1/2)i`).
