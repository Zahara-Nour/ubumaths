# Panel de référence des simplifications

> **Mesuré le 2026-09-21** sur `main` à `006873aad`, et **pinné** par
> `src/lib/mathAST/__tests__/panel-simplifications.test.ts`. Si vous modifiez le
> moteur, le test rougit : mettez les deux à jour **ensemble**, sinon ce
> document pourrit en silence comme l'a fait le §1 de
> `docs/wip/simplify-reecriture-releve.md`.

## Ce que chaque colonne veut dire

| colonne      | ce qui est appelé                                                                           |
| ------------ | ------------------------------------------------------------------------------------------- |
| `simplify`   | `simplify(node)` — `tidy` → règles → « développer seulement si moins cher » → `tidy`        |
| `auto`       | `generatePedagogicalSimplifySteps`, intention `auto` : `reduire` ∪ factorisation symbolique |
| `reduire`    | identités, puissances, racines. Ni factorisation ni développement                           |
| `developper` | règles de développement + identités, puis `normalize`                                       |
| `factoriser` | factorisation + identités, puis extraction du contenu, puis `tidy`. **Pas** de `normalize`  |

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

| entrée                   | `simplify`            | `auto`                  | `reduire`               | `developper`            | `factoriser`              |
| ------------------------ | --------------------- | ----------------------- | ----------------------- | ----------------------- | ------------------------- |
| `\sqrt{8}`               | `2 \sqrt{2}`          | `2 \sqrt{2}`            | `2 \sqrt{2}`            | `2 \sqrt{2}`            | `2 \sqrt{2}`              |
| `\frac{1}{\sqrt{2}}`     | `\dfrac{\sqrt{2}}{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{1}{2} \sqrt{2}` | `\dfrac{\sqrt{2}}{2}`     |
| `\sqrt{x}\sqrt{x}`       | `x`                   | `x`                     | `x`                     | `x`                     | `\sqrt{x} \sqrt{x}`       |
| `\sqrt{x^2}`             | `\sqrt{x^2}`          | `\left\| x \right\|`    | `\left\| x \right\|`    | `\left\| x \right\|`    | `\sqrt{x^2}`              |
| `\sqrt[3]{x}\sqrt[3]{x}` | `\sqrt[3]{x}^2`       | `\sqrt[3]{x^2}`         | `\sqrt[3]{x^2}`         | `\sqrt[3]{x^2}`         | `\sqrt[3]{x} \sqrt[3]{x}` |
| `\sqrt{2}\sqrt{8}`       | `4`                   | `4`                     | `4`                     | `4`                     | `\sqrt{2} 2 \sqrt{2}`     |

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

| entrée         | `simplify`               | `auto`            | `reduire`         | `developper`      | `factoriser`                                |
| -------------- | ------------------------ | ----------------- | ----------------- | ----------------- | ------------------------------------------- |
| `x^2-1`        | `x^2 - 1`                | `x^2 - 1`         | `x^2 - 1`         | `x^2 - 1`         | `\left( x + 1 \right) \left( x - 1 \right)` |
| `x^2+2x+1`     | `\left( x + 1 \right)^2` | `x^2 + 2 x + 1`   | `x^2 + 2 x + 1`   | `x^2 + 2 x + 1`   | `\left( x + 1 \right)^2`                    |
| `2x+4`         | `2 x + 4`                | `2 x + 4`         | `2 x + 4`         | `2 x + 4`         | `2 \left( x + 2 \right)`                    |
| `x^2+2x`       | `x^2 + 2 x`              | `x^2 + 2 x`       | `x^2 + 2 x`       | `x^2 + 2 x`       | `x \left( x + 2 \right)`                    |
| `3x^2+6x+3`    | `3 x^2 + 6 x + 3`        | `3 x^2 + 6 x + 3` | `3 x^2 + 6 x + 3` | `3 x^2 + 6 x + 3` | `3 \left( x + 1 \right)^2`                  |
| `e^{x}+xe^{x}` | `x e^x + e^x`            | `x e^x + e^x`     | `x e^x + e^x`     | `x e^x + e^x`     | `\left( x + 1 \right) e^x`                  |
| `-2x-4`        | `-2 x - 4`               | `-2 x - 4`        | `-2 x - 4`        | `-2 x - 4`        | `-2 \left( x + 2 \right)`                   |
| `x^2y+xy`      | `x^2 y + x y`            | `x^2 y + x y`     | `x^2 y + x y`     | `x^2 y + x y`     | `x \left( x + 1 \right) y`                  |

## Fractions rationnelles

| entrée                        | `simplify`                                | `auto`                               | `reduire`                            | `developper`                         | `factoriser`                              |
| ----------------------------- | ----------------------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------ | ----------------------------------------- |
| `\frac{x^2-1}{x+1}`           | `x - 1`                                   | `x - 1`                              | `x - 1`                              | `x - 1`                              | `x - 1`                                   |
| `\frac{x^2-y^2}{x-y}`         | `x + y`                                   | `x + y`                              | `x + y`                              | `x + y`                              | `x + y`                                   |
| `\frac{x^2-y^2}{x^2+2xy+y^2}` | `\dfrac{x - y}{x + y}`                    | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`               | `\dfrac{x - y}{x + y}`                    |
| `\frac{x}{x}`                 | `1`                                       | `1`                                  | `1`                                  | `1`                                  | `1`                                       |
| `\frac{(x+y)^2}{x+2y}`        | `\dfrac{\left( x + y \right)^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | `\dfrac{\left( x + y \right)^2}{x + 2 y}` |

## Puissances

| entrée        | `simplify`    | `auto`      | `reduire`   | `developper`  | `factoriser`  |
| ------------- | ------------- | ----------- | ----------- | ------------- | ------------- |
| `x^{2}x^{3}`  | `x^5`         | `x^5`       | `x^5`       | `x^5`         | `x^2 x^3`     |
| `(x^{2})^{3}` | `x^6`         | `x^6`       | `x^6`       | `x^6`         | `x^6`         |
| `e^{x}e^{2x}` | `e^x e^{2 x}` | `e^{3 x}`   | `e^{3 x}`   | `e^{2 x} e^x` | `e^x e^{2 x}` |
| `(e^{x})^{3}` | `e^x^3`       | `e^{3 x}`   | `e^{3 x}`   | `e^x^3`       | `e^x^3`       |
| `x^{a}x^{b}`  | `x^a x^b`     | `x^{a + b}` | `x^{a + b}` | `x^a x^b`     | `x^a x^b`     |

## Exponentielle et logarithme

| entrée                 | `simplify`              | `auto`                  | `reduire`               | `developper`            | `factoriser`            |
| ---------------------- | ----------------------- | ----------------------- | ----------------------- | ----------------------- | ----------------------- |
| `e^{x}`                | `e^x`                   | `e^x`                   | `e^x`                   | `e^x`                   | `e^x`                   |
| `\ln(e^{x})`           | `\ln\left( e^x \right)` | `x \ln\left( e \right)` | `x \ln\left( e \right)` | `x \ln\left( e \right)` | `x \ln\left( e \right)` |
| `\frac{e^{2x}}{e^{x}}` | `\dfrac{e^{2 x}}{e^x}`  | `\dfrac{e^{2 x}}{e^x}`  | `\dfrac{e^{2 x}}{e^x}`  | `\dfrac{e^{2 x}}{e^x}`  | `\dfrac{e^{2 x}}{e^x}`  |
| `e^{0}`                | `1`                     | `1`                     | `1`                     | `1`                     | `1`                     |

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

## Où `simplify` et `auto` divergent

Mesuré sur le panel ci-dessus : **13 lignes sur 51**.

| entrée                   | `simplify`                                    | `auto`                               | nature                                                          |
| ------------------------ | --------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- | --- | ------------------------------------------ |
| `\frac{6}{8}x`           | `\dfrac{3 x}{4}`                              | `\dfrac{3}{4} x`                     | écriture — même valeur                                          |
| `\frac{1}{\sqrt{2}}`     | `\dfrac{\sqrt{2}}{2}`                         | `\dfrac{1}{2} \sqrt{2}`              | écriture — même valeur                                          |
| `\sqrt{x^2}`             | `\sqrt{x^2}`                                  | `\left                               | x \right                                                        | `   | ⚠️ **capacité** — `simplify` ne réduit pas |
| `\sqrt[3]{x}\sqrt[3]{x}` | `\sqrt[3]{x}^2`                               | `\sqrt[3]{x^2}`                      | écriture — même valeur                                          |
| `(x+1)^2`                | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`                      | **décision** — barrière de coût de `simplify`                   |
| `(2x-3)(x+4)`            | `\left( 2 x - 3 \right) \left( x + 4 \right)` | `2 x^2 + 5 x - 12`                   | **décision** — même barrière de coût                            |
| `x^2+2x+1`               | `\left( x + 1 \right)^2`                      | `x^2 + 2 x + 1`                      | **décision opposée** — l'un factorise, l'autre développe        |
| `\frac{(x+y)^2}{x+2y}`   | `\dfrac{\left( x + y \right)^2}{x + 2 y}`     | `\dfrac{2 x y + x^2 + y^2}{x + 2 y}` | **décision** — `auto` développe le numérateur                   |
| `e^{x}e^{2x}`            | `e^x e^{2 x}`                                 | `e^{3 x}`                            | ⚠️ **capacité** — `simplify` ne combine pas les exposants       |
| `(e^{x})^{3}`            | `e^x^3`                                       | `e^{3 x}`                            | 🔴 **bug de `simplify`** — `e^x^3` ne se relit pas              |
| `x^{a}x^{b}`             | `x^a x^b`                                     | `x^{a + b}`                          | ⚠️ **capacité** — `auto` sait depuis la PR #394, `simplify` non |
| `\ln(e^{x})`             | `\ln\left( e^x \right)`                       | `x \ln\left( e \right)`              | ⚠️ **les deux incomplets** — `auto` s'arrête à `x ln(e)`        |
| `-(x+1)`                 | `-\left( x + 1 \right)`                       | `-x - 1`                             | écriture — `simplify` garde le signe devant                     |

**Écriture** : les deux sont justes, la forme diffère.
**Décision** : `simplify` compare les coûts et garde la forme la moins chère, là
où `developper` et `auto` développent. C'est voulu, et c'est la raison d'être
des intentions.
**Capacité** : une colonne sait ce que l'autre ignore. C'est là qu'il y a du
travail, et le panel le rend visible.

⚠️ **Trois écarts relevés à la première lecture de ce panel, non traités :**

1. `simplify((e^x)^3)` rend `e^x^3`, une écriture qui **ne se relit pas**. Les
   correctifs de la PR #394 ont porté sur les règles de motifs, que
   `pedagogical-simplify` utilise et que `simplify` n'utilise pas.
2. `simplify` ne combine pas `e^x · e^{2x}` ni `x^a · x^b`, que `auto` sait
   faire depuis cette même PR.
3. `ln(e^x)` s'arrête à `x ln(e)` dans `auto`, au lieu de `x`.

## Non couvert

**Les grandeurs avec unités** n'entrent pas dans ce panel : elles ne se lisent
pas en LaTeX (`12000[m]` n'est pas du LaTeX) mais par le parseur maison. Elles
ont leur propre couverture dans `src/lib/mathAST/tidy/__tests__/`.

**Les étapes** non plus : ce panel ne compare que le RÉSULTAT. La narration des
étapes pédagogiques — « On reconnaît un trinôme carré parfait » — est pinnée
par les snapshots de `pedagogical-simplify/__tests__/`.
