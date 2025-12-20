# Syntaxe des Tableaux de Variation

Reference complete de la syntaxe markdown pour les tableaux de variation.

## Structure de base

Un tableau de variation est defini dans un bloc de code avec le langage `variation` :

````markdown
```variation
variable: x
domain: -inf, 0, +inf

sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -

variation: f(x)
  -inf: -inf, bottom
  0: 3, top
  +inf: -inf, bottom
```
````

## Elements requis

### Variable

Definit la variable d'etude (generalement `x` ou `t`).

```
variable: x
variable: t
variable: \theta
```

### Domaine

Liste ordonnee des points du domaine, separes par des virgules.

```
domain: -inf, 0, +inf
domain: 0, 1, 2, 3, 4
domain: -inf, -1, 0, 1, +inf
```

**Valeurs speciales :**

- `-inf` : Moins l'infini
- `+inf` ou `inf` : Plus l'infini

**Bornes ouvertes/fermees :**

```
domain: ]-inf, 0[, ]0, +inf[
```

- `]` ou `(` devant : borne ouverte a gauche
- `[` ou `)` apres : borne ouverte a droite

## Lignes de signe

Format : `sign: label` suivi d'entrees indentees.

```
sign: f'(x)
  -inf,0: +
  0: z
  0,+inf: -
```

### Cles

| Format          | Description                  |
| --------------- | ---------------------------- |
| `point1,point2` | Intervalle entre deux points |
| `point`         | Valeur au point exact        |

### Valeurs de signe

| Symbole    | Signification | Rendu           |
| ---------- | ------------- | --------------- | ------------------- | ------------ |
| `+`        | Signe positif | +               |
| `-`        | Signe negatif | -               |
| `z` ou `0` | Zero          | 0               |
| `          |               | `               | Asymptote verticale | Double barre |
| `          | h             | `               | Zone interdite      | Hachures     |
| `d`        | Discontinuite | "d" en italique |

### Exemples

```
sign: f'(x)
  -inf,-1: +        # Positif sur ]-inf, -1[
  -1: z             # Zero en x = -1
  -1,0: -           # Negatif sur ]-1, 0[
  0: ||             # Asymptote en x = 0
  0,+inf: +         # Positif sur ]0, +inf[

sign: g(x)
  -inf,2: -
  2: |h|            # Non defini en x = 2
  2,+inf: +
```

## Lignes de variation

Format : `variation: label` suivi d'entrees indentees.

```
variation: f(x)
  -inf: -inf, bottom
  -1: 3, top
  0: 0, center
  +inf: +inf, top
```

### Format des valeurs

```
point: expression, position
```

| Position       | Description          | Placement              |
| -------------- | -------------------- | ---------------------- |
| `top`          | Maximum local        | Haut de la cellule     |
| `bottom`       | Minimum local        | Bas de la cellule      |
| `center`       | Valeur intermediaire | Centre                 |
| `limit-top`    | Limite par le haut   | Haut (pour asymptotes) |
| `limit-bottom` | Limite par le bas    | Bas (pour asymptotes)  |

### Asymptotes avec limites

Pour une asymptote verticale avec limites differentes a gauche et a droite :

```
variation: f(x)
  0: ||, -inf, +inf
```

Format : `point: ||, limite_gauche, limite_droite`

### Exemples complets

```
variation: f(x)
  -inf: 0, center           # Limite en -inf = 0
  -2: 4, top                # Maximum local f(-2) = 4
  0: ||, -inf, +inf         # Asymptote: lim gauche = -inf, lim droite = +inf
  2: -1, bottom             # Minimum local f(2) = -1
  +inf: 0, center           # Limite en +inf = 0

variation: g(x)
  -inf: +inf, top           # Limite en -inf = +inf
  1: 0, bottom              # Minimum g(1) = 0
  +inf: +inf, top           # Limite en +inf = +inf
```

## Expressions mathematiques

Les expressions LaTeX sont supportees dans le domaine et les valeurs :

```
domain: -inf, \frac{\pi}{2}, \pi, +inf

sign: f'(x)
  -inf,\frac{\pi}{2}: +

variation: f(x)
  -inf: -1, bottom
  \frac{\pi}{2}: 1, top
  \pi: 0, center
```

## Tableau complet

Exemple avec plusieurs lignes de signe et de variation :

````markdown
```variation
variable: x
domain: -inf, -2, 0, 2, +inf

sign: x+2
  -inf,-2: -
  -2: z
  -2,+inf: +

sign: x-2
  -inf,2: -
  2: z
  2,+inf: +

sign: f'(x)
  -inf,-2: +
  -2: z
  -2,0: -
  0: z
  0,2: -
  2: z
  2,+inf: +

variation: f(x)
  -inf: -inf, bottom
  -2: 5, top
  0: 0, center
  2: -5, bottom
  +inf: +inf, top
```
````

## Erreurs courantes

### Manque d'indentation

```
# INCORRECT
sign: f'(x)
-inf,0: +

# CORRECT
sign: f'(x)
  -inf,0: +
```

### Intervalle mal forme

```
# INCORRECT (pas de virgule)
sign: f'(x)
  -inf 0: +

# CORRECT
sign: f'(x)
  -inf,0: +
```

### Position manquante

```
# INCORRECT
variation: f(x)
  -inf: -inf

# CORRECT
variation: f(x)
  -inf: -inf, bottom
```

## Reference rapide

| Element                | Syntaxe                        |
| ---------------------- | ------------------------------ | --- | ------------------------- |
| Variable               | `variable: x`                  |
| Domaine simple         | `domain: -inf, 0, +inf`        |
| Domaine avec bornes    | `domain: ]-inf, 0[, ]0, +inf[` |
| Ligne de signe         | `sign: f'(x)`                  |
| Signe sur intervalle   | `  point1,point2: +`           |
| Marqueur au point      | `  point: z`                   |
| Ligne de variation     | `variation: f(x)`              |
| Valeur avec position   | `  point: valeur, position`    |
| Asymptote avec limites | ` point:                       |     | , lim_gauche, lim_droite` |
