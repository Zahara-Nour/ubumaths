# Les grandeurs — progression (PR 3 de 3)

> Spécification : [tidy-phase0.md](tidy-phase0.md) §D (décisions 2 et 3, David, 2026-09-20),
> avec l'erratum du §D.1 sur l'exactitude des coefficients.
> Worktree `../ubumaths-wt-units`, branche `feat/units-normal-form`.
> PR 1 `tidy` : #378. PR 2 `simplify` recâblé : #379.

## Ce que la PR change

### `normalize` — équivalence à conversion près (§D.1, D.2)

- `normalizeUnit` : un facteur opaque par unité **de base** (`m`, `s`, `g`, `K`, `rad`, …),
  le coefficient replié dans le nombre, **en rationnel exact** lu depuis l'écriture
  décimale de la définition (`extractRational` sur `number(String(coefficient))`), composé
  par unité nommée (`km/h` = `1000 × 3600⁻¹` = `5/18`). Deux définitions sans écriture
  décimale finie reçoivent un coefficient exact : `°F` (`5/9`) et les angles `°`/`deg`
  (`π/180`, π en facteur symbolique — `180° ≡ π rad`).
- Températures : un pré-pas AST sur les opérations binaires entre grandeurs affines,
  les règles de `evaluateWithUnits` : `a°C − b°C → (a−b) K`, `a°C ± d K → (a±d)°C`.
  Une grandeur affine **seule** se lit en absolu (`20°C → 5863/20 K`) ; **opérande** d'une
  opération (`20°C + 5°C`, `2·20°C`, `(20°C)²`, `20°C·3 m`), elle reste opaque en bloc.
  Aucune exception.
- Conséquence sur la PR #376 : `12[km] ≢ 12000[m]` bascule (tests `unit-factor` et
  `review-findings` mis à jour), `denormalize(normalize(12[km]))` s'écrit `12000[m]`
  — l'écriture propre est le travail de `tidy`, pas du décideur.

### `tidy` — l'unité adaptée à l'ordre de grandeur (§D.3)

- Une grandeur **numérique** est convertie en base puis écrite dans l'unité qui place
  sa valeur entre 0,1 et 1000 (`selectBestUnit`, exporté de `evaluate-with-units`),
  en **décimal** ; les grandeurs de même dimension se regroupent (`12 km + 500 m → 12,5 km`).
- Une grandeur **symbolique** garde une unité composée mise au propre (`v t km`),
  sans choix d'unité.
- Une **température** garde l'unité écrite ; jamais `selectBestUnit` (mesuré : il
  ignore le décalage, `20°C → 20 K`).
- Unité composée sans famille : l'unité dérivée reconnue (`kg·m/s² → N`).

## Tests (écrits avant le code)

- `normal/__tests__/unit-conversion.test.ts` : §D.1 (équivalences, exactitude, angles, °F), §D.2 (températures).
- `tidy/__tests__/tidy-units.test.ts` : §D.3 (numériques, symboliques, températures, dérivées), idempotence, `simplify`.

## Ce qui a été implémenté (2026-09-20)

### Où vit le pré-pas affine

**Dans `normal/normalize.ts`, en tête des cas binaires** — pas dans
`preprocess`. Raison mesurée : `areEquivalent` appelle `normalize(a)`
directement, et `normalize` appelle `preprocess` lui-même ; une règle posée
dans `normal/rules/` aurait été appliquée, mais elle aurait dû réécrire l'AST
(fabriquer `(a−b)[K]`) là où les cas binaires peuvent simplement **choisir
comment lire chaque opérande**. Trois fonctions :

- `affineQuantity(node)` — la grandeur affine que porte un nœud, délimiteurs
  traversés ;
- `normalizeOperand(node)` — `normalizeOpaqueNode` pour une grandeur affine,
  `normalizeNode` sinon ; utilisé par `multiplication`, `division`,
  `opposite`, `positive` ;
- `forbidsAffineReading(node)` — la table de §D.2 pour `addition` /
  `subtraction` : seules `a°C + b°C` et `d K − a°C` laissent leurs grandeurs
  opaques ; tout le reste se lit en absolu et l'arithmétique des formes
  normales rend le bon résultat (`30°C − 20°C` = `6063/20 − 5863/20` = `10 K`).

`superscript` rend le nœud entier opaque quand sa base est affine. Aucune
exception n'est jamais levée — c'est la différence assumée avec
`evaluateWithUnits`, qui refuse bruyamment.

### Le plancher de lisibilité de `tidy` vaut 0,5, pas 0,1

§D.3 annonce « entre 0,1 et 1000 », mais ses propres exemples l'excluent :
`1[km]-999[m] → 1 m` (0,1 rendrait `0,1 dam`) et `0.25[h] → 15 min` (0,1
rendrait `0,25 h`) ; `0.005[m] → 0,5 cm` fixe la borne basse, incluse.
`selectBestUnit` prend donc un plancher en paramètre : l'évaluation garde 0,1,
`tidy` demande 0,5 (`TIDY_MIN_READABLE`).

### Fichiers

- `units/exact.ts` (nouveau) — `exactConversion(écriture)` : coefficient
  rationnel exact, puissance de π, composants de base, décalage affine.
- `units/types.ts` — `BaseUnitDef.exact` (`{ n, d, piPower? }`).
- `units/definitions.ts` — `exact` sur `°F` (5/9), `°` et `deg` (π/180).
- `units/selection.ts` (nouveau) — `selectBestUnit` / `getPrimaryBaseSymbol`
  déplacés depuis `eval/evaluate-with-units.ts`, plancher paramétrable.
- `normal/normalize.ts` — `normalizeUnit` pose un facteur par unité **de
  base** ; pré-pas affine (ci-dessus).
- `eval/evaluate-with-units.ts` — les unités sont retirées avant l'évaluation
  (le mode exact passe par `normalize`, qui convertit désormais).
- `tidy/collect.ts` — unités accumulées par **symbole nommé** (`km/h·h → km`),
  regroupement par **dimension**, `chooseUnit` (meilleure unité, unité dérivée
  reconnue, décimal).
- `tidy/decimal.ts` (nouveau) — `decimalString`, dans un module à part pour ne
  pas boucler entre `collect` et `build`.
- `tidy/types.ts`, `tidy/build.ts` — `TidyQuantity`, écriture décimale.

## Revue de code (Opus) — 3 bloquants, 5 importants, tous reproduits en tests rouges

Commit `cb8226096`, 33 rouges. Décisions prises pour les points produit :

- **B1** `5[m] → 0.5[dam]` : le mode `best` retient la première unité au-dessus du
  plancher en partant de la plus grande. Pour `tidy` : **unités scolaires seulement**
  (km/m/cm/mm, kg/g/mg, L/mL, h/min/s) et **valeur ≥ 1 préférée** ; `0,005 m → 5 mm`
  (écart avec l'exemple du §D.3, erratum 2 de la phase 0). `1/3[km]` garde son unité.
- **B2** `-20[°C]+30[°C] ≢ 30[°C]-20[°C]` (et `simplify(30°C−20°C) → -20[°C]+303.15[K]`) :
  dans une somme, l'opposé d'une grandeur affine est une soustraction ; seule, c'est une
  température (`-20[°C] ≡ 253.15[K]`).
- **B3** `1[nN]` inexact : le coefficient d'une unité préfixée résolue est un produit
  flottant ; préfixe et unité de base composés en rationnels séparément.
- **I1** unité sans composant → exception ; **I2** volumes et aires (familles L/mL,
  km²/m²/cm²/mm², m³/cm³) ; **I3** `simplify('20[°C]') → 293.15[K]` (pas de candidat
  développé quand la forme propre porte une affine, sauf s'il n'en a plus) ; **I4**
  `15[min]` illisible par le parseur maison (crochet d'unité lu comme écriture brute) ;
  **I5** une seule unité par dimension dans une somme ; `sqrt(4[m^2]) ≡ 2` (l'unité
  disparaît sous une racine).

## Second lot — les findings de la revue (2026-09-20)

- **B1** unités **scolaires** seulement (`km/m/cm/mm`, `kg/g/mg`, `h/min/s/ms`,
  aires, volumes) et **valeur ≥ 1 préférée** : `5[m]` reste `5 m` (plus de
  `0,5 dam`), `0,3[kg] → 300 g`, `90[s] → 1,5 min`. Le plancher 0,5 du premier
  lot disparaît : `SCHOOL_FAMILIES` + « la plus grande unité dont la valeur est
  ≥ 1, à défaut la plus petite » (`units/selection.ts`, `tidy/collect.ts`).
  Une valeur sans écriture décimale finie garde son unité écrite (`1/3 [km]`).
- **B2** dans une somme, `opposite(grandeur affine)` est une **soustraction**
  (`-20[°C]+30[°C] ≡ 10 K`) ; seule sous un opposé, c'est une température
  (`-20[°C] ≡ 253,15 K`). `sumOperand` / `allowsAffineReading` /
  `normalizeSumOperand` remplacent `forbidsAffineReading`, avec le signe
  effectif (opposés internes **et** opérateur).
- **B3** le coefficient d'une unité **préfixée** (`nN`, `nJ`, `nL`) est un
  produit flottant : le préfixe et l'unité de base sont composés en rationnels
  (`splitSiPrefix`, `units/exact.ts`). `1000000000[nN]` a le hash de `1[N]`.
- **I1** `parseUnitTerms("1")` jetait un `TypeError` : garde-fou dans
  `units/parser.ts` (liste de jetons vide) et dans `exactConversion`.
- **I2** familles des **aires** (`m^2`) et des **volumes** (`m^3` : m³/L/mL),
  que `getPrimaryBaseSymbol` ne voyait pas : `2500[mL] → 2,5 L`.
- **I3** `simplify` ne troque plus une température écrite contre son absolu à
  coût égal (`20[°C]` reste `20[°C]`) ; une différence, strictement moins
  chère, passe toujours (`30[°C]-20[°C] → 10[K]`).
- **I4** le contenu d'un crochet d'unité est relu comme une **écriture brute**
  jusqu'au `]` (les deux parseurs maison) : `2[min]` ne butait plus sur la
  fonction `min`. Test dédié `parser/custom/__tests__/unit-brackets.test.ts`.
- **I5** une somme garde **une seule unité par dimension** : un terme
  symbolique impose la sienne (`x[km]+500[m] → x[km]+0,5[km]`).
- **Racine** un facteur d'unité est positif par construction : plus de
  `abs()` sur lui sous une racine, donc `sqrt(4[m^2]) ≡ 2[m]` (et non `2`).

## Troisième lot — seconde revue (2026-09-20)

- **F1** `normal/normalize.ts` : `signedAffineQuantity` épluche la chaîne
  `delimiter`/`positive`/`opposite` et replie sa parité **dans la valeur** ;
  un `case 'positive'` fait désormais comme `case 'opposite'`.
  `-(-20[°C]) ≡ 20[°C]`, `+(-20[°C]) ≡ 253,15 K`.
- **F2** `tidy/collect.ts` : `signedAffineAtom` fait de la grandeur affine
  signée un **atome opaque** dans un produit — `2·(−20 °C)` ne devient pas
  `−2·20 °C`, qui changerait l'atome.
- **§D.2 dans `tidy`** : nouveau `tidy/affine.ts`. `tidy` fait lui-même
  l'arithmétique affine bien formée, en rationnels exacts (une absolue plus des
  écarts reste dans son unité ; deux absolues de signes opposés donnent un
  écart en K) ; les formes interdites sont rendues **telles qu'elles sont
  écrites**, sans réordonnancement.
- **F3** `simplify/simplify.ts` : le garde passe **avant** le calcul du
  candidat développé — une forme qui porte une température n'est jamais
  troquée contre son absolu, quel que soit le coût. Conséquence assumée :
  `(x+2)(x−2)+20[°C]` n'est pas développé.
- **F4/F5** `parser/custom/unit-writing.ts` : `UNIT_TOKEN_TEXT`
  (`Partial<Record<string, string>>`) et `UNIT_WRITING` partagés par les deux
  parseurs ; le JSDoc de `ParseException` lui est rendu.

## État

- [x] Tests rouges prouvés (commit 1)
- [x] `normalize` : conversion exacte, angles, °F, pré-pas affine
- [x] `tidy` : meilleure unité, regroupement par dimension, dérivées
- [x] Tests de la PR #376 mis à jour
- [x] Suites vertes (`normal`, `tidy`, `simplify`, `units`, `eval`, `pattern`)
- [ ] Suites `grapheur`, `cli`
- [ ] Revue, `pnpm check:incremental`, `pnpm lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé
