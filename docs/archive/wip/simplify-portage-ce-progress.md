# `simplify()` : portage fidèle du Compute Engine

> Chantier : `fix/simplify-portage-ce` — worktree `../ubumaths-wt-portage`.

## Le constat

`cost.ts` disait « **Inspired by** Compute Engine / Mathematica cost heuristics »
et **inventait ses constantes**. Historique vérifié :

- commit fondateur `47c9cd488`, **7 février 2026** — 1859 lignes sur 24 fichiers
  en une fois ;
- `extern/compute-engine` (v0.30.2) était présent depuis le **28 novembre 2025**,
  soit deux mois et demi avant : la source était disponible et n'a pas été
  ouverte ;
- `cost.ts` a **trois commits en sept mois** — création, un correctif le
  lendemain, un passage de typecheck. Les poids n'ont jamais été réglés ;
- `cheapest` portait le **nom** de la fonction de CE mais pas son contenu, et
  n'avait **aucun appelant**.

Cause de fond : `simplify()` n'a que **deux appelants** (la commande `.simplify`
du REPL et `simplifyExact` du grapheur), donc aucun consommateur visible ne
réclamait de qualité. Même mécanisme que la règle `common-factor` qui parlait
anglais, et que `pythagorean` qui ne se déclenche jamais.

## Ce qui est porté

|                           | avant (inventé)                | après (porté)                               |
| ------------------------- | ------------------------------ | ------------------------------------------- |
| addition / soustraction   | 2 / 2                          | **3 / 4**                                   |
| opposé                    | 1                              | **4** (`Negate`)                            |
| multiplication / division | 3 / 4                          | **7 / 8**                                   |
| racine                    | 3                              | **5**                                       |
| log, exp                  | 5                              | **9**                                       |
| sin, cos, tan             | 5                              | **10**                                      |
| tout le reste             | 6                              | **11**                                      |
| nombre                    | `1 + 0,5×(chiffres−2)`         | **nombre de chiffres** (`42` → 2)           |
| `cheapest`                | symétrique, égalité au premier | **directionnel, biais 1,2 vers le nouveau** |
| barème sur mesure         | impossible                     | **`simplify(node, { costFunction })`**      |

Le barème injectable est l'échappatoire **documentée** de CE (« To influence how
the complexity of an expression is measured, set the `costFunction` property »).
C'est par là que passera un barème scolaire, sans toucher au défaut ni à ses
deux appelants.

## Les trois écarts, assumés et documentés

1. **La puissance — le seul poids qu'on ne porte pas.** CE ne la facture pas
   (« we want 2q^2 to be less expensive than 2qq, so we ignore the exponent » ;
   leur code, lui, rend `costFunction(ops[1])` = l'EXPOSANT, donc il ignore la
   BASE : il fait l'inverse de son commentaire). **Mesuré** : porté tel quel,
   `x^2` coûte 1 comme `x`, donc `x² + x²` coûte aussi peu que `x + x` — et
   `x² + x² → 2x²` cesse d'être retenu (un test de `simplify.test.ts` est passé
   au rouge sur exactement ça). Ce poids ne tient que dans LEUR architecture, où
   la forme canonique remplace l'expression avant que le coût n'arbitre. Leur
   but est atteint autrement : `2x²` (13) < `2·x·x` (17), grâce à Multiply = 7.

2. **Le signe des nombres.** CE pénalise un littéral négatif (`n > 0 ? 1 : 2`).
   Branche inatteignable chez nous : la fabrique **refuse** `number('-5')`, et
   `-5` se lit `opposite(number('5'))`. Le surcoût est porté par `opposite` (4).

3. **Les nœuds que CE n'a pas.** Leur règle générale est « tout le reste coûte
   11 ». Appliquée, sauf pour ce qui n'est pas une OPÉRATION : parenthèses
   (structurelles, gratuites), indice (`x_1` est un nom), unité (la facturer 11
   pousserait `simplify` à dépouiller `12[km]` de son unité).

## Défaut révélé : l'opposé d'une somme perdait ses parenthèses

Le test `abs-sign` est passé au rouge en annonçant `-x + 2` au lieu de
`-x - 2`. La trace :

```
abs-negative   : |x + 2|  →  opposite(add(x, 2))     ← nœud CORRECT : −(x+2)
post-normalize : …        →  -x - 2
```

Le nœud était juste. **`toLatex` perdait les parenthèses** : `opposite(add(x, 2))`
s'écrivait `"-x + 2"`, chaîne qui se relit `(−x) + 2` — une autre expression.
Idem `toCustom` (`"-x+2"`). Le portage n'a rien cassé : il a changé quelle forme
gagne, et a mis la mauvaise écriture sous les yeux.

Invisible jusqu'ici parce qu'un `-(x+2)` **écrit à la main** porte un nœud
`delimiter` explicite, et parce que la normalisation distribue le signe. Seule
une RÈGLE construisant `opposite(somme)` directement l'expose. Même famille de
piège que les parenthèses obligatoires de la mise en facteur commun : nos
générateurs s'appuient sur des `delimiter` explicites.

Corrigé dans les deux générateurs via `common/sign-parentheses.ts`, avec un test
d'aller-retour par le parseur — **ce qu'on écrit doit se relire comme ce qu'on
a écrit**.

## Rayon d'impact

**3 tests sur 33 575**, tous des tests qui enregistraient l'ancien état :

| test                                 | gravait               | maintenant       |
| ------------------------------------ | --------------------- | ---------------- |
| `computeCost(number('42'))`          | `1`                   | `2`              |
| `cheapest` rend le premier à égalité | sémantique symétrique | le NOUVEAU gagne |
| `\|x + 2\| → -x - 2`                 | forme distribuée      | `-(x + 2)`       |

Le troisième : les deux écritures sont justes ; le barème porté préfère celle
qui ne porte **qu'un** opérateur de signe (Negate 4) plutôt que deux
(Negate 4 + Subtract 4). CE ferait le même choix.

## Ce que le portage NE fait PAS

`x + x` et `√8` restent inchangés. **Mesuré : CE refuserait la même
réécriture** — `x+x` coûte 5, `2x` coûte 9, même avec le biais de 1,2.

Ces deux cas ne viennent pas du barème mais de la **position de la barrière** :
chez nous `best` démarre sur l'ENTRÉE (`rewriting-engine.ts`, ligne 160), donc
la forme normalisée doit la battre au coût ; chez CE la forme canonique
remplace l'expression **sans contrôle de coût**, et le coût n'arbitre qu'entre
règles.

⚠️ **Et cette partie-là n'est pas portable telle quelle.** Vérifié : notre
`normalize()` **développe** —

```
(x+1)^2      → x^2 + 2x + 1
(x+1)*(x-1)  → x^2 - 1
x*(x+1)      → x^2 + x
```

— alors que la forme canonique de CE ne développe pas. Ce ne sont pas le même
objet. Porter leur barrière demanderait d'abord de **scinder `normalize` en une
passe canonique sans développement** (regroupement des termes semblables,
réduction des fractions, extraction des radicaux) et de laisser le
développement aux règles, sous la barrière. C'est un chantier mathAST à part
entière, et une décision d'architecture. **À trancher par David.**

Mesuré aussi, pour situer l'enjeu : en retirant complètement la barrière
(stratégie `deterministic`), `x+x → 2x` et `√8 → 2√2` marchent, mais
`(x+1)² → x² + 2x + 1` et `3(x+1)²×2 → 6x² + 12x + 6` cassent. La barrière
protège donc réellement la forme factorisée dont l'étude de signe a besoin :
elle ne se retire pas, elle se déplace.

## Dettes notées, pas traitées

- **`simplify('12[km]')` rend `12`** : l'unité est perdue. Pré-existant,
  vérifié identique avant le portage.
- **La règle `pythagorean` ne se déclenche jamais** : chargée par `simplify()`
  (elle est dans `SIMPLIFY_PYTHAGOREAN` → `trigSimplifyRules`), décrite à quatre
  niveaux scolaires, et `sin(x)² + cos(x)²` reste inchangé dans les deux ordres
  de termes, avant et après normalisation (`fired: []`). Pré-existant.
- **`cheapest` n'a toujours aucun appelant** — gardée parce qu'elle est
  désormais conforme, et qu'elle est l'outil naturel d'un futur barème scolaire.
