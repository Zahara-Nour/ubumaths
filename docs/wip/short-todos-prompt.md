# TODOs courts post-prompts pédagogiques — Prompt source

> **Session indépendante.** Ce prompt est auto-suffisant : tout ce qu'il
> faut est listé ci-dessous. L'agent ne doit PAS supposer du contexte
> conversationnel.
>
> **Contexte high-level :** UbuMaths a livré 10 modules pédagogiques de
> step-by-step + Mode B avec 12 kinds. Plusieurs **TODOs courts** se
> sont accumulés dans les progress docs des prompts précédents (post-
> arithmétique, post-radicaux, post-scientifique). Ce prompt regroupe
> 6 tracks **indépendants et cherry-pickables**, chacun ~1-4h.
> L'agent peut tous les faire ou en sélectionner.

---

## Vue d'ensemble des 6 tracks

| Track | Sujet                                                                  | Effort réaliste | Source TODO                                                                     |
| ----- | ---------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| **A** | `expressionName` dans `InstanceBlank`                                  | 3-4h            | `pedagogical-arithmetic-progress.md` TODO #1                                    |
| **B** | Variantes fractions early-college (multiplication directe)             | 3-5h            | `pedagogical-arithmetic-progress.md` TODO #3                                    |
| **C** | `rationalize-denominator` + `simplify-square-root-of-square`           | 3-4h            | `pedagogical-arithmetic-progress.md` TODO #4 + `radicals.ts:11-15`              |
| **D** | Decimal mantissas dans `multiplyScientific` / `addScientificSamePower` | 3-4h            | `pedagogical-arithmetic-progress.md` TODO #5 + `scientific-notation.ts:207`     |
| **E** | Cohérence `signs: 'strict'` (`5 + (-3) → 5 - 3`)                       | 1h              | `pedagogical-arithmetic-progress.md` TODO #6 (la moitié du câblage existe déjà) |
| **F** | Format `--both` dans snapshots démo (custom + LaTeX côte à côte)       | 1-1.5h          | `pedagogical-arithmetic-progress.md` TODO post-Phase 11                         |

**Tracks pas tous indépendants — couplages connus** :

- **A et B touchent tous deux `target-extractor.ts`** → ne PAS faire en
  parallèle, séquentiel obligatoire.
- **F doit être fait APRÈS E** → les snapshots `--both` doivent refléter
  le pipeline final, sinon il faudra les régénérer après E.
- **C-2 introduit une précondition « radicand non carré parfait »** sur
  `rationalize-denominator` qui dépend du helper d'analyse `extractSquareFactor`
  déjà présent dans `radicals.ts` (vérifier réutilisabilité avant de réimplémenter).

**Effort total si tous les tracks** : ~14-19h.
**Cible cumulée** : ~80-100 tests, ~600-800 LOC.

---

## Lectures préalables OBLIGATOIRES (communes)

L'agent DOIT lire ces fichiers avant de commencer n'importe quel track :

- `docs/wip/pedagogical-arithmetic-progress.md` — section finale
  « TODO post-prompt à reprendre dans des sessions ultérieures » qui
  liste les 6 items couverts par ce prompt.
- `src/lib/mathAST/pedagogical-arithmetic/` — module cible majeur
  (Tracks B, C, D, E, F). Lire `pipeline.ts`, `types.ts`,
  `pedagogical-rules/index.ts`.
- `docs/wip/arithmetic-from-blank-progress.md` — Track A est
  **complémentaire** (et non remplacé) par le travail livré récemment :
  `arithmetic-from-blank` a contourné via `instance.expressions[].value`,
  mais le TODO `expressionName` reste valide pour `target-extractor.ts`.

---

# Track A — `expressionName` dans `InstanceBlank`

## Phase 0A — Spécification

### Contexte

Actuellement `extractPedagogicalTarget(instance, blank?, expressionName?)`
prend 3 args. Le 3e arg est utilisé quand l'expression target dépend
d'un answerFormat nommé (`<<expr:NAME>>` dans le statement). Mais ce
3e arg est **redondant** : si `InstanceBlank.expressionName` était peuplé
par `assign-blank-indices.ts` au moment où il rencontre le marker
`<<expr:NAME>>`, le caller pourrait juste passer `blank` et tout déduire.

**État actuel** :

- `assign-blank-indices.ts` détecte les markers `<<expr:NAME>>` via
  `EXPR_MARKER_REGEX` et réserve les indices pour les `?` dans
  `answerFormats[NAME]`.
- Mais le NAME extrait est utilisé pour modifier `answerFormats`
  uniquement — **pas propagé** sur les `InstanceBlank` correspondants.

**Trois patterns d'usage distincts du caller** (à préserver tous les trois) :

1. `extractPedagogicalTarget(instance)` — pas de blank (correction globale).
2. `extractPedagogicalTarget(instance, blank)` — déduit `answerFormat`
   depuis `blank.expressionName` (CŒUR DE TRACK A — actuellement non-fonctionnel).
3. `extractPedagogicalTarget(instance, undefined, 'expression1')` — extrait
   `answerFormat` sans blank du tout. Utilisé par `target-extractor.test.ts:280`
   et potentiellement par d'autres callers hors-blank. **NE PAS déprécier**.

### Sous-tâches

1. Étendre `src/lib/questions/types.ts` :

   ```ts
   export interface InstanceBlank {
   	// ... champs existants
   	/**
   	 * Name extracted from <<expr:NAME>> marker preceding this blank in
   	 * the statement (math zone). Allows pedagogical pipelines to look
   	 * up the answerFormat string by name.
   	 */
   	readonly expressionName?: string;
   }
   ```

2. Modifier `src/lib/questions/generator/assign-blank-indices.ts` :

   - Quand on rencontre `<<expr:NAME>>` et qu'on réserve des indices, retourner aussi un mapping `blankIndex → NAME` dans le résultat (`AssignBlankIndicesResult`).
   - Étendre `AssignBlankIndicesResult` avec `expressionNameByIndex?: Record<number, string>`.

3. Modifier `src/lib/questions/generator/instance-generator.ts`
   (qui consomme `assignBlankIndices`) : propager `expressionName` sur
   chaque `InstanceBlank` correspondant.

4. Modifier `src/lib/mathAST/pedagogical-arithmetic/target-extractor.ts` :
   - Quand le 3e arg `expressionName?` est absent ET qu'un `blank` est fourni,
     auto-déduire depuis `blank.expressionName`.
   - Quand le 3e arg est fourni, **il prime** sur `blank.expressionName`
     (caller explicite gagne — utile pour le pattern 3 et pour les overrides).
   - **NE PAS** marquer `@deprecated` : le pattern 3 (caller sans blank) reste
     un usage valide et n'a pas d'alternative équivalente.

### Tests

`__tests__/expression-name-propagation.test.ts` (~8 tests) :

- `<<expr:expression1>>2+3` puis `?` → `blank.expressionName === 'expression1'`
- `<<expr:expression1>>2+?+?` (2 blanks dans le marker) → les 2 blanks ont `'expression1'`
- Sans marker → `expressionName` undefined
- Marker invalide (regex ne match pas) → undefined
- Multi-zones math : un marker par zone, pas de cross-pollution
- `extractPedagogicalTarget(instance, blank)` (sans 3e arg) déduit `expressionName` depuis `blank.expressionName`
- `extractPedagogicalTarget(instance, blank, 'override')` : override gagne sur `blank.expressionName`
- 0 régression sur les ~30 tests `target-extractor.test.ts` existants

### Code review attendu

`code-reviewer` (Opus) sur le diff cumulé.

### Critères d'acceptation Track A

- 0 régression sur ~600 tests `pnpm test:server src/lib/questions/`
- 8 nouveaux tests verts
- `target-extractor.ts` accepte `(instance, blank)` 2-arg sans casser
  les callers explicites 3-arg (pattern 3 préservé, pas de deprecation)
- Doc `pedagogical-arithmetic-progress.md` : marquer TODO #1 comme livré

### Effort estimé Track A

~3-4h (estimation revue à la hausse : la surface de callers est plus
large que prévu — tests `target-extractor.test.ts` à passer en revue
pour identifier les usages pattern 3 et s'assurer qu'ils restent verts).

---

# Track B — Variantes fractions early-college (multiplication directe)

## Phase 0B — Spécification

### Contexte

Actuellement `pedagogical-arithmetic/pedagogical-rules/fractions.ts`
implémente `toCommonDenominator` via PGCD/LCM (lycée-friendly) :

```
1/3 + 1/6 → 2/6 + 1/6 = 3/6 = 1/2  // LCM(3,6) = 6, PGCD réduction
```

En **early-collège** (5e/4e, avant introduction du PGCD), on enseigne
la **multiplication directe des dénominateurs** :

```
1/3 + 1/6 → 6/18 + 3/18 = 9/18 = 1/2  // produit direct + reduce final
```

C'est plus long mais ne demande pas de connaître le PGCD/LCM.

**Décision arbitrée B-1** — sub-niveau college via **option orthogonale**
(`collegeSubLevel?: 'early' | 'late'`), **PAS** d'extension du type
`SchoolLevel`. Raison : `SchoolLevel` est consommé par tous les
renderers/descriptions/démos ; l'étendre pour un cas isolé (variantes
fractions) propagerait des changements dans tout le module mathAST. L'option
orthogonale isole le changement à `pedagogical-arithmetic`.

### Sous-tâches

1. Créer `pedagogical-arithmetic/pedagogical-rules/fractions-early.ts`
   (~150 LOC) :

   - `toCommonDenominatorMultiply` : produit `(a·d)/(b·d) + (c·b)/(b·d)`
     au lieu de LCM.
   - `applicableLevels: ['primaire', 'college']` (lycée/sup utilisent
     l'approche LCM standard).
   - Préconditions identiques à `toCommonDenominator` (deux fractions
     additionnées) mais discriminé par `collegeSubLevel`.
   - Priority `130` pour fire AVANT `toCommonDenominator` quand les deux
     sont éligibles, mais **la discrimination réelle est dans le loader**
     (cf. sous-tâche 2) — la priority sert juste de fallback déterministe.

2. **Modifier `toCommonDenominator` existant** (`fractions.ts:153`) :

   - Retirer `'primaire'` de `applicableLevels` →
     `['college', 'lycee', 'superieur']`.
   - Justification : en primaire on enseigne EXCLUSIVEMENT la
     multiplication directe (PGCD/LCM hors-programme).
   - **Vérifier** qu'aucun test existant ne s'attend à voir
     `toCommonDenominator` fire en primaire. Si oui, migrer vers la
     nouvelle rule (NE PAS silencieusement bénéficier d'un échec test).

3. Étendre `pedagogical-rules/index.ts` (`loadPedagogicalRules`) :

   - Ajouter param `collegeSubLevel?: 'early' | 'late'` (default `'late'`
     pour compat — comportement actuel inchangé sans l'option).
   - Logique de filtrage :
     - `schoolLevel === 'primaire'` → injecter
       `toCommonDenominatorMultiply` (toCommonDenominator a déjà été
       retiré de `applicableLevels` primaire).
     - `schoolLevel === 'college'` ET `collegeSubLevel === 'early'` →
       remplacer `toCommonDenominator` par `toCommonDenominatorMultiply`
       (filtre out + inject).
     - `schoolLevel === 'college'` ET `collegeSubLevel === 'late'`
       (default) → comportement actuel (`toCommonDenominator` LCM).
     - `schoolLevel === 'lycee' | 'superieur'` → comportement actuel.

4. Étendre `PedagogicalArithmeticOptions` dans `types.ts` avec
   `collegeSubLevel?: 'early' | 'late'`. **PAS** dans `SchoolLevel`.

5. Documentation : exemple côte-à-côte dans le doc
   `pedagogical-arithmetic-progress.md`.

### Tests

`__tests__/fractions-early.test.ts` (~12 tests) :

- `1/3 + 1/6` early-college → `6/18 + 3/18 = 9/18` (pas de LCM)
- Reduction finale : `9/18 → 1/2` via `reduceFraction` du pipeline existant
- `1/4 + 1/6` early-college → `6/24 + 4/24 = 10/24 → 5/12` (idem, reduce post-add)
- `1/3 + 1/6` late-college (default) → `2/6 + 1/6 = 3/6 → 1/2` (LCM existant)
- `1/3 + 1/6` primaire → multiplication directe (auto, sans option `collegeSubLevel`)
- `(a/b) + (c/d)` avec b,d coprimes : multiply == LCM résultat numérique
  identique, mais le **chemin de step** diffère (descriptions différentes)
- Vérifier qu'`applicableLevels` modifié n'introduit **aucune régression**
  dans `fractions.test.ts` existant : si un test attendait `toCommonDenominator`
  en primaire, le migrer vers `toCommonDenominatorMultiply` (modification
  intentionnelle, pas silencieuse).
- 0 régression sur les ~30 tests `fractions.test.ts` existants APRÈS
  migration éventuelle des tests primaire.

### Code review attendu

`code-reviewer` (Opus).

### Critères d'acceptation Track B

- 0 régression sur ~250 tests `pedagogical-arithmetic/`
- 12 nouveaux tests verts
- `1/3 + 1/6` produit deux outputs distincts selon `collegeSubLevel`

### Effort estimé Track B

~3-5h. Estimation revue à la hausse : la modification d'`applicableLevels`
de `toCommonDenominator` peut générer des régressions dans les tests
existants à migrer (un par un, sans bypass silencieux).

---

# Track C — `rationalize-denominator` + `simplify-square-root-of-square`

## Phase 0C — Spécification

### Contexte

Le module `pedagogical-arithmetic/pedagogical-rules/radicals.ts` (Phase 5
livrée) couvre :

- `extractPerfectSquare` : `√8 → 2√2`
- `multiplyRadicals` : `√2 × √3 → √6` (avec post-extraction si carré parfait)

Hors scope Phase 5 (cf. `radicals.ts:11-15`) :

- `rationalize-denominator` : `1/√2 → √2/2`, `1/√3 → √3/3`
- `simplify-square-root-of-square` : `√(a²) → |a|`

Track C livre ces 2 rules.

**Décisions arbitrées** :

- **C-1** : `simplify-square-root-of-square` est **opt-in** (désactivée
  par défaut, même au lycée+). Activable via flag explicite
  `enableSquareRootOfSquare?: boolean` dans `PedagogicalArithmeticOptions`,
  ou via un futur `ConstraintOption` dédié. Raison : sans connaissance du
  signe de `x`, produire `|x|` peut surprendre l'élève dans les cas où le
  contexte de la question implique `x ≥ 0` (longueurs, modules, normes).
  L'auteur d'une démonstration formelle qui veut le `|x|` l'active
  explicitement.
- **C-2** : précondition explicite « radicand n'est pas un carré parfait »
  sur `rationalize-denominator` (plutôt que jeu de priorités contre
  `extractPerfectSquare`). Plus lisible et documente le cas d'usage.

### Sous-tâches

1. **`rationalize-denominator`** (priority 105, college+) dans
   `radicals.ts` :

   - Pattern : `divide(numerator, sqrt(n))` avec n entier positif **et
     n n'est pas un carré parfait** (précondition C-2 — réutiliser
     l'helper d'analyse de `extractPerfectSquare` : si `extractSquareFactor(n)`
     retourne un facteur `≥ 2`, alors n N'EST PAS un carré parfait
     pur ; si n est un carré parfait pur (`4`, `9`, `16`, …) la rule
     fizzle et `extractPerfectSquare` traitera).
   - Replacement : `divide(multiply(numerator, sqrt(n)), n)` :
     `1/√2 → (1·√2)/2 = √2/2`
   - Cas plus général : `c/√n → c·√n/n` (multiplie haut + bas par √n)
   - Si `numerator === 1` simplifier la multiplication (skip `1·`).

2. **`simplify-square-root-of-square`** (priority 90, lycée+, **opt-in
   via flag** — décision C-1) dans `radicals.ts` :

   - Pattern : `sqrt(superscript(x, 2))` ou `sqrt(multiply(x, x))`.
   - Replacement : `abs(x)` (utilise `function('abs', [x])` du factory).
   - Pas de special case « x connu ≥ 0 » en V1 : si l'auteur active la
     rule, il accepte le `|x|` strict. Le fine-tuning « x connu positif →
     pas d'abs » est out-of-scope (V2).
   - Le flag d'activation est passé par
     `PedagogicalArithmeticOptions.enableSquareRootOfSquare?: boolean`
     (default `false`). `loadPedagogicalRules` lit ce flag et n'inclut
     la rule QUE quand il vaut `true`.

3. Étendre `pedagogical-rules/index.ts` pour inclure les 2 nouvelles rules.

4. Étendre la liste `ALL_RULES_BY_NAME` exportée pour la lookup renderer.

5. Étendre `descriptions-fr.ts` (lycée + sup TITLES + EXPLANATIONS) :

   - `rationalize-denominator` lycée : « On multiplie haut et bas par √n
     pour rationaliser le dénominateur »
   - `simplify-square-root-of-square` lycée : « √(a²) = |a| par définition
     de la racine carrée d'un carré »

6. Démos catégorisées : ajouter les nouveaux cas dans `demo-cases/radicaux.ts`
   (existant) :
   - `1/√2`, `3/√5`, `(1+√2)/√3`
   - `√(x²)`, `√((x-1)²)`

### Tests

`__tests__/rationalize-denominator.test.ts` (~10 tests) :

- `1/√2 → √2/2`
- `3/√5 → 3√5/5`
- `(1+√2)/√3 → ((1+√2)·√3)/3` (V1 : pas de distribution)
- Pas de fire si denominator est déjà rationnel (`1/2` reste)
- Pas de fire si denominator est carré parfait (`1/√4` ne fire **PAS**
  côté rationalize — précondition C-2 — `extractPerfectSquare` traite
  `√4 → 2` qui produit `1/2` au pipeline suivant). Vérifier dans le test
  l'enchaînement complet : input `1/√4` → output final `1/2`.
- Pas de fire si numerator contient `√n` même radicand (cas pathologique, V2)

`__tests__/simplify-square-root-of-square.test.ts` (~8 tests) :

- Tests exécutés avec `enableSquareRootOfSquare: true` (sinon la rule
  ne charge même pas). Un test dédié vérifie le **default opt-in** :
  sans le flag, `√(x²)` reste `√(x²)` (pas de fire).
- `√(x²) → |x|` (avec flag)
- `√((x-1)²) → |x-1|` (avec flag)
- `√(4²) = √16 → 4` : sans flag, `extractPerfectSquare` fire seul ;
  avec flag, vérifier que `extractPerfectSquare` (priority 100) gagne
  toujours sur `simplify-square-root-of-square` (priority 90) pour les
  carrés numériques — pas de chevauchement comportemental.
- `√(0²) → 0` (cas dégénéré, avec flag)
- Pas de fire si exposant ≠ 2

### Code review attendu

`code-reviewer` (Opus) sur le diff cumulé Track C.

### Critères d'acceptation Track C

- 0 régression sur ~250 tests `pedagogical-arithmetic/` + ~16 tests
  `radicals.test.ts` existants
- 18 nouveaux tests verts
- 5 nouveaux cas démo dans `demo-cases/radicaux.ts`

### Effort estimé Track C

~3-4h.

---

# Track D — Decimal mantissas dans scientific-notation

## Phase 0D — Spécification

### Contexte

Actuellement `pedagogical-arithmetic/pedagogical-rules/scientific-notation.ts:207`
contient le commentaire :

```ts
// For now : only integer mantissas (no decimal point). Avoid float drift.
```

Donc :

- `(3 × 10⁴) × (2 × 10⁻²) → 6 × 10²` ✅
- `(2.5 × 10⁴) × (3 × 10⁻²) → ???` ❌ (skip)
- `2.5 × 10⁵ + 3.7 × 10⁵ → ???` ❌ (skip)

Track D étend `multiplyScientific` et `addScientificSamePower` pour gérer
les mantissas décimales **sans float drift** (string-level ou rationals).

### Stratégie technique — UNE SEULE représentation

Représenter chaque mantissa décimale par
**`{ digits: bigint, decimalPos: number }`** où `decimalPos` est le
nombre de chiffres après le point. Exemples :

- `'2.5'` → `{ digits: 25n, decimalPos: 1 }` (i.e. valeur réelle = 25/10ⁱ
  avec i=1)
- `'3.14'` → `{ digits: 314n, decimalPos: 2 }`
- `'5'` → `{ digits: 5n, decimalPos: 0 }`
- `'0.001'` → `{ digits: 1n, decimalPos: 3 }`

Le sign est porté séparément (cohérent avec `aSign: 1 | -1` actuel).

**Justification** : une seule représentation évite la confusion entre
`{ integerDigits, fractionalDigits }` (mauvais : ne se compose pas
trivialement) et `digits + decimalPos` (bon : multiplication = bigint
multiply + addition de decimalPos ; addition = padding pour aligner les
decimalPos, puis bigint sum). C'est aussi cohérent avec le post-format
existant ligne 216-224 du code actuel.

L'**Option B (rationals)** est rejetée : reformat en string décimal exact
demande de toute façon de gérer la « profondeur décimale » du résultat,
ce qui ramène à la même structure.

### Sous-tâches

1. Helper `parseMantissa(literal: string): { digits: bigint, decimalPos: number }`

   - `'2.5'` → `{ digits: 25n, decimalPos: 1 }`
   - `'5'` → `{ digits: 5n, decimalPos: 0 }`
   - Lance ou retourne `null` si le literal est mal formé.

2. Helper `formatMantissa({ digits, decimalPos }): string`

   - `{ digits: 25n, decimalPos: 1 }` → `'2.5'`
   - `{ digits: 125n, decimalPos: 2 }` → `'1.25'`
   - `{ digits: 5n, decimalPos: 0 }` → `'5'`
   - Strip les zéros trailing après le point.

3. Helper `multiplyMantissas(a, b)` :

   - `{ digits: a.digits * b.digits, decimalPos: a.decimalPos + b.decimalPos }`
   - Trivial sur bigint, zéro float drift.

4. Helper `addMantissas(a, b)` (même puissance de 10 — précondition appelant) :

   - Aligner `decimalPos` : `targetPos = max(a.decimalPos, b.decimalPos)`,
     scaler la mantissa à plus petit `decimalPos` par `* 10^(diff)`.
   - Result : `{ digits: aScaled + bScaled, decimalPos: targetPos }`.

5. Renormalisation post-multiply (utilitaire `normalizeScientific`) :

   - Tant que `|formatMantissa(m)|` exprimé numériquement `>= 10` →
     incrémenter exponent + diviser digits par 10 (bigint, exact si
     décomposable, sinon shift via decimalPos).
   - Tant que `|formatMantissa(m)| < 1` → décrémenter exponent + multiplier
     digits par 10 (équivalent : décrémenter `decimalPos`).
   - **Cas underflow profond** (ex: `0.001 × 10⁰` → `1 × 10⁻³`) : la
     normalisation peut nécessiter plusieurs passes ; pas de borne « one
     pass » contrairement au code integer actuel.

6. Étendre `multiplyScientific` :

   - Retirer la garde ligne 208 (`includes('.')`).
   - Parser les deux mantissas via `parseMantissa`, multiplier via
     `multiplyMantissas`, renormaliser, `formatMantissa` final.

7. Étendre `addScientificSamePower` :

   - Retirer la garde ligne 264.
   - Parser, addMantissas, normaliser, format.

8. Mettre à jour le commentaire ligne 207 et la JSDoc en haut du fichier.

### Tests

`__tests__/scientific-notation-decimal.test.ts` (~12 tests) :

- `(2.5 × 10⁴) × (3 × 10⁻²) → 7.5 × 10²`
- `(2.5 × 10⁴) × (4 × 10⁻²) → 1 × 10³` (renormalize : 10 → 10×10⁰ → 1×10¹)
- `(0.5 × 10²) × (5 × 10⁻³) → 2.5 × 10⁻¹` (renormalize down)
- `2.5 × 10⁵ + 3.7 × 10⁵ → 6.2 × 10⁵`
- `5.5 × 10² + 4.5 × 10² → 1 × 10³` (renormalize : 10 → 1×10¹)
- `(0.25 × 10⁰) × (4 × 10⁰) → 1 × 10⁰`
- **Underflow profond** : `(0.001 × 10⁰) × (1 × 10⁰) → 1 × 10⁻³` (3 passes
  de renormalisation down, pas une seule)
- Pas de float drift : `(0.1 × 10¹) × (0.1 × 10¹) → 1 × 10⁻¹` (ne pas produire `0.10000000000000002` ou similaire)
- Régression : `(3 × 10⁴) × (2 × 10⁻²) → 6 × 10²` (cas integer existant inchangé)

### Code review attendu

`code-reviewer` (Opus). Particulièrement attentif au float drift et à
la renormalisation.

### Critères d'acceptation Track D

- 0 régression sur ~21 tests `powers-and-scientific.test.ts` existants
- 12 nouveaux tests verts
- Aucun usage de `parseFloat` / `Number()` / `*` / `+` sur des floats
  (string-level ou bigint uniquement)

### Effort estimé Track D

~2-3h.

---

# Track E — Cohérence `signs: 'strict'`

## Phase 0E — Spécification

### Contexte

Le système `ConstraintOptions` a un mode `signs: 'strict'` qui demande à
éviter les `5 + (-3)` au profit de `5 - 3`.

**État réel du câblage** (vérifié `target-extractor.ts:146` et
`pedagogical-evaluate/types.ts:87-90`) : `signs` fait DÉJÀ partie de
`STRICT_KEYS` filtrés par `filterStrictMode` et est DÉJÀ propagé via
`PedagogicalTarget.strictCosmetics.signs`. Le pipeline lit déjà
`target?.strictCosmetics?.reducedFractions === 'strict'` (`pipeline.ts:301,430`)
— il manque juste la branche **équivalente** pour `signs`.

**Conséquence** : Track E est plus court que ce que le prompt initial
laissait croire. PAS besoin d'étendre `PedagogicalArithmeticOptions` ni
de propager `signs` depuis ConstraintOptions — les deux sont déjà faits.

**Décision arbitrée E-1** : `simplifyAddOpposite` fire **uniquement à
droite** (`add(x, opposite(y)) → subtract(x, y)`). Raison : la norme
`signs: 'strict'` cible le motif visuel `+(-` qui n'apparaît qu'à droite
d'un `+`. Le cas `(-3) + 5` n'a pas ce motif visuel ; le transformer en
`5 - 3` exigerait un réordonnancement (commutativity) hors scope de cette
règle. Si pédagogiquement nécessaire, c'est l'affaire d'une autre rule
de canonicalisation amont (out of scope V1).

### Sous-tâches

1. Ajouter une rule cosmétique post-processing
   `simplifyAddOpposite` (priority 25, runs après évaluation) dans
   `basic-operations.ts` (ou nouveau fichier `signs-strict.ts` si la
   famille grandit) :

   - Pattern : `add(x, opposite(y))` (right opposite uniquement, cf E-1).
   - Replacement : `subtract(x, y)` (utilise `subtract` du factory).
   - `applicableLevels`: tous (`['primaire', 'college', 'lycee', 'superieur']`).

2. Étendre `pedagogical-rules/index.ts` (`loadPedagogicalRules`) :

   - Lire `options.needsSignsStrict` (nouveau champ `LoadRulesOptions`,
     analogue à `needsReducedFractions`).
   - Si `true` → injecter `simplifyAddOpposite` comme terminal (cf
     `reduceFraction` ligne 104-108 pour le pattern).
   - Default (sans `needsSignsStrict`) → ne pas injecter (compat).

3. Étendre `pipeline.ts` pour passer `needsSignsStrict:
target?.strictCosmetics?.signs === 'strict'` à `loadPedagogicalRules`
   (analogue à `needsReducedFractions` ligne 301).

**Note** : pas besoin de modifier `target-extractor.ts` ni
`PedagogicalArithmeticOptions` — `signs` arrive déjà via
`target.strictCosmetics`.

### Tests

`__tests__/signs-strict.test.ts` (~8 tests) :

- `5 + (-3) → 5 - 3` quand `target.strictCosmetics.signs === 'strict'`
- `5 + (-3)` reste tel quel quand `signs` absent (default)
- `5 + opposite(3) → 5 - 3` (canonisation opposite)
- `(2x) + (-3x) → (2x) - (3x)` (avec variables)
- **Décision E-1** : `(-3) + 5` reste `(-3) + 5` même avec
  `signs: 'strict'` (left opposite hors scope V1, pas de
  réordonnancement automatique). Test explicite vérifiant ce
  comportement (pas un bug, un choix documenté).
- Régression : pipeline normal sans `signs: 'strict'` inchangé

### Code review attendu

`code-reviewer` (Opus).

### Critères d'acceptation Track E

- 0 régression sur ~250 tests `pedagogical-arithmetic/`
- 8 nouveaux tests verts
- `signs: 'strict'` est désormais lu par le pipeline (la moitié du
  câblage existait déjà via `strictCosmetics`)

### Effort estimé Track E

~1h. Estimation revue à la baisse : le câblage `target-extractor` →
`PedagogicalTarget.strictCosmetics.signs` existe déjà, il ne reste
que la rule + 2 lignes de propagation dans `loadPedagogicalRules` et
`pipeline.ts`.

---

# Track F — Format `--both` dans snapshots démo

## Phase 0F — Spécification

### Contexte

Le `DemoFormat` dans `pedagogical-arithmetic/demo-helpers.ts:43` supporte
déjà `'custom' | 'latex' | 'both'`. Le format `'both'` produit
custom + LaTeX côte à côte. Les snapshots actuels n'utilisent que
`'custom'` (24 snapshots) ou `'latex'` (utilisé par d'autres modules).

Track F ajoute des snapshots `--both` pour valider la cohérence
custom/LaTeX et faciliter le diff visuel pour le dev.

### Sous-tâches

1. Étendre `__tests__/pedagogical-arithmetic-demo.test.ts` :

   - Garder les 24 snapshots `custom` existants (régression)
   - Ajouter 24 nouveaux snapshots `'both'` parallèles : nom des tests
     `<cas> [both]`.
   - Ou : ajouter un seul test it.each qui produit les 24 snapshots `'both'`.

2. **Décision arbitrée F-1** : option **A** — même fichier `.snap`,
   48 snapshots dont 24 `[both]`. Pas de fichier dédié. Évite la
   duplication de structure et le risque de divergence entre les deux
   suites.

3. Vérifier que le format `'both'` est stable (pas de différence cosmétique
   entre runs).

4. **Hors scope V1** : ne PAS étendre aux modules consommateurs
   (`pedagogical-solve/`, `pedagogical-differentiation/`,
   `pedagogical-integration/`, `pedagogical-simplify/`,
   `pedagogical-limits/`, `pedagogical-domain/`). À ajouter seulement
   quand l'utilité est avérée — V1 = arithmétique seul.

### Tests

48 snapshots dans `pedagogical-arithmetic-demo.test.ts.snap` (24 `custom`
existants intacts + 24 `[both]` ajoutés). Décision F-1 — même fichier.

### Code review attendu

`code-reviewer` (Opus). Léger.

### Critères d'acceptation Track F

- 24 snapshots `[both]` stables ajoutés
- 0 régression sur les 24 snapshots `custom` existants
- TODO « Format `--both` dans snapshots démo » marqué livré dans
  `pedagogical-arithmetic-progress.md`

### Effort estimé Track F

~1h.

---

# Phase finale (commune à tous les tracks livrés)

### Ordre d'exécution recommandé

**F doit être fait APRÈS E** : E modifie le pipeline (injection de
`simplifyAddOpposite`), donc les snapshots `--both` de F doivent voir
le pipeline final. Sinon, snapshots à régénérer.

**A et B touchent tous deux `target-extractor.ts`** : ne PAS faire en
parallèle. Séquentiel obligatoire (A puis B, ou B puis A — peu importe
mais pas concurrent).

Ordre suggéré : A → C → E → D → B → F (priorisation produit + respect
des couplages).

### Sous-tâches POST-CHAQUE-TRACK (et non en bloc final)

À exécuter **après chaque track livré** (pas tous à la fin) :

1. **ESLint ciblé** sur les fichiers modifiés du track :
   `npx eslint <fichiers du track>`. Si on attend la fin du tunnel, on
   ne sait pas dans quel commit une régression ESLint apparaît.
2. **`mcp__svelte__svelte-autofixer`** sur les fichiers `.svelte`
   modifiés du track (si applicable — peu probable pour ces tracks
   purement TypeScript).
3. **Code review** par `code-reviewer` agent (Opus) sur le diff du track.
4. **Commit** dédié au track (1-2 commits max).

### Sous-tâches POST-TUNNEL (à la toute fin)

1. **TypeScript + Svelte** : `pnpm check:incremental` (incremental, ~30s).
2. **Tests régression complets** :
   ```bash
   pnpm test:server src/lib/mathAST/
   pnpm test:server src/lib/questions/
   ```
3. **Doc de progression** : créer `docs/wip/short-todos-progress.md` qui
   liste les tracks livrés (peut être un sous-ensemble), les hashes des
   commits, le total des tests ajoutés, les régressions (0 attendues),
   et les ambiguïtés tranchées (C-1, C-2, B-1, E-1).
4. **Mise à jour des progress docs des tracks** :
   - Track A → marquer TODO #1 comme livré dans
     `pedagogical-arithmetic-progress.md`
   - Track B → marquer TODO #3 comme livré
   - Track C → marquer TODO #4 comme livré
   - Track D → marquer TODO #5 comme livré
   - Track E → marquer TODO #6 comme livré
   - Track F → marquer TODO format `--both` comme livré
5. **IMPORTANT** : pas de `Co-Authored-By: Claude` dans aucun commit.

### Validation finale

- ESLint clean (par track + global)
- check:incremental clean
- 0 régression
- Doc de progression écrite
- Commits créés

---

## Anti-patterns à éviter

1. **Ne PAS faire les 6 tracks dans 1 seul commit** — chaque track est
   livré séparément (ou par paire) pour permettre rollback isolé.

2. **Décisions architecturales DÉJÀ arbitrées dans ce prompt — ne pas
   les remettre en cause sans valider explicitement avec l'utilisateur** :

   - **C-1** : `simplify-square-root-of-square` est OPT-IN (désactivée
     par défaut, activable via flag `enableSquareRootOfSquare?`).
   - **C-2** : précondition « radicand non carré parfait » sur
     `rationalize-denominator` (pas jeu de priorités).
   - **B-1** : option orthogonale `collegeSubLevel?: 'early' | 'late'`,
     PAS d'extension du type `SchoolLevel`.
   - **E-1** : `simplifyAddOpposite` fire uniquement à droite
     (`add(x, opposite(y))`), pas à gauche.
   - **F-1** : snapshots `[both]` dans le même fichier que les snapshots
     `custom` existants (pas de fichier dédié).

3. **Track D — Ne PAS utiliser `parseFloat` ou `Number()` sur des mantissas
   décimales**. String-level ou bigint uniquement. Le commentaire ligne 207
   « Avoid float drift » est non-négociable. Forcer la représentation unique
   `{ digits: bigint, decimalPos: number }` (pas de mélange avec
   `{ integerDigits, fractionalDigits }`).

4. **Track A — Ne PAS marquer `@deprecated` le 3e arg `expressionName?`
   de `extractPedagogicalTarget`**. Le pattern d'usage 3 (caller sans
   blank, avec expressionName explicite) reste valide et n'a pas
   d'alternative équivalente. Le 3e arg gagne sur `blank.expressionName`
   quand fourni.

5. **Track C — Ne PAS faire fire `simplify-square-root-of-square` SUR
   `√(4²)` ou `√(9²)`** : `extractPerfectSquare` fire d'abord
   (priority 100 vs 90), même quand le flag opt-in est activé. Vérifier
   le non-chevauchement par test explicite.

6. **Track E — Ne PAS toujours canoniser `+(-y) → -y`** dans tout le
   pipeline. Conditionnel sur `target.strictCosmetics.signs === 'strict'`.
   Et **uniquement à droite** (cf E-1) — `(-3) + 5` reste tel quel.

7. **Track B — RETIRER `'primaire'` de `applicableLevels` de
   `toCommonDenominator`**. Les deux rules ne coexistent PAS sur le
   même niveau : primaire utilise exclusivement la multiplication
   directe. Migrer les tests primaire éventuels VERS la nouvelle rule
   (pas de bypass silencieux).

8. **Track F — Ne PAS supprimer les snapshots `custom` existants**
   en migrant vers `--both`. Régression interdite. Snapshots `[both]`
   ajoutés EN PLUS, dans le même fichier `.snap`.

9. **Ne PAS exécuter F avant E** : les snapshots `[both]` doivent voir
   la rule `simplifyAddOpposite` du Track E si livrée. Sinon snapshots
   à régénérer ultérieurement.

10. **Ne PAS exécuter A et B en parallèle** : tous deux touchent
    `target-extractor.ts` et `loadPedagogicalRules`. Séquentiel
    obligatoire.

11. **Ne PAS exécuter `pnpm check`, `pnpm check:fast`, `pnpm build`,
    `pnpm lint`** sur tout le projet. Toujours `pnpm check:incremental`
    et `npx eslint <fichiers>` ciblés.

12. **Ne PAS mettre `Co-Authored-By: Claude`** dans les commits.

---

## Récap effort estimé (révisé)

| Track                            | Effort réaliste | Tests                            | LOC          | Notes                                                     |
| -------------------------------- | --------------- | -------------------------------- | ------------ | --------------------------------------------------------- |
| A — `expressionName`             | 3-4h            | ~8                               | ~80          | +1h vs prompt v1 (surface caller plus large)              |
| B — Fractions early-college      | 3-5h            | ~12                              | ~150         | +1-2h (modification `applicableLevels` + migration tests) |
| C — Rationalize + sqrt-of-square | 3-4h            | ~18                              | ~200         | OK                                                        |
| D — Decimal mantissas            | 3-4h            | ~12                              | ~150         | +1h (helpers à designer rigoureusement)                   |
| E — `signs: 'strict'`            | 1h              | ~8                               | ~50          | -1h (câblage `strictCosmetics.signs` déjà fait)           |
| F — Format `--both` snapshots    | 1-1.5h          | ~24 snapshots                    | ~30          | OK (à exécuter APRÈS E)                                   |
| **Total si tous**                | **~14-19h**     | **~80-100 tests + 24 snapshots** | **~660 LOC** |

L'agent peut faire **tout ou partie** des tracks. Recommandation
priorisation produit (et respect des couplages) :

1. **Track A** (utile : facilite Mode B `arithmetic-from-blank` à long terme)
2. **Track C** (utile : élargit la couverture pédagogique radicaux)
3. **Track E** (utile + court : améliore la cosmétique des steps strictes)
4. **Track D** (rare : peu de questions utilisent decimal mantissas en notation scientifique)
5. **Track B** (cosmétique pédagogique fine : visible seulement en early-college — **à faire APRÈS A** car couplage `target-extractor.ts`)
6. **Track F** (dev tool : pas de valeur produit directe — **à faire APRÈS E** car snapshots dépendent du pipeline final)

### Cherry-pick conseillé pour single-shot

Si pas de tunnel complet : **A + C + E** (~7-9h, 3 tracks orthogonaux
côté code, valeur pédagogique élevée). B/D/F reportables à un cycle
ultérieur sans douleur.

---

## Documents à produire

À la fin du tunnel, l'agent doit avoir produit :

1. `docs/wip/short-todos-progress.md` — doc de progression listant les
   tracks livrés (peut être un sous-ensemble) + hashes des commits.
2. Mise à jour de `docs/wip/pedagogical-arithmetic-progress.md` —
   marquer chaque TODO concerné comme livré.

Lister explicitement ces docs à la toute fin de la conversation
(comme demandé par CLAUDE.md section Planning & Execution Policy).
