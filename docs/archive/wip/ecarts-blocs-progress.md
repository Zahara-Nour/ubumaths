---
title: Écarts — lot blocs
date: 2026-11-28
status: clos
---

# Écarts — lot `blocs`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3270._

- **État** : **lot clos.** #3266 (L88, L89, L90, L92, L93) et #3270 (V110) mergées ; L91 clos sans
  code (déjà corrigé par E46). Lignes barrées au registre, lot `fait` dans `ecarts-lots.md`, journal
  archivé. · **Prochaine action** : aucune. · **En attente de David** : rien (V110 : cote posée en
  haut à gauche du bout du trait plutôt qu'à mi-hauteur, écart à l'option 1 signalé).
- **Worktree / branche** : aucun (retirés par `pnpm pr:merger`).

## Écarts du lot

Pris le 2026-11-28 ([ecarts-lots.md](ecarts-lots.md)) : V110, L88, L89, L90, L91, L92, L93.

| Écart | Vérifié                                           | Fait                                                                                                          |
| ----- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| L88   | vrai (preuve rouge)                               | `\frac` / `\dfrac` dans `tracer:` lus par `parseLatex` (`parseSide`, `courbe-tracer.ts`)                      |
| L89   | vrai                                              | ranger dans un item de liste : lu (`markdown-parser.ts`) **et affiché** (`ListNode.svelte`)                   |
| L90   | vrai (preuve rouge)                               | fraction d'entiers sur une ligne de boîte (`boxValue`, `stat-chart-parser.ts`)                                |
| L91   | **déjà corrigé** par E46 (9448e19f97, 2026-11-24) | rien : `tickLabelStride` écrit une graduation sur deux (ou plus) quand l'axe est serré, testé (`fit.test.ts`) |
| L92   | vrai                                              | durée du panier bornée à 600 s (`MAX_QUESTION_DELAY_SECONDS`), store et tuile                                 |
| L93   | vrai                                              | `MySelect` / `MyCheckbox` dans `PrecisionEditor` et `QuestionPreview`, noms accessibles avec la valeur        |
| V110  | vrai (preuve rouge)                               | cote écrite contre le trait, en haut à gauche de son bout au centre de la base (`espace-solides.ts`)          |

## Journal

### 2026-11-28 — PR 2 (V110)

- V110 : la distance à l'axe d'un cylindre coupé parallèlement à l'axe n'est plus écrite sous la
  base mais contre son trait en tirets, en haut à gauche de son bout au centre de la base. À
  mi-hauteur du trait (option 1 acceptée par David), elle tombait sur le bord de la coupe : vu à
  l'écran pour 0,5 / 1 / 3 cm ; écart à l'option signalé à David. Test rouge → vert, preuve du
  registre verte. Pas de revue (position d'une cote, < 30 lignes).

### 2026-11-28 — PR 1 (L88, L89, L90, L92, L93)

- L88 : un côté de l'équation qui porte une commande LaTeX autre que `\pi` est lu par `parseLatex` ;
  `equationLatex` donne la même formule pour `\frac{1}{2}x` et `1/2x`.
- L89 : le parseur seul ne suffisait pas. Avec lui seul, le bloc disparaissait de l'écran (pire que le
  code brut) : `ListNode` ne connaissait pas `ranger`. Test d'écran `ListNode-ranger.svelte.test.ts`,
  vu rouge avec l'ancien `ListNode`. Une question refuse toujours un ranger dans une liste. PDF : les
  items passent par `generateBlock`, rien à faire.
- L90 : 1/0 refusé (« n'est pas un nombre »). L'axe (`axe:`) reste en nombres simples.
- L92 : la durée observée (`OBSERVED_MAX_SECONDS`) reste bornée à 300 s, dans la plage du panier.
- L93 : vu à l'écran par deux tests de composant avec capture (listes ouvertes, valeur changée).
  Vu en passant, hors lot : le badge « Variation 1 / 2 » de l'aperçu ne suit pas la variation choisie
  (déjà avant ; pas de cas réel, non inscrit).
- Doc : `ubumark.md` (droite à tracer, boîte, restes), `questions.md`, `evaluations.md`,
  `statistiques.md`.
- Revue `code-reviewer` (Opus) : aucun bloquant ; trois mineurs corrigés (plafond 10^9 aussi pour une
  fraction de boîte, commentaire de constante déplacé, `for=` des libellés retirés : `MySelect` ne
  pose pas l'`id` sur le déclencheur, le nom passe par `triggerAriaLabel`).
