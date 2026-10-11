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

## Conception proposée

### Option A — un nœud dédié (recommandée)

```
SegmentLengthNode { type: 'segmentLength', points: readonly [PointName, PointName] }
PointName = { letter: 'A'…'Z', primes: 0|1|2…, index?: string }   // A, A', A_1, M_n
```

- **Lecture du parseur** : dans les deux tokenizers, deux majuscules **collées dans la source**
  (avec leurs primes et indices) → un jeton `SEGMENT` ; trois points ou plus → refus (voir Q-A).
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

### Option B — une variable au nom de deux points

`variable('AB')` : le sens est porté par la **forme du nom**. Tout marche aussitôt comme une
variable (`tidy`, `normalize`, `solve`, `compile`). Contre : convention implicite (« astuce ») ;
`AB = BA` à recoller dans `equivalenceForm`, `substitute` et `checkForm` ; `\mathit{AB}` à changer
dans `toLatex` ; primes dans un nom de variable (`A'B'`) à vérifier dans `compile` ; un nom de
gabarit oublié (`XU`) deviendrait une longueur sans bruit ; `ABC` et les noms de figure n'ont pas
de place.

**Recommandation : A.** Le surcoût est un audit mécanique ; le gain est que rien ne devient une
longueur « par hasard » et que le compilateur montre chaque endroit à décider.

## Questions (ouvertes, à trancher par David)

**Q-A. `ABC` refusé : où ?** Les 298 `~ABC~`, `~ABCD~`, `~GGGG~` des exercices sont des **noms de
figure** ou des **chemins**, affichés. (a) Refus partout, et migration des 30 exercices de
`~ABC~` vers `$ABC$` (données de prod, sur ton accord) ; l'auteur qui écrit `~ABC~` voit le message.
(b) Le parseur garde `ABC` comme **nom de figure** (nœud non calculable, affiché `ABC`, lu « ABC »)
et le **refus avec message** a lieu au calcul et à la correction (`areEquivalent`, `evaluate`,
`checkForm`). (c) Refus seulement en LaTeX (saisie élève), produit conservé en syntaxe maison.
**Recommandation : (b)** — ton intention (« ABC n'est pas une longueur ») est tenue pour l'élève,
et aucun document n'affiche d'erreur.

**Q-B. Matrices (T_EXP).** `AB`, `AX = B`, `LA` y sont des produits de matrices. (a) Longueur
partout, sans exception (les énoncés matriciels ne sont pas lus aujourd'hui) ; (b) idem, plus une
**option du parseur** `segmentLengths: false` créée dès le lot 1, qu'un futur trou matriciel
activera ; (c) détection par le contexte. **Recommandation : (b)** (coût quasi nul, pas de
détection magique).

**Q-C. Chemins de probabilité** (`~GD~`, `~DG~`) : deviendraient « la longueur GD » à la lecture
(affichage inchangé). (a) Accepter (lecture fausse, rare, outil de lecture seul concerné) ;
(b) écrire les chemins en texte. **Recommandation : (a)**, avec (b) au fil des relectures.

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
(droit) ? **Recommandation : `AB`**, relu tel quel par le parseur.

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
| `AX_n`                           | longueur A X_n (selon Q-B : option pour les matrices)                              |
| unités (`5\unit{kWh}`, `12[MW]`) | inchangées                                                                         |
| gabarits `{{eval:XU*XV}}`        | inchangés (noms remplacés avant le parseur)                                        |

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
   jeton `SEGMENT` dans le tokenizer LaTeX, Pratt et `rd` ; refus/nom de figure (Q-A) ; primes et
   indices (Q-D) ; option `segmentLengths` (Q-B) ; `toLatex`/`toCustom`/`prettyPrint` ; traitement
   de tous les `switch` exhaustifs ; audit listé des branches `default` (`case 'variable'`).
2. **Lot 2 — calcul et correction** : `normalize` (clé canonique), `denormalize`, `equivalenceForm`,
   `getVariables`/`substitute`/`evaluate`/`compile`, `checkForm` (ordre des points libre),
   `tidy`/`simplify`. Panel des simplifications et convention d'équivalence mis à jour.
3. **Lot 3 — lecture** : `structure/` (« la longueur AB », « le carré de la longueur AB ») ;
   `mathast-expert` + `pedagogy-expert` pour les formulations.
4. **Lot 4 — syntaxe maison** : tokenizer custom, Pratt et `rd` ; relance des suites
   `geometry-core` (`geometry-expert` en relecture) et des rendus d'exercices ; si Q-A = (a),
   migration des 30 exercices (données de prod, sur accord explicite).
5. **Plus tard** : positivité (Q-F), `\overline`, `\widehat`, `\overrightarrow`, droite `(AB)` et
   segment `[AB]`. Terme « longueur (d'un segment) » à verser dans `CONTEXT.md` (attention :
   « point » y désigne déjà le **point du programme**).

## Journal

- 2026-10-11 — préparation : mesure du parseur et des questions en base ; questions de phase 0.
- 2026-10-11 — enquête de phase 0 (parseurs, consommateurs, base de prod), conception (option A
  recommandée), questions Q-A à Q-G, spécification à valider. Aucun code, aucun test.
