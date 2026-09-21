# Lot 2 — les quatre gestes du niveau du facteur

> Branche `refactor/tidy-voix-lot2`, worktree `../ubumaths-wt-tidy-lot2`.
> Suite du lot 1 ([tidy-voix-progress.md](tidy-voix-progress.md), PR #396).
> Spécification : [tidy-voix-phase0.md](tidy-voix-phase0.md), § « Lot 2 ».

## Ce qu'il remplace

Le lot 1 sortait tout le travail fait terme par terme en **un** geste grossier,
`tidy-terms` « On met chaque terme au propre ». Le lot 2 le remplace par les
gestes que l'élève nomme :

| règle                   | phrase                                                          |
| ----------------------- | --------------------------------------------------------------- |
| `tidy-fold-numbers`     | On calcule les nombres                                          |
| `tidy-extract-radicals` | On extrait du radical les facteurs qui sont des carrés parfaits |
| `tidy-merge-factors`    | On regroupe les facteurs de même base                           |
| `tidy-simplify-signs`   | On simplifie les signes                                         |
| `tidy-add-fractions`    | On met au même dénominateur et on calcule                       |

`tidy-terms` **reste** comme filet : ce que les quatre familles n'ont pas
couvert sort encore d'un bloc, et l'invariant de chaîne tient.

## La difficulté

`toTerm` traite **un terme à la fois**, pendant la décomposition, et les quatre
familles y sont enchevêtrées dans `absorbFactor` — `absorbRational` (nombres),
`absorbSquareRoot` (radicaux), `addFactor` (facteurs, fusion par hash), et le
`case 'opposite'` (signes).

⚠️ **Une étape = une FAMILLE, pas une occurrence** (règle validée) : `√8 + √12`
doit rendre UNE étape, appliquée partout. Il faut donc pouvoir décomposer avec
un **sous-ensemble de familles activées**, matérialiser, puis en activer une de
plus — et non instrumenter la descente.

## État

- [x] Contrat écrit en tests rouges : 8 rouges / 123 verts
- [ ] Implémentation
- [ ] Revue `code-reviewer`
- [ ] `check:incremental` + `lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé

## Invariants, non négociables (repris du lot 1)

1. Le résultat de `tidy(x)` **ne bouge pas** — les 333 tests de `tidy/` restent
   verts **sans être touchés**.
2. Narration gratuite quand personne n'écoute.
3. Chaque étape est une vraie expression ; la chaîne part de ce que l'élève a
   écrit et recolle sur `tidy(x)`.
4. Le silence veut dire « rien n'a bougé », vérifié par `nodesEqual`.
