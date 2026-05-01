# Étude — Détection rigoureuse des singularités V2 pour `integrale` et `aire`

**Date** : 2026-05-01
**Statut** : Phase 0 (étude). Pas de code de production écrit.
**Scope** : remplacer `singularity-warn.ts` (heuristique par échantillonnage,
livré dans V1 d'`integrale` et `aire`) par une analyse rigoureuse basée sur
`mathAST/analysis/continuity`.
**Brief amont** : `docs/wip/geometry/prompt-singularity-rigorous-study.md`.

---

## 0. TL;DR

- `analyzeContinuity()` est **suffisant et rapide** (max 0.89 ms, total
  2.86 ms sur 14 cas représentatifs) pour remplacer l'heuristique V1, en
  conservant la sémantique synchrone à la création.
- **Recommandation Q1 (sémantique)** : **Option C** — comportement par
  type. Removable → calcul normal (silencieux). Jump → calcul + warn
  pédagogique. Infinite/Essential → `NaN` + warn divergence.
- **Recommandation Q5 (migration)** : **Option α** — réécrire l'intérieur
  de `singularity-warn.ts` autour d'`analyzeContinuity` en préservant
  l'API publique (`warnIfSingularitySuspected`). Plus, **ajouter** un
  nouveau retour structuré pour permettre au compute closure de connaître
  les types et splitter au besoin (cf. Q1/§API V2).
- Tests V1 : la majorité reste valide ; ~5 ajustements ciblés (notamment
  les cas où V2 sera **silencieux** alors que V1 émettait un warn —
  c'est une amélioration, pas une régression).
- Effort estimé : **5-7 h** (3 phases) — proche du budget brief.
- 5 questions ouvertes en §6 pour validation utilisateur avant le plan
  TDD final.

---

## 1. Inventaire confirmé

### 1.1 `mathAST/analysis/continuity` — surface utile

```ts
// src/lib/mathAST/analysis/continuity.ts
export function analyzeContinuity(
	expr: MathNode,
	variable?: string, // default 'x'
	options?: ContinuityOptions
): ContinuityResult;

// Result type
interface ContinuityResult {
	domain: Domain; // useful for boundary cases
	discontinuities: readonly Discontinuity[]; // the gold mine
	isContinuousOnDomain: boolean; // shortcut early-exit
	variable: string;
	steps?: readonly ContinuityStep[]; // skipped at verbosity:'result'
}

// Each Discontinuity (continuity-types.ts:82)
interface Discontinuity {
	point: MathNode;
	type: 'removable' | 'jump' | 'infinite' | 'essential';
	leftLimit: MathNode | null;
	rightLimit: MathNode | null;
	leftLimitSign?: 'positive' | 'negative' | 'unknown'; // 'infinite' only
	rightLimitSign?: 'positive' | 'negative' | 'unknown'; // 'infinite' only
	functionValue: MathNode | null;
	source:
		| 'division'
		| 'sqrt'
		| 'ln'
		| 'log'
		| 'tan'
		| 'cot'
		| 'sec'
		| 'csc'
		| 'abs'
		| 'sign'
		| 'floor'
		| 'ceil'
		| 'piecewise'
		| 'other';
	description: string; // French
	periodic?: PeriodicDiscontinuityInfo; // tan/cot/etc.
}
```

Helpers utiles également exportés (`continuity-steps.ts`) :

- `getDiscontinuityTypeDescription(type)` — phrase FR figée.
- `getDiscontinuitySourceDescription(source)` — phrase FR figée.
- `describeDiscontinuity(disc, variable)` — description complète multi-ligne.
- `describeDiscontinuityShort(disc, variable)` — courte (`x = 0 : asymptote verticale`).

L'option `verbosity: 'result'` désactive la collecte des steps — utilisée
en V2 puisque le builtin DSL n'a pas besoin du pas-à-pas pédagogique.

### 1.2 `singularity-warn.ts` V1 — contrat actuel à préserver

```ts
// API publique (src/lib/geometry-core/dsl/singularity-warn.ts)
export interface SingularityFinding {
	kind: 'division' | 'tan' | 'ln' | 'sqrt';
	description: string;
	approxLocation?: number;
}

export function findSingularitiesInRange(
	expr: MathNode,
	variable: string,
	a: number,
	b: number
): SingularityFinding[];

export function formatSingularityWarnings(
	findings: SingularityFinding[],
	line?: number,
	builtin?: string
): string;

export function warnIfSingularitySuspected(
	expr: MathNode,
	variable: string,
	a: number,
	b: number,
	line?: number,
	builtin?: string
): void;
```

**Consommateur unique** : `src/lib/geometry-core/dsl/builtins.ts` aux deux
appels (`case 'aire'` ligne 1180 et `case 'integrale'` ligne 1763). Aucun
autre code n'importe le module — confirmé par grep, donc la migration
est locale.

### 1.3 Bench expérimental — `analyzeContinuity` est rapide

Mesuré sur ce repo (Node, vitest, environnement développement) après
warm-up, moyennes sur 5 runs avec `verbosity: 'result'` :

| Cas             |  Temps (ms) |
| --------------- | ----------: |
| `1/(x^2-1)`     |        0.89 |
| `tan(x)`        |        0.58 |
| `(x^2-1)/(x-1)` |        0.45 |
| `sin(1/x)`      |        0.21 |
| `1/(x-2)`       |        0.20 |
| `1/x + ln(x)`   |        0.14 |
| `1/x`           |        0.11 |
| `sqrt(x)`       |        0.08 |
| `ln(x)`         |        0.07 |
| `floor(x)`      |        0.06 |
| `sin(x)/x`      |        0.05 |
| `x^2 + 1`       |        0.01 |
| `sign(x)`       |        0.01 |
| `cos(x)`        |        0.00 |
| **Total / Max** | 2.86 / 0.89 |

Cible du brief : < 50 ms par appel. **Marge ≈ 56×** sur le pire cas.
Conséquence : pas besoin de cache, pas besoin d'async, pas de web worker.
On garde la sémantique V1 : appel synchrone à la création, jamais
re-déclenché sur drag.

### 1.4 Comportement par type (observations expérimentales)

Captures détaillées issues de la sonde
`_throwaway-singularity-study.test.ts` (sera supprimée à la fin) :

#### a. Removable

`(x^2-1)/(x-1)` sur `[0, 2]` :

```
type: 'removable', source: 'division'
leftLimit = rightLimit = 2
functionValue: null  (fonction non définie au point — divisé par zéro)
description: "Discontinuité par trou (fonction non définie)"
isContinuousOnDomain: true   (point exclu du domaine)
```

`sin(x)/x` sur `[-1, 1]` : idem, `leftLimit = rightLimit = 1`.

**Implication V2** : intégrale **converge** ; on peut continuer à appeler
`integrateDefinite` qui devrait retourner la valeur correcte (la fonction
prolongée par continuité). Le warn est **optionnel/pédagogique**.

#### b. Jump

`floor(x)` sur `[0, 3]` : 4 discontinuités (0, 1, 2, 3) avec
`leftLimit/rightLimit` corrects et `functionValue` correct.
`isContinuousOnDomain: false` (les sauts sont **dans** le domaine
universel).

**Bug observé `sign(x)`** : 0 discontinuité retournée sur `[-1, 1]` alors
que `sign` change en 0. Quand l'argument est juste la variable, le
chemin `findArgumentZeros` reste vide (zéro non trouvé via `findZeros`
parce que c'est la variable elle-même, pas un polynôme à factoriser).
**Limitation connue** : non bloquant pour V2 (la heuristique V1 ne
détectait pas non plus `sign`). À documenter.

**Implication V2** : intégrale **converge** au sens de Riemann
(saut intégrable). `integrateDefinite` peut peiner symboliquement (V1
le savait déjà : `floor` est dans la liste des cas non couverts
symboliquement). Warn pédagogique recommandé pour aider l'élève.

#### c. Infinite

`1/x` sur `[-1, 1]` : `leftLimitSign = 'negative'`, `rightLimitSign =
'positive'`. Description complète :
`"Discontinuité infinie (asymptote verticale, -∞ à gauche, +∞ à droite)"`.

`1/(x^2-1)` sur `[-2, 2]` : 2 discontinuités, signs distincts à chaque
pôle.

`tan(x)` sur `[0, 2π]` : 2 pôles dans range, périodique enrichi.

**Implication V2** : intégrale **diverge**. On retourne `NaN` (la
valeur calculée par `integrateDefinite` est trompeuse — ex. sur `1/x`
elle peut renvoyer `0` par antisymétrie, ce qui fait croire à une
intégrale convergente). Warn divergence explicite.

#### d. Essential

`sin(1/x)` sur `[-1, 1]` : `type: 'essential'`, `source: 'division'`,
limites nulles.

`1/x + ln(x)` sur `[-1, 1]` : seule **une** discontinuité retournée
(`type: 'essential'`, `source: 'ln'`) — la classification globale
absorbe les deux problèmes. C'est OK pour V2 (un message suffit).

**Implication V2** : intégrale **diverge ou indéterminée**. NaN + warn
essentiel.

#### e. Cas particulier : `sqrt(x)` au bord

`sqrt(x)` sur `[-1, 4]` :

```
point: 0, type: 'essential', source: 'sqrt'
leftLimit: null, rightLimit: 0      ← limite finie d'un côté !
functionValue: 0
isContinuousOnDomain: false
```

L'analyse classe comme `essential` parce que la limite à gauche
n'existe pas. **Mais** sur `[a, b]` avec `a = 0`, `sqrt(x)` est
parfaitement intégrable (et la primitive existe). Cas à traiter
spécialement (cf. Q2 ci-dessous).

#### f. `tan` — point exact peu pédagogique

Le point retourné pour le pôle de `tan` est **un nombre flottant
tronqué** (`1.570796327`, `4.71238898`) au lieu de `π/2` ou `3π/2`.
La description périodique (`"discontinuités en \pi:/2 + k·\pi"`)
contient un artefact de formatage LaTeX (`\pi:/2`) qui s'affichera mal
dans la console. À nettoyer dans le format du warn V2 (utiliser
`describeDiscontinuityShort` ou reformater nous-mêmes plutôt que la
description brute pour ce cas).

---

## 2. Recommandations argumentées

### Q1. Sémantique du résultat en présence d'une discontinuité dans `[a, b]`

**Recommandation : Option C — comportement selon `Discontinuity.type`.**

| Type             | Action V2                          | Warn                  |
| ---------------- | ---------------------------------- | --------------------- |
| Hors `[a, b]`    | Calcul normal                      | Aucun                 |
| `removable` dans | Calcul normal (intégrale converge) | Aucun (silencieux)    |
| `jump` dans      | Calcul (Riemann-intégrable)        | Pédagogique optionnel |
| `infinite` dans  | **`NaN`** retourné                 | Divergence explicite  |
| `essential` dans | **`NaN`** retourné                 | Essentielle explicite |

**Justification** :

1. `removable` → les deux limites existent et sont égales : la fonction
   prolongée par continuité est intégrable. Ne pas polluer la console.
2. `jump` → l'intégrale au sens de Riemann existe. Warn pédagogique
   utile (l'élève doit savoir que sa primitive symbolique peut être
   incorrecte sur un saut). Mais on **calcule** quand même (numérique
   si symbolique échoue).
3. `infinite` → l'intégrale **diverge** mathématiquement. Renvoyer une
   valeur numérique calculée serait pire que NaN (faux positif type
   `∫_{-1}^{1} 1/x dx = 0` par antisymétrie numérique). NaN se propage
   dans le rendu (la légende affichera "indéfini") et l'utilisateur
   est invité à splitter ou changer les bornes.
4. `essential` → idem.

**Coût d'implémentation** : ~10 lignes dans `case 'integrale'`/
`case 'aire'` (consulter le résultat de `findSingularitiesInRange` V2
qui retournera maintenant `Discontinuity[]` au lieu de juste warner).

### Q2. Singularité aux bornes (`f` discontinue exactement en `a` ou `b`)

**Cas à distinguer** :

- **Limite unilatérale finie du bon côté** (ex. `sqrt(x)` sur `[0, 4]` :
  limite droite en 0 = 0, fonction définie en 0). → **Pas de warn**,
  intégrale converge. C'est un cas normal en lycée.
- **Limite infinie sur la borne** (ex. `1/x` sur `[0, 1]`). → C'est une
  intégrale impropre. V1 ne couvre pas → **NaN + warn impropre** (cf.
  Q1, type `infinite`).
- **Removable sur la borne** (ex. `(x²-1)/(x-1)` sur `[1, 2]`). → Calcul
  normal, silencieux.

**Implémentation** : pour chaque discontinuité dont le `point` est très
proche d'une borne (`|p - a| < ε` ou `|p - b| < ε`, avec `ε = 1e-9`) :

- Si `type` ∈ {`removable`, `jump`} ET la limite du bon côté existe
  finie : pas de warn, calcul normal.
- Si `type` ∈ {`infinite`, `essential`} : warn impropre, NaN.

Le cas `sqrt(x)` au bord 0 (classé essential par le module mais avec
limite droite finie) est traité comme un type "1" via cette règle.

### Q3. Format du warn console

**Format proposé** (multi-ligne, pas plus de 4 lignes par discontinuité) :

```
integrale ligne 7: f a une discontinuité en x = 0 ∈ [-1, 1].
  • Type : asymptote verticale (-∞ à gauche, +∞ à droite)
  • Cause : division par zéro
  • L'intégrale diverge — retour NaN.
```

Pour plusieurs discontinuités, header pluriel puis `•` par item :

```
integrale ligne 12: f a 2 discontinuités dans [-2, 2].
  • x ≈ -1 : asymptote verticale (+∞ à gauche, -∞ à droite)
  • x ≈ 1 : asymptote verticale (-∞ à gauche, +∞ à droite)
  L'intégrale diverge — retour NaN.
```

**Source du texte** :

- "asymptote verticale" / "saut" / "trou" / "discontinuité essentielle" :
  via `describeDiscontinuityShort` ou notre propre map (court).
- Cause : `getDiscontinuitySourceDescription(disc.source)` (déjà en FR).
- Conclusion finale ("L'intégrale converge…", "L'intégrale diverge — …",
  etc.) : décidée par le builtin selon Q1.
- Position : si `point.type === 'number'`, formatter avec `≈ %.3g` ou
  exact si entier ; sinon utiliser un fallback `toCustom(point)` tronqué.
- **Ne pas** réutiliser tel quel `disc.description` pour les périodiques
  car le formatage LaTeX (`\pi:/2`) est inadapté à la console.

### Q4. Performance

**Tranchée** : pas un sujet. Bench § 1.3 ⇒ < 1 ms par appel sur tous
les cas testés. Aucune optimisation à mettre en place. Aucun cache.
Aucun async.

### Q5. Migration de `singularity-warn.ts`

**Recommandation : Option α + extension API.**

- `findSingularitiesInRange(expr, variable, a, b)` change son **type
  de retour interne** : au lieu de `SingularityFinding[]`, retourne
  `RangeDiscontinuity[]` (nouveau type, plus riche, voir §3).
- L'ancienne signature `SingularityFinding` est **supprimée** (aucun
  consommateur autre que les tests V1).
- `warnIfSingularitySuspected(expr, variable, a, b, line?, builtin?)`
  garde sa signature et son comportement par défaut (warn pour les cas
  qui méritaient un warn V1). Mais elle devient un wrapper léger
  par-dessus la nouvelle fonction.
- **Nouveau export** : `analyzeRangeContinuity(expr, variable, a, b)`
  qui retourne le résultat structuré (utilisé par le builtin pour
  décider Q1).

Pourquoi pas Option β/γ ? Trop de churn pour 2 call sites, et l'API
publique reste utile pour d'éventuels futurs builtins (ex. `longueur`,
qui aura les mêmes besoins). Option α minimise le diff dans
`builtins.ts` tout en exposant un retour structuré.

### Q6. Réactivité au drag de slider

**Tranchée à V1** : warn une seule fois à la création, pas re-warn sur
drag. **Conservé en V2.**

**Mais** : la **décision Q1** (NaN ou calcul) doit-elle, elle, devenir
réactive au drag ?

**Recommandation** : **oui mais sans nouveau coût**. Le résultat de
`analyzeRangeContinuity` à la création **inclut déjà** la liste des
discontinuités du domaine de `f` (indépendant des bornes). On cache
cette liste dans le `GeoIntegralArea` (champ optionnel
`discontinuities?`). Le compute closure consulte ce cache à chaque
drag :

- Filtre les `Discontinuity` qui tombent dans `[a(t), b(t)]` (les bornes
  courantes).
- Si liste vide → calcul normal.
- Sinon → applique la matrice Q1 (NaN si infinite/essential, calcul
  sinon).

Coût drag : ~O(n) sur `n = discontinuities.length` (typiquement 0-2).
Pas de re-call à `analyzeContinuity`. **Pas de re-warn console** sur
drag.

### Q7. Cas limites & comportement de `analyzeContinuity` sur chaque type

Tous tranchés expérimentalement (§ 1.4). Synthèse :

| Cas test                  | type V2                             | Action V2                                   | OK ?                                        |
| ------------------------- | ----------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `(x²-1)/(x-1)` ∈ `[0, 2]` | removable                           | Calcul, silence                             | ✅                                          |
| `sin(x)/x` ∈ `[-1, 1]`    | removable                           | Calcul, silence                             | ✅                                          |
| `floor(x)` ∈ `[0, 3]`     | jump                                | Calcul + warn pédago                        | ✅                                          |
| `sign(x)` ∈ `[-1, 1]`     | (rien détecté)                      | Calcul, silence                             | ⚠️ limite connue (cf. § 1.4 b)              |
| `1/x` ∈ `[-1, 1]`         | infinite                            | NaN + warn divergence                       | ✅                                          |
| `tan(x)` ∈ `[0, 2π]`      | infinite × 2                        | NaN + warn (2 disc.)                        | ✅                                          |
| `ln(x)` ∈ `[-1, 2]`       | infinite (en 0)                     | NaN + warn impropre                         | ✅                                          |
| `sqrt(x)` ∈ `[-1, 4]`     | essential (en 0)                    | NaN + warn (point hors `[0,4]` côté gauche) | ✅ (cohérent : f non définie sur `[-1, 0)`) |
| `sqrt(x)` ∈ `[0, 4]`      | essential (en 0) — **mais bordure** | Calcul, silence (cf. Q2)                    | ✅                                          |
| `sin(1/x)` ∈ `[-1, 1]`    | essential                           | NaN + warn essentielle                      | ✅                                          |
| `1/(x²-1)` ∈ `[-2, 2]`    | infinite × 2                        | NaN + warn (2 disc.)                        | ✅                                          |
| `x² + 1` ∈ `[-10, 10]`    | aucune                              | Calcul, silence                             | ✅                                          |

### Q8. Hors scope V2

Confirmé tel que dans le brief :

- ❌ Bornes infinies (`∫_{-∞}^{+∞}`) — V3.
- ❌ Splittage automatique au point removable pour aider
  `integrateDefinite` à converger symboliquement — pas nécessaire
  (convergence numérique existe déjà via `numericIntegrate` en
  fallback).
- ❌ UI utilisateur visible (panneau d'avertissement) — reste console.
- ❌ Détection rigoureuse de `sign(x)` quand l'argument est la variable
  (limitation connue § 1.4 b). À ouvrir comme ticket séparé sur
  `findArgumentZeros` du module continuity.

---

## 3. API V2 du module `singularity-warn.ts`

### 3.1 Nouvelle structure de retour

```ts
// src/lib/geometry-core/dsl/singularity-warn.ts

import type { Discontinuity } from '$lib/mathAST/analysis';

/**
 * Discontinuity that falls inside the integration range [a, b].
 * Carries the full mathAST discontinuity info plus a flag telling whether
 * it sits at one of the endpoints (in which case the integral may still
 * converge — see study Q2).
 */
export interface RangeDiscontinuity {
	readonly disc: Discontinuity;
	readonly atBoundary: 'lower' | 'upper' | 'interior';
	/**
	 * Whether this discontinuity makes the integral diverge.
	 * - infinite/essential interior → true
	 * - infinite/essential at boundary with one finite one-sided limit → false
	 * - removable/jump → false
	 */
	readonly causesDivergence: boolean;
}

/**
 * Analyse continuity of expr restricted to [a, b].
 *
 * Returns the discontinuities inside [a, b] (interior + boundary), each
 * tagged with its location and whether it forces divergence.
 *
 * @returns null when bounds are non-finite or [a, b] is degenerate.
 */
export function analyzeRangeContinuity(
	expr: MathNode,
	variable: string,
	a: number,
	b: number
): readonly RangeDiscontinuity[] | null;

/**
 * Backwards-compatible wrapper. Emits one console.warn message that lists
 * all relevant discontinuities and their consequence (warn for jump,
 * divergence for infinite/essential interior, etc.).
 *
 * Silent when:
 * - bounds non-finite
 * - no discontinuity in [a, b]
 * - all discontinuities are removable
 * - boundary discontinuities with finite one-sided limit
 */
export function warnIfSingularitySuspected(
	expr: MathNode,
	variable: string,
	a: number,
	b: number,
	line?: number,
	builtin?: string
): void;
```

L'ancien `SingularityFinding`, `findSingularitiesInRange`,
`formatSingularityWarnings` sont **supprimés**. Aucun consommateur
externe à mettre à jour (cf. § 1.2).

### 3.2 Intégration dans `builtins.ts`

```ts
// case 'integrale' (et symétrique pour 'aire')
const rangeDiscs = analyzeRangeContinuity(
	intFnEl.expression,
	'x',
	lower.numericValue,
	upper.numericValue
);

// Cache for compute closure (slider drag uses same expression but new bounds)
intResult.discontinuities = rangeDiscs ?? undefined;

// Warn (silent on clean / removable / safe boundary cases)
warnIfSingularitySuspected(
	intFnEl.expression,
	'x',
	lower.numericValue,
	upper.numericValue,
	line,
	'integrale'
);
```

Le compute closure (séparé) consulte `discontinuities` cached pour
décider de retourner `NaN`. **Question ouverte O5 ci-dessous** : où
exactement vit ce cache (champ sur `GeoIntegralArea` vs. closure
fermée).

---

## 4. Plan TDD attendu (3 phases, ~5-7 h)

### Phase 0 — Spécification (ce document) ✅

**Livrable** : `docs/wip/geometry/singularity-rigorous-study.md`
(ce fichier).

### Phase 1 — Comportements V2 + tests rouges + impl `analyzeRangeContinuity`

| Tâche                                                                                                        | Agent / Méthode                    |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| 1.1 Lister comportements en français, attendre validation utilisateur                                        | direct (Claude) — TDD §1           |
| 1.2 Écrire tests rouges sur `analyzeRangeContinuity` (~15 cas couvrant matrice Q7)                           | `test-automator` (Sonnet)          |
| 1.3 Implémenter `analyzeRangeContinuity` autour de `analyzeContinuity`                                       | direct (Claude)                    |
| 1.4 Refactor `warnIfSingularitySuspected` en wrapper utilisant `analyzeRangeContinuity` + nouveau format §3  | direct (Claude)                    |
| 1.5 Ajuster les ~5 tests V1 dont le comportement attendu change (V2 silencieux où V1 warnait — amélioration) | direct (Claude)                    |
| 1.6 Code review                                                                                              | `code-reviewer` (Sonnet, proactif) |
| 1.7 Commit                                                                                                   | `commit-manager` (commit complexe) |

**Tests V1 à ajuster** (estimation après lecture de
`singularity-warn.test.ts`) :

- Cas `1/x + ln(x) ∈ [-1, 1]` test G/aggregate : V2 ne mentionnera plus
  séparément "dénominateur" + "ln" dans la même phrase parce que la
  classification fond les deux en une seule discontinuité essentielle
  en 0. Mettre à jour l'attente.
- Cas `findFirstWhere` (V1 ratait les dips) : V2 les détecte. Ajouter
  des tests positifs au lieu de marquer ces cas comme "limitation
  connue".
- Cas `tan(2x)` : vérifier que V2 le détecte aussi (le module
  `analyzeContinuity` expose `findPeriodicFunctionDiscontinuities` mais
  uniquement pour argument = variable simple ; pour `tan(2x)` le
  domain `periodic_exclusion` peut ou non capturer — à valider).

### Phase 2 — Intégration dans `case 'integrale'` et `case 'aire'`

| Tâche                                                                                    | Agent / Méthode           |
| ---------------------------------------------------------------------------------------- | ------------------------- |
| 2.1 Lister comportements (sémantique Q1) en français, attendre validation                | direct (Claude)           |
| 2.2 Tests sur le builtin DSL : intégrale `1/x` retourne NaN, intégrale `sin(x)/x`        | `test-automator` (Sonnet) |
| retourne valeur correcte, etc. (~10 nouveaux tests dans builtins.test.ts)                |                           |
| 2.3 Modifier `case 'integrale'` et `case 'aire'` pour consulter `analyzeRangeContinuity` | direct (Claude)           |
| 2.4 Cacher le résultat sur l'élément (cf. O5 ci-dessous)                                 | direct (Claude)           |
| 2.5 Adapter le compute closure pour retourner NaN sur infinite/essential interior        | direct (Claude)           |
| 2.6 Code review (focus sur la rétrocompatibilité de la sémantique signed/unsigned)       | `code-reviewer` (Sonnet)  |
| 2.7 Commit                                                                               | `commit-manager`          |

### Phase 3 — Quality checks finaux

| Tâche                                                                 | Méthode                     |
| --------------------------------------------------------------------- | --------------------------- |
| 3.1 `pnpm format` sur fichiers modifiés                               | direct                      |
| 3.2 `pnpm check:incremental`                                          | direct                      |
| 3.3 `mcp__svelte__svelte-autofixer` si .svelte modifié (a priori non) | direct                      |
| 3.4 Suppression de `_throwaway-singularity-study.test.ts`             | direct                      |
| 3.5 Mise à jour `docs/wip/geometry/singularity-rigorous-progress.md`  | direct (doc de progression) |

### Estimation effort

| Phase     | Tâches principales                                    |   Effort |
| --------- | ----------------------------------------------------- | -------: |
| 0         | Étude (ce doc)                                        |     ~1 h |
| 1         | Tests + impl `analyzeRangeContinuity` + refactor warn |     ~3 h |
| 2         | Intégration builtins + sémantique NaN                 |     ~2 h |
| 3         | Quality + cleanup + progress doc                      |     ~1 h |
| **Total** |                                                       | **~7 h** |

---

## 5. Tests V1 — impact

**Fichier** : `src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts`
(33 tests). Triage rapide :

| Section                                | Sort                                                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Clean cases (8 tests)               | **Inchangés**                                                                                                                                                                 |
| B. Division (6 tests)                  | **Inchangés** (V2 détecte ces cas aussi)                                                                                                                                      |
| C. tan (3 tests)                       | À vérifier `tan(2x)` cas (cf. ci-dessus)                                                                                                                                      |
| D. ln (3 tests)                        | **Inchangés**                                                                                                                                                                 |
| E. sqrt (3 tests)                      | À ajuster : V2 reportera `sqrt(x) ∈ [-1, 1]` comme `essential` (semantically equivalent finding, but the assertion `f.kind === 'sqrt'` doit devenir `disc.source === 'sqrt'`) |
| F. Robustness (3 tests)                | **Inchangés** (V2 doit aussi tolérer ces cas)                                                                                                                                 |
| G. Format (3 tests)                    | À ajuster : nouveau format de message                                                                                                                                         |
| `warnIfSingularitySuspected` (4 tests) | **Inchangés** (signature préservée)                                                                                                                                           |

Plus précisément, dans la suite tests sur `findSingularitiesInRange`
(suppression complète de cette fonction → suppression des tests A-F qui
y font appel directement), il faut soit :

- **Option a** : adapter ces tests à `analyzeRangeContinuity` (plus
  riche, donc tests plus précis : on assertera `disc.type` en plus de
  `disc.source`).
- **Option b** : les supprimer et compter sur les nouveaux tests
  Phase 1 + tests builtins Phase 2.

Recommandation : **Option a** — plus de couverture pour ~30 minutes de
travail.

---

## 6. Questions ouvertes (≤ 5) — pour validation utilisateur avant Phase 1

> Ces questions doivent être tranchées avant le démarrage du plan TDD.
> Elles ne sont pas bloquantes pour l'étude.

**O1.** Confirmer **Option C** pour la sémantique (Q1) : retourner
`NaN` pour `infinite`/`essential` à l'intérieur de `[a, b]`, calculer
silencieusement pour `removable`, calculer + warner pour `jump`. Ou
préfères-tu un comportement plus simple comme "warn dans tous les cas,
calculer toujours" ?

**O2.** Format du warn (Q3) : OK avec le format multi-ligne proposé
(header + bullets) ? Ou plus court (une seule ligne par discontinuité,
sans contexte sur la cause) ? Question importante pour le bruit
console pendant le développement.

**O3.** Cas `sqrt(x)` au bord 0 (Q2) : confirmer que pour `aire` /
`integrale` sur `[0, 4]`, il **ne faut pas** émettre de warn et **il
faut** calculer la valeur (intégrale convergente). C'est la
recommandation, mais c'est un comportement non-évident.

**O4.** Cache des discontinuités sur `GeoIntegralArea` (Q6) : est-il
acceptable d'**ajouter un champ optionnel** sur le type
`GeoIntegralArea` (`discontinuities?: readonly RangeDiscontinuity[]`)
pour que le compute closure puisse y accéder ? Alternative : refermer
sur la liste dans le compute closure créé à `createIntegralArea`.

**O5.** Limitation `sign(x)` (Q8) : OK pour la documenter en V2 et la
laisser pour V3 (ne pas bloquer V2 dessus) ?

---

## 7. Critère de succès — GO/NO-GO

L'utilisateur peut, à la lecture de ce document seul, prendre une
décision binaire sur :

- ✅ **L'API V2** : précisée § 3.
- ✅ **Quelles fonctions de `mathAST/analysis/continuity` sont
  appelées** : `analyzeContinuity()` est l'unique point d'entrée
  utilisé. Aucun appel à `findDiscontinuityCandidates()` ou
  `checkContinuityAtPoint()` séparément.
- ✅ **Comportement par type de discontinuité** : matrice Q1.
- ✅ **Format du warn** : exemple complet § Q3.
- ✅ **Impact tests V1** : § 5 — la majorité passe tels quels, ~5
  ajustements ciblés.
- ✅ **Effort V2 chiffré** : ~7 h sur 3 phases.
- ✅ **Cas couverts V2 vs V3** : § Q8.

Une fois les 5 questions ouvertes (§ 6) tranchées, le plan TDD est
**exécutable directement**. Pas de découverte attendue en cours de
route — l'étude expérimentale a déjà confirmé que `analyzeContinuity`
fait ce dont V2 a besoin.

---

## Références code

```
src/lib/geometry-core/dsl/singularity-warn.ts                 (V1, ~290 lignes)
src/lib/geometry-core/dsl/__tests__/singularity-warn.test.ts  (V1, 278 lignes, 33 tests)
src/lib/geometry-core/dsl/builtins.ts:1180                    (case 'aire' — call site)
src/lib/geometry-core/dsl/builtins.ts:1763                    (case 'integrale' — call site)

src/lib/mathAST/analysis/continuity.ts                        (1104 lignes)
src/lib/mathAST/analysis/continuity-types.ts                  (254 lignes)
src/lib/mathAST/analysis/continuity-steps.ts                  (317 lignes — descriptions FR)
src/lib/mathAST/analysis/__tests__/continuity.test.ts         (471 lignes — référence cas)
src/lib/mathAST/analysis/index.ts                             (export public)

docs/wip/geometry/integrale-study.md       §2.4              (décision V1 d'origine)
docs/wip/geometry/integrale-progress.md    Phase 2           (livraison V1)
docs/wip/geometry/aire-study.md            §2.9              (réutilisation V1 par aire)
docs/wip/geometry/aire-progress.md         Phase 2           (livraison V1 pour aire)
docs/wip/geometry/prompt-singularity-rigorous-study.md       (brief amont)
```

Sonde expérimentale (sera supprimée Phase 3) :
`src/lib/mathAST/analysis/__tests__/_throwaway-singularity-study.test.ts`
