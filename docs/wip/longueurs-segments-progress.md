# Longueurs de segments (`AB`, `AB²`) dans mathAST — préparation

> Chantier préparé le 2026-10-11, suite de la [structure d'une expression](structure-expression-progress.md)
> (Q18). Rien n'est décidé : questions de phase 0 ci-dessous, à trancher par David.

## Le problème

Le parseur LaTeX de `mathAST` lit deux majuscules collées comme un **produit** de deux lettres.
Mesuré le 2026-10-11 (`parseLatexSafe` puis `toLatex`) :

| Saisie                       | Ce que comprend mathAST                     |
| ---------------------------- | ------------------------------------------- |
| `AB`                         | produit `A × B`                             |
| `AB^2`                       | `A × B²` (le carré ne porte que sur B)      |
| `AB^2=AC^2+BC^2` (Pythagore) | `A·B² = A·C² + B·C²`                        |
| `2AB`                        | produit `2 × A × B`                         |
| `(AB)^2`                     | carré du produit `A × B` (juste par hasard) |
| `\mathrm{AB}^2`, `\text{AB}` | **non reconnu** (échec du parseur)          |
| `\overline{AB}`              | **non reconnu**                             |
| `\widehat{ABC}`              | **non reconnu**                             |

Conséquences possibles :

- **lecture** (`/test-structure`) : « le produit de A par le carré de B » au lieu de « le carré de AB » ;
- **correction des réponses** : `AB^2 = 9` est comparé comme `A·B² = 9` ; une réponse juste peut
  être refusée, ou une fausse acceptée, quand le carré est en jeu (à mesurer sur les vraies
  questions) ;
- **écriture** : `toLatex` rend `A B`, avec une espace.

Questions en base (prod, 2026-10-11, 1 005 modèles) : 10 contiennent une puissance de deux
majuscules (`AB^…`), 23 une égalité `AB =`, 1 mentionne Pythagore. Leur validation actuelle reste à
examiner une par une (cas réels des élèves d'abord).

## Questions de phase 0 (à trancher par David)

1. **Portée** : deux majuscules collées sont-elles une longueur **partout** (règle du parseur), ou
   seulement quand le contexte le dit (question de géométrie, option du parseur), ou seulement
   quand l'auteur l'écrit explicitement (`\mathrm{AB}`) ?
2. **`AB` et `BA`** : même longueur pour la correction (`BA = 5` accepté pour `AB = 5`) ?
3. **Trois lettres et plus** : `ABC` = produit, angle, ou refus ?
4. **Notations voisines dans le même chantier** : `\overline{AB}` (mesure algébrique),
   `\widehat{ABC}` (angle), `\overrightarrow{AB}` (vecteur), ou plus tard ?
5. **Lecture** : `AB²` se lit « le carré de AB » ? `AB` seul, « la longueur AB » ou « AB » ?
6. **Minuscules** : `ab` reste un produit (algèbre) ? (Proposé : oui.)

## Décisions de David (2026-10-11)

Recommandations validées : Q1 **partout** (deux majuscules collées = une longueur) ; Q2 **`AB` = `BA`**
pour la correction ; Q3 **`ABC` refusé** avec un message ; Q4 `\overline`, `\widehat`,
`\overrightarrow` **plus tard** ; Q6 **`ab` reste un produit**. Q5 : `AB²` → « le carré de la
longueur AB », `AB` → « **la longueur AB** » (toujours préciser).

**2026-10-12, nuance de Q1 « partout »** : le sens de deux majuscules collées se décide, **dans
l'ordre** :

1. **la déclaration de l'auteur** quand elle existe (« A, B, C sont des points » → longueur ;
   « A, B sont des matrices » / « des expressions » → produit) ;
2. sinon **le contexte** (thème, domaine, niveau de la question, ou option posée par l'appelant,
   ex. questions de matrices) ;
3. sinon **longueur par défaut**. Sur `/test-structure` (aucun contexte) : longueur, avec une case
   pour lire un produit.

**2026-10-12, Q-M (b) et Q-N (a)** :

- **Q-M (b)** : la longueur par défaut vaut **seulement** pour les questions (résolution
  déclaration → contexte → longueur, lot 3) et pour `/test-structure` (case « produit »).
  L'atelier, le grapheur, la console `pnpm math` et tout appelant qui ne dit rien gardent le
  **produit** d'aujourd'hui. Dans les questions, un **thème de physique** compte comme contexte
  « produit », comme `Graphes et matrices`. Conséquence : le **défaut du parseur est `'product'`**
  (`DEFAULT_CAPITAL_PAIRS`) ; les questions (lot 3) et `/test-structure` (lot 4) demandent
  `'length'`. Thèmes réels en base (2026-10-12, 21 thèmes) : **aucun thème de physique**
  (`Grandeurs`, 45 modèles, est un thème de mathématiques) ; la règle « physique → produit » est
  donc écrite pour un thème à venir.
- **Q-N (a)** : au lot 3, couper dans les champs de réponse les raccourcis de MathLive qui
  transforment une paire de majuscules (`AA` → ∀, `EE` → ∃, `CC` → ℂ, `RR` → ℝ, `NN`, `ZZ`, `QQ`…,
  liste par défaut à recenser) **quand le sens résolu est « longueur »** ; ils restent actifs
  ailleurs.

**2026-10-12, validation** : David valide la spécification et le plan, avec **toutes** les
recommandations Q-A à Q-L (Q-A nom de figure gardé, refus au calcul ; Q-C défaut longueur ; Q-D
primes et indices au lot 1 ; Q-E `A B` = produit ; Q-F plus tard ; Q-G `AB` ; Q-H interrupteur par
modèle ; Q-I contexte `Graphes et matrices` seul ; Q-J contexte seul pour les exercices ; Q-K sens
résolu une fois, à la génération de l'instance ; Q-L l'instance garde son sens).

État du code : `mathAST` n'a **aucun nœud longueur ni angle** (`MathNode`, `types.ts`) ; `\angle`
n'existe que comme symbole. `geometry-core` (DSL de géométrie) connaît segments et angles, mais
`mathAST` ne s'en sert pas.

## Enquête (2026-10-11, phase 0)

Mesures par scripts jetables (`parseLatexSafe`, `parseCustom`, `toLatex`, `areEquivalent`, `tidy`,
`simplify`, `checkForm`) sur le code de `origin/main` (4c1acc74c), et requêtes en lecture seule sur
la base de prod.

### Où naît le produit

- **Quatre parseurs** fabriquent `multiply(…, 'implicit')` entre deux lettres :
  LaTeX Pratt (`parser/latex/parser-pratt.ts`, `shouldInsertImplicitMultiply` l. 1424,
  `parseImplicitMultiply` l. 1524 — **seul utilisé en prod**), LaTeX `rd` (`parser-rd.ts` l. 778,
  option jamais passée hors tests), custom Pratt (`parser/custom/parser-pratt.ts`, défaut de
  `parseCustom`) et custom `rd`. La règle `e`/`i` y est déjà dupliquée « mêmes règles dans les
  quatre parseurs ».
- Les deux tokenizers (`parser/latex/tokenizer.ts` `scanLetter`, `parser/custom/tokenizer.ts`)
  rendent **une lettre par jeton**, avec sa position : on sait si deux lettres sont collées dans la
  source (`AB`) ou séparées par une espace (`A B`). Les parseurs, eux, sautent les espaces
  (`skipWhitespace`) : l'information n'existe qu'au niveau des jetons.
- **Endroit naturel** : fusionner, dans chaque tokenizer, deux majuscules collées en un jeton
  `SEGMENT` (et trois ou plus en un jeton refusé), puis un `nud` qui fabrique le nœud. `AB^2`
  devient alors `(AB)²` sans toucher aux puissances de liaison.

### Ce que donne le parseur aujourd'hui (Pratt = rd, LaTeX = custom)

| Saisie                                                                                 | Aujourd'hui                       | Remarque                                        |
| -------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| `AB`, `BA`                                                                             | `A·B`, `B·A`                      | `toLatex` → `A B`                               |
| `AB^2`, `AB^{2}`                                                                       | `A·B²`                            |                                                 |
| `2AB`, `5\,AB`                                                                         | `2·A·B`                           |                                                 |
| `AB\times CD`, `AB\cdot CD`                                                            | `A·B×C·D`                         |                                                 |
| `(AB)^2`, `\left(AB\right)`                                                            | carré du groupe `(A·B)`           |                                                 |
| `\frac{AB}{CD}`, `\sqrt{AB}`                                                           | `A·B / C·D`, `√(A·B)`             |                                                 |
| `AB+BC`, `AB=5`                                                                        | `A·B + B·C`, `A·B = 5`            |                                                 |
| `AB^2=AC^2+BC^2`                                                                       | `A·B² = A·C² + B·C²`              |                                                 |
| `ABC`, `\Delta ABC`                                                                    | `A·B·C`, `Δ·A·B·C`                |                                                 |
| `A B` (espace)                                                                         | `A·B`                             | indiscernable de `AB` après les jetons          |
| `A_1B`, `A_1B_1`, `AB_1`                                                               | `A₁·B`, `A₁·B₁`, `A·B₁`           |                                                 |
| `x_AB`, `AX_n`                                                                         | `x_A·B`, `A·X_n`                  | coordonnée ; produit matrice × vecteur          |
| `FG`, `EF^2`, `FG(x)`                                                                  | `F·G`, `E·F²`, `F·G(x)`           | `F`, `G`, `H` = fonctions génériques par défaut |
| `F(x)`                                                                                 | Pratt : fonction F ; rd : `F·(x)` | divergence Pratt/rd préexistante                |
| `A'B'`, `AB'`                                                                          | **échec** (`Unexpected token: '`) | Thalès, homothéties : saisie impossible         |
| `\mathrm{AB}`, `\text{AB}`                                                             | **échec**                         |                                                 |
| `\vec{AB}`, `\overrightarrow{AB}`, `\overline{AB}`, `\widehat{ABC}`, `\bar{A}`, `[AB]` | **échec**                         | notations « plus tard »                         |
| `P_A(B)`, `P(A\cap B)`                                                                 | `P_A·(B)`, `P·(A·∩·B)`            | pas de longueur en jeu                          |
| `Ce^{2x}`, `\pi R^2`, `2\pi R`                                                         | produits                          | non touchés (une seule majuscule)               |
| `ab`, `xy`                                                                             | produits                          | non touchés (décision Q6)                       |

Équivalence aujourd'hui : `AB ≡ BA` **vrai** (par commutativité, par chance), mais
`AB^2 ≡ BA^2` **faux**, `AB^2=9 ≡ BA^2=9` **faux**, `AB^2 ≡ (AB)^2` **faux**, et
`AB ≡ A\times B` **vrai**. `tidy(AB+BA)` = `2 A B` ; `tidy(AB^2+BA^2)` = `A B^2 + A^2 B`.
`checkForm('BA', 'AB')` = correct.

### Qui consomme des majuscules collées (et ce qui casserait)

- **Saisie élève, correction** (`areEquivalent`, `checkForm`, `parseLatexSafe`) : c'est la cible.
- **Gabarits (`templateVariables`)** : les noms de variables de plusieurs caractères (`UU`, `XU`,
  `PS`, `AMx`, `BC2` en base) sont **remplacés dans le texte avant** tout parseur
  (`variable-resolver.ts` l. 712) ; les 26 calculs `{{eval:…}}` à majuscules collées de la base sont
  tous de ce type. **Rien ne casse**, à condition de garder cet ordre.
- **Affichage des énoncés** : `$…$` (LaTeX) est rendu tel quel, **sans parseur** (seul
  `extractPromptIndices` le lit, avec repli sur le texte en cas d'échec) → aucun effet visible.
  `~…~` (syntaxe maison) passe par `parseCustomSafe` → `toLatex`, et **un échec s'affiche en rouge**
  (`math-utils.ts` l. 79). ⚠️ Voir plus bas : la table `exercises`.
- **Géométrie (`geometry-core`)** : le DSL lit ses identifiants lui-même et n'envoie à `parseCustom`
  que les expressions « purement mathématiques » ; si une variable libre est inconnue ou n'est pas
  un nombre, il **revient au chemin DSL** (`interpreter.ts` l. 520-560). `schemas.ts` relit des
  valeurs exactes sans lettres. Risque faible, mais la suite de 3 500 tests est à relancer au lot
  qui touche `parseCustom`. Gain possible : un scalaire nommé `AB` deviendrait lisible.
- **Unités** : toujours **déclarées** (`\unit{…}`, `12[km]`, ou découpage de la tête numérique dans
  un trou à unité, `student-input.ts`) → aucune lettre d'unité n'atteint la règle. `A` (ampère),
  `Hz`, `kWh`, `MW` : pas de conflit.
- **Fonctions génériques** `F`, `G`, `H` (`DEFAULT_GENERIC_FUNCTION_NAMES`) : `EF`, `FG`, `GH`
  (triangle `EFG`) doivent devenir des longueurs ; `F(x)` seul reste une fonction.
- **Matrices** : aucun code ne manipule de matrice **nommée** (`matrixMultiply` n'a aucun appelant
  hors `mathAST`, l'atelier n'a pas de type matrice). **Conflit confirmé dans le contenu** (T*EXP,
  brouillons) : « Produit de matrices : AB, matrice × colonne, ligne × matrice » (`AX = …`,
  `LA = …`), « Systèmes linéaires et calcul matriciel » (`AX = B`), « Modéliser une situation par
  une matrice » (`X*{n+1} = AX_n`). Tous en `$…$` d'énoncé, aucune réponse attendue n'en contient →
  **aucun verdict ne change aujourd'hui**, mais le sens serait faux le jour où on corrige un
  produit de matrices.
- **Probabilités** : `P(A\cap B)`, `P_A(B)` non touchés. **Conflit confirmé dans le contenu** :
  chemins d'arbre écrits en lettres (`~GD~`, `~DG~`, `~GGGG~`, `~DGGD~`, `~RRRR~`… dans « Une marche
  aléatoire », « Le jeu du dé et de la pièce »).
- **Physique** : `U=RI`, `P=UI`, `PV=nRT` deviendraient des longueurs. **Aucune occurrence en base**
  (cherché dans `question_templates`, `exercises`, `chapter_templates`, `srs_cards`).
- **Atelier** : les listes s'appellent `L`, `M`, `N` (lettres seules, `names.ts`) ; `LM` n'est pas
  une écriture attendue. Un `AB` saisi y serait aujourd'hui « A et B manquants ».
- **`toLatex`** d'une variable de plusieurs lettres écrit `\mathit{AB}` (l. 587, 615, 1255), que
  `parseLatex` ne relit pas.
- **Lecture (`structure/`)** : seul consommateur, `/test-structure`.

### Le contenu en base (prod, lecture seule, 2026-10-11)

- **`question_templates`** : 47 modèles (tous `draft`) ont des majuscules collées dans un `$…$`
  d'énoncé ou de correction (383 occurrences, dont 92 de trois lettres ou plus, 14 puissances
  `AB^…`). **Aucune réponse attendue (`blanks.expectedAnswer`) ne contient de longueur** : les
  réponses sont des nombres (`{{c}}`, `{{eval:…}}`). Les seules réponses à majuscule sont
  `\mathbb{R}` et `Ce^{…}` (constante `C`, non touchée). → **Aucune question ne change de verdict.**
  Les comptes « 10 puissances, 23 `AB =` » de la préparation étaient des énoncés, pas des réponses.
- **`exercises`** (43 exercices, tous `is_public = false`) : **1 082 formules `~…~` en syntaxe
  maison** à majuscules collées, dont **298 de trois lettres ou plus dans 30 exercices** : `~ABC~`
  (88), `~ABCD~` (40), `~DEF~`, `~EFGH~`, `~AHM~`, `~PES~`, `~GGGG~`… et 100 droites `~(AB)~`.
  Si `parseCustom` refuse `ABC`, **ces 298 formules s'affichent en message d'erreur rouge**.
- Aucune formule à majuscules collées dans `chapter_templates`, `srs_cards`, `riddles`,
  `worksheet_templates`.

### Déclarer et contextualiser : ce qui existe déjà (2026-10-12)

- **Les fonctions déclarées (`genericFunctions`) : le précédent exact.** Un modèle déclare « `P`,
  `C` sont des fonctions » dans `shared.genericFunctions` (3 modèles en base) ; un exercice dans la
  colonne `exercises.generic_functions` (11 exercices). La déclaration est **copiée sur l'instance**
  (`QuestionInstance.genericFunctions`, `instance-generator.ts` l. 755), traduite par
  `templateGenericFunctions` (`questions/generic-functions.ts`) en option `GenericFunctionConfig`
  du parseur, et **descend jusqu'à lui partout** : correction (`answer-validator.ts` :
  `formOptionsOf` → `checkForm`, règles `equivalent`, `requiredForm`), correction rédigée
  (`correction-generator.ts`), affichage (`MarkdownRenderer` → `MathInline` →
  `expressionToLatex` → `parseCustomSafe(…, { genericFunctions })`, 18 passages de la prop dans les
  `.svelte`), PDF Typst. C'est **le rail naturel** d'une déclaration sur des lettres, et il
  atteint déjà la syntaxe maison des exercices (`~ABC~`).
- **Les hypothèses de l'énoncé (`options.answerAssumptions`, ADR 0012, `mathAST/assumptions.ts`)** :
  par lettre, vocabulaire fermé (`positive`, `nonnegative`, `nonzero`, `integer`, `natural`),
  éditeur dédié (`AnswerAssumptionsEditor.svelte`), schéma Zod et contrôle de collision avec les
  variables du gabarit (`questions/answer-assumptions.ts`). Mais elles agissent **après** le
  parseur (`areEquivalent` les reçoit), jamais sur la lecture ; aucun modèle n'en a en base. Bon
  modèle d'éditeur, mauvais endroit pour un « sens de lecture ».
- `validationRules`, `requiredForm`, `blankDefaults`, `templateVariables` : rien sur le **type**
  d'une lettre (les variables du gabarit sont tirées puis remplacées dans le texte).
- **Le contexte** : chaque modèle a `theme`, `domain`, `subdomain`, `level`, `grades`,
  `classification_node_id`, **copiés sur l'instance** (`QuestionInstance.theme`, `.domain`…).
  Les 12 modèles de matrices sont tous `theme = 'Graphes et matrices'` (domaines `Matrices`,
  `Graphes`, `Chaînes de Markov`), T_EXP. Un exercice a `topic` (`Géométrie`, `Géométrie repérée`,
  `Probabilités`…), `grades`, `category`.
- **Aucun appelant ne passe aujourd'hui d'option de sens au parseur** : `parseLatex` ne reçoit que
  `mode`, `parser`, `genericFunctions`, `security`.

## Conception proposée

### Qui décide du sens (2026-10-12)

**Une option du parseur, `capitalPairs: 'length' | 'product'`, défaut `'product'` (Q-M)**, dans
`LatexParserOptions` et `CustomParserOptions`, à côté de `genericFunctions`.

- `'length'` : deux majuscules collées → nœud longueur ; trois ou plus → selon Q-A.
- `'product'` : **comportement d'aujourd'hui, à l'identique** (`AB` = `A·B`, `ABC` = `A·B·C`,
  aucun refus). Le nœud longueur n'existe que dans le mode `'length'`.
- **Qui la pose** : une seule fonction de résolution côté questions (ex.
  `capitalPairsFor({ declaration, theme, domain })` dans `questions/`), qui applique l'ordre de
  David : déclaration → contexte → `'length'`. Le résultat est **copié sur l'instance** comme
  `genericFunctions` et suit le même rail (correction, correction rédigée, affichage, PDF).
- **Sans contexte** (atelier, grapheur, `pnpm math`, DSL de géométrie, chat) : défaut
  `'product'`, le comportement d'avant (Q-M). Les questions résolvent déclaration → contexte
  (`Graphes et matrices`, physique → produit) → `'length'`. `/test-structure` passe `'length'`, et
  la case « lire AB comme un produit » passe `'product'`.

Deux variantes pour **la déclaration** :

- **V1 — un interrupteur par modèle** : `shared.capitalPairs: 'length' | 'product'`
  (« les majuscules collées sont des longueurs / des produits »), et pour les exercices une
  colonne `exercises.capital_pairs` (migration additive) ou rien (contexte seul, voir Q-J).
  Simple, calqué sur `genericFunctions`, une ligne dans l'éditeur.
- **V2 — par lettre** : `shared.letterKinds: { A: 'point', B: 'point' }` / `{ A: 'matrix' }`,
  à la manière d'`answerAssumptions`. Plus proche des mots de David, permet de mélanger points et
  matrices dans un même modèle ; mais il faut une règle pour les lettres non déclarées et une
  paire mixte (`AM` avec A point, M matrice), et un éditeur par lettre.

**Recommandation : V1.** Aucun cas en base ne mélange points et matrices ; V2 reste possible plus
tard sans changer l'option du parseur (elle se résoudrait en `'length'`/`'product'` par modèle).

**Contexte** : une table unique, minimale, dans la fonction de résolution : `theme = 'Graphes et
matrices'` → `'product'`. Rien d'autre au départ (voir Q-I).

### Le nœud

#### Option A — un nœud dédié (recommandée)

```
SegmentLengthNode { type: 'segmentLength', points: readonly [PointName, PointName] }
PointName = { letter: 'A'…'Z', primes: 0|1|2…, index?: string }   // A, A', A_1, M_n
```

- **Lecture du parseur** : dans les deux tokenizers, deux majuscules **collées dans la source**
  (avec leurs primes et indices) → un jeton `SEGMENT` **en mode `'length'` seulement** ; trois
  points ou plus → selon Q-A. En mode `'product'`, les jetons restent des lettres.
  Les quatre parseurs reçoivent le jeton et appellent la fabrique `segmentLength(…)` (pas de
  littéral hors `factory.ts`, invariant 2).
- **Écriture** : `toLatex` → `AB` (sans espace, sans `\mathit`), `A'B'`, `A_1B_1` ; `toCustom` →
  `AB`. Aller-retour garanti par test.
- **Calcul** : `normalize` en fait une **variable polynomiale de clé canonique** (points triés :
  `BA` → clé `AB`), donc `AB = BA`, `AB^2 + BA^2 = 2AB^2`, Pythagore se développe, `solve` sait
  isoler `AB`. `denormalize` reconstruit le nœud (ordre canonique).
- **`getVariables`** rend le nom écrit (`AB`) ; **`substitute`/`evaluate`** acceptent la valeur sous
  `AB` **ou** `BA`.
- **Lecture** : « la longueur AB », « le carré de la longueur AB ».
- Pour : le sens est **explicite** dans l'arbre ; les 32 `switch` exhaustifs (`never`) obligent à
  traiter le nœud partout ; primes et indices structurés ; pas de confusion avec un nom de
  variable de gabarit. Contre : diff large (45 fichiers à `case 'variable'`, 31 à
  `type === 'variable'` à auditer : les branches `default` ignorent le nœud **en silence**, le plus
  souvent sans fausse réponse — une règle ne s'applique pas).

#### Option B — une variable au nom de deux points

`variable('AB')` : le sens est porté par la **forme du nom**. Tout marche aussitôt comme une
variable (`tidy`, `normalize`, `solve`, `compile`). Contre : convention implicite (« astuce ») ;
`AB = BA` à recoller dans `equivalenceForm`, `substitute` et `checkForm` ; `\mathit{AB}` à changer
dans `toLatex` ; primes dans un nom de variable (`A'B'`) à vérifier dans `compile` ; un nom de
gabarit oublié (`XU`) deviendrait une longueur sans bruit ; `ABC` et les noms de figure n'ont pas
de place.

**Recommandation : A.** Le surcoût est un audit mécanique ; le gain est que rien ne devient une
longueur « par hasard » et que le compilateur montre chaque endroit à décider.

## Questions (ouvertes, à trancher par David)

**Q-A. `ABC` en mode longueur : où le refuser ?** (Avec la décision du 12/10, en mode
`'product'` `ABC` reste le produit d'aujourd'hui, sans refus.) En mode `'length'`, les 298
`~ABC~`, `~ABCD~`, `~DEF~` des exercices de géométrie sont des **noms de figure**, affichés.
(a) Refus partout, et migration des exercices de `~ABC~` vers `$ABC$` (données de prod, sur ton
accord) ; l'auteur qui écrit `~ABC~` voit le message. (b) Le parseur garde `ABC` comme **nom de
figure** (nœud non calculable, affiché `ABC`, lu « ABC ») et le **refus avec message** a lieu au
calcul et à la correction (`areEquivalent`, `evaluate`, `checkForm`). (c) Refus seulement en LaTeX
(saisie élève), produit conservé en syntaxe maison. **Recommandation : (b)** — l'élève reçoit le
message, aucun document n'affiche d'erreur.

**Q-B. Matrices (T_EXP)** — **tranchée par la décision du 12/10** : déclaration de l'auteur, sinon
contexte `theme = 'Graphes et matrices'` → `'product'`. Reste ouvert : voir Q-I (la table de
contexte) et Q-H (la forme de la déclaration).

**Q-C. Chemins de probabilité** (`~GD~`, `~GGGG~`, topic `Probabilités`) : en mode `'length'`,
`GD` se lirait « la longueur GD » (affichage inchangé), `GGGG` suivrait Q-A ; en mode `'product'`,
« le produit de G par D » — faux aussi. (a) Laisser le défaut (`'length'`) ; (b) mettre
`Probabilités` dans la table de contexte (`'product'`) ; (c) écrire les chemins en texte.
**Recommandation : (a)**, avec (c) au fil des relectures : aucun des deux sens n'est juste, et
avec Q-A (b) rien ne s'affiche en erreur.

**Q-D. Points primés et indicés** (`A'B'`, `A_1B_1`, `OM_n`) : aujourd'hui `A'B'` **échoue**.
Dans le même chantier (lot 1) ou plus tard ? **Recommandation : lot 1** (Thalès et
agrandissements en 3e, sinon l'élève ne peut pas écrire sa réponse).

**Q-E. Espace entre les lettres** : `A B` (espace dans la source LaTeX) s'affiche exactement comme
`AB`. (a) Longueur aussi ; (b) produit. MathLive écrit `AB` quand l'élève tape A puis B (à
re-mesurer dans Chromium au lot 1). **Recommandation : (b)**, règle simple sur les jetons
(« collées = longueur »), le produit explicite restant `A\times B`.

**Q-F. Une longueur est positive** : `AB^2 = 25` → `AB = 5` seulement (et `AB = -3` impossible) ?
(a) Oui, au lot `solve` ; (b) plus tard. **Recommandation : (b)**, hors de ce chantier.

**Q-G. Écriture `toLatex`** : `AB` (italique, comme les manuels et MathLive) ou `\mathrm{AB}`
(droit) ? **Recommandation : `AB`**, relu tel quel par le parseur (en mode `'length'`).

**Q-H. Forme de la déclaration** : (V1) un interrupteur par modèle, `shared.capitalPairs`
(« longueurs » / « produits ») ; (V2) une déclaration par lettre (`A: 'point'`, `A: 'matrix'`).
**Recommandation : V1** (calquée sur `genericFunctions`, aucun mélange points/matrices en base ;
V2 possible plus tard sans toucher au parseur).

**Q-I. Table de contexte** : (a) `theme = 'Graphes et matrices'` → produit, rien d'autre ;
(b) plus large (tout T_EXP, `Probabilités`, physique…). **Recommandation : (a)** — un thème
vérifié en base (12 modèles), le reste se déclare au cas par cas.

**Q-J. Déclaration pour les exercices rédigés** (`~…~`, table `exercises`, sans `shared`) :
(a) contexte seul (`topic`), pas de déclaration ; (b) colonne `exercises.capital_pairs`
(migration **additive**, question d'accès : aucune lecture nouvelle, même RLS que la ligne).
**Recommandation : (a)** tant qu'aucun exercice n'en a besoin, (b) le jour où il en faut un. Mesuré :
aucun exercice de produit de matrices en base (les 24 exercices à `pmatrix` sont des coordonnées
de vecteurs, en géométrie, où `HE^2=PE^2-PH^2` est bien une égalité de longueurs).

**Q-K. Où se résout le sens** : (a) à la génération de l'instance, copié dessus comme
`genericFunctions` (une seule résolution, le PDF et l'affichage voient la même chose) ;
(b) à chaque appel du parseur, depuis `theme`/`domain`. **Recommandation : (a)**.

**Q-L. Changer le sens d'un modèle déjà servi** : une instance déjà tirée (feuille en cours)
garde-t-elle l'ancien sens ? **Recommandation : oui**, comme `genericFunctions` aujourd'hui
(copié à la génération).

## Spécification (à valider)

Notation : « comprend » = arbre ; « écrit » = `toLatex` ; « lit » = lecture française ;
« ≡ » = `areEquivalent`.

### Cas nominaux

| Saisie           | Comprend                                     | Écrit               | Lit                                              |
| ---------------- | -------------------------------------------- | ------------------- | ------------------------------------------------ |
| `AB`             | longueur AB                                  | `AB`                | la longueur AB                                   |
| `AB^2`           | carré de la longueur AB                      | `AB^2`              | le carré de la longueur AB                       |
| `2AB`            | 2 × longueur AB                              | `2AB`               | le produit de 2 par la longueur AB               |
| `AB\times CD`    | longueur AB × longueur CD                    | `AB\times CD`       | le produit de la longueur AB par la longueur CD  |
| `\frac{AB}{CD}`  | quotient de deux longueurs                   | `\dfrac{AB}{CD}`    | le quotient de la longueur AB par la longueur CD |
| `AB+BC`          | somme de deux longueurs                      | `AB+BC`             | la somme de la longueur AB et de la longueur BC  |
| `AB=5`           | égalité longueur AB = 5                      | `AB=5`              | —                                                |
| `AB^2=AC^2+BC^2` | égalité de Pythagore                         | identique           | —                                                |
| `(AB)^2`         | carré de la longueur AB, parenthèses gardées | `\left(AB\right)^2` | —                                                |
| `\sqrt{AB}`      | racine de la longueur AB                     | `\sqrt{AB}`         | —                                                |
| `EF`, `FG`, `GH` | longueurs (pas de fonction F)                | `EF`…               | la longueur EF                                   |

Équivalence (correction) :

| Réponse     | Attendu  | ≡       | Aujourd'hui |
| ----------- | -------- | ------- | ----------- |
| `BA`        | `AB`     | oui     | oui         |
| `BA^2`      | `AB^2`   | **oui** | non         |
| `BA^2=9`    | `AB^2=9` | **oui** | non         |
| `(AB)^2`    | `AB^2`   | **oui** | non         |
| `AB+BA`     | `2AB`    | oui     | oui         |
| `A\times B` | `AB`     | **non** | oui         |
| `AB`        | `AC`     | non     | non         |

`checkForm('BA', 'AB')` : correct, sans contrainte levée (l'ordre des points est libre).
`tidy(AB+BA)` = `2AB` ; `tidy(AB^2+BA^2)` = `2AB^2`. `substitute(AB^2, { BA: 3 })` = `3^2`.

### Cas limites

| Saisie                           | Comprend                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `ab`, `xy`, `aB`                 | produits (inchangé)                                                                |
| `A B` (espace)                   | produit `A·B` (selon Q-E)                                                          |
| `A\times B`, `A\cdot B`          | produit                                                                            |
| `F(x)`, `2F(x)`                  | fonction F (inchangé)                                                              |
| `AF(x)`                          | longueur AF × `(x)` (deux majuscules collées)                                      |
| `x_AB`                           | `x_A · B` (l'indice n'entre pas dans la paire)                                     |
| `x_{AB}`                         | indice `AB` : pas de longueur dans un indice                                       |
| `A'B'`, `A_1B_1`, `AB_1`, `OM_n` | longueurs entre points primés/indicés (selon Q-D)                                  |
| `AA`                             | longueur AA (gardée telle quelle, pas de 0 automatique)                            |
| `(AB)`                           | longueur AB entre parenthèses (la droite viendra avec les notations « plus tard ») |
| `\pi R^2`, `Ce^{2x}`             | inchangés (une seule majuscule)                                                    |
| `AX_n` (sans contexte)           | longueur A X_n ; produit en contexte matrices (ci-dessous)                         |
| unités (`5\unit{kWh}`, `12[MW]`) | inchangées                                                                         |
| gabarits `{{eval:XU*XV}}`        | inchangés (noms remplacés avant le parseur)                                        |

### Sens selon la déclaration et le contexte

| Situation                                                        | Sens retenu | `AB^2`        | `ABC`          | Lit `AB`              |
| ---------------------------------------------------------------- | ----------- | ------------- | -------------- | --------------------- |
| Modèle déclaré « longueurs » (`shared.capitalPairs`), tout thème | longueur    | carré de AB   | selon Q-A      | la longueur AB        |
| Modèle déclaré « produits », même en géométrie                   | produit     | `A·B²` (auj.) | `A·B·C` (auj.) | le produit de A par B |
| Thème `Graphes et matrices`, sans déclaration                    | produit     | `A·B²`        | `A·B·C`        | le produit de A par B |
| Thème `Graphes et matrices`, déclaré « longueurs »               | longueur    | carré de AB   | selon Q-A      | la longueur AB        |
| Aucun contexte (atelier, grapheur, `pnpm math`, DSL, chat)       | produit     | `A·B²`        | `A·B·C`        | le produit de A par B |
| Question sans déclaration, thème de physique (Q-M)               | produit     | `A·B²`        | `A·B·C`        | le produit de A par B |
| Question sans déclaration ni contexte « produit »                | longueur    | carré de AB   | selon Q-A      | la longueur AB        |
| `/test-structure`, case décochée (défaut)                        | longueur    | carré de AB   | selon Q-A      | la longueur AB        |
| `/test-structure`, case « lire AB comme un produit » cochée      | produit     | `A·B²`        | `A·B·C`        | le produit de A par B |

En mode produit, **tout est identique à aujourd'hui** (arbre, écriture `A B`, équivalence
`AB ≡ A\times B`, `AB^2 ≢ BA^2`). Le sens retenu vaut pour **toute** l'instance : énoncé,
réponse de l'élève, réponse attendue, correction rédigée, PDF. Une réponse attendue et une réponse
élève sont toujours lues dans le **même** sens.

### Erreurs

| Saisie                                                                 | Résultat                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ABC`, `ABCD`, `\Delta ABC`                                            | selon Q-A ; message proposé : « ABC n'est pas une longueur : une longueur se nomme avec deux points (AB). Pour un produit, écris A×B×C. » |
| `AB'` seul, `A''B` mal formé                                           | erreur de lecture actuelle (inchangée si Q-D = plus tard)                                                                                 |
| `\overline{AB}`, `\widehat{ABC}`, `\overrightarrow{AB}`, `\mathrm{AB}` | échec actuel, inchangé (plus tard)                                                                                                        |

## Plan (après validation)

Chaque lot : tests d'abord (rouges, **sur des entrées parsées**, coefficient ≠ 1), puis code,
`check:incremental`, `code-reviewer`. Agents : `mathast-expert` (Opus) sauf mention.

1. **Lot 1 — le nœud et le parseur LaTeX** : `SegmentLengthNode` + fabrique + gardes de type ;
   option `capitalPairs` (défaut `'product'`, Q-M) ; jeton `SEGMENT` dans le tokenizer LaTeX, Pratt et
   `rd`, en mode `'length'` seulement ; nom de figure ou refus (Q-A) ; primes et indices (Q-D) ;
   `toLatex`/`toCustom`/`prettyPrint` ; tous les `switch` exhaustifs ; audit listé des branches
   `default` (`case 'variable'`). Test : en mode `'product'`, arbres identiques à aujourd'hui.
2. **Lot 2 — calcul et correction** : `normalize` (clé canonique), `denormalize`, `equivalenceForm`,
   `getVariables`/`substitute`/`evaluate`/`compile`, `checkForm` (ordre des points libre, option
   `capitalPairs` dans `CheckFormOptions`), `tidy`/`simplify`. Panel des simplifications et
   convention d'équivalence mis à jour.
3. **Lot 3 — déclaration et contexte (questions)** : `shared.capitalPairs` (schéma Zod strict,
   éditeur de modèle), fonction de résolution déclaration → contexte → défaut, copie sur
   l'instance, passage par le rail de `genericFunctions` (`answer-validator.ts`,
   `correction-generator.ts`, `MarkdownRenderer`/`MathInline`, Typst) jusqu'à
   `areEquivalent`/`checkForm` (option `capitalPairs`, déjà acceptée depuis le lot 1). Contexte
   « produit » : `Graphes et matrices` et tout thème de physique (Q-M). **Q-N** : quand le sens
   résolu est « longueur », couper dans les champs de réponse les raccourcis de MathLive qui
   transforment une paire de majuscules (`AA`, `EE`, `CC`, `RR`, `NN`, `ZZ`, `QQ`… — recenser la
   liste par défaut de MathLive 0.111.1 et la mesurer dans Chromium). `pedagogy-expert` (Opus),
   `mathast-expert` en relecture, `frontend-developer` pour les champs. Pas de migration si
   Q-J = (a).
4. **Lot 4 — lecture** : `structure/` (« la longueur AB », « le carré de la longueur AB ») et la
   case « lire AB comme un produit » de `/test-structure` ; `mathast-expert` + `pedagogy-expert`
   (formulations) + `frontend-developer` (la case, `MyCheckbox`).
5. **Lot 5 — syntaxe maison** : tokenizer custom, Pratt et `rd` ; relance des suites
   `geometry-core` (`geometry-expert` en relecture) et des rendus d'exercices ; si Q-A = (a),
   migration des exercices (données de prod, sur accord explicite).
6. **Plus tard** : positivité (Q-F), déclaration par lettre (V2), `\overline`, `\widehat`,
   `\overrightarrow`, droite `(AB)` et segment `[AB]`. Terme « longueur (d'un segment) » à verser
   dans `CONTEXT.md` (attention : « point » y désigne déjà le **point du programme**).

## Lot 1 — fait (2026-10-12)

**API** : `SegmentLengthNode { type: 'segmentLength', points: [PointName, PointName] }`,
`FigureNameNode { type: 'figureName', points: PointName[] }` (≥ 3), `PointName { letter, primes,
index? }` ; fabrique `pointName`, `segmentLength`, `figureName` ; gardes `isSegmentLength`,
`isFigureName` ; option `capitalPairs: 'length' | 'product'` de `parseLatex`/`parseLatexSafe`
(défaut `DEFAULT_CAPITAL_PAIRS = 'length'`), lue par Pratt **et** rd (même coût : un scanner de
jetons partagé, `parser/latex/point-names.ts`). `toLatex`/`toCustom`/`prettyPrint` écrivent `AB`,
`A'_{1}B` (`common/point-names.ts`).

**Écart à la spécification** : `AB'` et `A''B` ne sont plus des erreurs mais des longueurs entre
points primés (conséquence de Q-D) ; `A'` seul reste une erreur.

**Bogue trouvé et corrigé** : `hashMathNode` (`normal/hash.ts`) rendait `'UNKNOWN'` pour tout type
inconnu, donc `AB ≡ AC` était vrai. Les longueurs s'empreintent par leurs points dans l'ordre
canonique (`AB` = `BA`, décision Q2), les noms de figure dans l'ordre écrit. Même défaut,
préexistant, pour `signed-zero` et `piecewise` (non corrigé, hors chantier).

**Défaut du parseur : `'product'`** (décision Q-M du 2026-10-12). Un appel sans option rend
exactement l'arbre d'avant (empreinte : test « sans option »). Les tests du lot 1 passent
`capitalPairs: 'length'` explicitement. `areEquivalent` (`math/index.ts`) et `checkForm`
(`CheckFormOptions`) acceptent l'option et la transmettent au parseur (prouvé par le test Q-E :
avec `'length'`, `A\,B` ≢ `AB` ; sans option, ils sont le même produit, comme avant). Avant ce
changement, avec le défaut `'length'`, toutes les suites étaient déjà vertes.

**Ce que contient l'empreinte** (`capital-pairs-empreinte.test.ts`) : 4 122 chaînes, dont 3 315 se
lisent sans erreur — environ 2 400 formules (200 saisies d'élèves du corpus de `structure/`, 79
cas à majuscules ajoutés à la main, formules des tests) et environ 940 titres de tests ou
identifiants lus comme des produits de lettres — et 807 chaînes en erreur (phrases, identifiants,
saisies invalides). 179 formules lues ont deux majuscules collées. Ce n'est donc pas « 4 122
saisies » : les titres et les erreurs prouvent seulement que rien d'autre ne change.

**Mesure Q-E dans Chromium** (2026-10-12, MathLive 0.111.1, Playwright, page locale) :

| Frappe                  | Champ de réponse (`mathModeSpace = '\,'`) | Sans `mathModeSpace`   |
| ----------------------- | ----------------------------------------- | ---------------------- |
| A, B                    | `AB`                                      | `AB`                   |
| A, espace, B            | `A\,B`                                    | `AB`                   |
| A, 2 espaces, B         | `A\,\,B`                                  | `AB`                   |
| 2, espace, A, espace, B | `2\,A\,B`                                 | `2AB`                  |
| A, ', B, '              | `A^{\prime}B^{\prime}`                    | `A^{\prime}B^{\prime}` |

Les champs de réponse des questions (`QuestionCard`, `FlashCard`) posent `mathModeSpace = '\,'`
sauf quand la contrainte `spaces` est `off` : dans ce cas, l'espace tapée disparaît et « A espace
B » devient la longueur `AB` (indiscernable dans la saisie). `stripLatexSpacing` (`math/index.ts`)
et `removeSpaces` (`checkForm`) retiraient le `\,` et collaient les lettres : ils gardent
désormais une espace entre deux majuscules (`separateSpacedCapitals`,
`parser/latex/point-names.ts`), donc, en mode longueur, `A\,B` ≡ `A\times B` et `A\,B` ≢ `AB`.

**Renvoyé au lot 2** (traitements provisoires du lot 1, au plus sûr) :

- `normalize` : longueur et nom de figure passent par `normalizeOpaqueNode` (facteur opaque) ;
  à décider : variable polynomiale de clé canonique (Pythagore, `solve`).
- `getVariables`/`containsVariable` : une longueur n'est pas une variable (`[]`) ; `substitute`
  ne la connaît pas ; `evaluate()` la rend telle quelle (`status: 'value'`), alors qu'une
  variable libre est `unevaluable` ; l'évaluation numérique lève un message français
  (« On ne connaît pas la valeur de la longueur AB. ») ; `differentiate` la traite en constante.
- `numtype` : type inconnu (une longueur est un réel positif) ; `dimensional` : sans dimension.
- `checkForm('BA', 'AB')` rend `bad_form` (l'ordre des points doit être libre) ; `isSimpleElement`
  (`transforms.ts`) retire les parenthèses de `(AB)`.
- `figureName` se compare et se calcule encore comme un atome : le refus avec message (Q-A) est à
  écrire (`areEquivalent`, `evaluate`, `checkForm`).
- `integration/classify` la classe en constante (`polynomial`).
- Syntaxe maison (lot 5) : `toCustom` écrit `AB` et `{AB}/{CD}`, que `parseCustom` relit encore
  comme un produit.

## Journal

- 2026-10-11 — préparation : mesure du parseur et des questions en base ; questions de phase 0.
- 2026-10-11 — enquête de phase 0 (parseurs, consommateurs, base de prod), conception (option A
  recommandée), questions Q-A à Q-G, spécification à valider. Aucun code, aucun test.
- 2026-10-12 — décision de David (déclaration → contexte → longueur par défaut) ; enquête sur les
  déclarations existantes (`genericFunctions` = rail à copier) ; option `capitalPairs`, V1
  recommandée ; Q-A et Q-C ajustées, Q-B tranchée, Q-H à Q-L ajoutées ; spécification et plan
  mis à jour. Aucun code, aucun test.
- 2026-10-12 — spécification et plan **validés par David** (Q-A à Q-L) ; lancement du lot 1.
- 2026-10-12 — lot 1 fait : nœuds, option `capitalPairs` (Pratt et rd), écriture, empreinte de
  4 122 chaînes, bogue `hashMathNode` corrigé ; suites vertes.
- 2026-10-12 — corrections de revue du lot 1 : Q-E sur le chemin des réponses (`A\,B` reste un
  produit, mesure Chromium), `hashMathNode` exhaustif (`signed-zero`, `piecewise`), message
  français d'`evaluate`, compte réel de l'empreinte.
- 2026-10-12 — décisions Q-M (b) et Q-N (a) : défaut du parseur `'product'`, option `capitalPairs`
  transmise par `areEquivalent` et `checkForm` ; raccourcis MathLive au plan du lot 3.
