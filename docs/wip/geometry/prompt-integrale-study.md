# Étude : ajout du builtin `integrale(f, a, b)` à geometry-core

## Objet

Cette étude vise à concevoir un nouveau builtin DSL `integrale(f, a, b)` qui :

1. Calcule la valeur (numérique ou symbolique) de l'intégrale définie ∫ₐᵇ f(x) dx
2. Trace visuellement la zone correspondante (remplissage entre la courbe, l'axe
   des x, et les droites verticales x = a et x = b)
3. Réagit aux changements de bornes (a, b sliders ou points sur l'axe)

**C'est une étude / Phase 0 uniquement** : aucune ligne de code à écrire dans
cette session. Le livrable est un plan TDD validé par l'utilisateur, plus une
liste de questions ouvertes ciblées.

---

## Contexte amont (acquis)

- `derivee(f)` vient d'être ajouté (commit `8ef0b4e4`, 29 tests). C'est le
  builtin frère de `integrale` côté analyse fonctionnelle.
- `mathAST/integration` est **déjà un module mature** (voir inventaire ci-
  dessous) — l'essentiel du calcul est gratuit.
- `mathAST/analysis` fournit aussi des outils de structure de fonction
  (continuité, racines, périodicité, symétrie) qui peuvent informer le
  comportement de `integrale` aux bornes.

---

## Inventaire `mathAST/integration` (À LIRE INTÉGRALEMENT en Phase 0)

Localisation : `src/lib/mathAST/integration/`

**Fichiers et exports principaux** :

- `index.ts` — barrel d'exports public. Référence absolue.
- `integrate.ts` (~700 lignes)
  - `integrate(expr, options): IntegrateResult` — primitive symbolique
  - `integrateDefinite(expr, lower, upper, options): DefiniteIntegrateResult`
    — intégrale définie avec **fallback numérique automatique** (Simpson
    adaptatif) si symbolique échoue, paramétrable par `allowNumeric` flag
- `numeric.ts`
  - `simpson(f, a, b, n)` — Simpson basique
  - `adaptiveSimpson(f, a, b, tol, maxDepth)` — Simpson adaptatif (tol = 1e-6
    par défaut)
  - `numericIntegrate(expr, variable, a, b, options)` — wrapper MathNode
- `classify.ts` — `classifyIntegrand(expr, variable)` retourne `IntegrandType`
  (polynomial, rational, trigonometric, exponential, logarithmic, inverse-
  trig, radical, product, composite, mixed, unknown)
- `rules.ts` — règles de base (powerRule, sinRule, cosRule, lnAbsRule,
  expRule, etc.) + helpers (`simplifiedAdd`, `simplifiedMultiply`, etc.)
- `patterns.ts` — `findUCandidates`, `matchUSubstitution` (substitution u)
- `integrators/` — basicIntegrator, uSubstitutionIntegrator,
  selectIntegrator, ALL_INTEGRATORS
- `step-recorder.ts` — système de pas pédagogiques (utile si on veut afficher
  une démo des étapes du calcul)
- `descriptions-fr.ts` — descriptions pédagogiques en français des règles

**Types clés** :

```ts
type IntegrationStatus = 'exact' | 'approximate' | 'unsupported';

interface DefiniteIntegrateResult {
	variable: string;
	status: IntegrationStatus;
	antiderivative: MathNode | null; // F(x) tel que F'=f
	lowerBound: MathNode;
	upperBound: MathNode;
	value: MathNode | null; // valeur exacte symbolique
	approximate?: number; // approx numérique
	steps: readonly IntegrateStep[];
	error?: string;
	// ...
}
```

**Décision implicite** : `integrateDefinite` essaie le symbolique d'abord et
retombe sur numérique automatiquement. C'est exactement ce dont on a besoin.

---

## Inventaire `mathAST/analysis` (utile en complément)

Localisation : `src/lib/mathAST/analysis/`

- `continuity.ts` — détecter discontinuités de f sur [a, b]
- `roots.ts` — zéros de f (utile pour aire signée vs non-signée)
- `critical-points.ts` — extrema, inflexions
- `differentiability.ts` — points non-différentiables
- `polynomial-analysis.ts`, `quadratic-combination.ts`, `linear-combination.ts`
  — décomposition

**Utilité pour `integrale`** :

- Vérifier que f est continue sur [a, b] avant intégration (sinon avertir ou
  splitter)
- Détecter les zéros dans [a, b] pour calculer l'aire **non-signée** ∫|f| =
  somme des |∫f| sur les sous-intervalles entre zéros (à valider en spec)

---

## Ce qui existe côté geometry-core

Localisation : `src/lib/geometry-core/`

- **GeoFunction** (`types/elements.ts:677`) — le `f` qu'on va intégrer existe
  déjà avec ses champs : `expression: MathNode`, `derivative: MathNode`,
  `compiledFn`, `compiledDerivative`, `equation: string`.
- **GeoScalar** (`types/elements.ts:400`) — élément scalaire réactif. Kinds
  existants : `distance`, `angle`, `area` (polygone), `norme`, `perimeter`,
  `slope`, `radius`, `power`, `expression`, `coordinate`. **`integrale`
  ajouterait probablement le kind `'integral'`** ou réutiliserait
  `'expression'` avec une closure `compute()`.
- **Builtin `aire(...points)`** déjà existant pour aire de polygone — **ne pas
  confondre**. `aire` = polygone, `integrale` = sous courbe.
- **GeoSlider** (`types/elements.ts:429`) — pour bornes `a`, `b` réactives.
- **Pattern de rendu** : `functionToSVG` (svg-primitives.ts:1293) sample la
  courbe avec `sampleWithDerivative`. Le rendu de la zone de l'intégrale
  pourrait réutiliser ce sampling et fermer le path par les segments
  (a, 0) → (a, f(a)) → courbe → (b, f(b)) → (b, 0).
- **Pattern de zone** : `locusToSVG` montre comment générer un path d'aire
  fermée. `traceToSVG` aussi.

---

## Périmètre de l'étude (Phase 0)

### À analyser et documenter

1. **Comportement attendu** :

   - `integrale(f, a, b)` retourne quoi côté DSL ? Un scalaire ? Un élément
     visuel ? Les deux à la fois (élément double) ?
   - Aire signée (∫f) ou non-signée (∫|f|) ? Convention pédagogique en
     France ? **Question pour l'utilisateur**.
   - Comportement quand a > b : convention mathématique standard (∫ᵇₐ = -∫ₐᵇ),
     ou erreur ?
   - Bornes infinies (`a = -inf`) : supportées ou non ? `integrate.ts` les
     gère ?
   - Discontinuités dans [a, b] : warn, error, ou split automatique ?

2. **API DSL proposée(s)** — à choisir :

   ```
   A = integrale(f, 0, 1)                                   # bornes nombres
   A = integrale(f, a, b)                                   # bornes scalaires/sliders
   A = integrale(f, P1, P2)                                 # bornes points sur axe x
   A = integrale(f, 0, 1, couleur="bleu", opacite_fond=0.3) # avec style
   ```

   Quelle(s) signature(s) supporter en V1 ?

3. **Type d'élément à introduire** :

   - **Option A** : nouveau type dédié `GeoIntegralArea` (kind d'élément à
     part entière), avec un sous-élément `GeoScalar` pour la valeur. Plus
     verbeux mais plus net pour le rendu et les exports (TikZ/Typst).
   - **Option B** : un `GeoScalar` (kind `'integral'`) avec un flag de
     visibilité de l'aire. Mutualise avec l'existant.
   - **Option C (à explorer)** : élément double — un scalaire `value` et un
     élément visuel `area` retournés ensemble, similaire à comment
     `point_sur` retourne un point + des dépendances cachées.

4. **Stratégie de calcul** :

   - **Symbolique d'abord** via `integrateDefinite` puis fallback
     `numericIntegrate` si `status === 'unsupported'` ?
   - Mode `numérique uniquement` (option `mode="numerique"`) pour les cas où
     l'utilisateur préfère la rapidité ?
   - Cacher la primitive `F(x)` dans l'élément pour pouvoir afficher
     la valeur exacte en plus de l'approximation ?

5. **Réactivité** :

   - Quand `a` ou `b` change (slider ou point dragué), la valeur scalaire
     doit recalculer.
   - Quand `f` change (jamais en pratique car `GeoFunction` est immuable,
     mais si on bind à un slider via `f = courbe("y = a*x^2")` avec slider
     `a`)... cas hors scope V1 ?
   - Re-calcul symbolique vs numérique : recalculer la primitive est cher,
     mais `integrate()` est probablement < 10 ms même pour des cas
     compliqués. Bench rapide à inclure dans Phase 0 ?

6. **Rendu visuel** :

   - Path fermé : `M(a, 0) L(a, f(a)) [courbe échantillonnée] L(b, f(b)) L(b, 0) Z`
   - Réutiliser `sampleWithDerivative()` de `grapheur/sampler.ts` pour
     l'échantillonnage adaptatif de la portion [a, b] ?
   - Aire sous l'axe : remplir en couleur différente ? (∫ négatif)
   - Hachures pour discontinuités ?
   - Style : `couleur` (contour), `remplissage`, `opacite_fond`, `motif`
     (cohérent avec les autres builtins).

7. **Affichage de la valeur** :

   - `mesure(A)` étendu pour afficher l'intégrale ? Ou label automatique
     "∫ ≈ 0.333" sur la figure ?
   - Format : exact (fraction/symbolique) si possible, sinon approximation
     à 4 décimales.

8. **Cas limites à tester** :

   - f négative → aire négative ; affichage adapté ?
   - f changeant de signe dans [a, b] → splittage ?
   - f non-intégrable symboliquement (ex. `exp(-x²)`) → fallback numérique
   - Bornes égales (a == b) → 0
   - Bornes hors domaine de f (ex. ∫₋₁¹ ln(x) dx) → erreur claire
   - Singularité dans [a, b] (ex. ∫₋₁¹ 1/x) → erreur ou warn

9. **Hors scope V1 (à confirmer)** :
   - Aire entre deux courbes `aire_entre(f, g, a, b)` (pourrait venir en V2)
   - Intégrale impropre (bornes infinies)
   - Volume de révolution (avancé)
   - Aire sur courbe paramétrique (∫ y(t) x'(t) dt) — dépend de la feature
     paramétriques pas encore ajoutée

### Comment livrer l'étude

Produire `docs/wip/geometry/integrale-study.md` avec :

1. **Inventaire confirmé** de l'API `mathAST/integration` (signatures à jour
   par lecture du code, pas de mémoire) — peut citer ce document.
2. **Recommandations argumentées** pour chacune des questions 1-9 ci-dessus.
   Pour chaque recommandation : alternative envisagée, justification,
   références de code.
3. **API DSL finale proposée** avec exemples concrets (3-5 scripts qui
   illustrent les usages typiques).
4. **Plan TDD** détaillé avec :
   - Phases (validation spec → tests rouges → impl → review → checks → commit)
   - Fichiers à modifier/créer (chemins absolus)
   - Estimation effort (heures)
   - Agents à utiliser (`code-reviewer` proactif après code, `test-automator`
     si beaucoup de tests, etc.)
5. **Liste finale de questions ouvertes** pour l'utilisateur (ce sur quoi
   l'agent ne peut pas trancher seul). Idéalement ≤ 5 questions ciblées.

### Contraintes

- **NE PAS écrire de code de production** dans cette session — uniquement
  l'étude et le plan.
- Lire le code de `mathAST/integration/integrate.ts`, `numeric.ts`,
  `classify.ts`, `types.ts` avant de proposer quoi que ce soit. Ne pas se
  fier à des suppositions.
- Vérifier expérimentalement (test temporaire jetable autorisé) le
  comportement de `integrateDefinite` sur 5-10 cas types : `x²` sur [0, 1],
  `sin(x)` sur [0, π], `exp(-x²)` sur [-2, 2] (cas non-symbolique typique),
  `1/x` sur [-1, 1] (singularité), `ln(x)` sur [1, e]. Documenter les
  retours `value`, `approximate`, `status` pour informer le design.
- Ne pas rouvrir les questions tranchées en V0 de `derivee` (autonomie de
  GeoFunction, équation calculée par `toCustom`, etc.).
- `toCustom` round-trippe désormais correctement les multiplications
  implicites (commit `c87c5958`) — donc stocker la primitive comme chaîne
  via `toCustom(antiderivative)` est sûr si nécessaire.

---

## Références code (chemins absolus)

À consulter en priorité :

```
src/lib/mathAST/integration/index.ts          # barrel
src/lib/mathAST/integration/integrate.ts      # integrateDefinite (~ligne 580)
src/lib/mathAST/integration/numeric.ts        # adaptiveSimpson, numericIntegrate
src/lib/mathAST/integration/classify.ts       # classifyIntegrand
src/lib/mathAST/integration/types.ts          # DefiniteIntegrateResult
src/lib/mathAST/analysis/continuity.ts        # vérifier continuité sur [a,b]
src/lib/mathAST/analysis/roots.ts             # zéros de f dans [a,b]

src/lib/geometry-core/types/elements.ts:400   # GeoScalar
src/lib/geometry-core/types/elements.ts:677   # GeoFunction
src/lib/geometry-core/dsl/builtins.ts:1504    # case 'courbe'
src/lib/geometry-core/dsl/builtins.ts:1568    # case 'derivee' (modèle de référence)
src/lib/geometry-core/dsl/builtins.ts:1105    # case 'aire' (NE PAS CONFONDRE)
src/lib/geometry-core/dsl/builtins.ts:1018    # case 'mesure' (affichage scalaire)
src/lib/geometry-core/graph/figure.ts:2331    # createScalarArea (modèle)

src/lib/geometry-core/rendering/svg-primitives.ts:1293  # functionToSVG
src/lib/geometry-core/rendering/svg-primitives.ts:1652  # locusToSVG (zone fermée)
src/lib/grapheur/sampler.ts                  # sampleWithDerivative
```

## Références utilisateur (contexte projet)

- Comparaison fonctionnelle GeoGebra : tableau original (session précédente)
  identifie `integrale(f, a, b)` comme une feature manquante de valeur ★★★★ /
  effort modéré (~1 jour estimé).
- Public cible : élèves francophones de lycée — l'aire sous une courbe est
  un concept-clé du programme de Terminale (intégration introduite en
  Première spé / Terminale spé).
- DSL en français impératif : préférer `integrale` (pas `integral`).

---

## Critère de succès de l'étude

L'étude est terminée quand l'utilisateur peut, en lisant
`docs/wip/geometry/integrale-study.md` seul, prendre une décision GO/NO-GO
sur l'implémentation et savoir précisément :

- Quelle API DSL sera exposée
- Quels types TypeScript seront introduits ou modifiés
- Quelles fonctions de `mathAST` seront appelées (et où)
- Combien d'effort représente la V1
- Quels cas seront couverts en V1 et lesquels seront repoussés en V2
