# Idées Poincaré pour mathAST — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** L'analyse comparative mathAST vs Poincaré
> (`docs/ref/mathAST-vs-poincare.md`) a identifié deux features
> structurelles que Poincaré (Upsilon/NumWorks) propose et que mathAST
> n'a pas :
>
> - **`SymbolicComputation` modes** — 5 modes contrôlant comment les
>   symboles définis sont substitués pendant `reduce`
> - **`ReductionTarget` à 3 niveaux** — `SystemForApproximation` /
>   `SystemForAnalysis` / `User` — séparant les usages du `reduce` selon
>   l'objectif (calcul numérique, classification, affichage)
>
> Ce prompt explore l'opportunité d'introduire ces concepts dans mathAST
> avec **un avertissement préalable critique : sans cas d'usage produit
> concret, ne PAS livrer**.

---

## ⚠️ AVERTISSEMENT CRITIQUE — Ne PAS livrer sans validation utilisateur explicite

Les features de ce prompt sont des **idées d'inspiration architecturale**,
pas des demandes produit. La conclusion de
`docs/ref/mathAST-vs-poincare.md:336` est explicite :

> « **Pas de changement structurant recommandé** dans l'immédiat sans
> validation utilisateur. Les divergences observées (sort, undefined,
> `0^0`) sont des choix actifs ou des conventions concurrentes, pas des
> bugs structurels. »

**Phase 0 doit obligatoirement valider l'utilité produit avant tout
code**. Si l'utilisateur ne peut pas citer **au moins 2-3 cas d'usage
concrets et bloquants** dans les questions UbuMaths, **différer** le
prompt et l'archiver dans `docs/ref/poincare-ideas-deferred.md`.

Ces features ne sont **pas** comme `pedagogical-limits/` ou
`pedagogical-domain/` qui débloquent des Mode B kinds avec valeur
utilisateur immédiate. Ce sont des **changements infrastructurels
profonds** dont le ROI dépend entièrement de la nature des questions
qu'on veut générer.

---

## Lectures préalables OBLIGATOIRES (par ordre)

### 1. Document de référence — analyse comparative

- `docs/ref/mathAST-vs-poincare.md` (~336 lignes) — **À LIRE EN ENTIER**.
  Sections particulièrement importantes :
  - § 2.1 « Binaire vs N-aire » (contraintes structurelles)
  - § 4.1 « Architectures fondamentalement différentes » (méthodes
    virtuelles par type vs pipeline avec NormalForm)
  - § 7 « Points où mathAST pourrait gagner à s'inspirer de Poincaré »
  - § 7.4 « Distribution `(x+1)^2 → x^2+2x+1` selon ReductionTarget » —
    cas concret cité
  - § 8 « Surprises principales » (3 cas où la réalité a divergé)
  - § 10 « Synthèse exécutive » — la conclusion **« pas de changement
    structurant recommandé »**

### 2. Code Poincaré (`extern/Upsilon/poincare/include/poincare/`)

- `expression_node.h:152-175` — les deux enums :

  ```cpp
  enum class ReductionTarget {
    SystemForApproximation = 0,
    /* Minimal reduction: "1-0.3-0.7 --> 0" */
    SystemForAnalysis,
    /* Expansion of Newton multinome to identify polynoms */
    User
    /* Additional: factorizing on common denominator,
     * complex expression to a+ib form, identifying tan in cos/sin polynoms */
  };

  enum class SymbolicComputation {
    ReplaceAllSymbolsWithDefinitionsOrUndefined = 0,
    ReplaceAllDefinedSymbolsWithDefinition = 1,
    ReplaceDefinedFunctionsWithDefinitions = 2,
    ReplaceAllSymbolsWithUndefined = 3,
    DoNotReplaceAnySymbol = 4
  };
  ```

- `expression.h:270-291` — la signature complète :
  ```cpp
  static Expression ParseAndSimplify(
    const char * text,
    Context * context,
    Preferences::ComplexFormat complexFormat,
    Preferences::AngleUnit angleUnit,
    Preferences::UnitFormat unitFormat,
    ExpressionNode::SymbolicComputation symbolicComputation = …,
    ExpressionNode::UnitConversion unitConversion = …
  );
  ```

### 3. État actuel de mathAST côté équivalents

- `src/lib/mathAST/normal/index.ts` (entry `normalize`) — état actuel :
  un seul mode, pas de target.
- `src/lib/mathAST/eval/evaluate.ts` (entry `evaluate`) — option
  `mode: 'exact' | 'approx'` mais pas de `SymbolicComputation`.
- `src/lib/mathAST/eval/substitute.ts` (entry `substitute`) — fait
  toujours du replace-all, pas de granularité.
- `src/lib/mathAST/simplify/simplify.ts` — wrap léger sur `rewrite()`
  avec `SimplifyOptions` (verbosity, enableTrig/Hyperbolic/Algebraic/Abs,
  signal/timeout). Pas de target.

### 4. Si les modes sont validés (Phase 0 OK), modèles d'API à étudier

- `src/lib/mathAST/simplify/types.ts` — pattern de `SimplifyOptions`
  avec flags `enable*`.
- `src/lib/mathAST/eval/types.ts` (s'il existe) ou inline dans
  `evaluate.ts` — pattern d'`EvaluateOptions`.

---

## Phase 0 — Validation produit (BLOQUANTE)

L'agent doit poser ces questions à l'utilisateur et **attendre des
réponses concrètes** avant de tenter quoi que ce soit. **Ne pas écrire
de code en Phase 0**.

### Q-G1 — Cas d'usage produit pour `SymbolicComputation`

**Demande à l'utilisateur** : peut-il citer **au moins 2 cas concrets**
de questions UbuMaths actuelles ou planifiées qui sont bloquées par
l'absence de modes `SymbolicComputation` ?

Exemples théoriques (à valider qu'ils sont nécessaires en pratique) :

1. **Question paramétrique** : « Soit f(x) = ax² + bx + c. Calcule
   f(2). »

   - Mode `DoNotReplaceAnySymbol` : output `4a + 2b + c`
   - Mode `ReplaceAllDefinedSymbolsWithDefinition` : si `a=1, b=2, c=3`
     définis dans le contexte, output `11`
   - **Actuel mathAST** : `substitute()` fait toujours tout, pas de
     bascule.

2. **Solveur paramétrique** : « Pour quelles valeurs de m l'équation
   `mx² + 2x + 1 = 0` a-t-elle deux solutions distinctes ? »

   - Mode `DoNotReplaceAnySymbol` sur `m` : permet de discuter selon `m`
   - **Actuel** : déjà couvert par les options `solveOptions.variable`,
     mais formalisation manquante.

3. **Question conceptuelle** : « Quelle est la dérivée de la fonction
   composée `f(g(x))` ? » (avec `f` et `g` fonctions formelles)
   - Mode `DoNotReplaceAnySymbol` même si `f`/`g` ont des définitions.
   - **Actuel** : pas testé. À tenter empiriquement en Phase 0.

**Critères Q-G1** :

- ✅ ≥ 2 cas concrets citables → continuer Track A
- ❌ Aucun cas concret → archiver Track A, justifier dans le doc final

### Q-G2 — Cas d'usage produit pour `ReductionTarget` / `NormalizeTarget`

**Demande à l'utilisateur** : peut-il citer **au moins 2 cas concrets**
où le comportement actuel de `normalize()` ou `simplify()` est
inadapté ?

Exemples théoriques :

1. **Affichage utilisateur préfère forme factorisée** :

   - `simplify(parse('(x+1)*(x-1)'))` retourne `x² - 1` (développé)
   - L'élève voulait garder `(x+1)(x-1)`
   - Mode `User` (Display) garderait factorisé ; mode `Analysis`
     développerait pour classifier.
   - **Actuel** : déjà partiellement adressé par `pedagogical-simplify`
     (`intent: 'factoriser' | 'developper'`). Question : est-ce
     suffisant ?

2. **Classification polynôme** :

   - `getPolynomialDegree(parse('(x+1)²'))` peut échouer parce que
     l'AST est superscript, pas développé.
   - Mode `Analysis` développerait avant classification.
   - **Actuel** : `solve/classify.ts` fait sa propre normalisation
     locale. Question : faut-il centraliser ?

3. **Approximation rapide** :
   - Pour `evaluate(parse('1 - 0.3 - 0.7'))` retourner `0` exact, on
     veut le mode `Approximation` minimal.
   - **Actuel** : déjà fait par `evaluate({ mode: 'exact' })`. Question :
     y a-t-il une nuance que mode `'exact'` ne capture pas ?

**Critères Q-G2** :

- ✅ ≥ 2 cas concrets bloquants → continuer Track B
- ❌ Cas couverts par `pedagogical-simplify`/`evaluate` actuels →
  archiver Track B

### Q-G3 — Risque de régression sur ~14000 tests existants

Toute modification de `normalize()` ou `evaluate()` ou `substitute()`
risque de casser des centaines de tests. Confirmer avec l'utilisateur
qu'il **accepte** :

- 1-3 jours d'adaptation des tests existants pour Track B (NormalizeTarget)
- 0.5 jour pour Track A (SymbolicComputation, plus localisé sur substitute/evaluate)
- Régressions potentielles dans `pedagogical-*` modules consommateurs

**Critères Q-G3** :

- ✅ Utilisateur accepte les risques → continuer
- ❌ Utilisateur préfère préserver la stabilité → archiver

### Q-G4 — Périmètre V1 minimal (si Q-G1/G2/G3 validés)

Si tous les feux sont verts, **commencer petit** :

- Track A V1 : ajouter param optionnel `symbolicComputation?` à
  `substitute()` UNIQUEMENT (pas `evaluate()` pour limiter le scope).
  Ne pas implémenter les 5 modes Poincaré, juste les 2 utiles à
  UbuMaths : `'replace-all'` (default actuel) et `'preserve'` (équivalent
  `DoNotReplaceAnySymbol`).
- Track B V1 : ajouter param optionnel `target?: 'equivalence' | 'analysis' | 'display'`
  à `normalize()` UNIQUEMENT, avec **default `'equivalence'` =
  comportement actuel**. Adapter le branchement pour les cas où la
  divergence est utile.

**V2** (hors prompt) : étendre aux 5 modes Poincaré, à `evaluate()`,
adapter `pedagogical-simplify` pour exposer le param.

**Reco Phase 0** : si TOUS les feux verts, commencer **Track A
seulement**. Track B est plus risqué (refacto `normalize()` profond)
— le faire en cycle suivant si Track A se passe bien.

### Q-G5 — Format `target` : enum string ou enum class ?

A : Strings discriminés (`'equivalence' | 'analysis' | 'display'`)
B : Const object enum-like (`NormalizeTarget.Equivalence`)
C : Number enum (cohérent Poincaré)

**Reco par défaut** : **A** (strings, cohérent avec le style mathAST
existant : `mode: 'exact' | 'approx'`, `verbosity: 'result' | 'detailed'`,
etc.).

### Q-G6 — Naming `NormalizeTarget` ou `ReductionTarget` ?

A : `NormalizeTarget` (le terme dans le backlog initial, cohérent avec
`normalize()`)
B : `ReductionTarget` (terme Poincaré, cohérent si on étend à
`simplify()` aussi)

**Reco par défaut** : **A** `NormalizeTarget`. mathAST utilise déjà
`normalize()` comme nom canonique de l'opération ; coller au verbe.

---

## ⚠️ Si Phase 0 ne valide PAS les features

L'agent doit :

1. Créer `docs/ref/poincare-ideas-deferred.md` synthétisant :
   - Les questions Q-G1 à Q-G6 posées
   - Les réponses utilisateur (« pas de cas concrets immédiats »)
   - Les conditions de réactivation : « si X questions paramétriques
     deviennent prioritaires, ou si Y bug normalize-related se manifeste,
     reprendre depuis ce prompt »
2. Mettre à jour `docs/wip/pedagogical-steppers-mvp-progress.md` —
   section « Idées Poincaré » : marquer les 2 items comme **différés**
   avec lien vers `poincare-ideas-deferred.md`.
3. Commit doc-only : `docs(wip): defer Poincaré ideas — no immediate
product use case (Phase 0 outcome)`.
4. **STOP**. Ne pas écrire de code.

---

## ⚠️ Si Phase 0 valide → suivre Track A et/ou Track B selon Q-G4

---

# Track A — `SymbolicComputation` modes (V1 minimal)

**Bloqué par Q-G1 + Q-G3 + Q-G4 (V1 = juste `substitute()`)**.

## Phase 1A — Types et signature

### Sous-tâches

1. Étendre `src/lib/mathAST/eval/substitute.ts` :

   ```ts
   export type SymbolicComputationMode = 'replace-all' | 'preserve';
   //                                     ^ default     ^ équivalent
   //                                       (= comporte-   DoNotReplaceAnySymbol
   //                                       ment actuel)   en Poincaré

   export interface SubstituteOptions {
   	// ... champs existants
   	readonly symbolicComputation?: SymbolicComputationMode; // default 'replace-all'
   }
   ```

2. Adapter le code de `substitute()` :

   - Si `symbolicComputation === 'preserve'` → ne PAS substituer les
     symboles (no-op sur les nœuds variable/symbol qui matchent les
     bindings).
   - Default `'replace-all'` → comportement actuel inchangé.

3. **Si Q-G1 a cité un cas `evaluate()`** : étendre aussi
   `EvaluateOptions` avec `symbolicComputation?` propagé jusqu'à
   `substitute()` interne.

### Tests

`__tests__/substitute-symbolic-computation.test.ts` (~10 tests) :

- `substitute(parse('a + b'), { a: parse('1'), b: parse('2') })` default
  → `1 + 2`
- Avec `symbolicComputation: 'preserve'` → `a + b` (pas de remplacement)
- Avec `symbolicComputation: 'preserve'` MAIS bindings ciblés (`a` only,
  `b` non) → décision : `'preserve'` est binaire ou par-clé ?
  **Reco par défaut** : binaire global (cohérent avec Poincaré
  `DoNotReplaceAnySymbol`).
- Cas mixte : `f(x) + a` avec `a` défini, `f` non → `'preserve'`
  préserve les deux.
- Régression sur les ~30 tests `substitute.test.ts` existants : 0
  régression (default behavior unchanged).

### Code review

`code-reviewer` (Opus).

### Critères d'acceptation Track A V1

- 0 régression sur ~14000 tests mathAST
- 10 nouveaux tests verts
- Param `symbolicComputation?` documenté dans JSDoc avec exemple

### Effort estimé Track A V1

~3-4h (relativement local : 1 fonction + tests + un peu de doc).

---

# Track B — `NormalizeTarget` à 3 niveaux (V1 minimal)

**Bloqué par Q-G2 + Q-G3 + Q-G4. Plus risqué que Track A.**

## Phase 1B — Types et signature

### Sous-tâches

1. Étendre `src/lib/mathAST/normal/types.ts` :

   ```ts
   /**
    * Target use case for `normalize()`. Drives which transformations
    * are applied (cf. ReductionTarget in Poincaré expression_node.h:152).
    *
    * - 'equivalence' (default) — current behavior. Goal: detect if two
    *   expressions are mathematically equal. Aggressive normalization.
    * - 'analysis' — for classifiers (degree, type). Expands powers of
    *   sums to identify polynomials.
    * - 'display' — for user-facing rendering. Less aggressive: keeps
    *   factored forms when possible.
    */
   export type NormalizeTarget = 'equivalence' | 'analysis' | 'display';

   export interface NormalizeOptions {
   	// ... champs existants
   	readonly target?: NormalizeTarget; // default 'equivalence'
   }
   ```

2. Adapter `normalize()` pour brancher selon `target` :

   - `'equivalence'` → comportement actuel (no-op du point de vue API).
   - `'analysis'` → ajouter une post-passe d'expansion polynomiale
     systématique (via `algebraicExpandingRules` du module `pattern/`).
   - `'display'` → désactiver certaines passes (ex: ne pas développer
     les puissances de sommes si déjà factorisées).

3. **Risque architectural** : `normalize()` produit la `NormalForm`
   (`src/lib/mathAST/normal/types.ts`). Modifier le résultat selon
   `target` peut casser la sémantique de la `NormalForm` (qui suppose
   une forme canonique stable). **Avant d'écrire du code, vérifier
   empiriquement** que les targets `'analysis'` et `'display'` peuvent
   être ajoutés via `denormalize()` post-traitement (pas dans la
   `NormalForm` elle-même).

### Tests

`__tests__/normalize-target.test.ts` (~15 tests) :

- `normalize(parse('(x+1)²'), { target: 'equivalence' })` → comportement
  actuel inchangé
- `normalize(parse('(x+1)²'), { target: 'analysis' })` → développé en
  `x² + 2x + 1`
- `normalize(parse('x² + 2x + 1'), { target: 'display' })` → factorisé
  en `(x+1)²` (si possible — sinon `'display'` est no-op fallback)
- `normalize(parse('1 - 0.3 - 0.7'), { target: 'equivalence' })` → `0`
- `normalize(parse('1 - 0.3 - 0.7'), { target: 'analysis' })` → `0`
- Régression : tous les tests `normalize.test.ts` existants verts (cas
  default = 'equivalence' inchangé).

### Code review

`code-reviewer` (Opus). **Cette review est critique** vu le risque de
régression.

### Critères d'acceptation Track B V1

- 0 régression sur ~14000 tests mathAST
- 15 nouveaux tests verts
- Param `target?` documenté avec un exemple concret par mode

### Effort estimé Track B V1

~8-12h (significatif : adaptation de `normalize()` + post-passes +
tests régression à valider).

---

## Phase finale (commune)

### Sous-tâches (si au moins un track livré)

1. **ESLint** sur tous les fichiers créés/modifiés.
2. **TypeScript + Svelte** : `pnpm check:incremental`.
3. **Tests régression complets** :
   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```
4. **Doc de progression** : créer `docs/wip/poincare-ideas-progress.md`
   listant les tracks livrés, hashes des commits, total tests.
5. **Documenter dans le doc de référence** : ajouter une section dans
   `docs/ref/mathAST-vs-poincare.md` qui marque les divergences
   adressées (« cf. Track A livré 2026-XX-XX »).
6. **Commits indépendants** : 1 commit par track minimum.
   **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit.

### Validation finale

- ESLint clean
- check:incremental clean
- 0 régression
- Doc de progression écrite
- Doc de référence mis à jour
- Commits créés

---

## Anti-patterns à éviter

1. **Ne PAS livrer si Q-G1/Q-G2 ne valident pas l'utilité produit**.
   Ces features sont théoriques ; sans cas d'usage concret, elles
   ajoutent de la complexité sans bénéfice. Archiver dans
   `poincare-ideas-deferred.md` est un livrable légitime.

2. **Ne PAS implémenter les 5 modes `SymbolicComputation` Poincaré**.
   V1 = 2 modes minimum (`'replace-all'` + `'preserve'`). Les 3 autres
   (`ReplaceAllSymbolsWithDefinitionsOrUndefined`,
   `ReplaceDefinedFunctionsWithDefinitions`,
   `ReplaceAllSymbolsWithUndefined`) ont des cas d'usage Poincaré
   spécifiques (UnitConvert, etc.) qui n'ont pas d'équivalent UbuMaths.

3. **Ne PAS faire Track B avant Track A**. Track B (NormalizeTarget) est
   significativement plus risqué (refacto `normalize()` profond) que
   Track A (paramètre additionnel sur `substitute()`). Faire A en
   premier valide l'approche puis évaluer B.

4. **Ne PAS modifier la signature de `normalize()` ou `evaluate()`
   en breaking change**. Tout nouveau param doit être **optionnel avec
   default = comportement actuel**. Sinon casse les ~14000 tests
   existants.

5. **Ne PAS confondre `pedagogical-simplify` `intent` avec
   `NormalizeTarget`**. `intent: 'factoriser' | 'developper' | 'reduire'`
   pilote le rule set du pipeline pédagogique. `NormalizeTarget` pilote
   l'algo de normalisation sous-jacente. Ils peuvent coexister.

6. **Ne PAS toucher la `NormalForm` interne sans étude empirique
   préalable**. Les modes `'analysis'` / `'display'` doivent être
   implémentés en post-traitement de `denormalize()`, pas en mutant la
   structure canonique de `NormalForm`.

7. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

8. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
   `pnpm lint`** sur tout le projet. Toujours `pnpm check:incremental`
   et `npx eslint <fichiers>` ciblés.

9. **Ne PAS prendre de décision architecturale unilatérale**. Q-G1 à
   Q-G6 doivent être validées explicitement par l'utilisateur. Si
   trade-off non couvert émerge, **demander**.

10. **Ne PAS rédiger Track B comme si c'était trivial**. C'est un
    refacto de fond ; soyez prudent avec les mises à jour de tests
    cumulés. Si > 50 tests doivent être ajustés pour le défaut
    `'equivalence'`, **stopper et demander**.

---

## Récap effort estimé

### Phase 0 seule (si features non validées)

| Tâche                                   | Effort      |
| --------------------------------------- | ----------- |
| Q-G1 à Q-G6 validation avec utilisateur | 30 min-1h   |
| Rédaction `poincare-ideas-deferred.md`  | 30 min      |
| Commit doc + mise à jour MVP doc        | 15 min      |
| **Total Phase 0 différée**              | **~1.5-2h** |

### Track A V1 seul (si Q-G1 validé)

| Tâche                                              | Effort    |
| -------------------------------------------------- | --------- |
| Phase 0 validation                                 | 30 min-1h |
| Phase 1A types + adaptation `substitute()` + tests | 2-3h      |
| Code review + fixes                                | 30 min    |
| **Total Track A V1**                               | **~3-4h** |

### Track A + B V1 (si Q-G1 et Q-G2 validés)

| Tâche                           | Effort      |
| ------------------------------- | ----------- |
| Phase 0 validation              | 1h          |
| Track A V1                      | 3-4h        |
| Track B V1                      | 8-12h       |
| Phase finale (régression + doc) | 1-2h        |
| **Total cumul**                 | **~13-19h** |

Cible Track A V1 : ~10 tests, ~50 LOC, 1 commit.
Cible Track B V1 : ~15 tests, ~150 LOC, 1-2 commits.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

**Si Phase 0 non validée** :

1. `docs/ref/poincare-ideas-deferred.md` (synthèse + conditions de réactivation)
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`
   (section « Idées Poincaré » → « différé, voir `poincare-ideas-deferred.md` »)

**Si Phase 0 validée et Track A et/ou B livré** :

1. `docs/wip/poincare-ideas-progress.md` — doc de progression
2. Mise à jour de `docs/wip/pedagogical-steppers-mvp-progress.md`
3. Mise à jour de `docs/ref/mathAST-vs-poincare.md` (sections § 7.4 et
   § 9 selon ce qui a été adressé)

Lister explicitement les docs produits à la toute fin de la
conversation (cf. CLAUDE.md section Planning & Execution Policy).
