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

## État

- [ ] Tests rouges prouvés (commit 1)
- [ ] `normalize` : conversion exacte, angles, °F, pré-pas affine
- [ ] `tidy` : meilleure unité, regroupement par dimension, dérivées
- [ ] Tests de la PR #376 mis à jour
- [ ] Suites vertes (`normal`, `tidy`, `simplify`, `units`, `eval`, `grapheur`, `cli`)
- [ ] Revue, `pnpm check:incremental`, `pnpm lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé
