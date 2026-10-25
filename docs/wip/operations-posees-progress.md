# Chantier « operations-posees » — opérations posées en colonnes

## Reprendre ici

_Mis à jour le 2026-10-25, PR 3a codée._

- **État** : lot 1 COMPLET (#1716, #1726, #1738) ; lot 2 multiplication COMPLET (#1740, #1745, #1748 : 0 des dixièmes non écrit → incomplète), sur `main`, pas en prod. Lot 3 : phase 0 validée (§ 12), PR 3a (affichage) codée, en revue.
- **Prochaine action** : merger la PR 3a, puis PR 3b (saisie : quotient de gauche à droite, reste, zone des étapes, virgule).
- **En attente de David** : vérifications #1716, #1726, #1738, #1740, #1745, #1748 avant `deploy:prod`. Précision Q1 (§ 10).
- **Page de démonstration** : https://claude.ai/artifact/1N1ndKCtLLxE3S5SRbgiBB (à republier avec la saisie de la multiplication).
- **Pièges en cours** : sous zsh, `pnpm format $LISTE` ne découpe pas → `xargs pnpm exec prettier --write` ; au PDF, la compensation à remplir n'a plus de case en bas.
- **Worktree / branche** : `ubumaths-wt-operations-posees-division` · `feat/operations-posees-division-affichage` ; l'ancien `ubumaths-wt-operations-posees` reste figé tant que le serveur de test (5179) sert à David.

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
  **Précisé en codant (revue PR 2a)** : zéros de tête non comptés (`0,5 × 12` pose 12 en haut, comme
  `12 × 0,5` ; `0,001 × 0,001` accepté). Signalé à David.
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

## 11. PR 2b — saisie de la multiplication (validés par David le 2026-10-25)

Recommandations suivies (« je suis tes recos ») : (a) virgule absente mais valeur juste → juste ;
(b) virgule offerte même pour un produit d'entiers ; (c) noms accessibles neutres pour la
multiplication seulement.

### Nominal

1. Une multiplication à remplir n'est plus refusée par `instance-generator.ts` : une case, réponse
   attendue calculée par le bloc (`548 × 16` → `8768`).
2. Saisie du résultat comme au lot 1 (chiffre → case de gauche, Effacer → droite, Entrée valide).
3. Virgule (Q3) : « , » ou « . » dans une case du résultat pose une virgule à droite de cette case,
   sans toucher à son chiffre ; une seule (ailleurs → déplacée ; même case → enlevée). Clavier de
   téléphone avec virgule (`inputmode="decimal"`).
4. Lecture : de gauche à droite avec la virgule de l'élève (`3 2 5 , 8 5` → `325,85`) ; zéros de fin
   et de tête retirés comme au lot 1 (`1 0 , 0` → `10`).
5. Produits partiels saisissables (zéros de décalage compris, Q4) : chiffres seulement, jamais jugés
   ni envoyés au juge, perdus au rechargement.
6. Retenues : la rangée du haut (déjà là) et celle de l'addition des produits partiels, mêmes règles.
7. Flèches ←/→ dans une rangée, ↑/↓ d'une rangée à l'autre ; au doigt, toucher la case.
8. Correction : chiffres faux surlignés case par case ; virgule absente → la case où elle devait être
   surlignée ; mal placée → la virgule de l'élève surlignée ; opération résolue à côté ; produits
   partiels jamais surlignés.
9. Noms accessibles neutres : « résultat, case 3 sur 5 en partant de la droite », « produit partiel
   1, case 2 » (pas de « chiffre des unités » : il dirait où est la virgule).

### Limites

10. `2,5 × 4` saisi `1 0` sans virgule : juste (le juge juge la valeur).
11. `48 × 16` saisi `76,8` : faux, virgule surlignée.
12. `0,5 × 0,3` saisi `, 1 5` → `0,15` (0 implicite).
    **Décimale de tête vide (David, 2026-10-25, reco suivie)** : `0,05 × 0,3` saisi `_ _ , _ 1 5`
    (0 des dixièmes non écrit) → incomplète, la case surlignée ; pas de 0 implicite après la
    virgule. Même règle avec la virgule de la grille (`0,03 + 0,02`, élève `_ _ , _ 5`).
13. Cases vides : tête = rien ; milieu = incomplet ; à droite du dernier chiffre : ignorées si la
    virgule est à leur gauche (`1 0 , _` → `10`), sinon incomplet (`_ 3 2 _` n'est pas `32`).
14. Retour sur la question : réponse remise alignée à droite, zéros de fin possiblement perdus
    (`10,0` → `1 0`).
15. Téléphone : inchangé, la grille défile dans son cadre.

### Erreurs

16. Touche autre que chiffre ou virgule ignorée ; virgule ignorée dans produits partiels et retenues.
17. Aucune valeur attendue dans le DOM (ni place de la virgule, ni chiffres des produits partiels).
18. QCM / carte de cours avec multiplication à remplir : comme au lot 1.
19. PDF inchangé.

## 12. Lot 3 — division posée (phase 0 validée par David le 2026-10-25)

Points visés : CM1-053 (euclidienne, diviseur 1 chiffre, dividende ≤ 5 chiffres), CM2-056
(décimale, dividende entier, arrêt au centième, reste nul), CM2-057 (dividende décimal, idem),
6-123 (euclidienne, diviseur < 100).

### Décisions (« je te suis » : la recommandation de chaque question, en premier)

- **Q1 — Soustractions écrites** : réglage `étapes: soustractions | restes`, défaut `soustractions`
  (le produit soustrait écrit sous chaque dividende partiel, signe −, trait ; c'est la forme du CM1).
  `restes` : seuls les restes successifs, soustraction faite de tête (6e).
- **Q2 — Euclidienne : combien de réponses** : **deux cases** (quotient, reste), numérotées dans
  l'ordre quotient puis reste ; le bloc compte pour 2 dans la question. Sinon : quotient seul, reste
  en aide non jugée.
- **Q3 — Euclidienne ou décimale** : réglage `quotient: entier | décimal`. Défaut : `entier` si le
  dividende est entier, `décimal` s'il est décimal. `785 ÷ 4` → 196 reste 1 ; avec
  `quotient: décimal` → 196,25.
- **Q4 — Quotient décimal qui ne s'arrête pas** : v1 exacte seulement : erreur située si le quotient
  ne s'arrête pas au plus tard au millième (`10 ÷ 3`). Valeur approchée (`arrondi: centième`) plus
  tard, avec la 6e.
- **Q5 — Zéros abaissés** (`785 ÷ 4` décimal) : le dividende reste écrit tel quel (`785`) ; résolu,
  les zéros ajoutés s'écrivent à sa droite (`785,00`, en plus clair) et la virgule du quotient
  apparaît avec le premier chiffre des dixièmes. À remplir, des carreaux libres à droite du dividende.
- **Q6 — Virgule du quotient** : posée par l'élève, comme au lot 2 (« , » dans une case → virgule à
  sa droite ; absente mais valeur juste → juste ; mal placée → surlignée).
- **Q7 — Zone des étapes à remplir** : une zone quadrillée libre sous le dividende, de hauteur fixée
  par le **nombre de chiffres du dividende** (le maximum possible), sans lignes tracées : des lignes
  prêtes diraient combien le quotient a de chiffres. Aide, jamais jugée, perdue au rechargement.
- **Q8 — Diviseur** : entier de 1 ou 2 chiffres (6-123), non nul ; diviseur décimal refusé
  (transformation de la 6e, hors périmètre). Dividende : ≤ 6 chiffres, décimales comprises.

Découpage pressenti : **PR 3a** affichage (parseur, scène, potence écran et PDF, éditeur riche,
`check:ubumark`) ; **PR 3b** saisie (cases du quotient et du reste, zone des étapes, virgule).

### Nominal

1. `calcul: 9 456 ÷ 7` (`:` accepté) : potence à la française — dividende en haut à gauche,
   diviseur en haut à droite, trait vertical entre les deux, trait horizontal sous le diviseur,
   quotient sous ce trait.
2. Résolu (`cases: aucune`), `étapes: soustractions` : sous chaque dividende partiel, le produit
   soustrait (−, trait), puis le reste avec le chiffre abaissé à sa droite ; dernier reste en bas.
   `9 456 ÷ 7` → quotient `1 350`, reste `6`. Un 0 au quotient (dividende partiel < diviseur) :
   pas de ligne « − 0 », le chiffre suivant est abaissé (usage des manuels).
3. `étapes: restes` : seuls les restes successifs, chiffre abaissé compris.
4. À remplir, euclidienne : cases du quotient sous le trait, **autant que de chiffres du dividende**
   (la largeur ne trahit rien) ; case(s) du reste en bas à gauche, autant que de chiffres du
   diviseur. Deux réponses jugées par le juge ordinaire, attendus calculés par le bloc.
5. Saisie du quotient **de gauche à droite** (on l'écrit dans ce sens, à l'inverse des lots 1-2) :
   chiffre → case de droite, Effacer → vide et revient à gauche. Reste : de droite à gauche comme
   au lot 1.
6. Lecture du quotient : cases vides **à droite** ignorées (`1 3 5 0 _` → `1350`) ; vide au milieu
   → incomplet ; zéros de tête retirés (`0 1 3 5 0` → `1350`).
7. Décimale (`785 ÷ 4`, `quotient: décimal` ; `148,2 ÷ 5`) : une seule case jugée (le quotient,
   virgule posée par l'élève) ; pas de case de reste (il est nul). Cases du quotient : chiffres du
   dividende + 2 (centième) ; dividende décimal : sa virgule écrite à sa place.
8. Correction : chiffres faux du quotient et du reste surlignés ; virgule comme au lot 2 ; potence
   résolue à côté ; zone des étapes jamais surlignée.
9. PDF : potence vide (zone des étapes quadrillée) ou résolue.

### Limites

10. Diviseur plus grand que le premier chiffre (`456 ÷ 7`) : premier dividende partiel `45`,
    quotient `65` reste `1`. Diviseur plus grand que le dividende (`5 ÷ 7`) : quotient `0`, reste `5`.
11. `9 ÷ 1`, `0 ÷ 7` acceptés.
12. Reste nul en euclidienne : la case du reste attend `0` ; vide → incomplète (pas de 0 implicite :
    écrire le reste fait partie de la réponse).
13. `148,2 ÷ 5` → `29,64` (zéro abaissé après le 2).
14. Téléphone : la potence défile dans son cadre, comme les lots 1-2.

### Erreurs (messages situés pour le prof ; l'élève voit « Opération indisponible »)

15. Division par 0 ; diviseur décimal ou de plus de 2 chiffres ; dividende de plus de 6 chiffres.
16. `quotient: entier` avec un dividende décimal ; quotient décimal qui ne s'arrête pas au millième.
17. Plus de deux termes, signes mélangés (`12 ÷ 3 + 1`).
18. `méthode:` ou `retenues:` sur une division ; `étapes:` / `quotient:` sur une autre opération ;
    valeur hors liste ; clé répétée.

**Précisé en codant (PR 3a)** — à signaler à David :

- Quotient décimal à remplir : carreaux libres à droite du dividende **jusqu'au millième** (Q4), soit
  `3 − décimales du dividende` (`785` : 3 ; `148,2` : 2, le « + 2 » du nominal 7) ; les cases du
  quotient sont autant que ces colonnes.
- Zone des étapes : `chiffres − chiffres du diviseur + 1` étapes au plus, deux rangées chacune en
  `soustractions` (`9 456 ÷ 7` : 8 rangées), une en `restes`.
- Une ligne de reste n'écrit pas ses zéros de tête (`35 − 35 = 0`, on abaisse 6 → `6`, pas `06`) ;
  un reste nul final est écrit (`0`). Avec un 0 au quotient, la ligne s'allonge du chiffre abaissé
  (`7 035 ÷ 7` : `35` sous `7`).
- `/` accepté comme signe de division, comme `:`.
- `5 ÷ 7` résolu : aucune ligne, le reste est le dividende lui-même.

## Journal

### 2026-10-25 — PR 3a (division, affichage)

Parseur (`÷ : /`, `étapes:`, `quotient:`, bornes), scène `operation-division-scene.ts`
(`buildDivisionScene`, `divisionResult`), potence à l'écran (`Operation.svelte`, snippet `potence`)
et au PDF (`table.vline`, `hline` sous chaque produit) ; division à remplir refusée par le générateur
jusqu'à la PR 3b. PDF vérifié à l'œil (9 456 ÷ 7, 785 ÷ 4, 9 876 ÷ 47 en restes, zone à remplir).

### 2026-10-25 — PR de suite (0 des dixièmes non écrit)

Questions de #1745 tranchées (recos suivies) : (1) diagnostic recalculé depuis la valeur simplifiée
au retour sur la question → accepté, rien à changer ; (2) décimale de tête vide → incomplète
(`firstReadColumn` dans `operation-answer.ts`, lecture et surlignage). Worktree
`ubumaths-wt-operations-posees-suite`, branche `fix/operations-posees-zero-apres-virgule`.

### 2026-10-25 — #1745 PR 2b (multiplication, saisie)

`operation-answer.ts` : `comma` en paramètre (défaut `gridComma`, lot 1 inchangé), `wrongComma`,
`commaFromAnswer` ; `Operation.svelte` : virgule de l'élève, produits partiels et retenues de
l'addition saisissables, flèches ↑/↓, noms neutres ; refus du générateur retiré. Revue Opus : rien
de bloquant ; corrigé : 0 implicite des unités surligné à tort (lot 1 aussi), ordre des constantes ;
deux questions posées à David (bloc « Reprendre ici »).

### 2026-10-25 — #1740 PR 2a (multiplication, affichage)

Parseur (`×`, ordre de pose, bornes 6/3), scène (`partials`, `partialCarries`), écran, PDF, refus au
générateur. Revue Opus : rien de bloquant ; zéros de tête non comptés pour l'ordre (précision Q1).

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
