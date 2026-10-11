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
