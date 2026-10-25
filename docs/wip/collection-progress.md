# Chantier « collection » — bloc ubumark ` ```collection `

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 écrite._

- **État** : phase 0 rendue à David (§ 2 à § 8), **aucun code**.
- **Prochaine action** : attendre les réponses de David aux questions du § 8, puis § 8 bis (décisions) et tests rouges.
- **En attente de David** : Q1 à Q9 (§ 8).
- **Pièges en cours** : ne pas toucher au chantier « questions » (`../ubumaths-wt-questions`) ; les modèles CP-001/004/070 sont écrits par la session « questions » ; un modèle porte au plus UN point par programme (ADR 0020).
- **Worktree / branche** : `../ubumaths-wt-collection`, `feat/bloc-collection`.

---

## 1. Origine et périmètre

Issu du chantier « questions » (`docs/wip/questions-progress.md` § 3, outil 2 ; § 4 bis, décision 1 :
horloge → case « figure » → **collection** → monnaie, la monnaie **bâtie sur** la collection ; § 2,
groupe C). Méthode et code calqués sur ` ```horloge ` (#1707) et ` ```operation ` (#1716 → #1758).

Points visés (bornes : `docs/systeme/programmes/bornes/cycle2.json`) :

| Point  | Libellé (abrégé)                                       | Borne                                                                                                                                                                           |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-001 | Dénombrer des collections en les organisant            | non organisées, totalement organisées en dizaines et unités, ou partiellement groupées (3 dizaines et 15 unités) ; d'abord objets déplaçables, puis collections fixes dessinées |
| CP-070 | Comparer des collections en les organisant             | idem                                                                                                                                                                            |
| CP-004 | Représentations d'un nombre (en partie)                | matériel (barres et cubes), unités de numération (3 dizaines et 5 unités, ou 35 unités)                                                                                         |
| CP-002 | Construire des collections de cardinal donné           | idem CP-001 — **seulement si le bloc devient interactif (Q1)**                                                                                                                  |
| CP-042 | (plus tard, monnaie) Comparer des ensembles de pièces… | entiers d'euros ≤ 100 ; comparer la valeur, pas le nombre de pièces                                                                                                             |
| CP-071 | (plus tard, monnaie) Rendre la monnaie                 | entiers d'euros ≤ 100                                                                                                                                                           |

Borne générale CP : entiers de 0 à 100. Le bloc ne lit pas les bornes : le modèle tire ses valeurs.

**Hors périmètre** : les modèles de question (session « questions ») ; le chat élève (invariant 8,
liste blanche) ; les centaines (plaques, CE1) — la syntaxe les laisse venir (Q4) ; la monnaie elle-même.

## 2. Ce que voit l'enfant (affichage seul, Q1)

Quatre présentations, toutes dessinées en SVG (formes simples, pas d'emojis), une couleur d'accent :

- **Vrac** : n jetons (disques) éparpillés sans se toucher, ni en lignes ni en colonnes visibles.
- **Groupes de 10 entourés** (« paquets ») : chaque dizaine = 10 jetons en 2 rangées de 5, entourés d'un trait arrondi ; les unités à côté.
- **Barres de dix + cubes** (matériel de numération) : barre verticale de 10 cubes dont on voit les 10 séparations ; cubes isolés à droite.
- **Groupements partiels** : des barres (ou paquets) **et** plus de 9 unités isolées (3 barres + 15 cubes).

### Nominal

1. CP-001, vrac : 23 jetons éparpillés. « Combien y a-t-il de jetons ? » → case nombre.
2. CP-001, paquets : 4 paquets entourés + 7 jetons. Même question.
3. CP-004 : 3 barres + 5 cubes. « Écris le nombre » → 35 ; ou « Combien de dizaines ? » → 3.
4. CP-001, partiel : 3 barres + 15 cubes (les cubes en vrac). « Combien de cubes en tout ? » → 45.
5. CP-070 : deux collections l'une sous l'autre (téléphone) ou côte à côte (tablette, PDF), étiquetées A et B : A = 2 barres + 8 cubes, B = 3 barres + 1 cube. « Quelle collection a le plus de cubes ? » → QCM A / B / Autant.
6. CP-070, piège voulu : A = 31 jetons en vrac (grande surface), B = 4 paquets (compacts). L'œil dit A, le dénombrement dit B.
7. CP-004 inverse : « Quel dessin montre 42 ? » → QCM dont les choix sont des collections (réduites, comme les horloges dans un QCM).
8. Même instance → même dessin, à l'écran comme au PDF (aucun aléa au rendu).

### Limites

9. Collection vide (0) : un cadre vide étiqueté — utile en CP-070 (« B n'a rien »). Accepté.
10. 10 dizaines, 0 unité (100) : 10 barres côte à côte, tiennent dans 390 px.
11. Unités ≥ 10 sans dizaines (35 en vrac) : c'est le vrac.
12. Vrac de grande taille (au-delà du plafond Q3) : refusé (cf. erreurs) — un enfant ne compte pas 80 points sur un écran sans pouvoir les marquer.
13. Barres sans unités, unités sans barres : acceptés.

### Erreurs

- **Vu de l'enfant** : un bloc en erreur → cadre neutre « Collection indisponible » ; jamais le nombre dans le DOM (nom accessible « Collection d'objets », pas « 35 objets »).
- **Vu de l'enfant qui se trompe** : la correction montre la réponse attendue et le même dessin ; le modèle peut ajouter, dans le corrigé, la même collection **organisée** (second bloc en `dessin: paquets`).
- **Vu du prof** (messages situés `Ligne N : …`) : pas de quantité ; nombre non entier, négatif ou variable non résolue ; total > 100 ; vrac au-delà du plafond ; dizaines > 10 ; clé inconnue, valeur hors liste, clé répétée ; nombre de valeurs différent d'une ligne à l'autre (`;`) ; plus de 3 collections.

## 3. Syntaxe (écrite par le prof dans un modèle)

Clés en français, une par ligne, comme ` ```horloge `. Une quantité au moins (`dizaines:` ou `unités:`).

| Clé          | Valeurs                     | Défaut    | Effet                                                |
| ------------ | --------------------------- | --------- | ---------------------------------------------------- |
| `dizaines:`  | 0 à 10                      | 0         | groupes de dix dessinés                              |
| `unités:`    | 0 à 100 (plafond vrac : Q3) | 0         | objets isolés                                        |
| `dessin:`    | `barres` · `paquets`        | `barres`  | barres de cubes, ou 10 jetons entourés               |
| `unités en:` | `vrac` · `rangées`          | `vrac`    | `rangées` : lignes de 5 + 5 (lecture rapide, CP-004) |
| `légendes:`  | texte ; texte               | A ; B ; C | étiquettes des collections (plusieurs seulement)     |
| `taille:`    | `2cm` à `8cm`               | Q9        | largeur au PDF ; à l'écran, plafonnée au conteneur   |

Plusieurs collections : valeurs séparées par `;`, comme `heure:` de l'horloge (1 à 3 collections).
Avec `dessin: barres`, les unités sont des cubes ; avec `paquets`, des jetons (pas de mélange en v1, Q5).

Exemple CP-001 (partiel), avec `d = {{1..5}}`, `u = {{11..19}}`, réponse `{{eval:10*d+u}}` :

````text
Combien y a-t-il de cubes ?

```collection
dizaines: {{d}}
unités: {{u}}
```
````

Exemple CP-001 (vrac) : `n = {{12..30}}`, réponse `{{n}}` :

````text
Combien y a-t-il de jetons ?

```collection
unités: {{n}}
dessin: paquets
```
````

Exemple CP-070 (QCM « A », « B », « Autant », bon choix par `{{if:…}}`) :

````text
Quelle collection a le plus d'objets ?

```collection
dizaines: {{da}} ; {{db}}
unités: {{ua}} ; {{ub}}
dessin: paquets
unités en: vrac
```
````

Paramétrable par variables : toutes les quantités et `légendes:` ; les réglages (`dessin:`, `unités en:`)
restent écrits (rien n'interdit `{{barres|paquets}}`, le bloc ne voit que la valeur résolue).

## 4. Affichage seul ou interactif (Q1, Q2)

**Recommandation : v1 en affichage seul** — la réponse dans une case nombre ou un QCM, comme l'horloge.
CP-001, 004 (en partie) et 070 sont couverts ; la syntaxe laisse venir l'interactif sans refonte.

Coût de l'interactif (deux niveaux distincts) :

- **(a) « Toucher pour marquer »** (aide, non jugée) : chaque jeton touché se coche ; état local au
  composant, perdu au rechargement, rien d'enregistré. Coût modeste (un composant, des tests de
  rendu). Il rend le vrac de 30 à 100 comptable sur un écran — c'est le « en les organisant » de CP-001.
- **(b) « Construire »** (CP-002, jugé) : l'élève ajoute / retire barres et cubes jusqu'au nombre
  demandé ; le bloc compte pour **une case** lue comme un nombre, jugée par le juge existant — même
  patron que la saisie de ` ```operation ` (PR 1b : indexation `assignBlankIndices`, `inputs`
  descendus jusqu'au bloc, correction). Coût : une PR de la taille de 1b (~600-900 lignes, revue Opus).
- Rappel : **aucune réponse d'élève conservée** ; le verdict reste côté client (ADR 0001). Au PDF,
  l'interactif n'existe pas : le bloc « construire » imprime un cadre vide « Dessine 34 cubes »… à décider.

## 5. Rendu écran et PDF

- **Scène pure** `utils/collection-scene.ts` partagée écran / PDF (patron horloge / opération) :
  positions de chaque objet, barre, contour, étiquette, calculées une fois.
- **Déterminisme** : la disposition du vrac vient d'un générateur pseudo-aléatoire **dont la graine est
  le texte résolu du bloc** (Q6) ; tirage « sans se toucher » (distance minimale ≥ 1,5 diamètre), dans
  un cadre de rapport fixe. Mêmes nombres → même dessin, partout.
- **390 px** : barres verticales (cube ≈ 12 px, barre ≈ 120 px), 10 barres ≈ 180 px de large ;
  plusieurs collections **l'une sous l'autre** ; jetons ≥ 14 px. **Tablette** : côte à côte (CSS, la
  scène de chaque collection ne change pas). Jamais plus large que le conteneur.
- **Couleurs** : `var(--color-*)` seulement ; une couleur d'accent (`--color-primary`) pour le remplissage
  des objets, traits en `--color-foreground` ; lisible en noir et blanc.
- **PDF** (Typst) : `collection-typst.ts`, noir sur blanc ; collections côte à côte si la largeur le
  permet ; bloc en erreur → cadre neutre « Collection indisponible » (invariant 4) ; compilation réelle testée.
- **QCM** : choix en collection rendus réduits (comme `--horloge-taille`), à l'écran, dans la correction
  (`ExpectedResultView`) et dans la série figée au PDF.
- Éditeur riche (aller-retour en bloc de code), `check:ubumark`, doc `ubumark.md` : comme les blocs précédents.

## 6. Ce que la monnaie réutilisera

- La **scène** : disposer des objets sans chevauchement (vrac) ou rangés, regroupés, en 1 à 3 ensembles
  étiquetés, sur téléphone, tablette et PDF ; le tirage déterministe ; le cadre neutre.
- Le **modèle interne** : une collection = une liste d'objets typés (jeton, cube, barre aujourd'hui ;
  pièce de 1 € / 2 €, billet de 5 / 10 / 20 / 50 € demain), chacun avec sa forme et sa **valeur** —
  CP-042 compare des valeurs, pas des nombres d'objets ; la scène ne fait aucune hypothèse « 1 objet = 1 ».
- La syntaxe `;` pour plusieurs ensembles, les légendes, le rendu en choix de QCM.
- L'interactif (b) s'il est fait : « construire » une somme = CP-071 (rendre la monnaie) sans refonte.

## 7. Ce qu'il faut construire (si v1 = affichage seul)

Patron « Comment étendre » de `ubumark.md` : `types/collection.ts` → `parser/collection-parser.ts`
→ branchements `markdown-parser.ts`, `block-ranges.ts`, `block-closure.ts` → `utils/collection-scene.ts`
→ `nodes/Collection.svelte` + aiguillage → `generators/collection-typst.ts` → choix de QCM →
éditeur riche → `check:ubumark` → doc. Pas de base, pas d'API. Revue : `code-reviewer` (Sonnet).
Une PR (ou deux si > ~800 lignes : écran / PDF + QCM).

## 8. Questions à David

Voir le message de la session du 2026-10-25 (Q1 à Q9).

## Journal

- 2026-10-25 : worktree créé ; lecture de questions-progress (§ 2, 3, 4 bis), horloge, opérations
  posées, `ubumark.md` (Comment étendre), bornes CP-001/002/004/070/042/071 ; phase 0 écrite.
