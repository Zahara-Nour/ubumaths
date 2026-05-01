# Étude — builtin DSL `aire_entre(f, g, a, b)` pour geometry-core

> Phase 0 (étude / spec). Aucune ligne de code de production écrite.
> Livrable : ce document + plan TDD validable + ≤ 5 questions ouvertes.
>
> Source du brief : `docs/wip/geometry/prompt-aire-entre-study.md`.
> S'appuie sur la V1 d'`integrale` et la V2 d'`aire` déjà livrées
> (`integrale-study.md` + `aire-study.md` + `singularity-rigorous-study.md`).

---

## 0. TL;DR

- `aire_entre(f, g, a, b)` calcule l'aire géométrique entre deux courbes
  `y = f(x)` et `y = g(x)` sur `[a, b]` :
  `aire = Σ |∫_{x_i}^{x_{i+1}} (f − g) dx|`, **toujours ≥ 0**, par
  splittage sur les zéros de `f − g` dans `(a, b)`.
- Mathématiquement **identique** à `aire(f − g, a, b)` (déjà livré V2).
  Le compute peut donc reposer entièrement sur l'infra existante
  d'`aire` en travaillant sur `h = f − g`.
- Le **rendu visuel** en revanche est nouveau : path SVG fermé entre les
  deux courbes (et non entre `h` et l'axe `y = 0`). C'est l'essentiel
  du travail nouveau.
- Effort estimé V1 : **5-7 h** (≈ moitié d'`aire` car le compute est
  trivialement réutilisé ; le coût est concentré sur le rendu et un
  nouveau helper SVG).

### Décisions utilisateur enregistrées (2026-05-01)

| #   | Sujet                      | Décision                                                                                                                  |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nom du builtin             | **`aire_entre`** (explicite, lisible — pas de surcharge sur `aire()`).                                                    |
| 2   | Type d'élément             | **Option α étendue** — ajouter `secondFunctionId?` + `differenceExpression?` + `compiledDifference?` à `GeoIntegralArea`. |
| 3   | Sémantique du calcul       | `aire_entre(f, g) = aire(f − g)`. Délègue à l'algo V2 de `aire` sur `h = f − g`.                                          |
| 4   | Bornes inversées (`a > b`) | **`[lo, hi]`** (orientée positif, comme `aire`).                                                                          |
| 5   | Cas `f ≡ g`                | **Retourne `0`, ne dessine rien** (path vide — émerge de `splitOnZeros` qui filtre signe `zero`).                         |
| 6   | Couleur par défaut         | **Orange** (`#fb923c`) — distincte du bleu (`integrale`) et vert (`aire`).                                                |
| 7   | Singularité                | **2 appels** : `warnIfSingularitySuspected` sur `f` et `g` uniquement. Cache `h` passé pour NaN-on-divergence.            |
| 8   | Rendu SVG                  | **Nouveau helper** `integralAreaBetweenToSVG` — sample `f` et `g` séparément, ferme via `g↻`.                             |
| 9   | Refactor des cases DSL     | **Reporté en V4** — duplication minimale Phase 2, factorisation après 3 occurrences observées.                            |
| 10  | Hors scope V1              | Bornes infinies, bornes-points, aire entre 3+ courbes, détection auto du domaine d'intersection.                          |

**→ Phase 0 close. Phase 1 (extension type + factory) peut démarrer.**

---

## 1. Inventaire confirmé (lecture intégrale faite)

### 1.1 `GeoIntegralArea` — `src/lib/geometry-core/types/elements.ts:450-466`

```ts
export interface GeoIntegralArea extends GeoElementBase {
	readonly type: 'integralArea';
	readonly functionId: string;
	readonly lowerBound: ScalarParam;
	readonly upperBound: ScalarParam;
	readonly signed: boolean; // V2 d'aire
	readonly antiderivative: MathNode | null;
	readonly compiledF: CompiledFn | null;
	readonly integrationStatus: 'exact' | 'approximate' | 'unsupported';
	readonly _scalarId: string;
	readonly dependsOn: readonly string[];
}
```

**Pour V3** : ajouter

- `secondFunctionId?: string` — quand présent → mode `aire_entre`.
- `differenceExpression?: MathNode` — `h = f − g` (cache symbolique).
- `compiledDifference?: CompiledFn` — utilisé pour `findRoots` et fallback Simpson.

L'`antiderivative` continue de représenter l'antidérivée de l'intégrand
(c-à-d `H(x)` = primitive de `f − g` quand `secondFunctionId` est
présent, `F(x)` sinon). Pas de double champ — sémantique homogène.

### 1.2 `figure.createIntegralArea` — `src/lib/geometry-core/graph/figure.ts:2856-3141`

Lue intégralement. Structure du compute closure (lignes 2931-3079) :

```ts
const compute = (scalarValues): number => {
  const a = resolveScalarParam(lowerCapture, scalarValues);
  const b = resolveScalarParam(upperCapture, scalarValues);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;

  // 1. Consult cached discontinuities → NaN si divergence
  const interiorSplitPoints = [];
  if (cachedDiscs) {
    const ranged = classifyDiscontinuitiesForRange(cachedDiscs, a, b);
    for (const rd of ranged) {
      if (rd.causesDivergence) return NaN;
      if (rd.atBoundary === 'interior') interiorSplitPoints.push(rd.pointValue);
    }
  }

  if (signed) {
    // V1 : F(b) - F(a) ou Simpson par morceaux
    ...
  }

  // signed = false (aire V2) : Σ |F(z_{i+1}) - F(z_i)| sur zéros de f
  ...
};
```

**Pour V3** : ajouter une 3e branche en début de compute :

```ts
if (secondFunctionId) {
	// mode aire_entre : split sur les zéros de h = f - g (et non de f).
	// Le reste de l'algo est *identique* à signed=false, en utilisant
	// cachedCompiledH et cachedCompiledFAnti (antidérivée de h).
}
```

L'option élégante : le branchement `signed = false` est déjà capable de
faire le travail si on lui présente `h` au lieu de `f`. Donc on
**réécrit la branche unsigned** pour qu'elle utilise `differenceExpression`
ET `differenceCompiled` quand `secondFunctionId` est défini, sinon
`fnExpression` et `fnCompiled` comme aujourd'hui. **Une seule branche, deux
modes**. C'est l'approche minimaliste recommandée.

### 1.3 `case 'aire'` — `src/lib/geometry-core/dsl/builtins.ts:1119-1216`

Confirmé : surcharge déjà présente sur `aire()` qui détecte
`pos.length === 3 && pos[0]` est une `GeoFunction` → mode aire courbe ;
sinon fallback polygone.

**Pour V3** : nouveau `case 'aire_entre'` adjacent. **Pas** de
surcharge sur `aire()` car la signature à 4 args (`f, g, a, b`)
serait ambiguë avec un quadrilatère `aire(P1, P2, P3, P4)`. Décision 1 du TL;DR.

### 1.4 `case 'integrale'` — `src/lib/geometry-core/dsl/builtins.ts:1719-1801`

Confirmé : pattern de référence pour V3 (lecture des bornes,
résolution `nombre|element`, appel `getAllDiscontinuities` puis
`createIntegralArea` puis `warnIfSingularitySuspected`). Le `case 'aire_entre'`
suivra exactement ce squelette + un 2e argument `g` à valider comme
`GeoFunction`.

### 1.5 `splitOnZeros` + `integralAreaToSVG` — `svg-primitives.ts:1720-1899`

Lue intégralement.

`splitOnZeros(curve)` : split sur les changements de signe (interpolation
linéaire au zéro). **Réutilisable tel quel** pour `aire_entre` si on lui
passe une `SampledCurve` de `h = f − g`.

`integralAreaToSVG(id, figure, transformer, dims)` : ferme chaque
sous-région via deux segments verticaux vers `y = 0`. Lignes 1885-1892 :

```ts
const lastAxis = transformer.mathToSvg(last.x, 0);
const firstAxis = transformer.mathToSvg(first.x, 0);
const d =
	`${curvePath} L${lastAxis.x.toFixed(4)},${lastAxis.y.toFixed(4)} ` +
	`L${firstAxis.x.toFixed(4)},${firstAxis.y.toFixed(4)} Z`;
```

**Pour V3** : nouveau helper `integralAreaBetweenToSVG` (réutilise
`splitOnZeros` sur `h`, mais ferme via la courbe de `g` parcourue à
l'envers). §2.5 détaille l'algo. L'`integralAreaToSVG` actuel reste
inchangé pour les modes `signed=true|false` sans `secondFunctionId`.

### 1.6 `singularity-warn` V2 — `src/lib/geometry-core/dsl/singularity-warn.ts`

Lue intégralement. `warnIfSingularitySuspected(expr, var, a, b, line, builtin)`
accepte déjà un préfixe `builtin` (`'integrale'` par défaut, `'aire'` passé
par `aire`). Pour V3 : 3 appels successifs avec préfixe `'aire_entre'` —
sur `f.expression`, sur `g.expression`, sur `h = f − g`. Cf §2.8.

### 1.7 `mathAST` — helpers ciblés

- `subtract(left, right)` — `src/lib/mathAST/factory.ts:375` — création
  triviale d'un `SubtractionNode`. Coût : O(1).
- `compile(expr)` — produit une `CompiledFn` rapide (~ns par éval).
  Appel unique à la création de l'élément (pas dans le compute closure).
- `findRoots(expr, compiledFn, 'x', xMin, xMax)` — `mathAST/analysis/roots.ts:54`
  — hybride exact + bisection. Réutilisé sur `h`.
- `integrateDefinite(h, ..., { allowNumeric: false })` — calcule
  l'antidérivée `H(x)` de `h`. Status `'exact'` → on cache
  `H` + `compiledH`. Status `'unsupported'` → fallback Simpson par
  sous-intervalle.

### 1.8 Validation expérimentale (sans code de production)

Pas de test temporaire écrit cette session : la formule
`aire_entre(f, g, a, b) = aire(f − g, a, b)` est **mathématiquement
équivalente** à l'algo V2 d'`aire`, déjà validé sur 7 cas dont
3 directement transposables :

| Cas pédagogique du brief                | Vérification mentale                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `f = x²`, `g = x`, `[0, 1]`             | `h = x² − x`, `H = x³/3 − x²/2`, `H(1) − H(0) = −1/6` → aire `1/6` ✓          |
| `f = sin x`, `g = cos x`, `[π/4, 5π/4]` | `h = sin x − cos x`, intersections aux bornes, `H = −cos − sin`, aire `2√2` ✓ |
| `f = x³`, `g = x`, `[−1, 1]`            | `h = x³ − x`, zéros `−1, 0, 1`, deux régions de signe opposé, aire `1/2` ✓    |
| `f = x² + 2`, `g = x²`, `[0, 1]`        | `h = 2`, aucune intersection, aire `∫₀¹ 2 dx = 2` ✓                           |

Les tests unitaires Phase 1-3 confirmeront ces valeurs en code.

---

## 2. Recommandations argumentées

### 2.1 Sémantique

```
aire_entre(f, g, a, b) = Σ |H(x_{i+1}) − H(x_i)|
```

avec `H = primitive de h = f − g`, `x_0 = lo`, `x_{n+1} = hi`,
`x_1 < … < x_n` zéros de `h` dans `(lo, hi)`.

C'est strictement `aire(h, a, b)` côté algorithmique. Le seul écart est :

- côté **DSL**, `f` et `g` sont passés explicitement (pas de soustraction
  visible dans le code utilisateur) ;
- côté **rendu**, le path SVG est entre `f` et `g`, pas entre `h` et l'axe.

### 2.2 Type d'élément (option α étendue)

Récap des 3 options du brief :

| Option | Description                                                       | Coût implémentation          |
| ------ | ----------------------------------------------------------------- | ---------------------------- |
| **α**  | Champ optionnel `secondFunctionId?: string` sur `GeoIntegralArea` | ~30 lignes diff cumulé       |
| β      | Nouveau type `GeoBetweenArea` séparé                              | ~150 lignes dupliquées       |
| γ      | Sub-discriminant `kind: 'integral' \| 'unsigned' \| 'between'`    | ~60 lignes + migration tests |

**Recommandation** : **option α**, alignée sur le pattern V2 d'`aire`.
Cohérence interne : on a déjà accepté un branchement par flag sur la
même type pour signed/unsigned. Ajouter `secondFunctionId?` ne fait
qu'enrichir la grammaire des modes. Le coût est minimal :

- `elements.ts` : 3 champs optionnels à ajouter (`secondFunctionId`,
  `differenceExpression`, `compiledDifference`).
- `figure.ts` : un branchement supplémentaire dans le compute
  (qui factorise plutôt qu'il duplique : voir §1.2).
- `svg-primitives.ts` : nouveau helper dédié
  (le rendu **est** vraiment différent, pas d'illusion de partage possible).
- Tests V1/V2 d'`integrale` et `aire` restent intouchés (champs
  optionnels, défaut `undefined` = mode V1/V2).

L'option γ (renommage propre `GeoAreaUnderCurve` → `GeoArea` ou similaire)
restera préférable en V4 si on accumule un 4e mode (e.g. `aire(f, axe="y")`).
Pas le bon moment.

### 2.3 API DSL

**Nouveau builtin `aire_entre`** :

```
A = aire_entre(f, g, 0, 1)
A = aire_entre(f, g, a, b, couleur="orange", opacite_fond=0.4)
```

- Mêmes types d'arguments que `aire(f, a, b)` : `f` et `g` sont des
  `GeoFunction` ; `a` et `b` sont des nombres ou des références
  `GeoSlider` / `GeoScalar`.
- Retourne un `GeoScalar` (la valeur, **toujours ≥ 0**) avec un
  `GeoIntegralArea` (`signed: false`, `secondFunctionId: g.id`)
  créé en sous-élément lié.
- Style via args nommés (passe par `styleTargetId: areaId` comme
  `aire`/`integrale`).

**Pourquoi pas surcharger `aire()` à 4 args ?** Conflit avec
`aire(P1, P2, P3, P4)` (quadrilatère). Le runtime devrait inspecter
les types des arguments, ce qui n'est pas robuste face aux futures
surcharges (e.g. `aire(cercle)`). Nom dédié = grammaire claire.

### 2.4 Stratégie de calcul (compute closure)

**À la création** :

1. Construire `h = subtract(f.expression, g.expression)`. **Pas** de
   simplification (on garde la structure pour `findRoots`).
2. Compiler `compiledH = compile(h)`. Stocké pour `findRoots` et
   fallback Simpson.
3. Tenter l'antidérivée :
   `integrateDefinite(h, mathNumber('0'), mathNumber('0'), { allowNumeric: false })`.
   Si `'exact'` → cache `antiderivative = H`, `compiledF = compile(H)`.
   Sinon → `null, null, 'unsupported'`.

**À chaque recompute réactif** :

```ts
// Mode aire_entre : secondFunctionId est défini.
const lo = Math.min(a, b);
const hi = Math.max(a, b);
if (a === b) return 0;

// Singularité : NaN si divergence dans h (couvre f, g, et f − g via cache)
if (cachedHDiscs) {
	const ranged = classifyDiscontinuitiesForRange(cachedHDiscs, a, b);
	for (const rd of ranged) {
		if (rd.causesDivergence) return NaN;
		if (rd.atBoundary === 'interior') interiorSplitPoints.push(rd.pointValue);
	}
}

// Zéros internes de h dans (lo, hi)
const inner = findRoots(differenceExpression, compiledDifference, 'x', lo, hi)
	.map((r) => r.x)
	.filter((x) => x > lo + 1e-7 && x < hi - 1e-7);

// breakpoints incluent les bornes + zéros + points removable/jump intérieurs
const breakpoints = [lo, ...inner, ...interiorSplitPoints, hi]
	.filter((v, i, a) => a.indexOf(v) === i)
	.sort((a, b) => a - b);

// Cache symbolique : H(x_{i+1}) − H(x_i)
if (cachedCompiledF) {
	let area = 0;
	for (let i = 0; i < breakpoints.length - 1; i++) {
		area += Math.abs(
			cachedCompiledF({ x: breakpoints[i + 1] }) - cachedCompiledF({ x: breakpoints[i] })
		);
	}
	return area;
}

// Fallback numérique : Simpson par morceaux sur h
let area = 0;
for (let i = 0; i < breakpoints.length - 1; i++) {
	area += Math.abs(
		numericIntegrate(differenceExpression, 'x', breakpoints[i], breakpoints[i + 1]).value
	);
}
return area;
```

**Bench attendu** (extrapolation depuis aire V2) :

- Cas symbolique : ~1-3 ms / éval (findRoots + N≤5 sous-intervalles).
- Cas numérique fallback : ~1-3 ms (N × Simpson).
- Largement sous la cible 16 ms / frame slider drag.

### 2.5 Rendu visuel — nouveau helper `integralAreaBetweenToSVG`

**Algorithme** :

1. Échantillonnage **simultané** de `f` et `g` sur le même grid
   `[lo, hi]` via `sampleWithDerivative` (réutilisé). Coût : 2× le
   sampling de `aire`.
2. Construire un `SampledCurve` virtuel de `h = f − g` (différence
   point-à-point, plus marquage des indices où `f` ou `g` ont une
   discontinuité). Indices passés à `splitOnZeros`.
3. Pour chaque sous-région `[x_i, x_{i+1}]` retournée par `splitOnZeros`
   (signe constant de `f − g`) :
   - `pathF` = courbe de `f` sur la sous-région (forward), via
     `curveToSVGPath`.
   - `pathG_reversed` = courbe de `g` parcourue de `x_{i+1}` vers
     `x_i`. Pas de helper existant pour reverse — ajouter un mini
     utilitaire local (~10 lignes) ou inverser le tableau de points
     avant `curveToSVGPath`.
   - Path final : `${pathF} L${g(x_{i+1})} ${pathG_reversed} Z`.
4. Pas de séparateur visuel entre régions (cohérent avec V2 d'`aire`,
   teinte uniforme).

**Discontinuités** : si `f` ou `g` a une discontinuité dans `[x_i, x_{i+1}]`,
`splitOnZeros` honore déjà le break (cf. `discontinuityIndices`). Le path
de la sous-région est alors interrompu — semantically correct (l'aire est
non-définie à ce point, et `compute` retourne déjà `NaN`).

**Cas `f ≡ g`** : `h = 0` partout, `splitOnZeros` retourne potentiellement
une seule sous-région de signe `'zero'` (ignorée par la boucle car
`continue` sur `region.sign === 'zero'`, cf `svg-primitives.ts:1875`).
Le helper retourne `paths: []` → `null` → pas de rendu. ✓

**Pourquoi pas étendre `integralAreaToSVG` ?** Le branchement
sur `secondFunctionId` est si massif (sample 2×, path-building
fondamentalement différent) qu'il vaut mieux un helper séparé.
Le dispatcher SVG (`GeometryCanvas.svelte`) choisira lequel appeler
selon `el.secondFunctionId`. Coût : ~80-120 lignes nouvelles dans
`svg-primitives.ts`.

### 2.6 Couleur par défaut

**Recommandation** : **orange** `#fb923c` (Tailwind `orange-400`).

Justification :

- Bleu `#3b82f6` pour `integrale` (intégrale signée).
- Vert `#22c55e` pour `aire` (aire sous courbe).
- Orange `#fb923c` pour `aire_entre` (aire entre deux courbes).

Triade contrastée pédagogiquement utile lorsqu'on superpose les trois
sur la même figure (cas pédagogique classique : illustrer
`aire = ∫ |f − g|` quand `f` et `g` se croisent).

Question ouverte §5 : confirmer ou choisir une autre couleur.

### 2.7 Cas dégénérés

| Cas                                          | Comportement attendu                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `a == b`                                     | Retourne `0`. Pas de path. (Cohérent avec `aire`.)                      |
| `f ≡ g` sur `[a, b]`                         | Retourne `0`. Pas de path. (`h = 0` → `splitOnZeros` ne génère rien.)   |
| `f` et `g` ne se croisent jamais             | Une seule sous-région, path simple « lentille ouverte ». ✓              |
| `f` ou `g` discontinu divergent dans `[a,b]` | Retourne `NaN`. Console warn explicite (préfixe `aire_entre ligne X:`). |
| Bornes inversées (`a > b`)                   | Normalisé à `[lo, hi]` (cohérent avec `aire`).                          |
| Bornes infinies (`-∞`, `+∞`)                 | Erreur DSL claire au parsing — hors scope V1.                           |

### 2.8 Détection de singularité — 2 appels

**Deux** appels successifs à `warnIfSingularitySuspected` (sur `f` et `g`,
**pas** sur `h`) :

```ts
warnIfSingularitySuspected(f.expression, 'x', a, b, line, 'aire_entre');
warnIfSingularitySuspected(g.expression, 'x', a, b, line, 'aire_entre');
```

Et **un seul** cache `discontinuities` passé à `createIntegralArea` :
celui de `h = f − g` (puisque c'est lui qu'on intègre, et c'est lui
qui pilote le `NaN-on-divergence` dans le compute).

**Pourquoi pas un 3e warn sur `h`** :

- Si `f` et `g` sont régulières sur `[a, b]`, alors `h = f − g` l'est
  aussi par linéarité — le 3e warn ne déclencherait jamais.
- Si `f` ou `g` diverge, l'utilisateur est déjà warned par les 2 appels
  ci-dessus, et le compute retournera `NaN` via le cache de `h`.
- Cas pathologique `f = 1/(x−1)`, `g = 1/(x−1)` : `h ≡ 0` régulière,
  `aire = 0` est mathématiquement correct ; les 2 warns sur `f` et `g`
  signalent la pathologie sans bloquer le calcul.

Économie : ~33 % du coût création de l'élément (deux `analyzeContinuity`
au lieu de trois). Le cache passé à `createIntegralArea` est calculé via
`getAllDiscontinuities(h, 'x')` (un appel séparé, déjà silencieux et
défensif).

### 2.9 Hors scope V1 (confirmé brief §"Hors scope V1")

- ❌ Bornes infinies (`-∞`, `+∞`).
- ❌ `aire_entre(f, g, P1, P2)` avec bornes-points.
- ❌ `aire_intersection(f, g, h, ...)` (3+ courbes).
- ❌ Détection automatique du domaine d'intersection
  (l'utilisateur fournit `[a, b]` explicite).
- ❌ Export TikZ / Typst (item séparé V2 commun à toutes les aires).
- ❌ Animation/Trace de l'aire qui se construit progressivement.

### 2.10 Refactorisation `case 'aire'` / `case 'aire_entre'` / `case 'integrale'`

Les trois cases auront 80 % de code commun (résolution des bornes,
validation, `getAllDiscontinuities`, `warnIfSingularitySuspected`,
appel `createIntegralArea`). Refactor possible : extraire un helper
`interpretAreaBuiltin(name, signed, secondFn?, args, line)`.

**Décision** : faire la duplication minimale en Phase 2 (les trois
cases côte à côte), refactoriser **après** validation. Réduit le
risque de régression dans les V1/V2. Reportée en V4.

---

## 3. API DSL finale proposée

### 3.1 Signatures V1

```dsl
A = aire_entre(f, g, 0, 1)                                      # bornes nombres
A = aire_entre(f, g, a, b)                                      # bornes scalaires/sliders
A = aire_entre(f, g, a, b, couleur="orange", opacite_fond=0.4)  # avec style
A = aire_entre(f, g, a, b, etiquette="Aire entre f et g")       # avec label
```

Mêmes types d'arguments que `aire(f, a, b)` :

- `f`, `g` : `GeoFunction` (créées par `courbe(...)`).
- `a`, `b` : `nombre` ou ref vers `GeoSlider`/`GeoScalar`.

**Retourne** : `GeoScalar` (la valeur, ≥ 0).
**Style cible** : le `GeoIntegralArea` lié (via `styleTargetId`).

### 3.2 Exemples pédagogiques

```dsl
# Aire entre y = x² et y = x sur [0, 1] (cas classique Terminale)
f = courbe("y = x^2")
g = courbe("y = x")
A = aire_entre(f, g, 0, 1)        # = 1/6

# Aire entre y = sin(x) et y = cos(x) sur [π/4, 5π/4]
f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
A = aire_entre(f, g, pi/4, 5*pi/4)   # = 2√2

# Avec sliders réactifs
a = curseur(-2, 2, -1)
b = curseur(-2, 2, 1)
f = courbe("y = x^3")
g = courbe("y = x")
A = aire_entre(f, g, a, b)        # change avec a, b

# Comparaison avec integrale et aire
f = courbe("y = sin(x)")
g = courbe("y = cos(x)")
I = integrale(f, 0, 2*pi)         # signée (= 0)
S = aire(f, 0, 2*pi)              # géométrique f vs axe (= 4)
E = aire_entre(f, g, 0, 2*pi)     # géométrique f vs g (= 4√2)
```

### 3.3 Erreurs DSL attendues

```
aire_entre(): la fonction 1 doit etre une courbe y = f(x)
aire_entre(): la fonction 2 doit etre une courbe y = g(x)
aire_entre(): la borne inferieure doit etre un nombre ou un curseur/scalaire
aire_entre() attend 4 arguments (f, g, a, b)
```

---

## 4. Plan TDD détaillé

### Phase 0 — Spec (cette étude)

- ✅ Lecture intégrale des modules V1/V2.
- ✅ Validation mathématique des 4 cas pédagogiques.
- ⏳ **Validation utilisateur des 5 questions ouvertes** (§5).

### Phase 1 — Extension type + factory (1.5 h)

**Agents** : `supabase-expert` (non), `typescript-expert` pour
les types optionnels, `code-reviewer` (proactif).

**Fichiers modifiés** :

| Fichier                                                | Action                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/geometry-core/types/elements.ts`              | + 3 champs optionnels sur `GeoIntegralArea`                 |
| `src/lib/geometry-core/graph/figure.ts`                | + branche dans `createIntegralArea` pour `secondFunctionId` |
| `src/lib/geometry-core/graph/__tests__/figure.test.ts` | + 6-8 tests sur `createIntegralArea` mode aire_entre        |

**Comportements TDD à valider en français AVANT d'écrire les tests** :

1. `createIntegralArea(f, a, b, { secondFunctionId: g })` crée la paire
   `(GeoIntegralArea, GeoScalar)` avec `signed = false` et le scalar
   évalue à `aire(f − g, a, b)`.
2. Le scalar est `0` quand `f ≡ g` sur `[a, b]`.
3. Le scalar est `0` quand `a === b`.
4. Le scalar est invariant à l'échange `(f, g) ↔ (g, f)` (symétrie en
   valeur absolue).
5. Le scalar est invariant aux bornes inversées (`a, b ↔ b, a`).
6. Le scalar retourne `NaN` si une discontinuité divergente de `h` est
   dans `[a, b]`.
7. La factory throw une erreur claire si `secondFunctionId` ne référence
   pas une `GeoFunction` existante.
8. Tests réactifs : déplacer le slider de borne change la valeur.

**Validation** :

- [ ] Tests verts.
- [ ] `code-reviewer` (Sonnet) : revue de la branche compute.
- [ ] Doc de progression `docs/wip/geometry/aire-entre-progress.md` Phase 1.
- [ ] Commit : `feat(geometry-core): add aire_entre support to GeoIntegralArea (phase 1)`.

### Phase 2 — DSL builtin `case 'aire_entre'` (1 h)

**Agents** : `frontend-developer` (non, c'est backend DSL),
direct + `code-reviewer`.

**Fichier modifié** : `src/lib/geometry-core/dsl/builtins.ts`
(+ tests dans `src/lib/geometry-core/dsl/__tests__/builtins.test.ts`).

**Comportements TDD** :

1. `aire_entre(f, g, 0, 1)` parse correctement et retourne un scalaire.
2. Erreur si arg 1 ou 2 n'est pas une `courbe`.
3. Erreur si arg 3 ou 4 n'est ni un nombre ni un scalaire/slider.
4. Erreur sur 3 ou 5 args (attend exactement 4).
5. Args nommés `couleur`, `opacite_fond`, `etiquette` honorés.
6. `getAllDiscontinuities(h)` appelé une fois et passé à `createIntegralArea`.
7. `warnIfSingularitySuspected` appelé **2 fois** (`f`, `g` — pas `h`)
   avec préfixe `'aire_entre'`.

**Validation** : tests verts, code review, commit.

### Phase 3 — Rendu SVG `integralAreaBetweenToSVG` (2 h)

**Agents** : `frontend-developer` pour le path-building SVG,
`code-reviewer` (proactif).

**Fichiers** :

| Fichier                                                            | Action                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| `src/lib/geometry-core/rendering/svg-primitives.ts`                | + `integralAreaBetweenToSVG(...)` (~100 lignes)      |
| `src/lib/geometry-core/rendering/__tests__/svg-primitives.test.ts` | + 6-8 tests (présence path, fermeture, sous-régions) |
| `src/lib/components/geometry/GeometryCanvas.svelte`                | + dispatch sur `el.secondFunctionId`                 |

**Comportements TDD** :

1. Une intégrale entre deux courbes qui se croisent une fois génère
   2 paths fermés.
2. Une intégrale entre deux courbes qui ne se croisent pas génère 1 path.
3. `f ≡ g` génère 0 paths (helper retourne `null`).
4. Le path est correctement fermé (`Z` à la fin).
5. Le path inclut courbe `f` (forward) puis courbe `g` (reversed).
6. Discontinuité dans `f` ou `g` casse le path.
7. Couleur par défaut orange si non spécifiée dans le style.

**Validation** : test visuel manuel sur `/geometry-demo/sliders/aire`
adapté en `/geometry-demo/sliders/aire-entre`. Code review,
**MCP svelte-autofixer obligatoire** sur `GeometryCanvas.svelte`,
commit.

### Phase 4 — Démo + doc utilisateur (1 h)

**Agents** : `frontend-developer` pour la démo,
`documentation-writer` (proactif) pour la doc.

**Fichiers** :

| Fichier                                                             | Action                            |
| ------------------------------------------------------------------- | --------------------------------- |
| `src/routes/(public)/geometry-demo/sliders/aire-entre/+page.svelte` | Nouvelle page démo (clone d'aire) |
| `src/routes/(public)/geometry-demo/sliders/aire-entre/+page.ts`     | Idem                              |
| `docs/ref/geometry-dsl/aire_entre.md`                               | Doc utilisateur (clone d'aire.md) |
| `docs/ref/geometry-dsl/index.md` ou équivalent                      | Lien vers la nouvelle doc         |

**Démo** :

- Sliders pour `a` et `b`.
- Choix entre 4 paires `(f, g)` du brief (`x²/x`, `sin/cos`, `x³/x`, `x²+2/x²`).
- Affichage de l'aire calculée + comparaison avec `aire(f) − aire(g)`
  (qui n'est pas la même chose !) pour pédagogie.

**Validation** : démo testée dans le navigateur (port 5175),
MCP svelte-autofixer sur la page, commit.

### Phase 5 — Quality checks finaux (~30 min)

À la **fin du plan uniquement** (cf CLAUDE.md) :

```bash
npx eslint <fichiers modifiés>
pnpm check:incremental
```

Pour chaque `.svelte` modifié : `mcp__svelte__svelte-autofixer`.

### Effort total estimé

| Phase                                  | Estimation |
| -------------------------------------- | ---------- |
| Phase 1 — type + factory               | 1.5 h      |
| Phase 2 — DSL builtin                  | 1 h        |
| Phase 3 — rendu SVG                    | 2 h        |
| Phase 4 — démo + doc                   | 1 h        |
| Phase 5 — quality checks               | 0.5 h      |
| Buffer (debug, code review itérations) | 1 h        |
| **Total**                              | **5-7 h**  |

---

## 5. Décisions tranchées (2026-05-01)

Les 5 questions ouvertes ont toutes été tranchées par l'utilisateur :

| #   | Question                                       | Décision                                                     |
| --- | ---------------------------------------------- | ------------------------------------------------------------ |
| 1   | Couleur par défaut                             | ✅ **Orange `#fb923c`** (triade bleu/vert/orange).           |
| 2   | Bornes inversées (`a > b`)                     | ✅ **`[lo, hi]`** — convention `aire`, pas `integrale`.      |
| 3   | Cas `f ≡ g`                                    | ✅ **Retourne `0`, pas de path** — émerge de `splitOnZeros`. |
| 4   | Nombre d'appels à `warnIfSingularitySuspected` | ✅ **2 appels** (`f`, `g`) — pas sur `h` (cf §2.8).          |
| 5   | Refactor des 3 cases DSL                       | ✅ **Reporté en V4** — duplication minimale Phase 2.         |

**→ Phase 0 close. Phase 1 (extension type + factory) peut démarrer
sans nouvelle question préalable.**

---

## 6. Critères de succès

L'étude valide la GO/NO-GO si l'utilisateur peut :

- [x] Comprendre l'API DSL (§3) en lisant 30 lignes.
- [x] Identifier précisément quel champ est ajouté à quel type (§2.2).
- [x] Connaître le coût (§4 effort total).
- [x] Trancher les 5 questions ouvertes (§5).
- [ ] Valider chaque comportement TDD listé en Phase 1-4 (§4).

Une fois les 5 questions tranchées (✅ fait), les Phases 1-5 sont exécutables
mécaniquement en suivant les patterns V1/V2 d'`integrale` et `aire`.

---

## 7. Documents produits par cette étude

- ✅ **Ce document** : `docs/wip/geometry/aire-entre-study.md`.

Aucun autre fichier modifié. Aucun code de production écrit.
Pas de test temporaire écrit (validation mathématique faite mentalement,
les 4 cas seront couverts par les tests Phase 1-3).
