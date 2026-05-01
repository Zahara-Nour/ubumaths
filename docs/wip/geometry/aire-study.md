# Étude — builtin DSL `aire(f, a, b)` pour geometry-core

> Phase 0 (étude / spec). Aucune ligne de code de production écrite. Livrable :
> ce document + un plan TDD validable + ≤ 5 questions ouvertes ciblées.
>
> Source du brief : `docs/wip/geometry/prompt-aire-study.md`.
> S'appuie sur la V1 de `integrale` déjà livrée
> (`docs/wip/geometry/integrale-study.md` + `integrale-progress.md`).

---

## 0. TL;DR

- `aire(f, a, b)` calcule l'aire géométrique `∫ₐᵇ |f(x)| dx`, **toujours
  ≥ 0**, par splittage sur les zéros de `f` dans `(a, b)`.
- Ré-utilise massivement la V1 d'`integrale` : factory, cache symbolique,
  rendu SVG, heuristique singularité, dispatcher Svelte.
- **Zéro tangent (multiplicité paire) → aucun traitement spécial** :
  splittage harmless, somme des `|·|` reste exacte. Vérifié
  expérimentalement sur `(x−1)²` sur `[0, 2] = 2/3`.
- Effort estimé V1 : **9-12 h** (≈ moitié d'`integrale` car infrastructure
  réutilisée).

### Décisions utilisateur enregistrées (2026-05-01)

| #   | Sujet                          | Décision                                                                                |
| --- | ------------------------------ | --------------------------------------------------------------------------------------- |
| 1   | Type d'élément                 | **Option α** — flag `signed: boolean` (défaut `true`) sur `GeoIntegralArea` existant.   |
| 2   | Nom du builtin                 | **Surcharge** `aire(f, a, b)` sur le `case 'aire'` actuel (discrimination par type).    |
| 3   | Couleur par défaut             | **Vert** (`#22c55e`) pour contraster avec le bleu d'`integrale` sur figures conjointes. |
| 4   | Détection des zéros            | **`findRoots`** de `mathAST/analysis/roots` (hybride exact + bisection numérique).      |
| 5   | Refactorisation integrale/aire | **Reportée en V3** (à faire avec `aire_entre`, pas en V1).                              |

**→ Phase 0 close. Phase 1 (extension type + factory) peut démarrer.**

---

## 1. Inventaire confirmé

### 1.1 `mathAST/analysis/roots` — `findRoots(...)`

Source : `src/lib/mathAST/analysis/roots.ts:54-64`. Lecture intégrale faite.

```ts
export interface RootResult {
	readonly x: number;
	readonly exact: boolean; // true si trouvé via solve(), false via bisection
}

export function findRoots(
	expression: MathNode,
	compiledFn: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): RootResult[];
```

**Comportement vérifié** :

- Pipeline hybride : `solve()` symbolique d'abord (skippé si complexité AST
  > 30 pour éviter des hangs), fallback numérique par échantillonnage
  > (200 points) + bisection sur changements de signe (50 itérations,
  > tolérance `1e-12`).
- Filtre les pseudo-zéros d'asymptotes (cas `1/x`).
- Sortie triée par `x` croissant, dédupliquée à `1e-8` près.
- **Inclut les zéros aux bornes** (filtre `xNum < xMin - 1e-8 || xNum > xMax + 1e-8`).
- **Inclut les zéros tangents** (multiplicité paire). Vérifié expérimentalement
  sur `(x−1)²` sur `[0, 2]` : retourne `x ≈ 1` (cf. §1.5).

**Décision** : on adopte `findRoots` pour V1, cohérent avec le reste du
codebase. Coût : un appel par recompute réactif (slider drag). Sur des
expressions modérées, mesuré < 5 ms (200 samples × `compiledFn` rapide).

### 1.2 V1 d'`integrale` — fonctions et patterns réutilisables

Source : code lu, et `integrale-progress.md` § Phase 1-6.

| Composant V1                                                       | Statut V2 (`aire`)                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `GeoIntegralArea` (`elements.ts:443`)                              | **Étendu** d'un champ `signed: boolean` (option α retenue, §2.5)    |
| `figure.createIntegralArea(...)` (`figure.ts:2846`)                | **Réutilisé tel quel** ; nouveau paramètre `options.signed?: bool`  |
| `compute` closure du `GeoScalar` paire (`figure.ts:2904-2916`)     | **Branché sur `signed`** : signed → `F(b)-F(a)` ; unsigned → §2.6   |
| `case 'integrale'` (`builtins.ts:1614`)                            | **Dupliqué en `case 'aire'`** (factorisation possible — voir §2.10) |
| `singularity-warn.ts`                                              | **Réutilisé tel quel**                                              |
| `splitOnZeros(curve)` (`svg-primitives.ts:1720`)                   | **Réutilisé tel quel** (signe ignoré au rendu)                      |
| `integralAreaToSVG(...)` (`svg-primitives.ts:1824`)                | **Branché sur `signed`** : sign tag ignoré côté `aire` (§2.7)       |
| `GeometryCanvas.svelte` dispatcher (`integralArea`)                | **Branché sur `signed`** : opacité uniforme si non signé            |
| Pattern paire `_visualAreaId` ↔ `_scalarId` (`elements.ts:425`)   | **Réutilisé tel quel**                                              |
| `compile(antiderivative)` mise en cache                            | **Réutilisé tel quel**                                              |
| Fallback `numericIntegrate(fnExpression, 'x', a, b)`               | **Étendu** : pour `aire` non signée, multiple appels (§2.6)         |
| Convention bornes inversées `[min(a,b), max(a,b)]` côté visualiser | **Aire ne dépend pas de l'orientation**, on prend `[lo, hi]` (§2.4) |

### 1.3 `mathAST/integration` — `integrateDefinite` & `numericIntegrate`

Inchangé depuis V1. Récap signature :

```ts
integrateDefinite(expr, lower, upper, { allowNumeric: false }): DefiniteIntegrateResult;
//   → status 'exact' → antiderivative MathNode (à compiler), value F(b)-F(a)
//   → status 'unsupported' → antiderivative null, value null

numericIntegrate(expr, variable, a: number, b: number, opts?): NumericResult;
//   → { value, error, method } via Simpson adaptatif (~0.4 ms typique)
```

### 1.4 Différence sémantique avec `integrale` (rappel)

|                            | `integrale(f, a, b)` (V1) | `aire(f, a, b)` (V2)               |
| -------------------------- | ------------------------- | ---------------------------------- |
| Formule                    | `F(b) − F(a)`             | `∫ₐᵇ \|f(x)\| dx`                  |
| Signe possible             | ±                         | toujours ≥ 0                       |
| Bornes inversées (`a > b`) | `−∫ₐᵇ` (signé)            | `∫₍ₘᵢₙ₎^(max)` (orienté positif)   |
| Splittage interne          | non                       | sur les zéros de `f` dans `(a, b)` |
| Visuel                     | teintes selon signe       | teinte unique                      |

### 1.5 Validation expérimentale (test temporaire jetable, supprimé)

J'ai écrit puis supprimé `aire-prototype.test.ts` qui implémente la formule
proposée et la teste contre 7 cas. **Tous verts**.

| Cas                     | Méthode            | Attendu  | Obtenu   | Note                                           |
| ----------------------- | ------------------ | -------- | -------- | ---------------------------------------------- |
| `x²` sur `[0, 1]`       | symbolique         | `1/3`    | `0.3333` | Positive partout                               |
| `x³ − x` sur `[-1,1]`   | symbolique         | `0.5`    | `0.5000` | Sign change à `0`                              |
| `sin(x)` sur `[0,2π]`   | symbolique         | `4`      | `4.0000` | Sign change à `π`                              |
| `(x−1)²` sur `[0,2]`    | symbolique         | `2/3`    | `0.6667` | Zéro tangent à `1` — splittage harmless        |
| `1 − x²` sur `[-1,1]`   | symbolique         | `4/3`    | `1.3333` | Racines `±1` aux bornes — filtrées             |
| `cos(x)` sur `[0,π]`    | symbolique         | `2`      | `2.0000` | Sign change à `π/2`, intégrale signée = 0      |
| `e^{-x^2}` sur `[-1,1]` | numérique fallback | `1.4937` | `1.4936` | Pas d'antidérivée close — Simpson par morceaux |

**Conclusions critiques** :

- ✅ Algorithme `Σ |F(z_{i+1}) − F(z_i)|` correct pour les 6 cas exacts.
- ✅ **Zéro tangent** : pas de cas pathologique. `findRoots` retourne le zéro
  tangent, le splittage donne deux sous-régions de **même signe**, donc
  `|∫_left| + |∫_right| = ∫_left + ∫_right = ∫_total`. Aucun traitement
  spécial requis. La question §7 du brief (multiplicité paire) est résolue.
- ✅ **Zéros aux bornes** (`x = ±1` pour `1 − x²` ou `x³ − x` sur `[-1,1]`)
  sont retournés par `findRoots`. Filtrage dans la boucle avec tolérance
  `1e-7` pour éviter des sous-intervalles vides — c'est une optimisation,
  pas une correction (somme inchangée mathématiquement).
- ✅ Fallback numérique fonctionne avec Simpson par sous-intervalle.

---

## 2. Recommandations argumentées

### 2.1 Sémantique du calcul

**Formule retenue** :

```
aire(f, a, b) = Σ |F(z_{i+1}) − F(z_i)|
```

avec `z_0 = min(a, b)`, `z_{n+1} = max(a, b)`, et `z_1 < ... < z_n` les
zéros de `f` dans `(z_0, z_{n+1})` retournés par `findRoots`, filtrés à
tolérance `1e-7` des bornes.

Si `f ≥ 0` sur `[a, b]` (ou `f ≤ 0`), la formule dégénère en `|F(b) − F(a)|`,
qui coïncide avec `aire(f, a, b) = |integrale(f, a, b)|`. Validé sur `x²`
et `1 − x²`.

### 2.2 Bornes inversées (`a > b`)

**Recommandation** : on prend `lo = min(a, b)`, `hi = max(a, b)`.
L'aire ne dépend pas de l'orientation algébrique. C'est l'attendu pédagogique
en Terminale (« aire d'une région »).

**Justification** : différence avec `integrale` qui suit la convention
`∫ᵇₐ = -∫ₐᵇ`. Pour `aire`, on n'a pas de raison de propager le signe.

### 2.3 Bornes égales (`a == b`)

Retourne `0`. Pas d'erreur.

### 2.4 Bornes infinies

**Non supportées en V1**, comme `integrale`. Erreur claire au DSL.

### 2.5 Type d'élément côté geometry-core

#### Récap des trois options du brief

**Option α — flag booléen `signed` sur `GeoIntegralArea`** (recommandation V1 du brief).

- ✓ Aucune migration V1, juste un champ optionnel (`signed?: boolean` défaut `true`).
- ✓ Factory `createIntegralArea` réutilisée, branche sur `signed` pour le compute.
- ✓ Renderer SVG réutilisé (`integralAreaToSVG`), branche sur `signed`
  pour le `fill-opacity`.
- ✓ Pattern paire (`_visualAreaId` / `_scalarId`) inchangé.
- ✗ Le nom du type `GeoIntegralArea` est légèrement trompeur quand `signed = false`
  (« integralArea unsigned » ?).

**Option β — nouveau type dédié `GeoArea` (ou `GeoUnsignedArea`)**.

- ✓ Séparation propre, nommage explicite.
- ✗ Duplique factory, type, dispatcher dans `GeometryCanvas.svelte`.
- ✗ ~150-200 lignes de code dupliquées avec branchement minime.

**Option γ — discriminant `kind: 'integral' | 'unsigned'` sur le type, renommé `GeoAreaUnderCurve`**.

- ✓ Nommage neutre et générique (« area under curve » couvre les deux cas).
- ✓ Dispatch propre par `kind`, lisible.
- ✗ Migration V1 : renommer le type `'integralArea'` → `'areaUnderCurve'` partout
  (~20-30 occurrences dans tests, dispatcher Svelte, exports).
- ✗ Risque de régression sur les 96 tests V1 d'`integrale` si on rate une occurrence.

#### Recommandation : **option α**

Le delta de code est minimal (1 champ + 2 branches), la migration est nulle,
et les tests V1 restent intouchés. Le « bruit sémantique » du nom
`GeoIntegralArea` quand `signed = false` est limité à la couche interne
(le DSL exposera bien `aire`, l'utilisateur ne voit jamais le nom du type).

L'option γ (renommage propre) reste préférable en V3 si on ajoute plus
tard `aire_entre(f, g, a, b)` ou autres variantes — mais ce serait un PR
de refactor dédié, pas le périmètre de V2.

### 2.6 Stratégie de calcul (compute closure)

**À la création** (DSL `A = aire(f, a0, b0)`) :

1. Appel unique à `integrateDefinite(f.expression, mathNumber('0'), mathNumber('0'), { allowNumeric: false })`.
2. Si `status === 'exact'` → on stocke `antiderivative` + `compiledF` dans le
   `GeoIntegralArea`. **Identique à V1**.
3. Sinon → `antiderivative = null`, `compiledF = null`, status `'unsupported'`.

**À chaque recompute réactif** (slider bouge), branche sur `signed` :

```ts
// signed = true (V1, integrale)
return cachedCompiledF
	? cachedCompiledF({ x: b }) - cachedCompiledF({ x: a })
	: numericIntegrate(fnExpression, 'x', a, b).value;

// signed = false (V2, aire)
const lo = Math.min(a, b);
const hi = Math.max(a, b);
const allRoots = findRoots(fnExpression, fnCompiled, 'x', lo, hi);
const inner = allRoots.map((r) => r.x).filter((x) => x > lo + 1e-7 && x < hi - 1e-7);
const breakpoints = [lo, ...inner, hi];

if (cachedCompiledF) {
	let area = 0;
	for (let i = 0; i < breakpoints.length - 1; i++) {
		area += Math.abs(
			cachedCompiledF({ x: breakpoints[i + 1] }) - cachedCompiledF({ x: breakpoints[i] })
		);
	}
	return area;
} else {
	let area = 0;
	for (let i = 0; i < breakpoints.length - 1; i++) {
		area += Math.abs(numericIntegrate(fnExpression, 'x', breakpoints[i], breakpoints[i + 1]).value);
	}
	return area;
}
```

**Note** : `fnCompiled` doit être accessible dans le compute closure. Soit
on le passe au constructeur (pré-compilé), soit on lit `fnEl.compiledFn`
depuis `figure.getElementById(functionId)`. Préférer le second pour rester
cohérent avec `splitOnZeros` côté rendu (qui appelle déjà `fnEl.compiledFn`).

**Bench attendu** :

- Cas symbolique avec `findRoots` + N≤5 sous-intervalles : ~ 1-3 ms / éval.
- Cas numérique fallback : ~ 0.4 ms × N sous-intervalles ≈ 1-2 ms typique.
- Largement sous la cible 16 ms / frame.

### 2.7 Rendu visuel

**Algorithme** : identique à V1 pour le splittage géométrique
(`splitOnZeros` honore `discontinuityIndices`). La seule différence est
l'application du `fillOpacity` au moment du dispatcher Svelte.

**Branche dans `GeometryCanvas.svelte`** :

```svelte
{#each svg.paths as path, i (i)}
	{@const fillOp = el.signed
		? path.sign === 'positive'
			? (sty.fillOpacity ?? 0.3)
			: (sty.fillOpacity ?? 0.3) / 2
		: (sty.fillOpacity ?? 0.3)}
	<path d={path.d} fill={sty.fill} fill-opacity={fillOp} ... />
{/each}
```

Aucun nouveau helper côté `svg-primitives.ts`. Pas de séparateur visuel
(ligne verticale au zéro) en V1 — le splittage est invisible si la teinte
est uniforme, ce qui est cohérent pédagogiquement (l'aire est une grandeur
unique).

### 2.8 Couleur par défaut

**Recommandation** : couleur **distincte** d'`integrale` pour qu'ils
cohabitent visuellement sur la même figure pédagogique (cas d'usage clé,
cf. brief §6).

Proposition : `vert` (`#22c55e`) pour `aire`, `bleu` (`#3b82f6`) reste
pour `integrale`. **Question pour l'utilisateur** (§5).

### 2.9 Heuristique singularité

`warnIfSingularitySuspected(...)` réutilisé tel quel (mêmes cas suspects :
`1/g`, `tan`, `ln`, `sqrt`). Le message de warn préfixé `'aire ligne X:'`
au lieu de `'integrale ligne X:'`. → Petit refactor de
`formatSingularityWarnings` pour accepter un préfixe paramétrique.

### 2.10 Factorisation du switch DSL ?

Les `case 'integrale'` et `case 'aire'` ont 90 % de code commun
(résolution des bornes, validation de la fonction, warn singularité).
Refactor possible : extraire un helper `interpretAreaBuiltin(name, signed, args, line)`.

**Décision** : faire la duplication minimale en Phase 2 (les deux cases
côte à côte), puis refactoriser **après** avoir vu le code complet. Réduit
le risque d'introduire une régression dans `integrale` V1.

---

## 3. API DSL finale proposée

### 3.1 Signature V1

```
aire(f, a, b)                                       # bornes nombres
aire(f, a, b, couleur="vert", opacite_fond=0.4)     # avec style
```

Mêmes types d'arguments que `integrale` : `f` est une `GeoFunction`, `a` et
`b` sont des nombres ou des références à un `GeoSlider` / `GeoScalar`.

**Retourne** : un `GeoScalar` (la valeur, **toujours ≥ 0**), avec un
`GeoIntegralArea` (`signed: false`) créé en sous-élément lié.

### 3.2 Exemples

**Exemple 1 — calcul simple, aire = intégrale (`f ≥ 0`)** :

```
f = courbe("y = x^2")
A = aire(f, 0, 1)
mesure(A)              # affiche 0.33
```

**Exemple 2 — fonction qui change de signe, distinction pédagogique** :

```
f = courbe("y = x^3 - x")
I = integrale(f, -1, 1)        # = 0 (les régions s'annulent)
A = aire(f, -1, 1)             # = 0.5 (somme des aires absolues)
mtexte(2, 1.5, "intégrale = {I:.2f},  aire = {A:.2f}")
```

Visuellement : `integrale` montre deux sous-régions de teintes
différentes (signed), `aire` montre la même découpe géométrique mais en
teinte uniforme (verte par défaut). L'élève voit la différence.

**Exemple 3 — bornes interactives** :

```
a = slider(min=-3, max=0, valeur=-2)
b = slider(min=0, max=3, valeur=2)
f = courbe("y = sin(x)")
A = aire(f, a, b, couleur="vert", opacite_fond=0.4)
mtexte(0, 1.5, "aire = {A:.3f}")
```

Quand on bouge `a` ou `b`, l'aire est recalculée par splittage sur les zéros
courants de `sin(x)` dans `(a, b)`.

**Exemple 4 — fallback numérique (gaussienne)** :

```
f = courbe("y = e^{-x^2}")
A = aire(f, -1, 1)             # ≈ 1.4937, identique à integrale (f > 0)
```

Pas d'antidérivée close → Simpson adaptatif par morceaux (un seul morceau
ici car `exp(-x²) > 0`).

**Exemple 5 — bornes inversées** :

```
f = courbe("y = x^2")
A = aire(f, 1, 0)              # = 1/3 (positif, contrairement à integrale qui donne -1/3)
```

---

## 4. Plan TDD

### Phase 0 — Spécification (ce document) ✅

- [x] Inventaire `findRoots` (signatures à jour, comportement vérifié)
- [x] Validation expérimentale (7 cas, tous verts)
- [x] Décisions techniques argumentées (option α retenue)
- [x] **Validation utilisateur des recommandations** (5 décisions enregistrées §0)
- [x] **Réponses aux 5 questions ouvertes (§5)** (verrouillées 2026-05-01)

### Phase 1 — Extension type + factory

| Tâche                                                                        | Fichier                                   | Agent / Modèle      |
| ---------------------------------------------------------------------------- | ----------------------------------------- | ------------------- |
| Ajouter `signed: boolean` (défaut `true`) à `GeoIntegralArea`                | `src/lib/geometry-core/types/elements.ts` | direct (Sonnet)     |
| `createIntegralArea(...)` accepte `options.signed?: boolean`, défaut `true`  | `src/lib/geometry-core/graph/figure.ts`   | `backend-developer` |
| Branche le `compute` closure sur `signed` (formule §2.6)                     | `src/lib/geometry-core/graph/figure.ts`   | direct              |
| Tests : `signed=true` (V1 unchanged) + `signed=false` (4 cas exacts du §1.5) | `__tests__/figure-integral-area.test.ts`  | `test-automator`    |
| Code review                                                                  |                                           | `code-reviewer`     |

**TDD** :

```ts
// Tests rouges écrits AVANT implémentation
it('createIntegralArea defaults signed=true (V1 backward compat)');
it('createIntegralArea with signed=false computes aire = Σ |F(z_{i+1}) - F(z_i)|');
it('signed=false: x^3 - x on [-1, 1] → 0.5');
it('signed=false: sin(x) on [0, 2π] → 4');
it('signed=false: (x-1)^2 on [0, 2] → 2/3 (tangent zero harmless)');
it('signed=false: bornes inversées → même valeur que [min, max]');
it('signed=false fallback numérique: exp(-x^2) on [-1, 1] ≈ 1.4937');
```

Estimé : **3-4 h**.

### Phase 2 — Builtin DSL `aire(...)` (surcharge sur `case 'aire'` existant)

| Tâche                                                                                                                                                                                                                                | Fichier                                         | Agent            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------- |
| Surcharger le `case 'aire'` (`builtins.ts:1118`) : si `pos.length === 3` ET `pos[0]` est une `'fonction'`, router vers la branche aire-sous-courbe (clone de `'integrale'` avec `signed:false`) ; sinon comportement polygone actuel | `src/lib/geometry-core/dsl/builtins.ts`         | direct (Sonnet)  |
| Refactor `formatSingularityWarnings` pour accepter `prefix` paramétrique                                                                                                                                                             | `src/lib/geometry-core/dsl/singularity-warn.ts` | direct           |
| Tests DSL : parsing `aire(f, a, b)`, args nommés, erreurs claires                                                                                                                                                                    | `dsl/__tests__/interpreter-aire.test.ts`        | `test-automator` |
| **Test régression** : `aire(P1, P2, P3)` continue de fonctionner                                                                                                                                                                     | `dsl/__tests__/interpreter-aire.test.ts`        | `test-automator` |
| Code review                                                                                                                                                                                                                          |                                                 | `code-reviewer`  |

Estimé : **2-3 h**.

### Phase 3 — Rendu SVG (branche fillOpacity uniforme)

| Tâche                                                                    | Fichier                                             | Agent                |
| ------------------------------------------------------------------------ | --------------------------------------------------- | -------------------- |
| Branche dispatcher `el.signed` pour `fillOpacity` uniforme               | `src/lib/components/geometry/GeometryCanvas.svelte` | `frontend-developer` |
| Tests SVG : `signed=false` → toutes les sous-régions ont la même opacité | `__tests__/integral-svg.test.ts` (extension)        | `test-automator`     |
| Svelte autofixer sur `GeometryCanvas.svelte`                             | (MCP)                                               | direct               |
| Code review                                                              |                                                     | `code-reviewer`      |

**Note** : `splitOnZeros` et `integralAreaToSVG` restent inchangés. La
seule modification visuelle est dans le composant Svelte.

Estimé : **1-2 h**.

### Phase 4 — Page démo + doc utilisateur

| Tâche                                                                   | Fichier                                           | Agent                  |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ---------------------- |
| Page démo `geometry-demo/sliders/aire/`                                 | `src/routes/(public)/geometry-demo/sliders/aire/` | `frontend-developer`   |
| Démo « différence intégrale vs aire » (option)                          | id.                                               | direct                 |
| Doc DSL `docs/ref/geometry-dsl/aire.md`                                 | nouveau fichier                                   | `documentation-writer` |
| Mise à jour `integrale.md` § « Aire géométrique » (lien vers `aire.md`) | `docs/ref/geometry-dsl/integrale.md`              | direct                 |
| Carte d'index dans `geometry-demo/sliders/+page.svelte`                 | id.                                               | direct                 |
| Code review final                                                       |                                                   | `code-reviewer`        |

Estimé : **2 h**.

### Phase 5 — Quality checks finaux

À la fin du plan **uniquement** (CLAUDE.md) :

- `mcp__svelte__svelte-autofixer` sur chaque `.svelte` modifié
- `pnpm check:incremental`
- `npx eslint <fichiers modifiés>`
- Document de progression `docs/wip/geometry/aire-progress.md`
- Commit (direct si < 10 fichiers, sinon `commit-manager` agent)

Estimé : **1 h**.

### Récap effort

| Phase                       | Estimé     |
| --------------------------- | ---------- |
| 1. Extension type + factory | 3-4 h      |
| 2. Builtin DSL              | 2-3 h      |
| 3. Rendu SVG (branche)      | 1-2 h      |
| 4. Démo + doc               | 2 h        |
| 5. Quality + commit         | 1 h        |
| **TOTAL**                   | **9-12 h** |

≈ 50 % de l'effort V1 d'`integrale` (19-23 h), grâce à la réutilisation
maximale.

---

## 5. Questions ouvertes — TRANCHÉES (2026-05-01)

Les 5 questions ci-dessous sont **résolues** (cf. tableau §0). Elles sont
conservées ici pour traçabilité du raisonnement.

1. **Type d'élément** : option α (flag `signed: boolean` sur `GeoIntegralArea`,
   migration V1 nulle) ou option γ (renommer en `GeoAreaUnderCurve` avec
   discriminant `kind: 'integral' | 'unsigned'`, plus propre mais migre
   ~20-30 occurrences) ? **Recommandation** : α.

2. **Nom du builtin — conflit confirmé avec `aire(P1, ..., Pn)` existant**.
   Le `case 'aire'` actuel (`builtins.ts:1118`) calcule l'aire d'un polygone
   à partir de **points** (`figure.createScalarArea(pointIds, ...)`). Deux
   options :

   - **2a — Surcharge dans le même `case 'aire'`** : discriminer par le
     type du premier argument. Si `pos[0]` est une `'fonction'` ET
     `pos.length === 3`, brancher sur la nouvelle logique aire-sous-courbe ;
     sinon, comportement actuel polygone. Pattern déjà utilisé dans
     `case 'mtexte'` (`builtins.ts:1126-1162`) qui surcharge sur le shape
     des arguments. Avantage : nom court et naturel pédagogiquement.
     Inconvénient : un dispatch interne au `case`, à tester soigneusement
     pour ne pas casser la signature polygone.
   - **2b — Nouveau nom `aire_sous_courbe(f, a, b)`** : pas de conflit, plus
     explicite, mais nom plus long. Évoqué en hors scope V1 d'`integrale`.

   **Recommandation** : 2a (surcharge), pour rester proche du vocabulaire
   pédagogique. À tester rigoureusement (cas `aire(P1, P2, P3)` continue
   de fonctionner ; cas `aire(f, a, b)` route vers la nouvelle logique).

3. **Couleur par défaut** : verte (`#22c55e`) pour distinguer visuellement
   d'`integrale` (bleu) sur une figure pédagogique conjointe ? Ou même
   couleur (couleur de la fonction) avec opacité légèrement supérieure ?
   **Recommandation** : verte, pour le contraste pédagogique.

4. **Détection des zéros** : `findRoots` (200 samples + bisection, ~2-5 ms,
   précis) ou un sign-change shallow custom (50 samples + interp linéaire,
   ~0.5 ms, moins précis mais largement suffisant pour des zones visuelles
   à 10⁻³ près) ? **Recommandation** : `findRoots`, déjà testé et utilisé
   ailleurs dans le projet.

5. **Refactorisation tardive `integrale`/`aire`** : faut-il extraire un
   helper commun `interpretAreaBuiltin` en Phase 2, ou attendre une V3
   après avoir vu le code livré ? **Recommandation** : attendre. Le risque
   de régression sur les 96 tests V1 d'`integrale` n'est pas justifié par
   l'économie (~30 lignes dupliquées).

---

## 6. Hors scope V1 (`aire`)

Cohérent avec la V1 d'`integrale` :

- ❌ Bornes infinies (intégrale impropre).
- ❌ `aire_entre(f, g, a, b)` — aire entre deux courbes (V3).
- ❌ Détection rigoureuse de singularités (V3, mutualisé avec V2 d'`integrale`).
- ❌ Export TikZ/Typst de l'élément `aire`.
- ❌ Affichage de la valeur exacte symbolique (V1 = approximation décimale).
- ❌ Refactorisation `integrale`/`aire` en helper commun (cf. §5 Q5).
- ❌ Renommage `GeoIntegralArea` → `GeoAreaUnderCurve` (option γ, V3).

---

## 7. Fichiers à créer / modifier

**Modifiés (V1 d'`integrale` étendue)** :

- `src/lib/geometry-core/types/elements.ts`
  - Ajout `signed: boolean` (optionnel ? non — défault `true` au niveau du
    type pour rester strict, défaut V1 dans la factory).
- `src/lib/geometry-core/graph/figure.ts`
  - Signature `createIntegralArea(...)` : nouveau paramètre
    `options.signed?: boolean` (défaut `true`).
  - Compute closure branchée sur `signed`.
  - Import `findRoots` depuis `$lib/mathAST/analysis/roots`.
- `src/lib/geometry-core/dsl/builtins.ts`
  - Ajout `case 'aire'` (clone de `'integrale'` avec `signed: false`).
- `src/lib/geometry-core/dsl/singularity-warn.ts`
  - `formatSingularityWarnings` accepte un préfixe paramétrique.
- `src/lib/components/geometry/GeometryCanvas.svelte`
  - Dispatcher `integralArea` branché sur `el.signed` pour `fillOpacity`.
- `src/routes/(public)/geometry-demo/sliders/+page.svelte`
  - Ajout d'une carte « Aire dynamique ».
- `docs/ref/geometry-dsl/integrale.md`
  - Lien vers la nouvelle doc `aire.md`.

**Nouveaux** :

- `src/lib/geometry-core/graph/__tests__/figure-integral-area-unsigned.test.ts`
  (Phase 1 — tests `signed=false`).
- `src/lib/geometry-core/dsl/__tests__/interpreter-aire.test.ts`
  (Phase 2).
- `src/routes/(public)/geometry-demo/sliders/aire/+page.svelte` +
  `+page.ts` (Phase 4).
- `docs/ref/geometry-dsl/aire.md` (Phase 4 — calque sur `integrale.md`).
- `docs/wip/geometry/aire-progress.md` (au fil de l'eau).

---

## 8. Critère de succès de l'étude

Cette étude permet une décision GO/NO-GO sur l'implémentation, et fournit :

- ✅ API DSL exposée (§3)
- ✅ Type d'élément retenu (option α — §2.5) avec migration V1 documentée (§7)
- ✅ Fonctions `mathAST` appelées et où (`findRoots` §1.1, `integrateDefinite`/`numericIntegrate` §1.3, formules §2.6)
- ✅ Effort V1 chiffré (§4 — 9-12 h)
- ✅ Cas couverts V1 vs V2/V3 (§3, §6)
- ✅ Validation expérimentale jouée et retirée (§1.5)
- ✅ Questions ouvertes ciblées (§5 — 5 questions)
