# Réponse « intervalles » — suivi du chantier

Worktree : `../ubumaths-wt-intervalles` · branche `feat/reponse-intervalles` · démarré le 2026-10-01.

Nouveau type de réponse pour une case à trous : un ENSEMBLE de réels écrit en notation intervalle
(inéquations, ensembles de solutions). Spécification validée par David le 2026-10-01.

## Décisions (David, 2026-10-01)

- **Réutiliser mathAST** : `src/lib/mathAST/domain/` (type `Domain`, algèbre exacte sur
  `$lib/math/intervals`) et `domain/validation/` (`parseStudentDomain`, `compareDomains`,
  `detect-mistakes` et ses messages FR). Pas de lecteur neuf.
- **Défaut à corriger d'abord** (test rouge avant) : `parseEndpointValue` fait `parseFloat` avant la
  branche fraction → `3/2` lu 3, `1-√2` lu 1. Les bornes passent par le parseur de mathAST
  (fractions, radicaux, π) et se comparent exactement (`compareNumericNodes`).
- **Q55 — barème** : le score 0-100 de mathAST (`calculateDomainSimilarity`) est IGNORÉ. Statut par
  case comme partout : `correct` (1) / `unoptimal_form` (½) / `incorrect` (0) / `empty`.
  ½ SEULEMENT pour : intervalles contigus ou chevauchants non réunis, `[a;a]` au lieu de `{a}`, borne
  non simplifiée (`\frac42`). Tout le reste est faux, avec le message de l'erreur détectée
  (crochet, borne, réunion oubliée…).
- **Q49** : ordre des intervalles indifférent = juste.
- **Q50** : réglage par modèle, clé de contrainte dédiée `intervalForm` (défaut ½ = `warn` ;
  `strict` = 0, `off` = 1). Le défaut `form: strict` (ADR 0013) n'est pas touché.
- **Q51** : la virgule comme séparateur de bornes (`]2,3[`) est refusée : « sépare les bornes par un
  point-virgule ».
- **Q52** : la réponse attendue est écrite par l'auteur (pas de calcul depuis l'inéquation en v1).
- **Marquage** : drapeau par case `answerKind: 'intervalles'` (modèle : `acceptDecimal`) — schémas
  Zod, `instance-generator`, `public-question.ts` (le drapeau passe, la réponse non), validateur
  (`validateSingleBlank`, `validateBlankValue`, donc `blankStatuses` du barème serveur),
  éditeur de modèle. Réponse attendue : `]-\infty;{{x1}}[\cup]{{x2}};+\infty[`.
- **Saisie** : phase 0 = mesure au VRAI clavier (Playwright, frappes réelles) ; puis onglet
  « Intervalles » du clavier virtuel (`]`, `[`, `;`, `+\infty`, `-\infty`, `\cup`, `\emptyset`,
  `\mathbb{R}`, `\setminus\{\}`), affiché seulement pour une case `intervalles`.

## Comportements à tester (validés)

| n°  | Cas                                                                                     | Attendu                                           |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 17  | `]-\infty;-2[\cup]3;+\infty[`, et dans l'ordre inverse                                  | juste                                             |
| 18  | `\mathbb{R}\setminus\{2\}` ≡ `]-\infty;2[\cup]2;+\infty[`, dans les deux sens           | juste                                             |
| 19  | `\emptyset`, `\varnothing`, `\{\}` si S = ∅ ; `\mathbb{R}` si S = ℝ                     | juste                                             |
| 20  | `\{3\}` juste ; `[3;3]`                                                                 | ½                                                 |
| 21  | intervalles contigus non réunis                                                         | ½ + message                                       |
| 22  | bornes exactes équivalentes juste ; borne irrationnelle arrondie                        | faux                                              |
| 23  | `]2;3]` pour `]2;3[`                                                                    | faux                                              |
| 24  | `[-\infty;2]`                                                                           | faux « l'infini est toujours exclu »              |
| 25  | `]3;-2[`                                                                                | faux « bornes dans l'ordre croissant »            |
| 26  | `x<-2`                                                                                  | faux « écris un ensemble »                        |
| 27  | `]0{,}5;1[` lu 0,5 ; `]2,3[`                                                            | message séparateur                                |
| 28  | toutes les formes MathLive mesurées en phase 0                                          | relues                                            |
| 29  | `S=` en tête ignoré ; vide                                                              | `empty`                                           |
| 30  | serveur d'évaluation = même statut que le navigateur ; drapeau présent, réponse absente | —                                                 |
| 31  | réponse attendue du modèle illisible                                                    | échec du test du modèle, pas de la question élève |

## Lots

- [x] 0 — mesure MathLive au vrai clavier + ce document
- [x] 1 — correction `parseEndpointValue` + module de jugement (Domain → statut/message)
  - preuve rouge : `]3/2 ; +∞[` → borne lue 3 (`compareNumericNodes` = 1 au lieu de 0) ;
    `detect-mistakes` ne lisait que les nombres nus (`-2`, `1-√2` → aucune erreur nommée) et
    comparait les bornes à 0,001 près → comparaison exacte ;
  - `domainsAreEqual(ℝ \ {2}, ]-∞;2[ ∪ ]2;+∞[)` rendait `false` → points exclus développés ;
  - module : `src/lib/questions/intervals/interval-answer.ts`.
- [x] 2 — câblage validateur / barème / schémas / public-question / éditeur (case cochée dans les
      valeurs partagées ; par case : JSON des blancs)
- [x] 3 — clavier « Intervalles » (`questions/intervals/keyboard-intervals.ts`) + `smartFence = false`
      posé au focus sur les champs d'une question à case `intervalles` (`FillBlanksInput`)
- [ ] 4 — modèle n° 11 du second degré (inéquations), en brouillon

## Mesure MathLive (phase 0) — 2026-10-01

**Décor** : Playwright 1.59 (Chromium headless), serveur de dev du worktree sur 5176, page `/demo`
(MathLive 0.110 chargé). Champ construit comme `MathPrompt` : `<math-field readonly>` contenant
`S=\placeholder[0]{}`, `mathModeSpace = '\,'`, configuration MathLive par défaut (aucun réglage
global dans le code). Clic RÉEL dans la case, frappes RÉELLES (`page.keyboard.type` / `press`,
CDP `Input.dispatchKeyEvent`), lecture `getPromptValue('0')`. Scripts hors dépôt (scratchpad).

⚠️ Premier passage faussé : clic au bord droit du champ, hors de la case → frappes perdues. Refait
avec le clic dans la case.

| Frappes                                | `smartFence` par défaut (actif)                                             | `smartFence = false`                                |
| -------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| `]2;3[`                                | `]2;3\left\lbrack\right\rbrack`                                             | `]2;3[`                                             |
| `[2;3]`                                | `\left\lbrack2;3\right\rbrack`                                              | `[2;3]`                                             |
| `]2;3]`                                | `]2;3]`                                                                     | `]2;3]`                                             |
| `[2;3[`                                | `\left\lbrack2;3\left\lbrack\right\rbrack\right\rbrack`                     | `[2;3[`                                             |
| `]-oo;2[` (raccourci `oo`)             | `]-\infty;2\left\lbrack\right\rbrack`                                       | `]-\infty;2[`                                       |
| `]-` `\infty` Entrée (ou espace) `;2[` | idem                                                                        | `]-\infty;2[`                                       |
| `]-oo;2[` `\cup` Entrée `]3;+oo[`      | `]-\infty;2\left\lbrack\cup\right\rbrack3;+\infty\left\lbrack\right\rbrack` | `]-\infty;2[\cup]3;+\infty[`                        |
| `]-oo;2[U]3;+oo[`                      | `…\left\lbrack U\right\rbrack…`                                             | `]-\infty;2[U]3;+\infty[`                           |
| `{3}`                                  | `\left\lbrace3\right\rbrace`                                                | `\lbrace3\rbrace`                                   |
| `\{` Entrée `3` `\}` Entrée            | `\{3\}`                                                                     | `\{3\}`                                             |
| `{}` / `\{` `\}`                       | `\left\lbrace\right\rbrace` / `\{\}`                                        | `\lbrace\rbrace` / `\{\}`                           |
| `]0,5;1[`                              | `]0,5;1\left\lbrack\right\rbrack`                                           | `]0,5;1[` (virgule nue, pas `{,}`)                  |
| `]2,3[`                                | `]2,3\left\lbrack\right\rbrack`                                             | `]2,3[`                                             |
| `S=]2;3[`                              | `S=]2;3\left\lbrack\right\rbrack`                                           | `S=]2;3[`                                           |
| `\emptyset` / `\varnothing` Entrée     | `\emptyset` / `\varnothing`                                                 | idem                                                |
| `\R` Entrée                            | `\R`                                                                        | `\R`                                                |
| `\mathbb` Entrée `R`                   | `R` (le style est perdu)                                                    | `R`                                                 |
| `\R` `\setminus` `{2}`                 | `\R\setminus\left\lbrace2\right\rbrace`                                     | `\R\setminus\lbrace2\rbrace`                        |
| `x<-2` ; `x` `\le` Entrée `2`          | `x<-2` ; `x\le2`                                                            | idem                                                |
| `]3/2` → `;+oo[`                       | —                                                                           | `\frac{]3}{2};+\infty[` (le `/` emporte le crochet) |
| `]-oo;-3/2` → `[`                      | —                                                                           | `]-\infty;-\frac32[`                                |
| `]1-sqrt2` → `;2[` (raccourci `sqrt`)  | —                                                                           | `]1-\sqrt2;2[`                                      |
| `]1-` `\sqrt` espace `2`               | —                                                                           | `]1-2;2[` (commande perdue)                         |
| `]0;pi[`                               | —                                                                           | `]0;\pi[`                                           |
| `] 2 ; 3 [` (espaces)                  | —                                                                           | `]\,2\,;\,3\,[`                                     |

**Conséquence (décision technique)** : avec `smartFence` actif, taper `[` ouvre une paire
`\left\lbrack…\right\rbrack` refermée automatiquement ; la sortie est AMBIGUË (`[2;3[` donne
`[2;3[]]` une fois linéarisé). Les champs qui contiennent une case `intervalles` passent donc
`smartFence = false` (prop de `MathPrompt`). La lecture accepte toutes les formes de la colonne de
droite, plus les formes sans ambiguïté de la colonne de gauche (`\left\lbrack2;3\right\rbrack`,
`\left\lbrace3\right\rbrace`). La virgule de MathLive est nue (`0,5`) : `{,}` (écriture de l'auteur)
est accepté aussi.

### Clavier virtuel « Intervalles » — mesure au vrai clavier (2026-10-01)

Même décor (page `/demo`, champ `readonly` + `\placeholder[0]{}`, `smartFence = false`), onglet chargé
dans le VRAI clavier virtuel de MathLive (page de premier niveau, pas le proxy d'iframe de vitest),
clics réels sur les touches de l'onglet, chiffres tapés au clavier physique :

| Touches                                            | Valeur lue                    |
| -------------------------------------------------- | ----------------------------- |
| `]` `-∞` `;` « -2 » `[` `∪` `]` « 3 » `;` `+∞` `[` | `]-\infty;-2[\cup]3;+\infty[` |
| `ℝ` `∖{}` « 2 »                                    | `\mathbb{R}\setminus\{2\}`    |
| `∅`                                                | `\emptyset`                   |
| `[` « -1 » `;` « 2 » `]`                           | `[-1;2]`                      |
| `]` « 1 » `;` « 5 » `[`                            | `]1;5[`                       |

Toutes relues juste par `judgeIntervalAnswer`. Test navigateur (vitest + Playwright, frappes
`userEvent.keyboard` réelles) : `FillBlanksInput-intervals-keyboard.svelte.test.ts` — rouge avant le
réglage `smartFence` (le champ restait `true`), vert après.
