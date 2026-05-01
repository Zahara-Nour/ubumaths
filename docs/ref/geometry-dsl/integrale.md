# `integrale(f, a, b)` — calcul et visualisation de l'intégrale

Le builtin `integrale` calcule la valeur de l'intégrale d'une fonction sur un
intervalle, et trace simultanément la zone correspondante entre la courbe et
l'axe des x.

> **Vocabulaire — important**
>
> - L'**intégrale** ∫ₐᵇ f(x) dx = F(b) − F(a) est une valeur algébrique qui
>   peut être positive, négative ou nulle.
> - L'**aire** d'une région du plan est une grandeur géométrique toujours
>   positive.
> - Les deux coïncident **uniquement si f ≥ 0 sur [a, b]**. Si f ≤ 0 sur
>   tout l'intervalle, alors aire = −∫ₐᵇ f.
>
> Le builtin `integrale` calcule l'**intégrale** (signée). Il peut donc
> retourner une valeur négative.

---

## Syntaxe

```
A = integrale(f, a, b)
A = integrale(f, a, b, couleur="rouge", opacite_fond=0.4)
```

### Arguments positionnels

| Position | Argument | Type                                                                    |
| :------: | -------- | ----------------------------------------------------------------------- |
|    1     | `f`      | une `GeoFunction` créée par `courbe("y=...")`                           |
|    2     | `a`      | nombre littéral OU référence à un scalaire (`slider`, `distance`, etc.) |
|    3     | `b`      | nombre littéral OU référence à un scalaire                              |

### Arguments nommés (style de la zone)

Tous les args nommés s'appliquent à la **zone visuelle** (pas au scalaire) :

| Argument       | Effet                                                      |
| -------------- | ---------------------------------------------------------- |
| `couleur`      | couleur principale (nom français ou `#hex`)                |
| `opacite_fond` | opacité du remplissage (0..1, défaut `0.30`)               |
| `remplissage`  | couleur de remplissage si différente de `couleur`          |
| `trait`        | style du contour (`"continu"`, `"tirets"`, `"pointilles"`) |
| `epaisseur`    | épaisseur du contour                                       |

### Retour

`A` est un **scalaire** réactif (la valeur de l'intégrale). Il s'utilise
comme tout autre scalaire :

- `mesure(A)` — affiche la valeur près de la zone.
- `texte(P, "valeur = {A:.2f}")` — affichage personnalisé.
- `mtexte(...)` — formule LaTeX avec valeur interpolée.
- comme borne d'une autre `integrale` ou comme entrée d'un calcul.

La zone visuelle est créée automatiquement et liée au scalaire ; elle suit
les mouvements de `a` et `b`.

---

## Exemples

### Calcul simple

```
f = courbe("y = x^2")
A = integrale(f, 0, 1)
mesure(A)              // affiche ≈ 0.33
```

### Bornes interactives

```
f = courbe("y = sin(x)")
a = slider(min=-3, max=0, valeur=-2)
b = slider(min=0, max=3, valeur=2)
A = integrale(f, a, b, couleur="bleu", opacite_fond=0.4)
mtexte(2, 1.5, "\\int_{a}^{b} \\sin(x)\\, dx = {A:.3f}")
```

### Bornes inversées

```
f = courbe("y = x^2")
A = integrale(f, 1, 0)    // = -1/3 ≈ -0.33 (signé)
```

### Borne dérivée d'une autre construction

```
f = courbe("y = x")
O = point(0, 0)
P = point(2, 0)
b = distance(O, P)        // borne dynamique : bouger P met à jour A
A = integrale(f, 0, b)
```

### Fonction qui change de signe

```
f = courbe("y = x^3 - x")
A = integrale(f, -1, 1)    // = 0 (les deux régions s'annulent)
```

Visuellement, les sous-régions où `f > 0` (ici sur `[-1, 0]`) sont rendues
en teinte pleine, et celles où `f < 0` (ici sur `[0, 1]`) en teinte plus
claire (opacité réduite de 50 %).

### Cas non-élémentaire

```
f = courbe("y = exp(-x^2)")
A = integrale(f, -1, 1)    // ≈ 1.4937 (calculé numériquement)
```

L'intégrale de la gaussienne n'a pas d'antidérivée élémentaire. Le calcul
bascule automatiquement sur la méthode de Simpson adaptative (précision
≈ 10⁻⁶).

---

## Visuel

- La zone est délimitée par : la courbe `f`, l'axe des x, et les droites
  verticales `x = a` et `x = b`.
- La zone est splittée sur les zéros de `f` à l'intérieur de `[a, b]` :
  - Sous-régions où `f > 0` : couleur pleine au `opacite_fond` choisi.
  - Sous-régions où `f < 0` : même couleur, opacité divisée par 2 (teinte
    plus claire).
- La z-order place la zone **sous** la courbe `f`, qui passe par-dessus.

---

## Sémantique

### Bornes inversées

`integrale(f, a, b)` avec `a > b` retourne l'opposé de `integrale(f, b, a)` :

> ∫ᵇₐ f(x) dx = −∫ₐᵇ f(x) dx

Convention mathématique standard, supportée nativement.

### Bornes égales

`integrale(f, c, c)` retourne `0`.

### Calcul interne

- À la création, l'intégrale est calculée **symboliquement** d'abord. Si
  une antidérivée `F(x)` est trouvée, elle est compilée et mise en cache.
- À chaque ré-évaluation (mouvement de slider), seules les valeurs `F(a)`
  et `F(b)` sont recalculées : très rapide (~10 µs).
- Si l'antidérivée n'existe pas en forme close, le calcul utilise la
  méthode de **Simpson adaptative** à chaque ré-évaluation (~0.4 ms).
  La précision est ≈ 10⁻⁶.

---

## Cas limites — responsabilité de l'utilisateur

### Singularités dans `[a, b]` (V1)

`integrale` ne détecte **pas** rigoureusement les discontinuités ou
singularités de `f` sur l'intervalle. Exemple :

```
f = courbe("y = 1/x")
A = integrale(f, -1, 1)    // résultat = 0, mais l'intégrale diverge !
```

Une **heuristique** simple émet un `console.warn` quand l'expression
contient `1/g(x)`, `tan(x)`, `ln(g(x))` ou `sqrt(g(x))` avec un risque de
problème dans `[a, b]`. Mais le calcul ne s'arrête pas, et le résultat
peut être faux.

**Recommandation** : fournir un intervalle où `f` est continue et bien
définie.

### Bornes infinies

Non supportées en V1. Les bornes doivent être finies.

### Aire géométrique (positive)

`integrale` retourne l'**intégrale** signée. Pour calculer l'**aire
géométrique** `∫|f|` (toujours positive), il n'existe pas encore de
builtin dédié — **prévu en V2** sous le nom `aire_sous_courbe(f, a, b)`.

---

## Voir aussi

- [`courbe(...)`](./courbe.md) — création de la fonction `f`.
- [`derivee(f)`](./derivee.md) — fonction dérivée.
- [`mesure(A)`](./mesure.md) — affichage du scalaire sur la figure.
- [`slider(...)`](./slider.md) — création d'un curseur pour les bornes
  dynamiques.

## Référence interne

- Étude de conception : `docs/wip/geometry/integrale-study.md`.
- Document de progression : `docs/wip/geometry/integrale-progress.md`.
