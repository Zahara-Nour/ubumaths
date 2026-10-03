# Réponse « vecteur » et `isPrime` — suivi du chantier

Worktree : `../ubumaths-wt-vecteur` · branche `feat/reponse-vecteur-premier` · démarré le 2026-10-03.
Deux ajouts au moteur de validation, validés par David le 2026-10-03.

## Constat (mesuré avant le chantier)

- Un vecteur normal / directeur colinéaire (−a ; −b) au lieu de (a ; b) est compté faux : les
  modèles (`geometrie-reperee-1spe/A-01-lire-un-vecteur-normal.json`, produit scalaire)
  contournent en imposant une coordonnée ou en demandant deux cases séparées.
- Une case ordinaire ne lit pas `(2;3)` (`parseLatexSafe` : 2 erreurs) ; `\begin{pmatrix}2\\3\end{pmatrix}`
  est lu comme une matrice, mais `stripLatexSpacing` transforme le `\\ ` de MathLive (`2\\ -3`)
  en `\-3`, illisible.
- Règle `custom` : aucune fonction `isPrime` (seul le prédicat `{ type: 'predicate', predicate: 'isPrime' }`
  existe, sur la réponse elle-même, pas sur une expression de la réponse).

## Spécification

### 1. Case `answerKind: "vecteur"`

- L'élève écrit le vecteur dans UNE case : coordonnées `(a;b)` (aussi `\left(a;b\right)`,
  `(a\,;\,b)`), ou colonne `\begin{pmatrix}a\\b\end{pmatrix}` (`\\ ` de MathLive compris) ;
  dimension 2 ou 3 ; préfixe `\vec{u}=` / `\overrightarrow{AB}=` toléré.
- Coordonnées : expressions CONSTANTES (fractions, racines, π), virgule décimale admise
  (`(1,5;2)`) ; comparées EXACTEMENT par `normalize` (mathAST), aucun flottant.
- Option de case `vectorMode` (case ou `blankDefaults`) :
  - `"exact"` (défaut) : mêmes coordonnées ;
  - `"colineaire"` : tout vecteur colinéaire NON NUL est juste, multiple « non simplifiable »
    compris (pas de ½) ; le vecteur nul est faux (message).
- Pas de jugement d'écriture : une coordonnée juste non simplifiée (`\frac{2}{4}`) est juste.
- Illisible, `(2,3)` (virgule = décimale), matrice ligne, lettres, mauvaise dimension →
  `incorrect` (message), jamais d'exception ; réponse démesurée → garde Q58 ; vide → `empty`.
- Attendue illisible, de dimension ≠ 2 / 3, ou nulle en mode colinéaire → échec des specs du
  modèle (erreur du MODÈLE).
- Sans `answerKind`, rien ne change.

### 2. `isPrime(n)` dans une règle `custom`

- `isPrime(expr)` vaut 1 si expr est un entier premier, 0 sinon (non entier, < 2) ; utilisable
  seule (`"isPrime(answer)"`, non nul = vrai) ou comparée (`"isPrime(answer^2+answer+41) == 0"`),
  imbriquée dans une expression.
- Borne : |n| > 10^12 → règle non évaluable (« Impossible de vérifier ta réponse. »), réponse fausse.
- Évaluateur des règles seulement : conditions et `{{eval:…}}` passent par un autre évaluateur
  (`generator/condition-evaluator.ts`, mathAST) — hors périmètre.

## Comportements à tester

| n°  | Cas                                                                                        | Attendu                       |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| V1  | attendu `(2;-3)`, exact : `(2;-3)`, `\left(2;-3\right)`, `(2\,;\,-3)`, pmatrix             | correct                       |
| V2  | exact : `(-2;3)`, `(4;-6)`                                                                 | incorrect                     |
| V3  | colinéaire : `(-2;3)`, `(4;-6)`, `(1;-\frac32)`, `(\frac{2}{3};-1)`                        | correct                       |
| V4  | colinéaire : `(0;0)` → incorrect + message ; `(3;2)` incorrect                             | —                             |
| V5  | fractions / racines : `(\frac12;\sqrt2)` = `(0,5;\frac{2}{\sqrt2})` ; `\sqrt8` = `2\sqrt2` | correct                       |
| V6  | dimension 3 : `(1;2;3)`, colinéaire `(-2;-4;-6)` ; `(1;2)` pour `(1;2;3)`                  | correct ; incorrect           |
| V7  | illisible : `)(`, `(2,3)`, `(x;1)`, `2;3`, matrice ligne, `(2;)`                           | incorrect, jamais d'exception |
| V8  | `orderIndependent` : deux vecteurs dans le désordre                                        | correct                       |
| V9  | barème serveur (`gradeQuestion`) = validateur                                              | —                             |
| V10 | spec du modèle : attendue illisible / nulle en colinéaire                                  | échec du test                 |
| V11 | Zod : `answerKind: "vecteur"`, `vectorMode` accepté ; valeur inconnue refusée              | —                             |
| V12 | sans `answerKind` : constat inchangé                                                       | inchangé                      |
| V13 | saisie MathLive réelle (touche colonne du clavier « Vecteur », `(2;-3)` tapé)              | relue juste                   |
| P1  | `isPrime(answer)` : 2, 41 vrais ; 1, 0, −7, 4, 2,5 faux                                    | —                             |
| P2  | `isPrime(answer^2+answer+41) == 0` : 40 juste (41² composé), 1 faux                        | —                             |
| P3  | grand premier 999999999989 vrai ; 10^13 + 37 → non évaluable                               | —                             |

## Lots

- [x] 1 — tests rouges : `vector-answer.test.ts` (module absent : fichier en échec au chargement),
      `vector-answer-wiring.test.ts` 13 rouges / 19 (verts : comportements déjà « faux »),
      `validation-rule-is-prime.test.ts` 11 rouges / 26 (verts : « n'est pas premier », borne) ;
      journal `scratchpad/vecteur/rouge.log`.
- [x] 2 — `questions/vectors/vector-answer.ts` (67 tests) ; câblage : `AnswerKind` + `VectorMode`
      (`types.ts`), Zod souple et strict, `answer-validator` (`validateSingleBlank`,
      `validateBlankValue` → `orderIndependent`, `matchedAnswerForm`, arrondi exclu), générateur
      (`vectorMode` recopié, `cleanCoefficients` exclu, attendue rendue en colonne),
      `test-spec-runner`, `blank-verdicts`, éditeur (2 cases à cocher), onglet « Vecteur » du clavier
      (`keyboard-vectors.ts`, 4 tests) ; 19 tests de câblage verts.
- [x] 3 — `isPrime` (`replacePrimalityCalls` + `isPrimeBounded`, borne 10^12) : 26 verts.
- [x] Saisie MathLive RÉELLE (`FillBlanksInput-vector-keyboard.svelte.test.ts`, 5 verts) : MathLive
      sérialise la colonne `\begin{pmatrix}-4\\ 6\end{pmatrix}` (`\\ ` avec espace) ; la flèche droite
      passe à la coordonnée suivante (ni Tab, ni flèche bas, ni `moveToNextPlaceholder`) ; `(-2;3)`
      tapé au clavier physique (smartFence actif) est relu juste.
- [x] 4 — modèle sonde `scratchpad/vecteur/sonde-vecteur.json` (4 variations : colinéaire,
      exact en colonne, attendue en fractions, dimension 3) : 14/14 specs, 200/200 tirages, importable.
- [x] 5 — non-régression : `questions` + `utils` + `components/questions` (144 fichiers, 5 186 tests),
      `mathAST` + `server` + `math` (482 fichiers, 19 258 tests) ; specs de la PROD (lecture seule)
      APRÈS : 815 modèles, 7 561 specs, 0 KO, sortie IDENTIQUE à l'avant ; JSON du dépôt : 209 `question:specs --file`, sortie IDENTIQUE (`diff -r` vide).
      `check:incremental` 0 erreur ; `lint:fast` rien à signaler.

## Points ouverts

- **`\vec` dans la formule d'une case** : le parseur mathAST ne connaît ni `\vec` ni
  `\overrightarrow` (« Unknown command ») → `hasPrompts` faux → formule rendue STATIQUE, aucune case
  saisissable. Touche aussi les modèles existants (`A-01` : `$\vec{n}\begin{pmatrix}?\\?\end{pmatrix}$`).
  Hors périmètre (composants de rendu, parseur) ; contournement documenté : case seule `$?$`.
- Une coordonnée juste non simplifiée (`\frac{2}{4}`) est juste sans ½ : à confirmer.

Mesure AVANT (main `d01588c13`, 2026-10-03) : PROD 815 modèles, 811 avec specs, 7 561 specs,
0 KO ; `question:specs --file` sur les 209 JSON de `scripts/questions` : 209 exit 0.
