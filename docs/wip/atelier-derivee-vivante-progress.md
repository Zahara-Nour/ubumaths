# `f'` est une référence vivante

Décidé par David le 2026-09-16, après l'avoir essayé à l'écran : `g = f'` doit
créer une fonction traçable qui **suit** `f`.

## Ce que l'élève obtenait avant

Un objet `g` de **type VALEUR**, de définition « f' », présenté comme **sain** —
l'atelier lui proposait « Régler le curseur », comme à un nombre. Il ne valait
rien et ne le disait pas.

## Le chantier était bien plus petit que craint

⚠️ **Le parseur savait déjà tout faire.** `f'` produit
`{type:'function', name:'f', derivativeOrder:1}`, et `referencesOf` voyait
**déjà** la dépendance vers `f`. J'avais annoncé « un chantier : parseur +
modèle de noms » — c'était faux, et le mesurer d'abord a évité d'ouvrir un
chantier inutile.

Deux choses manquaient, exactement :

| Ce qui manquait                                  | Où                                     |
| ------------------------------------------------ | -------------------------------------- |
| La substitution ignorait `derivativeOrder`       | `expressionOf` rendait « f' » tel quel |
| Le type se décidait sur la FORME, pas le contenu | `g = f'` → valeur                      |

## Ce qui a été fait

**`expandDerivatives`** remplace `f'` par la dérivée de `f`, **à chaque
lecture**. C'est ce qui rend la référence _vivante_ : modifier `f` change `g`
sans que l'élève ait à y revenir. `substituteFunction`, lui, laisse `f'(x)`
symbolique — c'est écrit dans sa documentation.

Les apostrophes multiples sont gérées (`f''`), et `f'(2)` évalue la dérivée en
2 plutôt que de rendre la fonction.

**`kindOf` regarde le contenu** quand la forme ne tranche pas : sans paramètre,
une définition qui contient `x` ou une dérivée donne une **fonction**.

**Un calcul libre passe par `expandInput`** : le moteur ne sait pas lier `f'`,
donc l'atelier traduit avant d'appeler — comme pour les noms d'objets.

## Ce qui est vérifié

- `g` **suit** `f` : passer `f` de `x^2-3x+1` à `x^3` fait passer `g` de `2x-3`
  à `3x^2` ;
- `g` passe **en attente** si `f` disparaît, et revient si `f` revient ;
- `f'(2)` vaut **1** dans un calcul ;
- une valeur reste une valeur, une grandeur reste une grandeur, une fonction
  déclarée avec sa variable reste une fonction.
