---
couvre:
  - 'src/lib/mathAST/simplify/**'
  - 'src/lib/mathAST/pedagogical-simplify/**'
---

# Panel de référence des simplifications

> **Mesuré le 2026-09-21** sur `main` à `006873aad`, remis à jour le 2026-10-10 (lettre `e`
> = constante d'Euler), et **pinné** par
> `src/lib/mathAST/__tests__/panel-simplifications.test.ts`. Si vous modifiez le
> moteur, le test rougit : mettez les deux à jour **ensemble**, sinon ce
> document pourrit en silence comme l'a fait le §1 de
> `docs/archive/wip/simplify-reecriture-releve.md`.

## Ce que chaque colonne veut dire

| colonne      | ce qui est appelé                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simplify`   | `simplify(node)` — `tidy` → règles → « développer seulement si moins cher » → `tidy`                                                                                        |
| `auto`       | `generatePedagogicalSimplifySteps`, intention `auto` : `reduire` ∪ factorisation symbolique                                                                                 |
| `reduire`    | identités, puissances, racines. Ni factorisation ni développement                                                                                                           |
| `developper` | règles de développement + identités, puis `normalize`                                                                                                                       |
| `factoriser` | factorisation + identités, puis extraction du contenu, puis `tidy` facteur par facteur (deux nombres côte à côte sont calculés : `2\times 3` → `6`). **Pas** de `normalize` |

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
| `\frac{6}{8}x`                | `\dfrac{3 x}{4}` | `\dfrac{3}{4} x` | `\dfrac{3}{4} x` | `\dfrac{3}{4} x` | `\dfrac{3}{4} x`                  |

## Radicaux

| entrée                   | `simplify`            | `auto`                  | `reduire`               | `developper`            | `factoriser`                 |
| ------------------------ | --------------------- | ----------------------- | ----------------------- | ----------------------- | ---------------------------- |
| `\sqrt{8}`               | `2 \sqrt{2}`          | `2 \sqrt{2}`            | `2 \sqrt{2}`            | `2 \sqrt{2}`            | `2 \sqrt{2}`                 |
| `\frac{1}{\sqrt{2}}`     | `\dfrac{\sqrt{2}}{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{\sqrt{2}}{2}`        |
| `\sqrt{x}\sqrt{x}`       | `x`                   | `x`                     | `x`                     | `x`                     | `\sqrt{x} \sqrt{x}`          |
| `\sqrt{x^2}`             | `\sqrt{x^2}`          | `\left\| x \right\|`    | `\left\| x \right\|`    | `\left\| x \right\|`    | `\sqrt{x^2}`                 |
| `\sqrt[3]{x}\sqrt[3]{x}` | `\sqrt[3]{x}^2`       | `\sqrt[3]{x^2}`         | `\sqrt[3]{x^2}`         | `\sqrt[3]{x^2}`         | `\sqrt[3]{x} \sqrt[3]{x}`    |
| `\sqrt{2}\sqrt{8}`       | `4`                   | `4`                     | `4`                     | `4`                     | `\sqrt{2} \times 2 \sqrt{2}` |

## Termes semblables

| entrée      | `simplify` | `auto`    | `reduire` | `developper` | `factoriser` |
| ----------- | ---------- | --------- | --------- | ------------ | ------------ |
| `2x+3x`     | `5 x`      | `5 x`     | `5 x`     | `5 x`        | `5 x`        |
| `x+x`       | `2 x`      | `2 x`     | `2 x`     | `2 x`        | `x 2`        |
| `x-x`       | `0`        | `0`       | `0`       | `0`          | `x 0`        |
| `3x+2y+x-y` | `4 x + y`  | `4 x + y` | `4 x + y` | `4 x + y`    | `4 x + y`    |

## Développement

| entrée        | `simplify`                                    | `auto`             | `reduire`          | `developper`       | `factoriser`                                  |
| ------------- | --------------------------------------------- | ------------------ | ------------------ | ------------------ | --------------------------------------------- |
| `(x+1)^2`     | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`    | `x^2 + 2 x + 1`    | `x^2 + 2 x + 1`    | `\left( x + 1 \right)^2`                      |
| `(x+1)(x-1)`  | `x^2 - 1`                                     | `x^2 - 1`          | `x^2 - 1`          | `x^2 - 1`          | `\left( x + 1 \right) \left( x - 1 \right)`   |
| `(2x-3)(x+4)` | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `2 x^2 + 5 x - 12` | `2 x^2 + 5 x - 12` | `2 x^2 + 5 x - 12` | `\left( 2 x - 3 \right) \left( x + 4 \right)` |
| `x(x+1)`      | `x^2 + x`                                     | `x^2 + x`          | `x^2 + x`          | `x^2 + x`          | `x \left( x + 1 \right)`                      |

## Factorisation

| entrée         | `simplify`                            | `auto`                                | `reduire`                             | `developper`                          | `factoriser`                                |
| -------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------------- |
| `x^2-1`        | `x^2 - 1`                             | `x^2 - 1`                             | `x^2 - 1`                             | `x^2 - 1`                             | `\left( x + 1 \right) \left( x - 1 \right)` |
| `x^2+2x+1`     | `\left( x + 1 \right)^2`              | `x^2 + 2 x + 1`                       | `x^2 + 2 x + 1`                       | `x^2 + 2 x + 1`                       | `\left( x + 1 \right)^2`                    |
| `2x+4`         | `2 x + 4`                             | `2 x + 4`                             | `2 x + 4`                             | `2 x + 4`                             | `2 \left( x + 2 \right)`                    |
| `x^2+2x`       | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x^2 + 2 x`                           | `x \left( x + 2 \right)`                    |
| `3x^2+6x+3`    | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 x^2 + 6 x + 3`                     | `3 \left( x + 1 \right)^2`                  |
| `e^{x}+xe^{x}` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `x \exponentialE^x + \exponentialE^x` | `\left( x + 1 \right) \exponentialE^x`      |
| `-2x-4`        | `-2 x - 4`                            | `-2 x - 4`                            | `-2 x - 4`                            | `-2 x - 4`                            | `-2 \left( x + 2 \right)`                   |
| `x^2y+xy`      | `x^2 y + x y`                         | `x^2 y + x y`                         | `x^2 y + x y`                         | `x^2 y + x y`                         | `x \left( x + 1 \right) y`                  |

## Fractions rationnelles

| entrée                        | `simplify`                                | `auto`                               | `reduire`                            | `developper`                         | `factoriser`                              |
| ----------------------------- | ----------------------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------ | ----------------------------------------- |
| `\frac{x^2-1}{x+1}`           | `x - 1`                                   | `x - 1`                              | `x - 1`                              | `x - 1`                              | `x - 1`                                   |
| `\frac{x^2-y^2}{x-y}`         | `x + y`                                   | `x + y`                              | `x + y`                              | `x + y`                              | `x + y`                                   |
| `\frac{x^2-y^2}{x^2+2xy+y^2}` | `\dfrac{x - y}{x + y}`                    | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`                    |
| `\frac{x}{x}`                 | `1`                                       | `1`                                  | `1`                                  | `1`                                  | `1`                                       |
| `\frac{(x+y)^2}{x+2y}`        | `\dfrac{\left( x + y \right)^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{\left( x + y \right)^2}{x + 2 y}` |

## Puissances

| entrée        | `simplify`                         | `auto`                | `reduire`             | `developper`          | `factoriser`                          |
| ------------- | ---------------------------------- | --------------------- | --------------------- | --------------------- | ------------------------------------- |
| `x^{2}x^{3}`  | `x^5`                              | `x^5`                 | `x^5`                 | `x^5`                 | `x^2 x^3`                             |
| `(x^{2})^{3}` | `x^6`                              | `x^6`                 | `x^6`                 | `x^6`                 | `x^6`                                 |
| `e^{x}e^{2x}` | `\exponentialE^{3 x}`              | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^x \exponentialE^{2 x}` |
| `(e^{x})^{3}` | `\left( \exponentialE^x \right)^3` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\exponentialE^{3 x}` | `\left( \exponentialE^x \right)^3`    |
| `x^{a}x^{b}`  | `x^a x^b`                          | `x^{a + b}`           | `x^{a + b}`           | `x^a x^b`             | `x^a x^b`                             |

## Exponentielle et logarithme

| entrée                 | `simplify`                                     | `auto`                                         | `reduire`                                      | `developper`                                   | `factoriser`                                   |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `e^{x}`                | `\exponentialE^x`                              | `\exponentialE^x`                              | `\exponentialE^x`                              | `\exponentialE^x`                              | `\exponentialE^x`                              |
| `\ln(e^{x})`           | `x`                                            | `x`                                            | `x`                                            | `x`                                            | `x`                                            |
| `\frac{e^{2x}}{e^{x}}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` | `\dfrac{\exponentialE^{2 x}}{\exponentialE^x}` |
| `e^{0}`                | `1`                                            | `1`                                            | `1`                                            | `1`                                            | `1`                                            |

## Trigonométrie

| entrée                    | `simplify`               | `auto`                   | `reduire`                | `developper`             | `factoriser`             |
| ------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| `\sin(x)^2+\cos(x)^2`     | `1`                      | `1`                      | `1`                      | `1`                      | `1`                      |
| `\frac{\sin(x)}{\cos(x)}` | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   | `\tan\left( x \right)`   |
| `\sin(2x)`                | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` | `\sin\left( 2 x \right)` |
| `\cos(-x)`                | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( x \right)`   | `\cos\left( -x \right)`  |

## Signes et neutres

| entrée     | `simplify`              | `auto`   | `reduire` | `developper` | `factoriser`            |
| ---------- | ----------------------- | -------- | --------- | ------------ | ----------------------- |
| `-(x+1)`   | `-\left( x + 1 \right)` | `-x - 1` | `-x - 1`  | `-x - 1`     | `-\left( x + 1 \right)` |
| `0\cdot x` | `0`                     | `0`      | `0`       | `0`          | `0 \cdot x`             |
| `1\cdot x` | `x`                     | `x`      | `x`       | `x`          | `1 \cdot x`             |
| `x+0`      | `x`                     | `x`      | `x`       | `x`          | `x`                     |
| `-x-1`     | `-x - 1`                | `-x - 1` | `-x - 1`  | `-x - 1`     | `-\left( x + 1 \right)` |

## Factorielle et coefficient binomial

Hors panel (2026-10-05) : `normalize` calcule `factorial` / `binom` à arguments entiers
(n ⩽ 200), donc `simplify` rend `6!` → `720`, `\frac{10!}{7!}` → `720`, `\binom{10}{3}` → `120`,
`2\times 3!` → `12` ; `n!` et `\binom{n}{2}` restent tels quels. Notation et verdicts :
`docs/systeme/mathast/convention-equivalence.md` (§ Notation combinatoire).

## Où `simplify` et `auto` divergent

Mesuré sur le panel ci-dessus : **11 lignes sur 49** (mis à jour le 2026-10-10 : la lettre `e` est la constante d'Euler, `ln(e^x)` ne diverge plus).

| entrée                   | `simplify`                                    | `auto`                               | nature                                                                                                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------ |
| `\frac{6}{8}x`           | `\dfrac{3 x}{4}`                              | `\dfrac{3}{4} x`                     | écriture — même valeur                                                                                                  |
| `\frac{1}{\sqrt{2}}`     | `\dfrac{\sqrt{2}}{2}`                         | `\dfrac{1}{2} \sqrt{2}`              | écriture — même valeur                                                                                                  |
| `\sqrt{x^2}`             | `\sqrt{x^2}`                                  | `\left                               | x \right                                                                                                                | `   | ⚠️ **capacité** — `simplify` ne réduit pas |
| `\sqrt[3]{x}\sqrt[3]{x}` | `\sqrt[3]{x}^2`                               | `\sqrt[3]{x^2}`                      | écriture — même valeur                                                                                                  |
| `(x+1)^2`                | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`                      | **décision** — barrière de coût de `simplify`                                                                           |
| `(2x-3)(x+4)`            | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `2 x^2 + 5 x - 12`                   | **décision** — même barrière de coût                                                                                    |
| `x^2+2x+1`               | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`                      | **décision opposée** — l'un factorise, l'autre développe                                                                |
| `\frac{(x+y)^2}{x+2y}`   | `\dfrac{\left( x + y \right)^2}{x + 2 y}`     | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | **décision** — `auto` développe le numérateur                                                                           |
| `(e^{x})^{3}`            | `\left( \exponentialE^x \right)^3`            | `\exponentialE^{3 x}`                | ⚠️ **capacité** — `simplify` garde la puissance (barrière de coût) ; `developper` combine depuis `fix/normalize-ln-exp` |
| `x^{a}x^{b}`             | `x^a x^b`                                     | `x^{a + b}`                          | ⚠️ **capacité** — `auto` sait depuis la PR #394, `simplify` non                                                         |
| `-(x+1)`                 | `-\left( x + 1 \right)`                       | `-x - 1`                             | écriture — `simplify` garde le signe devant                                                                             |

**Écriture** : les deux sont justes, la forme diffère.
**Décision** : `simplify` compare les coûts et garde la forme la moins chère, là
où `developper` et `auto` développent. C'est voulu, et c'est la raison d'être
des intentions.
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
4. ⚠️ Restent aussi : `simplify((e^x)^3)` garde `\left( e^x \right)^3`
   (barrière de coût), et le **quotient** `e^{2x}/e^x` n'est réduit par aucune
   colonne.

## Non couvert

**Les grandeurs avec unités** n'entrent pas dans ce panel : elles ne se lisent
pas en LaTeX (`12000[m]` n'est pas du LaTeX) mais par le parseur maison. Elles
ont leur propre couverture dans `src/lib/mathAST/tidy/__tests__/`.

**Les étapes** non plus : ce panel ne compare que le RÉSULTAT. La narration des
étapes pédagogiques — « On reconnaît un trinôme carré parfait » — est pinnée
par les snapshots de `pedagogical-simplify/__tests__/`.
