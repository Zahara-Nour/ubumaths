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

- [ ] 0 — mesure MathLive au vrai clavier + ce document
- [ ] 1 — correction `parseEndpointValue` + module de jugement (Domain → statut/message)
- [ ] 2 — câblage validateur / barème / schémas / public-question / éditeur
- [ ] 3 — clavier « Intervalles »
- [ ] 4 — modèle n° 11 du second degré (inéquations), en brouillon

## Mesure MathLive (phase 0)

_À remplir._
