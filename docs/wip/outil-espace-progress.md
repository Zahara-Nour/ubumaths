---
title: Lot d'outils « espace » (outils 64 et 65)
date: 2026-11-28
status: outil 64 en PR ; outil 65 à faire
---

# Lot d'outils « espace »

## Reprendre ici

_Mis à jour le 2026-11-28, à l'ouverture de la PR de l'outil 64._

- **État** : outil 64 (case `droite-parametrique`) en PR, revues code + sécurité faites et corrigées · **Prochaine action** : merger la PR (CI verte), passer la ligne 64 en « Livré », puis outil 65 (point au tiers d'une arête dans ` ```solide `), phase 0 d'abord · **En attente de David** : rien · **Pièges en cours** : `{{u}}` négatif sans parenthèses donne `1+-2t`, illisible : écrire `+({{u}})t` ou `cleanCoefficients` · **Worktree / branche** : `../ubumaths-wt-outil-espace`, `feat/outil-espace`, serveur de dev 5180

## Outil 64 — phase 0 (envoyée le 2026-11-28)

Vérifié : aucune nature de case ne juge une représentation paramétrique (rien dans
`src/lib/questions/`). Proposition : `answerKind: 'droite-parametrique'`, une case, trois lignes
`x =`, `y =`, `z =` ; attendue = la représentation de l'auteur ; juste si la droite de l'élève est
la même (point de l'élève sur la droite attendue, vecteurs colinéaires). Questions posées à David
dans le message de la session.

Réponse de David (2026-11-28) : « je te suis » → Q1 : toute lettre de paramètre, la même sur les
trois lignes (recommandation) ; Q3 : la droite seule est jugée, pas l'écriture (recommandation).
Q2 (droite du plan) : pas de recommandation, donc **non tranchée** ; reposée, faite en espace
seulement en attendant (le lanceur de specs refuse une attendue de deux lignes). Puis ma
recommandation explicite « espace seulement » (au programme, la représentation paramétrique n'est
qu'en Terminale spé, dans l'espace ; le plan a la case `equation`), et David : « je te suis »
(2026-11-28) → **Q2 tranchée : espace seulement**.

## Outil 64 — livré sur la branche

- Juge `src/lib/questions/parametric/` (exact, `isExactlyZero`) ; case `ParametricLineInput.svelte`
  (accolade, trois lignes) ; câblage comme la case `resolution` (#3292) ; verso : lignes de l'élève
  neutralisées une à une puis mises en `cases` (`expected-result.ts`).
- Écart au message de phase 0 : les messages ne citent pas les coordonnées de l'élève (« Ton vecteur
  directeur n'est pas colinéaire à celui de la droite. »).
- Vu : `pnpm voir /dev/carte-question?question=droite_parametrique --compte admin --chrome` (recto) ;
  verso juste et faux par capture du test `FlashCard-parametrique` (systèmes bien rendus).

## Outil 64 — revues (2026-11-28)

- `code-reviewer` (Opus) : 1 important corrigé (le formulaire effaçait `blankDefaults.answerKind:
'droite-parametrique'` → case à cocher dans `calculus-editor.ts` / `SharedFieldsEditor.svelte`) ;
  mineurs corrigés : « x = » retapé toléré, exposants négatifs bornés, e/π/i pris pour paramètre
  (message propre), λ dans les messages, garde de complexité des cases appariées (aussi pour
  `resolution`), case hors d'un `$$?$$` seul refusée par `validateTemplate` (droite paramétrique
  seulement ; `resolution` a le même trou, laissé), doc. Laissé : `1+2t+\sqrt{t}^2-t` accepté
  (aucun cas réel).
- `security-auditor` (Opus) : aucun bloquant ; corrigé : bornes de rendu du verso mesurées sur la
  réponse entière (3 lignes au plafond triplaient la page du professeur), `&` inertes, 4e ligne
  montrée en texte inerte.
