---
couvre:
  - 'src/lib/mathAST/simplify/**'
  - 'src/lib/mathAST/pedagogical-simplify/**'
---

# Panel de référence des simplifications

> **Mesuré le 2026-09-21** sur `main` à `006873aad`, remis à jour le 2026-10-10 (lettre `e`
> = constante d'Euler) le 2026-10-11 (colonne `factoriser` : ordre du noyau, ADR 0024) et le 2026-10-23
> (`reduire` et `auto` sans `normalize`, `simplify` sans factorisation : chantier simplify-carte § 33) et le 2026-10-25
> (quotient `e^{2x}/e^x` réduit par `auto` et `reduire`, lot 5f-5), et **pinné** par
> `src/lib/mathAST/__tests__/panel-simplifications.test.ts`. Si vous modifiez le
> moteur, le test rougit : mettez les deux à jour **ensemble**, sinon ce
> document pourrit en silence comme l'a fait le §1 de
> `docs/archive/wip/simplify-reecriture-releve.md`.

## Ce que chaque colonne veut dire

| colonne      | ce qui est appelé                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simplify`   | `simplify(node)` — `tidy` → règles (sans identité remarquable : ne factorise jamais) → « développer seulement si moins cher » → `tidy`                                                                                                                                                                                                                                                                                                                  |
| `auto`       | `generatePedagogicalSimplifySteps`, intention `auto` : les règles de `reduire`, puis les fractions de polynômes simplifiées en montrant la factorisation (`x ≠ −1`), puis « développer seulement si plus court », rédigé comme `.développer`. Ne factorise jamais le résultat (ADR 0007, simplify-carte § 33)                                                                                                                                           |
| `reduire`    | identités, puissances, racines, parité et période, puis `tidy` qui raconte ses gestes (`tidy-*`). Ni factorisation ni développement. **Pas** de `normalize`                                                                                                                                                                                                                                                                                             |
| `developper` | règles de développement + identités, puis `normalize`                                                                                                                                                                                                                                                                                                                                                                                                   |
| `factoriser` | factorisation + identités, puis extraction du contenu (numérique, monôme, ou non polynomial : `x\exponentialE^x - \exponentialE^x` → `(x-1)\exponentialE^x`), puis les stratégies de l'ADR 0024 (facteurs réduits, racines du trinôme, racine évidente — lycée —, développer en dernier recours ; facteurs dans l'ordre du noyau), puis `tidy` facteur par facteur (deux nombres côte à côte sont calculés : `2\times 3` → `6`). **Pas** de `normalize` |

La colonne `developper` est le **résultat** de l'intention. Les étapes que voit l'élève — le
« Comment ? » de `.développer` (atelier) comme une correction d'exercice générée
(`intent: 'developper'`, option B du 2026-10-14) — ne sont pas sa trace : `explainExpansion`
(`expand-explained.ts`) range ce résultat dans l'ordre du manuel (`expand-order.ts`) et le fait
rédiger par `expand-steps.ts`, qui finit dessus — voir
[README § Les étapes de « développer »](README.md#les-étapes-de-développer-expand-stepsts).
Ce panel n'en change pas.

⚠️ **Les quatre intentions sont mesurées à `schoolLevel: 'lycee'`.** Les
identités trigonométriques et exponentielles sont coupées en dessous — c'est un
garde-fou pédagogique délibéré, pas un défaut. Sans niveau, `sin²x + cos²x`
reste tel quel.

## Ce que ce panel sert à voir

`simplify` et `auto` **ne donnent pas le même résultat**, et c'est voulu pour
certaines lignes, subi pour d'autres. Une différence d'écriture sur une même
valeur — `√2/2` contre `(1/2)√2` — est un choix de forme ; une ligne où une
colonne réduit et l'autre non est un écart de **capacité**.

Les rendus sont en LaTeX, tels que `toLatex` les imprime.

## Fractions numériques

| entrée                        | `simplify`       | `auto`           | `reduire`        | `developper`     | `factoriser`                      |
| ----------------------------- | ---------------- | ---------------- | ---------------- | ---------------- | --------------------------------- |
| `\frac{2}{6}+\frac{1}{4}`     | `\dfrac{7}{12}`  | `\dfrac{7}{12}`  | `\dfrac{7}{12}`  | `\dfrac{7}{12}`  | `\dfrac{7}{12}`                   |
| `\frac{3}{6}`                 | `\dfrac{1}{2}`   | `\dfrac{1}{2}`   | `\dfrac{1}{2}`   | `\dfrac{1}{2}`   | `\dfrac{1}{2}`                    |
| `\frac{2}{4}\cdot\frac{6}{8}` | `\dfrac{3}{8}`   | `\dfrac{3}{8}`   | `\dfrac{3}{8}`   | `\dfrac{3}{8}`   | `\dfrac{1}{2} \cdot \dfrac{3}{4}` |
| `\frac{6}{8}x`                | `\dfrac{3 x}{4}` | `\dfrac{3 x}{4}` | `\dfrac{3 x}{4}` | `\dfrac{3}{4} x` | `\dfrac{3}{4} x`                  |

## Radicaux

| entrée                   | `simplify`            | `auto`                | `reduire`             | `developper`            | `factoriser`                 |
| ------------------------ | --------------------- | --------------------- | --------------------- | ----------------------- | ---------------------------- |
| `\sqrt{8}`               | `2 \sqrt{2}`          | `2 \sqrt{2}`          | `2 \sqrt{2}`          | `2 \sqrt{2}`            | `2 \sqrt{2}`                 |
| `\frac{1}{\sqrt{2}}`     | `\dfrac{\sqrt{2}}{2}` | `\dfrac{\sqrt{2}}{2}` | `\dfrac{\sqrt{2}}{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{\sqrt{2}}{2}`        |
| `\sqrt{x}\sqrt{x}`       | `x`                   | `x`                   | `x`                   | `x`                     | `\sqrt{x} \sqrt{x}`          |
| `\sqrt{x^2}`             | `\sqrt{x^2}`          | `\left\| x \right\|`  | `\left\| x \right\|`  | `\left\| x \right\|`    | `\sqrt{x^2}`                 |
| `\sqrt[3]{x}\sqrt[3]{x}` | `\sqrt[3]{x}^2`       | `\sqrt[3]{x}^2`       | `\sqrt[3]{x}^2`       | `\sqrt[3]{x^2}`         | `\sqrt[3]{x} \sqrt[3]{x}`    |
| `\sqrt{2}\sqrt{8}`       | `4`                   | `4`                   | `4`                   | `4`                     | `\sqrt{2} \times 2 \sqrt{2}` |

## Termes semblables

| entrée      | `simplify` | `auto`    | `reduire` | `developper` | `factoriser` |
| ----------- | ---------- | --------- | --------- | ------------ | ------------ |
| `2x+3x`     | `5 x`      | `5 x`     | `5 x`     | `5 x`        | `5 x`        |
| `x+x`       | `2 x`      | `2 x`     | `2 x`     | `2 x`        | `2 x`        |
| `x-x`       | `0`        | `0`       | `0`       | `0`          | `0`          |
| `3x+2y+x-y` | `4 x + y`  | `4 x + y` | `4 x + y` | `4 x + y`    | `4 x + y`    |

## Développement

| entrée        | `simplify`                                    | `auto`                                        | `reduire`                                     | `developper`       | `factoriser`                                  |
| ------------- | --------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------ | --------------------------------------------- |
| `(x+1)^2`     | `\left( x + 1 \right)^2`                      | `\left( x + 1 \right)^2`                      | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`    | `\left( x + 1 \right)^2`                      |
| `(x+1)(x-1)`  | `x^2 - 1`                                     | `x^2 - 1`                                     | `\left( x + 1 \right) \left( x - 1 \right)`   | `x^2 - 1`          | `\left( x + 1 \right) \left( x - 1 \right)`   |
| `(2x-3)(x+4)` | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `2 x^2 + 5 x - 12` | `\left( 2 x - 3 \right) \left( x + 4 \right)` |
| `x(x+1)`      | `x^2 + x`                                     | `x^2 + x`                                     | `x \left( x + 1 \right)`                      | `x^2 + x`          | `x \left( x + 1 \right)`                      |

## Factorisation

| entrée         | `simplify`                            | `auto`                                | `reduire`                             | `developper`                          | `factoriser`                                |
| -------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------------- |
| `x^2-1`        | `x^2 - 1`                             | `x^2 - 1`                             | `x^2 - 1`                             | `x^2 - 1`                             | `\left( x - 1 \right) \left( x + 1 \right)` |
| `x^2+2x+1`     | `x^2 + 2 x + 1`                       | `x^2 + 2 x + 1`                       | `x^2 + 2 x + 1`                       | `x^2 + 2 x + 1`                       | `\left( x + 1 \right)^2`                    |
| `2x+4`         | `2 x + 4`                             | `2 x + 4`                             | `2 x + 4`                             | `2 x + 4`                             | `2 \left( x + 2 \right)`                    |
| `x^2+2x`       | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x \left( x + 2 \right)`                    |
| `3x^2+6x+3`    | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 \left( x + 1 \right)^2`                  |
| `e^{x}+xe^{x}` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `\left( x + 1 \right) \exponentialE^x`      |
| `-2x-4`        | `-2 x - 4`                            | `-2 x - 4`                            | `-2 x - 4`                            | `-2 x - 4`                            | `-2 \left( x + 2 \right)`                   |
| `x^2y+xy`      | `x^2 y + x y`                         | `x^2 y + x y`                         | `x^2 y + x y`                         | `x^2 y + x y`                         | `x \left( x + 1 \right) y`                  |

## Fractions rationnelles

| entrée                        | `simplify`                                | `auto`                                    | `reduire`                                 | `developper`                         | `factoriser`                              |
| ----------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------ | ----------------------------------------- |
| `\frac{x^2-1}{x+1}`           | `x - 1`                                   | `x - 1`                                   | `\dfrac{x^2 - 1}{x + 1}`                  | `x - 1`                              | `x - 1`                                   |
| `\frac{x^2-y^2}{x-y}`         | `x + y`                                   | `x + y`                                   | `\dfrac{x^2 - y^2}{x - y}`                | `x + y`                              | `x + y`                                   |
| `\frac{x^2-y^2}{x^2+2xy+y^2}` | `\dfrac{x - y}{x + y}`                    | `\dfrac{x - y}{x + y}`                    | `\dfrac{x^2 - y^2}{2 x y + x^2 + y^2}`    | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`                    |
| `\frac{x}{x}`                 | `1`                                       | `1`                                       | `\dfrac{x}{x}`                            | `1`                                  | `1`                                       |
| `\frac{(x+y)^2}{x+2y}`        | `\dfrac{\left( x + y \right)^2}{x + 2 y}` | `\dfrac{\left( x + y \right)^2}{x + 2 y}` | `\dfrac{\left( x + y \right)^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{\left( x + y \right)^2}{x + 2 y}` |

## Puissances

| entrée        | `simplify`                         | `auto`                | `reduire`             | `developper`          | `factoriser`                          |
| ------------- | ---------------------------------- | --------------------- | --------------------- | --------------------- | ------------------------------------- |
| `x^{2}x^{3}`  | `x^5`                              | `x^5`                 | `x^5`                 | `x^5`                 | `x^2 x^3`                             |
| `(x^{2})^{3}` | `x^6`                              | `x^6`                 | `x^6`                 | `x^6`                 | `x^6`                                 |
| `e^{x}e^{2x}` | `\exponentialE^{3 x}`              | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^x \exponentialE^{2 x}` |
| `(e^{x})^{3}` | `\left( \exponentialE^x \right)^3` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\left( \exponentialE^x \right)^3`    |
| `x^{a}x^{b}`  | `x^a x^b`                          | `x^{a + b}`           | `x^{a + b}`           | `x^a x^b`             | `x^a x^b`                             |

## Exponentielle et logarithme

| entrée                 | `simplify`                                     | `auto`            | `reduire`         | `developper`                                   | `factoriser`                                   |
| ---------------------- | ---------------------------------------------- | ----------------- | ----------------- | ---------------------------------------------- | ---------------------------------------------- |
| `e^{x}`                | `\exponentialE^x`                              | `\exponentialE^x` | `\exponentialE^x` | `\exponentialE^x`                              | `\exponentialE^x`                              |
| `\ln(e^{x})`           | `x`                                            | `x`               | `x`               | `x`                                            | `x`                                            |
| `\frac{e^{2x}}{e^{x}}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\exponentialE^x` | `\exponentialE^x` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` |
| `e^{0}`                | `1`                                            | `1`               | `1`               | `1`                                            | `1`                                            |

## Trigonométrie

| entrée                    | `simplify`               | `auto`                   | `reduire`                | `developper`             | `factoriser`             |
| ------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| `\sin(x)^2+\cos(x)^2`     | `1`                      | `1`                      | `1`                      | `1`                      | `1`                      |
| `\frac{\sin(x)}{\cos(x)}` | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   |
| `\sin(2x)`                | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` |
| `\cos(-x)`                | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( -x \right)`  |

## Signes et neutres

| entrée     | `simplify`              | `auto`                  | `reduire`               | `developper` | `factoriser`            |
| ---------- | ----------------------- | ----------------------- | ----------------------- | ------------ | ----------------------- |
| `-(x+1)`   | `-\left( x + 1 \right)` | `-\left( x + 1 \right)` | `-\left( x + 1 \right)` | `-x - 1`     | `-\left( x + 1 \right)` |
| `0\cdot x` | `0`                     | `0`                     | `0`                     | `0`          | `0 \cdot x`             |
| `1\cdot x` | `x`                     | `x`                     | `x`                     | `x`          | `1 \cdot x`             |
| `x+0`      | `x`                     | `x`                     | `x`                     | `x`          | `x`                     |
| `-x-1`     | `-x - 1`                | `-x - 1`                | `-x - 1`                | `-x - 1`     | `-\left( x + 1 \right)` |

## Factorielle et coefficient binomial

Hors panel (2026-10-05) : `normalize` calcule `factorial` / `binom` à arguments entiers
(n ⩽ 200), donc `simplify` rend `6!` → `720`, `\frac{10!}{7!}` → `720`, `\binom{10}{3}` → `120`,
`2\times 3!` → `12` ; `n!` et `\binom{n}{2}` restent tels quels. Notation et verdicts :
`docs/systeme/mathast/convention-equivalence.md` (§ Notation combinatoire).

## Où `simplify` et `auto` divergent

Mesuré sur le panel ci-dessus : **3 lignes sur 49** (mis à jour le 2026-10-23, chantier
simplify-carte § 33). `auto` ne développe plus que si c'est plus court, avec la règle de
`simplify`, et ne factorise plus : les huit divergences d'écriture et de décision ont disparu
(`(x+1)^2`, `x^2+2x+1`, `-(x+1)`… rendent la même chose dans les deux colonnes). Restent des
écarts de capacité.

| entrée        | `simplify`                         | `auto`                | nature                                                             |
| ------------- | ---------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `\sqrt{x^2}`  | `\sqrt{x^2}`                       | `\left\| x \right\|`  | ⚠️ **capacité** — `simplify` ne réduit pas                         |
| `(e^{x})^{3}` | `\left( \exponentialE^x \right)^3` | `\exponentialE^{3 x}` | ⚠️ **capacité** — `simplify` garde la puissance (barrière de coût) |
| `x^{a}x^{b}`  | `x^a x^b`                          | `x^{a + b}`           | ⚠️ **capacité** — `auto` sait depuis la PR #394, `simplify` non    |

**Écriture** : les deux sont justes, la forme diffère.
**Décision** : `simplify` et `auto` comparent les coûts et gardent la forme la
moins chère, là où `developper` développe toujours. C'est voulu, et c'est la
raison d'être des intentions.
**Capacité** : une colonne sait ce que l'autre ignore. C'est là qu'il y a du
travail, et le panel le rend visible.

⚠️ **Écarts relevés à la première lecture de ce panel, et leur suivi :**

1. ~~`simplify((e^x)^3)` rend `e^x^3`, une écriture qui **ne se relit pas**.~~
   Corrigé dans les générateurs LaTeX et texte (une puissance en base est
   parenthésée) : `simplify` rend désormais `\left( e^x \right)^3`, juste mais
   non réduit.
2. ~~`simplify` ne combine pas `e^x · e^{2x}`~~ : comblé par
   `fix/normalize-ln-exp` (2026-10-05) — `normalize` applique les identités de
   `e^{…}` (ln(eᵃ) = a, e^{ln a} = a, eᵃ·eᵇ, (eᵃ)ⁿ) en gardant la puissance
   `e^{…}` (écrite `\exponentialE^{…}`) ; `simplify` et `developper` rendent `e^{3 x}`, et `e^{\ln x}` se
   réduit à `x`. Reste : `x^a · x^b`, que `auto` sait faire et `simplify` non.
3. ~~`ln(e^x)` : `auto`, `reduire`, `developper` et `factoriser` s'arrêtaient à
   `x ln(e)`~~ : la lettre `e` était lue comme une variable. Depuis le 2026-10-10,
   les parseurs la lisent comme la constante d'Euler : les cinq colonnes rendent
   `x`, et `ln(e)` vaut `1` (test `pedagogical-simplify/__tests__/ln-exp-lettre-e.test.ts`).
   Les sorties écrivent la constante `\exponentialE` (`toLatex(euler())`).
4. ⚠️ Reste aussi : `simplify((e^x)^3)` garde `\left( e^x \right)^3`
   (barrière de coût). ~~Le **quotient** `e^{2x}/e^x` n'est réduit par aucune
   colonne~~ : `auto` et `reduire` le réduisent depuis le lot 5f-5 de
   simplify-carte (Q48, règle `same-base-div`, base `e` ou rationnel positive) ;
   `simplify`, `developper` et `factoriser` le gardent.

## Longueurs de segments (mode `capitalPairs: 'length'`)

Une longueur `AB` est strictement positive par défaut (lot Q-F, 2026-10-12). Mesuré le
2026-10-12, hors panel (le panel lit en mode produit, défaut du parseur) :

| entrée          | `simplify` | `auto` | `reduire` | `developper` | `factoriser` |
| --------------- | ---------- | ------ | --------- | ------------ | ------------ |
| `\sqrt{AB^2}`   | `AB`       | `AB`   | `AB`      | `AB`         | `AB`         |
| `\|AB\|`        | `AB`       | `AB`   | `AB`      | `AB`         | `AB`         |
| `\sqrt{9AB^2}`  | `3 AB`     | `3 AB` | `3 AB`    | `3 AB`       | `3 AB`       |
| `\frac{AB}{AB}` | `1`        | `1`    | `1`       | `1`          | `1`          |

Les intentions (`pedagogical-simplify/pipeline.ts`, décision de David du 2026-10-12) commencent
par une étape `length-radical` (« Une longueur est positive : √(AB²) = AB », catégorie
`radicaux`) : chaque racine carrée qui **disparaît** quand ses longueurs sont positives
(`normalize` avec l'oracle des longueurs) est remplacée ; `√(8AB²)` et `√(AA²)` restent à
l'intention. Non-régression : banc avant/après sur les 4 122 chaînes de l'empreinte —
3 328 saisies en mode produit et 3 143 sans longueur en mode longueur, `simplify`, `solve`,
`areEquivalent` et les 4 intentions (résultat et règles des étapes) identiques (une
différence de `simplify` sur `(x+y+…+d)^8`, due au délai de 300 ms du banc, absente au
re-tirage).

## Non couvert

**Les grandeurs avec unités** n'entrent pas dans ce panel : elles ne se lisent
pas en LaTeX (`12000[m]` n'est pas du LaTeX) mais par le parseur maison. Elles
ont leur propre couverture dans `src/lib/mathAST/tidy/__tests__/`.

**Les étapes** non plus : ce panel ne compare que le RÉSULTAT. La narration des
étapes pédagogiques — « On reconnaît un trinôme carré parfait » — est pinnée
par les snapshots de `pedagogical-simplify/__tests__/`.
