# `aire_entre(f, g, a, b)` — aire géométrique entre deux courbes

Le builtin `aire_entre` calcule l'aire géométrique de la région du plan
comprise entre deux courbes `y = f(x)` et `y = g(x)` sur l'intervalle
`[a, b]`, et trace simultanément cette zone. La valeur retournée est
**toujours ≥ 0**.

> **Vocabulaire — important**
>
> L'aire entre deux courbes `f` et `g` sur `[a, b]` est définie comme :
>
> ```
> aire_entre(f, g, a, b) = ∫ₐᵇ |f(x) − g(x)| dx
> ```
>
> Quand `f` et `g` se croisent dans `(a, b)`, la formule split sur les
> zéros de `f − g` pour additionner les contributions absolues sur
> chaque sous-région.
>
> **Cas pédagogique classique de Terminale spé maths** : aire entre
> `y = x²` et `y = x` sur `[0, 1]` (égale à `1/6`), aire entre
> `y = sin(x)` et `y = cos(x)` entre deux intersections consécutives
> (égale à `2√2`).

---

## Syntaxe

```
A = aire_entre(f, g, a, b)
A = aire_entre(f, g, a, b, couleur="rouge", opacite_fond=0.4)
```

### Arguments positionnels

| Position | Argument | Type                                                                    |
| :------: | -------- | ----------------------------------------------------------------------- |
|    1     | `f`      | une `GeoFunction` créée par `courbe("y=...")`                           |
|    2     | `g`      | une `GeoFunction` créée par `courbe("y=...")`                           |
|    3     | `a`      | nombre littéral OU référence à un scalaire (`slider`, `distance`, etc.) |
|    4     | `b`      | nombre littéral OU référence à un scalaire                              |

### Arguments nommés (style de la zone)

Tous les args nommés s'appliquent à la **zone visuelle** (pas au scalaire) :

| Argument       | Effet                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| `couleur`      | couleur principale (nom français ou `#hex`). Défaut : **orange**       |
| `opacite_fond` | opacité du remplissage (0..1, défaut `0.30`)                           |
| `remplissage`  | couleur de remplissage si différente de `couleur`                      |
| `trait`        | style du contour (`"continu"`, `"tirets"`, `"pointilles"`)             |
| `epaisseur`    | épaisseur du contour                                                   |
| `etiquette`    | label du scalaire (utilisé dans `mesure(...)` et le panneau Inspector) |

> **Couleur par défaut orange** : `aire_entre` utilise `#fb923c` (orange) par
> défaut. Cela complète la triade :
> [bleu (`integrale`)](./integrale.md) /
> [vert (`aire`)](./aire.md) / orange (`aire_entre`).
> Les trois mesures distinctes peuvent ainsi cohabiter visuellement
> sur la même figure pédagogique.

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

### Cas pédagogique classique : aire entre `x²` et `x`

```
f = courbe("y = x^2")
g = courbe("y = x^3")
A = aire_entre(f, g, 0, 1)     // = 1/12 (h ≥ 0 sur (0, 1))
mesure(A)                      // affiche 0.083
```

### Aire entre sin(x) et cos(x) (avec changement de signe)

```
f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
A = aire_entre(f, g, 0.7853981633974483, 3.9269908169872414)
                                // ≈ 2.828 = 2√2
mtexte(2, 1.5, "Aire = {A:.3f} \\approx 2\\sqrt{2}")
```

`f` et `g` se croisent en `π/4` et `5π/4` (les deux bornes données).
Entre les deux, `sin(x) > cos(x)` (pas de changement de signe interne),
donc une seule sous-région.

### Avec sliders réactifs

```
f = courbe("y = x^2")
g = courbe("y = x^3")
a = slider(min=-2, max=2, valeur=-1)
b = slider(min=-2, max=2, valeur=2)
A = aire_entre(f, g, a, b, couleur="rouge", opacite_fond=0.5)
```

Quand on bouge `a` ou `b` à travers les intersections (en `0` et `1`),
le builtin détecte automatiquement le changement de signe de `f − g`
et split la zone visuelle en sous-régions correspondantes.

### Aire identique à `aire(f − g)` mathématiquement

```
f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
fg = courbe("y = sin(x) - cos(x)")
A1 = aire_entre(f, g, 0, 6.283185307179586)
A2 = aire(fg, 0, 6.283185307179586)
// A1 == A2 (même valeur, mais visuels différents)
```

### Cas dégénéré : `f ≡ g`

```
f = courbe("y = x^2")
A = aire_entre(f, f, 0, 1)     // = 0 (deux courbes identiques)
```

Aucune zone n'est dessinée ; le scalaire vaut `0`.

### Bornes inversées

```
f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
A = aire_entre(f, g, 5, 1)     // = aire_entre(f, g, 1, 5)
```

Pour `aire_entre`, l'orientation des bornes est ignorée :
`aire_entre(f, g, a, b) == aire_entre(f, g, b, a)`.

---

## Visuel

- La zone est délimitée par : la courbe `f`, la courbe `g`, et les
  droites verticales `x = min(a, b)` et `x = max(a, b)`.
- La zone est splittée sur les zéros de `f − g` à l'intérieur de
  l'intervalle (calcul interne pour la formule), mais rendue avec une
  **teinte uniforme** sur toutes les sous-régions.
- Couleur par défaut : orange (`#fb923c`).
- La z-order place la zone **sous** les courbes `f` et `g`, qui passent
  par-dessus.

Différence visuelle clé avec `aire` et `integrale` : ces derniers
ferment leur zone via l'**axe `y = 0`**, tandis que `aire_entre` ferme
via la **courbe `g`** (parcourue à l'envers pour fermer le polygone).

---

## Sémantique

### Formule

```
aire_entre(f, g, a, b) = Σ |H(x_{i+1}) − H(x_i)|
```

avec `H` = primitive de `h = f − g`, `x_0 = min(a, b)`,
`x_{n+1} = max(a, b)`, et `x_1 < ... < x_n` les zéros de
`h = f − g` dans l'intervalle `(x_0, x_{n+1})`.

Mathématiquement équivalent à `aire(f − g, a, b)` (voir
[`aire(f, a, b)`](./aire.md)). Le builtin existe parce que **l'API DSL**
et le **rendu visuel** diffèrent (la zone est entre `f` et `g`, pas
entre une courbe et l'axe).

### Bornes inversées

`aire_entre(f, g, a, b)` avec `a > b` retourne la même valeur que
`aire_entre(f, g, b, a)`. Cohérent avec `aire`.

### Bornes égales

`aire_entre(f, g, c, c)` retourne `0`.

### Cas `f ≡ g`

`aire_entre(f, f, a, b)` retourne `0` (et ne dessine rien). La même
fonction passée deux fois est autorisée — utile pour vérifier
pédagogiquement que la formule est cohérente.

### Calcul interne

- À la création, l'antidérivée `H(x)` de `h = f − g` est calculée
  **symboliquement**. Si elle existe en forme close, elle est compilée
  et mise en cache. La même infrastructure que [`aire`](./aire.md) est
  réutilisée.
- À chaque ré-évaluation (mouvement de slider), les zéros de `h` dans
  l'intervalle courant sont détectés via `findRoots` (hybride exact +
  bisection numérique), puis la somme `Σ |H(x_{i+1}) − H(x_i)|` est
  calculée en évaluant `H` aux points de découpe.
- Si l'antidérivée n'existe pas en forme close, le calcul utilise la
  méthode de **Simpson adaptative par sous-intervalle** sur `h`
  (précision ≈ 10⁻⁶, coût ~1-2 ms typique).

### Singularités et NaN-on-divergence

Si `f` ou `g` ou `f − g` a une discontinuité divergente (asymptote
verticale) dans `[a, b]`, le scalaire évalue à **`NaN`** et un
`console.warn` est émis (préfixe `aire_entre ligne X:`).

Exemple :

```
f = courbe("y = 1/x")
g = courbe("y = sin(x)")
A = aire_entre(f, g, -1, 1)    // NaN, warn console
```

L'analyse rigoureuse de continuité (`analyzeContinuity`) est appliquée
sur `f` et `g` séparément à la création (deux warns possibles), puis le
cache des discontinuités de `h = f − g` est consulté à chaque évaluation
pour décider du retour `NaN`.

---

## Cas limites — responsabilité de l'utilisateur

### Bornes infinies

Non supportées en V1. Les bornes doivent être finies.

### Aire entre 3+ courbes ou domaines non connexes

Hors scope V1. Pour calculer une aire compliquée, splittez manuellement :

```
f = courbe("y = x^2")
g = courbe("y = sin(x)")
h = courbe("y = cos(x)")
// aire(f, g, h sur [0, π]) = aire entre la max et la min
// → l'utilisateur doit identifier les régions et sommer
A1 = aire_entre(f, g, 0, 1)
A2 = aire_entre(g, h, 1, 2)
total = A1 + A2  // composition manuelle
```

### Détection automatique des intersections

Non supportée en V1. L'utilisateur fournit `[a, b]` explicitement. Pour
trouver les intersections programmatiquement, utiliser `intersection(f, g)`
sur les fonctions et inspecter les coordonnées.

---

## Voir aussi

- [`aire(f, a, b)`](./aire.md) — aire entre une courbe et l'axe des x.
- [`integrale(f, a, b)`](./integrale.md) — intégrale signée
  (peut être négative).
- [`courbe(...)`](./courbe.md) — création de la fonction `f` ou `g`.
- [`mesure(A)`](./mesure.md) — affichage du scalaire sur la figure.
- [`slider(...)`](./slider.md) — création d'un curseur pour les bornes
  dynamiques.

## Référence interne

- Étude de conception : `docs/wip/geometry/aire-entre-study.md`.
- Document de progression : `docs/wip/geometry/aire-entre-progress.md`.
- Page de démo :
  [`/geometry-demo/sliders/aire-entre`](/geometry-demo/sliders/aire-entre)
  — visualise le cas `sin(x) vs cos(x)` sur `[π/4, 5π/4]` = 2√2.
