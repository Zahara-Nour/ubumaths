# Moteur commun de factorisation — phase 0 : état des lieux

> Rédigé le 2026-10-11 dans le worktree `feat/moteur-factorisation` (base `20f85aa24`).
> **Phase 0 : aucun code de production écrit.** Ce document est un relevé de faits, chacun avec sa
> source (fichier:ligne ou mesure) ; il ne recommande aucune architecture.
>
> Décor des mesures : panel jetable `src/lib/mathAST/__panel_factorisation.test.ts` (31 expressions
> LaTeX **parsées**, supprimé après la mesure), `pnpm test:server`, grep sur `src/` (`.ts` et
> `.svelte`, `src/routes` compris), et deux requêtes SQL en lecture seule sur la base de PRODUCTION
> (MCP Supabase, 2026-10-11).

## 0. Ce qui est déjà décidé

- **ADR 0007** (acceptée le 2026-09-21) : un seul moteur, quatre politiques sur « faut-il
  développer ? » ; l'intention `factoriser` = **jamais développer, et factoriser** ; `auto` **ne
  factorise jamais** ; « les règles définissent ce qui est atteignable : ce qu'on ne sait pas
  expliquer en étapes, on ne le fait pas ». État au 2026-10-10 (README mathAST) : décidé, pas fait.
- Le README mathAST (§ Deux moteurs) le dit déjà : `auto` passe par `runNormalizePass` et contient
  des factorisations symboliques (`pedagogical-simplify/intent-rules.ts:150-162`).

## 1. Inventaire

Légende : **E/S** = entrée / sortie ; **var** = dépend d'une variable désignée ; **ℚ / ℝ** = racines
rationnelles seulement, ou irrationnelles acceptées ; **étapes** = produit des pas racontables.

### 1.A Les lieux qui s'appellent « factor »

#### A1. `commonFactorRules` — `pattern/rule-sets/common-factor.ts:667`

- **Sait** : `a·c + b·c → (a+b)c` (`common-factor-products`, :138) et `c + b·c → (b+1)c`
  (`common-factor-bare-term`, :159) ; `c` non numérique. **Addition seulement** (pas de règle pour
  `a·c − b·c`) ; motif `P.parse('a * c + b * c')`, le facteur commun à droite (mesuré ci-dessous :
  un facteur commun à gauche n'est pas vu).
- **E/S** : AST → AST, réécriture par motifs, sans variable, sans corps.
- **Étapes** : oui (noms de règles, phrases dans `pedagogical-simplify/descriptions-fr.ts:51-52, 165-166`).
- **Appelants** : `solve/solve.ts:571` (`factorCommon`), `pedagogical-simplify/intent-rules.ts:132`
  (intention `factoriser`).
- **Tests** : `pattern/rule-sets/__tests__/facteur-commun.test.ts`, `solve/__tests__/common-factor.test.ts`,
  `pedagogical-simplify/__tests__/*` (pipeline, intent-rules, common-factor-descriptions).
- **Mesuré** (application directe, `applyRules(commonFactorRules, ·)`) : `\sin x\cos x+\sin x` →
  `(\cos x + 1)\sin x` ; **inchangé** sur `xe^x-e^x` (soustraction) et sur
  `(x+1)(x-2)+(x+1)(2x+3)` (facteur commun à GAUCHE). `solve` contourne la première limite en
  réécrivant la somme en additions (`negatedTermAsProduct`, `solve/solve.ts:478`, commentaire :473-476).

#### A2. `commonContentFactorRules` — `pattern/rule-sets/common-factor.ts:684`

- **Sait** : sortir le **contenu** d'une somme : PGCD numérique (coefficients entiers seulement,
  :335-376), monôme (plus petit exposant commun), facteur non polynomial (`eˣ`, `sin x`, `(x+1)`,
  PR #1108). Règles `common-factor-content-add` / `-sub` (:654-660), priorité négative : les
  identités passent devant.
- **E/S** : AST → AST. Calcul **algorithmique** interne (décomposition en monômes `toMonomials`
  :252, PGCD `commonContent` :344) emballé dans une règle. Sans variable. Coefficients ℚ.
- **Étapes** : oui (une étape « On met le facteur commun en évidence »).
- **Appelant unique** : `pedagogical-simplify/pipeline.ts:505` (`extractCommonContentInMaximalSums`,
  sommes **maximales** seulement, après la phase A).
- **Tests** : `pedagogical-simplify/__tests__/facteur-commun-et-tidy.test.ts`,
  `facteur-commun-non-polynomial.test.ts`, `common-factor-descriptions.test.ts`, panel pinné.
- **Doublon** : son PGCD de monômes refait `gcdMonomials`/`divMonomials` de `normal/`
  qu’utilise `solve/solve.ts:647` (`sumWithExposedCommonFactor`), et `hasCommonFactor`
  (`analysis/structures.ts:654`), que l'en-tête du fichier (:24-29) écarte nommément.

#### A3. `algebraicFactoringRules` — `pattern/rule-sets/algebraic-identities.ts:203`

- **Sait** : `a²−b²` (symbolique `P.sub(P.pow(a,2),P.pow(b,2))` :66 et « numérique » via
  `isDifferenceOfSquares` :77), carré parfait `a²±2ab+b²` (`isPerfectSquareTrinomial` :95),
  `a³±b³` symbolique et numérique (:111-151, `diffCubesNumeric` :138).
- **E/S** : AST → AST. Détecteurs dans `analysis/structures.ts:206-505`. Coefficients : le carré
  d'un nombre n'est reconnu que s'il est un carré parfait **écrit seul** (mesuré : `4x^2-25` et
  `9x^2-12x+4` **inchangés**, `x^4-1` **inchangé**).
- **Étapes** : oui (phrases `descriptions-fr.ts:44-50, 160-164, 206-207, 229-230`).
- **Appelants** : `pedagogical-simplify/intent-rules.ts:133` (`factoriser`) et :152 (`auto`, sans
  les trois variantes `-numeric`) ; `simplify/simplify.ts:72` via l'alias
  `algebraicSimplifyRules = [...algebraicFactoringRules]` (`algebraic-identities.ts:220`), sous la
  barrière de coût ; `transform/algebraic-identities.ts:51,101` (mort, voir A5).
- **Tests** : `pedagogical-simplify/__tests__/pipeline.test.ts`, `intent-rules.test.ts`,
  `transform/__tests__/algebraic-identities.test.ts`, `simplify/__tests__/releve-bugs.test.ts`,
  `identites-pythagore.test.ts`, `questions/__tests__/generated-steps-demo.test.ts`.
- **Écart d'invariant** : `squared()` (:37) calcule le carré d'un nombre par `parseFloat`.

#### A4. Détecteurs `analysis/structures.ts`

- `isDifferenceOfSquares` :206, `isPerfectSquareTrinomial` :261, `isSumOfCubes` :398,
  `isDifferenceOfCubes` :451 : **utilisés** par A3 uniquement.
- `isQuadraticForm` :505, `isFactoredForm` :553, `hasCommonFactor` :654, `detectStructure` :798 :
  ré-exportés par `analysis/index.ts:53-60` et `mathAST/index.ts:1015-1022`, **aucun appelant**
  hors du fichier et de ses tests (`analysis/__tests__/structures.test.ts`,
  `pattern/rule-sets/__tests__/facteur-commun.test.ts`).
- `hasCommonFactor` construit des littéraux `{ type: 'number' … }` / `{ type: 'opposite' … }` à la
  main (:683-698), hors `factory.ts` (invariant 3 du README).

#### A5. `transform/` — `factorAlgebraic` (`transform/algebraic-identities.ts:100`), `factorize` (trigo, `transform/trig-identities.ts:193`), `factorizeH` (`transform/hyperbolic-identities.ts:209`)

- **Sait** : appliquer `algebraicFactoringRules`, `trigFactorizationRules`
  (`sin a ± sin b`, `cos a ± cos b`, `pattern/rule-sets/trig-identities.ts:456`),
  `hypFactorizationRules` (`hyperbolic-identities.ts:411`) jusqu'au point fixe (`applyRulesWithSteps`).
- **E/S** : AST → `{ result, changed, appliedRules }`.
- **Appelants** : **aucun** hors `transform/` et ses tests (grep de `mathAST/transform`, `../transform`,
  `factorAlgebraic`, `factorizeH` : rien). `trigFactorizationRules` et `hypFactorizationRules`
  ne sont atteints que par `transform/` et par les agrégats `allTrigRules` / `allHyperbolicRules`,
  eux-mêmes lus seulement par `transform/` (`transform/trig-identities.ts:57`,
  `transform/hyperbolic-identities.ts:59`). **Code mort en production.**
- **Tests** : `transform/__tests__/{algebraic,trig,hyperbolic}-identities.test.ts` (30, 115, 77 `it(`).
- **Mesuré** : `factorAlgebraic((2x+1)^2-(x-3)^2)` laisse des parenthèses doubles non réduites
  `((2x+1)+(x-3))((2x+1)-(x-3))` ; `factorAlgebraic(\frac{x^2-1}{x-1})` factorise sans simplifier.

#### A6. `solve` : `tryCommonFactorDecomposition` / `factorCommon` — `solve/solve.ts:532, 569`

- **Sait** : mettre en évidence un facteur commun **non constant** puis produit nul ; deux voies :
  la somme telle qu'écrite (A1 au point fixe), puis le facteur exposé via `normalize` +
  `gcdMonomials` (`sumWithExposedCommonFactor` :633-663, dénominateur constant exigé).
- **E/S** : équation → `SolveResult` ; dépend de la variable (seuls les facteurs qui la contiennent
  comptent, :648). Garde de récursion `MAX_COMMON_FACTOR_DEPTH = 3` (:466).
- **Quand** : **dernier recours** (:2005-2008), après les solveurs par classe, la substitution,
  `trySinCosRatio`, `tryTrigEquality`. Les polynômes n'y arrivent donc jamais (mesuré : aucune
  ligne polynomiale du panel ne passe par `common-factor`).
- **Étapes** : une étape `common-factor` (`solve/descriptions-fr.ts`) puis celles du produit nul.
- **Appelants** : `solve()` ; via lui `.variations` (dérivée `eˣ + x·eˣ`, commentaire :515-517).
- **Tests** : `solve/__tests__/common-factor.test.ts`.
- **API publique** : `factorCommon` n'est pas exporté ; mesuré à travers `solveEquation(expr = 0)`.

#### A7. `limits/algebraic.ts` : `tryFactorization` :82 (+ `tryFactorLinear` :131)

- **Sait** : sur `N/D` en `x → a` (**`a` nœud `number`**), simplifier par `(x − a)` quand N et D
  sont **littéralement** `x − a`, `x` (a = 0) ou `x² − a²`. Un trinôme ayant `a` pour racine :
  `return null` (« full polynomial factoring is complex », :167-172).
- **E/S** : AST (division) → `{ success, simplified }`, flottants (`parseFloat`, tolérance 1e-10).
- **Étapes** : une, `factorization` (« Factorisation par (x − a) »).
- **Appelants** : `tryAlgebraicSimplification` (:786, :801) ← `limits/evaluate.ts:997, 2195`,
  stratégie 4, **après L'Hôpital** (stratégie 3). Ré-exporté par `limits/index.ts:105`.
- **Tests** : `limits/__tests__/algebraic.test.ts`.
- **Écarts** : `variable()` local qui fabrique `{ type: 'variable' }` à la main (:182) ; un point
  d'approche **négatif** est toujours un `opposite(…)` (invariant 1), donc `isNumber(approach)`
  échoue (mesuré : `\frac{x^2-1}{x+1}` en −1 → échec).

#### A8. `integration/integrators/quadratic-denominator.ts` : `factorQuadratic` :127, `factoredDenominator` :175, `linearFactor` :115

- **Sait** : trinôme `ax² + bx + c` en la variable, coefficients rationnels exacts ; Δ < 0 →
  `negative-discriminant` ; Δ carré parfait → racines **ℚ** ; `ax² − t²` → racines littérales ±t ;
  racines irrationnelles → `null`.
- **E/S** : AST → descripteur (`QuadraticFactorization`), puis AST `a(x − r₁)(x − r₂)`. Exact
  (`Rational`). Réutilise `extractQuadraticCoefficients` de `solve/solvers/quadratic.ts`.
- **Étapes** : une étape technique `factor-denominator`, « Factorisation du dénominateur par ses
  racines » (`partial-fractions.ts:1209-1216`), dans le moteur d'intégration (pas un rendu élève).
- **Appelant unique** : `integration/integrators/partial-fractions.ts:1195, 1208`
  (`integrateQuadraticDenominator`).
- **Tests** : **aucun test direct** (grep) ; couvert indirectement par les primitives
  (`integration/__tests__/primitives-refusees.test.ts:159-167` : `1/(x²−4x+3)`, `x/(x²−5x+6)` ;
  `primitives-revue-947.test.ts`).
- **Mesuré** : forme non scolaire quand a ≠ 1 : `4x^2-25` → `4(x + 5/2)(x − 5/2)`,
  `9x^2-12x+4` → `9(x − 2/3)²`, `2x^2+x-3` → `2(x + 3/2)(x − 1)` ; `3x^2+6x` → `3(x+2)x`.

#### A9. `normal/parity.ts` : `canFactorOutNegative` :129

- **Sait** : sortir −1 d'une `NormalForm` dont **tous** les termes sont négatifs.
- **Appelant unique** : `normal/normalize.ts:236` (parité des fonctions : `cos(−x) = cos x`).
- **Tests** : aucun test direct (grep). Hors périmètre « factoriser une somme » : c'est un signe.

#### A10. `atelier/factor-steps.ts` : `factorSteps` :106

- **Sait** : ce que sait l'intention `factoriser` (niveau **`lycee` codé en dur**, :118).
- **E/S** : chaîne → `FactoredOutcome` (`factorisee` / `inchangee` / `illisible`).
- **Appelant** : `atelier/calcul.ts:710` (commande `.factoriser`, registre `atelier/commands.ts:106`).
- **Tests** : `atelier/__tests__/factoriser-commande.test.ts`, `factoriser-depliage.svelte.test.ts`.

#### A11. L'intention `factoriser` elle-même — `pedagogical-simplify/pipeline.ts:344` (+ `intent-rules.ts:127`)

- **Chaîne** : phase A (`commonFactorRules` + `algebraicFactoringRules` + identités selon le
  niveau, point fixe, 20 itérations max) → contenu des sommes maximales (A2) → phase A relancée
  si le contenu a bougé → `tidyWithoutReordering` (:443). **Pas** de `normalize`.
- **Niveau** : ne change que les identités trigo / ln-exp (`resolveFlags` :65-82). Les règles de
  factorisation ne dépendent pas du niveau (mesuré : `college` ≡ `lycee` sur les 31 lignes).
- **Appelants** : `atelier/factor-steps.ts:116` ; `questions/generator/correction-generator.ts:724`
  (`generatedSteps: { kind: 'simplify', intent }`, schéma `questions/template-schema.ts:226, 506`) ;
  `pedagogical-simplify/demo-helpers.ts:148` (démos, `demo-cases/factorisation.ts`).
- **Mesuré en production** (SQL lecture seule, 2026-10-11) : **0** modèle sur 1 005 contient
  `generatedSteps` ; le chemin `correction-generator` → `factoriser` n'est utilisé par aucun modèle.
  13 modèles parlent de factoriser (titres « Factoriser », « Factoriser $a^2-b^2$ »,
  « Factoriser un trinôme à l'aide de ses racines »…) ; aucun ne passe par `generatedSteps`. Deux
  d'entre eux contrôlent la forme de la réponse par `requiredForm` (motif, `pattern/verify.ts:109`) :
  `u^2` (publié) et `u*($x+v)*($x+w)` (brouillon) ; les onze autres n'ont pas de `requiredForm`.

### 1.B Les factorisations cachées

Relevé fait avec un agent `Explore` (lecture seule), citations vérifiées par sondage dans le code
(`exact-roots.ts:327-357`, `partial-fractions.ts:1205-1216, 1439-1446`, `quartic.ts:183`,
`normalize.ts:1104`, `polynomial.ts:1262-1274`, `quadratic-inequality.ts:252-255`,
`sign/helpers/interval-sign.ts:243-249, 469`, `sign/analyze.ts:262-272`).

**Construisent un produit**

- **B1. `integration/integrators/partial-fractions.ts:312` `factorDenominator`** — reconnaissance
  par la FORME, sans racine : `x`, `x ± a`, `(x ± a)ⁿ`, produits, `c·f`, `x² − n` (n carré parfait
  testé par `Math.sqrt`, :429), `x² + bx → x(x + b)` (:499-530). `x² − 5x + 6` → `null`, puis repli
  sur A8. E/S : AST → `PolynomialFactor[]`. Étape `factor-denominator` **vide** (before = after,
  :1440-1446). Appelants : :1342, :1449. Tests : `integration/__tests__/partial-fractions.test.ts`.
  Sa division `polynomialDivision` (:204) refait `normal/rational-quotient.ts:58`.
- **B2. `pedagogical-integration/_helpers.ts:838` `tryDetectPartialFractions`** — trinôme, Δ > 0,
  racines « rationnelles » par heuristique flottante `isRationalLike` (dénominateur ≤ 1000,
  tolérance 1e-6, :926). Le produit Q factorisé n'est jamais écrit ; écrit
  `A/(x − r₁) + B/(x − r₂)`. Étapes `decompose-rational`, `apply-partial-fractions`. Appelant :
  `pedagogical-integration/pipeline.ts:553`. **Doublon flottant de A8.**
- **B3. `pedagogical-limits/pipeline.ts:374` `tryFactorisation` + `helpers.ts:322`
  `syntheticDivide`** — divise N et D par `(x − a)`, `a` = point d'approche (`parseFloat`), Horner
  flottant, une racine par passe puis récursion. Polynômes de tout degré. Étapes françaises
  `factor-numerator`, `factor-denominator`, `simplify-common-factor` (:400-439). Appelants :
  `generatePedagogicalLimitSteps` ← `pedagogical-limits/dispatch.ts:64` ← `correction-generator`
  (import :52). Tests : `pedagogical-limits/__tests__/{helpers,pipeline,renderer}.test.ts`, snapshot.
  **Doublon plus fort de A7** (mesuré, § 2).
- **B4. `pedagogical-solve/quadratic.ts:773` `buildCZeroCaseSteps`** (`x(ax + b) = 0`, :811-812),
  **copié** dans `quadratic-inequality.ts:252-255` ; `tryDetectFactored` (:117) reconnaît une entrée
  déjà factorisée `(affine)(affine)`. Cas général : **aucun produit**, racines par la formule.
  Étapes `recognize-no-constant-term`, `factor-common-x`. Appelants : `pedagogical-solve/index.ts:138, 243`,
  `correction-generator.ts:422, 519`, `atelier/solve-steps.ts:175`. Tests :
  `pedagogical-solve/__tests__/quadratic*.test.ts`.
- **B5. `solve/solvers/polynomial.ts:916` `handleCubicWithCommonFactor`** et
  **`solve/solvers/quartic.ts:496` `solveQuarticCommonFactor`** — « On factorise par x (racine
  evidente : x = 0) » (`solve/descriptions-fr.ts:389, 420`) avec des before/after factices `x = 0` :
  le produit n'est jamais construit. Δ flottant (:944). Racines « rationnelles » par arrondi
  (`findSimpleFraction` :1330) sinon `numericNode(x.toFixed(10))` marqué `exact: true` (:1269-1274).
  Tests : `solve/__tests__/cubic.test.ts`, `quartic.test.ts`, `common-factor.test.ts`.
- **B6. `normal/normalize.ts:1660` `tryFactorPerfectSquareTrinomial`** — `a² ± 2ab + b²` sur
  `NormalTerm[]` (multivarié permis) → `NormalForm` `a ± b`. Sert `√(…)` → `|a ± b|` (:4515, étape
  `sqrt-perfect-square-trinomial`) et `ln`/`log` d'un carré (:3858 → :4724, :4782). Test :
  `normal/__tests__/ln-puissance-paire.test.ts`. **Troisième détecteur de carré parfait** (avec
  `isPerfectSquareTrinomial` AST, A4).
- **B7. `integration/class-form.ts:581` `exponentialFactorForm`** — écrit une primitive
  `(Px + Q)·eᵘ`. Appelant `integration/integrate.ts:872`. Pas d'étape.

**Simplifient une fraction par un facteur commun sans jamais le montrer**

- **B8. `normal/normalize.ts:1104` `normalFormFromFraction`** — PGCD univarié (`tryUnivariateGcd`,
  degré ≤ 10) + `dividePolynomials`, PGCD de monômes, division exacte, PGCD multivarié (≤ 5
  variables, produit des nombres de termes ≤ 64). Coefficients ℚ et radicaux. **Aucune étape** (pas
  de `ctx`). `denormalize` développe toujours. C'est ce qui donne `simplify(\frac{x^2-5x+6}{x-2})`
  = `x − 3` (§ 2, ligne 27). Tests : `normal/__tests__/univariate-gcd.test.ts`, `pgcd-multivarie*.test.ts`,
  `quotient-multivarie.test.ts`, `exact-division.test.ts`.
- **B9. `normal/rational-quotient.ts:58` `rationalQuotient`** — division euclidienne, pour les
  asymptotes du grapheur (`grapheur/asymptotes-exactes.ts:41` ← `grapheur/analysis.ts:1176`).

**Calculent des racines sans jamais construire le produit**

- **B10. `domain/exact-roots.ts:327` `exactRealRoots`** — **seule implémentation exacte du
  théorème des racines rationnelles ±p/q** (:340-357) avec `deflate` (:249) ; termine en degré 2
  avec √ exacts (`quadraticRoots` :301) ou en bicarré ; degré ≤ 8 ; **multiplicités perdues**
  (`dedupeSorted` :401). Pas d'étape. Appelants : `domain/compute.ts:974, 1017, 1228`. Couvert par
  `domain/__tests__/oracle/`.
- **B11. `domain/preimage.ts`** — zéros des degrés 2, 3, 4 en flottants (:654, :835, :869, :948) ;
  `solve/solvers/quartic.ts:183` dit lui-même avoir recopié son Ferrari.
- **B12. `solve/solvers/quadratic.ts:220` `quadraticSolver`** — Δ et racines en `MathNode` exacts,
  étapes françaises ; source des zéros de `sign/`, `variations/`, `analysis/roots.ts`,
  `pedagogical-solve/rational-inequality.ts`.
- **B13. Tableaux de signes.** `analyzeSign` (`sign/analyze.ts`) **ne factorise pas** : zéros par
  `solve`, puis, une somme donnant un signe `unknown` (`interval-sign.ts:243-249`),
  **échantillonnage numérique** avec l'avertissement « Sign on interval determined numerically »
  (`analyze.ts:264-270`) ; une seule ligne. `analyzePolynomial` (`interval-sign.ts:469`) est
  « for future use ». Côté pédagogique, `quadraticSignTableGrid`
  (`pedagogical-solve/quadratic-renderer.ts:700`) : une ligne, déduite de sign(a) et des racines ;
  `rationalSignTableGrid` (:1000) : lignes `P(x)`, `Q(x)`, `P/Q`, jamais une ligne par facteur.

**Rien trouvé** dans `analysis/roots.ts`, `analysis/polynomial-analysis.ts`, `pedagogical-domain/`,
`pedagogical-differentiation/`, `grapheur/` (hors B9), `questions/` (hors chemins déjà cités),
`src/routes/`, la CLI (`cli/`), `components/cas/`.

**Calculs refaits à plusieurs endroits** (même relevé) : Δ recalculé dans une dizaine de fonctions
(ℚ : `exact-roots.ts:302`, `quadratic-denominator.ts:140` ; `MathNode` :
`pedagogical-solve/quadratic.ts:385`, `solve/solvers/quadratic.ts:281` ; flottants :
`polynomial.ts:944`, `quartic.ts:128, 389`, `preimage.ts:672, 846`,
`pedagogical-integration/_helpers.ts:864`) ; six extracteurs de coefficients (`toRationalFunction`,
`asPolynomial`, `toUnivariateView`, `extractQuadratic/Cubic/QuarticCoefficients`,
`analyzePolynomial`, `quadraticCoefs`) ; quatre divisions de polynômes (`divideUnivariate`,
`exactDividePolynomials`, `syntheticDivide`, `deflate`) ; trois PGCD de monômes
(`common-factor.ts:344`, `gcdMonomials` de `normal/`, `hasCommonFactor`) et deux PGCD d'entiers
pédagogiques (`gcdInteger` de `pedagogical-solve/quadratic.ts`, `gcd` de `structures.ts:185`).

### 1.C Faux amis : s'appellent « factor » et ne factorisent pas

- `checkFactorOne` / `checkFactorZero` (`questions/constraint-validators.ts:799, 855`) : contraintes
  de forme « facteur 1 / facteur 0 » (`1·x`, `0·x`). Aucun appelant hors tests.
- `removeFactorsOneAST`, `simplifyNullProductsAST` (`cosmetic-transforms.ts`) : même chose côté `checkForm`.
- `factor-gcd` de `pedagogical-solve/quadratic.ts:206` (`buildFactorGcdStep`) : **divise** les deux
  membres de l'équation par le PGCD des coefficients, ne factorise pas (description :229).
- Facteurs d'unités, `cofactor` (matrices), `factorial`, `rsa.ts:243` `factorize` (entiers).

## 2. Panel mesuré (2026-10-11)

**Décor.** Fichier jetable `src/lib/mathAST/__panel_factorisation.test.ts` (supprimé après la
mesure), `pnpm test:server`, 1 test, ~0,1 s de calcul pour 31 × 11 appels. Chaque entrée est du
LaTeX **parsé** (`parseLatex`). Variable `x` partout. Points d'entrée :

- `factoriser` : `generatePedagogicalSimplifySteps(e, { intent: 'factoriser', schoolLevel })`,
  à `college` et à `lycee` — **identiques sur les 31 lignes**, une seule colonne ;
- `simplify(e).result` ;
- `factorAlgebraic(e)` (`transform/`) ; `factorize` (trigo) et `factorizeH` (`transform/`) :
  **inchangé sur les 31 lignes**, colonne omise ;
- `commonFactorRules` seul : `applyRules(commonFactorRules, e)` — approximation de `factorCommon`
  (privé), **sans** la réécriture `negatedTermAsProduct` que `solve` lui applique ;
- `solveEquation(e = 0, { variable: 'x', verbosity: 'detailed' })` : statut, solutions, et la
  forme produit si une étape la montre (« via ») ;
- `generateEquationSteps(e = 0, { level: 'lycee', variable: 'x' })` : la première étape dont le
  membre gauche est un produit et le droit 0 ;
- limites (lignes ayant une racine rationnelle r connue) : la fraction elle-même, ou `e/(x − r)`
  en x → r ; `tryFactorization(…, createStepRecorder())` et `generatePedagogicalLimitSteps(…,
{ schoolLevel: 'lycee' })` (expression de l'étape `simplify-common-factor`) ; « — » = sans objet ;
- `factorQuadratic(e, 'x')`, puis `factoredDenominator` si `rational-roots`.

**Valeur.** Chaque sortie AST a été comparée à l'entrée par `areEquivalent`. **Aucune sortie de
factorisation n'a une valeur fausse** (factoriser, simplify, factorAlgebraic, commonFactorRules,
factorQuadratic, tryFactorization, limite péda). Deux drapeaux levés étaient des artefacts du
harnais, pas des erreurs : `pedagogical-solve` sur `3x^2+6x` montre `x(x+2) = 0` **après** avoir
divisé l'équation par 3 (`factor-gcd`) ; `solve` sur `x^2-y^2` a été pris sur l'étape du
discriminant. Les solutions de `solve` ont été relues à la main (deux anomalies, § 3.6).

Écriture : `(a)/(b)` = `\dfrac{a}{b}` ; `e` = `\exponentialE`.

| #   | entrée                   | `factoriser` (collège = lycée)    | `simplify`            | `factorAlgebraic`                             | `commonFactorRules` seul | `solve(expr = 0)`                          | `pedagogical-solve` lycée                  | `tryFactorization` | limite péda             | `factorQuadratic`       |
| --- | ------------------------ | --------------------------------- | --------------------- | --------------------------------------------- | ------------------------ | ------------------------------------------ | ------------------------------------------ | ------------------ | ----------------------- | ----------------------- |
| 1   | `6x+9`                   | `3 (2 x + 3)`                     | inchangé              | inchangé                                      | inchangé                 | `unique {-3/2}`                            | pas de produit                             | échec              | refus                   | `null`                  |
| 2   | `3x^2+6x`                | `3 x (x + 2)`                     | inchangé              | inchangé                                      | inchangé                 | `multiple {0 ; -2}`                        | `x (x + 2)`                                | échec              | `(3 x + 6)/1`           | `3 (x + 2) x`           |
| 3   | `4x^3-2x^2`              | `2 x^2 (2 x - 1)`                 | inchangé              | inchangé                                      | inchangé                 | `multiple {0 ; 1/2 ; 0}`                   | refus `UnsupportedEquationDegree`          | échec              | `(4 x^2 + (-2 x))/1`    | `null`                  |
| 4   | `xe^x-e^x`               | `(x - 1) e^x`                     | inchangé              | inchangé                                      | inchangé                 | `unique {1}` via `(x - 1) e^x`             | refus `UnsupportedEquationDegree`          | —                  | —                       | `null`                  |
| 5   | `(x+1)^2-(x+1)`          | `x (x + 1)`                       | `x^2 + x`             | inchangé                                      | inchangé                 | `multiple {0 ; -1}`                        | `x (x + 1)`                                | échec              | `(x + 1)/1`             | `null`                  |
| 6   | `(x+1)(x-2)+(x+1)(2x+3)` | `(3 x + 1) (x + 1)`               | `3 x^2 + 4 x + 1`     | inchangé                                      | inchangé                 | `multiple {-1/3 ; -1}`                     | pas de produit                             | échec              | refus                   | `null`                  |
| 7   | `x^2-9`                  | `(x + 3) (x - 3)`                 | inchangé              | `(x + 3) (x - 3)`                             | inchangé                 | `multiple {3 ; -3}`                        | pas de produit                             | `(x + 3)/1`        | `(x + 3)/1`             | `(x + 3) (x - 3)`       |
| 8   | `4x^2-25`                | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {5/2 ; -5/2}`                    | pas de produit                             | —                  | —                       | `4 (x + 5/2) (x - 5/2)` |
| 9   | `x^2+6x+9`               | `(x + 3)^2`                       | `(x + 3)^2`           | `(x + 3)^2`                                   | inchangé                 | `unique {-3}`                              | pas de produit                             | —                  | —                       | `(x + 3)^2`             |
| 10  | `9x^2-12x+4`             | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `unique {2/3}`                             | pas de produit                             | —                  | —                       | `9 (x - 2/3)^2`         |
| 11  | `(2x+1)^2-(x-3)^2`       | `(3 x - 2) (2 x + 1 - (x - 3))`   | `3 x^2 + 10 x - 8`    | `((2 x + 1) + (x - 3)) ((2 x + 1) - (x - 3))` | inchangé                 | `multiple {2/3 ; -4}`                      | pas de produit                             | —                  | —                       | `null`                  |
| 12  | `3x^2+6x+3`              | `3 (x + 1)^2`                     | inchangé              | inchangé                                      | inchangé                 | `unique {-1}`                              | pas de produit                             | —                  | —                       | `3 (x + 1)^2`           |
| 13  | `2x^2-8`                 | `2 (x + 2) (x - 2)`               | inchangé              | inchangé                                      | inchangé                 | `multiple {2 ; -2}`                        | pas de produit                             | échec              | `(2 x + 4)/1`           | `2 (x + 2) (x - 2)`     |
| 14  | `x^2-5x+6`               | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {3 ; 2}`                         | pas de produit                             | échec              | `(x + (-3))/1`          | `(x - 2) (x - 3)`       |
| 15  | `2x^2+x-3`               | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {1 ; -3/2}`                      | pas de produit                             | échec              | `(2 x + 3)/1`           | `2 (x + 3/2) (x - 1)`   |
| 16  | `x^2-2`                  | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {√2 ; -√2}`                      | pas de produit                             | —                  | —                       | `null`                  |
| 17  | `x^2-2x-1`               | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {1 + √2 ; 1 - √2}`               | pas de produit                             | —                  | —                       | `null`                  |
| 18  | `x^2+x+1`                | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `no-real-solution {}`                      | pas de produit                             | —                  | —                       | `negative-discriminant` |
| 19  | `x^3-6x^2+11x-6`         | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {1 ; 2 ; 3}`                     | refus `UnsupportedEquationDegree`          | échec              | `(x^2 + (-5 x) + 6)/1`  | `null`                  |
| 20  | `x^3-8`                  | `(x - 2) (x^2 + 2 x + 4)`         | inchangé              | `(x - 2) (x^2 + 2 x + 4)`                     | inchangé                 | `unique {2}`                               | refus `UnsupportedEquationDegree`          | échec              | `(x^2 + 2 x + 4)/1`     | `null`                  |
| 21  | `x^3+x^2+x+1`            | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `unique {-1}`                              | refus `UnsupportedEquationDegree`          | —                  | —                       | `null`                  |
| 22  | `ax+ay`                  | `a (x + y)`                       | inchangé              | inchangé                                      | inchangé                 | `unique {-y}`                              | pas de produit                             | —                  | —                       | `null`                  |
| 23  | `x^2-y^2`                | `(x + y) (x - y)`                 | inchangé              | `(x + y) (x - y)`                             | inchangé                 | `multiple {\|y\| ; -\|y\|}`                | refus `PedagogicalQuadraticNotImplemented` | —                  | —                       | `literal-roots y, -y`   |
| 24  | `\sin^2x-\cos^2x`        | `(cos x + sin x) (sin x - cos x)` | `-cos x^2 + sin x^2`  | `(sin x + cos x) (sin x - cos x)`             | inchangé                 | `no-solution {} (non supporté)`            | refus `UnsupportedEquationDegree`          | —                  | —                       | `null`                  |
| 25  | `\sin x\cos x+\sin x`    | `(cos x + 1) sin x`               | `cos x sin x + sin x` | inchangé                                      | `(cos x + 1) sin x`      | `multiple {0 ; π}` via `(cos x + 1) sin x` | refus `UnsupportedEquationDegree`          | —                  | —                       | `null`                  |
| 26  | `\frac{x^2-1}{x-1}`      | `x + 1`                           | `x + 1`               | `((x + 1) (x - 1))/(x - 1)`                   | inchangé                 | `unique {-1}`                              | refus `UndevelopedLinearForm`              | `(x + 1)/1`        | `(x + 1)/1`             | `null`                  |
| 27  | `\frac{x^2-5x+6}{x-2}`   | inchangé                          | `x - 3`               | inchangé                                      | inchangé                 | `unique {3}`                               | refus `UndevelopedLinearForm`              | échec              | `(x + (-3))/1`          | `null`                  |
| 28  | `\frac{x^2-1}{x+1}`      | `x - 1`                           | `x - 1`               | `((x + 1) (x - 1))/(x + 1)`                   | inchangé                 | `unique {1}`                               | refus `UndevelopedLinearForm`              | échec              | refus                   | `null`                  |
| 29  | `x^4-1`                  | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `multiple {1 ; -1}`                        | refus `UnsupportedEquationDegree`          | échec              | `(x^3 + x^2 + x + 1)/1` | `null`                  |
| 30  | `x+1`                    | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `unique {-1}`                              | pas de produit                             | —                  | —                       | `null`                  |
| 31  | `x^2+1`                  | inchangé                          | inchangé              | inchangé                                      | inchangé                 | `no-real-solution {}`                      | pas de produit                             | —                  | —                       | `negative-discriminant` |

Expressions passées aux colonnes limites : ligne 1 `(6x+9)/(x+3/2)` en −3/2 ; 2, 3, 5 `e/x` en 0 ;
6 `e/(x+1)` en −1 ; 7 `e/(x−3)` en 3 ; 13, 14, 27 `…/(x−2)` en 2 ; 15, 19, 26, 29 `…/(x−1)` en 1 ;
20 `e/(x−2)` en 2 ; 28 `(x²−1)/(x+1)` en −1.

## 3. Constats

### 3.1 Divergences (même expression, rendus différents selon le lieu)

1. **Trinôme à racines rationnelles** (lignes 14, 15) : `factoriser`, `simplify`, `factorAlgebraic`
   le laissent ; `factorQuadratic` rend `(x−2)(x−3)` et `2(x+3/2)(x−1)` ; la limite péda divise par
   `(x − a)` ; `solve` et `pedagogical-solve` donnent les racines **sans jamais écrire le produit**.
   Aucune voie à étapes ne factorise un trinôme par ses racines (aucune règle « trinôme » dans
   `pattern/rule-sets/`, confirmé par le relevé 1.B).
2. **Coefficient dominant carré ≠ 1** (lignes 8, 10) : les identités ne voient pas `4x² = (2x)²`
   (`factoriser` inchangé) ; `factorQuadratic` rend une forme ℚ non scolaire
   `4(x+5/2)(x−5/2)`, `9(x−2/3)²` au lieu de `(2x+5)(2x−5)`, `(3x−2)²`.
3. **`3x^2+6x`** (ligne 2) : `3x(x+2)` (`factoriser`), `x(x+2)` après division par 3
   (`pedagogical-solve`), `3(x+2)x` (`factorQuadratic`, la racine 0 en dernier).
4. **Fraction rationnelle** : `\frac{x^2-5x+6}{x-2}` (ligne 27) → `x − 3` par `simplify` (PGCD de
   `normalize`, B8), **inchangé** par `factoriser` (pas de `normalize`, pas de règle trinôme) ;
   `\frac{x^2-1}{x\mp1}` (26, 28) → `x ± 1` par `factoriser`, mais ses étapes ne comptent que
   `diff-squares-numeric` : la **simplification** du quotient est faite en silence par `tidy`
   (facteurs semblables, `tidy-spec.md` §A étape 6).
5. **Ordre dans les facteurs** (ligne 24) : `factoriser` rend `(cos x + sin x)(sin x − cos x)`,
   `factorAlgebraic` `(sin x + cos x)(sin x − cos x)` — `tidyWithoutReordering`
   (`pipeline.ts:443`) garde l'ordre des facteurs mais `tidy` réordonne les termes **dans** chaque facteur.
6. **Facteur non réduit** (ligne 11) : `factoriser` rend `(3x−2)(2x+1−(x−3))` — `tidy` ne distribue
   pas le `−` (« jamais développer ») ; `factorAlgebraic` laisse les deux facteurs non réduits.
7. **`simplify` factorise parfois** : `x^2+6x+9` → `(x+3)²` (ligne 9, `algebraicSimplifyRules` sous
   barrière de coût, `simplify/simplify.ts:72`), mais pas `x^2-9` (coût), et il **développe**
   `(x+1)^2-(x+1)` → `x² + x` (ligne 5).
8. **Puissances composées et regroupement** : `x^4-1` (29) n'est factorisé par aucune voie AST
   (`x⁴` n'est pas vu comme `(x²)²`) ; `x^3+x^2+x+1` (21) par aucune voie ;
   `x^3-6x^2+11x-6` (19) seulement par la limite péda (Horner en la racine donnée) — la recherche
   exacte des racines rationnelles n'existe que dans `domain/exact-roots.ts` (B10), sans produit.
9. **Racines irrationnelles** (16, 17) : aucune voie ne rend `(x−√2)(x+√2)` ; `solve` donne
   `±√2`, `1 ± √2` exacts ; `factorQuadratic` rend `null` (ℚ seulement).
10. **Limites, deux implémentations** : `tryFactorization` (A7) échoue sur tout sauf `x²−a²` exact
    (lignes 13, 14, 15, 19, 20, 29 : échec ; 7, 26 : succès) ; la limite péda (B3) réussit sur
    tous les polynômes ayant la racine. **Les deux refusent un point d'approche négatif** (lignes
    1, 6, 28) : `−1` est un `opposite(number)` (invariant 1) et toutes deux testent
    `isNumber(approach)` (`limits/algebraic.ts:93`, `pedagogical-limits/pipeline.ts:381`).
    La limite péda écrit `(x + (−3))/1`, `(4x² + (−2x))/1` (`polyToNode` brut, dénominateur 1 gardé).
11. **Niveau scolaire** : `college` ≡ `lycee` sur les 31 lignes ; le niveau ne règle que les
    identités trigo et ln/exp (`pipeline.ts:65-82`). `sin²x − cos²x` est factorisé au collège
    (`diff-squares-symbolic` n'est pas gardé par le niveau).
12. **Facteur commun à gauche / soustraction** : `commonFactorRules` seul ne voit ni
    `x·eˣ − eˣ` (soustraction) ni `(x+1)(x−2) + (x+1)(2x+3)` (facteur commun à gauche) ; ces deux
    lignes sont factorisées par `factoriser` grâce aux règles de **contenu** (A2), et par `solve`
    grâce à `negatedTermAsProduct` / `sumWithExposedCommonFactor`.

### 3.2 Ce qui est mort (aucun appelant hors tests, grep `src/` `.ts` + `.svelte`)

- `transform/` entier : `factorAlgebraic`, `expandAlgebraic`, `applyAlgebraicIdentities`,
  `factorize`, `factorizeH`… (déjà dit dans le README mathAST, re-mesuré).
- `trigFactorizationRules` (`trig-identities.ts:456`) et `hypFactorizationRules`
  (`hyperbolic-identities.ts:411`) : atteints seulement par `transform/` et par `allTrigRules` /
  `allHyperbolicRules`, lus seulement par `transform/`.
- `analysis/structures.ts` : `isQuadraticForm` :505, `isFactoredForm` :553, `hasCommonFactor` :654,
  `detectStructure` :798 (ré-exportés, jamais appelés).
- `sign/helpers/interval-sign.ts:469` `analyzePolynomial` (« for future use », ré-exporté).
- `limits/algebraic.ts:167-172` : la branche « trinôme qui a `a` pour racine » calcule
  `valueAtA` puis rend `null` dans les deux cas.
- Faux amis morts : `checkFactorOne`, `checkFactorZero` (`questions/constraint-validators.ts:799, 855`).
- **Vivant dans le code, inutilisé dans les données** : le chemin `correction-generator` →
  `generatedSteps` (dont `intent: 'factoriser'`) — 0 modèle sur 1 005 en production (A11).
  Atteignables par l'élève : `.factoriser` de l'atelier (A10) et les démos.

### 3.3 Ce que chaque appelant attend vraiment (lu dans le code)

- **`solve`** : des **zéros** sur ℝ. Les polynômes passent par des formules (Δ, Cardano, forme
  trigonométrique, Ferrari, `extract-nth-root`) qui ne factorisent jamais (mesuré : aucune ligne
  polynomiale du panel ne montre un produit). La factorisation n'y sert qu'en **dernier recours**
  (A6) : un facteur commun non constant, pas forcément complet, chaque facteur étant ensuite
  résolu par `solve` (produit nul). Exactitude souhaitée mais pas garantie (B5 : décimal marqué exact).
- **`variations` / `sign`** : des zéros (via `solve`) et un signe par intervalle ; pour une somme,
  le signe vient de l'échantillonnage numérique (B13). Aucun appel ne demande une forme factorisée ;
  les tableaux pédagogiques se construisent depuis `(a, racines)`.
- **`limits`** : lever un `0/0` en un point **connu** `a` ; il suffit de sortir `(x − a)` de N et D
  (pas de recherche de racine). Algorithmique : stratégie 4, après L'Hôpital
  (`limits/evaluate.ts:997`). Pédagogique : étapes, lycée.
- **`integration`** : un **dénominateur** décomposé en facteurs linéaires sur ℚ (et quadratique
  irréductible → arctan), exact (`Rational`), pour les éléments simples (A8, B1) ; la version
  pédagogique (B2) se contente de flottants « rationnels ».
- **`domain`** : les zéros réels exacts d'un dénominateur (B10), multiplicités indifférentes.
- **`normalize`** (√, ln) : reconnaître un carré parfait pour écrire `|a ± b|`, `2 ln|a ± b|` (B6).
- **`pedagogical-simplify` / atelier** : des **étapes nommées** et expliquables ; le niveau ne
  joue que sur les identités ; l'atelier fixe `lycee` (`factor-steps.ts:118`) et doit pouvoir dire
  « je ne sais pas » (`inchangee`).
- **Correction des réponses** : aucun des 13 modèles « factoriser » en production ne fait calculer
  une factorisation par le moteur (`generatedSteps` absent partout) ; 2 contrôlent la forme de la
  réponse par `requiredForm` (motif), les 11 autres pas du tout (A11).

### 3.4 Algorithmique ou réécriture par motifs

| nature                                | lieux                                                                                                                                 | corps / nombres                                   | étapes          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------- |
| motifs `P.*` purs                     | A1 `commonFactorRules`, A3 identités, règles trigo/hyp de factorisation (mortes)                                                      | structure, sans corps                             | oui, nommées    |
| algorithme dans une règle             | A2 contenu (PGCD de monômes)                                                                                                          | ℚ (`Rational`, `bigint`)                          | oui, une        |
| algorithme + étapes écrites à la main | B3 limite péda (Horner), B4 `x(ax+b)`, A7 (une étape)                                                                                 | flottants (B3, A7), `MathNode` (B4)               | oui             |
| algorithme sans étape élève           | A8 `factorQuadratic`, B1, B8 PGCD de `normalize`, B9, B10 `exactRealRoots`, B6 carré parfait sur `NormalForm`, A6 voie `gcdMonomials` | ℚ exact (A8, B10), ℚ + radicaux (B6, B8)          | non / technique |
| racines numériques                    | B5 solveurs degré 3-4, B11 `preimage`, B2 intégration péda                                                                            | flottants (arrondis en fractions par heuristique) | non             |

La mise en facteur **par motifs** (A1, A3) ne dépend d'aucune variable ; les lieux
**algorithmiques** demandent tous une variable et un polynôme (A8, B3, B10, B8 univarié).

### 3.5 Écarts code ↔ doc (signalés, non corrigés)

- `atelier/factor-steps.ts:126-129` : « le module ne sait simplement pas extraire un facteur commun
  NUMÉRIQUE (mesuré le 2026-09-19) » — périmé : mesuré `6x+9` → `3(2x+3)` (A2, depuis le 2026-09-21).
- `pedagogical-simplify/intent-rules.ts:103-104` : la doc de `factoriser` cite
  « `algebraicFactoringRules` + identities » et omet `commonFactorRules` (pourtant en tête, :132)
  et la passe de contenu (pipeline).
- `questions/types.ts:1394` : « `'auto'` : `reduire` + unambiguous factoring/expansion only » —
  contraire à l'ADR 0007 (« `auto` ne factorise jamais »), écart déjà connu du README.
- `pattern/rule-sets/algebraic-identities.ts:219` : « Rules used by simplify pipeline — factoring
  only » : exact, mais ni `panel-simplifications.md` ni `tidy-spec.md` §B ne disent que `simplify`
  factorise un carré parfait (ligne 9 du panel ; le panel pinné le montre pour `x^2+2x+1` sans le
  commenter comme une factorisation).
- `limits/algebraic.ts:171` : commentaire « For now, return null » sur une branche morte.

### 3.6 Anomalies croisées en chemin (hors factorisation stricte)

- `solve(4x^3-2x^2 = 0)` rend `{0 ; 1/2 ; 0}` : racine 0 en double — `handleCubicWithCommonFactor`
  (`solve/solvers/polynomial.ts:916`) ajoute `x = 0` puis résout `4x² − 2x` (c = 0), qui redonne 0.
- `solve(\sin^2x-\cos^2x = 0)` : `no-solution`, « Type d'equation transcendante non supporte »,
  alors que l'intention `factoriser` trouve `(sin x + cos x)(sin x − cos x)` (ligne 24).
- `solve/solvers/polynomial.ts:1269-1274` : une racine décimale `toFixed(10)` est marquée `exact: true`.
- `limits/known-limits.ts:444` `export const structurallyEqual = nodesEqual;` : la valeur est
  copiée à l'évaluation du module ; dans le panel, un ordre d'imports donné a produit
  `TypeError: structurallyEqual is not a function` dans `generatePedagogicalLimitSteps`, disparu en
  important `pedagogical-limits` en premier. Non reproduit dans l'application (non mesuré).
- Littéraux de nœuds construits à la main hors `factory.ts` (invariant 3) :
  `analysis/structures.ts:683-698`, `limits/algebraic.ts:182` et `:755`.
- `algebraic-identities.ts:37` `squared()` calcule le carré d'un nombre par `parseFloat`.

## 4. Décisions (ADR 0024)

David a tranché le 2026-10-11 : [ADR 0024](../../../adr/0024-moteur-commun-de-factorisation.md),
acceptée, amende l'ADR 0007 pour l'intention `factoriser`.

- Un module `mathAST/factor/` en deux couches : un **noyau exact sur ℚ** sans étapes (contenu,
  racines rationnelles, Horner, carrés parfaits, Δ), puis des **stratégies qui racontent**
  (facteur commun, identités, racines du trinôme, racine évidente puis division) branchées sur
  `factoriser`.
- Racines irrationnelles au lycée seulement ; coefficients entiers dès que possible ; atteignable
  selon le niveau (collège : facteur commun et identités ; 1re : racines du trinôme ; terminale :
  racine évidente puis division) ; développer pour refactoriser en dernier recours, dans
  `factoriser` seulement.
- Lots, une PR chacun : noyau (aucun appelant changé) → stratégies sur `factoriser` → migration
  des appelants internes et suppression du code mort → V18.

## 5. Lot 1 — le noyau exact (2026-10-11)

> Worktree `feat/moteur-factorisation`. La branche a divergé d'origin/main (le commit de ce journal,
> `bfd07cedd`, n'y est pas) : `merge --ff-only origin/main` impossible, l'ADR 0024 a été lu par
> `git show origin/main:…`. **À faire avant la PR : intégrer origin/main** (sinon les deux liens
> vers l'ADR 0024 de `docs/systeme/mathast/README.md` sont cassés pour `docs:check-links`).

- [x] **Tests d'abord** : `src/lib/mathAST/factor/__tests__/factor-core.test.ts`, entrées LaTeX
      parsées, variable `x`, rendu LaTeX + `areEquivalent(rendu, entrée)` + aucun littéral négatif.
      Vus rouges : **44 / 44** contre un squelette d'API qui lève « non implémenté » (le module
      absent faisait échouer le fichier sans compter de test). Premier passage après
      implémentation : 42 / 44, les deux écarts étant l'écriture `\dfrac` de `toLatex` (attendus
      alignés). Trois cas ajoutés ensuite (47 au total) : Δ = 0 sur gros coefficients, radicande
      au-delà de la borne dans ℝ, Δ < 0 dans ℝ en deux cas ; le radicande vu rouge par mutation.
      La mutation du multiplicateur de la branche « racine double » ne rougit pas, et c'est
      attendu : par le lemme de Gauss il vaut 1 (commenté dans `factor.ts`).
- [x] **API** : `factorPolynomial(node, variable, { field?: 'Q' | 'R' }): Factorization | null`,
      `factorizationToNode(f): MathNode` (`factor/index.ts`).
- [x] **Réutilisé ou déplacé, aucune copie ajoutée** :
  - de `domain/exact-roots.ts` vers `factor/polynomial.ts` : `Poly`, `RationalFunction`,
    arithmétique, `deflate`, `integerCoefficients`, lecteur `toRationalFunction` (l'extracteur
    exact `Rational` le plus sûr des six) — à l'identique, renommages `trim` → `trimPoly`,
    `polyAdd` → `addPoly`… ;
  - de `domain/exact-roots.ts` vers `factor/rational-roots.ts` : `divisors` et la boucle ±p/q
    (`extractRationalRoots`), qui **garde les multiplicités** (l'ancien code les perdait au
    `dedupeSorted`, qui reste dans `domain`). Candidats dédoublonnés et rangés par hauteur, borne
    optionnelle : sans effet sur ce que rend `domain` (le quotient final et le multiset des
    racines ne dépendent pas de l'ordre des essais) ;
  - de `domain/exact-roots.ts` vers `factor/quadratic.ts` : l'analyse de Δ (`quadraticRootParts`
    rend les parties exactes ; `domain` écrit toujours ses bornes `(1+√5)/2` avec `surdNode`) ;
  - `squareFree` de `exact-roots.ts` **supprimé** au profit de `extractPerfectPower` et
    `integerNthRoot` (`normal/radical.ts`) : décomposition k²·m unique, donc même résultat ;
  - de `normal/rules/trig-multiple-arcs.ts` vers `factor/polynomial-node.ts` : `polynomialNode`,
    `monomialNode`, `integerNode` (le seul constructeur de polynôme du moteur qui écrit les
    négatifs en soustractions ; `pedagogical-limits/helpers.ts` `polyToNode` écrit `x + (-3)`) ;
  - `rationalToNode` (`common/numeric.ts`) pour la constante.
- [x] **`domain` strictement identique** : 19 fichiers de `domain/` + `trig-normal-form`,
      877 tests verts avant et après ; comparaison différentielle ancien / nouveau
      `exactRealRoots` (copie de l'ancien fichier hors dépôt, script `tsx`) sur 4 000 polynômes
      aléatoires (racines rationnelles multiples, x, trinômes de Δ quelconque, degré ≤ 8) :
      **0 différence**, nœuds LaTeX et valeurs compris.
- [x] **Bornes** : degré 8 (`MAX_FACTOR_DEGREE`, celle du lecteur : `null` au-delà) ;
      |a₀|, |aₙ| ≤ 10⁶ pour énumérer les diviseurs (`MAX_DIVISOR_SEARCH`) ; 1 000 candidats ±p/q
      (`MAX_RATIONAL_ROOT_CANDIDATES`, rangés par hauteur) ; radicande ≤ 10¹⁰ pour scinder dans ℝ
      (`MAX_RADICAND`). Au-delà : factorisation partielle, `complete = false`, jamais fausse. Un
      reste de degré 2 est toujours tranché exactement par Δ. Mesure : `(720720x−1)(x²+720720)`,
      plus de 7 000 candidats, coupé à 1 000 : 6 ms (test vitest, Mac mini M6) ; les 47 tests :
      24 ms de calcul.
- [x] **Ordre des facteurs** (pas une décision de produit, figé par les tests) : premier degré par
      |racine| croissante, racine positive d'abord ; irrationnels ; degré 2 ; reste. Seul écart
      avec le tableau du brief : `(2x+1)^2-(x-3)^2` → `(3x−2)(x+4)` (le brief écrivait `(x+4)(3x−2)`).
- [x] Vérifications : `pnpm test:server src/lib/mathAST/factor` 47/47 ; `pnpm test:server
src/lib/mathAST` une fois à la fin : 462 fichiers, 19 310 tests verts (9 ignorés, 3 todo),
      22 s ; `check:incremental` 0 erreur ; `types:cliquet` tenu (0 erreur, le nouveau test naît
      typé) ; `lint:fast` rien à signaler ; prettier sur les fichiers touchés seulement.
- [x] Doc : section « factor/ » de `docs/systeme/mathast/README.md` (carte, API, bornes, limites,
      place dans l'ADR), ligne de la carte des sous-dossiers, ADR 0024 dans les décisions. Le glob
      `src/lib/mathAST/**` couvre `factor/` ; `docs:check-a-jour --couverture` : 0.

**Limites assumées** (dans la doc) : pas de facteur de degré 2 cherché dans un reste de degré ≥ 3
(`x^8-1` → `(x−1)(x+1)(x⁶+x⁴+x²+1)`) ; pas de décomposition sans carré (`(x²+1)²` développé) ; dans
ℝ seul le degré 2 se scinde.

**Écarts code ↔ doc relevés en chemin (non corrigés)** :

- `domain/exact-roots.ts` : le `squareFree` supprimé faisait une division d'essai en √Δ sans borne
  (un Δ premier de l'ordre de 10¹⁴ = 10⁷ tours) ; `extractPerfectPower` est du même ordre (pas de 2).
  `domain` n'a toujours pas de borne sur ce calcul (inchangé, hors périmètre).
- `normal/rules/trig-multiple-arcs.ts` garde un `absBigInt` local, doublon de celui de
  `normal/rational.ts` (non touché).

## 6. Lot 2 — stratégies qui racontent (décisions de David, 2026-10-11)

Enchaînement, la suivante si la précédente ne factorise pas : 1 facteur commun · 2 identité remarquable
(coefficients compris) · 3 facteur commun puis identité · 4 racines du trinôme · 5 racine évidente puis
division · 6 développer pour refactoriser (dernier recours). Le noyau trouve, la stratégie raconte.

- **Q1** : `college` → stratégies 1, 2, 3, 6 ; `lycee` → toutes (1re et terminale non distinguées,
  chantier à part). Racines irrationnelles : lycée seulement (ADR 0024).
- **Q2** : trinôme → deux lignes, `a(x-x_1)(x-x_2)` puis la forme à coefficients entiers.
- **Q3** : un seul ordre des facteurs, celui du noyau, partout (`x^2-4` → `(x-2)(x+2)`).

- [x] **Tests d'abord** : `pedagogical-simplify/__tests__/factoriser-strategies.test.ts`, entrées
      parsées, collège et lycée, rendu LaTeX + `areEquivalent` (résultat ET chaque étape) + suite
      des règles + titres, atelier (`factorSteps` sur `4x^2-25`, `2x^2+x-3`). Vus rouges :
      **22 / 41** (les 19 verts sont les non-régressions : inchangés, plusieurs lettres, facteur
      commun). Deux cas ajoutés en chemin (`x^2e^x-4e^x`, `-x^2+5x-6`), vus rouges par mutation
      (3 échecs), restaurés d'une copie : 44 / 44.
- [x] **Implémentation** : `pedagogical-simplify/factor-strategies.ts` (enchaînement, produit en
      cours, réduction, Δ, racine évidente, stratégie 6 à tampon jeté) et
      `pedagogical-rules/polynomial-identities.ts` (identités par coefficients ; les quatre
      règles numériques remplacées, mêmes noms, dans `factoriser` seulement). `factor/` exporte
      `compareFactors` et `primitivePart`. ~680 lignes de code hors commentaires et tests
      (budget visé 600).
- [x] **Tests et snapshots changés (ordre du noyau, décision Q3)** : `atelier/…/factoriser-commande`
      (×3 + titre), `panel-simplifications` (`x^2-1`, et `x+x` → `2 x`), `facteur-commun-et-tidy`
      (`x^2-1`), `facteur-commun-non-polynomial` (×3 : `(x+1)(x+4)`, `(x+1)(x+2)`,
      `2(x+1)(x+3)`), `pipeline.test` (`x^2-4`), snapshot démo (4 titres qui nomment a et b,
      ordre de `x^2-4`).
- [x] **Corrigé en chemin** : le cycle `x(1-1)` / `x(1+1)` de `runPatternLoop` (README, points
      ouverts) pour `factoriser` — un nombre seul n'est plus « factorisé ».
- [x] Vérifications : tests ciblés ; `pedagogical-simplify`, `pattern`, `factor`, `atelier`,
      `questions/generator`, panel : 156 + 126 fichiers verts ; `pnpm test:server src/lib/mathAST`
      une fois : 463 fichiers, 19 354 tests verts ; `check:incremental` 0 ; `types:cliquet` tenu
      (0 erreur) ; `lint:fast` rien ; `docs:check-links`, `docs:check-refs` 0.
- [x] Doc : README mathAST (§ Les stratégies, état, point ouvert du cycle), panel, pattern-matching,
      atelier.
- [x] code-reviewer (commit 7fc7dcd53), corrections :
  - **bloquant** : a² − b² écrit constante devant (`9-x^2`, `1-x^2`, `-4x^2+9`, `-x^3+x`) ne se
    factorisait plus au collège et passait par Δ au lycée → reconnu par `polynomialIdentity`
    (`reversed`), rendu `(3-x)(3+x)` (a = 3, b = x), aux deux niveaux ;
  - stratégie 6 résumée en une étape `develop-to-factor` ; chaque étape part de la précédente
    (`reduce-factors` compris, facteur constant `(x+3)-x` réduit DANS l'étape) ; mise au propre
    finale dans la dernière étape ; parenthèses doubles retirées ; `x-x` → `0` ;
  - tests : 41 vus rouges (dont 27 invariants « avant(n+1) = après(n) ») sur 116 ; tous verts ;
    panel `x-x` (`x 0` → `0`) mis à jour ; `pnpm test:server src/lib/mathAST` : 463 fichiers,
    19 426 tests verts ; `check:incremental` 0 ; cliquet tenu ; `lint:fast` rien.
- [ ] PR

## 7. Lot 3a — limites et intégration par le noyau (2026-10-11)

> Worktree `ubumaths-wt-factorisation`, branche `refactor/factorisation-appelants` (base `7bf061329`).
> Hors périmètre (lot 3b) : `transform/` et détecteurs morts, doublons de PGCD et d'extracteurs,
> `normalize` (ADR 0006), `solve`.

- [x] **Noyau, ajouts** : `toPolynomial` et `divideOutRoot` (`factor/polynomial.ts`),
      `rationalPolynomialNode` et `linearFactorNode` (`factor/polynomial-node.ts`, ce dernier
      déplacé de `integration/integrators/quadratic-denominator.ts`, où il s'appelait `linearFactor`) ;
      `factorPolynomial` lit désormais par `toPolynomial`.
- [x] **A7 `limits/algebraic.ts`** : `tryFactorization` sort (x − a)^k de N et D par
      `divideOutRoot` (k = la plus petite multiplicité), a lu par `extractExactRational` : L26
      corrigé, point fractionnaire accepté. Supprimés : `tryFactorLinear`, sa branche morte
      (:167-172), `evaluateSimple`, le `variable()` qui fabriquait un littéral. La factorisation
      passe désormais devant la porte `isNumber(approach)` (rationalisation et |·| restent derrière).
- [x] **B3 limite pédagogique** : `divideByCommonRoot` (helpers) pour la factorisation ET la
      rationalisation ; une racine par passe, mêmes étapes, mêmes titres. `syntheticDivide`,
      `buildLinearFactor`, `isPolynomialRoot` supprimés ; `formatLinearFactor` prend un `Rational`
      (`(x − 1/2)`). Substitution directe, limites à un côté, gendarmes : point négatif accepté
      (`approachNumber`), sinon la récursion après factorisation échouait en −3.
- [x] **A8 `quadratic-denominator.ts`** : `factorQuadratic` lit le trinôme par `toPolynomial` et
      tranche par `quadraticRootParts` (plus de Δ ni de `bigintSqrt` à lui ; `rationalSqrt` passe
      par `integerNthRoot`). `factoredDenominator` garde l'écriture unitaire `a(x − r₁)(x − r₂)`
      (sur `linearFactorNode`) : `factorDenominator` (B1) ne lit pas `(2x − 1)`, la forme entière
      de `factorizationToNode` aurait changé ou cassé la décomposition.
- [x] **B2 `pedagogical-integration/_helpers.ts`** : même besoin (racines rationnelles d'un
      trinôme), donc migré : `toPolynomial` + `quadraticRootParts`, A et B exacts par `evalPoly` ;
      `quadraticCoefs` et `isRationalLike` supprimés. `PartialFractionsMatch` en `Rational`
      (champ `aQ`, jamais lu, retiré). Écriture : `\frac{3}{2(x-1)}`, signe dehors, `x + 1`.
- [x] **Tests d'abord** (4 fichiers, 40 tests) : vus rouges **23 / 40** contre les six fichiers
      appelants d'origine (`git show HEAD:…`, copies restaurées ensuite) ; les 17 verts sont les
      non-régressions (rendus figés des primitives, limites complètes déjà justes par L'Hôpital).
      Verts après : 40 / 40.
- [x] **Panel de non-régression** : les appels de `evaluateLimit`, `integrate`,
      `generatePedagogicalLimitSteps`, `generatePedagogicalIntegrationSteps` faits par les tests de
      `limits`, `pedagogical-limits`, `integration`, `pedagogical-integration` enregistrés
      (`vi.mock` temporaire dans `vitest-setup-server.ts`, restauré d'une copie), 4 172 entrées
      distinctes, rejouées avant / après (sortie déterministe vérifiée) : **35 différences**, aucune
      sur `evaluateLimit` ni `integrate` ; valeurs, statuts et suites de règles identiques partout.
      31 limites pédagogiques : `\dfrac{x + 2}{1}` → `x + 2`, `(x - 2) 1` → `x - 2`,
      `\dfrac{1}{1(\sqrt{x+1}+1)}` → `\dfrac{1}{\sqrt{x+1}+1}` ; 4 intégrations pédagogiques :
      décimaux → fractions, `x - (-1)` → `x + 1`, et une primitive qui s'écrivait
      `\dfrac{16666666666666667 \ln|x-1|}{10^{16}}` → `\dfrac{5\ln|x-1|}{3}`.
- [x] Vérifications : 4 dossiers + `factor`, `questions`, `atelier`, `domain`, `normal` : 359
      fichiers verts ; `pnpm test:server src/lib/mathAST` une fois : 474 fichiers, 20 128 tests
      verts ; `check:incremental` 0 ; `types:cliquet` tenu (0) ; `lint:fast` 0 erreur.
- [x] Doc : README mathAST (§ Les appelants migrés, carte du code, état) ; L26 retiré de
      `ecarts-a-trier.md`.

**Écarts relevés en chemin (non corrigés)** :

- ~~`pedagogical-limits/renderer.ts` écrit `\lim_{x \to 2} x + 2` sans parenthèses~~ : corrigé
  dans ce lot (une somme sous `\lim` est parenthésée ; test vu rouge 2 / 3, snapshot de la démo,
  6 cas). Le `toLatex` commun (`latex-generator.ts` `generateLimit`) a le même défaut sur un
  `LimitNode` : `\lim_{x\to 2}x+2` est rendu `\lim_{x \to 2} x + 2` (non corrigé, rayon large).
  `limits/` n'écrit aucun `\lim` lui-même.
- Reportés dans `ecarts-a-trier.md` sous K21 : V21 (substitution en flottants), V22 (phrase
  `decompose-rational`), L28 (nœud fabriqué à la main), M21 (`isRootAt`).
- `pedagogical-limits/helpers.ts` `isRootAt` : aucun appelant hors tests (mort avant ce lot).
- `limits/algebraic.ts:656` (`tryAbsSimplification`) fabrique encore `{ type: 'number' }` à la
  main.
- La substitution directe pédagogique calcule en flottants : « La limite vaut 1.5 », `-0.25`.
- `pedagogical-integration/descriptions-fr.ts` (`decompose-rational`) annonce
  `Q(x) = (x − r₁)(x − r₂)` sans le coefficient dominant (faux pour `4x² − 1`).

## 8. Lot 3b — le ménage (2026-10-11)

> Worktree `ubumaths-wt-factorisation`, branche `refactor/factorisation-menage` (base `04c2a6c49`).
> Interdits respectés : rien de `normal/` ni de `solve/` n'est modifié.

- [x] **Preuve d'absence d'appelant, AVANT suppression** (`src/`, `scripts/`, `tests/`, `.ts`,
      `.svelte`, `.js`, `.json`, chaînes comprises) :
  - `grep -rnE "from ['\"][^'\"]*/transform(/[^'\"]*)?['\"]"` hors `transform/` : **0** ; chacun
    des 26 noms exportés par `transform/` (`factorAlgebraic`, `applyTrigIdentities`,
    `TRANSFORM_*`…) en `grep -w` hors du dossier : 0, sauf `factorize` (`ciphers/rsa.ts`, autre
    fonction) et `linearize` (chaîne `'linearize-trig'`, autre chose) ;
  - `trigFactorizationRules`, `hypFactorizationRules`, `allTrigRules`, `allHyperbolicRules` :
    lus seulement par leur fichier, le baril `rule-sets/index.ts` et `transform/` ; le baril
    `rule-sets` n'est importé que pour d'autres noms (`intent-rules.ts`, `pattern/index.ts`,
    `pattern/__tests__/integration.test.ts`) ; les noms de règles `sin-plus-sin`… ne paraissent
    que dans `RULE_CATEGORY_MAP` (`intent-rules.ts`), retirés avec elles ;
  - `isQuadraticForm`, `isFactoredForm`, `hasCommonFactor`, `detectStructure` : leur fichier,
    `analysis/index.ts`, `mathAST/index.ts`, `analysis/__tests__/structures.test.ts` et deux
    commentaires (`common-factor.ts`, `facteur-commun.test.ts`) ; aucun import de `$lib/mathAST` ;
  - `analysis/polynomial-analysis.ts` (`analyzePolynomial`, `getPolynomialCoefficients`,
    `isMonomial`, `isBinomial`, `isTrinomial`, `getTermCount`, types) : seul lecteur
    `isQuadraticForm`, puis les barils et son test → mort une fois celui-ci retiré ;
  - `sign/helpers/interval-sign.ts` `analyzePolynomial` : ré-exporté par `sign/helpers/index.ts`
    et `sign/index.ts`, importé par personne (`mathAST/index.ts` ré-exporte celui d'`analysis/`) ;
  - `isRootAt` : sa définition et `pedagogical-limits/__tests__/helpers.test.ts`.
  - Après : le même grep des 22 noms supprimés rend **1** ligne, le commentaire d'en-tête de
    `structures.ts` qui dit qu'ils ont été retirés.
- [x] **Supprimé** : `transform/` (7 fichiers, 2 901 lignes dont 1 967 de tests) ;
      `analysis/polynomial-analysis.ts` + son test (712) ; dans `structures.ts` les quatre
      détecteurs, `gcd`, `extractLeadingCoefficient`, `divideByCoefficient`, trois types (et les
      littéraux `{ type: 'number' }` fabriqués à la main de `hasCommonFactor`) ; les règles
      somme → produit et les deux agrégats (−170 lignes) ; `analyzePolynomial` de `sign/` ;
      `isRootAt` et ses 4 tests. Diff de `src/` : **+32 / −4 487** (27 fichiers), docs à part.
- [x] **Doublons** :
  - **Δ sur ℚ** : fusionné — `discriminant(a, b, c)` exporté par `factor/quadratic.ts`, lu par
    `quadraticRootParts` et `analyzeTrinomial` (stratégies), qui le recalculait en `bigint`.
  - **PGCD de monômes** : 3 → 2 (`hasCommonFactor` supprimé). Gardés : le contenu de
    `common-factor.ts` (écriture non développée, facteurs non polynomiaux, PGCD entier
    seulement, ordre d'écriture conservé) et `gcdMonomials` de `normal/` (forme normale, chemin
    du décideur, interdit). Les fusionner changerait l'ordre des facteurs rendus
    (`sortSymbolicFactors`).
  - **Carré parfait** : 3 gardés — `isPerfectSquareTrinomial` (symbolique, plusieurs lettres,
    `simplify` / `auto`), `polynomialIdentity` (coefficients entiers, lot 2),
    `tryFactorPerfectSquareTrinomial` (`normal/`, décideur, interdit).
  - **Divisions** : 4 → 3 (`syntheticDivide`, lot 3a). Gardés : `deflate` / `divideOutRoot`
    (noyau), `divideUnivariate` et `exactDividePolynomials` (`normal/`, interdits).
    `partial-fractions.ts` `polynomialDivision` n'est pas une division de plus : il appelle
    `divideUnivariate`.
  - **Extracteurs** : 6 → 4 (`quadraticCoefs` au lot 3a ; `analyzePolynomial` d'`analysis/`,
    mort, supprimé). Gardés : le noyau ; `asPolynomial` (`pedagogical-limits`, flottants, degré
    non borné, `x^{-1}` refusé, toute parenthèse transparente : `toPolynomial` changerait le
    domaine lu, donc pas « strictement identique ») ; `toUnivariateView` (`normal/`) ;
    `extract*Coefficients` (`solve/`, interdits).
  - **Δ ailleurs**, gardés : `MathNode` affiché (`pedagogical-solve/quadratic.ts`
    `computeDiscriminantValue`, `solve/solvers/quadratic.ts`), flottants sur coefficients
    décimaux (`domain/preimage.ts` ×2, `solve/solvers/polynomial.ts`, `quartic.ts` ×2), et la
    CLI (`cli/commands/solve.command.ts:757`, chaîne reparsée).
- [x] **Panel de non-régression** (méthode du § 7) : enregistrement par `vi.mock` temporaire
      dans `vitest-setup-server.ts` (restauré d'une copie) des appels à `simplify`,
      `generatePedagogicalSimplifySteps`, `categorizeRule`, `analyzeSign` (`sign/`),
      `generatePedagogicalLimitSteps`, `factorPolynomial`, `quadraticRootParts`, `computeDomain`,
      `integrate`, `generatePedagogicalIntegrationSteps` faits par les tests de `pattern`,
      `simplify`, `pedagogical-simplify`, `analysis`, `sign`, `pedagogical-limits`, `factor`,
      `domain`, `integration`, `pedagogical-integration`, `transform`, `atelier` (219 fichiers,
      7 361 tests verts) : **3 030 entrées distinctes**, rejouées deux fois avant (sortie
      identique, 5,9 Mo) puis après : **0 différence** (`cmp`).
- [x] Vérifications : les mêmes dossiers après, 215 fichiers / 7 094 tests verts (4 fichiers de
      test supprimés) ; `src/lib/questions` + `src/lib/grapheur` 138 fichiers verts ;
      `pnpm test:server src/lib/mathAST` une fois : 470 fichiers, 19 864 tests verts (9 ignorés,
      3 todo) ; `check:incremental` 0 (`FORCE=1`) ; `types:cliquet` tenu (0) ; `lint:fast` rien ;
      `docs:check-refs --strict`, `docs:check-links`, `docs:check-a-jour` : 0.
- [x] Doc : README mathAST (carte, état, § Le ménage, points ouverts), `pattern-matching.md`
      (jeux trigo / hyperboliques) ; `ecarts-a-trier.md` : M21 retiré, M10 réduit.

**Écarts relevés en chemin (non corrigés)** :

- Hors factorisation, morts eux aussi depuis la suppression de `transform/` : les familles
  trigonométriques et hyperboliques autres que pythagoriciennes et quotients
  (`trigDoubleAngleRules`, `trigCofunctionRules`, `hypAdditionRules`…, ~20 jeux) n'ont plus
  d'appelant hors de leur fichier et du baril (un test lit `trigPythagoreanRules`). Laissés :
  pas de la factorisation. Leurs noms restent dans `RULE_CATEGORY_MAP`.
- `analysis/structures.ts` `numericPerfectSquareRoot` / `numericPerfectCubeRoot` fabriquent
  encore `{ type: 'number' }` à la main (invariant 2), et calculent par `parseFloat`.
- Une douzaine de PGCD d'entiers locaux (`cosmetic-transforms.ts`, `numtype/rules/power.ts`,
  `analysis/periodicity.ts`, `pattern/rule-sets/trig.ts`, `integration/odd-roots.ts`,
  `integration/ln-constant.ts`, `common/variable-powers.ts`…) à côté de `gcd` de
  `normal/rational.ts` ; hors de l'inventaire de la factorisation.
- `pedagogical-solve/quadratic-inequality.ts:252-255` recopie toujours `buildCZeroCaseSteps`
  (B4).

## 9. Lot 4 — V18, écriture des primitives (décision de David, 2026-10-11)

« oui, go lot 4 » : quand tous les termes d'une primitive portent la même exponentielle, l'étape
« On simplifie » développe puis met l'exponentielle en facteur, par les stratégies du lot 2
(`(x^2-2x+2)e^x`, `(x-1)e^x`, `\dfrac{1}{2}(\sin x-\cos x)e^x` pour V17). Sans exponentielle
commune, forme développée et rangée. Coefficients fractionnaires : `\left(\dfrac{x}{2}-\dfrac{1}{4}\right)e^{2x}`
accepté pour l'instant.

- [x] **Tests d'abord** : `pedagogical-integration/__tests__/primitive-ecriture.test.ts`, bloc
      « exponentielle commune » (entrées parsées, lycée et supérieur, rendu final + `toLatex` de la
      primitive, F′ = f par `areEquivalent(differentiate(F), f)` sur la primitive, la ligne brute,
      la développée et la factorisée, chaînage des étapes, ligne développée affichée, non-régressions
      ∫x cos x, ∫3x cos x, ∫ln x, ∫e^{2x}, ∫3e^{2x}, intégrales définies ∫₀¹xeˣ = `1`,
      ∫₀¹x²eˣ = `e - 2`, ∫₀¹3xe^{2x}). Vus rouges : **32 / 39** (les 7 verts sont les
      non-régressions) ; ∫xe^{2x}, ∫xe^{-x}, ∫3xe^{-2x} levaient `NotImplemented`.
- [x] **Implémentation** : `pushSimplifyStep` → `factorCommonExponential` (`developper` puis
      `factoriser` de pedagogical-simplify ; exposants comparés par `areEquivalent`, car `-2x` est
      `opposite(2)·x` ou `opposite(2·x)` selon l'auteur) ; rendu brute = développée = factorisée ;
      explication « On développe, puis on met e^{u} en facteur. ». L'IPP accepte `e^{ax+b}`
      (`isAffineOf`, `_helpers.ts`) — nécessaire pour ∫xe^{2x} et ∫xe^{-x}.
- [x] **Relevés** : ∫x²eˣ → `(x^2-2x+2)e^x` ; ∫3x²eˣ → `3(x^2-2x+2)e^x` ; ∫xeˣ → `(x-1)e^x` ;
      ∫xe^{2x} → `\left(\dfrac{x}{2}-\dfrac{1}{4}\right)e^{2x}` ; ∫eˣ sin x (V17) →
      `\left(\dfrac{\sin x}{2}-\dfrac{\cos x}{2}\right)e^x` (le ½ n'est pas sorti : V17 réduit,
      pas retiré) ; ∫xe^{-x} → `-(x+1)e^{-x}` ; ∫3xe^{-2x} →
      `-\left(\dfrac{3x}{2}+\dfrac{3}{4}\right)e^{-2x}` ; ∫x³eˣ → `(x^3-3x^2+6x-6)e^x` ;
      ∫(2x+1)eˣ → `(2x-1)e^x`.
- [x] **Snapshot changé** : démo `parts-simple` ∫xeˣ (×4 rendus) — nouvelle étape « On simplifie »,
      primitive `(x-1)e^x`.
- [x] Vérifications : pedagogical-integration, integration, pedagogical-simplify (44 fichiers,
      2 083 tests), atelier (100 fichiers, 2 025 tests) ; `pnpm test:server src/lib/mathAST
src/lib/questions/generator` une fois : 498 fichiers, 20 745 tests verts ;
      `check:incremental` 0 ; `types:cliquet` tenu (0 erreur, fichier existant) ; `lint:fast` rien.
- [ ] code-reviewer · [ ] PR
