# Pedagogical Integration Stepper — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 4 modules pédagogiques de
> step-by-step (`pedagogical-arithmetic/`, `pedagogical-solve/{linear,
quadratic, linear-inequality, quadratic-inequality, rational-inequality}`,
> `pedagogical-differentiation/`) tous branchés sur le « Mode B » des
> corrections de questions (`QuestionCorrection.generatedSteps`,
> 7 kinds discriminés). Le module `integration/` est mature côté
> algorithmique (5 intégrateurs, ~3500 LOC) mais n'a **pas de pipeline
> pédagogique** : il manque `pedagogical-integration/` et
> `kind: 'integrate'` dans Mode B. C'est l'objet de ce prompt.

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Module modèle direct (à cloner architecturalement)

- `src/lib/mathAST/pedagogical-differentiation/` — **template
  architectural**. Décision Option 2 (pipeline parallèle, pas dual
  renderer sur `differentiate.ts`). Tous ses fichiers sont à copier
  comme structure :
  - `types.ts` — `PedagogicalDifferentiationStep`, `Result`, `Options`,
    `Bindings`, `TRIVIAL_RULES`
  - `descriptions-fr.ts` — `TITLES` (lycee + superieur) + `EXPLANATIONS`
    (par règle, par niveau)
  - `pipeline.ts` — dispatcher pédagogique récursif structurel
  - `renderer.ts` — `PedagogicalDifferentiationRenderer` LaTeX 2-lignes
  - `index.ts` — barrel public
  - `demo-helpers.ts` + `demo-cases/` — démos catégorisées
  - `__tests__/` — pipeline + renderer + types + demos snapshot
- `docs/wip/differentiation-stepper-progress.md` — décisions Phase 0,
  bilan tests, code review fixes (3 blockers + 4 should-fix). Cette doc
  expose les pièges pédagogiques **rencontrés** lors de la livraison
  différentiation — la plupart se reproduisent à l'identique pour
  l'intégration (cf. anti-patterns en bas du présent prompt).

### 2. Logique algorithmique réutilisable (NE PAS réimplémenter)

- `src/lib/mathAST/integration/rules.ts` — **building blocks atomiques
  exportés** : `powerRule`, `constantRule`, `lnAbsRule`, `expRule`,
  `sinRule`, `cosRule`, `tanRule`, `arctanRule`, `arcsinRule`. Ces
  fonctions retournent une `MathNode` primitive, à utiliser pour les
  calculs effectifs. Réutiliser, pas re-coder.
- `src/lib/mathAST/integration/integrate.ts` (718 LOC) — entry point
  algorithmique. Lecture pour comprendre l'ordre de dispatch existant,
  mais **NE PAS l'instrumenter** (cf. décision Option 2).
- `src/lib/mathAST/integration/classify.ts` — `detectVariable(expr)` +
  `classifyIntegrand(expr, varName)` retournant un `IntegrandType` parmi
  `'polynomial' | 'rational' | 'trigonometric' | 'exponential' |
'logarithmic' | 'inverse-trig' | 'radical' | 'product' | 'composite'
| 'mixed' | 'unknown'`. Réutilisable pour décider le case dans le
  pipeline pédagogique.
- `src/lib/mathAST/integration/integrators/` — 5 intégrateurs
  (basic, u-substitution, parts, partial-fractions, trig-substitution).
  **Pour V1 pédagogique** : on ne touche QUE basic + u-substitution
  simple + parts simple. Les 3 autres → throw NotImplemented.
- `src/lib/mathAST/integration/patterns.ts` (886 LOC) — patterns AST de
  reconnaissance. **Lecture utile** pour identifier les formes
  pédagogiques (`u'·e^u`, `u'/u`, `u'·sin(u)`, etc.) — peut être réutilisé
  via grep des helpers existants.
- `src/lib/mathAST/integration/types.ts` — `IntegrateStep`,
  `IntegrateResult`, `IntegrateOptions`. Lecture pour ne pas re-définir
  des shapes existantes.
- `src/lib/mathAST/integration/descriptions-fr.ts` — `IntegrationRule`
  union (~40 kinds **algorithmiques**) + `RULE_DESCRIPTIONS`.
  **Important** : ces rule kinds sont **technique-oriented**
  (`identify-substitution`, `apply-substitution`, `tabular-method`,
  etc.), PAS pédagogiques. Le pipeline pédagogique aura SES PROPRES
  kinds (cf. Phase 1) en plus de réutiliser certaines descriptions.

### 3. Glue Mode B (pattern à reproduire)

- `src/lib/questions/types.ts` — chercher le bloc `GeneratedSteps` :
  union discriminée actuelle = `'arithmetic' | 'linear-equation' |
'differentiate' | 'quadratic-equation' | 'linear-inequality' |
'quadratic-inequality' | 'rational-inequality'`. **Étendre avec
  `'integrate'`.**
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict)
  avec discriminator, à étendre.
- `src/lib/questions/generator/correction-generator.ts` — dispatch
  switch/case sur `kind`. La case `differentiate` est le modèle direct
  à reproduire (mêmes shapes : `expression: string`, options optionnelles).
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` —
  ajouter 1-2 fixtures intégration (lycée et/ou Tle spé).
- `src/lib/questions/__tests__/generated-steps-demo.test.ts` —
  étendre les snapshots.
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` —
  page debug à étendre (passer de 12 à ~14 fixtures).

### 4. Docs de progression liées

- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble.
- `docs/wip/correction-integration-progress.md` — détails de
  l'architecture Mode B.
- `docs/wip/differentiation-stepper-progress.md` — **modèle direct de
  doc de progression à reproduire** (phasage, code review, quality
  checks, raffinements V1.1).
- `docs/wip/quadratic-stepper-progress.md` — autre exemple (avec
  V1+V1.1, dispatcher, helpers refacto).
- `docs/wip/pedagogical-rational-inequality-progress.md` — exemple
  récent (avec multi-fractions V2, code review fixes).

---

## Phase 0 — Spécification TDD (bloquante : valider avec l'utilisateur AVANT d'écrire du code)

L'agent doit poser ces questions à l'utilisateur et **attendre des
réponses explicites** avant de passer à Phase 1. Ne pas inventer une
réponse en absence de l'utilisateur.

### Comportements proposés

#### A. Couverture mathématique V1

**Primitives usuelles** (table de primitives lycée) :

| Forme          | Primitive       | Niveau lycée |
| -------------- | --------------- | ------------ |
| `c` (const)    | `cx`            | 1ère         |
| `x^n` (n ≠ -1) | `x^(n+1)/(n+1)` | 1ère         |
| `1/x`          | `ln\|x\|`       | Tle          |
| `e^x`          | `e^x`           | Tle          |
| `sin(x)`       | `-cos(x)`       | Tle          |
| `cos(x)`       | `sin(x)`        | Tle          |
| `1/cos²(x)`    | `tan(x)`        | Tle (rare)   |
| `1/(1+x²)`     | `arctan(x)`     | sup          |
| `1/√(1-x²)`    | `arcsin(x)`     | sup          |

**Linéarité** : `∫(αf + βg) = α∫f + β∫g` (reconnaissance somme +
sortie de constante).

**Reconnaissance de dérivée composée** (très important au lycée) :

| Forme entrée | Primitive       | Justification       |
| ------------ | --------------- | ------------------- |
| `u'·u^n`     | `u^(n+1)/(n+1)` | (n ≠ -1)            |
| `u'/u`       | `ln\|u\|`       | (u ne s'annule pas) |
| `u'·e^u`     | `e^u`           |                     |
| `u'·sin(u)`  | `-cos(u)`       |                     |
| `u'·cos(u)`  | `sin(u)`        |                     |

**Théorème fondamental** (intégrales définies) :

`∫_a^b f(x) dx = F(b) - F(a) = [F(x)]_a^b`

**Cas spéciaux pédagogiques V1** :

- `c` (constante) → `cx + C` (1ère)
- `x` → `x²/2 + C`
- Sommes de monômes (polynôme entier) → expansion linéarité + power-rule
  par terme
- Détection u'/u et u'·e^u (priorité sur la formule générale)

#### B. Niveaux scolaires

- `lycee` : primitives usuelles + linéarité + reconnaissance dérivée
  composée (u'/u, u'·e^u, u'·sin/cos(u)) + théorème fondamental.
- `superieur` : ajoute IPP simple (`∫u·v' = uv - ∫u'·v`) + u-substitution
  explicite (`∫f(g(x))·g'(x) dx → ∫f(u) du`) + arctan/arcsin.
- `college` et `primaire` : **refusés** au type-level (l'intégration n'est
  pas au programme avant la Tle). Type
  `IntegrationSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`,
  symétriquement à `QuadraticSchoolLevel`.

#### C. Cas hors scope V1 (refus explicite avec message)

- **Décomposition en éléments simples** (`partial-fractions`) — V2.
- **Substitution trigonométrique** — hors scope (sup avancé).
- **Fallback numérique Simpson** — hors scope (`numericFallback`).
- **Intégrales impropres** — hors scope (V2).
- **IPP cyclique** (∫e^x·sin(x) dx) — hors scope V1 (sup avancé).
- **IPP tabulaire** (∫x³·e^x dx avec 3 IPP) — hors scope V1.
- **Fonctions définies par morceaux** — hors scope (V2).
- **Intégrales paramétriques** — hors scope.
- **Constantes paramétriques** (`∫(ax + b) dx` où a, b sont des
  paramètres formels distincts de `x`) — V2 (analogue au quadratic V2).

Le cas non-supporté lève `PedagogicalIntegrationNotImplemented` (analogue
de `PedagogicalDifferentiationNotImplemented` et
`PedagogicalQuadraticNotImplemented`) ; côté correction-generator,
fallback Mode A.

#### D. Structure des steps (par cas)

**Cas standard primitive usuelle directe** (1ère/Tle) :

```
identify-integrand        ─ « On reconnaît une primitive usuelle »
apply-known-primitive     ─ ∫sin(x) dx = -cos(x) + C
add-constant              ─ « On ajoute la constante C » (skipable si
                            verbosity = summarized)
```

**Cas linéarité** :

```
identify-integrand        ─ « On reconnaît une somme »
apply-linearity-sum       ─ ∫(f + g) = ∫f + ∫g (1 step display)
sub-steps : intégration de chaque terme (récursif)
```

**Cas dérivée composée** :

```
identify-integrand        ─ « On reconnaît la forme u'·e^u avec u = ... »
apply-composite-form      ─ ∫u'·e^u dx = e^u + C
add-constant
```

**Cas intégrale définie** :

```
identify-definite-integral
[récursion : trouver la primitive F]
apply-fundamental-theorem ─ [F(x)]_a^b = F(b) - F(a)
substitute-bounds         ─ F(b) - F(a) = ... - ...
simplify-result           ─ valeur numérique
```

**Cas u-substitution simple** (Tle/sup) :

```
identify-substitution     ─ « On pose u = ... »
compute-du                ─ « du = u'(x) dx »
apply-substitution        ─ « L'intégrale devient ∫f(u) du »
[récursion : intégrer en u]
substitute-back           ─ « On remplace u par sa valeur »
```

**Cas IPP simple** (sup) :

```
identify-parts            ─ « On utilise l'intégration par parties »
choose-u-dv               ─ « u = ..., dv = ... → du = ..., v = ... »
apply-parts-formula       ─ « ∫u dv = uv - ∫v du »
[récursion : intégrer ∫v du]
simplify-result
```

#### E. Niveaux et stratégies (`STRATEGIES_INTEGRATION`)

Analogue de `STRATEGIES_QUADRATIC` :

```ts
{
  lycee: {
    includeAddConstant: true,        // emit add-constant step
    includeIdentify: true,           // emit identify-integrand step
    formatBoundsExplicit: true,      // [F(x)]_a^b = F(b) - F(a) en step distinct
    enablePartsSimple: false,        // hors scope lycée
    enableUSubstitution: false,      // hors scope lycée standard
    enableComposite: true            // u'/u, u'·e^u, etc.
  },
  superieur: {
    includeAddConstant: false,       // sous-entendu en sup
    includeIdentify: false,          // identification compacte
    formatBoundsExplicit: false,     // [F(x)]_a^b directement avec valeur
    enablePartsSimple: true,         // IPP simple OK
    enableUSubstitution: true,       // u-sub OK
    enableComposite: true
  }
}
```

#### F. Bindings & detection

- Détection u'/u, u'·e^u, etc. AVANT la formule générale par power-rule.
- Réutiliser `classifyIntegrand` de `integration/classify.ts` pour le
  premier dispatch (polynomial → linéarité ; trigonometric → table ;
  exponential → table ; rational si denom = u et num = u' → ln|u|).
- Réutiliser `differentiate` de `differentiation/` pour calculer u'(x)
  côté pédagogique (ex: pour `∫(2x)·e^(x²) dx`, on calcule
  `(x²)' = 2x` et on reconnaît la forme u'·e^u).
- Réutiliser `getPolynomialDegree` pour décider du nombre de termes du
  polynôme.

#### G. Notation française

- **Intégrale** : `\int f(x) \, dx` (avec `\, dx` pour l'espacement).
- **Intégrale définie** : `\int_{a}^{b} f(x) \, dx`.
- **Évaluation aux bornes** : `\left[ F(x) \right]_{a}^{b}`.
- **Constante d'intégration** : `+ C` (toujours afficher pour
  indéfinies en lycée ; omettre en sup `enableAddConstant: false`).
- **Bandes intégrales** indéfinies vs définies — distinction explicite
  dans le rendu et dans les TITLES.

#### H. Mode B intégré

- Nouveau `kind: 'integrate'` dans `GeneratedSteps`.
- Schéma Zod (lax + strict) avec discriminator étendu.
- Case dédiée dans `correction-generator.ts` qui appelle
  `generatePedagogicalIntegrationSteps()` puis le renderer.
- Bump `primaire | college` → `lycee` (analogue du quadratique).
- 1 fixture indéfinie (`∫(3x² + 2x + 1) dx` Tle spé) + 1 fixture
  définie (`∫_0^1 e^x dx` Tle spé).
- Page debug étendue (14 fixtures total).

### Questions à poser explicitement

> **Q1 — Pipeline parallèle vs instrumentation `integrate.ts` ?**
> Décision identique au pattern différentiation : Option 2 (pipeline
> parallèle `pedagogical-integration/`, `integrate.ts` reste intact).
> **Reco par défaut** : OUI Option 2.

> **Q2 — Périmètre V1 strict ?**
> Inclure : primitives usuelles + linéarité + reconnaissance dérivée
> composée (u'/u, u'·e^u, u'·sin/cos(u)) + théorème fondamental
> (intégrales définies). En sup : ajouter IPP simple + u-sub simple.
> Exclure : partial-fractions, trig-substitution, numeric, impropres,
> IPP cyclique, IPP tabulaire, paramétriques.
> **Reco par défaut** : OUI ce périmètre exact.

> **Q3 — IPP en lycée ?**
> En France, l'IPP n'est PAS au programme du lycée standard (programme
> Tle spécialité 2025). Elle est au programme de Tle expert (option) et
> en sup. Doit-on activer IPP en `lycee` aussi (au cas où la question
> cible l'option) ou réserver à `superieur` strict ?
> **Reco par défaut** : `superieur` strict. Si l'utilisateur veut IPP
> en lycée pour Tle expert, il override le niveau.

> **Q4 — u-substitution explicite vs reconnaissance de dérivée composée ?**
> En lycée, on enseigne plutôt « reconnaître la forme u'·f(u) » plutôt
> que la substitution explicite. En sup, la substitution explicite
> avec `du = g'(x) dx` est la norme. Doit-on avoir DEUX rendus du même
> calcul (`enableComposite` lycée vs `enableUSubstitution` sup) ou un
> seul rendu ?
> **Reco par défaut** : DEUX rendus distincts, contrôlés par les
> stratégies `enableComposite` (lycée) et `enableUSubstitution` (sup).
> C'est plus de travail mais plus pédagogique.

> **Q5 — Dispatcher unifié `pedagogical-integration/index.ts` ?**
> Pas de cas linear/quadratic distinct ici (l'intégration ne se
> classifie pas par degré). Le dispatcher V1 est juste
> `generatePedagogicalIntegrationSteps(integrand, options)` qui appelle
> `classifyIntegrand` + dispatche en interne. Pas besoin de plusieurs
> fonctions publiques.
> **Reco par défaut** : OUI, une seule fonction publique pour V1.

> **Q6 — Démos catégorisées ?**
> 7 catégories proposées :
>
> - `usuelles` (∫x dx, ∫x² dx, ∫1/x dx, ∫e^x dx, ∫sin(x) dx, ∫cos(x) dx) — 5-6 cas
> - `polynomial` (∫(3x² + 2x + 1) dx, ∫(x³ - 4x) dx) — 3 cas
> - `linearite` (sortie de constantes, multiples) — 3 cas
> - `forme-composee-u-prime-over-u` (∫(2x)/(x²+1) dx → ln) — 3 cas
> - `forme-composee-u-prime-times-exp` (∫2x·e^(x²) dx) — 3 cas
> - `definie` (∫_0^1 x dx, ∫_0^π sin(x) dx, ∫_1^e 1/x dx) — 4-5 cas
> - `parts-simple` (sup) (∫x·e^x dx, ∫x·sin(x) dx, ∫ln(x) dx) — 3 cas
>   **Reco par défaut** : 7 catégories × ~3-5 cas = ~25 cas total.

> **Q7 — `kind: 'integrate'` vs `'antiderivative'` ?**
> A : `kind: 'integrate'` cohérent avec `'differentiate'` existant.
> B : `kind: 'antiderivative'` distingue explicitement « calculer une
> primitive » de « calculer une intégrale (définie ou indéfinie) ».
> **Reco par défaut** : A (cohérence). Le payload contient un flag
> `definite: boolean` qui distingue les deux usages.

> **Q8 — `notImplemented` : silent fallback ou throw ?**
> Idem différentiation : throw `PedagogicalIntegrationNotImplemented`
> avec classe d'erreur dédiée + catch dans correction-generator.
> **Reco par défaut** : OUI throw + catch.

> **Q9 — Reuse de `differentiate()` pour calcul de u'(x) ?**
> Pour reconnaître u'·e^u, le pipeline pédagogique a besoin de calculer
> u'(x) à partir de u(x). Réutiliser `differentiate()` de
> `differentiation/` plutôt que re-implémenter ?
> **Reco par défaut** : OUI réutiliser. C'est testé, robuste, et c'est
> exactement ce dont on a besoin.

> **Q10 — Cible chiffrée ?**
> ~120-150 tests verts spécifiques au feature (modèle différentiation
> = 185, modèle quadratique = 245). Pour intégration, l'algorithmique
> est déjà très couvert (10 fichiers de tests dans
> `integration/__tests__/`), donc le pédagogique peut être plus léger
> sur les sanity checks de calcul.
> **Reco par défaut** : ~120 tests cible total, ~3500 LOC.

### Critères d'acceptation

- 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
- Pipeline opérationnel sur les 5 cas (primitive usuelle, linéarité,
  forme composée u'-u, intégrale définie, IPP simple)
- Renderer 2 niveaux (lycee, superieur) avec TITLES + EXPLANATIONS
- ≥6 catégories de démos avec snapshots stables
- Script CLI standalone (`scripts/pedagogical-integration-demo.ts`)
- Mode B `kind: 'integrate'` intégré + 2 fixtures end-to-end (1 indéfinie + 1 définie)
- Page debug étendue avec les 2 nouvelles fixtures (12 → 14)
- 0 erreur ESLint, 0 nouvelle erreur TS (`pnpm check:incremental`)
- Doc de progression écrite (`docs/wip/integration-stepper-progress.md`)
- Code review `code-reviewer` (Opus) après chaque phase
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global)

---

## Phase 1 — Types `pedagogical-integration/types.ts`

### Sous-tâches

1. Créer `PedagogicalIntegrationRule` (union discriminée des kinds
   pédagogiques) :

   ```ts
   export type PedagogicalIntegrationRule =
   	// Identification (toujours en premier)
   	| 'identify-integrand'
   	| 'identify-definite-integral'
   	// Primitives usuelles directes
   	| 'apply-power-rule'
   	| 'apply-constant-rule'
   	| 'apply-known-primitive' // 1/x → ln, e^x → e^x, sin → -cos, cos → sin
   	// Linéarité
   	| 'apply-linearity-sum' // ∫(f+g) = ∫f + ∫g
   	| 'extract-constant' // ∫c·f = c·∫f
   	// Reconnaissance de dérivée composée (lycée+)
   	| 'apply-composite-power' // u'·u^n → u^(n+1)/(n+1)
   	| 'apply-composite-ln' // u'/u → ln|u|
   	| 'apply-composite-exp' // u'·e^u → e^u
   	| 'apply-composite-sin' // u'·sin(u) → -cos(u)
   	| 'apply-composite-cos' // u'·cos(u) → sin(u)
   	// Intégrale définie
   	| 'apply-fundamental-theorem' // ∫_a^b = [F]_a^b
   	| 'substitute-bounds' // [F]_a^b → F(b) - F(a)
   	| 'simplify-bounds-result' // F(b) - F(a) → valeur numérique
   	// u-substitution explicite (sup)
   	| 'identify-substitution' // « On pose u = ... »
   	| 'compute-du' // « du = g'(x) dx »
   	| 'apply-substitution' // « L'intégrale devient ∫f(u) du »
   	| 'substitute-back' // « On remplace u par sa valeur »
   	// IPP simple (sup)
   	| 'identify-parts' // « ∫u dv détecté »
   	| 'choose-u-dv' // « u=..., dv=... → du=..., v=... »
   	| 'apply-parts-formula' // « ∫u dv = uv - ∫v du »
   	// Final
   	| 'add-constant' // « + C »
   	| 'simplify-result';
   ```

2. Créer `PedagogicalIntegrationStep extends BaseStep` :

   ```ts
   export interface PedagogicalIntegrationStep extends BaseStep {
   	readonly rule: PedagogicalIntegrationRule;
   	readonly before: MathNode; // intégrande ou expression intermédiaire
   	readonly after: MathNode; // primitive ou expression intermédiaire
   	readonly bindings?: IntegrationBindings; // u, du/dx, n, ... selon le case
   	readonly subSteps?: readonly PedagogicalIntegrationStep[];
   	readonly definite?: { lower: MathNode; upper: MathNode };
   }
   ```

3. `IntegrationBindings` :

   ```ts
   export interface IntegrationBindings {
   	readonly variable: string; // x, t, u, ...
   	readonly u?: MathNode; // u(x) pour formes composées
   	readonly du?: MathNode; // u'(x) ou du = u'(x) dx
   	readonly n?: MathNode; // exposant pour power-rule
   	readonly innerPrimitive?: MathNode;
   }
   ```

4. `IntegrationSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>`.

5. `PedagogicalIntegrationOptions` (analogue de
   `PedagogicalDifferentiationOptions` et
   `QuadraticEquationStepsOptions`) :

   ```ts
   export interface PedagogicalIntegrationOptions {
   	readonly level: IntegrationSchoolLevel;
   	readonly variable?: string; // auto-détecté sinon
   	readonly definite?: { lower: MathNode; upper: MathNode };
   	readonly notation?: 'differential' | 'functional'; // V2
   	readonly maxRecursionDepth?: number; // pour IPP cyclique guard
   }
   ```

6. `STRATEGIES_INTEGRATION: Readonly<Record<IntegrationSchoolLevel, IntegrationGenerationStrategy>>`
   (cf. § E ci-dessus).

7. `class PedagogicalIntegrationNotImplemented extends Error`
   (exporté depuis `types.ts`).

8. Tests d'isolation des types (compile-only `@ts-expect-error` + smoke
   runtime + kind-count sentinel).

### Code review attendu

`code-reviewer` (Opus) sur le diff types.

### Validation

- Compile clean (`pnpm check:incremental` sur les fichiers modifiés)
- Tests d'isolation passent
- Revue : cohérence avec
  `pedagogical-differentiation/types.ts` et `pedagogical-solve/types.ts`

---

## Phase 2 — Pipeline `pedagogical-integration/pipeline.ts`

### Sous-tâches

1. `generatePedagogicalIntegrationSteps(integrand, options): Result`

   - Point d'entrée principal.
   - Si `options.definite` → wrap dans `identify-definite-integral` +
     pipeline indéfini + `apply-fundamental-theorem` +
     `substitute-bounds` + `simplify-bounds-result`.
   - Sinon → pipeline indéfini direct.

2. Helpers privés (réutiliser `_helpers.ts` partagé du module
   `pedagogical-solve/` quand applicable, sinon créer
   `pedagogical-integration/_helpers.ts`) :

   - `dispatchByCase(integrand, variable, level)` — détecte le case et
     appelle le bon builder.
   - `tryDetectCompositePower/Ln/Exp/Sin/Cos(integrand, variable)` —
     pattern matching pour les formes composées (utiliser
     `differentiate()` de `differentiation/` pour calculer u'(x)
     candidate).
   - `extractLinearityTerms(integrand)` — sépare les termes d'une
     somme.
   - `extractConstantFactor(integrand, variable)` — détecte
     `c · f(x)` où c est constant.
   - `applyKnownPrimitive(integrand, variable)` — utilise les rules
     atomiques de `integration/rules.ts`
     (`powerRule`, `expRule`, `sinRule`, etc.).

3. Cas dispatch (priorité décroissante, premier matché gagne) :

   1. Constante pure → `apply-constant-rule`
   2. `x` ou `x^n` → `apply-power-rule`
   3. `1/x` → `apply-known-primitive` (ln|x|)
   4. `e^x` → `apply-known-primitive`
   5. `sin(x)`, `cos(x)`, `tan(x)` → `apply-known-primitive`
   6. **Forme composée u'·e^u** → `apply-composite-exp`
   7. **Forme composée u'/u** → `apply-composite-ln`
   8. **Forme composée u'·sin(u) / u'·cos(u)** →
      `apply-composite-sin/cos`
   9. **Forme composée u'·u^n** → `apply-composite-power`
   10. **Somme** → `apply-linearity-sum` + récursion par terme
   11. **Constante × f(x)** → `extract-constant` + récursion
   12. **u-sub explicite** (sup, si `enableUSubstitution`) — détection
       `f(g(x)) · g'(x)` plus large que les composées spécialisées
   13. **IPP simple** (sup, si `enablePartsSimple`) — détection
       `polynôme · (exp | sin | cos | ln)`
   14. Sinon → throw `PedagogicalIntegrationNotImplemented(integrand)`

4. Tests pipeline `__tests__/pipeline.test.ts` : ~70-90 tests couvrant
   les cas + variantes (coefficients fractionnaires, négatifs, sin de
   ax+b, etc.).

5. Cas critiques à tester :
   - `∫1 dx` → `x + C`
   - `∫x dx` → `x²/2 + C`
   - `∫x² dx` → `x³/3 + C`
   - `∫1/x dx` → `ln|x| + C`
   - `∫e^x dx` → `e^x + C`
   - `∫sin(x) dx` → `-cos(x) + C`
   - `∫(3x² + 2x + 1) dx` → linearity + power-rule × 3
   - `∫5e^x dx` → extract-constant + e^x
   - `∫2x·e^(x²) dx` → composite-exp avec u = x²
   - `∫(2x)/(x²+1) dx` → composite-ln avec u = x²+1
   - `∫sin(2x) dx` → composite-sin avec u = 2x (mais mais mais : u' = 2,
     pas l'argument de sin... vérifier la forme exacte attendue)
   - `∫_0^1 x dx` → fundamental-theorem + substitute-bounds → 1/2
   - `∫_0^π sin(x) dx` → 2
   - `∫x·e^x dx` → IPP (sup uniquement)
   - `∫ln(x) dx` → IPP (sup) avec u=ln(x), dv=dx
   - Cas `notImplemented` :
     - `∫x²·e^(x³) dx` (composite mais avec coef manquant)
     - `∫1/(x²+1) dx` → arctan, V2 ?
     - `∫1/√(1-x²) dx` → arcsin, V2 ?
     - `∫1/(x²-1) dx` → partial-fractions, throw NotImplemented

### Code review attendu

`code-reviewer` (Opus) sur le pipeline complet.

### Validation

- Tests passent
- 0 régression sur les autres modules (`differentiation/`, `solve/`,
  `integration/`)
- Revue : pas de duplication avec `integration/integrate.ts`,
  réutilisation propre via `rules.ts` et `differentiate()`,
  cas spéciaux correctement détectés AVANT la formule générale

---

## Phase 3 — Renderer `pedagogical-integration/renderer.ts`

### Sous-tâches

1. Créer `PedagogicalIntegrationRenderer` (classe analogue à
   `PedagogicalDifferentiationRenderer`).

2. TITLES (lycee, superieur) — à écrire from scratch (pas de
   pré-existant comme dans le quadratique). Inspirer de
   `descriptions-fr.ts` algorithmique pour les concepts mais reformuler
   pour le pédagogique.

   Exemples :

   - `apply-known-primitive` lycée : « Primitive usuelle : ∫sin(x) dx = -cos(x) »
   - `apply-known-primitive` sup : « Primitive : -cos(x) »
   - `apply-composite-exp` lycée : « On reconnaît la forme u'·e^u avec u = x² »
   - `apply-fundamental-theorem` lycée : « On évalue la primitive aux bornes : [F(x)]\_a^b »

3. EXPLANATIONS (lycee detailed, superieur compact).

4. `formatExpressionLatex(step)` — adapter pour les nouvelles opérations :

   - `apply-known-primitive` : afficher `\int f(x) \, dx = F(x) + C`
     en 2 lignes alignées
   - `apply-composite-exp` : afficher `\int u' \cdot e^u \, dx = e^u + C`
     avec substitution numérique
   - `apply-fundamental-theorem` : `\left[ F(x) \right]_{a}^{b}` puis
     `F(b) - F(a)`
   - `apply-linearity-sum` : `\int (f + g) \, dx = \int f \, dx + \int g \, dx`
   - `apply-parts-formula` : `\int u \, dv = uv - \int v \, du`

5. `assertSupportedLevel(level)` adapté : refuse `primaire` ET `college`.

6. Tests renderer `__tests__/renderer.test.ts` : ~20-25 tests.

### Code review attendu

`code-reviewer` (Opus) sur les TITLES + EXPLANATIONS + formatExpressionLatex.

### Validation

- Tests renderer passent
- Visuellement vérifiable via demo CLI (Phase 4)

---

## Phase 4 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-integration/demo-cases/` (analogue de
   `pedagogical-differentiation/demo-cases/`) avec 7 catégories :

   - `usuelles.ts` (5-6 cas)
   - `polynomial.ts` (3 cas)
   - `linearite.ts` (3 cas)
   - `forme-composee-ln.ts` (3 cas)
   - `forme-composee-exp.ts` (3 cas)
   - `definie.ts` (4-5 cas)
   - `parts-simple.ts` (3 cas, sup uniquement)
   - `index.ts` agrégateur (`ALL_CATEGORIES_INTEGRATION`).

2. Créer `pedagogical-integration/demo-helpers.ts` avec
   `presentIntegral(label, integrand, options, format)` analogue à
   `presentExpression` différentiation. Format `'custom' | 'latex' | 'both'`.

3. Créer `__tests__/pedagogical-integration-demo.test.ts` avec snapshots
   (~25 cas).

4. Créer `scripts/pedagogical-integration-demo.ts` (CLI standalone) :

   - Filtre par catégorie (args).
   - Flags `--latex` / `--custom` / `--both`.
   - Pretty-print custom syntax + ANSI bold-blue (cf. modèle
     `scripts/pedagogical-differentiation-demo.ts`).
   - Substitutions cosmétiques : `\int` → `∫`, `\, dx` → ` dx`,
     `\dfrac{a}{b}` → `(a)/(b)`, `\sqrt{x}` → `√(x)`, `e^{x}` → `e^x`,
     `\left[` → `[`, `\right]` → `]`, etc.

5. Vérifier que le CLI tourne :
   ```bash
   pnpm tsx scripts/pedagogical-integration-demo.ts usuelles
   pnpm tsx scripts/pedagogical-integration-demo.ts --latex
   pnpm tsx scripts/pedagogical-integration-demo.ts parts-simple
   ```

### Code review attendu

`code-reviewer` (Opus) sur les snapshots + CLI.

### Validation

- ~25 snapshots stables
- CLI fonctionne avec et sans args
- 0 régression

---

## Phase 5 — Mode B : `kind: 'integrate'`

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   - Ajouter `'integrate'` au `kind` de `GeneratedSteps`.
   - Type narrowing : si `kind === 'integrate'`, `expression: string`
     (l'intégrande au format LaTeX/custom, ex `"x^2 + 2x + 1"`).
     Champs optionnels : `definite?: { lower: string; upper: string }`,
     `variable?: string`.

2. Étendre `src/lib/questions/template-schema.ts` :

   - Ajouter le membre `integrate` au discriminator Zod (lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generatePedagogicalIntegrationSteps`,
     `PedagogicalIntegrationRenderer`, `IntegrationSchoolLevel`,
     `PedagogicalIntegrationNotImplemented`.
   - Case `'integrate'` dans le switch principal.
   - Bump `'primaire' | 'college'` → `'lycee'`.
   - Catch `PedagogicalIntegrationNotImplemented` → fallback silencieux + warn.

4. Tests `correction-generator.test.ts` : +6-8 tests
   (cas indéfini, cas défini, bump niveau, fallback notImplemented,
   override, IPP en sup mais pas lycée).

5. Étendre `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`
   avec 2 fixtures intégration :

   - `integrateIndefiniteDemo` (`∫(3x² + 2x + 1) dx`, niveau Tle spé)
   - `integrateDefiniteDemo` (`∫_0^1 e^x dx`, niveau Tle spé)

6. Étendre `__tests__/generated-steps-demo.test.ts` : +2 snapshots.

7. Étendre la page debug
   `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`
   avec les 2 nouvelles fixtures (passe de 12 à 14 fixtures).

### Svelte autofixer (OBLIGATOIRE pour la page debug)

```
mcp__svelte__svelte-autofixer(code: <contenu>, desired_svelte_version: 5,
                              filename: "+page.svelte")
```

### Code review attendu

`code-reviewer` (Opus) sur la glue Mode B + Svelte.
`security-auditor` (Opus) puisqu'on touche au pipeline qui consomme
des données utilisateur via Zod — vérifier que le strict schema valide bien.

### Validation

- Tests correction-generator passent
- Snapshot generated-steps-demo passe
- Page debug visible : `pnpm dev -- --port 5175` puis
  `http://localhost:5175/dashboard/admin/debug/correction-mode-b` (auth admin).
  Vérifier visuellement que les 2 nouvelles cartes rendent correctement.

---

## Phase 6 — Quality checks finaux + commit final + doc

### Sous-tâches

1. **ESLint** sur tous les fichiers créés/modifiés :

   ```bash
   npx eslint <fichiers>
   ```

   Doit retourner 0 erreur, 0 warning.

2. **TypeScript + Svelte** :

   ```bash
   pnpm check:incremental
   ```

   Doit retourner 0 nouvelle erreur (les 9 erreurs préexistantes dans
   `slides/demo` et `extern/` sont attendues).

3. **Svelte autofixer** sur `+page.svelte` modifié :

   ```
   mcp__svelte__svelte-autofixer(...)
   ```

4. **Tests régression complets** sur les suites adjacentes :

   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```

   Aucune régression attendue.

5. **Doc de progression** : créer `docs/wip/integration-stepper-progress.md`
   sur le modèle de `differentiation-stepper-progress.md`. Inclure :

   - Tableau État global (Phase × Status × Commit × Notes).
   - Décisions architecturales validées (Phase 0).
   - Fichiers livrés.
   - Tests cumulés.
   - Code review (post-livraison) avec les éventuels fixes.
   - Limitations connues V1.
   - Pistes d'amélioration (post-V1).
   - Documents de référence.

6. **Mise à jour des docs principales** (à faire en fin de tunnel) :

   - `docs/wip/pedagogical-steppers-mvp-progress.md` — ajouter une entrée
     "✅ Stepper pédagogique pour intégration" dans la section "Livrés
     depuis dans des prompts/sessions ultérieurs", retirer
     `pedagogical-integration/` de "Élargissement de couverture
     toujours à faire".
   - `docs/wip/correction-integration-progress.md` — mentionner
     l'extension `kind: 'integrate'` dans la section "Extensions post-MVP",
     passer de 5 à 6 nouveaux kinds, mise à jour fixture count
     (12 → 14).

7. **Commit final** : direct (`git commit`) si peu de changements
   conceptuels en Phase 6, ou via `commit-manager` si beaucoup.

   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit
   (cf. CLAUDE.md global utilisateur).

### Validation

- ESLint clean
- check:incremental clean
- Svelte autofixer clean
- 0 régression sur ~12000 tests
- Doc de progression écrite
- Commit final créé

---

## Anti-patterns à éviter (RECAP des erreurs des sessions précédentes)

1. **Ne PAS** réimplémenter les rules atomiques — utiliser `powerRule`,
   `expRule`, `sinRule`, etc. de `integration/rules.ts`. La session
   différentiation avait fait l'erreur de ne pas réutiliser
   `differentiation/rules.ts` au début (corrigée).

2. **Ne PAS** instrumenter `integration/integrate.ts` directement.
   L'algorithme algorithmique reste **strictement intact** ;
   rétrocompatibilité parfaite (analogue à la décision Option 2 de
   différentiation).

3. **Ne PAS** ignorer les FunctionNode avec `power` (`\sin^2(x)`-type) —
   bug rattrapé en code review différentiation. Pour intégration, le
   bug analogue serait `∫ sin²(x) dx` mal classifié si on ne lit pas
   `node.power`. Cas hors V1 mais à documenter dans `notImplemented`.

4. **Ne PAS** émettre des steps vides (`steps: []`) au top-level — si
   un cas dégénéré (ex: `∫0 dx`) produit zéro étape, retourner soit un
   step `apply-constant-rule` (∫0 = C) soit throw avec classe d'erreur.
   **Ne jamais retourner `[]`.**

5. **Ne PAS** silently skip les cas hors scope. Toujours throw avec
   classe d'erreur dédiée + catch côté correction-generator.

6. **Ne PAS** dupliquer les helpers `canon`, `_helpers.ts` — soit
   importer depuis `pedagogical-solve/_helpers.ts` (si applicable),
   soit créer `pedagogical-integration/_helpers.ts` propre. Surtout pas
   de copier-coller silencieux.

7. **Ne PAS** mettre `Co-Authored-By: Claude` dans les commits.

8. **Ne PAS** exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint` sur tout le projet. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

9. **Ne PAS** s'arrêter au premier échec de phase. Si la phase 2 plante,
   debugger avec l'agent `debugger` (Opus). Continuer jusqu'à la fin du tunnel.

10. **Ne PAS** prendre de décision architecturale unilatérale. Si en
    cours de route un trade-off non couvert par Phase 0 émerge, **demander
    à l'utilisateur**.

11. **Ne PAS** déduire de la Phase 0 sans valider explicitement les
    réponses Q1-Q10 avec l'utilisateur. Attendre les réponses.

12. **Ne PAS** confondre `IntegrationRule` (algorithmique, dans
    `integration/descriptions-fr.ts`) avec `PedagogicalIntegrationRule`
    (pédagogique, à créer dans `pedagogical-integration/types.ts`).
    Ce sont deux unions distinctes.

13. **Ne PAS** oublier le cas `definite` (intégrales définies).
    L'utilisateur attend `∫_0^1 e^x dx → e - 1` rendu pédagogiquement,
    pas juste l'antidérivée.

---

## Récap effort estimé

| Phase     | Effort estimé                                |
| --------- | -------------------------------------------- |
| 0         | 10-15 min validation Q1-Q10 avec utilisateur |
| 1         | 45 min types + tests isolation               |
| 2         | 3-4h pipeline + tests (~80 tests)            |
| 3         | 2-2.5h renderer + tests (~25 tests)          |
| 4         | 2h démos + script CLI + snapshots (~25 cas)  |
| 5         | 1-1.5h Mode B + 2 fixtures + page debug      |
| 6         | 30-45 min quality + doc + commit             |
| **Total** | **~10-12h en tunnel continu**                |

Cible : **~120-150 tests verts spécifiques au feature**, **~3500 LOC**,
**6-8 commits intermédiaires**, **0 régression** sur ~12000 tests existants.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/integration-stepper-progress.md` — doc de progression complète.
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
3. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 3 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
