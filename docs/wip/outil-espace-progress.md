---
title: Lot d'outils « espace » (outils 64 et 65)
date: 2026-11-28
status: outil 64 livré (#3308) ; outil 65 à faire
---

# Lot d'outils « espace »

## Reprendre ici

_Mis à jour le 2026-11-28, après #3308._

- **État** : outil 64 livré (#3308, case `droite-parametrique`) ; outil 65 en phase 0 (questions envoyées) · **Prochaine action** : réponse de David, puis tests rouges · **En attente de David** : Q1 à Q4 de la phase 0 de l’outil 65 · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-outil-espace`, `feat/outil-espace`

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

## Outil 65 — phase 0 (envoyée le 2026-11-28)

Vérifié (`solide-parser.ts`, `readPoints`) : `points:` lit `milieu`, `centre`, `intersection` et
les coordonnées (ces dernières seulement avec `repere:`). Sans repère, un point au tiers d'une
arête ne se déclare pas ; un quart = milieu d'un milieu. Pas de graduation d'arête.
Proposition : `M tel que AM = 1/3 AB` (fraction strictement entre 0 et 1, deux points distincts
quelconques) ; graduations en question. Questions posées à David dans le message de la session.

Réponse de David (2026-11-28) : « je te suis » → Q1 : `M tel que AM = 1/3 AB` ; Q2 : graduations
dans la même PR, `graduer: AB 3` ; Q3 : deux points distincts quelconques ; Q4 : la variation
« au tiers » de N3 (TSPE-332) laissée aux sessions « questions ».
