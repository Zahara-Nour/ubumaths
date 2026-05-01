# `aire(f, a, b)` — calcul et visualisation de l'aire géométrique

Le builtin `aire` calcule l'aire géométrique entre la courbe `f` et l'axe
des x sur l'intervalle `[a, b]`, et trace simultanément la zone
correspondante. Contrairement à `integrale`, l'aire est **toujours
positive** et ne dépend pas de l'orientation des bornes.

> **Vocabulaire — important**
>
> - L'**intégrale** ∫ₐᵇ f(x) dx = F(b) − F(a) est une valeur algébrique qui
>   peut être positive, négative ou nulle.
> - L'**aire** d'une région du plan est une grandeur géométrique
>   **toujours positive**, définie comme ∫ₐᵇ |f(x)| dx (somme des aires
>   absolues des sous-régions où `f` garde un signe constant).
> - Les deux coïncident **uniquement si f ≥ 0 sur [a, b]**.
>
> Le builtin `aire` calcule l'**aire géométrique**. Il retourne donc
> toujours une valeur ≥ 0. Pour l'intégrale signée, voir
> [`integrale(f, a, b)`](./integrale.md).

---

## Syntaxe

```
A = aire(f, a, b)
A = aire(f, a, b, couleur="rouge", opacite_fond=0.4)
```

> **Surcharge** — `aire` existe aussi pour calculer l'aire d'un polygone
> à partir de points : `aire(P1, P2, P3)`. Si le premier argument est
> une `GeoFunction` créée par `courbe(...)` ET il y a exactement
> 3 arguments, le builtin route vers la branche aire-sous-courbe décrite
> ici. Sinon il calcule l'aire d'un polygone.

### Arguments positionnels

| Position | Argument | Type                                                                    |
| :------: | -------- | ----------------------------------------------------------------------- |
|    1     | `f`      | une `GeoFunction` créée par `courbe("y=...")`                           |
|    2     | `a`      | nombre littéral OU référence à un scalaire (`slider`, `distance`, etc.) |
|    3     | `b`      | nombre littéral OU référence à un scalaire                              |

### Arguments nommés (style de la zone)

Tous les args nommés s'appliquent à la **zone visuelle** (pas au scalaire) :

| Argument       | Effet                                                          |
| -------------- | -------------------------------------------------------------- |
| `couleur`      | couleur principale (nom français ou `#hex`). Défaut : **vert** |
| `opacite_fond` | opacité du remplissage (0..1, défaut `0.30`)                   |
| `remplissage`  | couleur de remplissage si différente de `couleur`              |
| `trait`        | style du contour (`"continu"`, `"tirets"`, `"pointilles"`)     |
| `epaisseur`    | épaisseur du contour                                           |

> **Couleur par défaut verte** : `aire` utilise `#22c55e` (vert) par
> défaut, contrairement à `integrale` qui utilise `#1e40af` (bleu). Cela
> permet de distinguer visuellement les deux quand ils sont affichés
> sur la même figure.

### Retour

`A` est un **scalaire** réactif (la valeur de l'aire, **toujours ≥ 0**).
Il s'utilise comme tout autre scalaire :

- `mesure(A)` — affiche la valeur près de la zone.
- `texte(P, "aire = {A:.2f}")` — affichage personnalisé.
- `mtexte(...)` — formule LaTeX avec valeur interpolée.
- comme entrée d'un autre calcul.

La zone visuelle est créée automatiquement et liée au scalaire ; elle
suit les mouvements de `a` et `b`.

---

## Exemples

### Calcul simple (`f ≥ 0`, aire = intégrale)

```
f = courbe("y = x^2")
A = aire(f, 0, 1)              // = 1/3 (positive partout)
mesure(A)                      // affiche 0.33
```

### Différence pédagogique : intégrale signée vs aire

```
f = courbe("y = x^3 - x")
I = integrale(f, -1, 1)        // = 0  (les deux régions s'annulent)
A = aire(f, -1, 1)             // = 0.5 (somme des aires absolues)
mtexte(2, 1.5, "I = {I:.2f},  A = {A:.2f}")
```

Visuellement : `integrale` montre deux sous-régions de teintes
différentes (positive en bleu plein, négative en bleu clair), `aire`
montre la même découpe géométrique mais en teinte verte uniforme.

### Bornes interactives

```
f = courbe("y = sin(x)")
a = slider(min=-3, max=0, valeur=-2)
b = slider(min=0, max=4, valeur=3)
A = aire(f, a, b, couleur="rouge", opacite_fond=0.4)
mtexte(2, 1.5, "\\int_{a}^{b} |\\sin(x)|\\, dx = {A:.3f}")
```

Quand on bouge `a` ou `b`, l'aire est recalculée par splittage sur les
zéros courants de `sin(x)` dans `(a, b)`.

### Bornes inversées

```
f = courbe("y = x^2")
A = aire(f, 1, 0)              // = 1/3 (positive, contrairement à integrale qui donne -1/3)
```

Pour `aire`, l'orientation des bornes est ignorée : `aire(f, a, b) = aire(f, b, a)`.

### Cas non-élémentaire (gaussienne)

```
f = courbe("y = e^{-x^2}")
A = aire(f, -1, 1)             // ≈ 1.4937 (calculé numériquement)
```

L'intégrale de la gaussienne n'a pas d'antidérivée élémentaire. Le calcul
bascule automatiquement sur la méthode de Simpson adaptative par
sous-intervalle (précision ≈ 10⁻⁶).

### Zéro tangent (multiplicité paire)

```
f = courbe("y = (x-1)^2")
A = aire(f, 0, 2)              // = 2/3 (le zéro tangent à x=1 ne corrompt pas le calcul)
```

`f` s'annule en x=1 sans changer de signe (zéro tangent). Le splittage
géométrique reste correct car les deux côtés du zéro ont le même signe.

---

## Visuel

- La zone est délimitée par : la courbe `f`, l'axe des x, et les droites
  verticales `x = min(a,b)` et `x = max(a,b)`.
- La zone est splittée sur les zéros de `f` à l'intérieur de l'intervalle
  (calcul interne pour la formule), mais rendue avec une **teinte
  uniforme** sur toutes les sous-régions (contrairement à `integrale`
  qui teinte différemment selon le signe).
- Couleur par défaut : vert (`#22c55e`).
- La z-order place la zone **sous** la courbe `f`, qui passe par-dessus.

---

## Sémantique

### Formule

```
aire(f, a, b) = Σ |F(z_{i+1}) − F(z_i)|
```

avec `z_0 = min(a, b)`, `z_{n+1} = max(a, b)`, et `z_1 < ... < z_n` les
zéros de `f` dans l'intervalle `(z_0, z_{n+1})`.

### Bornes inversées

`aire(f, a, b)` avec `a > b` retourne la même valeur que `aire(f, b, a)` :
l'aire géométrique ne dépend pas de l'orientation algébrique. C'est la
différence majeure avec `integrale` qui suit la convention
`∫ᵇₐ = −∫ₐᵇ`.

### Bornes égales

`aire(f, c, c)` retourne `0`.

### Calcul interne

- À la création, l'antidérivée `F(x)` est calculée **symboliquement**.
  Si elle existe en forme close, elle est compilée et mise en cache.
- À chaque ré-évaluation (mouvement de slider), les zéros de `f` dans
  l'intervalle courant sont détectés via `findRoots` (hybride exact +
  bisection numérique), puis la somme `Σ |F(z_{i+1}) − F(z_i)|` est
  calculée en évaluant `F` aux points de découpe.
- Si l'antidérivée n'existe pas en forme close, le calcul utilise la
  méthode de **Simpson adaptative par sous-intervalle** (précision
  ≈ 10⁻⁶, coût ~1-2 ms typique).

---

## Cas limites — responsabilité de l'utilisateur

### Singularités dans `[a, b]` (V1)

`aire` ne détecte **pas** rigoureusement les discontinuités ou
singularités de `f` sur l'intervalle. Exemple :

```
f = courbe("y = 1/x")
A = aire(f, -1, 1)             // résultat numérique, mais l'intégrale diverge !
```

Une **heuristique** simple émet un `console.warn` quand l'expression
contient `1/g(x)`, `tan(x)`, `ln(g(x))` ou `sqrt(g(x))` avec un risque
de problème dans `[a, b]`. Mais le calcul ne s'arrête pas, et le
résultat peut être incorrect.

**Recommandation** : fournir un intervalle où `f` est continue et bien
définie.

### Bornes infinies

Non supportées en V1. Les bornes doivent être finies.

### Aire entre deux courbes

Pour calculer l'aire entre deux courbes (`∫ₐᵇ |f(x) − g(x)| dx`), il
n'existe pas encore de builtin dédié. **Prévu en V3** sous le nom
`aire_entre(f, g, a, b)`.

---

## Voir aussi

- [`integrale(f, a, b)`](./integrale.md) — intégrale signée (peut être
  négative).
- [`courbe(...)`](./courbe.md) — création de la fonction `f`.
- [`derivee(f)`](./derivee.md) — fonction dérivée.
- [`mesure(A)`](./mesure.md) — affichage du scalaire sur la figure.
- [`slider(...)`](./slider.md) — création d'un curseur pour les bornes
  dynamiques.

## Référence interne

- Étude de conception : `docs/wip/geometry/aire-study.md`.
- Document de progression : `docs/wip/geometry/aire-progress.md`.
- Page de démo :
  [`/geometry-demo/sliders/aire`](/geometry-demo/sliders/aire) — visualise
  la différence entre `integrale` et `aire` sur la même courbe.
