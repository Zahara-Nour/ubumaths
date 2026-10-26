---
couvre:
  - 'src/lib/mathAST/tidy/**'
---

# `tidy()` — la mise au propre sans développement

`tidy(node, options?)` (`src/lib/mathAST/tidy/`) met une expression au propre :
AST en entrée, AST en sortie. `normalize` reste le seul juge de
l'**équivalence** ; `tidy` décide de l'**écriture**. Elle sert partout où l'on
affiche une expression calculée (§G.2) — mais **pas** à la validation des
réponses (§G.3).

> Né de la phase 0 du 2026-09-20 (relevé :
> [simplify-reecriture-releve.md](../../archive/wip/simplify-reecriture-releve.md)).
> Réécrit d'après le code le 2026-10-20 : tout ce qui suit est codé, les
> exemples sont mesurés. Les lettres de section (§A–§F) sont citées dans le
> code : ne pas les renuméroter.

## 0. Les décisions fondatrices (David, 2026-09-20)

1. **Deux formes canoniques.** `normalize` garde son rôle : elle développe et
   **décide l'équivalence**. Une nouvelle fonction, **`tidy`**, met une
   expression au propre **sans jamais développer** ; c'est elle que `simplify`
   utilise. Le principe vient de la forme canonique du Compute Engine (mesurée
   dans le relevé), pas son code : leurs `Terms` ratent `x+x` et `x²+x²`.
2. **Les grandeurs sont équivalentes à conversion près** : `12000 m ≡ 12 km`,
   `20 °C ≡ 293,15 K`. C'est `normalize` qui convertit en unités de base.
3. **`simplify` écrit une grandeur numérique dans l'unité adaptée à son ordre
   de grandeur**, en décimal, comme le mode `best` de `evaluateWithUnits`
   (`12000 m → 12 km`, `3600 s → 1 h`) — révisé : unités scolaires (§D.3).
4. **Ce qui entre dans `tidy` : quatre tests** (David, 2026-10-22, chantier simplify-carte, S1-S4 ;
   [ADR 0032](../../adr/0032-la-forme-affichee-se-choisit-par-le-but.md)). Une réécriture n'entre
   dans `tidy` que si elle passe les quatre :
   1. **elle enlève sans transformer** — ni développement, ni factorisation, ni changement de
      registre (un décimal reste décimal, §A.3 ; unités et notation scientifique gardées) ;
   2. **elle est préférée quel que soit le but** — aucun contexte ne voudrait l'autre forme
      (`1 − sin²x → cos²x` échoue : dépend du but) ;
   3. **elle garde le domaine** — sinon seulement sous hypothèse déclarée (`typeCtx`, `domain`,
      ADR 0012) : `x/x` reste (§A) ;
   4. **elle ne cache aucune leçon** — `tidy` est appliqué en silence à chaque étape affichée :
      les identités qu'on enseigne (`ln(eˣ) → x`, `sin²+cos² = 1`, `√(x²) = |x|`, valeurs
      remarquables) vont dans `réduire`, avec une étape nommée.

   Reste à `tidy` : l'arithmétique et la structure — parenthèses et signes inutiles, neutres,
   absorbants, termes semblables, calculs numériques, fractions numériques, ordre (§A). Les
   gardes que les appelants recopiaient autour de `tidy` (« le réécrirait en fraction »,
   « simplifierait `x/x` »…) étaient exactement ses écarts à cette définition : elles ont disparu.

---

## A. `tidy(node): MathNode` — le contrat

AST en entrée, AST en sortie, pas de représentation intermédiaire (comme la
forme canonique du Compute Engine, qui est une expression).

**Invariants** :

- **Valeur conservée** : `areEquivalent(tidy(x), x)` est vrai pour toute
  expression sans unité.
- **Idempotent** : `tidy(tidy(x))` est structurellement égal à `tidy(x)`.
- **Jamais de développement, jamais de factorisation** : `(x+1)²` reste
  `(x+1)²`, `x(x+1)` reste `x(x+1)`, `x²+x` reste `x²+x`. Une parenthèse que
  la priorité impose compte comme écrite, même sans nœud de parenthèse (arbre
  construit par le moteur : règle du quotient, substitution) : `a − (b + c)`
  et `−(b + c)` gardent leur signe devant la parenthèse, `x(2x+1) − (x²+x+1)`
  reste (Q40, lot 5f-1 ; `withImpliedParentheses`, `tidy/index.ts`).
- **Jamais de changement de domaine** (S3, David, 2026-10-23) : une base ne
  se simplifie entre numérateur et dénominateur que si elle **reste au
  dénominateur** (`x/x² → 1/x`, `(x+1)²/(x+1)³ → 1/(x+1)`) ou **ne peut pas
  s'annuler** (`eˣ/eˣ`, `2ˣ/2ˣ`, `(x²+1)/(x²+1) → 1` ; `tidy/sign.ts`). Sinon
  elle reste des deux côtés de la barre, seuls les nombres se simplifient :
  `x/x`, `x²/x`, `√x/√x` inchangés, `(2x)/(4x) → x/(2x)`,
  `(−x−1)/(x+1) → −(x+1)/(x+1)`. Exception gardée : `x⁰ → 1` (convention des
  polynômes). Une base passée sous deux barres compte comme au dénominateur
  (`1/(1/x)`, `2/(1/x)`, `1/x⁻¹` : les deux inversions se compensent) : le
  terme reste une fraction à barres empilées, son numérateur et chaque
  dénominateur mis au propre (`2·3/(1/x) → 6/(1/x)`, `1/x⁻¹ → 1/(1/x)` ;
  `keepsUnderBar`, `collect.ts` ; tidy-conditions § 4.3, Q4, David 2026-10-26 :
  pas `x²/x`). Deux termes gardés ne se regroupent pas (`1/(1/x) + 1/(1/x)`
  reste) ; `tidyWithConditions` rend `x`, pour x ≠ 0 (`2x` pour la somme). De même, des termes semblables de somme nulle ne disparaissent
  que s'ils sont définis partout (David, 2026-10-24 ; `definedEverywhere`,
  `tidy/sign.ts`) : `x − x`, `eˣ − eˣ`, `ln(x²+1) − ln(x²+1)` → `0`, mais
  `ln(x) − ln(x)`, `1/x − 1/x`, `√x − √x`, `tan(x) − tan(x)` restent écrits ;
  une racine d'indice impair positif est définie partout (`∛x − ∛x → 0`, Q41 ;
  `x^{1/3}`, puissance réelle, reste restreint à x ≥ 0). En ordre
  rangé, les termes ainsi gardés restent côte à côte, à la place du premier :
  `3 − ln x + x + ln x → ln(x) − ln(x) + x + 3`. Un terme seul de coefficient nul n'est pas une annulation (`0/x`, `0·ln(x)`
  → `0`). Les options `typeCtx` et `domain` (§G.1) lèvent la restriction.
- **Ne lève jamais d'exception** : ce qu'il ne sait pas traiter ressort tel
  quel, enfants mis au propre. Seul un débordement de pile est rattrapé
  (l'entrée est rendue) ; toute autre exception est un bug et remonte.

**Comment** : `tidy` relit l'expression comme une **somme de termes**, chaque
terme étant un **coefficient rationnel exact** multiplié par des **facteurs**
(base opaque + exposant rationnel) ; il accumule, regroupe, range, puis
reconstruit l'AST (`build.ts`, qui décide aussi des parenthèses).

| fichier            | rôle                                                                |
| ------------------ | ------------------------------------------------------------------- |
| `index.ts`         | point d'entrée, `stripUnnecessaryBrackets` en pré-traitement        |
| `collect.ts`       | décomposition en termes, regroupements, unités, narration           |
| `order.ts`         | l'ordre canonique des termes et des facteurs (étape 8)              |
| `build.ts`         | reconstruction de l'AST (signes, barres de fraction, parenthèses)   |
| `affine.ts`        | l'arithmétique des températures (§D.2)                              |
| `terms.ts`         | `tidyTerms` : chaque terme au propre, ordre des termes gardé (§G.1) |
| `step-recorder.ts` | les étapes racontées à l'élève (§G.1)                               |

**Ce qu'il fait** :

| étape                                  | comportement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | brique existante                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1. aplatir                             | `(a+b)+c` → somme à trois termes ; `(a·b)·c` → produit à trois facteurs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `flattenSumShallow`, `flattenProductShallow` |
| 2. parenthèses                         | celles que la priorité rend inutiles disparaissent ; celles d'une somme dans un produit ou sous une puissance restent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `stripUnnecessaryBrackets`                   |
| 3. neutres et signes                   | `x+0 → x`, `x·1 → x`, `x·0 → 0`, `x/1 → x`, `0/x → 0`, `−(−x) → x`, `+x → x`, `x+(−3) → x−3`, `x/(−y) → −x/y`, `(−x)/(−y) → x/y`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `removeNullTermsAST`, `removeSignsAST`       |
| 4. arithmétique exacte entre littéraux | `2·3·x → 6x`, `2/6+1/4 → 7/12`, `2/4·6/8 → 3/8`, `3/6 → 1/2` — fractions irréductibles ; un décimal reste décimal (§A.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `extractRational`, `foldCoefficients`        |
| 5. termes semblables                   | clé = `hashMathNode` du terme mis au propre, coefficient rationnel replié : `x+x → 2x`, `3x+2x−x → 4x`, `2x+3−x+1 → x+4`, **`2(x+1)²+3(x+1)² → 5(x+1)²`**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `hashMathNode`, `extractRational`            |
| 6. facteurs semblables                 | même base → exposants additionnés : `x·x → x²`, `x·x·x → x³`, `x²·x³ → x⁵`, `x/x² → 1/x`, `(x+1)²·(x+1) → (x+1)³` — `x/x` et `x²/x` restent (domaine, §A) ; **exponentielles identiques regroupées** (Q29, David, 2026-10-24) : règle des exposants, `eˣ·eˣ → e^{2x}`, `(eˣ)²·eˣ → e^{3x}`, `2ˣ·2ˣ → 2^{2x}` ; une puissance tapée seule reste (`(eˣ)²`), deux exposants différents aussi (`eˣ·e^{−x}` : `réduire`, Q31)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `hashMathNode`                               |
| 7. radicaux numériques                 | `√9 → 3`, `√8 → 2√2`, `√2·√8 → 4`, `√12+√3 → 3√3` (extraction puis étape 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `simplifyRadicals` (`normal/rules`)          |
| 8. ordre canonique                     | termes : degré décroissant, puis alphabétique, constante en dernier (`x+4`, `8x²+17x+1`, `4hx+2h²`, `x²cos(x)+2x sin(x)`) ; **somme sans variable** (`e`, `i`, `π` sont des constantes ; décision de David, 2026-10-12) : le rationnel passe en tête, comme dans les manuels (`1+√5`, `3+2√2`, `1+ln 2`, `1+π`, `½+√3`, `-3(1+√2)`) — négatif, seulement si tous les autres termes le sont (`-1-√2`, mais `√2-1`) ; une fonction de l'énoncé est une inconnue (`f(2)+1`, `f'(1)+3` gardent leur ordre), une fonction usuelle en un nombre non (`1+2sin(1)`) ; **nombre complexe** (décision de David, 2026-10-12) : forme algébrique a + ib, la partie réelle (les termes sans `i`) en tête, même négative ou irrationnelle (`-2+3i`, `-1+i√3`, `-1-i`, `-√2+i`, `π+i`, `√2-1+i`) ; la partie réelle se range comme un réel, `i` doit y être un facteur d'exposant 1 (`e^{iπ/3}-1`, `x+iy` gardent leur ordre) ; sous un `−`, que `tidy` ne distribue pas, une partie réelle négative ne passe pas en tête, pour éviter le double signe (`-(i-2)`, `-3(i-2)`, mais `-(2+i)`) ; étape propre `tidy-number-first`, « On écrit le nombre en tête », pour les deux règles ; **facteurs** (Q13, décision de David, 2026-10-23) : nombre, constantes, **valeurs** — une fonction usuelle en un nombre (`√2`, `ln 2`, `sin 1`, ` | −3                                           | `), rangée comme un coefficient (Q30, décision de David, 2026-10-24 : `2√2 x`, `√2(x+1)`, `ln(2) x`, `1/(ln(2) x)`, `2 ln(2) x·2^{x²}`; une fonction de l'énoncé reste une inconnue :`x f(2)`) —, lettres et leurs puissances (`x²`, `xⁿ`), parenthèses (sommes et leurs puissances), fonctions d'une inconnue (ordre alphabétique : `ln x`, `sin x`, `√x`, ` | x   | `), exponentielles, base sans inconnue (`eˣ`, `2ˣ`, `(1/2)ˣ`), le reste — `6x(x²+1)²`, `(x+1)eˣ`, `x(x+1)eˣ`, `(2x+1)cos x`, `ln(2)·2ˣ`, `2cos(x)e^{sin x}` ; **entre deux parenthèses, l'ordre écrit** (`(x-1)(x+2)`, `(1-√2)(1+√2)`restent ; les termes semblables se regroupent quand même, clé triée :`2(x-1)(x+1)+3(x+1)(x-1) → 5(x-1)(x+1)`) ; codé (`tidy/order.ts`) : les constantes forment la première catégorie de facteurs, dans l'ordre `e`, `i`, `π`, devant toute lettre latine (minuscule ou majuscule) et grecque (`\pi a`, `\pi A`, `\pi\alpha`, `e a`, `i x`, `i\beta`, `e^{i\pi}`) ; clés `\euler` (`toCustom`écrit`e`, 2026-10-10) et `\i` (`complex(0, 1)`, 2026-10-11) | `tidy/order.ts` (l'ancien `sortTermsAndFactorsAST` est défectueux : `3x+2x−x → −x+2x+3x`) |
| 9. fonctions                           | arguments mis au propre ; `sin(x)²` et `sin²(x)` : une seule forme, le `superscript` (comme `normalize` depuis la PR #376)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |                                              |
| 10. grandeurs                          | voir §D                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `selectBestUnit`, `normalizeToBase`          |

Compléments mesurés :

- l'étape 3 couvre aussi `x⁰ → 1`, `(−x)³ → −x³`, `−2² → −4` ;
- l'étape 4 évalue les puissances numériques jusqu'à l'exposant 256
  (`2¹⁰ → 1024`, `2⁻¹ → 1/2`), et `3/(1/2) → 6`, `x÷2 → x/2` ;
- l'étape 7 rationalise un dénominateur **numérique** : `1/√2 → √2/2` ;
- **puissance d'un rationnel positif d'exposant non entier** (Q47, lot 5f-5,
  David 2026-10-24) : un exposant de dénominateur 2 s'écrit avec une racine
  carrée, par l'étape 7 — `2^{0,5} → √2`, `4^{0,5} → 2`, `8^{1/2} → 2√2`,
  `2^{3/2} → 2√2`, `3^{5/2} → 9√3`, `2^{−1/2} → √2/2`, `2^{0,5}x → √2 x`,
  registre du radicande gardé (`0,25^{0,5} → 0,5`) ; un autre dénominateur
  seulement sur un entier dont la racine est exacte (`27^{2/3} → 9`,
  `16^{3/4} → 8`) — `2^{1/3}`, `(8/27)^{1/3}` et `x^{1/2}` restent écrits ;
  écart visible, voulu : `(1/8)^{1/3}` reste, `8^{−1/3} → 1/2` (base entière) ;
- **signe d'une somme dans un facteur** (2026-10-06, étendu le 2026-10-20) :
  si son terme de gauche est négatif, le signe sort, à tout degré, parité
  respectée — `3(−x−1) → −3(x+1)`, `(−x²−1)² → (x²+1)²`,
  `3(−x²+2x−1) → −3(x²−2x+1)`. Une somme seule garde son signe (`−x²+2x−1`) ;
- **ordre** (2026-10-06, révisé le 2026-10-20) : au degré 1, positifs devant,
  négatifs derrière (`1−x`, `3−2x`, `b−a`) ; une somme de **deux termes**,
  quel que soit le degré, aussi (`3x−x²`, `1−x²`, `sin x − x cos x`), sauf un
  complexe, partie réelle en tête (`−1 + 1/i`) ; au-delà, l'ordre décroissant
  reste (`−x²+x+1`) ; **dans chaque groupe de signe** (un seul groupe quand les
  signes ne se séparent pas), les termes simples d'abord, puis ceux qui
  contiennent une somme en facteur, le degré passant après cette règle (David,
  2026-10-20) : `2x+3(x+1)`, `x²+2x(x+1)`, `3+(x+1)/2`, `1+(1−2x)/3`,
  `x²+3+2(x+1)`, `x²+1+(x+1)²`, `(2x+1)/3−1`, `−x²+1+x(x+1)` ;
- une relation est mise au propre membre par membre :
  `x+1=2x−3+x → x+1=3x−3`.

Un **décimal reste décimal** (§A.3) : `0,5+0,25 → 0,75`, `x×0,5 → 0,5x`.

### A.1 Fraction de sommes (décisions de David, 2026-10-20)

Quand le numérateur ou le dénominateur est une somme, la fraction est rendue
**irréductible sur ses coefficients numériques**, et **la barre de fraction
reste unique** : `(2x+1)/3`, jamais `2x/3 + 1/3` (ce serait distribuer la
division). Code : `reduceFractionOfSums` dans `collect.ts`.

| entrée            | sortie      | pourquoi                                               |
| ----------------- | ----------- | ------------------------------------------------------ |
| `(6x+3)/9`        | `(2x+1)/3`  | facteur commun 3                                       |
| `(2x+4)/2`        | `x+2`       | le dénominateur tombe à 1                              |
| `2x/(4x+6)`       | `x/(2x+3)`  |                                                        |
| `6/(4x+6)`        | `3/(2x+3)`  |                                                        |
| `(x/2+1)/3`       | `(x+2)/6`   | les fractions internes sont chassées                   |
| `(x/2+1/3)/5`     | `(3x+2)/30` |                                                        |
| `1/(x/2+1)`       | `2/(x+2)`   |                                                        |
| `(0,5x+1)/3`      | `(x+2)/6`   |                                                        |
| `(6x−3)/(−9)`     | `(1−2x)/3`  | le signe d'un dénominateur négatif passe au numérateur |
| `(2x+1)/(−3)`     | `−(2x+1)/3` | numérateur tout positif : le − reste devant            |
| `(−6x²+3)/(−9)`   | `(2x²−1)/3` | deux termes : le − entre dans le numérateur            |
| `(x/2+1/2)/(1/2)` | `x+1`       | produit `2(x/2+1/2)` : le 2 commun se simplifie        |
| `4(x/2+1)`        | `2(x+2)`    |                                                        |
| `6(x/2+1/3)`      | `3x+2`      |                                                        |
| `(6x²−3x)/(3x)`   | `(2x²−x)/x` | le 3 se simplifie, **pas le `x`** (domaine)            |
| `(6x+3)/2`        | inchangé    | déjà irréductible : le 6 reste où il est écrit         |
| `3(x+1)/4`        | inchangé    | idem, pas de développement                             |
| `(x²−1)/(x+1)`    | inchangé    | ce serait factoriser et changer le domaine             |
| `2x/3 + 1/3`      | inchangé    | `tidy` ne réunit pas deux fractions en une             |

La réduction travaille sur le **terme déjà accumulé** (coefficient × facteurs),
pas sur la fraction telle qu'elle est écrite : `−(6x+3)/9`, `(x(6x+3))/(9x)`
et `(6x+3)/9` donnent tous `(2x+1)/3`, et `tidy` reste idempotent. Deux
garde-fous, issus de la revue de la PR :

- **pas d'annulation cachée** : si la somme réduite devenait égale à un autre
  facteur, les deux s'annuleraient — une simplification par une somme, qui
  change le domaine. Le terme reste alors tel quel : `(2x+2)/(4(x+1))`
  inchangé (et non `1/2`) ;
- **pas de développement** : un nombre venu de l'autre côté de la barre reste
  en coefficient — `(x+1)/(1/2) → 2(x+1)`, `((x+1)/2)/(x+3) → (x+1)/(2(x+3))`.
  Un produit sans dénominateur ne se réduit que si un nombre commun se
  simplifie, et n'y gagne jamais de dénominateur : `3(x/2+1)`, `6(x/4+1)`,
  `2(x/2+1)²` inchangés.

Le signe d'une fraction (David, 2026-10-20) :

- **numérateur de deux termes de signes opposés** : le − est entre les deux,
  le positif devant, et le − de la fraction y entre, avec ou sans réduction,
  qu'il vienne du dénominateur ou de l'écriture — `(x²−1)/(−3)`,
  `−(x²−1)/3` → `(1−x²)/3` ; `(2x−1)/(−3)`, `−(2x−1)/3` → `(1−2x)/3`
  (`collectWithSigns` : les termes semblables se regroupent d'abord, chaque
  numérateur retournable pris dans une orientation canonique, si bien que
  `−(x−1)/3−(1−x)/3 → 0` ; le − entre ensuite) ;
- **sinon**, le terme de gauche du numérateur est positif — c'est la règle du
  facteur (§A, étape 4) : `(3x²−6x+3)/(−9)` et `(−3x²+6x−3)/9` →
  `−(x²−2x+1)/3`, `(−6x³+3x−3)/(−9) → (2x³−x+1)/3` ;
- jamais dans un produit sans dénominateur (`−2(x/2−1/2) → −(x−1)`, comme
  `−(x−1)`), ni dans un complexe (`(3i−2)/(−1) → −(3i−2)`), ni s'il ferait
  rencontrer un facteur de l'autre côté : `(6x−3)/(−9(1−2x)) →
−(2x−1)/(3(1−2x))`, la réduction numérique étant gardée.

Hors périmètre : une somme dont un terme contient lui-même une somme
(`(2(x+1)+4)/2`), une grandeur avec unité, un nœud opaque, une somme à
exposant non entier.

### A.2 Ce que `tidy` ne fait pas (mesuré)

| non fait                                 | exemple qui ressort tel quel                     | à qui c'est                        |
| ---------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| développer, distribuer un signe          | `(x+1)²`, `x(x+1)`, `(x+1)(x−1)`, `−(x+2)`       | `simplify` (si moins cher, §B)     |
| factoriser, simplifier par une variable  | `(x²−1)/(x+1)`                                   | `simplify`, `pedagogical-simplify` |
| réunir des fractions à variables         | `1/x + 1/y`, `2x/3 + 1/3`                        | —                                  |
| appliquer une identité                   | `sin²x+cos²x`, `ln(eˣ)`, `e^{ln 2}`, `eˣ·e^{2x}` | règles de motif, `normalize`       |
| évaluer une fonction, utiliser la parité | `sin(0)`, `cos(−x)`                              | `normalize`                        |
| radical à variable, radical non carré    | `√(x²)`, `∛8` ; `√x·√x → √x²` (pas `x`)          | —                                  |
| valeur absolue                           | `\|−3\|`, `\|x\|²`                               | —                                  |
| ce qui n'a pas de valeur                 | `0⁰`, `x/0`                                      | —                                  |

⚠️ **Écart connu (mesuré le 2026-10-23, lot 4c)** : le `−(x+2)` gardé suppose un
nœud de parenthèse. Un arbre construit par le moteur, `x(2x+1) − (x²+x+1)` sans
ce nœud, est aplati par `flattenSumShallow` et le − est distribué
(`x(2x+1) − x² − x − 1`). `tidyTerms` le contourne (§G.1) ; `tidy` non.

### A.3 Le registre décimal (S1, David, 2026-10-22 ; Q3, Q8, Q9 le 2026-10-23)

Un décimal reste décimal. Le coefficient d'un terme s'écrit en **fraction** si
un opérande est une fraction — **une barre de fraction en est une** quand
rien d'autre qu'un nombre n'est dessous (Q3, Q9) — ou si le résultat n'a pas
d'écriture décimale finie. Un entier ne compte ni pour l'un ni pour l'autre.
Code : `Accumulator.decimal` / `.fraction` / `.bar`, `readsFraction` et
`TidyTerm.decimal` dans `collect.ts`, rendu par `buildTermMagnitude`.

| entrée       | sortie    | pourquoi                                          |
| ------------ | --------- | ------------------------------------------------- |
| `0,5+0,25`   | `0,75`    | registre gardé                                    |
| `x×0,5`      | `0,5x`    |                                                   |
| `1,5²`       | `2,25`    |                                                   |
| `√0,25`      | `0,5`     |                                                   |
| `0,4^{−1}`   | `2,5`     | une puissance négative n'est pas une barre        |
| `0,5(x+1)`   | inchangé  | pas de barre : ni `(x+1)/2`, ni `−` dans la somme |
| `0,5(2x+4)`  | `x+2`     | un nombre commun qui laisse un entier (§A.1)      |
| `0,3x+1/2`   | inchangé  | deux termes, chacun son registre                  |
| `1/3+0,5`    | `5/6`     | une fraction parmi les opérandes                  |
| `0,5×3^{−1}` | `1/6`     | pas d'écriture décimale finie                     |
| `0,5/2`      | `1/4`     | Q3 : la barre compte comme fraction               |
| `2,5x/5`     | `x/2`     |                                                   |
| `(0,5x+1)/3` | `(x+2)/6` | table A.1                                         |

**Dénominateur avec une variable (Q9)** : la barre ne compte pas comme
fraction, les décimaux restent, au coefficient comme dans une somme —
`0,5/x`, `0,5·x⁻¹ → 0,5/x`, `(0,5x+1)/(x+1)`, `x/(0,5x+1)`, `0,5x/x`
inchangés. Une vraie fraction interne se chasse toujours :
`(x/2+1)/(x+1) → (x+2)/(2(x+1))`.

**Racine d'un décimal (Q8)** : un décimal **sous** la racine donne une fraction
si la racine est irrationnelle — `√0,5 → √2/2`, `√0,2 → √5/5`,
`√1,5 → √6/2` ; `√0,25 → 0,5` et `(√0,5)² → 0,5` restent décimaux. Un décimal
écrit **devant** la racine n'est pas touché : `0,5√2` inchangé.

Limite connue : un exposant décimal devient une fraction (`x^{0,5} → x^{1/2}`),
l'exposant d'un facteur ne porte pas de registre.

---

## B. `simplify` avec `tidy`

Une itération du moteur de réécriture devient :

1. `tidy` (à la place de `normalizePass` en pré-traitement) ;
2. règles de motif, sur la forme `tidy` — les motifs `P.sub` et `f^n` la voient
   déjà (PR #376, #377) ;
3. **développer seulement si moins cher** : candidat = `tidy(denormalize(normalize(x)))`,
   retenu si son coût est **strictement** inférieur. C'est la seule place où
   `normalize` intervient dans `simplify`, et la barrière de coût ne juge plus
   que ça ;
4. `tidy` en post-traitement, point fixe.

Conséquences sur le panel : `(x+1)²` reste (21 > 9), `(x+1)²−x² → 2x+1`
(13 < 18), `(3x+2)²−x²+5x−3 → 8x²+17x+1`, `(x+1)(x−1) → x²−1` (10 < 18),
`x(x+1) → x²+x` (9 < 13), `2(x+h)²−2x² → 4hx+2h²` (33 < 34, toujours d'un
point — voir §C.5).

`normalizeExtended` (infini, zéro signé) : conservé dans l'étape 3 ; `tidy`
laisse ces nœuds tels quels.

---

## C. Le panel de `simplify` — colonne « attendu »

> Les cases ⚠️ étaient ouvertes en phase 0 ; le panel figé est
> `src/lib/mathAST/simplify/__tests__/panel.test.ts`.

Chaque ligne : entrée · attendu · qui le fait. ⚠️ = case encore ouverte du §7
du relevé, avec la valeur que je propose par défaut.

| entrée                  | attendu                        | qui                                                           |
| ----------------------- | ------------------------------ | ------------------------------------------------------------- |
| `2/6+1/4`               | `7/12`                         | tidy 4                                                        |
| `1/2+1/3`               | `5/6`                          | tidy 4                                                        |
| `3/6`                   | `1/2`                          | tidy 4                                                        |
| `2/4*6/8`               | `3/8`                          | tidy 4                                                        |
| `(2x)/(4y)`             | `x/(2y)`                       | tidy 4                                                        |
| `sqrt(8)`               | `2√2`                          | tidy 7                                                        |
| `sqrt(12)+sqrt(3)`      | `3√3`                          | tidy 7 + 5                                                    |
| `sqrt(2)*sqrt(8)`       | `4`                            | tidy 7                                                        |
| `sqrt(9)`               | `3`                            | tidy 7                                                        |
| `1/sqrt(2)`             | ⚠️ `√2/2` (§7.2)               | tidy 7 — rationaliser un dénominateur **numérique** seulement |
| `x+x`                   | `2x`                           | tidy 5                                                        |
| `x^2+x^2`               | `2x²`                          | tidy 5                                                        |
| `3x+2x-x`               | `4x`                           | tidy 5                                                        |
| `2x+3-x+1`              | `x+4`                          | tidy 5 + 8                                                    |
| `x*x`, `x*x*x`          | `x²`, `x³`                     | tidy 6                                                        |
| `(x+1)^2`               | `(x+1)²`                       | tidy (rien) ; développement refusé                            |
| `(x+1)^2-x^2`           | `2x+1`                         | développement, moins cher                                     |
| `(3x+2)^2-x^2+5x-3`     | `8x²+17x+1`                    | développement, moins cher                                     |
| `(3x+2)^2+5x-3+2x`      | `9x²+19x+1`                    | développement, moins cher                                     |
| `(x+1)*(x-1)`           | ⚠️ `x²−1` (§7.3)               | développement, moins cher                                     |
| `2*(x+h)^2-2*x^2`       | ⚠️ `4hx+2h²` (§7.7)            | développement, moins cher **d'un point**                      |
| `2*3*x`                 | `6x`                           | tidy 4                                                        |
| `3*(x+1)^2*2`           | `6(x+1)²`                      | tidy 4 + 8, `×` implicite                                     |
| `x*(x+1)`               | ⚠️ `x²+x` (§7.4)               | développement, moins cher                                     |
| `2*x*3*y`               | `6xy`                          | tidy 4 + 8                                                    |
| `2*3*x*(x^2+1)^2`       | `6x(x²+1)²`                    | tidy 4 + 8                                                    |
| `exp(x)+x*exp(x)`       | inchangé                       | hors périmètre                                                |
| `2*x*sin(x)+x^2*cos(x)` | ⚠️ `x²cos(x)+2x sin(x)` (§7.6) | tidy 8                                                        |
| `(x^2-1)/(x+1)`         | `x−1`                          | développement, moins cher                                     |
| `(x^2+2x+1)/(x+1)`      | `x+1`                          | développement, moins cher                                     |
| `x/x`                   | `1`                            | développement (`tidy` garde `x/x`, S3)                        |
| `sin(x)^2+cos(x)^2`     | `1`                            | règle (tire depuis PR #376)                                   |
| `1-sin(x)^2`            | `cos(x)²`                      | règle (tire depuis PR #377)                                   |
| `exp(x)*exp(2x)`        | `exp(3x)`                      | développement (normalize le fait)                             |
| `ln(exp(x))`            | `x`                            | développement (normalize le fait)                             |
| `sin(0)`                | `0`                            | développement (normalize le fait)                             |
| `-(-x)`                 | `x`                            | tidy 3                                                        |
| `x+(-3)`                | `x−3`                          | tidy 3                                                        |
| `(-x)/(-y)`             | `x/y`                          | tidy 3                                                        |
| `-(x+2)`                | ⚠️ `−(x+2)` (§7.5)             | tidy (rien) — distribuer coûterait plus                       |
| `x+0`, `x*1`, `x*0`     | `x`, `x`, `0`                  | tidy 3                                                        |
| `12[km]`                | `12 km`                        | tidy 10                                                       |

**Trois cas hors panel à ajouter au contrat**, parce qu'ils distinguent `tidy`
de `normalize` :

| entrée                  | attendu     | note                                     |
| ----------------------- | ----------- | ---------------------------------------- |
| `2(x+1)^2+3(x+1)^2`     | `5(x+1)²`   | regroupement **sans** développer         |
| `(x+1)^2*(x+1)`         | `(x+1)³`    | facteurs semblables sur une somme        |
| `x^2*cos(x)+cos(x)*x^2` | `2x²cos(x)` | clé structurelle indépendante de l'ordre |

---

## D. Les grandeurs

### D.1 Équivalence (`normalize`) — décision 2

`normalize` convertit toute grandeur en unités de base, avec des coefficients
**rationnels exacts**. Un facteur opaque par unité **de base** (`m`, `s`,
`kg`, `K`, …), le coefficient replié dans le nombre.

> **Erratum du 2026-09-20 (mesuré après validation)** : la première version
> disait « `floatToRational` sur les coefficients des définitions ». Faux :
> `floatToRational(273.15)` rend `8535937499999999/31250000000000`, pas
> `5463/20`, et `floatToRational(1/3600)` n'est pas `1/3600`. L'exactitude
> vient de **l'écriture décimale des définitions** (`parseDecimalToRational`
> sur `"273.15"`, `"0.3048"`, `"1000"` : exact), composée **par unité nommée**
> (`km/h` = `1000` × `3600⁻¹` = `5/18`, jamais le flottant `0,2777…`). Deux
> familles n'ont pas d'écriture décimale finie et demandent une définition
> exacte : `°F` (`5/9`) et les angles `°`/`deg` (`π/180`, à porter comme
> multiple **symbolique** de π, ce que `normalize` sait déjà faire : `30° ≡ π/6`).

| paire                     | attendu                   |
| ------------------------- | ------------------------- |
| `12000[m]` ≡ `12[km]`     | vrai                      |
| `1[h]` ≡ `3600[s]`        | vrai                      |
| `90[km/h]` ≡ `25[m/s]`    | vrai                      |
| `6[km^2]` ≡ `2[km]*3[km]` | vrai                      |
| `12[km]` ≡ `12`           | faux                      |
| `12[km]` ≡ `12[kg]`       | faux                      |
| `1[ft]` ≡ `0.3048[m]`     | vrai (exact : 3048/10000) |

⚠️ Ceci **remplace** le choix de la PR #376 (un facteur par unité nommée, sans
conversion) : le test `12[km] ≢ 12000[m]` de `unit-factor.test.ts` bascule.

### D.2 Températures — les règles de `evaluateWithUnits`, reprises telles quelles

Mesuré le 2026-09-20 : l'évaluation existante refuse déjà `20 °C + 5 °C` et
`2 × 20 °C` (« sum of absolute temperatures is forbidden »), et rend
`30 °C − 20 °C → 10 K`, `20 °C + 5 K → 25 °C`. `normalize` applique les mêmes
règles, **sans lever d'exception** :

| expression       | forme normale                       | équivalences attendues             |
| ---------------- | ----------------------------------- | ---------------------------------- |
| `20[°C]`         | `5863/20 · K` (293,15 K exact)      | `≡ 293.15[K]` vrai, `≡ 20[K]` faux |
| `30[°C]-20[°C]`  | `10 · K`                            | `≡ 10[K]` vrai                     |
| `20[°C]+5[K]`    | `5963/20 · K`                       | `≡ 25[°C]` vrai                    |
| `20[°C]+5[°C]`   | opaque (pas une grandeur)           | `≡` à rien d'autre que soi-même    |
| `2*20[°C]`       | opaque                              | idem                               |
| `-20[°C]-5[°C]`  | `-25 · K`                           | `≡ -25[K]` vrai                    |
| `-20[°C]+30[°C]` | opaque (somme de deux températures) | `≡ 10[K]` faux                     |

Depuis la PR 4 de lecture-grandeurs (2026-10-20), l'unité multiplie tout le terme : `2*20[°C]` se lit
(2×20) °C, une température dont la valeur est un produit — `tidy` la garde telle quelle et `normalize`
la laisse opaque (`isMultipliedTemperature`, `units/conversion.ts`) ; `(2*20)[°C]` vaut 40 °C. Le signe
fait partie de la valeur : `-20[°C]` est −20 °C (décision Q-T2 de David, qui remplace la lecture B2
« un opposé dans une somme est une soustraction », gardée pour `-(20[°C])+30[°C]` ≡ 10 K).

Pourquoi « ça change le sens de même grandeur » : une valeur en °C se lit soit
comme une température absolue (20 °C = 293,15 K), soit comme un écart (une
hausse de 20 °C = 20 K). La décision 2 choisit la lecture absolue pour une
grandeur seule ; la différence de deux absolues est un écart. C'est exactement
la convention de `evaluateWithUnits`.

### D.3 Affichage (`tidy`, étape 10) — décision 3

Une grandeur **numérique** est écrite dans l'unité qui place sa valeur entre
0,1 et 1000 (`selectBestUnit`, mode `best`), en **décimal** :

> **Erratum 2 du 2026-09-20 (revue de la PR 3, mesuré)** : le mode `best`
> parcourt la famille de la plus grande unité à la plus petite et retient la
> première au-dessus du plancher — il rend `5 m → 0,5 dam`, `0,3 kg → 3 hg`,
> `30 s → 0,5 min`. Décision prise pour `tidy` : **unités scolaires seulement**
> (km/m/cm/mm, kg/g/mg, L/mL, h/min/s) et **valeur ≥ 1 préférée** — la plus
> grande unité scolaire dont la valeur est ≥ 1, sinon la plus petite. D'où
> `0,005 m → 5 mm` (et non `0,5 cm`, exemple hérité du mode `best`), `600 m → 600 m`, `0,3 kg → 300 g`. Une valeur sans écriture décimale
> finie garde son unité (`1/3 km`). L'évaluation (`evaluateWithUnits`) garde
> son mode `best` inchangé.

| entrée          | attendu   |
| --------------- | --------- |
| `12000[m]`      | `12 km`   |
| `0.005[m]`      | `5 mm`    |
| `12[km]+500[m]` | `12,5 km` |
| `3600[s]`       | `1 h`     |
| `1500[g]`       | `1,5 kg`  |
| `90[km/h]*2[h]` | `180 km`  |
| `2[km]*3[km]`   | `6 km²`   |
| `12[km]`        | `12 km`   |

Cas limites :

- **grandeur symbolique** (`x[m]`, `v[km/h]·t[h]`) : pas de choix d'unité, unité
  composée mise au propre (`v t km`) ;
- **unité composée sans famille** (`kg·m/s²`) : `selectBestUnit` rend l'unité de
  base ; on affiche l'unité dérivée reconnue quand il y en a une (`N`), c'est
  `recognizeDerived` du mode `best` ;
- **températures** : **jamais** de `selectBestUnit` — mesuré, il ignore le
  décalage (`20[°C]` → `20 K`, faux). Une température s'affiche dans l'unité
  écrite par l'utilisateur ; une différence en K.
- **nombre exact vs décimal** : la valeur d'une grandeur avec unité s'écrit en
  décimal si elle est finie ; un nombre sans unité suit son registre (§A.3) :
  `7/12`, `2√2`, `0,75`.

---

## E. Cas limites et erreurs (toutes fonctions)

- `tidy` sur une relation, une matrice, un morceau, une limite : enfants mis
  au propre, nœud conservé.
- `tidy` sur une composition d'unités affines interdite : nœud conservé, pas
  d'exception ; `areEquivalent` rend `false` sans lever.
- Une expression sans variable ni unité qui n'est pas un rationnel exact
  (`√2+1`, `π/3`) : conservée telle quelle, jamais évaluée en décimal.
- Coût : `tidy` ne consulte jamais la fonction de coût. Seule l'étape 3 de
  `simplify` compare.

---

## F. Ce qui ne change pas

- `normalize` reste le seul décideur d'équivalence ; `areEquivalent` ne
  regarde jamais `tidy`.
- `pedagogical-simplify` continue d'appliquer ses règles à l'AST brut, puis
  `normalize` en phase B ; il pourra adopter `tidy` plus tard, hors de ce
  chantier.
- Les deux appelants de `simplify` (commande `.simplify` du REPL,
  `simplifyExact` du grapheur) sont mesurés avant/après, panel en main.

---

## G. Options, appelants, validation

### G.1 Options et narration

- `options.recorder` (`TidyStepRecorder`) : `tidy` raconte ses étapes
  (`tidy-fold-numbers` « On calcule les nombres », `tidy-collect-like-terms`,
  `tidy-sort-terms`, `tidy-number-first`, `tidy-choose-unit`,
  `tidy-power-to-root` « On écrit la puissance avec une racine carrée », …). Une étape
  n'est nommée que si une **seule** famille de gestes a travaillé ; sinon le
  filet `tidy-terms` « On met chaque terme au propre » (c'est le cas de la
  réduction d'une fraction de sommes, §A.1). Une relation est racontée entière
  (`3x+2x=5 → 5x=5`). Un enregistreur vaut pour **un** appel ; le résultat ne
  dépend jamais de sa présence. Spec : `docs/archive/wip/tidy-voix-phase0.md`.
- `options.unitChoice` : `'school'` (défaut) ou `'written'` — l'unité écrite
  d'abord, si la valeur y tombe juste (`7 mm · 5 cm → mm²`, `120 km / 2 h →
km/h`), 2026-09-27.
- `options.typeCtx` : les hypothèses déclarées sur les variables (ADR 0012) ;
  « x non nul » ou « x > 0 » permet `x/x → 1`, `x²/x → x` (S3, 2026-10-23).
- `options.domain` : des expressions dont le domaine de définition est acquis
  — `f` pour sa dérivée. L'argument d'un `ln`, un dénominateur, la base d'une
  puissance négative ou d'exposant variable y sont non nuls, et un produit non
  nul a tous ses facteurs non nuls : avec `f = ln(kx)`, `k/(kx) → 1/x` ; avec
  `f = x ln x`, `x·(1/x) → 1`. Les dérivées le passent toutes (`tidyTerms`,
  `finalDerivative` de `withTidyStep` et de la carte f′ de l'Atelier, `reducedDerivative`, `.diff`).
  Limite connue : une somme n'y est pas ramenée à sa partie primitive —
  `1/(2x+2)` dit `2x+2 ≠ 0`, pas `x+1 ≠ 0`.
- **`tidyWithConditions(node, options)`** → `{ result, conditions }` (chantier tidy-conditions,
  David 2026-10-26 ; la variante de S3) : fait ce que S3 refuse à `tidy` et dit à quelle
  condition — `x/x → 1`, pour x ≠ 0 ; `ln(x) − ln(x) → 0`, pour x > 0 ; `√x/√x → 1`, pour
  x > 0 ; `(x+1)²/(x+1) → x+1`, pour x ≠ −1. Les conditions sont réunies (une par expression,
  la plus forte : `x > 0` contient `x ≠ 0`, `x ≥ 0` et `x ≠ 0` donnent `x > 0`) et ne redisent
  ni une hypothèse déclarée, ni un domaine acquis, ni ce que le résultat dit encore
  (`x/x + ln(x) → ln(x) + 1`, sans condition). Une condition qu'on ne sait pas écrire simplement
  (`tan`, `arcsin`) : la simplification n'a pas lieu. Sans condition à poser, le résultat est
  celui de `tidy`. Écriture : `describeConditions` (`x ≠ −1`, `x \neq -1` ; sur la lettre si
  l'expression est affine en une seule lettre, entière sinon : `x^2−1 ≠ 0`). Le moteur :
  `settings.conditions` dans `collect.ts`, aux deux refus de S3 (`keepDomain`, somme nulle).
- **`domainLoss(before, after)`** (`tidy/conditions.ts`) : ce que `after` a perdu du domaine de
  `before` — `[]` si rien, `null` si une condition perdue ne s'écrit pas. Comparaison
  des conditions de définition (dénominateurs, `ln`, racines, puissances), indépendante de
  l'écriture (`1+x` et `2x+2` disent x ≠ −1 comme `x+1`, `conditionKey`) : au pire elle redit
  une condition vraie. **`domainChanges(before, after)`** (§ 4.2 de tidy-conditions) : ce que
  la réécriture fait du domaine, `{ conditions, narrows }`. Une seule lettre et des conditions
  dont l'ensemble se lit (`conditionSet` : intervalles et points, pas de famille périodique) :
  les **ensembles** se comparent — égaux, `[]` (`ln(x³) → 3 ln x`, `ln(x²) + ln x → 3 ln x`) ;
  sinon les conditions perdues puis gagnées, chacune retirée si les autres (et celles que les
  deux écritures partagent) l'impliquent : `ln(x²) → 2 ln x` dit `x > 0` (pas `x² > 0`),
  `ln(x(x+1)) → ln x + ln(x+1)` dit `x > 0`, `√x √(x+1) → √(x(x+1))` dit `x ≥ 0`. Un domaine qui rétrécit sans point commun avec celui
  d'avant (`ln(x²) + ln(−x)`, défini pour x < 0 : « pour x > 0 » serait vide) ou qu'on ne lit
  pas (plusieurs lettres, `ln(xy) → ln x + ln y`) : `null`, comme avant (revue Opus du § 4.2).
  Plusieurs lettres, domaine élargi : la perte, sans élagage (`x/x + y/y` : `x ≠ 0`, `y ≠ 0`).
  Les conditions disent le signe d'une puissance entière (`x² > 0` → `x ≠ 0`, `x³ > 0` →
  `x > 0`, `x⁻² > 0` → `x ≠ 0`, `2/x > 0` → `x > 0`). **`plainConditions(conditions, answer)`** : `u ≠ 0` en points exclus quand `u`
  ne s'annule qu'en des rationnels (`ln(x) ≠ 0` → `x ≠ 1`, `x² − 1 ≠ 0` → `x ≠ −1 et x ≠ 1`,
  `4x² − 1 ≠ 0` → `x ≠ ±1/2`), l'ensemble écrit vérifié contre celui d'origine, le domaine de `u` redit seulement si
  la réponse et les autres conditions ne le garantissent pas (`(ln x)²/ln x → ln x` : `x ≠ 1` ;
  `ln(x)/ln(x) → 1` : `x > 0 et x ≠ 1`). `narrows` : le domaine d'après est plus petit (l'atelier
  dit alors « Pour x > 0, on peut écrire 2ln(x) »). `null` : une condition ne s'écrit pas
  (`tan`). `domainChange` en rend les conditions seules. Sert à l'atelier pour garder le domaine
  de toutes ses lignes (`atelier/domain-guard.ts`).
- `options.order` : `'canonical'` (défaut, l'étape 8) ou `'kept'` — les
  termes de **chaque** somme gardent l'ordre écrit, parenthèses comprises
  (`3+2x`, `3(1+x)`), les termes semblables regroupés à la place du premier
  (`1+2x+3x → 1+5x`, `2−x+3x → 2+2x`). La clé d'un facteur reste celle de sa
  forme rangée : `2(1+x)+3(x+1) → 5(1+x)`, et la clé d'un terme ne dépend
  pas de l'ordre de ses facteurs : `eˣ(1+x) − eˣ(x+1) → 0`. Les **facteurs**
  restent triés par `sortFactors` (`x·2 → 2x`), dans le même ordre qu'en
  défaut (étape 8, Q13 : `(1+x)eˣ`). Aucune étape
  « On range » n'est racontée (S2, chantier simplify-carte, lot 4c,
  2026-10-23).
- `tidyTerms` (`terms.ts`) : dérivées, primitives, formules du tableur, valeurs
  interdites — `tidy({ order: 'kept' })`, l'ordre écrit ou de la règle gardé (u′v + uv′) ; un quotient garde son numérateur à
  part (signe compris : `(−sin²x − cos²x)/sin²x`), sauf si la mise au propre
  complète est plus courte, ou si elle seule retire un décimal sous la barre
  (Q3 : `2x/1,5 → 4x/3`, revue de #1655) ; un négatif en tête que l'ordre rangé évite, à
  nombre de termes égal, laisse l'ordre rangé l'emporter (`−6x + 2 → 2 − 6x`).
  Un arbre construit par le moteur porte `u′v − (uv′)` sans nœud de
  parenthèse : `tidy` la garde (§A), et `tidyTerms` ne l'ouvre que si cela
  regroupe des termes (`x − 1 − (x + 1) → −2`).

### G.2 Qui appelle `tidy`

`simplify` (§B), l'Atelier (`src/lib/atelier/`), `solve`, les variations, les
limites, la réciproque, l'intégration (forme de classe, valeur interdite), les
dérivées des corrections (`withTidyStep`, par `finalDerivative` : `tidy` autour de
la politique `auto`), le REPL, la lecture de la valeur
d'une grandeur (`questions/units/parser.ts`).

### G.3 ⚠️ La validation des réponses n'utilise pas `tidy`

La **valeur** d'une réponse est jugée par `areEquivalent` (`normalize`) ; sa
**forme** par `checkForm` (`cosmetic-transforms.ts`), qui passe réponse et
attendu dans sa propre chaîne (`buildASTPipeline` : `reduceRadicalsAST`,
`reduceFractionsAST`, `removeSignsAST`, …, `sortTermsAndFactorsAST`) puis
compare les LaTeX. Les deux définitions de « propre » peuvent diverger (ordre
des termes notamment).

## H. Historique

- 2026-09-20 : phase 0, décisions fondatrices (§0), contrat (§A).
- 2026-09-21 : narration (G.1).
- 2026-09-27 : `unitChoice: 'written'`.
- 2026-10-06 : ordre des sommes de degré 1, signe des sommes toutes négatives.
- 2026-10-12 : rationnel en tête, forme a + ib (étape 8).
- 2026-10-20 : fraction de sommes irréductible (§A.1) ; document réécrit
  d'après le code ; produit sans dénominateur réduit ; signe d'une fraction ;
  deux termes : le positif devant, à tout degré ; signe sorti d'un facteur dont
  le terme de gauche est négatif, à tout degré (révise 2026-10-06).
  Les termes simples avant ceux qui contiennent une somme ; le − d'une fraction
  entre aussi dans son numérateur quand elle est opérande d'une somme
  (`1−(2x−1)/3 → 1+(1−2x)/3`).
- 2026-10-23 : S3, plus de simplification qui perd le domaine (`x/x` reste) ;
  options `typeCtx` et `domain` (chantier simplify-carte, lot 4a) ; option
  `order: 'kept'` et `tidyTerms` reconstruit dessus (lot 4c).
- 2026-10-24 : S3 étendue aux sommes, des termes à domaine restreint ne
  s'annulent pas (`ln(x) − ln(x)` reste) ; la primitive de l'intégration
  pédagogique est mise au propre sur son propre domaine (`ln|x| − ln|x| → 0`).
  Lot 5f-1 : une parenthèse sous-entendue compte comme écrite dans `tidy`
  lui-même (Q40, avant : dans `tidyTerms` seul) ; `∛x − ∛x → 0` ; en ordre
  rangé, les termes gardés pour le domaine restent côte à côte (Q41).
- 2026-10-25 : lot 5f-5, une puissance d'un rationnel positif d'exposant de
  dénominateur 2 s'écrit avec une racine carrée (`8^{1/2} → 2√2`), une racine
  exacte d'un entier se calcule (`27^{2/3} → 9`) — Q47 ; étape
  `tidy-power-to-root`.
- 2026-10-26 : `tidyWithConditions` (variante de S3) ; une base sous deux
  barres ne quitte plus le dénominateur en silence (`1/(1/x)` reste, avant :
  `x` sans condition — chantier tidy-conditions § 4.3).
