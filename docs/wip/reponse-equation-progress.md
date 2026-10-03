# Réponse « équation » — suivi du chantier

Worktree : `../ubumaths-wt-equation` · branche `feat/reponse-equation` · démarré le 2026-10-03.
Lot 0 de la géométrie repérée : une case dont l'attendu est une ÉQUATION (droite, cercle) est
jugée sur l'ensemble de points qu'elle décrit, pas sur son écriture.

## Constat (mesuré avant le chantier)

Sans marquage, une équation attendue est comparée comme une écriture :

- attendu `2x-y+1=0` : `-2x+y-1=0`, `4x-2y+2=0`, `y=2x+1`, `2x-y=-1` → `incorrect` ;
- attendu `(x-1)^2+(y+2)^2=9` : `x^2+y^2-2x+4y-4=0` → `incorrect`, `(x-1)^2+(y+2)^2=3^2` → `bad_form` ;
- attendu `x=4` : `x-4=0`, `2x=8` → `incorrect`.

## Spécification (validée par David le 2026-10-03)

- Drapeau par case `answerKind: 'equation'` (même câblage que `'intervalles'`). Nom : `equation`,
  sans accent (un identifiant n'en porte pas ; le mot est le même en français et en anglais).
- P = (membre gauche − membre droit), développé et réduit par mathAST (`normalize`, coefficients
  rationnels exacts, radicaux exacts). Réponse juste si P_rep = k·P_att, k constante non nulle
  (calcul exact, aucun flottant).
- Degré 1 (droite) : tout k → `correct`.
- Degré ≥ 2 (cercle) : |k| = 1 → `correct` ; |k| ≠ 1 → `unoptimal_form`, violation `form`
  (avertissement) « Simplifie l'équation : le coefficient de x² doit valoir 1. ». k est mesuré
  après avoir ramené l'attendue au coefficient 1 du terme de référence : x², sinon y², sinon le
  premier terme de plus haut degré (ordre canonique de mathAST). Points ouverts 1 et 2 tranchés par
  le coordinateur le 2026-10-03.
- Formes exigeables (`requiredForm` de la case, comme les autres formes) : `reduite` (y = mx + p,
  ou x = c), `cartesienne` (ax + by + c = 0, membre droit 0), `centre-rayon`
  ((x − a)² + (y − b)² = r²). Juste mais pas sous la forme exigée → `bad_form` + message.
- Pas une équation, non polynomiale, autres variables, illisible → `incorrect`, jamais d'exception.
- Sans `answerKind`, rien ne change.

## Comportements à tester

| n°  | Cas                                                                                                                                             | Attendu                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | attendu `2x-y+1=0` : `2x-y+1=0`, `-2x+y-1=0`, `4x-2y+2=0`, `y=2x+1`, `2x-y=-1`, `y=1+2x`                                                        | correct                                      |
| 2   | attendu `x=4` : `x-4=0`, `2x=8`, `4=x`                                                                                                          | correct                                      |
| 3   | attendu `y=3` : `y-3=0`, `2y=6`                                                                                                                 | correct ; `x=3` incorrect                    |
| 4   | fractions : attendu `2x-y+1=0`, réponse `x-\frac12y+\frac12=0`, `y=\frac{4x+2}{2}`                                                              | correct                                      |
| 5   | attendu `(x-1)^2+(y+2)^2=9` : `x^2+y^2-2x+4y-4=0`, `(x-1)^2+(y+2)^2=3^2`, `9=(x-1)^2+(y+2)^2`                                                   | correct, correct, correct (\|k\| = 1)        |
| 6   | cercle multiplié : `2x^2+2y^2-4x+8y-8=0`, `-x^2-y^2+2x-4y+4=0`                                                                                  | unoptimal_form + message                     |
| 7   | cercle centré à l'origine `x^2+y^2=4` : `x^2+y^2-4=0` correct, `x^2+y^2=2^2` correct, `x^2+y^2=2` incorrect                                     | —                                            |
| 8   | forme `reduite` : `y=2x+1`, `y=1+2x` correct ; `x+1=y`, `2x-y+1=0`, `y=2(x+1)-1` → bad_form ; `x=4` pour une verticale correct, `2x=8` bad_form | —                                            |
| 9   | forme `cartesienne` : `2x-y+1=0`, `-2x+y-1=0` correct ; `y=2x+1`, `2x-y=-1` → bad_form                                                          | —                                            |
| 10  | forme `centre-rayon` : `(x-1)^2+(y+2)^2=9`, `=3^2` correct ; développée → bad_form ; `x^2+(y-1)^2=4` correct                                    | —                                            |
| 11  | non-équations : `2x-y+1`, `x<3`, `x=\sqrt{y}`, `a+b=0`, `\frac{1}{x}=y`, `)(`, vide                                                             | incorrect (vide : empty), jamais d'exception |
| 12  | équation fausse : `2x-y+2=0`, `0=0`, `1=2`                                                                                                      | incorrect                                    |
| 13  | `orderIndependent` : deux équations dans le désordre                                                                                            | correct                                      |
| 14  | barème serveur (`gradeQuestion`) = même statut que le validateur                                                                                | —                                            |
| 15  | réponse attendue du modèle illisible / pas une équation                                                                                         | échec du test du modèle                      |
| 16  | sans `answerKind` : constat inchangé                                                                                                            | inchangé                                     |

## Lots

- [x] 1 — module de jugement `questions/equations/equation-answer.ts` + tests
  - preuve rouge : module absent (`equation-answer.test.ts`, 0 test lancé) ; câblage
    (`equation-answer-wiring.test.ts`) : 21 rouges / 25 sur le code de `main` (les 4 verts : réponses
    non-équations, case vide, et le comportement inchangé SANS `answerKind`) ;
  - après : 82 + 25 verts.
- [x] 2 — câblage : `AnswerKind` + `EquationForm` (`types.ts`), Zod (souple et strict),
      `required-form-validator` (les 3 formes valent aussi pour une case ordinaire),
      `answer-validator` (`validateSingleBlank`, `validateBlankValue`, `matchedAnswerForm` →
      barème serveur et `orderIndependent`), `test-spec-runner` (attendue illisible = erreur du
      modèle), `blank-verdicts`, éditeur (case « Réponse : équation », 3 formes dans la liste),
      docs (`convention-equivalence.md`, `fiches-exercices.md`).
- [x] 3 — modèle sonde (scratchpad, 4 variations dont `reduite`, `cartesienne`, cercle) :
      `question:specs` 17/17 specs, 120/120 tirages.
- [x] 4 — non-régression : `questions` + `utils` + `components/questions` (134 fichiers, 4 759
      tests), `mathAST` + `server` + `math` (479 fichiers, 19 215 tests, `preserve-valeur` compris) ;
      `question:specs --file` sur les 183 JSON de `scripts/questions` : sortie identique avant/après
      (183 importables) ; specs de la PROD (lecture seule, 789 modèles, 6 905 specs) : verdicts
      identiques avant/après, aucun modèle n'utilise `equation`.

- [x] 5 — points ouverts 1 et 2 tranchés (2026-10-03) : |k| = 1 juste pour un cercle, attendue
      ramenée au coefficient 1 avant de mesurer k. Preuve rouge : 6 tests rouges / 113 sur le
      commit précédent (membres échangés, signes changés, attendue `2x^2+2y^2=8`, référence y² et
      `xy`) ; 113 verts après.

## Points ouverts (laissés tels quels)

- Pas de réglage par modèle (comme `intervalForm`) pour le ½ du cercle multiplié.
