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

---

## A. `tidy(node): MathNode` — le contrat

AST en entrée, AST en sortie, pas de représentation intermédiaire (comme la
forme canonique du Compute Engine, qui est une expression).

**Invariants** :

- **Valeur conservée** : `areEquivalent(tidy(x), x)` est vrai pour toute
  expression sans unité.
- **Idempotent** : `tidy(tidy(x))` est structurellement égal à `tidy(x)`.
- **Jamais de développement, jamais de factorisation** : `(x+1)²` reste
  `(x+1)²`, `x(x+1)` reste `x(x+1)`, `x²+x` reste `x²+x`.
- **Jamais de changement de domaine** : dans une fraction, seul un **nombre**
  se simplifie, jamais une expression qui contient une variable (§A.1).
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

| étape                                  | comportement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | brique existante                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1. aplatir                             | `(a+b)+c` → somme à trois termes ; `(a·b)·c` → produit à trois facteurs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `flattenSumShallow`, `flattenProductShallow`                                              |
| 2. parenthèses                         | celles que la priorité rend inutiles disparaissent ; celles d'une somme dans un produit ou sous une puissance restent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `stripUnnecessaryBrackets`                                                                |
| 3. neutres et signes                   | `x+0 → x`, `x·1 → x`, `x·0 → 0`, `x/1 → x`, `0/x → 0`, `−(−x) → x`, `+x → x`, `x+(−3) → x−3`, `x/(−y) → −x/y`, `(−x)/(−y) → x/y`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `removeNullTermsAST`, `removeSignsAST`                                                    |
| 4. arithmétique exacte entre littéraux | `2·3·x → 6x`, `2/6+1/4 → 7/12`, `2/4·6/8 → 3/8`, `3/6 → 1/2` — fractions irréductibles, jamais de décimal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `extractRational`, `foldCoefficients`                                                     |
| 5. termes semblables                   | clé = `hashMathNode` du terme mis au propre, coefficient rationnel replié : `x+x → 2x`, `3x+2x−x → 4x`, `2x+3−x+1 → x+4`, **`2(x+1)²+3(x+1)² → 5(x+1)²`**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `hashMathNode`, `extractRational`                                                         |
| 6. facteurs semblables                 | même base → exposants additionnés : `x·x → x²`, `x·x·x → x³`, `x²·x³ → x⁵`, `x/x → 1`, `x²/x → x`, `(x+1)²·(x+1) → (x+1)³`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `hashMathNode`                                                                            |
| 7. radicaux numériques                 | `√9 → 3`, `√8 → 2√2`, `√2·√8 → 4`, `√12+√3 → 3√3` (extraction puis étape 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `simplifyRadicals` (`normal/rules`)                                                       |
| 8. ordre canonique                     | termes : degré décroissant, puis alphabétique, constante en dernier (`x+4`, `8x²+17x+1`, `4hx+2h²`, `x²cos(x)+2x sin(x)`) ; **somme sans variable** (`e`, `i`, `π` sont des constantes ; décision de David, 2026-10-12) : le rationnel passe en tête, comme dans les manuels (`1+√5`, `3+2√2`, `1+ln 2`, `1+π`, `½+√3`, `-3(1+√2)`) — négatif, seulement si tous les autres termes le sont (`-1-√2`, mais `√2-1`) ; une fonction de l'énoncé est une inconnue (`f(2)+1`, `f'(1)+3` gardent leur ordre), une fonction usuelle en un nombre non (`1+2sin(1)`) ; **nombre complexe** (décision de David, 2026-10-12) : forme algébrique a + ib, la partie réelle (les termes sans `i`) en tête, même négative ou irrationnelle (`-2+3i`, `-1+i√3`, `-1-i`, `-√2+i`, `π+i`, `√2-1+i`) ; la partie réelle se range comme un réel, `i` doit y être un facteur d'exposant 1 (`e^{iπ/3}-1`, `x+iy` gardent leur ordre) ; sous un `−`, que `tidy` ne distribue pas, une partie réelle négative ne passe pas en tête, pour éviter le double signe (`-(i-2)`, `-3(i-2)`, mais `-(2+i)`) ; étape propre `tidy-number-first`, « On écrit le nombre en tête », pour les deux règles ; ricochet sur l'ordre des facteurs, rangés par leur écriture : `(1-√2)(1+√2)` → `(1+√2)(1-√2)` ; facteurs : nombre, variables, fonctions, puissances de sommes (`6x(x²+1)²`) ; codé (`tidy/order.ts`) : les constantes forment la première catégorie de facteurs, dans l'ordre `e`, `i`, `π`, devant toute lettre latine (minuscule ou majuscule) et grecque (`\pi a`, `\pi A`, `\pi\alpha`, `e a`, `i x`, `i\beta`, `e^{i\pi}`) ; clés `\euler` (`toCustom` écrit `e`, 2026-10-10) et `\i` (`complex(0, 1)`, 2026-10-11) | `tidy/order.ts` (l'ancien `sortTermsAndFactorsAST` est défectueux : `3x+2x−x → −x+2x+3x`) |
| 9. fonctions                           | arguments mis au propre ; `sin(x)²` et `sin²(x)` : une seule forme, le `superscript` (comme `normalize` depuis la PR #376)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |                                                                                           |
| 10. grandeurs                          | voir §D                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `selectBestUnit`, `normalizeToBase`                                                       |

Compléments mesurés :

- l'étape 3 couvre aussi `x⁰ → 1`, `(−x)³ → −x³`, `−2² → −4` ;
- l'étape 4 évalue les puissances numériques jusqu'à l'exposant 256
  (`2¹⁰ → 1024`, `2⁻¹ → 1/2`), et `3/(1/2) → 6`, `x÷2 → x/2` ;
- l'étape 7 rationalise un dénominateur **numérique** : `1/√2 → √2/2` ;
- **somme toute négative dans un facteur** (2026-10-06) : de degré 1, le signe
  sort, parité respectée — `3(−x−1) → −3(x+1)`, `(−x−1)² → (x+1)²` ;
- **ordre de degré 1** (2026-10-06) : positifs devant, négatifs derrière
  (`1−x`, `3−2x`, `b−a`) ; de degré ≥ 2, l'ordre décroissant reste
  (`−x²+x+1`) ;
- une relation est mise au propre membre par membre :
  `x+1=2x−3+x → x+1=3x−3`.

⚠️ **Les décimaux deviennent des fractions** : `0,5+0,25 → 3/4`,
`x×0,5 → x/2`. Seule la valeur d'une grandeur avec unité s'écrit en décimal
(§D.3).

### A.1 Fraction de sommes (décisions de David, 2026-10-20)

Quand le numérateur ou le dénominateur est une somme, la fraction est rendue
**irréductible sur ses coefficients numériques**, et **la barre de fraction
reste unique** : `(2x+1)/3`, jamais `2x/3 + 1/3` (ce serait distribuer la
division). Code : `reduceFractionOfSums` dans `collect.ts`.

| entrée          | sortie      | pourquoi                                               |
| --------------- | ----------- | ------------------------------------------------------ |
| `(6x+3)/9`      | `(2x+1)/3`  | facteur commun 3                                       |
| `(2x+4)/2`      | `x+2`       | le dénominateur tombe à 1                              |
| `2x/(4x+6)`     | `x/(2x+3)`  |                                                        |
| `6/(4x+6)`      | `3/(2x+3)`  |                                                        |
| `(x/2+1)/3`     | `(x+2)/6`   | les fractions internes sont chassées                   |
| `(x/2+1/3)/5`   | `(3x+2)/30` |                                                        |
| `1/(x/2+1)`     | `2/(x+2)`   |                                                        |
| `(0,5x+1)/3`    | `(x+2)/6`   |                                                        |
| `(6x−3)/(−9)`   | `(1−2x)/3`  | le signe d'un dénominateur négatif passe au numérateur |
| `(2x+1)/(−3)`   | `−(2x+1)/3` | puis la règle « somme toute négative dans un facteur » |
| `(6x²−3x)/(3x)` | `(2x²−x)/x` | le 3 se simplifie, **pas le `x`** (domaine)            |
| `(6x+3)/2`      | inchangé    | déjà irréductible : le 6 reste où il est écrit         |
| `3(x+1)/4`      | inchangé    | idem, pas de développement                             |
| `(x²−1)/(x+1)`  | inchangé    | ce serait factoriser et changer le domaine             |
| `2x/3 + 1/3`    | inchangé    | `tidy` ne réunit pas deux fractions en une             |

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
  Un produit sans dénominateur n'est pas une fraction : `3(x/2+1)` inchangé.

Le signe − ne passe dans le numérateur que si la réduction a lieu, et pour un
numérateur de degré 1 dont les termes ne deviennent pas tous négatifs :
`−(2x−1)/3` et `(3i−2)/(−1) → −(3i−2)` ne bougent pas (rien à réduire).

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
| `x/x`                   | `1`                            | tidy 6                                                        |
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

| expression      | forme normale                  | équivalences attendues             |
| --------------- | ------------------------------ | ---------------------------------- |
| `20[°C]`        | `5863/20 · K` (293,15 K exact) | `≡ 293.15[K]` vrai, `≡ 20[K]` faux |
| `30[°C]-20[°C]` | `10 · K`                       | `≡ 10[K]` vrai                     |
| `20[°C]+5[K]`   | `5963/20 · K`                  | `≡ 25[°C]` vrai                    |
| `20[°C]+5[°C]`  | opaque (pas une grandeur)      | `≡` à rien d'autre que soi-même    |
| `2*20[°C]`      | opaque                         | idem                               |

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
- **nombre exact vs décimal** : le décimal ne concerne que la valeur d'une
  grandeur avec unité ; un nombre sans unité reste exact (`7/12`, `2√2`).

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
  `tidy-sort-terms`, `tidy-number-first`, `tidy-choose-unit`, …). Une étape
  n'est nommée que si une **seule** famille de gestes a travaillé ; sinon le
  filet `tidy-terms` « On met chaque terme au propre » (c'est le cas de la
  réduction d'une fraction de sommes, §A.1). Une relation est racontée entière
  (`3x+2x=5 → 5x=5`). Un enregistreur vaut pour **un** appel ; le résultat ne
  dépend jamais de sa présence. Spec : `docs/archive/wip/tidy-voix-phase0.md`.
- `options.unitChoice` : `'school'` (défaut) ou `'written'` — l'unité écrite
  d'abord, si la valeur y tombe juste (`7 mm · 5 cm → mm²`, `120 km / 2 h →
km/h`), 2026-09-27.
- `tidyTerms` (`terms.ts`) : pour les dérivées — chaque terme au propre,
  l'ordre des termes gardé (u′v + uv′), sauf si la mise au propre complète
  regroupe des termes ou évite un négatif en tête.

### G.2 Qui appelle `tidy`

`simplify` (§B), l'Atelier (`src/lib/atelier/`), `solve`, les variations, les
limites, la réciproque, l'intégration (forme de classe, valeur interdite), les
dérivées des corrections (`withTidyStep`), le REPL, la lecture de la valeur
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
  d'après le code.
