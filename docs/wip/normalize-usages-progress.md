# Chantier `normalize-usages` — développer sans `normalize`, nommer ses usages internes

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 validée (§ 2), lot (a) lancé._

- **État** : phase 0 validée par David (Q1-Q5 selon les recos, Q2 = a). Lot (a) en cours sur `feat/normalize-usages-developper`.
- **But** : (a) le RÉSULTAT de « développer » vient d'un développeur du moteur pédagogique, plus de `normalize` (`runNormalizePass`, `pedagogical-simplify/pipeline.ts:534`, + `expand-steps.ts:350, 357, 473`) ; (b) ensuite, petite PR : une fonction partagée au lieu des ~12 copies locales, `polynomialCoefficients`.
- **Prochaine action** : tests de non-régression (polynomial identique) + tests rouges des comportements du § 2, puis le développeur.
- **En attente de David** : rien.
- **Pièges connus** : les règles `developper` seules ne distribuent PAS (`2(x+3)` reste, § 1.2) ; le résultat sert aussi à l'intégration, `factoriser` (stratégie 6), `auto`, `requested-form` ; pas de `pnpm math` ; décimaux déjà gardés par `explainExpansion` (`decimalFraction`).
- **Worktree / branche** : `ubumaths-wt-normalize-usages` · `feat/normalize-usages-developper`.

## Contexte

Journal de départ : `docs/archive/wip/simplify-carte-progress.md` (§ 9, § 12, § 22, § 23). Carte des besoins : `docs/systeme/mathast/README.md` § « Quelle fonction pour quel besoin ».

## 1. Phase 0 (2026-10-25, à valider par David)

### 1.1 Où `normalize` fait « développer »

- La réponse de `.développer`, des corrections d'exercices et de la démo vient de `explainExpansion` → `generatePedagogicalSimplifySteps(intent 'developper')` : phase A (règles du moteur) puis **phase B = `normalize`** (`runNormalizePass`, `pipeline.ts:534`, `useNormalize: true`, `intent-rules.ts:146`). `writeExpandSteps` REÇOIT cette réponse et rédige le chemin ; il calcule chaque terme et chaque parenthèse réduite par `normalize` (`expand-steps.ts:350, 357, 473`).
- Le même résultat sert aussi à : l'intégration (`pedagogical-integration/pipeline.ts:546`), la stratégie 6 de `factoriser` (`pipeline.ts:494`), `auto` (`pipeline.ts:574`), la forme demandée (`requested-form.ts:116`).

### 1.2 Sonde (test jetable supprimé, copie dans le scratchpad de session)

Colonne 1 : réponse actuelle (`explainExpansion`, lycée). Colonne 2 : règles `developper` du moteur seules, puis `tidy` (= « sans `normalize` » naïf).

| Entrée                                                                                               | Aujourd'hui                                          | Sans `normalize` (naïf)                                         |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| `(x+1)(x−2)`, `(2x−1)(x+3)`, `(x+1)²`, `(2x−3)²`, `(x+2)(x−2)`, `(a+b)(a−b)`, `(x²+1)(x−1)`, `(2x)²` | développés réduits                                   | identiques                                                      |
| `(0,5x+1)²`                                                                                          | `0,25x² + x + 1`                                     | identique                                                       |
| `2(x+3)`, `3x−(2−x)`, `−2(x−4)+3x`, `x(x+1)−x²`, `x²(x³+1)`, `1,2(x−0,5)`, `0,5x(x+0,2)`             | développés réduits (décimaux gardés)                 | **inchangés** : pas de distribution d'un facteur, ni du signe − |
| `(x+1)³`, `(x+1)⁵`, `(x+1)(x+2)(x+3)`, `2x(3x−1)−(x+1)²`                                             | développés                                           | inchangés ou à moitié                                           |
| `(x+1)/2` (÷)                                                                                        | `½x + ½`, **sans étapes**                            | `(x+1)/2`                                                       |
| `(x+1)(x−1)/2`                                                                                       | `½x² − ½`, **sans étapes**                           | inchangé                                                        |
| `1/(x+1) + 1`                                                                                        | `(x+2)/(x+1)`, **sans étapes** (dénominateur commun) | inchangé                                                        |
| `(x+1)(x−2) + 1/(x+1)`                                                                               | `(x³−3x−1)/(x+1)`, **sans étapes**                   | `x² − x − 2 + 1/(x+1)`                                          |
| `(x²−1)/(x+1)`                                                                                       | `x − 1`, **sans étapes**, x ≠ −1 perdu               | inchangé                                                        |
| `(x+1)²/x`                                                                                           | `(x²+2x+1)/x`, sans étapes                           | identique                                                       |
| `√2(x+√8)`                                                                                           | `√2x + 4`                                            | `√2(2√2 + x)`                                                   |
| `(x+1)eˣ`, `(eˣ+1)²`                                                                                 | `xeˣ + eˣ`, `e^{2x} + 2eˣ + 1`                       | inchangé, `(eˣ)² + …`                                           |
| `e^{ln x}(x+1)`, `(√x)²(x+1)`                                                                        | `x² + x` (x > 0, x ≥ 0 perdus)                       | `x(x+1)`, inchangé                                              |

Lecture : ce qui se montre mal aujourd'hui, ce sont les **fractions** (toutes « sans étapes ») et les **identités qui perdent le domaine** ; tout le polynomial est juste. Mais on ne peut pas juste couper `normalize` : le moteur ne sait pas distribuer seul. Il faut un vrai « développer » à la place.

### 1.3 Relevé des 98 appels (hors tests)

| Famille                                             | Appels | Ce que c'est                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solveurs (`solve/**`, `pedagogical-solve/_helpers`) | 74     | surtout des **valeurs exactes** (solutions, Δ, racines, coefficients numériques), montrées via `exactValueToShow` depuis 5f-4 ; 7 **lisent les coefficients** d'un polynôme en x (`polynomial:395`, `linear:157`, `quadratic:244`, `solve:1951`, `:1954`, `:2153`, `rational:93`) ; 1 réécrit des facteurs avec variable (`solve:524`) |
| Intégration                                         | 9      | lecture d'un rationnel exact (×3), quotients et cofacteurs comparés (×3), intégrandes intermédiaires de l'IPP (`pedagogical-integration/pipeline.ts:1384, 1541, 1578`)                                                                                                                                                                 |
| Limites                                             | 6      | quotient mis au même dénominateur (`sum-reduction`, `lhopital`), coefficients et valeurs de limite                                                                                                                                                                                                                                     |
| Développer                                          | 4      | `expand-steps.ts` ×3 (lot a) ; `pipeline.ts:373` longueurs `√(AB²)` (valeur)                                                                                                                                                                                                                                                           |
| Divers                                              | 5      | `normalize.ts:2113` (exposant canonique), `exact-value`, `matrix`, `periodic-member`, `curve-nature` (équation de courbe développée)                                                                                                                                                                                                   |

Une douzaine de ces appels sont déjà enveloppés dans des fonctions locales qui portent chacune un nom différent pour la même chose : `simplified` (×3), `canon` (×2), `normalForm`, `simplify`, `normalizeSafe`, `exactConstant`, `exactRationalOf`, `exactValue`…

### 1.4 Questions à David

- **Q1 — fractions à dénominateur avec x.** Proposé : « développer » développe les numérateurs et les produits, rien d'autre. `1/(x+1) + 1` → « rien à développer » ; `(x+1)(x−2) + 1/(x+1)` → `x² − x − 2 + 1/(x+1)` ; `(x²−1)/(x+1)` → rien à développer ; `(x+1)²/x` → `(x²+2x+1)/x` (inchangé).
- **Q2 — division par un nombre** (`(x+1)/2`, `(x+1)(x−1)/2`). **a** (reco) : on distribue avec une étape nommée, `½x + ½` et `½x² − ½` ; **b** : on garde la barre et on développe le numérateur, `(x² − 1)/2`.
- **Q3 — identités qui perdent le domaine** (`e^{ln x}(x+1)`, `(√x)²(x+1)`). Reco : « développer » ne les applique pas (`xe^{ln x} + e^{ln x}`) ; cas absents des exercices réels, pas d'effort en plus.
- **Q4 — comment.** Reco : un module « développer » du moteur (distribuer un facteur et le signe −, produits de sommes, puissances entières, identités ; chaque terme calculé et la somme réduite par `tidy`, décimaux gardés) qui remplace la phase B `normalize` de l'intention `developper`. Tous les appelants du § 1.1 changent avec lui (un seul moteur). `expand-steps.ts` en tire ses termes au lieu de `normalize`. Les cas polynomiaux du § 1.2 doivent rester identiques (tests de non-régression d'abord).
- **Q5 — lot (b)**, sans effet pour l'élève. Reco : après (a), une petite PR : une fonction partagée dans `normal/` remplace les ~12 copies locales (valeur exacte : nom à choisir, p. ex. `exactForm`) et `polynomialCoefficients(expr, x)` remplace les 7 lectures de coefficients ; les autres appels restent tels quels, ils calculent des valeurs (§ 23 : voulu).

## 2. Phase 0 validée (David, 2026-10-25 : « ok pour tout »)

- **Q1** : « développer » ne développe que les produits et les numérateurs ; `1/(x+1) + 1` et `(x²−1)/(x+1)` → rien à développer ; `(x+1)(x−2) + 1/(x+1)` → `x² − x − 2 + 1/(x+1)` ; `(x+1)²/x` → `(x²+2x+1)/x`.
- **Q2 = a** : division par un nombre distribuée, étape nommée : `(x+1)/2` → `½x + ½`, `(x+1)(x−1)/2` → `½x² − ½`.
- **Q3** : pas d'identité qui perd le domaine : `e^{ln x}(x+1)` → `xe^{ln x} + e^{ln x}`.
- **Q4** : un développeur dans le moteur pédagogique remplace la phase B `normalize` de l'intention `developper` ; tous les appelants changent avec lui ; le polynomial reste identique (tests de non-régression d'abord).
- **Q5** : lot (b) après (a), petite PR, rien ne change à l'écran.
- Question de David : « on avait pas déjà réécrit développer ? » — non : le 2026-10-14 (atelier-developper) a réécrit la RÉDACTION des étapes, la réponse venait toujours de `normalize` ; simplify-carte lot 3 a retiré le développement de `réduire`/`auto` (« `développer` inchangé », § 33) ; la décision § 23 n'avait jamais été codée.
