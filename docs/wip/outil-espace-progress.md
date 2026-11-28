---
title: Lot d'outils « espace » (outils 64 et 65)
date: 2026-11-28
status: outils 64 (#3308) et 65 (#3316) livrés
---

# Lot d'outils « espace »

## Reprendre ici

_Mis à jour le 2026-11-28, après #3316._

- **État** : lot `espace` fini — outil 64 (#3308) et outil 65 (#3316) livrés, rien en prod tant que David ne lance pas `deploy:prod` · **Prochaine action** : passer la ligne `espace` de `docs/wip/outils-lots.md` à « fait (#3308, #3316, 2026-11-28) » (fichier tenu par une autre session le 2026-11-28, pas touché), puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés par `pr:merger`

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

## Outil 65 — livré sur la branche

- `points: M tel que AM = 1/3 AB` (`readAlong`, `SolidePoint.along`, `solidePoints3`) ; `graduer: AB 3`
  (`readGraduations`, `SolideScene.ticks`, Solide.svelte, SolideGeste.svelte, PDF). Tests :
  `solide-tiers.test.ts` (43), `SolideGeste.svelte.test.ts` (graduations dans la figure à geste).
- Écart à la phase 0, décidé seul : `graduer:` prend une arête ou un segment de `segments:`, pas un
  segment non dessiné (des traits sans trait n'ont pas de sens).
- Vu : exemple « Un point au tiers d'une arête » de `/aide-ecriture/blocs/solide`, capture WebKit
  (M sur le trait du tiers, trait des deux tiers visible, nom accessible lu).

## Outil 65 — revue (2026-11-28)

- `code-reviewer` (Sonnet) : 1 important corrigé (graduations absentes de la figure à geste
  `SolideGeste.svelte` avec `tracer:`) ; corrigés : test PDF qui ne prouvait pas d'où venaient les
  `cap: "butt"`, traits en paquet sur un segment vu presque par le bout (aucun trait si une part est
  plus courte que `TICK_HALF`), fraction réduite avant le contrôle du dénominateur (5/20 admis),
  en-tête du parseur. Laissés : traits pleins sur une arête cachée (lisible), nom du point qui
  n'évite pas les traits (aucun cas réel).
