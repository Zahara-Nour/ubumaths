# Étude — builtin DSL `integrale(f, a, b)` pour geometry-core

> Phase 0 (étude / spec). Aucune ligne de code de production écrite. Livrable :
> ce document + un plan TDD validable + ≤ 5 questions ouvertes ciblées.
>
> Source du brief : `docs/wip/geometry/prompt-integrale-study.md`.

---

## 1. Inventaire confirmé de `mathAST/integration`

Lecture directe du code (pas de mémoire). Les chemins et signatures ci-dessous
ont été vérifiés ligne à ligne.

### 1.1 Surface publique (`index.ts`)

```ts
// Calcul (ce qui nous intéresse pour integrale)
import { integrate, integrateDefinite } from '$lib/mathAST/integration';
import { numericIntegrate, adaptiveSimpson } from '$lib/mathAST/integration';

// Types
import type {
	IntegrateOptions,
	IntegrateResult,
	DefiniteIntegrateResult,
	IntegrationStatus, // 'exact' | 'approximate' | 'unsupported'
	IntegrationTechnique, // 'basic-rule' | 'u-substitution' | 'parts' | 'partial-fractions' | 'trig-substitution' | 'numeric'
	IntegrandType // 'polynomial' | 'rational' | ... | 'unknown'
} from '$lib/mathAST/integration';
```

### 1.2 `integrateDefinite(expr, lower, upper, options?)` — comportement réel

Source : `src/lib/mathAST/integration/integrate.ts:580-716`.

```ts
function integrateDefinite(
	expr: MathNode,
	lower: MathNode,
	upper: MathNode,
	options?: IntegrateOptions
): DefiniteIntegrateResult;

interface DefiniteIntegrateResult extends IntegrateResult {
	readonly variable: string;
	readonly status: 'exact' | 'approximate' | 'unsupported';
	readonly antiderivative: MathNode | null; // F(x)
	readonly integrandType: IntegrandType;
	readonly technique: IntegrationTechnique;
	readonly steps: readonly IntegrateStep[];
	readonly lowerBound: MathNode;
	readonly upperBound: MathNode;
	readonly value: MathNode | null; // F(b) - F(a) symbolique
	readonly approximate?: number; // évaluation décimale si dispo
	readonly error?: string;
	readonly constantNote?: string;
}
```

**Pipeline interne** :

1. Appelle `integrate(expr, options)` pour obtenir `F(x)`.
2. Si `status === 'unsupported'` ET `allowNumeric` (défaut `true`) ET `lower`,
   `upper` sont des nombres littéraux : fallback `numericIntegrate` (Simpson
   adaptatif, tolérance `1e-6`). Renvoie alors `status='approximate'`,
   `technique='numeric'`, `approximate: number`, `value: number(approximate)`.
3. Sinon : `substitute(F, x → upper)` → `evaluate({mode:'exact'})`,
   pareil pour lower, puis `subtract` et `evaluate` final.

### 1.3 `numericIntegrate(expr, variable, a, b, options?)`

Source : `src/lib/mathAST/integration/numeric.ts:257-320`.

- Bornes `a, b: number` (TypeScript natif), pas `MathNode`.
- Méthode par défaut : Simpson adaptatif (tolérance `1e-6`, `maxDepth=15`).
- Refuse si l'expression contient d'autres variables que `variable` (jet une
  `Error`).

### 1.4 Résultats expérimentaux observés

Les cas suivants ont été testés en exécutant un test temporaire jetable
(`integrate.test.ts`-style, supprimé après collecte) pour valider le
comportement réel.

| Cas                     | status                                     | technique         | value renvoyé     | Remarque                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------ | ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | --- | ---- |
| `x^2` sur `[0, 1]`      | `exact`                                    | `basic-rule`      | `1/3`             | OK                                                                                                                                                                                                                                                                                                                                                                |
| `sin(x)` sur `[0, π]`   | `exact`                                    | `basic-rule`      | `2`               | OK                                                                                                                                                                                                                                                                                                                                                                |
| `ln(x)` sur `[1, e]`    | `exact`                                    | `parts`           | `e·ln(e) − e + 1` | **Pas réduit** à `1` (mode exact ne simplifie pas `ln(e)`)                                                                                                                                                                                                                                                                                                        |
| `x` sur `[2, 0]`        | `exact`                                    | `basic-rule`      | `-2`              | Convention `∫ᵇₐ = -∫ₐᵇ` OK                                                                                                                                                                                                                                                                                                                                        |
| `x` sur `[1, 1]`        | `exact`                                    | `basic-rule`      | `0`               | OK                                                                                                                                                                                                                                                                                                                                                                |
| `x³ − x` sur `[-1, 1]`  | `exact`                                    | `basic-rule`      | `0`               | **Aire signée** (vraie aire = 1/2)                                                                                                                                                                                                                                                                                                                                |
| `1/x` sur `[-1, 1]`     | `exact`                                    | `basic-rule`      | `0`               | **🔴 BUG SILENCIEUX** : intégrale divergente, mais le code calcule `ln                                                                                                                                                                                                                                                                                            | 1   | − ln | −1  | = 0` |
| `e^(-x²)` sur `[-2, 2]` | erreur (test naïf) → OK avec bonne syntaxe | numeric (Simpson) | ≈ 1.7641          | **Détail parseur** : pour LaTeX, la constante d'Euler s'écrit `\exponentialE` (notation MathLive). `e` seul est traité comme variable et déclenche `Expression contains multiple variables: e, x`. Pour le parseur custom, `e` est reconnu directement. Aucune incidence sur l'API DSL `integrale()` (qui prend une `GeoFunction` déjà parsée par `courbe(...)`). |

**Conclusions critiques** :

- ✅ Bornes inversées (`a > b`) : convention standard supportée nativement.
- ✅ Bornes égales : renvoie `0`, pas d'erreur.
- ⚠️ **`integrateDefinite` calcule l'intégrale `F(b) − F(a)`** (valeur
  algébrique, peut être négative). Ce n'est pas la même chose que l'aire
  géométrique : aire = ∫f si f ≥ 0 sur `[a, b]`, sinon aire = −∫f.
- 🔴 **Pas de détection de singularité**. `integrateDefinite` calcule
  bêtement `F(b) − F(a)` même si `f` n'est pas continue sur `[a, b]`. C'est un
  comportement à compléter en amont dans `integrale()` côté geometry-core.
- ⚠️ Le `value` symbolique peut contenir des sous-expressions non réduites
  (ex. `ln(e)`). L'`approximate` est plus fiable pour l'affichage chiffré.

### 1.5 `mathAST/analysis` — outils utiles

- `continuity.ts` — détecter discontinuités (mais à vérifier si l'API
  permet une question « f est-elle continue sur `[a, b]` ? »).
- `roots.ts` — zéros de f (utile pour aire non-signée).

**Décision V1** : ne pas accrocher `analysis/continuity` et `analysis/roots`
dans la première version. Documenter les limites comme "responsabilité de
l'utilisateur" et prévoir l'extension en V2 (voir §6, hors scope).

---

## 2. Recommandations argumentées

### 2.1 Sémantique : intégrale (signée) vs aire (positive)

**Distinction de vocabulaire** (programme Terminale spé maths, France) :

- **Intégrale** `∫ₐᵇ f(x) dx = F(b) − F(a)` : valeur algébrique, peut être
  positive, négative ou nulle.
- **Aire** d'une région du plan : grandeur géométrique, **toujours
  positive**.
- Lien : si `f ≥ 0` sur `[a, b]`, alors `aire = ∫ₐᵇ f`. Si `f ≤ 0`, alors
  `aire = −∫ₐᵇ f`. Si `f` change de signe, on splitte sur les zéros et on
  somme les `|∫|` sur chaque sous-intervalle.

**Recommandation V1** : le builtin se nomme `integrale(f, a, b)` et calcule
l'**intégrale** `F(b) − F(a)`. Le scalaire retourné peut donc être négatif,
et c'est la sémantique correcte. Validé par l'utilisateur.

**Visuel** (validé : « teintes différentes ») : la zone dessinée représente
la région du plan entre la courbe et l'axe des x sur `[a, b]`. Pour
distinguer le signe :

- Sous-régions où `f > 0` : teinte pleine de la couleur de référence
  (par défaut : couleur de `f`).
- Sous-régions où `f < 0` : teinte plus claire / autre teinte de la même
  couleur (palette à choisir en Phase 4 — proposition par défaut : même
  hue, saturation réduite et opacité légèrement augmentée).

L'élève voit donc visuellement quand l'intégrale "soustrait", tandis que
l'affichage scalaire (`mesure(A)`) montre la valeur signée.

**V2 (hors scope)** : un futur builtin `aire(f, a, b)` (ou
`aire_sous_courbe`) pourrait calculer l'aire géométrique au sens strict,
i.e. `∫ |f|` avec splittage automatique sur les zéros de `f`. Demande
`analysis/roots.ts`. Documenté en §6.

### 2.2 Bornes inversées (`a > b`)

**Recommandation** : laisser passer (convention standard). Aucune erreur.
`integrateDefinite` la gère déjà nativement.

**Justification** : c'est la convention math standard ; corrige aussi le cas
où `a` et `b` sont des sliders pouvant se croiser.

### 2.3 Bornes infinies

**Recommandation** : **non supportées en V1**. Erreur claire si une borne
est `inf` / `-inf`.

**Justification** : `integrate.ts` n'a pas de support spécial pour les bornes
infinies, et `numericIntegrate` exige des nombres finis. Cas pédagogique
plus rare en Terminale (intégrale impropre).

### 2.4 Discontinuités / singularités dans `[a, b]`

**Recommandation V1 (validée utilisateur)** :

- Pas de détection automatique fiable côté `integrale()`.
- **Heuristique simple à inclure** : émettre un `console.warn` au moment de
  la création si l'expression de `f` contient un sous-arbre suspect (`1/x`,
  `1/x^n`, `tan(x)`, `ln(...)`, racine impaire d'un argument pouvant
  s'annuler) ET que `[a, b]` contient une racine candidate du dénominateur /
  argument problématique.
- Heuristique acceptable pour V1 : on ne bloque pas, on signale juste à la
  console développeur. Aucune UI utilisateur. Pas de tentative de splitter
  ou de retourner une erreur.
- Le résultat symbolique sera donc parfois faussement "exact" (ex. `1/x` sur
  `[-1, 1]` renvoie `0`) — le warn console invite l'utilisateur à reformuler.

**V2 (hors scope)** : intégration propre via `analysis/continuity.ts` avec
détection de domaine, splittage automatique sur les discontinuités, et
gestion des intégrales convergentes vs divergentes.

**Implémentation pratique du warn V1** :

```ts
// pseudocode dans createIntegralArea ou case 'integrale'
function checkSingularityHeuristic(expr: MathNode, a: number, b: number): void {
	const suspects = findSuspectSubexpressions(expr); // 1/g(x), tan(x), ln(g(x)), etc.
	for (const s of suspects) {
		const root = findRealRootInRange(s.problematicSubexpr, a, b);
		if (root !== null) {
			console.warn(
				`integrale: f contient ${s.label} qui s'annule en x ≈ ${root} ∈ [${a}, ${b}]. ` +
					`Le résultat de l'intégrale peut être incorrect (singularité).`
			);
		}
	}
}
```

À implémenter en utilitaire dédié (~50-80 lignes, Phase 2). Cas couverts en
V1 : `1/g(x)`, `tan(x)`, `ln(g(x))` (où `g(x) ≤ 0`). Ne couvre pas tout mais
attrape les pièges les plus fréquents en lycée.

### 2.5 Type d'élément côté geometry-core

#### Récapitulatif des trois options du brief

**Option A — un seul type dédié `GeoIntegralArea`** :
le builtin retourne un nouvel élément `GeoIntegralArea` qui regroupe valeur
**et** zone visuelle. Pas de `GeoScalar` séparé.

- ✗ Empêche `mesure(A)` et `texte("aire = {A}")` : `mesure()` ne sait
  travailler que sur des `GeoScalar`. Il faudrait l'étendre.
- ✗ Le rendu et le calcul scalaire sont mélangés dans un type lourd.
- ✓ API DSL minimale (un seul retour).

**Option B — un seul `GeoScalar` (kind `'integral'`) avec un flag visuel** :
on étend l'enum `scalarKind` avec une valeur `'integral'`. L'élément porte
à la fois la valeur réactive et un flag d'opacité de zone.

- ✗ Mélange dans un même élément les responsabilités scalaire et
  géométrique. Le renderer SVG doit alors traiter ce `scalarKind` à part.
- ✗ Stockage de `functionId`, `bounds`, etc. dans `GeoScalar` qui était
  jusqu'ici purement numérique → pollue le type.
- ✓ Pas de nouveau `type` à brancher dans tous les switchs.

**Option C — paire scalaire + élément visuel retournés ensemble** :
le builtin crée **deux éléments** (un `GeoScalar` pour la valeur, un nouveau
`GeoIntegralArea` pour la zone) avec un lien interne. Précédent dans
geometry-core : `mesure()` crée déjà `GeoScalar` + `GeoText`,
`tangente()` crée `GeoTangentLine` + points cachés, etc.

- ✓ Séparation claire des responsabilités : scalaire = valeur réactive ;
  area = rendu + style visuel.
- ✓ `mesure(A)` et `texte("...{A}")` fonctionnent gratuitement (le retour
  exposé au DSL est le `GeoScalar`).
- ✓ Le renderer voit un type dédié `'integralArea'` propre, indépendant.
- ✓ Pattern déjà éprouvé dans le codebase.
- ✗ Deux éléments à créer + lien interne à maintenir (cleanup, undo/redo).

#### Recommandation : **Option C**

Le builtin `integrale(f, a, b)` crée deux éléments :

1. Un nouveau `GeoIntegralArea` (zone visuelle, nouveau `type` dans
   geometry-core) qui porte : `functionId`, `lowerBound`, `upperBound`,
   l'antidérivée symbolique cachée `F(x)` et son `compiledF` (pour la perf —
   voir §2.6), plus les attributs visuels (couleur, opacité…).
2. Un `GeoScalar` (`scalarKind: 'expression'`) dont le `compute` lit les
   bornes courantes et calcule la valeur de l'intégrale, en s'appuyant sur
   le `compiledF` stocké dans la `GeoIntegralArea` ci-dessus quand il existe,
   sinon via `numericIntegrate` à la volée.

Le builtin retourne le **`GeoScalar`** au DSL (c'est ce qui se range dans la
variable `A` du script). La `GeoIntegralArea` est créée en interne avec un
champ `_scalarId` pointant vers le scalaire pour le ménage (et inversement,
le scalaire a un champ interne `_visualAreaId`).

**Mécanique concrète** :

```ts
// types/elements.ts — nouveau type
interface GeoIntegralArea extends GeoElementBase {
  readonly type: 'integralArea';
  readonly functionId: string;
  readonly lowerBound: ScalarParam;        // number | { scalarId }
  readonly upperBound: ScalarParam;
  /** Antidérivée symbolique cachée — utilisée pour évaluer F(b) - F(a). */
  readonly antiderivative: MathNode | null;
  /** Compiled F(x) pour évaluation rapide (ou null si fallback numérique). */
  readonly compiledF: CompiledFn | null;
  /** Statut de l'intégration symbolique (informatif). */
  readonly integrationStatus: IntegrationStatus;
  readonly dependsOn: readonly string[];   // [functionId, ?lowerScalarId, ?upperScalarId]
  /** Lien interne avec le scalaire associé. */
  readonly _scalarId: string;
}

// figure.ts
createIntegralArea(
  functionId: string,
  lower: ScalarParam,
  upper: ScalarParam,
  options?: ElementOptions
): { areaId: string; scalarId: string };
```

Sur undo / suppression : l'élément `GeoIntegralArea` et son `GeoScalar` lié
sont gérés comme un groupe (suppression de l'un cascade sur l'autre).

### 2.6 Stratégie de calcul (symbolique vs numérique)

**Note de parsing** : `courbe("y = ...")` utilise `parseCustom` (cf.
`builtins.ts:2062`). Dans cette syntaxe, `e` est directement reconnu comme
constante d'Euler (`MathConstantNode('euler')`). Pas de notation spéciale
nécessaire côté utilisateur. Pour mémoire, le parseur LaTeX (utilisé
ailleurs, par MathLive) attend `\exponentialE` — sans incidence sur
`integrale()`.

**Recommandation** :

1. **Au moment de la création** (DSL `A = integrale(f, a0, b0)`) : appeler
   `integrateDefinite(f.expression, a0, b0)` une seule fois pour :
   - obtenir l'antidérivée `F(x)` symbolique → la mémoriser dans
     `GeoIntegralArea` (champ `antiderivative?: MathNode`).
   - obtenir la première valeur (status, exact ou approx) → établit le mode.
2. **À chaque recalcul réactif** (slider `a` / `b` bouge) :
   - Si on a une `F` symbolique : évaluer `F(b) − F(a)` en numérique avec les
     valeurs courantes. **Pas de re-`integrate`**.
   - Sinon (status `approximate` ou `unsupported`) : appeler `numericIntegrate`
     avec les bornes courantes. Coût ≈ qq ms en Simpson adaptatif.

**Bench mental** : pour un slider qui bouge 60 fois/seconde, recalculer
`integrate()` à chaque frame serait coûteux (10-50 ms par appel sur des
expressions non triviales). Cacher `F` une seule fois et faire `evaluate(F,
{x: a})` à chaque frame = O(quelques μs). C'est crucial.

**Implémentation cache** : stocker `F: MathNode` dans `GeoIntegralArea`
au moment de la création. Compiler `F` aussi (`compiledF: CompiledFn`) pour
des évaluations rapides (réutiliser `compile` de `geometry-core/grapheur`).

**Cas où `F` n'existe pas** (status `unsupported` ou `approximate`) :
recompute numérique à chaque frame avec `numericIntegrate`. Acceptable car
adaptive Simpson est rapide (< 5 ms typique).

### 2.7 Réactivité

**Recommandation** :

- `a`, `b` peuvent être :
  - un nombre littéral
  - un `GeoScalar` (référence par nom DSL)
  - un `GeoSlider` (ressort de `GeoScalar` côté graphe de dépendance)
- Pas de bornes-points-sur-l'axe en V1 (signature `integrale(f, P1, P2)`
  reportée — voir §6).
- Si `f` change : pas géré V1. `GeoFunction` est immuable dans la pratique
  actuelle (créé par `courbe("y = ...")`).

### 2.8 Rendu visuel

**Recommandation (validée : teintes différentes)** :

- Pour gérer correctement les changements de signe de `f` sur `[a, b]`, il
  faut **détecter les zéros de `f` dans `[a, b]`** et splitter en
  sous-régions. Chaque sous-région est rendue par un path SVG fermé
  indépendant, coloré selon le signe de `f` sur ce sous-intervalle.
- Algorithme V1 :
  1. Échantillonner `f` sur `[a, b]` via `sampleWithDerivative`.
  2. Détecter les changements de signe de `f` aux points échantillonnés
     (interpolation linéaire entre deux points consécutifs si nécessaire,
     pour estimer un zéro `x*`).
  3. Pour chaque sous-intervalle `[xᵢ, xᵢ₊₁]` (où `f` garde un signe constant),
     générer un path : `M(xᵢ, 0)  L(xᵢ, f(xᵢ))  [points entre xᵢ et xᵢ₊₁]  L(xᵢ₊₁, f(xᵢ₊₁))  L(xᵢ₊₁, 0)  Z`.
  4. Appliquer le `fill` de couleur correspondant au signe.
- Style par défaut :
  - Sous-régions `f > 0` : `fill: couleur de la fonction` à `fillOpacity: 0.30`.
  - Sous-régions `f < 0` : `fill: même couleur` à `fillOpacity: 0.30` mais
    avec **saturation réduite** (palette à finaliser en Phase 4 ; proposition :
    blend 50 % vers blanc, ou une teinte secondaire de la palette du
    projet — à valider sur exemple).
  - Contour : `stroke: couleur de la fonction`, `strokeOpacity: 0.6`,
    `strokeWidth: 0.5` (subtil, pour ne pas voler la vedette à la courbe).
- Discontinuités détectées par `sampleWithDerivative` : ignorées en V1
  (zone potentiellement aberrante près d'une singularité — couvert par le
  warn console de §2.4).

**Réutilisation de code** : factoriser deux helpers (Phase 4) :

- `sampleFunctionOnInterval(fn, a, b, viewport)` : appelle
  `sampleWithDerivative` avec un viewport restreint en x à `[a, b]`.
- `splitOnZeros(samples)` : retourne une liste de sous-intervalles
  (`{ start, end, sign, points }[]`).

Le second sera utile aussi à la V2 (`aire_sous_courbe` et `aire_entre`).

### 2.9 Affichage de la valeur

**Recommandation (validée : pas de label automatique)** :

- Comme tout `GeoScalar`, l'utilisateur fait son propre `mesure(A)` ou
  `texte("intégrale = {A:.2f}")`.
- **Pas de label automatique** sur la figure (cohérent avec `aire(A,B,C)` qui
  ne pose pas non plus de label, et avec `derivee` qui retourne juste la
  courbe).
- Format par défaut quand mesuré : `:.2f` (deux décimales), comme pour les
  autres mesures non-angulaires (voir builtins.ts:1037).
- Cas particulier : si `value` symbolique est _propre_ (ratio entier court,
  fraction simple), on pourrait l'afficher en notation exacte. **V2** ;
  V1 = approximation décimale uniquement, pour rester simple.

---

## 3. API DSL finale proposée

### 3.1 Signature V1

```
integrale(f, a, b)                                   # bornes nombres
integrale(f, a, b, couleur="bleu", opacite=0.3)      # avec style
```

Où :

- `f` : référence à une `GeoFunction` créée par `courbe("y = ...")`.
- `a`, `b` : nombres littéraux **ou** références à un `GeoSlider` /
  `GeoScalar` (résolu par le DSL au runtime via `requireScalarOrNumber`).
- Args nommés : `couleur`, `opacite` (zone), éventuellement `trait` (contour
  on/off).

**Retourne** : un `GeoScalar` (la valeur), avec un `GeoIntegralArea` créé en
sous-élément lié (visible et stylable, mais pas exposé au DSL).

### 3.2 Signatures repoussées V2

- `integrale(f, P1, P2)` — bornes par points sur l'axe x. Demande de
  résoudre la projection point→x_coord. Pas indispensable V1.
- `integrale(f, g, a, b)` — aire entre deux courbes. Renommer
  `aire_entre(f, g, a, b)`. V2.
- `aire_sous_courbe(f, a, b)` — aire géométrique non-signée. V2.
- Bornes infinies. V2/V3.

### 3.3 Exemples d'usage

**Exemple 1 — calcul simple, valeur affichée** :

```dsl
f = courbe("y = x^2")
A = integrale(f, 0, 1)
mesure(A)         # affiche 0.33 sur la figure
```

**Exemple 2 — bornes interactives via sliders** :

```dsl
a = curseur(min=-2, max=2, valeur=-1)
b = curseur(min=-2, max=2, valeur=1)
f = courbe("y = sin(x)")
A = integrale(f, a, b, couleur="rouge", opacite=0.4)
mtexte(P1, "\\int_{a}^{b} \\sin(x)\\, dx = {A:.3f}")
```

**Exemple 3 — visualisation de la convergence vers π pour la quadrature** :

```dsl
n = curseur(min=1, max=100, valeur=10, pas=1)
# ici on pourrait... non, hors scope V1, juste pour illustrer le cas slider
```

**Exemple 4 — fonction avec changement de signe (intégrale algébrique)** :

```dsl
f = courbe("y = x^3 - x")
A = integrale(f, -1, 1)        # = 0 (les deux régions s'annulent)
texte(P, "intégrale = {A:.2f}")
```

Visuellement, la zone montrera deux sous-régions de teintes différentes
(la partie où `f > 0` et la partie où `f < 0`).

**Exemple 5 — cas non symbolique (fallback numérique)** :

```dsl
f = courbe("y = exp(-x^2)")
A = integrale(f, -2, 2)        # ≈ 1.7641 via Simpson adaptatif
mesure(A)
```

---

## 4. Plan TDD

### Phase 0 — Spécification (ce document)

- [x] Inventaire `mathAST/integration` validé par lecture
- [x] Tests expérimentaux exécutés (cas types)
- [ ] **Validation utilisateur des recommandations** ← bloque la suite

### Phase 1 — Type et factory `GeoIntegralArea`

| Tâche                                                           | Fichier                                   | Agent / Modèle      |
| --------------------------------------------------------------- | ----------------------------------------- | ------------------- |
| Ajouter `GeoIntegralArea` interface                             | `src/lib/geometry-core/types/elements.ts` | direct (Sonnet)     |
| Étendre `GeoElement` union si nécessaire                        | `src/lib/geometry-core/types/elements.ts` | direct              |
| `figure.createIntegralArea(functionId, lower, upper, options?)` | `src/lib/geometry-core/graph/figure.ts`   | `backend-developer` |
| Tests : création, dépendances, undo/redo                        | `__tests__/integral-area.test.ts`         | `test-automator`    |
| Code review                                                     |                                           | `code-reviewer`     |

**TDD** :

```ts
// Tests rouges écrits AVANT toute implémentation
it('createIntegralArea creates element with correct dependsOn');
it('createIntegralArea rejects non-function source');
it('createIntegralArea accepts numeric bounds');
it('createIntegralArea accepts slider/scalar bounds');
```

Estimé : **3-4 h**.

### Phase 2 — Builtin DSL `integrale(...)` + warn singularités

| Tâche                                                                        | Fichier                                                   | Agent                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- | ------ |
| `case 'integrale'` dans le switch                                            | `src/lib/geometry-core/dsl/builtins.ts:~1614`             | direct (Sonnet)                         |
| Helper `resolveBoundParam(arg, line)` (number                                | scalar id)                                                | `src/lib/geometry-core/dsl/builtins.ts` | direct |
| Création couplée scalaire + IntegralArea avec lien interne                   | `src/lib/geometry-core/dsl/builtins.ts`                   | direct                                  |
| **Heuristique de warn singularité** (`1/g(x)`, `tan(x)`, `ln(g(x))`, `sqrt`) | `src/lib/geometry-core/dsl/singularity-warn.ts` (nouveau) | direct                                  |
| Tests DSL : parsing, erreurs claires, warn console capturé                   | `dsl/__tests__/integrale.test.ts`                         | `test-automator`                        |
| Code review                                                                  |                                                           | `code-reviewer`                         |

Estimé : **4-5 h** (ajout heuristique).

### Phase 3 — Compute (calcul scalaire réactif)

| Tâche                                                                             | Fichier                                           | Agent                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| Ajouter compute logic dans `compute-position.ts` pour `integralArea`-bound scalar | `src/lib/geometry-core/graph/compute-position.ts` | `backend-developer`                   |
| Cache de `F` symbolique compilée dans le `GeoIntegralArea`                        | `figure.ts` (création) + `compute-position.ts`    | direct                                |
| Fallback `numericIntegrate` quand status `approximate`/`unsupported`              | `compute-position.ts`                             | direct                                |
| Tests réactivité (slider bouge → valeur change)                                   | `__tests__/integral-reactive.test.ts`             | `test-automator`                      |
| **Bench** : 100 frames de slider drag, vérifier < 16 ms / frame                   | bench manuel + log                                | `performance-optimizer` (consultatif) |
| Code review                                                                       |                                                   | `code-reviewer`                       |

Estimé : **5-6 h**.

### Phase 4 — Rendu SVG (avec splittage par signe)

| Tâche                                                                 | Fichier                                                   | Agent                |
| --------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| Helper `sampleFunctionOnInterval(fn, a, b, viewport)`                 | `src/lib/geometry-core/rendering/svg-primitives.ts`       | direct               |
| Helper `splitOnZeros(samples)` (sous-intervalles + signe par segment) | `src/lib/geometry-core/rendering/svg-primitives.ts`       | direct               |
| `integralAreaToSVG(id, figure, transformer, dims) → { paths[] }`      | `src/lib/geometry-core/rendering/svg-primitives.ts`       | `frontend-developer` |
| Palette : couleur principale + variante désaturée pour `f < 0`        | id.                                                       | direct               |
| Brancher dans le renderer principal (switch sur `type`)               | `src/lib/geometry-core/rendering/render.ts` (à confirmer) | direct               |
| Tests SVG (paths multiples, signes corrects, fillOpacity)             | `__tests__/integral-svg.test.ts`                          | `test-automator`     |
| Code review                                                           |                                                           | `code-reviewer`      |

Estimé : **4-5 h** (ajout splittage).

### Phase 5 — Pages démo + doc utilisateur

| Tâche                                        | Fichier                                                | Agent                  |
| -------------------------------------------- | ------------------------------------------------------ | ---------------------- |
| Page démo `geometry-demo/sliders/integrale/` | `src/routes/(public)/geometry-demo/sliders/integrale/` | `frontend-developer`   |
| Doc DSL (markdown)                           | `docs/ref/geometry-dsl/integrale.md`                   | `documentation-writer` |
| Code review final                            |                                                        | `code-reviewer`        |

Estimé : **2 h**.

### Phase 6 — Quality checks finaux

À la fin du plan **uniquement** (CLAUDE.md) :

- `mcp__svelte__svelte-autofixer` sur chaque `.svelte` modifié
- `pnpm check:incremental`
- `npx eslint <fichiers modifiés>`
- Document de progression `docs/wip/geometry/integrale-progress.md`
- Commit (`commit-manager` agent si > 10 fichiers, sinon direct)

### Récap effort

| Phase                              | Estimé      |
| ---------------------------------- | ----------- |
| 1. Type + factory                  | 3-4 h       |
| 2. Builtin DSL + warn singularités | 4-5 h       |
| 3. Compute réactif                 | 5-6 h       |
| 4. Rendu SVG (splittage par signe) | 4-5 h       |
| 5. Démo + doc                      | 2 h         |
| 6. Quality + commit                | 1 h         |
| **TOTAL**                          | **19-23 h** |

Plus large que l'estimation GeoGebra-comparison "~1 jour" du brief, car le
brief sous-estimait probablement : la phase compute réactive (cache F + perf
slider), la phase rendu (splittage par zéros pour les teintes différentes),
et l'heuristique singularités validée par l'utilisateur.

---

## 5. Fichiers TypeScript à créer / modifier

**Nouveaux** :

- `src/lib/geometry-core/__tests__/integral-area.test.ts` (Phase 1)
- `src/lib/geometry-core/dsl/__tests__/integrale.test.ts` (Phase 2)
- `src/lib/geometry-core/dsl/singularity-warn.ts` (Phase 2 — heuristique)
- `src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts` (Phase 2)
- `src/lib/geometry-core/graph/__tests__/integral-reactive.test.ts` (Phase 3)
- `src/lib/geometry-core/rendering/__tests__/integral-svg.test.ts` (Phase 4)
- `src/routes/(public)/geometry-demo/sliders/integrale/+page.svelte`
- `src/routes/(public)/geometry-demo/sliders/integrale/+page.ts`
- `docs/ref/geometry-dsl/integrale.md`
- `docs/wip/geometry/integrale-progress.md` (au fil de l'eau)

**Modifiés** :

- `src/lib/geometry-core/types/elements.ts` (ajout type `GeoIntegralArea`,
  union `GeoElement`)
- `src/lib/geometry-core/graph/figure.ts` (méthode `createIntegralArea`)
- `src/lib/geometry-core/graph/compute-position.ts` (compute scalaire pour le
  scalaire lié)
- `src/lib/geometry-core/dsl/builtins.ts` (`case 'integrale'`)
- `src/lib/geometry-core/rendering/svg-primitives.ts` (ajout
  `integralAreaToSVG` + helper)
- `src/lib/geometry-core/rendering/render.ts` (switch dispatch — chemin à
  confirmer en début de Phase 4)

---

## 6. Hors scope V1

- ❌ `aire(f, a, b)` ou `aire_sous_courbe(f, a, b)` — aire géométrique
  positive `∫|f|` (V2, demande splittage sur les zéros via `analysis/roots`)
- ❌ `aire_entre(f, g, a, b)` — aire entre deux courbes (V2)
- ❌ Bornes infinies (intégrale impropre)
- ❌ `integrale(f, P1, P2)` — bornes par points sur l'axe x
- ❌ Détection rigoureuse de singularités dans `[a, b]` (V1 = warn console
  heuristique uniquement, voir §2.4)
- ❌ Affichage de la valeur exacte symbolique (V1 = approximation décimale)
- ❌ Démo des étapes pédagogiques (`steps` du résultat)

---

## 7. Décisions utilisateur enregistrées

| #   | Question                         | Décision                                                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Sémantique : intégrale ou aire ? | **Intégrale** `F(b) − F(a)` (peut être négative). Vocabulaire clarifié dans §2.1. `aire(...)` reporté en V2. |
| 2   | Visuel des zones où `f < 0`      | **Teintes différentes** par sous-région selon le signe de `f`. Splittage sur les zéros (§2.8).               |
| 3   | Type d'élément                   | **Option C** retenue (paire `GeoScalar` + nouveau `GeoIntegralArea`). Recap A/B/C dans §2.5.                 |
| 4   | Label automatique                | **Aucun**. L'utilisateur fait `mesure(A)` ou `texte(...)` explicitement (§2.9).                              |
| 5   | Singularités                     | **Warn console** heuristique en V1 (§2.4). Détection rigoureuse en V2.                                       |

---

## 8. Critère de succès de l'étude

Cette étude permet de prendre une décision GO/NO-GO sur l'implémentation, et
fournit :

- ✅ API DSL exposée (§3)
- ✅ Types TypeScript introduits/modifiés (§5)
- ✅ Fonctions `mathAST` appelées et où (§2.6, §1.2)
- ✅ Effort V1 chiffré (§4)
- ✅ Cas couverts V1 vs V2 (§3 vs §6)
- ✅ Décisions utilisateur enregistrées (§7)

Le plan TDD de §4 est exécutable tel quel après cette validation.
