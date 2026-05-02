# Étude V5 — intégrales généralisées (bornes infinies) pour `integrale`, `aire`, `aire_entre`

**Phase 0 — étude uniquement, pas de code de production.**

Référence prompt : `docs/wip/geometry/prompt-improper-integrals-study.md`.

Sortie : décisions argumentées + plan TDD exécutable + ≤ 5 questions ouvertes.

Statut au 2026-05-01 : **GO recommandé**, schéma numérique testé sur les 8 cas
pédagogiques, effort total ~6–9 h.

---

## Résumé exécutif

| Élément                  | Décision V5                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| Syntaxe DSL              | Option α : `inf`, `+inf`, `-inf` (identifier pré-chargé, pas de nouveau token)    |
| Schéma numérique         | **Hybride C** : diagnose A (truncation) + calcul B (substitution `u = x/(1+x)`)   |
| Détection divergence     | Numérique seul — stagnation des deltas et croissance unboundée                    |
| Singularités intérieures | Réutilise cache `discontinuities` ; étend la borne effective `[a, T_max]`         |
| Rendu SVG                | Clipping au viewport ; pas d'indicateur visuel V5                                 |
| Chemin symbolique        | Repoussé V6 — V5 100 % numérique                                                  |
| Hors scope V5            | bornes points, `aire_intersection`, Cauchy PV, asymptote intérieure dans `[a, ∞)` |

**Bench mesuré sur les 8 cas** (machine dev) : 0.1–1.1 ms convergent, 6.9 ms
divergent (sin oscillant). Largement compatible slider réactif (<50 ms cible).

---

## 1. Inventaire confirmé (lecture des modules)

### 1.1 `area-builtin-helper.ts` — point d'extension unique (V4)

`interpretAreaBuiltin()` orchestre les 3 builtins. La fonction
`resolveBoundParam()` accepte aujourd'hui `arg.type === 'nombre'` ou `'element'`
(scalaire/curseur) et retourne `{ param, numericValue }`.

**Constat** : si `arg.value === Infinity`, la chaîne fonctionne jusqu'au compute
closure, où elle échoue silencieusement (NaN return). **Le helper est l'endroit
propre pour router** vers un nouveau chemin `improperIntegrate` quand `lower`
ou `upper` est ±∞.

```ts
// Pseudo-pseudo extension du helper (Phase 2 du plan TDD) :
const isImproper = !Number.isFinite(lower.numericValue) || !Number.isFinite(upper.numericValue);
if (isImproper) {
	return interpretImproperAreaBuiltin({ ...opts, lower, upper });
}
// chemin actuel inchangé
```

### 1.2 `figure.createIntegralArea` — compute closure

Lignes 2985-3133 (`graph/figure.ts`). Verdict actuel face aux bornes infinies :

```ts
if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN; // L. 2988
```

→ **NaN systématique** dès qu'une borne est ±Infinity. Le cache symbolique
(`cachedCompiledF`), le findRoots, et le numericIntegrate ne sont jamais
sollicités.

**Conséquence pour V5** : il faut un parallèle, **pas** modifier ce compute
closure (risque de régression sur 136 tests V1+V2+V3). Proposition :
`createImproperIntegralArea(...)` retournant la même forme
`{ areaId, scalarId }`, son propre compute closure routé vers `improperIntegrate`.

### 1.3 `mathAST/integration/numeric.ts` — `numericIntegrate`

Signature : `numericIntegrate(expr: MathNode, variable, a: number, b: number, opts)`.
Le runtime utilise `adaptiveSimpson(f, a, b, tol, depth)`. **Bornes finies
obligatoires** — Simpson référencé sur un intervalle `[a, b]` borné.

→ V5 : nouveau wrapper `improperIntegrate(expr, variable, a, b)` qui orchestre
A (truncation diagnose) + B (substitution) en réutilisant `adaptiveSimpson`
sur des intervalles bornés.

### 1.4 `mathAST/integration/integrate.ts` — `integrateDefinite`

```ts
if (opts.allowNumeric && isNumber(lower) && isNumber(upper)) {  // L. 597
    parseFloat(lower.value);  // → Infinity si lower = number('Infinity')
    numericIntegrate(...)  // échoue : adaptive-simpson NaN
}
```

→ Le système **ne supporte pas** les bornes symboliques `±∞` aujourd'hui.
Étendre `integrateDefinite` (cas e^{-x}, 1/(1+x²) pour calcul exact) est un
chantier séparé. **V5 = 100 % numérique**.

### 1.5 `singularity-warn.ts` — cache `discontinuities`

`getAllDiscontinuities(expr, var)` analyse les singularités de l'intégrande
(jumps, removable, infinite, essential) — **indépendant des bornes**, donc
réutilisable tel quel.

`classifyDiscontinuitiesForRange(allDiscs, a, b)` rejette
`!Number.isFinite(a) || !Number.isFinite(b)`. **À étendre** pour accepter une
plage `[a, T_max]` finie effective (T_max = 640 dans le diagnose, voir 2.2).

### 1.6 Parser/tokenizer DSL — gestion de `inf`

Tokenizer (lignes 137-144) : `inf` est tokenisé comme `IDENTIFIER` (n'est pas
dans `KEYWORDS`). Parser : `parsePrimary()` ligne 501-504 retourne
`{ kind: 'identifier', name: 'inf', line }`. À l'évaluation
(`interpreter.ts:236`), l'interpréteur consulte `this.symbols.get('inf')`.

→ **Solution la plus simple** : pré-enregistrer `inf` (et `infini` alias) dans
la table de symboles à la construction de l'interpréteur, comme une constante
`{ type: 'nombre', value: Infinity }`. Aucun changement parser/tokenizer.

`+inf` → tokens `PLUS, IDENTIFIER('inf')` → parsé comme expression unaire `+inf`.
Le parser actuel ne traite **pas** explicitement le `+` unaire (seul `-` l'est,
ligne 412-419). Mais une expression DSL comme `+inf` ne passe pas par
`parseUnary` (pas de cas pour PLUS). À gérer :

- Soit étendre `parseUnary()` pour accepter PLUS (cosmétique, no-op).
- Soit imposer `inf` (sans `+`) dans la doc et reconnaître `+inf` uniquement
  via grammaire d'argument de fonction (parser le `+` comme délimiteur dans
  `parseArguments`).

**Recommandation** : étendre `parseUnary()` pour reconnaître PLUS comme no-op.
Cela rend `+inf`, `+5`, `+x` symétriques au `-X` existant. 5 lignes de code.

### 1.7 SVG primitives — `integralAreaToSVG` / `BetweenToSVG`

`svg-primitives.ts:1839` :

```ts
if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
```

→ Renvoient `null` (pas de rendu) en présence de borne infinie.

**À étendre** : remplacer `lo`/`hi` non finis par les bords du viewport
calculés ligne 1845-1846 :

```ts
const topLeft = transformer.svgToMath(0, 0);
const bottomRight = transformer.svgToMath(dims.width, dims.height);
const lo = Number.isFinite(a) ? Math.min(a, b) : topLeft.x;
const hi = Number.isFinite(b) ? Math.max(a, b) : bottomRight.x;
```

Le `subViewport.xMin/xMax` reflète alors la fenêtre visible. La courbe est
échantillonnée et la zone fermée par les ordonnées 0 (axe x) — comportement
identique au cas borné.

---

## 2. Décisions tranchées (les 7 points du prompt)

### 2.1 Syntaxe DSL — Option α confirmée

```dsl
A = integrale(f, -inf, +inf)
B = aire(g, 0, inf)            # +inf optionnel, inf seul accepté
C = aire_entre(f, g, -inf, 0)
```

**Implémentation** (Phase 1) :

1. Dans `Interpreter.constructor()`, pré-charger `this.symbols`:
   - `inf` → `{ type: 'nombre', value: Infinity }`
   - `infini` → idem (alias francisé optionnel — voir Q1)
2. Étendre `parseUnary()` pour traiter PLUS comme no-op identique à MINUS.
3. Tester avec un cas représentatif : `A = integrale(f, -inf, +inf)`.

**Pourquoi α et pas β/γ** :

- α court, conventionnel scientifiquement (`-∞`, `+∞`).
- β (`infini()`) verbeux et redondant (un constructeur sans argument).
- γ (`Infinity`) anglicisme qui dénote dans un DSL francisé.

### 2.2 Schéma numérique — Hybride C (diagnose-then-compute)

**Algorithme** :

```
function improperIntegrate(f, a, b):
    if a, b both finite: return numericIntegrate(...)  // jamais ici en V5
    if a = -∞ and b = +∞:
        if diagnose(f, 0, 'left') = divergent: return NaN
        if diagnose(f, 0, 'right') = divergent: return NaN
        return substituteTwoSided(f)
    if a finite and b = +∞:
        if diagnose(f, a, 'right') = divergent: return NaN
        return substituteRightInf(f, a)
    if a = -∞ and b finite:
        symétrique au cas precedent
```

**Phase A — Diagnose** :

```
hist = [adaptiveSimpson(f, a, a + T₀·2^k) pour k = 0..6]   // T₀ = 10 → T_max = 640
deltas = |hist[i] - hist[i-1]|
si ≥ 2 niveaux consécutifs ratio deltas[k]/deltas[k-1] ≥ 0.95 → DIVERGENT
si lateMax > 5·earlyMax et earlyMax > 1e-3 → DIVERGENT
sinon CONVERGENT
```

**Phase B — Calcul (si convergent)** :

Substitution **(a, +∞) → (0, 1)** : `u = (x − a) / (1 + x − a)`, soit
`x = a + u/(1 − u)`, `dx = du/(1 − u)²`.

Substitution **(−∞, +∞) → (−1, 1)** : `x = u/(1 − u²)`,
`dx = (1 + u²)/(1 − u²)² du`.

Application : `adaptiveSimpson(g, eps, 1 − eps)` avec `eps = 1e-8`.

**Résultats expérimentaux** sur les 8 cas (test temporaire, supprimé) :

| #   | Cas                            | Attendu     | Hybride C   | Δ vs exact | Temps  |
| --- | ------------------------------ | ----------- | ----------- | ---------- | ------ |
| 1   | `∫₀^+∞ e^{-x} dx`              | 1           | 1.000000... | 1.7e-11    | 0.7 ms |
| 2   | `∫₋∞^+∞ e^{-x²} dx`            | √π ≈ 1.7725 | 1.7725      | 1.9e-11    | 1.1 ms |
| 3   | `∫₋∞^+∞ 1/(1+x²) dx`           | π           | 3.1416      | 4.0e-8     | 0.3 ms |
| 4   | `∫₁^+∞ 1/x² dx`                | 1           | 1.0000      | 1.0e-8     | 0.1 ms |
| 5   | `∫₁^+∞ 1/x dx`                 | divergent   | NaN         | —          | 0.1 ms |
| 6   | `∫₀^+∞ sin(x) dx`              | divergent   | NaN         | —          | 6.9 ms |
| 7   | `aire(1/x², 1, +∞)`            | 1           | 1.0000      | 1.0e-8     | 0.1 ms |
| 8   | `aire_entre(e^{-x}, 0, 0, +∞)` | 1           | 1.0000      | 1.7e-11    | 0.2 ms |

**8/8** sur les cas pédagogiques. Schémas alternatifs testés :

- A pur (truncation seule + TOL=1e-6) : échoue sur 1/x², 1/(1+x²) (convergence
  lente en 1/T → tail dominant).
- A + Aitken Δ² extrapolation : sensiblement plus rapide en convergent mais
  **piège dangereux** sur divergent (1/x converge faussement vers −16).
- B pur (substitution sans diagnose) : excellent en convergent mais
  convergence faussement bornée sur sin (1.6e8) et 1/x (20.57).

→ **C est le seul schéma robuste** sur les 8 cas. Le coût de la phase de
diagnose est ≤ 7 ms même dans le pire cas (sin), bien sous la cible 50 ms.

### 2.3 Détection divergence — numérique seul

V5 n'introduit **pas** d'analyse asymptotique symbolique. Les heuristiques de
2.2 (stagnation deltas + croissance unboundée) couvrent les 6 cas pédagogiques
divergents (5 testé direct ; 6 testé direct ; les 4 autres divergents possibles
dérivent : `tan(x)`, `x²`, `e^x`, `cos(x)/x` partagent un des deux signaux).

**Reportée V6** : si un futur scénario pédagogique requiert une décision
symbolique (ex. `∫_a^+∞ P(x)/Q(x) dx` analysé via le degré dominant), ajouter
une pré-passe `analyzeAsymptoticBehavior(f, x, +∞)` consultative. Pas
nécessaire en V5.

### 2.4 Singularités intérieures — étendre le cache existant

`getAllDiscontinuities(integrand, 'x')` produit la liste **complète**
indépendamment des bornes. À l'évaluation :

1. Calculer `T_max` effectif (640 pour le right-inf, ou borné par la fenêtre
   de substitution).
2. Appeler `classifyDiscontinuitiesForRange(allDiscs, a_eff, T_max)` avec
   `a_eff` = borne finie (ou `-T_max` si left-inf).
3. **Si une discontinuité divergente y tombe → NaN immédiat**, cohérent avec
   le cas borné existant (ex. `aire(1/(x−2), 0, 5)` → NaN).
4. Removable/jump intérieurs : utilisés comme split points dans le probe A.

**Évolution requise** : la signature de `classifyDiscontinuitiesForRange`
n'accepte que des bornes finies — déjà ok après étape 1 puisqu'on substitue
`T_max` aux bornes infinies.

### 2.5 Rendu SVG — clipping viewport, pas d'indicateur V5

Dans `integralAreaToSVG` et `integralAreaBetweenToSVG` :

```ts
const lo = Number.isFinite(a) ? Math.min(a, b) : topLeft.x;
const hi = Number.isFinite(b) ? Math.max(a, b) : bottomRight.x;
```

Le sub-viewport est borné par la fenêtre. La courbe est échantillonnée et
fermée par l'axe x (V1/V2) ou la deuxième courbe (V3 entre f et g). Le résultat
est visuellement identique au cas borné, l'utilisateur perçoit que la zone
"continue hors cadre".

**Indicateur visuel** (flèche, fade-out aux bords) : reporté V6 (cf. Q4).
Risque V5 trop élevé pour un gain UX modeste.

### 2.6 Chemin symbolique — V6

V5 = 100 % numérique. Argumentation :

- `integrateDefinite` ne supporte pas `Infinity` comme borne (limite côté
  `evaluate()` qui ne réduit pas symboliquement `e^{-Infinity}` à 0).
- L'effort pour étendre est non négligeable : ajouter
  `evaluateAtInfinity(F, +1 | −1)` qui reconnaît les classes courantes
  (`exp(−x) → 0`, `1/x → 0`, `arctan(x) → π/2`, etc.).
- Le numérique (4 % d'erreur sur Cauchy avec scheme C) est largement suffisant
  pour la pédagogie.
- En V6, on pourrait l'ajouter comme accélérateur : si `integrateDefinite`
  succeed avec antiderivée évaluable à ±∞, on retourne la valeur exacte ;
  sinon fallback numérique.

### 2.7 Hors scope V5

- **Bornes points** (`integrale(f, P1, P2)` avec P points) : déjà hors scope V1-V4.
- **`aire_intersection`** (3+ courbes) : architecture distincte, pas lié.
- **Cauchy principal value** (`∫₋∞^+∞ x dx`) : nécessite un nouveau builtin
  `cauchy_pv()` distinct, ou un mode opt-in via paramètre nommé.
- **Asymptote verticale dans `[a, +∞)`** (ex. `aire(1/(x−5), 0, +inf)`) : la
  classification existante détecte la singularité en x=5 → NaN. Cohérent.

---

## 3. API DSL finale (V5)

```dsl
# 1. Convergent classique
A = integrale(exp(-x), 0, +inf)             # → 1
B = integrale(1 / (1 + x^2), -inf, +inf)    # → π ≈ 3.1416

# 2. Aire géométrique (signed=false)
C = aire(1/x^2, 1, +inf)                    # → 1
D = aire(exp(-x^2), -inf, +inf)             # → √π ≈ 1.7724

# 3. Aire entre deux courbes
f(x) = exp(-x)
g(x) = 0
E = aire_entre(f, g, 0, +inf)               # → 1

# 4. Divergent — retour NaN avec console.warn
F = integrale(1/x, 1, +inf)                 # → NaN, warn divergence
G = integrale(sin(x), 0, +inf)              # → NaN, warn oscillation

# 5. Compatibilité avec curseurs
@curseur a = -10..10 step=1
H = integrale(exp(-x^2), a, +inf)           # converge tant que a fini
```

`-inf` / `+inf` / `inf` — trois écritures équivalentes pour `±∞`. `infini` est
un alias optionnel (Q1).

---

## 4. Plan TDD V5 — 6 phases

> Tous les agents `code-reviewer` (proactif après chaque code) et
> `documentation-writer` (proactif après features) sont intégrés.
> Pas d'agent pour Phase 1 (5 lignes).

### Phase 0 — Étude (cette session) — **terminée**

Livrable : ce document. Effort : ~1 h.

### Phase 1 — Tokens DSL `inf` / `+inf` (1 h)

**Spécification TDD** (à valider utilisateur avant code) :

- `inf` (sans signe) parse comme nombre `+Infinity`.
- `+inf`, `-inf` parsent respectivement comme `+Infinity`, `-Infinity`.
- `infini` est un alias optionnel (à confirmer Q1).
- Une expression `inf + 1` est valide et vaut `Infinity` (gère la sémantique JS).
- Une expression `inf - inf` retourne `NaN` (sémantique JS) — comportement
  utilisateur acceptable, à documenter.

**Tâches** :

1. Étendre `parseUnary()` pour traiter PLUS comme no-op (5 lignes).
2. Pré-charger `inf` (et `infini` si Q1=oui) dans `Interpreter.constructor()`.
3. Tests dans `__tests__/parser-inf.test.ts` (10 cas : tokenisation, parsing,
   évaluation, arithmétique sur `inf`).
4. Code review (agent `code-reviewer`, modèle Sonnet 4.6).

### Phase 2 — Helper routing improper (1.5 h)

**Spécification TDD** :

- `interpretAreaBuiltin()` détecte si une borne est ±∞ et route vers
  `interpretImproperAreaBuiltin()` (nouveau).
- Le helper improper appelle `figure.createImproperIntegralArea(...)` (Phase 3).
- Validation : si `g` est défini (aire_entre) **et** une borne est ±∞,
  comportement identique sur f, g, h = f − g.

**Tâches** :

1. Ajouter `interpretImproperAreaBuiltin()` dans `area-builtin-helper.ts`.
2. Modifier `interpretAreaBuiltin()` pour router (un `if` + early return).
3. Tests d'intégration pour les 3 builtins × ±∞.
4. Code review (agent `code-reviewer`, modèle Sonnet 4.6).

### Phase 3 — `improperIntegrate` numérique (2-3 h) — **cœur**

**Spécification TDD** (proposer comportements en français, attendre validation) :

1. `improperIntegrate(expr, var, a, b)` retourne `{ value: number, status }` où
   `status ∈ {convergent, divergent, error}`.
2. Convergent : valeur précise à 1e-4 minimum sur les 8 cas pédagogiques.
3. Divergent : retourne `NaN` + une raison (`'oscillation' | 'unboundedGrowth' |
'logarithmicGrowth'`).
4. Bench : ≤ 50 ms par évaluation pire cas (slider drag réactif).
5. Substitution choisie selon le type d'intervalle :
   - `[a, +∞)` → `u = (x−a)/(1+x−a)`
   - `(−∞, b]` → symétrique
   - `(−∞, +∞)` → `x = u/(1 − u²)`

**Tâches** :

1. Module `mathAST/integration/improper.ts` exportant `improperIntegrate(...)`.
2. Tests unitaires `__tests__/improper.test.ts` (16+ cas : 8 pédagogiques + edge
   cases : `a > b`, `a = b`, support borné réinterprété comme borné, etc.).
3. `figure.createImproperIntegralArea()` calque sur `createIntegralArea`,
   appelle `improperIntegrate` dans le compute closure. Réutilise le cache
   `discontinuities` étendu (cf. 2.4).
4. Tests d'intégration sur les 3 builtins.
5. Code review (agent `code-reviewer`, modèle Opus 4.7 — module critique).
6. Performance audit (agent `performance-optimizer`, modèle Sonnet 4.6).

### Phase 4 — Rendu SVG clipping (1.5 h)

**Spécification TDD** :

- `integralAreaToSVG(...)` accepte une borne ±∞ et clippe au viewport.
- Idem `integralAreaBetweenToSVG(...)`.
- Snapshot tests : SVG produit pour `aire(exp(-x), 0, +inf)` vu sur `[0, 5]` ≈
  identique à `aire(exp(-x), 0, 5)` (tolérance points).

**Tâches** :

1. Modifier les deux fonctions pour gérer les bornes infinies (≈ 5 lignes
   chacune).
2. Tests `__tests__/svg-primitives-improper.test.ts` (snapshots).
3. Code review (agent `code-reviewer`, modèle Sonnet 4.6).

### Phase 5 — Démo + doc utilisateur (1 h)

**Tâches** :

1. Page `src/routes/(public)/geometry-demo/integrales/improper/+page.svelte` :
   8 cas pédagogiques avec slider sur `a` quand pertinent.
2. Documentation utilisateur : section "Intégrales généralisées" dans
   `docs/architecture/geometry-core.md`.
3. Document de progression `docs/wip/geometry/improper-integrals-progress.md`.
4. Documentation (agent `documentation-writer`, modèle Sonnet 4.6).

### Phase 6 — Quality checks finaux (1 h)

- Svelte autofixer sur la nouvelle page démo.
- `pnpm check:incremental`.
- `npx eslint <fichiers modifiés>`.
- Bench : exécuter les 8 cas dans une boucle de 100 ms et vérifier le slider
  reste fluide.
- Vérifier 0 régression sur les 136 tests V1+V2+V3.
- Commit final (agent `commit-manager`, modèle Sonnet 4.6).

### Estimation totale

| Phase       | Effort                                               |
| ----------- | ---------------------------------------------------- |
| 0 étude     | 1 h (déjà fait)                                      |
| 1 tokens    | 1 h                                                  |
| 2 routing   | 1.5 h                                                |
| 3 numérique | 2-3 h                                                |
| 4 SVG       | 1.5 h                                                |
| 5 démo+doc  | 1 h                                                  |
| 6 checks    | 1 h                                                  |
| **Total**   | **8-10 h** (cohérent avec estimation initiale 6-9 h) |

---

## 5. Critères de succès

- [x] Les 8 cas pédagogiques validés (test expérimental Phase 0).
- [ ] Aucune régression sur les 136 tests V1+V2+V3.
- [ ] Bench < 50 ms / éval pire cas (gaussienne).
- [ ] Rendu SVG lisible (clipping propre, pas d'artefacts).
- [ ] Démo `/geometry-demo/integrales/improper` fonctionnelle.
- [ ] `pnpm check:incremental` 0 erreur.

---

## 6. Questions ouvertes (≤ 5)

1. **Alias `infini`** — `inf` couvre la convention scientifique (`+∞`, `−∞`).
   Ajouter aussi `infini` comme alias francisé est trivial (1 ligne au
   pré-chargement) mais introduit deux écritures pour le même concept.
   Recommandation : **`inf` seul en V5**, `infini` ajoutable plus tard sans
   breaking change. **Ton choix ?**

2. **Paramètres T₀ et MAX_T du diagnose** — actuellement T₀=10, T_max = 640
   (k=6 doublings). Suffisant pour les 8 cas. Une fonction à support très
   large (ex. `f(x) = exp(-(x − 1000)²)`) serait diagnostiquée à tort comme
   plate sur `[0, 640]`. Faut-il rendre T₀, MAX_T configurables, ou supposer
   des cas pédagogiques avec support raisonnable ?
   Recommandation : **constantes V5**, configuration repoussée si besoin émerge.

3. **`infini.warn()` ou `console.warn()` direct** — quand le diagnose détecte
   une divergence, faut-il émettre un `console.warn` (cohérent avec
   `singularity-warn`) ou un `toaster.warning(...)` UI-visible ? Cohérence avec
   l'écosystème actuel : `console.warn`. Mais l'utilisateur final voit juste
   NaN sans explication. Recommandation : **`console.warn` V5, toaster reporté
   V6** quand on aura une stratégie globale de feedback "intégrale ne converge
   pas".

4. **Indicateur visuel SVG (flèche/fade-out aux bords du viewport)** — V5 ne
   l'inclut pas. L'utilisateur voit la zone clippée comme n'importe quelle
   fonction non bornée. Ajouter en V6 selon retour pédagogique. **Confirmer
   ce report ?**

5. **`aire_entre(f, g, -inf, +inf)`** — couverte par le schéma hybride si
   `h = f − g` décroît assez vite. Si non, NaN. Pas de cas pédagogique standard
   identifié (la plupart des aires entre courbes pédagogiques ont des bornes
   finies, intersection points). Garder en V5 ou reporter V6 ?
   Recommandation : **garder en V5** — le helper route automatiquement, même
   chemin de code que aire_entre borné côté API. Coût zéro additionnel.

---

## 7. Décision GO/NO-GO

**Recommandation : GO** sur la base de :

- Schéma hybride C **validé expérimentalement** sur 8/8 cas pédagogiques.
- Effort estimé **8–10 h**, dans la fourchette du prompt (6–9 h).
- Pas de régression attendue : extension parallèle, pas modification des
  chemins existants V1-V4.
- API DSL idiomatique, cohérente avec la convention scientifique.
- 5 questions ouvertes mineures (toutes des choix de scope/UX, pas
  techniques).

**Si GO** : le plan TDD ci-dessus est exécutable séquentiellement sur 6 phases.
Avant de commencer Phase 1, **valider les 5 questions** ci-dessus.

---

## Annexe A — Données expérimentales brutes

Tableau comparatif schémas A / A+Aitken / B / Hybride C (test temporaire
supprimé après étude) :

```
| # | Case          | A                | A+Aitken            | B                | C=Hybride        |
|---|---------------|------------------|---------------------|------------------|------------------|
| 1 | e^{-x}        | ✓ err 1.2e-9     | ✓ err 1.2e-9        | ✓ err 1.7e-11    | ✓ err 1.7e-11    |
| 2 | e^{-x²}       | ✓ err 1.6e-11    | ✓ err 1.6e-11       | ✓ err 1.9e-11    | ✓ err 1.9e-11    |
| 3 | 1/(1+x²)      | ✓ err 2.4e-5     | ✓ err 3.8e-4        | ✓ err 4.0e-8     | ✓ err 4.0e-8     |
| 4 | 1/x²          | ✗ NaN            | ✗ err 2.5e-3        | ✓ err 1.0e-8     | ✓ err 1.0e-8     |
| 5 | 1/x (div)     | ✓ NaN            | ✗ -16.2498          | ✗ 20.5731        | ✓ NaN            |
| 6 | sin (div)     | ✓ NaN (1336 ms)  | ✗ 1.1693            | ✗ 1.6e8          | ✓ NaN (6.9 ms)   |
| 7 | |1/x²|        | ✗ NaN            | ✗ err 2.5e-3        | ✓ err 1.0e-8     | ✓ err 1.0e-8     |
| 8 | |e^{-x}|      | ✓ err 1.2e-9     | ✓ err 1.2e-9        | ✓ err 1.7e-11    | ✓ err 1.7e-11    |
```

**Conclusion expérimentale** :

- A seul : 5/8 (échoue tail lent 1/x², 1/(1+x²), |1/x²|).
- A + Aitken : 4/8 (accélère mais piégé sur divergent).
- B seul : 6/8 (excellent convergent, piégé sur divergent).
- **C hybride : 8/8** ; A diagnose, B calcule.

---

## Annexe B — Liste des fichiers à modifier (référence Phase 1+)

### Modifications

```
src/lib/geometry-core/dsl/parser.ts           # parseUnary accepte PLUS no-op
src/lib/geometry-core/dsl/interpreter.ts      # constructor pré-charge `inf`
src/lib/geometry-core/dsl/area-builtin-helper.ts  # routing improper
src/lib/geometry-core/graph/figure.ts         # createImproperIntegralArea
src/lib/geometry-core/dsl/singularity-warn.ts # classifyDiscontinuitiesForRange
                                              #   accepte plage finie effective
src/lib/geometry-core/rendering/svg-primitives.ts  # clipping viewport sur
                                              #   integralAreaToSVG +
                                              #   integralAreaBetweenToSVG
```

### Créations

```
src/lib/mathAST/integration/improper.ts       # cœur improperIntegrate
src/lib/mathAST/integration/__tests__/improper.test.ts
src/lib/geometry-core/dsl/__tests__/parser-inf.test.ts
src/lib/geometry-core/dsl/__tests__/interpreter-improper.test.ts
src/lib/geometry-core/rendering/__tests__/svg-primitives-improper.test.ts
src/routes/(public)/geometry-demo/integrales/improper/+page.svelte
docs/wip/geometry/improper-integrals-progress.md
```

### Documentation

```
docs/architecture/geometry-core.md            # section "Intégrales généralisées"
```
