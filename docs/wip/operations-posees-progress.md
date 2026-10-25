# Chantier « operations-posees » — opérations posées en colonnes

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 du lot 2 validée._

- **État** : lot 1 COMPLET sur `main`, pas en prod (#1716, #1726, #1738). Lot 2 (multiplication) : phase 0 validée le 2026-10-25 (§ 10), PR 2a (affichage) en cours.
- **Prochaine action** : PR 2a — tests rouges puis parseur, scène, écran, PDF, éditeur riche.
- **En attente de David** : vérifications #1716, #1726 et #1738 (`verifications-manuelles.md`), avant le prochain `deploy:prod`. Comportement 5 précisé et décimales de fin (comptées 0) : tranchés le 2026-10-25 (recommandations suivies).
- **Page de démonstration** : https://claude.ai/artifact/1N1ndKCtLLxE3S5SRbgiBB — republiée le 2026-10-25 avec la saisie jouable (7 cas) et la règle des décimales de fin (#1738).
- **Pièges en cours** : sous zsh, `pnpm format $LISTE` ne découpe pas → `xargs pnpm exec prettier --write` ; au PDF, la compensation à remplir n'a plus de case en bas.
- **Worktree / branche** : `../ubumaths-wt-operations-posees`, `feat/operations-posees-multiplication`.

---

## 1. Origine et périmètre

Ce qui manque : ubumark n'a aucun rendu « en colonnes », et une question n'a aucune saisie chiffre
par chiffre, retenues comprises. Modèle suivi : le chantier horloge (`docs/wip/horloge-progress.md`),
bloc ubumark + case de réponse.

Points débloqués (bornes : `docs/systeme/programmes/bornes/cycle2.json`, `cycle3.json`) :

| Point   | Libellé (abrégé)                         | Borne                                                         |
| ------- | ---------------------------------------- | ------------------------------------------------------------- |
| CP-016  | Additions en colonnes                    | 2 ou 3 nombres à 1 ou 2 chiffres (45 + 37 ; 28 + 8 + 56)      |
| CE1-022 | Addition en colonnes                     | 2 ou 3 nombres à 1, 2 ou 3 chiffres (76 + 7 + 568)            |
| CE2-016 | Addition en colonnes                     | entiers ≤ 10 000 ; montants en euros                          |
| CE1-100 | Soustraction en colonnes                 | entiers ≤ 1 000 ; « par cassage » **ou** « par compensation » |
| CE2-090 | Soustraction en colonnes                 | entiers ≤ 10 000 ; montants en euros                          |
| CE2-019 | Multiplication posée                     | 2-3 chiffres × 1-2 chiffres (16 × 548)                        |
| CM1-051 | Multiplication de deux entiers           | 3 chiffres × 3 chiffres (876 × 208), produit ≤ 999 999        |
| CM1-052 | Décimal × entier < 10                    | 7 × 46,55 ; 8 × 17,3                                          |
| CM2-055 | Décimal × entier                         | 876 × 20,8 ; 8,76 × 208                                       |
| CM1-053 | Division euclidienne, diviseur 1 chiffre | dividende ≤ 5 chiffres (9 456 ÷ 7)                            |
| CM2-056 | Division décimale, dividende entier      | arrêt au centième, reste nul (785 ÷ 4)                        |
| CM2-057 | Division décimale, dividende décimal     | arrêt au centième, reste nul (148,2 ÷ 5)                      |
| CM1-050 | Addition de décimaux en colonnes         | ≤ 2 décimales, entiers mêlés, 3 termes (56,75 + 234 + 0,8)    |
| CM1-165 | Soustraction de décimaux en colonnes     | ≤ 2 décimales (34,5 − 2,58)                                   |
| CE2-055 | Additions de montants en euros           | écriture à virgule, 2 décimales                               |
| CE2-056 | Soustractions de montants en euros       | idem                                                          |

**Hors périmètre** : les modèles de question eux-mêmes (chantier « questions ») ; le chat élève
(invariant 8 de `ubumark.md`).

## 2. Syntaxe proposée

Un bloc ` ```operation `, clés en français, une par ligne (comme ` ```horloge `). Seule `calcul:`
est obligatoire.

````text
```operation
calcul: 245 + 437
```
````

````text
```operation
calcul: {{a}} × {{b}}
retenues: oui
```
````

- `calcul:` : `a + b (+ c)`, `a − b` (ou `-`), `a × b` (ou `x`, `*`), `a ÷ b` (ou `:`). Virgule
  décimale (point accepté). Variables résolues avant l'analyse, comme l'horloge.
- Le bloc **calcule lui-même** le résultat, les retenues, les produits partiels, les étapes de la
  division : l'auteur n'écrit jamais la réponse (pas de divergence possible).
- Réglages pressentis : `cases: résultat | tout | aucune` (`aucune` = opération posée et résolue,
  pour la correction et les cours), `retenues: oui | non`, `taille:` (PDF).

## 3. Rendu

- Grille à carreaux, chiffres alignés à droite (unités sous unités, virgule sous virgule), signe à
  gauche, trait de l'opération ; division en potence.
- Scène pure partagée écran / PDF (`utils/operation-scene.ts`), comme `horloge-scene.ts`.
- Retenues en petit, au-dessus de la colonne (addition, multiplication) ; pour la soustraction, selon
  l'algorithme (Q2 ci-dessous).
- `var(--color-*)` seulement ; téléphone : jamais plus large que le conteneur, carreaux ≥ 40 px pour
  le doigt.
- Accessibilité : nom accessible qui ne donne pas le résultat ; aucune valeur attendue dans le DOM.
- PDF : grille vide à compléter (ou résolue avec `cases: aucune`) ; Typst valide toujours (cadre
  neutre en cas d'erreur).

## 4. Comportements du lot 1 (addition, soustraction)

Syntaxe retenue pour le lot 1 : `calcul:` (obligatoire), `cases: résultat | aucune` (défaut
`résultat`), `retenues: oui | non` (défaut `oui`), `méthode: compensation | cassage` (soustraction
seulement, défaut `compensation`). `cases: tout` (lignes intermédiaires) arrive avec la
multiplication (lot 2).

### Nominal

1. `calcul: 45 + 37` → deux lignes alignées à droite, signe + à gauche de la dernière ligne, trait,
   ligne de résultat. Cases de résultat : **une de plus** que le plus long terme (trois ici), pour que
   la largeur ne trahisse pas la retenue finale. Cases de retenue au-dessus de chaque colonne sauf
   celle des unités.
2. `calcul: 28 + 8 + 56` → trois termes ; une retenue peut valoir 2 (`9 + 9 + 9`).
3. `cases: aucune` → opération résolue : résultat écrit, retenues écrites (sauf `retenues: non`),
   zéros de tête jamais écrits.
4. `calcul: 56,75 + 234 + 0,8` → virgules alignées sous la colonne des unités ; carreaux vides à
   droite des nombres plus courts (décision 10) ; le résultat a autant de décimales que le terme
   qui en a le plus (`291,55`), zéro final compris (`2,5 + 1,5` → `4,0`).
5. Soustraction `calcul: 52 − 37`, méthode **compensation** : colonne des unités, 2 < 7 → petit 1
   devant le 2 du haut, petit 1 contre le 3 du bas (colonne suivante). Résultat 15. Cases de
   résultat : autant que le nombre du haut.
6. `méthode: cassage` : le chiffre emprunté est barré, sa nouvelle valeur écrite au-dessus ; à
   travers les zéros (`302 − 7` : 3 → 2, 0 → 9, 2 → 12). À remplir, rien n'est barré : savoir
   quelle colonne casser fait partie de la réponse (revue #1716).
7. `−`, `-` acceptés pour la soustraction ; `,` ou `.` pour la virgule ; `1 234` (espaces de
   milliers) accepté.
8. Variables résolues avant le bloc (`calcul: {{a}} + {{b}}`), comme l'horloge.
9. Le bloc marche au premier niveau et en item de liste ; écran et PDF construits depuis la même scène.

### Limites

10. `99 + 1` → résultat `100`, la retenue des centaines au-dessus de la colonne ajoutée.
11. `1 000 − 998` → résultat `2` : en mode résolu, cases de tête vides.
12. `0,5 + 0,5` → `1,0`.

### Erreurs (messages situés, vus du prof ; l'élève voit « Opération indisponible »)

13. Pas de ligne `calcul:` ; terme illisible (`4a + 2`) ; opérateur inconnu ou mélangé (`4 + 2 − 1`).
14. Soustraction à résultat négatif ; soustraction à plus de deux termes ; addition à plus de
    trois termes.
15. Plus de 10 chiffres avant la virgule ou plus de 3 après ; nombre négatif.
16. `×` ou `÷` : « pas encore disponible (lot 2 / lot 3) ».
17. `méthode:` sur une addition ; clé inconnue ; valeur hors liste ; clé répétée.

## 5. Ce qu'il faut construire

Patron « Comment étendre » de `ubumark.md` (type, parseur, branchements, scène, nœud Svelte, Typst,
éditeur riche, `check:ubumark`), **plus** une nouvelle nature de case côté questions (patron
« nouvelle nature » de `questions.md` : `InstanceBlank`, juge, saisie, `expected-result.ts`).

## 6. Agents

- Parseur, scène, calcul des étapes, Typst : session principale ou `pedagogy-expert`.
- Saisie (composant) : `frontend-developer` (Sonnet).
- Juge / branchement questions : `pedagogy-expert`.
- Revue : `code-reviewer` (Opus : correction des réponses).

## 7. Questions à David

Voir le message de la session du 2026-10-25 (Q1 à Q8).

## 7 bis. Décisions (David, 2026-10-25)

Toutes les recommandations retenues :

1. L'élève remplit le résultat chiffre par chiffre et, s'il le veut, des cases de retenue.
2. Les retenues sont une aide, jamais jugées ; la correction les montre.
3. L'opération est posée par le modèle en v1 ; « poser soi-même » plus tard (QCM en attendant).
4. Syntaxe et scène pour les quatre opérations, livrées en trois lots : (1) addition et
   soustraction, entiers, décimaux, euros ; (2) multiplication ; (3) division.
5. Architecture A : les cases du résultat forment UNE réponse, lue comme un nombre, jugée par le
   juge existant ; à la correction, les chiffres faux surlignés.
6. Lignes intermédiaires (produits partiels, soustractions de la division) : aide, non jugées.
7. Saisie de droite à gauche, curseur qui passe à gauche ; cases de tête vides = 0.
8. `cases: aucune` : opération résolue (correction, cours, PDF).
9. Soustraction : réglage `méthode: compensation | cassage`, compensation par défaut.
10. Décimaux de longueurs différentes : carreaux vides (pas de zéros ajoutés).

Découpage du lot 1 : **PR 1a** bloc d'affichage (parseur, scène, écran, PDF, éditeur riche,
`check:ubumark`) ; **PR 1b** saisie et juge (nouvelle nature de case).

## 8. PR 1b — pistes relevées dans le code (à présenter à David avant de coder)

- **Indexation** : `assignBlankIndices` (`src/lib/questions/generator/assign-blank-indices.ts`)
  compte les `?` (formule) et `[_]` (texte) ; `instance-generator.ts` exige autant d'entrées dans
  `blanks[]` que de cases (« Blank count mismatch »). Un bloc ```operation en `cases: résultat`
  devrait y compter pour **une** case (décision 5), et recevoir son numéro (ex. clé ajoutée au bloc
  à l'indexation, `case: N`).
- **Valeur saisie** : `InputState[]` descend en props `MarkdownRenderer` → `ParagraphNode` →
  `BlankInput` (`getInputState(index)`). Les blocs (`StaticBlockNode`, `ListNode`) ne reçoivent
  pas encore `inputs` : à faire passer jusqu'à `Operation.svelte`.
- **Juge** : la valeur (chiffres lus de gauche à droite, virgule de la grille) passe au juge
  existant comme un nombre (`validateSingleBlank`, case ordinaire) ; cases de tête vides = 0.
- **Questions à poser** : (a) l'auteur écrit-il la réponse de la case (`answer: {{eval:a+b}}`,
  contrôlée contre le calcul du bloc) ou le générateur la remplit-il depuis `operationResult` ?
  (b) nature de la case : `type: 'math'` existante, ou nouvelle nature `'operation'` dans
  `InstanceBlank.type` ? (c) cases de retenue sur téléphone : taille, et saisie de la compensation
  (deux positions par colonne) ; (d) surlignage des chiffres faux à la correction (décision 5).

## 8 bis. Décisions de la PR 1b (David, 2026-10-25)

David a répondu « je te suis » aux quatre recommandations, une par question :

- (a) La réponse attendue vient du calcul du bloc (`operationResult`) ; l'auteur n'écrit rien.
- (b) Case `type: 'math'` ordinaire, marquée comme venant d'un bloc ```operation (juge existant).
- (c) Une seule case de retenue par colonne, en haut (~28 px ; résultat ≥ 40 px) ; en compensation,
  le petit 1 du bas s'affiche de lui-même quand l'élève écrit celui du haut.
- (d) Correction : chiffres faux de la saisie surlignés (comparaison alignée à droite), opération
  résolue montrée à côté.

## 9. Comportements de la PR 1b (validés par David le 2026-10-25)

### Nominal

1. Un bloc ```operation en `cases: résultat` compte pour **une** case de la question, numérotée dans
   l'ordre du texte avec les `?` et `[_]` ; `cases: aucune` ne compte pour rien.
2. Le générateur remplit la réponse attendue de cette case avec le résultat calculé par le bloc
   (`45 + 37` → `82`) ; l'auteur ne met pas d'entrée pour elle dans `blanks[]`. S'il en met une
   (réglages de case), elle est acceptée sans `answer`.
3. Saisie : l'élève touche une case du résultat, tape un chiffre, le curseur passe à la case de
   gauche. Effacer : vide la case et revient à droite. Clavier physique et clavier virtuel.
4. Les cases de résultat lues de gauche à droite, virgule de la grille comprise, donnent la réponse :
   cases de tête vides = rien (`_ 8 2` → `82`) ; `291,55` reste `291,55`.
5. Cette réponse passe au juge ordinaire : `82` juste, `81` faux. Décimaux : `4,0` et `4` sont
   jugés comme le juge actuel le fait pour une case nombre.
   **Précisé en codant (2026-10-25)** : le juge met `4{,}0` en ambre (« zéros inutiles ») ; la lecture
   de la grille retire donc les zéros de tête et les zéros décimaux de fin (`1,0` → `1`) et pose les
   espaces de milliers (`30 000`) — aucune remarque de forme que la grille impose. Signalé à David.
6. Retenues : cases facultatives, jamais jugées ni envoyées au juge, perdues au rechargement de la
   question. Compensation : écrire 1 en haut d'une colonne montre le petit 1 contre le chiffre du
   bas de la colonne suivante. Cassage : la case au-dessus du chiffre reçoit sa nouvelle valeur
   (deux chiffres possibles, `12`).
7. Correction : la grille de l'élève reste affichée ; ses chiffres faux sont surlignés
   (`var(--color-*)`), et l'opération résolue (`cases: aucune`) est montrée à côté. Réponse juste :
   pas de surlignage.
8. Plusieurs blocs dans une question = plusieurs cases ; un bloc et des `?` ordinaires cohabitent.
9. PDF : inchangé (grille vide à compléter).

### Limites

10. Case de tête prévue pour la retenue finale (`99 + 1`) : vide → résultat lu sans elle ; remplie
    → elle compte (`100`).
11. Une case au milieu laissée vide (`8 _ 2`) : réponse incomplète, jugée fausse (pas de 0 implicite
    au milieu).
    **Décimales de fin (David, 2026-10-25)** : laissées vides, elles comptent 0, comme les cases de
    tête (`0,5 + 0,5`, élève « 1 » sans le 0 des dixièmes → `1`, juste) ; une réponse fausse le reste
    (`2,5 + 1,25`, élève `3,7_` → `3,7`, faux).
12. Chiffre faux à gauche d'une réponse plus courte (`1 000 − 998`, élève `0 0 2`) : zéros de tête
    acceptés (`2`).
13. Téléphone : la grille ne déborde jamais ; si elle ne tient pas en 40 px, elle défile dans son
    cadre, pas la page.

### Erreurs

14. Bloc en erreur (`Opération indisponible`) dans une question : la question est refusée au test
    du modèle (message situé pour le prof), jamais une case morte devant l'élève.
15. Une touche autre qu'un chiffre est ignorée dans la case.
16. Aucune valeur attendue dans le DOM (ni attribut, ni nom accessible) ; nom accessible de chaque
    case : « chiffre des unités », « chiffre des dizaines »…

## 10. Lot 2 — multiplication (phase 0 validée par David le 2026-10-25)

### Décisions (recommandations suivies)

- Q1 : le facteur qui a le plus de chiffres est posé en haut, automatiquement ; égalité → ordre écrit.
- Q2 : un 0 dans le nombre du bas → ligne sautée, la suivante reçoit un zéro de décalage de plus.
- Q3 : l'élève pose la virgule du résultat (« , » tapée dans une case : virgule à droite de son
  chiffre ; une seule ; retapée → enlevée) ; à la correction, virgule absente ou mal placée surlignée.
- Q4 : à remplir, les zéros de décalage sont des cases vides (l'oubli du zéro est l'erreur classique).
- Q5 : à remplir, une rangée de retenues au-dessus du nombre du haut (réutilisée d'une ligne à
  l'autre) et une rangée pour l'addition des produits partiels ; résolu : retenues de l'addition seules
  quand il y a plusieurs lignes.
- Q6 : `cases: résultat` montre les lignes de produits partiels (aide, vides) ; pas de `cases: tout`.
- Q7 : décimal × décimal accepté.

Découpage : **PR 2a** affichage (parseur, scène, écran, PDF, éditeur riche, `check:ubumark`) ;
**PR 2b** saisie (virgule posée par l'élève, cases des lignes intermédiaires, surlignage de la virgule).

### Nominal

1. `calcul: 548 × 16` (`x`, `*` acceptés) : nombre du haut, nombre du bas, × à gauche, trait.
2. Un chiffre en bas (`46 × 7`) : résultat directement sous le trait ; retenues au-dessus du haut.
3. Plusieurs chiffres en bas : une ligne de produit partiel par chiffre non nul, décalée d'un rang à
   chaque fois, zéros de décalage écrits ; + à gauche de la dernière ligne, second trait, résultat.
4. Cases : résultat = chiffres des deux facteurs réunis ; produit partiel = chiffres du haut + 1, plus
   son décalage. La largeur ne trahit rien.
5. Décimaux (`7 × 46,55`, `876 × 20,8`) : alignés à droite sur le dernier chiffre (pas virgule sous
   virgule), virgules des facteurs à leur place, produits partiels sans virgule, résultat avec autant
   de décimales que les deux facteurs réunis (`325,85`).
6. `cases: aucune` : posée et résolue ; zéro de fin gardé (`2,5 × 4` → `10,0`).
7. Saisie et juge : ceux du lot 1 (une réponse, juge ordinaire, attendu = calcul du bloc) ; produits
   partiels et retenues = aide, jamais jugés.
8. Correction : chiffres faux surlignés, opération résolue à côté.
9. PDF : grille vide avec les lignes de produits partiels.

### Limites

10. `548 × 0`, `548 × 1` acceptés (`0`, `548`).
11. `0,5 × 4` : 0 de tête posé, résultat `2,0`.
12. Téléphone : 6 × 3 chiffres ≈ 10 colonnes, la grille défile dans son cadre.

### Erreurs (messages situés pour le prof ; l'élève voit « Opération indisponible »)

13. Plus de deux facteurs (`3 × 4 × 5`) ; signes mélangés (`3 × 4 + 1`).
14. Plus de 6 chiffres en haut ou plus de 3 en bas ; bornes de chiffres du lot 1.
15. `méthode:` sur une multiplication ; `÷` « pas encore disponible (lot 3) ».

## Journal

### 2026-10-25 — #1738 décimales de fin

- Décision de David (recommandation suivie) : décimales de fin laissées vides = 0 à la lecture ; revue Opus : même règle au surlignage (`wrongResultDigits`), corrigé ; retour sur la question : `1` remis en `1,0` (accepté, figé par un test).

### 2026-10-25 — PR 1b codée

- § 8 tranché (§ 8 bis, « je te suis »), § 9 écrit puis validé par David.
- Fait : clé `case:` du parseur ; `utils/operation-answer.ts` (lecture, attendu, chiffres faux) ;
  scène : compensation à remplir sans case du bas ; `assignBlankIndices` (`operationBlanks`,
  `operationErrors`) ; générateur (case insérée ou entrée de réglages, réponse calculée) ;
  `template-validator` (un bloc à remplir suffit sans `blanks`) ; `Operation.svelte` (`answer`) ;
  `FillBlanksInput` (rendu, ordre des cases, Entrée, correction).
- Écart au § 9 : comportement 5 précisé (zéros retirés, espaces posés), voir le § 9.
- Revue Opus #1726 : 3 importants corrigés (QCM / carte de cours avec bloc passaient en cases à
  trous ; chiffre retapé dans une case pleine perdu ; `case:` écrite par l'auteur → case morte),
  mineurs corrigés (`shared.statement` au validateur, `figure-name-check` réaligné, entrée sans
  `expectedAnswer`). **Question ouverte à David** : dixièmes de fin laissés vides (`0,5 + 0,5`,
  élève « 1 » sans le 0) → aujourd'hui réponse incomplète, jugée fausse.

- 2026-10-25 : worktree créé, phase 0 rédigée.
- 2026-10-25 : décisions de David (§ 7 bis). PR 1a : `types/operation.ts`, `parser/operation-parser.ts`,
  `utils/operation-scene.ts` (calcul chiffre par chiffre en `BigInt`, retenues d'addition,
  compensation, cassage), `Operation.svelte` (grille HTML), `operation-typst.ts` (`table` native),
  branchements (premier niveau, listes, éditeur riche, `check:ubumark`, cadres de réponse).
  Tests : parseur 27, scène 28, Typst 6 + compilation réelle, composant 7 (navigateur), éditeur 4.
  Captures écran clair / sombre (360 px) et PDF regardées.
