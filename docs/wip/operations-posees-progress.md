# Chantier « operations-posees » — opérations posées en colonnes

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0._

- **État** : PR 1a (bloc ```operation d'affichage : parseur, scène, écran, PDF, éditeur riche, `check:ubumark`) ouverte.
- **Prochaine action** : CI + revue de la PR 1a, merge ; puis phase de conception de la PR 1b (saisie + juge), à présenter à David avant de coder.
- **En attente de David** : rien.
- **Pièges en cours** : `resolveText` prend un tableau `{ name, value }` (pas un objet) ; `pnpm format` avec une variable de liste ne découpe pas sous zsh → `xargs prettier`.
- **Worktree / branche** : `../ubumaths-wt-operations-posees`, `feat/operations-posees`.

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
   travers les zéros (`302 − 7` : 3 → 2, 0 → 9, 2 → 12).
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

## Journal

- 2026-10-25 : worktree créé, phase 0 rédigée.
- 2026-10-25 : décisions de David (§ 7 bis). PR 1a : `types/operation.ts`, `parser/operation-parser.ts`,
  `utils/operation-scene.ts` (calcul chiffre par chiffre en `BigInt`, retenues d'addition,
  compensation, cassage), `Operation.svelte` (grille HTML), `operation-typst.ts` (`table` native),
  branchements (premier niveau, listes, éditeur riche, `check:ubumark`, cadres de réponse).
  Tests : parseur 27, scène 28, Typst 6 + compilation réelle, composant 7 (navigateur), éditeur 4.
  Captures écran clair / sombre (360 px) et PDF regardées.
