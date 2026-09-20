# `tidy()` — phase 0 : les comportements attendus, à valider

> Rédigé le 2026-09-20, après le relevé
> ([simplify-reecriture-releve.md](simplify-reecriture-releve.md)) et les
> décisions de David du même jour. **Rien de ceci n'est codé.** Chaque ligne
> deviendra un test rouge en phase 1, une fois validée.

## 0. Les décisions prises (David, 2026-09-20)

1. **Deux formes canoniques.** `normalize` garde son rôle : elle développe et
   **décide l'équivalence**. Une nouvelle fonction, **`tidy`**, met une
   expression au propre **sans jamais développer** ; c'est elle que `simplify`
   utilise. Le principe vient de la forme canonique du Compute Engine (mesurée
   dans le relevé), pas son code : leurs `Terms` ratent `x+x` et `x²+x²`.
2. **Les grandeurs sont équivalentes à conversion près** : `12000 m ≡ 12 km`,
   `20 °C ≡ 293,15 K`. C'est `normalize` qui convertit en unités de base.
3. **`simplify` écrit une grandeur numérique dans l'unité adaptée à son ordre
   de grandeur**, en décimal, comme le mode `best` de `evaluateWithUnits`
   (`12000 m → 12 km`, `0,005 m → 0,5 cm`, `3600 s → 1 h`).

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
- **Ne lève jamais d'exception** : ce qu'il ne sait pas traiter ressort tel
  quel, enfants mis au propre.

**Ce qu'il fait, dans cet ordre** (les briques nommées existent déjà) :

| étape                                  | comportement                                                                                                                                                                                            | brique existante                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. aplatir                             | `(a+b)+c` → somme à trois termes ; `(a·b)·c` → produit à trois facteurs                                                                                                                                 | `flattenSumShallow`, `flattenProductShallow`                              |
| 2. parenthèses                         | celles que la priorité rend inutiles disparaissent ; celles d'une somme dans un produit ou sous une puissance restent                                                                                   | `stripUnnecessaryBrackets`                                                |
| 3. neutres et signes                   | `x+0 → x`, `x·1 → x`, `x·0 → 0`, `x/1 → x`, `0/x → 0`, `−(−x) → x`, `+x → x`, `x+(−3) → x−3`, `x/(−y) → −x/y`, `(−x)/(−y) → x/y`                                                                        | `removeNullTermsAST`, `removeSignsAST`                                    |
| 4. arithmétique exacte entre littéraux | `2·3·x → 6x`, `2/6+1/4 → 7/12`, `2/4·6/8 → 3/8`, `3/6 → 1/2` — fractions irréductibles, jamais de décimal                                                                                               | `extractRational`, `foldCoefficients`                                     |
| 5. termes semblables                   | clé = `hashMathNode` du terme mis au propre, coefficient rationnel replié : `x+x → 2x`, `3x+2x−x → 4x`, `2x+3−x+1 → x+4`, **`2(x+1)²+3(x+1)² → 5(x+1)²`**                                               | `hashMathNode`, `extractRational`                                         |
| 6. facteurs semblables                 | même base → exposants additionnés : `x·x → x²`, `x·x·x → x³`, `x²·x³ → x⁵`, `x/x → 1`, `x²/x → x`, `(x+1)²·(x+1) → (x+1)³`                                                                              | `hashMathNode`                                                            |
| 7. radicaux numériques                 | `√9 → 3`, `√8 → 2√2`, `√2·√8 → 4`, `√12+√3 → 3√3` (extraction puis étape 5)                                                                                                                             | `simplifyRadicals` (`normal/rules`)                                       |
| 8. ordre canonique                     | termes : degré décroissant, puis alphabétique, constante en dernier (`x+4`, `8x²+17x+1`, `4hx+2h²`, `x²cos(x)+2x sin(x)`) ; facteurs : nombre, variables, fonctions, puissances de sommes (`6x(x²+1)²`) | à écrire — `sortTermsAndFactorsAST` est défectueux (`3x+2x−x → −x+2x+3x`) |
| 9. fonctions                           | arguments mis au propre ; `sin(x)²` et `sin²(x)` : une seule forme, le `superscript` (comme `normalize` depuis la PR #376)                                                                              |                                                                           |
| 10. grandeurs                          | voir §D                                                                                                                                                                                                 | `selectBestUnit`, `normalizeToBase`                                       |

**Ce que `tidy` ne fait pas** : développer, factoriser, appliquer une identité
(`sin²+cos²`, `ln(eˣ)`, `eˣ·e²ˣ`), évaluer une fonction (`sin(0)`). Tout cela
reste aux règles de motif et à `normalize`.

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

## C. Le panel — colonne « attendu » proposée

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
> `0,005 m → 5 mm` (et non `0,5 cm` comme ci-dessous, exemple hérité du mode
> `best`), `600 m → 600 m`, `0,3 kg → 300 g`. Une valeur sans écriture décimale
> finie garde son unité (`1/3 km`). L'évaluation (`evaluateWithUnits`) garde
> son mode `best` inchangé.

| entrée          | attendu   |
| --------------- | --------- |
| `12000[m]`      | `12 km`   |
| `0.005[m]`      | `0,5 cm`  |
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

## G. Ce que je te demande de valider

1. le contrat de `tidy` (§A), et son nom ;
2. la place de `normalize` dans `simplify` : uniquement « développer si moins
   cher » (§B) ;
3. les six cases ⚠️ du panel (§C) : `1/√2 → √2/2`, `(x+1)(x−1) → x²−1`,
   `x(x+1) → x²+x`, `−(x+2)` inchangé, `x²cos(x)+2x sin(x)`, `4hx+2h²` ;
4. les règles de température (§D.2) et l'interdiction de `selectBestUnit` sur
   les affines (§D.3) ;
5. exact partout sauf la valeur d'une grandeur avec unité (§D.3, §E).

Ensuite, phase 1 : tous ces comportements en tests rouges, dans l'ordre
`tidy` seul → `normalize` et les unités → `simplify` recâblé.
