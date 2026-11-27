---
title: Tests de preuve du lot pédagogie — journal
date: 2026-11-27
status: clos
---

## Reprendre ici

_Mis à jour le 2026-11-27, après #3232._

- **État** : clos. #3232 mergée ; V111, L85, L87, L88, L90 ont leur preuve au registre (5 rouges au rejeu).
- **Prochaine action** : aucune ici ; la suite est dans [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : aucun (retirés au merge).

---

Chantier fils de [ecarts-a-trier](../../wip/ecarts-a-trier-progress.md). Lot décrit dans [ecarts-tri/pedagogie.md](../../wip/ecarts-tri/pedagogie.md).

## Sonde du 2026-11-27

- V111 : `printedTitle` d'une fiche d'exercices sans titre libre ni catégorie, notion sans nom anglais, en anglais → `main` = le titre français en base. Témoins : en français le titre s'imprime ; notion traduite → son nom anglais.
- L85 : `escapeTypst('a // b')` compilé par le Typst de la production (typst.ts, comme `coupures-colonnes.test.ts`) imprime « a ». Le texte est posé seul sur sa ligne : sur la même ligne que le `]` fermant, le commentaire avalerait aussi le crochet et la compilation échouerait. Témoins : `a / b`, `a # b`.
- L87 : `assignBlankIndices` d'un choix dont une option est une horloge `placer:` → aucun `choiceErrors`. Témoins : le cercle trigonométrique à placer est refusé ; une horloge `heure:` reste permise. Le test demande un message qui nomme l'horloge (décision de David du 2026-11-24 : refuser à l'écriture).
- L88 : `lineCoefficients('y = \frac{1}{2}x')` → « équation illisible … (Invalid backslash sequence at position 0) ». Témoin : `y = 1/2x` → −0,5x + y = 0.
- L90 : `parseStatChartContent('boite-a-moustaches', …)` : `données: 1/2 ; …` acceptée, `A = 1/2 ; …` refusée. Le test demande la même réponse des deux côtés (accepter ou refuser, non tranché). Témoin : `0,5` accepté des deux côtés.

## Revue (code-reviewer, 2026-11-27)

Corrigés avant le commit : V111 passait au vert sur un titre vide (le test demande maintenant un titre non vide, sans le nom français) ; L88 comparait par `toEqual`, qui sépare 0 de −0 (comparaison nombre à nombre).

- L87 : le test demande un message qui nomme l'horloge, pas la phrase « premier niveau » : la forme du message reste libre.
- L88 : si David tranche « refuser `\frac` avec un message clair », le test devra changer (lettre discutable, D possible).
- L90 : « les deux refusent » fermerait aussi le test ; voulu, la réponse n'est pas tranchée.
- Hors écart : `/*` ouvre un commentaire de bloc Typst par la même cause que `//` ; la correction de L85 devra le couvrir.
