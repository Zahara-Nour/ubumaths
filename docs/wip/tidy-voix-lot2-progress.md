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

## La conception retenue : OBSERVER, pas re-décomposer

La piste du « budget de familles » est **morte, mesurée** : `buildSum` et
`sortFactors` ne savent pas écrire une forme partiellement repliée.

| forme laissée non repliée      | ce que `buildSum` rend |
| ------------------------------ | ---------------------- |
| `2*3*x` sans repli des nombres | `x*2*3`                |
| `x*x*x` sans fusion            | `xxx`                  |
| `-(-x)` sans repli des signes  | `--x`                  |

Aucune de ces écritures n'est celle d'un élève, et une matérialisation « budget
vide » émettrait en prime une étape parasite `2*3*x → x*2*3`.

À la place, un carnet `FamilyWatch` porté par l'`Accumulator`, **créé seulement
si un enregistreur est passé**. Chaque famille y pose son drapeau quand elle a
réellement changé l'écriture, et `soleFamilyRule` nomme le geste **si une seule
famille a bougé sur toute la somme** — d'où « une famille appliquée partout »
en une étape. Aucune décision d'`absorbFactor` n'est touchée : l'invariant 1
tient par construction.

⚠️ **Limite assumée : deux familles qui bougent ensemble retombent sur le
filet.** `2·3·√8` rend `12√2` sous « On met chaque terme au propre », parce
qu'il faudrait montrer une expression où les nombres sont repliés et le radical
non — et cette expression n'est pas écrivable (mesure ci-dessus).

## Contradiction de mon propre contrat, levée

Le test du lot 1 épinglait `['tidy-terms', 'tidy-collect-like-terms']` sur
`sqrt(12)+sqrt(3)`, écrit quand `tidy-terms` était le seul geste disponible. Or
c'est **exactement la même famille** que `sqrt(8)+sqrt(12)`, que le lot 2 exige
de nommer `tidy-extract-radicals` : aucune règle de principe ne peut les
distinguer. Le test du lot 1 est donc mis à jour — c'est le but du lot 2.

## Revue (`code-reviewer`, Opus) — 10 findings

Le principe qui les résout tous, désormais écrit dans le code :

> **On ne nomme un geste que si on est certain qu'il est le SEUL à avoir
> travaillé. Au moindre doute, le filet.** Une étiquette qui ment à l'élève est
> pire qu'une étiquette grossière.

D'où une cinquième famille, `'other'` — la sentinelle du doute, sans entrée
dans `FAMILY_RULE`, donc forçant le filet.

**Trois étiquettes mentaient**, toutes mesurées avant correction :

| entrée        | disait                                    | dit          |
| ------------- | ----------------------------------------- | ------------ |
| `1/√2`        | « on extrait les carrés parfaits »        | le filet     |
| `√3²`         | « on extrait les carrés parfaits »        | le filet     |
| `x·x·(y+2·3)` | « on regroupe les facteurs de même base » | le filet     |
| `3+1/2+x+x`   | « on met au même dénominateur »           | regroupement |

`1/√2 → √2/2` est une rationalisation et `√3² → 3` une annulation : **aucun
carré n'en sort**. `x·x·(y+2·3)` repliait aussi `2·3` par une récursion de
`tidyAtom` que le carnet n'observe pas. Et `3+1/2+x+x → 7/2+2x` faisait aussi
`x+x → 2x`.

**Trois gestes étaient muets ou mal nommés** : `2^3 → 8` (une puissance
numérique calcule à elle seule, mais n'écrit qu'un nombre), `x·(−2) → −2x` (le
coefficient `−1` n'est pas « un » au sens strict, d'où un faux calcul), et
`−x·x·x → −x³` (un signe **porté** n'est pas un signe **simplifié** ; le vrai
geste y est la fusion).

⚠️ **Deux pièges dans les correctifs eux-mêmes :**

1. Un garde naïf « exposant ≠ 1 » pour la puissance numérique **casse `1/3`**,
   dont le dénominateur arrive en `absorbRational(3, −1)`. Le garde juste porte
   sur `±1`. Un test le pinne.
2. Compter les signes dans `absorbFactor` seul **rate `−(−x)`** : le `−` de
   tête est consommé par `flattenSumShallow` et n'atteint jamais la
   décomposition. Le compteur part donc du signe porté par la somme.

🔴 **Le bloquant : la règle centrale n'était couverte par aucun test.** La revue
l'a prouvé en remplaçant « exactement une famille » par « au moins une » —
**360 tests sur 360 restaient verts**. Deux tests l'épinglent maintenant, et
j'ai rejoué la mutation : ils passent au rouge.

### Deux choix que j'assume, contre l'avis de la revue

- `x·(−2) → −2x` passe sous le filet plutôt que « on simplifie les signes ». Un
  seul signe est porté, rien n'est simplifié. Réversible en une ligne.
- `0,5+0,25 → 1/2+1/4 → 3/4` : la revue y voyait la classe de défaut du lot 1
  (`(1/200) m`). Ce n'en est pas une — la réponse finale de `tidy` **est** `3/4`,
  une fraction, et c'est son comportement d'origine ; `1/2+1/4 = 3/4` est une
  écriture qu'un élève pose. Ajouté au panel pour être couvert.

## État

- [x] Contrat écrit en tests rouges : 8 rouges / 123 verts
- [x] Implémentation (`mathast-expert`, Opus) — 5 gestes, filet `tidy-terms` conservé
- [x] Revue `code-reviewer` (Opus) : 10 findings, tous traités ou tranchés
- [ ] `check:incremental` + `lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé

## Invariants, non négociables (repris du lot 1)

1. Le résultat de `tidy(x)` **ne bouge pas** — les 333 tests de `tidy/` restent
   verts **sans être touchés**.
2. Narration gratuite quand personne n'écoute.
3. Chaque étape est une vraie expression ; la chaîne part de ce que l'élève a
   écrit et recolle sur `tidy(x)`.
4. Le silence veut dire « rien n'a bougé », vérifié par `nodesEqual`.
