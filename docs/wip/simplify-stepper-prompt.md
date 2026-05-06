# Pedagogical Simplify Stepper — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 5 modules pédagogiques de
> step-by-step (`pedagogical-arithmetic/`, `pedagogical-solve/{linear,
quadratic, linear-inequality, quadratic-inequality, rational-inequality}`,
> `pedagogical-differentiation/`, `pedagogical-integration/`) tous
> branchés sur le « Mode B » des corrections (`QuestionCorrection.generatedSteps`,
> 8 kinds discriminés). Les 5 ont suivi le pattern « Option 2 = pipeline
> parallèle » (clone architectural). **Pour `simplify`, ce pattern n'est
> PAS approprié** — voir Phase 0 Q1 ci-dessous pour l'analyse détaillée.

---

## ⚠️ ATTENTION ARCHITECTURALE PRÉALABLE

**Ne PAS reproduire mécaniquement le pattern différentiation/integration.**

Le module `simplify/` est radicalement différent des 5 modules déjà
traités (différentiation, équations, inéquations, intégration) :

1. Il **n'a pas d'algorithme dispatch-by-type** — il applique des rules
   pattern-matching itérativement via `rewrite()` engine (refacto MVP
   Phase 1).
2. Il **a déjà un step recorder bien fait** (`SimplifyStepRecorder`
   extends `StepRecorderBase`) qui enregistre `phase + rule + description
   - before/after`.
3. Ses **rule labels existants sont déjà pédagogiquement utilisables**
   (`abs-product`, `trig-pythagore`, `combine-like-terms`, etc.).
4. Mais il a **3 problèmes pédagogiques** :
   - Phantom phases `normalize` / `post-normalize` (l'élève n'écrit pas
     « on canonise polynomialement »)
   - Stratégie `cost-fixpoint` peut produire un ordre non-pédagogique
     (factoriser avant distribuer si moins cher)
   - Descriptions FR très incomplètes (~8 sur ~100+ rules)

**Phase 0 Q1 force l'agent à choisir explicitement entre 3 options
architecturales** (analysées en détail) plutôt que d'adopter le pattern
des sessions précédentes par défaut.

---

## Lectures préalables OBLIGATOIRES (par ordre)

L'agent DOIT lire ces fichiers en premier — la suite du prompt y fait
référence et pré-suppose qu'ils sont compris.

### 1. Module cible (à instrumenter, PAS à cloner)

- `src/lib/mathAST/simplify/simplify.ts` (~183 LOC) — entry point. C'est
  un **wrapper léger** autour de `rewrite()` du MVP Phase 1. Le
  pipeline a 3 phases : preProcess (normalisation polynomiale) → apply
  pattern rules (4 rule sets) → postProcess (re-normalisation).
  Cost-fixpoint loop max 10 iterations.
- `src/lib/mathAST/simplify/types.ts` — `SimplifyStep extends BaseStep`
  avec `phase: 'rules' | 'normalize' | 'identity' | 'post-normalize'`.
  `SimplifyResult { result, steps, cost, aborted? }`. `SimplifyOptions`
  avec flags `enableTrig`, `enableHyperbolic`, `enableAlgebraic`,
  `enableAbs`.
- `src/lib/mathAST/simplify/step-recorder.ts` (~49 LOC) —
  `SimplifyStepRecorder` minimal extends `StepRecorderBase<SimplifyStep>`
  avec `setPhase` + `recordStep`.
- `src/lib/mathAST/simplify/descriptions-fr.ts` (~34 LOC) —
  `getSimplifyRuleDescription(rule)` lookup map. **Très incomplet** :
  ~8 rules listées, le reste tombe sur fallback `"Regle : <rule>"`.
  C'est une dette à combler dans ce prompt.
- `src/lib/mathAST/simplify/cost.ts` — `computeCost(node)` métrique
  utilisée pour le fixpoint. Lecture pour comprendre pourquoi
  l'ordre cost-fixpoint diverge de l'ordre pédagogique.

### 2. Infrastructure rewriting (utilisée par simplify)

- `src/lib/mathAST/common/rewriting-engine.ts` — `rewrite(node, config)`
  avec stratégies `'cost-fixpoint' | 'deterministic'`. **Important** :
  la stratégie `'deterministic'` applique les rules dans l'ordre de
  priorité fixé, ce qui correspond à l'ordre pédagogique naturel.
- `src/lib/mathAST/common/step-renderer-base.ts` — types renderer
  (`StepRenderer`, `RenderedStep`, `PedagogicalRenderOptions`,
  `SchoolLevel`).
- `src/lib/mathAST/common/technical-renderer.ts` — `GenericTechnicalRenderer`
  par reflection. Référence pour montrer un exemple de renderer existant.
- `src/lib/mathAST/common/REWRITING.md` — README MVP Phase 1 sur le
  pattern dual rendering. **À LIRE** : c'est le manifeste de la
  séparation engine/renderer.

### 3. Rule sets utilisés par simplify

- `src/lib/mathAST/pattern/rule-sets/abs.ts` (~150 LOC, 6 rules
  `abs-negation`, `abs-idempotent`, `abs-product`, `abs-quotient`,
  `abs-positive`, `abs-negative`).
- `src/lib/mathAST/pattern/rule-sets/trig-identities.ts` (~645 LOC,
  ~50 rules : `pythagore`, `sin-over-cos`, `sin-negative`,
  `sin-period-2pi`, `sin-cos-different`, etc.).
- `src/lib/mathAST/pattern/rule-sets/hyperbolic-identities.ts` (~603 LOC,
  ~40 rules).
- `src/lib/mathAST/pattern/rule-sets/algebraic-identities.ts` (~220 LOC,
  factoring rules, expand identities).
- `src/lib/mathAST/pattern/rule-sets/index.ts` — barrel + agrégation.
- `src/lib/mathAST/pattern/types.ts` — `Rule { name, lhs, rhs,
condition?, priority? }`.

**TOTAL** : ~100+ rules pattern existantes, dont la majorité ont des
`name` déjà pédagogiquement utilisables (`pythagore`, `factor-out-gcd`,
`distribute-mul-over-add`, etc.).

### 4. Module modèle pour le DUAL RENDERING (à étudier)

- `src/lib/mathAST/solve/pedagogical-renderer.ts` (~190 LOC) —
  **PRÉCÉDENT du pattern Option A** : ce renderer prend des steps
  algorithmiques de `solve()` et les map en titres lycée/sup/etc.
  via `TITLES` per `SchoolLevel`. **Lecture critique** : c'est
  exactement le pattern qu'on adapterait pour `simplify` en Option A.
  Mais voir aussi pourquoi ce pattern a été insuffisant pour les
  équations linéaires (a forcé la création de `pedagogical-solve/linear`).
- `src/lib/mathAST/solve/__tests__/dual-rendering-demo.test.ts` — démo
  end-to-end qui imprime côte-à-côte technique vs pédagogique 4 niveaux.

### 5. Modules modèles pour le PIPELINE PARALLÈLE (à NE PAS cloner aveuglement)

- `src/lib/mathAST/pedagogical-differentiation/` — **template
  architectural des 4 derniers steppers**. À lire pour comprendre la
  shape attendue (types, pipeline, renderer, demos), mais ne PAS
  cloner pour simplify (cf. Q1 Option B → anti-pragmatique).
- `docs/wip/differentiation-stepper-progress.md` — doc de référence
  pour le format à reproduire dans `simplify-stepper-progress.md`.
- `docs/wip/integration-stepper-progress.md` — exemple récent (V1+V1.1+V2).

### 6. Glue Mode B (pattern à reproduire)

- `src/lib/questions/types.ts` — `GeneratedSteps` discriminator actuel
  (8 kinds). **Étendre avec `'simplify'`.**
- `src/lib/questions/template-schema.ts` — schémas Zod (lax + strict).
- `src/lib/questions/generator/correction-generator.ts` — dispatch
  switch/case sur `kind`.
- `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts` —
  ajouter 1-2 fixtures simplification.
- `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte` —
  page debug à étendre (passe de 13 à ~15 fixtures).

### 7. Docs de progression liées

- `docs/wip/pedagogical-steppers-mvp-progress.md` — vue d'ensemble.
- `docs/wip/correction-integration-progress.md` — détail Mode B (à
  mettre à jour).
- `docs/wip/pedagogical-arithmetic-progress.md` — exemple de pipeline
  qui FAIT du pattern matching pédagogique (modèle d'orchestration des
  rules pédagogiques avec priorités).

---

## Phase 0 — Spécification TDD (bloquante : valider avec l'utilisateur AVANT d'écrire du code)

L'agent doit poser ces questions à l'utilisateur et **attendre des
réponses explicites** avant de passer à Phase 1. **Ne pas adopter le
pattern différentiation par défaut.**

### Q1 — Architecture : A vs B vs C ?

**C'est la décision la plus importante du prompt.** Trois options ont
été analysées en pré-rédaction :

#### Option A — Pure dual renderer (réutilise `simplify()` tel quel)

- Créer `pedagogical-simplify/` qui contient JUSTE un
  `PedagogicalSimplifyRenderer` qui consomme `SimplifyStep[]` produits
  par `simplify()`.
- Renderer fait : filtre phases `normalize` + map `rule` → titre/explanation
  par `SchoolLevel` + `\textcolor{blue}{...}` + format LaTeX 2-lignes.
- ~200-300 LOC total.

**Pros** :

- Cheap, peu de code
- Aucune duplication algorithmique
- Bénéficie de cost-fixpoint et efficacité existante
- Rule labels existants déjà utilisables

**Cons** :

- Aucun contrôle sur l'ordre cost-fixpoint (factorise avant distribuer
  si moins cher)
- Aucun moyen de combiner steps en sub-steps arborescents
- Aucun moyen de skipper/regrouper steps cosmétiques
- Phantom phases `normalize` produisent des steps non-pédagogiques
- Verbosity actuelle (`'result' | 'detailed'`) pas niveau-scolaire-aware
- Précédent `solve/pedagogical-renderer.ts` MVP qui était Option A pure
  → a échoué pour les équations linéaires, a forcé la création de
  `pedagogical-solve/linear`. Risque analogue pour simplify.

#### Option B — Pipeline parallèle (clone du pattern différentiation)

- Créer `pedagogical-simplify/` avec son propre dispatcher, types,
  rules pédagogiques.
- ~3500 LOC comme les autres.

**Pros** :

- Contrôle total sur l'ordre, verbosity, sub-steps
- Indépendant de `simplify()`
- Bindings explicites possibles
- Niveau-scolaire-aware nativement

**Cons** :

- **DUPLICATION MASSIVE** : ~100+ rules dans 4 rule sets matures
  (`abs`, `trig`, `hyp`, `algebraic`, ~2500 LOC). Tout dupliquer ou
  ré-importer est un projet en soi.
- Risque énorme de divergence avec simplify() si les règles évoluent
- Coût de maintenance double
- **Anti-pragmatique** vu la maturité du module simplify

#### Option C — Hybride (RECOMMANDÉE)

- Créer `pedagogical-simplify/` qui **ré-utilise** rule sets existants
  - `rewrite()` engine, **mais** :
  * Override la stratégie : `'deterministic'` (ordre par priorité
    pédagogique) au lieu de `'cost-fixpoint'`
  * Override le pre/postProcess : SKIP la canonisation polynomiale
    (qui est anti-pédagogique pour des steps comme « on développe
    (x+1)² »)
  * Override les rule priorities pour matcher l'ordre pédagogique
    (distribuer avant factoriser, etc.) — éventuellement via une
    couche `pedagogical-simplify/rule-priorities.ts` qui réordonne
- **Plus** un dual renderer : `PedagogicalSimplifyRenderer` qui :
  - Filtre les phases `normalize` (rejette ou fold dans la step
    suivante)
  - Map `rule` → titre/explanation par `SchoolLevel`
  - Ajoute `\textcolor{blue}{...}`
  - Format LaTeX 2-lignes
- **Plus** une couche pédagogique légère (`pedagogical-simplify/pipeline.ts`)
  pour structurer les sub-steps arborescents (ex: « on factorise »
  parent + 3 sub-steps de manipulation) — POSTERIEUREMENT à l'engine,
  par regroupement des `SimplifyStep[]`.
- ~600-1000 LOC total (renderer + descriptions FR complètes + rule
  priorities + sub-step grouping).

**Pros** :

- Réutilise massivement le code existant (rule sets, engine, types)
- Contrôle pédagogique sur l'ordre et la canonisation
- Support sub-steps via couche post-engine
- Niveau-scolaire-aware via le renderer
- ~3-4× moins de code que Option B

**Cons** :

- Plus complexe que A
- Nécessite de bien comprendre les rule priorities du module `pattern/`
- Le grouping post-engine doit reconstituer un step tree à partir
  d'une liste plate (heuristique pour décider "ces 3 steps font partie
  de la même factorisation" → wrap dans un parent)
- Stratégie `'deterministic'` peut produire un résultat moins simplifié
  que `'cost-fixpoint'` — il faut décider si on accepte ce trade-off
  pédagogique

#### Q1 — Reco par défaut : **Option C**

L'utilisateur doit confirmer ce choix OU choisir A (cheaper, suffisant
pour des cas simples) OU B (clean separation mais coûteux).

**Si l'utilisateur choisit A** : skipper Phase 1.5 (rule priorities) et
Phase 2 (orchestration sub-steps), aller directement Phase 3 (renderer).

**Si l'utilisateur choisit B** : tout réécrire selon le pattern
différentiation. Ce prompt n'est plus valide → rédiger un nouveau prompt
basé sur `differentiation-stepper-prompt.md`.

**Si l'utilisateur choisit C** : suivre le reste de ce prompt tel quel.

### Q2 — Périmètre V1 strict ?

Inclure :

- **Distribution / développement** (`(x+1)(x-1)`, `(a+b)²`, etc.)
- **Factorisation simple** (factor-out-gcd, identités remarquables
  inversées)
- **Combinaison de termes semblables** (`2x + 3x → 5x`,
  `2x² + 3x² → 5x²`)
- **Réduction de fractions** (`6/8 → 3/4`)
- **Simplification de puissances** (`x²·x³ → x⁵`, `(x²)³ → x⁶`)
- **Simplification de radicaux** (`√8 → 2√2`)
- **Identités trigonométriques élémentaires** (`sin² + cos² = 1`,
  `sin(-x) = -sin(x)`, périodicité)
- **Simplification de valeurs absolues** (`|−x| = |x|`, `|a·b| = |a|·|b|`)
- **Simplification d'exponentielles/logarithmes** (`e^(ln x) = x`,
  `ln(e^x) = x`, `ln(a·b) = ln(a) + ln(b)`)

Exclure (V2+) :

- **Identités hyperboliques** (sinh, cosh) — exclues du programme
  lycée standard
- **Décomposition en éléments simples** — couverte par
  `pedagogical-integration/` V2 dans son contexte propre
- **Simplification de matrices** — module distinct
- **Simplification d'inéquations** — module distinct
  (`pedagogical-rational-inequality/` etc.)
- **Coefficients paramétriques** — V2

**Reco par défaut** : OUI ce périmètre.

### Q3 — Niveaux scolaires ?

- `primaire` : très limité (combine like terms, réduction fraction
  simple, |x| basique). Refuser le reste avec
  `PedagogicalSimplifyNotImplemented`.
- `college` : ajoute distribution, factorisation simple, identités
  remarquables, puissances entières, radicaux simples.
- `lycee` : ajoute identités trig (cosinus, sinus, tan), exp/log,
  factorisation avancée, racines.
- `superieur` : tout activé, niveau compact (vocabulaire concis).

Type `SimplifySchoolLevel = SchoolLevel` (les 4 niveaux sont admis).
Différence avec quadratique/intégration : pas de bump auto, le renderer
adapte son vocabulaire à chaque niveau.

**Reco par défaut** : OUI 4 niveaux (`primaire | college | lycee | superieur`).

### Q4 — Sub-steps arborescents ?

Pour les manipulations multi-étapes (ex: factoriser `2x² + 4x` =
identifier coefficient commun + identifier variable commune + écrire
factorisé), faut-il regrouper en sub-steps arborescents ou laisser
plat ?

**Reco par défaut** : OUI sub-steps. Le grouping post-engine identifie
les "macro-steps" pédagogiques (ex: tous les steps avec `phase: 'rules'`

- même rule label adjacents = wrappés dans un sub-step parent
  "Factorisation"). L'élève voit la macro-étape ET peut déplier.

### Q5 — Phantom `normalize` phases ?

Le `simplify()` actuel produit des steps avec
`phase: 'normalize' | 'post-normalize'` qui correspondent à la
canonisation polynomiale interne (réordonnement, regroupement
implicite, etc.). Ces steps ne sont pas pédagogiques.

**Options** :

- (a) Filtrer (skip dans le renderer)
- (b) Fold dans la step suivante (le renderer affiche le before de la
  normalize comme before, et le after de la rule suivante comme after)
- (c) Garder mais avec verbosity gating (display si verbosity = `'detailed'`)

**Reco par défaut** : (a) Filtrer. La canonisation est invisible pour
l'élève. Si on veut être plus rigoureux, (b) fold pour préserver la
continuité before/after entre steps consécutifs.

### Q6 — Stratégie `'deterministic'` vs `'cost-fixpoint'` ?

Trade-off : `deterministic` (ordre par priorité fixe) garantit l'ordre
pédagogique mais peut produire un résultat moins simplifié.
`cost-fixpoint` produit le résultat le plus simplifié mais l'ordre peut
diverger (ex: factorise avant de distribuer si moins cher).

**Options** :

- (a) `'deterministic'` strict — ordre pédagogique respecté, accepter
  qu'on simplifie moins
- (b) `'cost-fixpoint'` strict — résultat optimal mais ordre potentiel
  non-pédagogique
- (c) Hybride : `'deterministic'` pour la phase pédagogique d'abord,
  puis `'cost-fixpoint'` pour finaliser (le renderer skipper le second
  pass)

**Reco par défaut** : (a) `'deterministic'`. La pédagogie prime sur
l'optimisation.

### Q7 — Démos catégorisées ?

7 catégories proposées :

- `distribution` (`(x+1)(x-1)`, `(a+b)²`, `(2x+3)·(x-1)`) — 4 cas
- `factorisation` (factor-out-gcd, identités remarquables) — 4 cas
- `combinaison-termes-semblables` (`2x + 3x`, `5x² - 2x²`) — 3 cas
- `fractions` (`6/8 → 3/4`, `(2x+4)/(x+2) → 2`, `1/2 + 1/3 → 5/6`) — 4 cas
- `puissances` (`x²·x³`, `(x²)³`, `2³·2⁵`) — 3 cas
- `radicaux` (`√8`, `√(a²)`, `√2·√3`) — 3 cas
- `identites-trig` (`sin² + cos²`, `sin(2π+x)`, `tan(x) = sin/cos`) — 3 cas

**Reco par défaut** : 7 catégories × ~3-4 cas = ~25 cas total.

### Q8 — `kind: 'simplify'` cohérent avec les autres ?

A : `kind: 'simplify'` cohérent avec `'differentiate'`, `'integrate'`.
B : `kind: 'simplify-expression'` plus explicite (vs simplify d'équation
par exemple).

**Reco par défaut** : A `'simplify'`.

### Q9 — Throw `PedagogicalSimplifyNotImplemented` ?

Idem différentiation/intégration : throw avec classe d'erreur dédiée +
catch dans correction-generator → fallback Mode A.

**Reco par défaut** : OUI.

### Q10 — Cible chiffrée ?

Si **Option C** : ~600-1000 LOC (renderer + descriptions FR ~80 nouvelles
entrées + rule priorities + sub-step grouping + tests). ~80-100 tests.

Si **Option A** : ~200-300 LOC (renderer + descriptions FR + tests).
~40-60 tests.

Si **Option B** : ~3500 LOC, ~150 tests.

**Reco par défaut** : Option C visée → ~80 tests, ~800 LOC.

### Critères d'acceptation

- 0 régression sur ~12000 tests `mathAST + math + geometry-core/compute`
- Pipeline opérationnel sur les 7 catégories de simplification
- Renderer 4 niveaux (`primaire | college | lycee | superieur`) avec
  TITLES + EXPLANATIONS
- ≥6 catégories de démos avec snapshots stables
- Script CLI standalone (`scripts/pedagogical-simplify-demo.ts`)
- Mode B `kind: 'simplify'` intégré + 2 fixtures end-to-end
- Page debug étendue avec les 2 nouvelles fixtures (13 → 15)
- 0 erreur ESLint, 0 nouvelle erreur TS (`pnpm check:incremental`)
- Doc de progression écrite (`docs/wip/simplify-stepper-progress.md`)
- Code review `code-reviewer` (Opus) après chaque phase
- Commits sans `Co-Authored-By: Claude` (cf. CLAUDE.md global)

---

## ⚠️ Le reste du prompt (Phase 1+) suppose Option C validée

**Si l'utilisateur choisit A en Phase 0 :**

- Skipper Phases 1.5 et 2 (rule priorities, orchestration sub-steps).
- Aller directement Phase 3 (renderer dual + descriptions FR).
- Total ~3 phases au lieu de 6.

**Si l'utilisateur choisit B :**

- Ce prompt est invalide. Rédiger un nouveau prompt basé sur
  `differentiation-stepper-prompt.md` en remplaçant « différentiation »
  par « simplification » et en réimplémentant tous les rule sets.

**Si Option C : suivre la suite du prompt.**

---

## Phase 1 — Types `pedagogical-simplify/types.ts`

### Sous-tâches

1. Créer `PedagogicalSimplifyStep` :

   ```ts
   export interface PedagogicalSimplifyStep extends BaseStep {
   	readonly rule: string; // e.g. 'distribute', 'factor-gcd', 'pythagore'
   	readonly category: PedagogicalSimplifyCategory;
   	readonly before: MathNode;
   	readonly after: MathNode;
   	readonly subSteps?: readonly PedagogicalSimplifyStep[];
   	readonly highlightSubTrees?: readonly MathNode[]; // pour le renderer color
   }

   export type PedagogicalSimplifyCategory =
   	| 'distribution'
   	| 'factorisation'
   	| 'combinaison-termes-semblables'
   	| 'fractions'
   	| 'puissances'
   	| 'radicaux'
   	| 'identites-trig'
   	| 'identites-log-exp'
   	| 'valeur-absolue'
   	| 'normalize' // phantom — filtré par défaut
   	| 'autre'; // fallback
   ```

2. `PedagogicalSimplifyOptions` :

   ```ts
   export interface PedagogicalSimplifyOptions {
   	readonly level: SchoolLevel;
   	readonly variable?: string; // hint pour le contexte
   	readonly enableTrig?: boolean;
   	readonly enableLogExp?: boolean;
   	readonly enableAbs?: boolean;
   	readonly skipNormalize?: boolean; // default true (filtre phantom)
   	readonly groupSubSteps?: boolean; // default true
   	readonly maxIterations?: number; // pass-through to rewrite()
   }
   ```

3. `PedagogicalSimplifyResult { result, steps, cost }`.

4. `class PedagogicalSimplifyNotImplemented extends Error` (exporté
   depuis `types.ts`).

5. Tests d'isolation des types (compile-only `@ts-expect-error` + smoke
   runtime + category-count sentinel).

### Code review attendu

`code-reviewer` (Opus) sur le diff types.

### Validation

- Compile clean (`pnpm check:incremental` sur les fichiers modifiés)
- Tests d'isolation passent
- Revue : cohérence avec `pedagogical-differentiation/types.ts` et
  `simplify/types.ts`

---

## Phase 1.5 — Rule priorities pédagogiques (`pedagogical-simplify/rule-priorities.ts`)

### Sous-tâches

1. Créer une map `PEDAGOGICAL_RULE_PRIORITIES: Record<string, number>`
   qui assigne des priorités explicites aux rules pour matcher l'ordre
   pédagogique :

   ```ts
   export const PEDAGOGICAL_RULE_PRIORITIES: Readonly<Record<string, number>> = {
   	// Distribution AVANT factorisation (un élève distribue d'abord)
   	'distribute-mul-over-add': 200,
   	'distribute-power-over-mul': 200,
   	'expand-binomial-square': 195,
   	'expand-binomial-conjugate': 195,

   	// Combinaison termes semblables (priorité moyenne)
   	'combine-like-terms': 150,
   	'combine-numeric': 150,

   	// Réduction fractions / puissances (priorité moyenne-basse)
   	'reduce-fraction': 130,
   	'combine-powers-same-base': 130,

   	// Identités trig (priorité moyenne)
   	pythagore: 140,
   	'sin-negative': 140,

   	// Factorisation EN DERNIER (un élève factorise après distribution)
   	'factor-out-gcd': 100,
   	'factor-binomial-square': 90,
   	'factor-difference-of-squares': 90
   	// ...
   };
   ```

2. Helper `applyPedagogicalPriorities(rules)` qui prend un set de
   rules existant et retourne une copie avec `priority` réécrite selon
   la map.

3. Tests `__tests__/rule-priorities.test.ts` (~10 tests) : vérifier que
   l'application sur `algebraicSimplifyRules` réordonne effectivement
   distribuer avant factoriser.

### Code review attendu

`code-reviewer` (Opus) sur la map de priorités (cohérence pédagogique).

### Validation

- Tests passent
- Revue : map exhaustive (couvre les rules majeures de chaque rule set)

---

## Phase 2 — Orchestration `pedagogical-simplify/pipeline.ts`

### Sous-tâches

1. `generatePedagogicalSimplifySteps(node, options): PedagogicalSimplifyResult`
   point d'entrée principal :

   - Construit le rule set selon `options.enableTrig/LogExp/Abs`
   - Applique `applyPedagogicalPriorities` (Phase 1.5)
   - Appelle `rewrite()` avec stratégie `'deterministic'` (override
     du `'cost-fixpoint'` de simplify)
   - Skip pre/postProcess si `options.skipNormalize` (cf. Q5)
   - Récupère `SimplifyStep[]` via le bridge
   - **Post-traitement** : map chaque `SimplifyStep` → `PedagogicalSimplifyStep`
     (ajoute `category` via `categorizeRule(rule.name)`)
   - **Sub-step grouping** (si `options.groupSubSteps`) : identifier
     les séquences de steps adjacents même catégorie, les wrapper
     dans un sub-step parent. Exemple : 3 steps `distribute-*`
     consécutifs → 1 step parent "Distribution" + 3 sub-steps.

2. Helper `categorizeRule(ruleName)` : map rule name → category.

3. Helper `groupAdjacentSteps(steps, predicate)` : utility pour
   regrouper les steps consécutifs.

4. Throw `PedagogicalSimplifyNotImplemented` si l'expression contient
   des constructions hors V1 (matrices, sets, paramètres formels).

5. Tests pipeline `__tests__/pipeline.test.ts` : ~40-60 tests.

6. Cas critiques à tester :
   - `(x+1)(x-1)` → distribution → `x² - 1`
   - `(x+1)²` → développement → `x² + 2x + 1`
   - `2x + 3x` → combine-like-terms → `5x`
   - `x² + 2x + 1` → factorisation (V1.1?) → `(x+1)²`
   - `6/8` → reduce-fraction → `3/4`
   - `x²·x³` → combine-powers → `x⁵`
   - `√8` → simplify-radical → `2√2`
   - `sin²(x) + cos²(x)` → pythagore → `1`
   - `sin(-x)` → sin-negative → `-sin(x)`
   - `|−x|` → abs-negation → `|x|`
   - `e^(ln x)` → log-exp identity → `x`
   - Niveau strategy : `primaire` rejette `pythagore` mais accepte
     `combine-like-terms`
   - Sub-step grouping : `(x+1)(x-1)·(x²+1)` → 2 sub-steps de
     distribution sous un parent

### Code review attendu

`code-reviewer` (Opus) sur le pipeline complet.

### Validation

- Tests passent
- 0 régression sur les autres modules
- Revue : pas de duplication algorithmique avec `simplify/`,
  réutilisation propre via rule sets, sub-step grouping correct

---

## Phase 3 — Renderer `pedagogical-simplify/renderer.ts`

### Sous-tâches

1. Créer `PedagogicalSimplifyRenderer` (classe analogue à
   `PedagogicalDifferentiationRenderer`).

2. **Étendre `descriptions-fr.ts`** : passer de ~8 à ~80 entries.
   Pour chaque rule label utilisé par les rule sets `abs`, `trig`,
   `algebraic`, `hyp`, `log-exp`, `powers`, `sqrt`, `arithmetic`,
   ajouter :

   - Un titre par niveau (`primaire | college | lycee | superieur`)
   - Une explanation par niveau (formelle au sup, didactique au primaire)
   - Une catégorie (PedagogicalSimplifyCategory) pour le grouping
   - Optionnel : un emoji ou pictogramme pour la lisibilité

3. `formatExpressionLatex(step)` — format LaTeX 2-lignes :

   ```latex
   \begin{aligned}
     \textcolor{blue}{(x+1)(x-1)} & \\
     = x^2 - 1
   \end{aligned}
   ```

4. `assertSupportedLevel(level)` — pour `simplify`, tous les niveaux
   sont supportés (différence vs quadratique/intégration).

5. Tests renderer `__tests__/renderer.test.ts` : ~20-30 tests.

### Code review attendu

`code-reviewer` (Opus) sur les TITLES + EXPLANATIONS + formatExpressionLatex.

### Validation

- Tests renderer passent
- Visuellement vérifiable via demo CLI (Phase 4)

---

## Phase 4 — Démos catégorisées + script CLI

### Sous-tâches

1. Créer `pedagogical-simplify/demo-cases/` avec 7 catégories
   (cf. Q7) × ~3-4 cas.

2. Créer `pedagogical-simplify/demo-helpers.ts` avec
   `presentSimplification(label, expr, options, format)` analogue.
   Format `'custom' | 'latex' | 'both'`.

3. Créer `__tests__/pedagogical-simplify-demo.test.ts` avec snapshots
   (~25 cas).

4. Créer `scripts/pedagogical-simplify-demo.ts` (CLI standalone) :

   - Filtre par catégorie (args).
   - Flags `--latex` / `--custom` / `--both`.
   - Pretty-print custom syntax + ANSI bold-blue.
   - Substitutions cosmétiques classiques.

5. Vérifier que le CLI tourne :

   ```bash
   pnpm tsx scripts/pedagogical-simplify-demo.ts distribution
   pnpm tsx scripts/pedagogical-simplify-demo.ts --latex
   pnpm tsx scripts/pedagogical-simplify-demo.ts identites-trig
   ```

### Code review attendu

`code-reviewer` (Opus) sur les snapshots + CLI.

### Validation

- ~25 snapshots stables
- CLI fonctionne
- 0 régression

---

## Phase 5 — Mode B : `kind: 'simplify'`

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   - Ajouter `'simplify'` au `kind` de `GeneratedSteps`.
   - Type narrowing : si `kind === 'simplify'`, `expression: string`
     (l'expression à simplifier).
     Champs optionnels : `variable?: string`,
     `enableTrig?: boolean`, etc.

2. Étendre `src/lib/questions/template-schema.ts` :

   - Ajouter le membre `simplify` au discriminator Zod (lax + strict).

3. Étendre `src/lib/questions/generator/correction-generator.ts` :

   - Imports : `generatePedagogicalSimplifySteps`,
     `PedagogicalSimplifyRenderer`, `PedagogicalSimplifyNotImplemented`.
   - Case `'simplify'` dans le switch principal.
   - Pas de bump niveau (4 niveaux supportés).
   - Catch `PedagogicalSimplifyNotImplemented` → fallback silencieux + warn.

4. Tests `correction-generator.test.ts` : +5-7 tests
   (cas distribution, cas identité trig, fallback notImplemented,
   override, multi-niveaux).

5. Étendre `src/lib/questions/__tests__/fixtures/generated-steps-demo.ts`
   avec 2 fixtures simplify :

   - `simplifyDistributionDemo` (`(x+1)(x-1)` collège, attendu `x²-1`)
   - `simplifyTrigDemo` (`sin²(x)+cos²(x)` lycée, attendu `1`)

6. Étendre `__tests__/generated-steps-demo.test.ts` : +2 snapshots.

7. Étendre la page debug
   `src/routes/(protected)/dashboard/admin/debug/correction-mode-b/+page.svelte`
   avec les 2 nouvelles fixtures (13 → 15).

### Svelte autofixer (OBLIGATOIRE pour la page debug)

```
mcp__svelte__svelte-autofixer(code: <contenu>, desired_svelte_version: 5,
                              filename: "+page.svelte")
```

### Code review attendu

`code-reviewer` (Opus) sur la glue Mode B + Svelte.
`security-auditor` (Opus) sur la validation Zod stricte.

### Validation

- Tests correction-generator passent
- Snapshot generated-steps-demo passe
- Page debug visible : `pnpm dev -- --port 5175` puis
  `http://localhost:5175/dashboard/admin/debug/correction-mode-b`.
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

3. **Svelte autofixer** sur `+page.svelte` modifié.

4. **Tests régression complets** sur les suites adjacentes :

   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```

   Aucune régression attendue.

5. **Doc de progression** : créer `docs/wip/simplify-stepper-progress.md`
   sur le modèle de `differentiation-stepper-progress.md`. Inclure :

   - Tableau État global (Phase × Status × Commit × Notes).
   - Décisions architecturales validées (Phase 0), notamment Q1.
   - Justification du choix d'option (A/B/C).
   - Fichiers livrés.
   - Tests cumulés.
   - Code review (post-livraison) avec les éventuels fixes.
   - Limitations connues V1.
   - Pistes d'amélioration (post-V1).
   - Documents de référence.

6. **Mise à jour des docs principales** :

   - `docs/wip/pedagogical-steppers-mvp-progress.md` — ajouter une entrée
     "✅ Stepper pédagogique pour simplification", retirer
     `pedagogical-simplify/` de "Élargissement de couverture
     toujours à faire", mettre à jour discriminator (8 → 9 kinds) et
     fixture count (13 → 15).
   - `docs/wip/correction-integration-progress.md` — extension
     `kind: 'simplify'` dans la section "Extensions post-MVP", passer
     de 6 à 7 nouveaux kinds, mise à jour fixture count, mention
     architecture Option C.

7. **Commit final** : direct (`git commit`) si peu de changements
   conceptuels en Phase 6, ou via `commit-manager` si beaucoup.

   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit
   (cf. CLAUDE.md global utilisateur).

### Validation

- ESLint clean
- check:incremental clean
- Svelte autofixer clean
- 0 régression sur ~12000 tests
- Doc de progression écrite (avec Q1 décision documentée)
- Commit final créé

---

## Anti-patterns à éviter

1. **Ne PAS reproduire le pattern différentiation/intégration aveuglement**.
   Pour `simplify`, l'analyse Phase 0 Q1 montre que Option C (hybride) est
   la voie correcte, PAS Option B (pipeline parallèle clone). Si l'agent
   commence à créer `pedagogical-simplify/rules.ts` qui ré-implémente les
   règles `pythagore`, `factor-out-gcd`, etc. → il fait Option B → STOP +
   demander confirmation à l'utilisateur.

2. **Ne PAS instrumenter `simplify/simplify.ts` directement**.
   L'algorithme reste **strictement intact** (rétrocompatibilité).
   Le module `pedagogical-simplify/` est totalement autonome.

3. **Ne PAS dupliquer les rule sets**. Importer depuis
   `src/lib/mathAST/pattern/rule-sets/` (`absSimplifyRules`,
   `trigSimplifyRules`, `algebraicSimplifyRules`, etc.).

4. **Ne PAS ignorer les phantom phases** (`normalize`, `post-normalize`).
   Le renderer DOIT les filter ou fold (cf. Q5).

5. **Ne PAS utiliser `'cost-fixpoint'`** par défaut. La stratégie
   pédagogique est `'deterministic'` (cf. Q6). Si l'utilisateur veut
   `cost-fixpoint`, c'est un override explicite via options.

6. **Ne PAS émettre des steps vides** (`steps: []`) au top-level. Si
   l'expression est déjà simplifiée (no-op), retourner soit un step
   `already-simplified` soit throw.

7. **Ne PAS silently skip les cas hors scope**. Toujours throw
   `PedagogicalSimplifyNotImplemented` + catch côté correction-generator.

8. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

9. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint` sur tout le projet**. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

10. **Ne PAS prendre de décision architecturale unilatérale**. Q1 doit
    être validée explicitement par l'utilisateur. Si en cours de route
    un trade-off non couvert par Phase 0 émerge, **demander**.

11. **Ne PAS confondre `SimplifyStep` (algorithmique, dans
    `simplify/types.ts`) avec `PedagogicalSimplifyStep` (pédagogique,
    à créer dans `pedagogical-simplify/types.ts`)**. Le pipeline
    pédagogique consomme le premier et produit le second.

12. **Ne PAS oublier de mettre à jour les ~80 entries de descriptions FR**.
    Sans ça, le renderer tombe sur le fallback `Regle : <rule>` et
    le rendu est inutilisable.

---

## Récap effort estimé (si Option C)

| Phase     | Effort estimé                                                       |
| --------- | ------------------------------------------------------------------- |
| 0         | 15-20 min validation Q1-Q10 avec utilisateur (Q1 critique)          |
| 1         | 30 min types + tests isolation                                      |
| 1.5       | 1-1.5h rule priorities + tests                                      |
| 2         | 2-3h pipeline orchestration + sub-step grouping + tests (~50 tests) |
| 3         | 2-2.5h renderer + descriptions FR (80 entries) + tests (~25 tests)  |
| 4         | 1.5-2h démos + script CLI + snapshots (~25 cas)                     |
| 5         | 1-1.5h Mode B + 2 fixtures + page debug                             |
| 6         | 30-45 min quality + doc + commit                                    |
| **Total** | **~9-12h en tunnel continu**                                        |

Cible (Option C) : **~80-100 tests verts spécifiques au feature**,
**~800-1000 LOC**, **6-8 commits intermédiaires**, **0 régression** sur
~12000 tests existants.

Si Option A retenue : ~3-4h total, ~300 LOC, ~40 tests.

Si Option B retenue : ~12-15h total, ~3500 LOC, ~150 tests (mais
fortement déconseillé).

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/simplify-stepper-progress.md` — doc de progression complète,
   incluant **explicitement** la décision Q1 (Option A/B/C) et sa
   justification.
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`.
3. Mise à jour de `docs/wip/correction-integration-progress.md`.

Lister explicitement ces 3 docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
