# Donner une voix à `tidy` — phase 0 : les comportements attendus, à valider

> Branche `refactor/tidy-voix`, worktree `../ubumaths-wt-tidy-voix`.
> Étape 1 du bilan du 2026-09-21. **Rien n'est codé.** Chaque ligne validée
> deviendra un test rouge.
> Contrat de `tidy` : [tidy-phase0.md](tidy-phase0.md) §A (validé le 2026-09-20).

## Le constat

`tidy` ne produit aucune étape : il n'y a pas un seul `recorder` dans
`src/lib/mathAST/tidy/`. `simplify` émet une phase `'tidy'`, **une seule**,
pour toute la passe.

Et ce n'est pas un oubli. `tidy` ne réécrit pas, il **décompose, accumule,
reconstruit** :

```ts
tidyExpression = buildSum(sortTerms(chooseUnits(collectLikeTerms(toSumTerms(node)))));
```

L'état intermédiaire n'est pas un AST, c'est un `TidyTerm[]`. On ne montre pas
un accumulateur à un élève.

**Mais `buildSum` peut être appelé à n'importe quel point du pipeline.** C'est
la clé : on matérialise un AST entre deux stages, et l'expression intermédiaire
existe. Le refactor est donc partiel, pas total.

## Ce qui est bon marché, et ce qui ne l'est pas

| geste                           | où il vit                             | coût                          |
| ------------------------------- | ------------------------------------- | ----------------------------- |
| regrouper les termes semblables | `collectLikeTerms`, stage du pipeline | **matérialiser entre stages** |
| ranger                          | `sortTerms`, stage du pipeline        | **matérialiser entre stages** |
| écrire dans la bonne unité      | `chooseUnits`, stage du pipeline      | **matérialiser entre stages** |
| calculer les nombres            | `absorbRational`, dans `toTerm`       | ouvrir la décomposition       |
| simplifier les radicaux         | `absorbSquareRoot`, dans `toTerm`     | ouvrir la décomposition       |
| regrouper les facteurs          | `absorbFactor`, dans `toTerm`         | ouvrir la décomposition       |
| signes et neutres               | `toTerm` + `removeSignsAST`           | ouvrir la décomposition       |

`toTerm` traite **un terme à la fois**, pendant la décomposition. Les quatre
gestes du bas y sont enfouis ensemble.

D'où deux lots, et le premier vaut déjà d'être livré seul.

## Lot 1 — matérialiser entre les stages

Trois gestes, sans toucher à l'architecture.

**Cas nominal**

```
3x + 2x - x
→ 4x                      « on regroupe les termes semblables »
```

```
2 + x^2 + x
→ x^2 + x + 2             « on range par degré décroissant »
```

```
12[km] + 500[m]
→ 12,5 km                 « on écrit dans la même unité »
```

**Cas où l'on ne dit rien.** Un geste qui ne change pas l'écriture n'est pas une
étape : `x + y` ne produit ni « on regroupe » ni « on range ». Comparaison
structurelle (`nodesEqual`), pas de référence — la leçon du finding F4 de la
PR #379.

**Cas limite** — un seul terme (`5x`) : aucune étape, la sortie est l'entrée.

## Lot 2 — ouvrir la décomposition

Quatre gestes de plus, au niveau du facteur.

**Cas nominal**

```
2 · 3 · x
→ 6x                      « on calcule les nombres »

2/6 + 1/4
→ 7/12                    « on met au même dénominateur et on calcule »

√8
→ 2√2                     « on extrait du radical les facteurs qui sont des carrés parfaits »

x · x · x
→ x³                      « on regroupe les facteurs de même base »

-(-x)
→ x                       « on simplifie les signes »
```

**Ordre proposé** : au sein d'un terme, les nombres d'abord, puis les radicaux,
puis les facteurs, puis les signes — c'est l'ordre du code, et c'est aussi celui
qu'un élève suit.

**Cas limite — plusieurs termes changent en même temps.** `√8 + √12` doit
donner **une** étape « on extrait les carrés parfaits », pas deux : le geste est
le même, appliqué partout. Une étape = une famille, pas une occurrence.

**Cas d'erreur** — ce que `tidy` ne sait pas traiter ressort tel quel (invariant
du contrat, `RangeError` seule rattrapée). Aucun geste n'est raconté sur un
nœud opaque : `∞ − ∞` ne produit aucune étape.

## Les invariants, non négociables

1. **Le résultat ne bouge pas.** `tidy(x)` rend exactement la même chose
   qu'aujourd'hui, avec ou sans narration. 154 tests + 36 tests de revue
   l'épinglent — ils doivent rester verts sans être touchés.
2. **La narration est optionnelle et sans coût quand elle est éteinte.** Pas de
   `buildSum` supplémentaire si personne n'écoute.
3. **Chaque étape est une vraie expression.** `étape[i].après` doit être un AST
   qu'un élève pourrait écrire, et `étape[i].après === étape[i+1].avant`.
4. **La chaîne recolle.** La dernière étape rend `tidy(x)`. Un test le vérifie
   sur tout le panel — sans quoi la réponse et l'explication divergent, chacune
   verte de son côté.
5. **Idempotence conservée** : `tidy(tidy(x))` structurellement égal à `tidy(x)`.

## Ce que ça débloque

`réduire` cesse d'être muet, et `auto` peut raconter sa mise au propre. Sans ça,
les étapes 2 à 6 du bilan n'ont rien sur quoi s'appuyer.

## À valider par David

- Les 7 gestes et leurs phrases françaises.
- La règle « une étape = une famille, pas une occurrence ».
- La règle « un geste qui ne change pas l'écriture n'est pas une étape ».
- Le découpage en deux lots, et le fait que le lot 1 parte seul en PR.
