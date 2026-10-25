---
title: Atelier — la commande « développer » (phase 0)
date: 2026-10-14
status: livrée — PR 1 (#1372), PR 2 (#1375), PR 3 (#1377) mergées, en prod ; ordre des termes non polynomiaux documenté dans docs/systeme/atelier.md ; archivé le 2026-10-25
---

# Atelier — la commande « développer »

Contexte : décision de David du 2026-10-14, après le prototype de saisie
([atelier-saisie-naturelle.md](atelier-saisie-naturelle.md)) : créer `limite` et `développer`.
`limite` est faite par une autre session (#1359, #1366) ; reste `développer`.

- Le registre du moteur n'a pas d'`expand` : comme `factoriser`, la commande est servie par
  l'atelier (`ATELIER_ONLY_COMMANDS`), avec l'intention `developper` de `pedagogical-simplify`.
- Décisions du 2026-09-21 (fusion `simplify` / `pedagogical-simplify`) : « développer contient
  déjà réduire » ; les étapes de `normalize` ne sont PAS pédagogiques — les retirer du chemin élève.

## Mesures (2026-10-14, intention `developper`, niveau lycée, 35 expressions)

Les réponses sont justes, coefficients exacts compris (`(x+1)^100`, BigInt). Les étapes ne sont
pas montrables :

1. **Produits collés** : `2 x 1` s'affiche « 2x1 », `2 \times 2 x 5` « 2×2x5 », la distribution de
   `(2x−1)(x+3)` « 2xx + 2x3 − 1x − 1×3 ».
2. **Doublons** : `(2x−1)(x+3)` montre 7 fois la même ligne, `(3x−1)² − (x+2)²` 13 fois (trace
   de `normalize`).
3. **Distribution cachée** : `3(x−2) − (x+1)` → une seule étape « On regroupe les termes
   semblables » qui saute à `2x − 7` ; de même `−2(x−4)`, `x(x−1)`, `a(x+b)`.
4. **Étape fantôme** : `1/(x+1)` → « On réduit la fraction », sans rien changer.
5. **Ordre** : `(a+b)²` → `2ab + a² + b²` ; `a(x+b)` → `ab + ax`.
6. **Équation** : `(x+1)² = 0` → `x² + 2x1 + 1² = 0`, ni calculé ni réduit.

Aucun exercice en production n'utilise ces étapes (0 modèle sur 1 005, base lue le 2026-10-14) ;
ailleurs, seul le RÉSULTAT sert (intégration, stratégie 6 de `factoriser`). Réécrire les étapes
ne touche donc à aucune correction d'élève.

## A. La commande

- `.développer <expression>` (sans le point quand la saisie naturelle sera là) ; `.developper`
  accepté ; rubrique « Calculer » de `.aide`, juste après `factoriser` ; exemple
  `.développer (2x-1)(x+3)`.
- **Développer ET réduire** (la consigne scolaire).
- Les noms d'objets sont remplacés comme pour `factoriser` : `.développer f`, `.développer f(x)` ;
  une carte en erreur donne le message existant (« « h » est dans tes objets, mais elle est en
  erreur : … »).

## B. Les réponses

| saisie             | réponse                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `(x+1)^2`          | x² + 2x + 1                                                                                           |
| `(x-3)^2`          | x² − 6x + 9                                                                                           |
| `(2x+5)^2`         | 4x² + 20x + 25                                                                                        |
| `(x+2)(x-2)`       | x² − 4                                                                                                |
| `(2x-1)(x+3)`      | 2x² + 5x − 3                                                                                          |
| `3(x-2)-(x+1)`     | 2x − 7                                                                                                |
| `5-2(x-3)`         | −2x + 11                                                                                              |
| `x(x-1)`           | x² − x                                                                                                |
| `(3x-1)^2-(x+2)^2` | 8x² − 10x − 3                                                                                         |
| `(x+1)(x+2)(x+3)`  | x³ + 6x² + 11x + 6                                                                                    |
| `(x+1)^3`          | x³ + 3x² + 3x + 1                                                                                     |
| `(a+b)^2`          | a² + 2ab + b² — **aujourd'hui 2ab + a² + b²**                                                         |
| `a(x+b)`           | ax + ab — **aujourd'hui ab + ax**                                                                     |
| `e^x(x+1)`         | x eˣ + eˣ                                                                                             |
| `(0,5x+1)^2`       | ¼x² + x + 1 en mode exact, 0,25x² + x + 1 en mode décimal (comme Calcul : `0,5 × 0,5` → 1/4 en exact) |
| `(x+1)(x-1)/(x+2)` | (x² − 1)/(x + 2) — le numérateur et le dénominateur, chacun développé                                 |

**Ordre des termes** : puissances décroissantes de x, les autres lettres traitées comme des
coefficients ; sans x, ordre alphabétique (a² + 2ab + b²).

## C. Rien à développer (ligne normale, pas rouge)

- `x^2+1`, `x^2+2x+1` → « x² + 1 est déjà développée et réduite. »
- `1/(x+1)`, `(x+1)^(-1)` → « Il n'y a rien à développer dans 1/(x + 1). »
- `(x+1)^n` → « Je ne sais pas développer (x + 1)ⁿ : l'exposant n'est pas un nombre. »

## D. Refus (ligne rouge)

- Rien après la commande → « Il manque l'expression à développer. Par exemple :
  .développer (2x-1)(x+3) »
- Équation, inéquation → « On développe une expression, pas une équation. Pour la résoudre :
  .résoudre (x+1)^2=0 »
- Liste, texte → « « … » n'est pas une expression qu'on sait développer. »

## E. « Comment ? » — les étapes visées

Deux règles pour toutes : **jamais deux lignes identiques de suite**, et **un × entre deux
facteurs** dès qu'un nombre suit une lettre ou un autre nombre.

`(x+1)²`
: On reconnaît (a + b)² = a² + 2ab + b², avec a = x et b = 1 → = x² + 2 × x × 1 + 1²
: On calcule chaque terme → = x² + 2x + 1

`(2x − 1)(x + 3)`
: On distribue : chaque terme du premier facteur multiplie chaque terme du second
→ = 2x × x + 2x × 3 − 1 × x − 1 × 3
: On calcule chaque produit → = 2x² + 6x − x − 3
: On réduit → = 2x² + 5x − 3

`3(x − 2) − (x + 1)`
: On distribue 3, et le signe − devant la parenthèse change le signe de chaque terme
→ = 3x − 6 − x − 1
: On réduit → = 2x − 7

`(3x − 1)² − (x + 2)²`
: On développe chaque carré avec son identité remarquable → = 9x² − 6x + 1 − (x² + 4x + 4)
: On enlève la parenthèse précédée d'un − → = 9x² − 6x + 1 − x² − 4x − 4
: On réduit → = 8x² − 10x − 3

`(x + 1)³`
: On écrit (x + 1)³ = (x + 1)²(x + 1), puis comme ci-dessus : identité, distribution, réduction.

Exposant 4 ou plus : une seule étape, « On développe la puissance » (comme aujourd'hui).

**Version résumée** (l'interrupteur qui existe déjà) : sans les lignes à × ni les « pourquoi ».

## Découpage proposé

1. **PR 1 — la commande** (atelier) : A, B (ordre des termes compris), C, D. Pas de
   « Comment ? » tant que les étapes ne sont pas rédigées : mieux vaut aucune étape que celles
   mesurées plus haut.
2. **PR 2 — les étapes** (`mathAST/pedagogical-simplify`, agent `mathast-expert`, Opus) : E, dans
   la ligne de la décision du 2026-09-21 (la trace de `normalize` sort du chemin élève). Puis le
   bouton « Comment ? » branché.

Tests d'abord, rouges, pour chaque ligne de B, C, D et E ; `code-reviewer` en fin de PR.

## Questions à trancher

1. Le tableau B, dont l'ordre (a² + 2ab + b², ax + ab) et les décimaux qui suivent le mode.
2. Une équation : refus (recommandé) ou développer chaque membre (`(x+1)² = 4` →
   `x² + 2x + 1 = 4`) ?
3. Deux PR, la commande d'abord sans « Comment ? » (recommandé), ou une seule PR complète ?

## Journal

- 2026-10-14 — phase 0 écrite après mesure du module (35 expressions) et de la base de production.
- 2026-10-14 — **décisions de David** (« je suis tes recos ») : (1) tableau B tel quel, ordre
  a² + 2ab + b² et ax + ab, décimaux selon le mode ; (2) équation REFUSÉE, renvoi vers `.résoudre` ;
  (3) deux PR : la commande d'abord sans « Comment ? », les étapes ensuite.
- 2026-10-14 — **décision de David** (« oui », sur ma reco) : les décimaux s'alignent sur `.limite`
  (décision du 2026-10-06) — un décimal tapé, ou le mode décimal, donne des décimaux
  (`(0,5x+1)²` → 0,25x² + x + 1 même en mode exact) ; sinon des fractions ; une fraction sans
  écriture décimale finie reste une fraction. Remplace « décimaux selon le mode » du tableau B.
- 2026-10-14 — **PR 1 mergée (#1372)** : la commande, la réponse seule. Revue : `-(x+1)` annoncé « rien
  à développer » (le module rend 0 étape : il part écrit `-1(x+1)`), réponse inachevée
  (`e^((x+1)^2)` → `e^{x^2 + 2 x 1 + 1^2}`, désormais « Je ne sais pas développer »), plafond de
  500 termes estimé avant le calcul (`(x+1)^2000` figeait la page 5 s), messages qui citent
  l'expression tapée. **Pour la PR 2** : le module développe sous `cos` (`cos(2(x+1))` →
  `cos(2x+2)`) mais pas sous `e^…` (`e^(2(x+1))` → « rien à développer ») ; une somme dans un
  exposant n'est pas réduite.
- 2026-10-14 — **PR 2 sur la branche `feat/developper-etapes`** : le « Comment ? » rédigé par
  `pedagogical-simplify/expand-steps.ts` (section E), l'ordre du manuel déplacé dans
  `pedagogical-simplify/expand-order.ts`. Le résultat et la trace de l'intention `developper` ne
  changent pas (deux instantanés figent la trace). Sans étapes, réponse gardée : somme sous une
  fonction, une racine, un exposant ou dans une fraction — dont `(x+1)(x-1)/(x+2)`, que le texte lit
  `(x+1)·((x-1)/(x+2))`.
- 2026-10-14 — **PR 2 mergée (#1375)**. Revue (~150 expressions, réponses identiques à `main`) :
  la règle B ne s'applique qu'à une somme de monômes, sinon l'ordre du module (`(e^x+e^(-x))^2` →
  `e^{2x} + e^{-2x} + 2`, et non l'ordre du manuel `e^{2x} + 2 + e^{-2x}` : il faudrait une autre
  règle) ; « avec a = … et b = … » seulement si l'expression n'a ni a ni b ; titres de
  distribution, « On réduit », « On ordonne les termes » qui disent vrai ; a et b en décimal en mode
  décimal. **Question ouverte à David (A/B)** : brancher aussi les corrections d'exercices générées
  (`generatedSteps` `kind: 'simplify'`, `intent: 'developper'`, aucun en production) sur
  `writeExpandSteps` — reco B, petite PR, deux instantanés de démo changent.
- 2026-10-14 — **décision de David : B** — les corrections d'exercices générées (`intent: 'developper'`)
  montrent la même rédaction que l'atelier (`writeExpandSteps`). PR 3, branche `feat/developper-corrections`.
- 2026-10-14 — **PR 3 mergée (#1377)** : `explainExpansion` (`pedagogical-simplify/expand-explained.ts`)
  sert l'atelier, les corrections d'exercices générées et la démo ; sans rédaction, Mode A, jamais
  l'ancienne trace. Revue : l'atelier rend la même chose (136 cas, 0 écart). **Points ouverts** :
  (1) `(e^x+e^(-x))^2` s'écrit `e^{2x} + e^{-2x} + 2` (ordre du module) et non `e^{2x} + 2 + e^{-2x}`
  — question posée à David ; (2) les corrections d'exercices générées écrivent les décimaux avec un
  point dans le LaTeX, comme les autres corrections générées (rendu à l'écran non vérifié).
