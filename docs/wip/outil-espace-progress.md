---
title: Lot d'outils « espace » (outils 64 et 65)
date: 2026-11-28
status: outil 64 codé, en revue ; outil 65 à faire
---

# Lot d'outils « espace »

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR de l'outil 64._

- **État** : outil 64 codé (case `droite-parametrique`), tests verts, rendu vu (`pnpm voir`, verso par capture de test) ; revues code (Opus) + sécurité lancées dans la session d'avant le /clear : si leurs résultats ne sont pas dans ce journal, les relancer sur le commit de l'outil 64 · **Prochaine action** : corriger les findings, PR, `pnpm pr:merger`, puis outil 65 (point au tiers dans ` ```solide `) · **En attente de David** : Q2 du 64, la droite du PLAN (deux lignes) — non tranchée, faite en espace seulement (choix qui ne change rien) · **Pièges en cours** : `{{u}}` négatif sans parenthèses donne `1+-2t`, illisible : écrire `+({{u}})t` ou `cleanCoefficients` · **Worktree / branche** : `../ubumaths-wt-outil-espace`, `feat/outil-espace`, serveur de dev 5180

## Outil 64 — phase 0 (envoyée le 2026-11-28)

Vérifié : aucune nature de case ne juge une représentation paramétrique (rien dans
`src/lib/questions/`). Proposition : `answerKind: 'droite-parametrique'`, une case, trois lignes
`x =`, `y =`, `z =` ; attendue = la représentation de l'auteur ; juste si la droite de l'élève est
la même (point de l'élève sur la droite attendue, vecteurs colinéaires). Questions posées à David
dans le message de la session.

Réponse de David (2026-11-28) : « je te suis » → Q1 : toute lettre de paramètre, la même sur les
trois lignes (recommandation) ; Q3 : la droite seule est jugée, pas l'écriture (recommandation).
Q2 (droite du plan) : pas de recommandation, donc **non tranchée** ; reposée, faite en espace
seulement en attendant (le lanceur de specs refuse une attendue de deux lignes).

## Outil 64 — livré sur la branche

- Juge `src/lib/questions/parametric/` (exact, `isExactlyZero`) ; case `ParametricLineInput.svelte`
  (accolade, trois lignes) ; câblage comme la case `resolution` (#3292) ; verso : lignes de l'élève
  neutralisées une à une puis mises en `cases` (`expected-result.ts`).
- Écart au message de phase 0 : les messages ne citent pas les coordonnées de l'élève (« Ton vecteur
  directeur n'est pas colinéaire à celui de la droite. »).
- Vu : `pnpm voir /dev/carte-question?question=droite_parametrique --compte admin --chrome` (recto) ;
  verso juste et faux par capture du test `FlashCard-parametrique` (systèmes bien rendus).
