# Chantier « boite-a-moustaches » — bloc ubumark de la boîte à moustaches

## Reprendre ici

_Mis à jour le 2026-11-01, palier 1 écrit._

- **État** : palier 1 (affichage) écrit sur la branche (§ 9), vu dans Chrome (sombre, clair) ; revue en cours.
- **Prochaine action** : corriger la revue, PR, merge ; puis palier 2 (construire, § 5).
- **En attente de David** : rien.
- **Pièges en cours** : quartiles = ceux du programme (`src/lib/statistics/describe.ts`), jamais ceux des
  calculatrices ; ne pas écrire de second calcul.
- **Worktree / branche** : `../ubumaths-wt-boite-a-moustaches`, `feat/boite-a-moustaches`.

---

## 1. Origine et périmètre

Issu du chantier `questions-3` (classe C, lot 8 ; décision de David du 2026-10-28 : chantier à part, après le
lot de statistiques en texte, affichage puis construire). Points :

| Point | Libellé                                                                           | Palier qui le débloque |
| ----- | --------------------------------------------------------------------------------- | ---------------------- |
| 3-062 | Lire une boîte à moustaches (médiane, quartiles, étendue).                        | 1 (affichage)          |
| 3-030 | Construire la boîte à moustaches d'une série statistique.                         | 2 (construire)         |
| 2de   | « Comparer des distributions à l'aide de boîtes à moustaches » (programme de 2de) | 1                      |

Borne commune (exemples 2026, p. 37) : **minimum, Q1, médiane, Q3, maximum, avec échelle**. Exemple p. 38 :
deux boîtes **horizontales** l'une sous l'autre (« classe Nautic », « classe Neptune »), un seul axe en bas
(25 à 60, de 5 en 5, titre « temps (en s) »), papier millimétré, moustaches terminées par un petit trait.

**Relevé du 2026-11-01** : rien n'existe — aucun genre de ` ```stat-chart ` ne la dessine,
`statistiques.md` la dit hors périmètre (chantier `outils-statistiques`). Le **calcul** existe :
`describe.ts` rend `q1`, `median`, `q3`, min, max (quartiles du programme : Q1 = plus petite valeur dont
la fréquence cumulée atteint 25 %, ce que les exemples 2026 font « en utilisant les effectifs cumulés
croissants »).

**Hors périmètre** : boîte verticale ; moustaches aux déciles (D1, D9) ou valeurs extrêmes isolées ;
séries en classes ; les modèles de questions (lot 8 de `questions-3`) ; écart interquartile (2de, déjà
dans `describe.ts`, rien à dessiner).

## 2. Où le mettre

Un **nouveau genre de `stat-chart`** (décision Q17 du 2026-10-01 : un seul nœud pour tous les diagrammes
statistiques ; parseur, rendu, listes, Typst, éditeur riche câblés une fois). Le mot tapé par l'auteur :
` ```boite-a-moustaches ` (sans accent, comme ` ```frequences-cumulees `).

## 3. Syntaxe (proposée)

Une ligne par boîte : son nom, puis les **cinq valeurs dans l'ordre** minimum ; Q1 ; médiane ; Q3 ; maximum.

````text
```boite-a-moustaches
axe: 25 à 60, de 5 en 5
titre: temps (en s)
Nautic = 28 ; 30 ; 37 ; 45 ; 58
Neptune = 36 ; 37 ; 39 ; 42 ; 46
```
````

Ou une seule boîte calculée à partir d'une série brute (le calcul de `describe.ts`, jamais un autre) :

````text
```boite-a-moustaches
données: 3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21
```
````

Options :

- `axe: a à b, de p en p` — facultatif à l'affichage (sinon calculé, pas « rond ») ; l'axe ne part pas
  forcément de 0. Obligatoire pour construire (§ 5).
- `titre:` — titre de l'axe (« temps (en s) »).
- `valeurs: oui` — écrit les cinq valeurs au-dessus de la boîte (non par défaut : on la **lit**).
- Une boîte sans nom (`= 28 ; 30 ; …` seul, ou `données:`) n'a pas d'étiquette.
- Les `{{variables}}` du modèle sont remplacées avant ; `?` (énoncé d'évaluation masqué) comme ailleurs.

**Refus situés** (le bloc reste affiché avec son message, décision Q48) : pas exactement cinq valeurs ;
valeurs dans le désordre (min ⩽ Q1 ⩽ médiane ⩽ Q3 ⩽ max) ; une valeur hors de l'axe ; deux boîtes du même
nom ; `données:` avec des lignes de boîtes ; plus de 4 boîtes ; plus de 40 graduations ; série de plus de
500 valeurs.

## 4. Rendu (palier 1)

- **Écran** : boîtes horizontales empilées, nom au-dessus à gauche (comme l'exemple p. 38), un seul axe en
  bas gradué, quadrillage léger aux graduations ; moustaches terminées par un petit trait vertical ;
  médiane en trait plus épais. Une couleur d'accent pour toutes les boîtes (sobriété), pas une par boîte.
- **Description accessible** : « Boîte Nautic : minimum 28, premier quartile 30, médiane 37, troisième
  quartile 45, maximum 58. » (comme les barres affichées, qui disent leurs effectifs).
- **Liste, case choix** : comme les autres diagrammes statistiques (choix entre plusieurs boîtes : « quelle
  boîte représente cette série ? »).
- **PDF** (Typst) : le même dessin.
- **Éditeur riche** : aller-retour du texte ; fiche `/aide-ecriture/blocs/boite-a-moustaches`
  (`block-catalog`) ; page de démo.

## 5. Construire (palier 2)

````text
```boite-a-moustaches
axe: 0 à 20, de 1 en 1
placer: Notes
Notes = 4 ; 8 ; 11 ; 14 ; 19
```
````

- `placer: Notes` ou `placer: toutes` (le mot des barres à construire). L'élève voit l'axe, le nom de la
  boîte, rien d'autre ; les valeurs écrites dans le bloc sont l'attendu, que seule la correction dessine.
  Avec `données:`, l'attendu est calculé : l'élève lit la série dans l'énoncé, calcule, construit.
- **Geste** : cinq boutons « Min », « Q1 », « Médiane », « Q3 », « Max » ; l'élève en choisit un, puis
  touche l'axe (ou glisse) pour poser son trait ; aimant à la graduation (`axe:` impose des valeurs sur les
  graduations, sinon refus) ; flèches au clavier, `role="slider"`. La boîte se dessine dès que Q1 et Q3
  sont posés, les moustaches dès que min et max le sont.
- **Jugement** : juste si les cinq traits sont à leur place. Faux : une phrase par trait faux (« Ta médiane
  est à 12. », « Tu n'as pas placé le maximum. ») et la boîte juste en correction. Ordre non imposé pendant
  le geste ; des traits dans le désordre sont simplement faux.
- **Refus** : `placer:` sans `axe:` (calculé, il trahirait min et max), avec `valeurs: oui`, nom absent ou
  ambigu ; valeur attendue hors graduation.
- **PDF** : axe seul, l'élève dessine. **Copie corrigée** : `BuildAnswer` comme les barres.

## 6. Paliers

1. **Affichage** (débloque 3-062 et la 2de) — une PR, page de démo.
2. **Construire** (débloque 3-030) — une PR, page de démo.
3. Puis lot 8 de `questions-3` (phase 0 dans son journal), en brouillon jusqu'au `deploy:prod` du bloc.

## 7. Questions à David

1. **Genre de `stat-chart`** nommé ` ```boite-a-moustaches ` (recommandé) — ou un nom plus court
   (` ```boite `) ?
2. **Données** : les deux formes (cinq valeurs par boîte **et** `données:` pour une boîte calculée) —
   recommandé ; ou cinq valeurs seulement (l'auteur calcule) ?
3. **Valeurs écrites** sur la boîte : non par défaut, `valeurs: oui` pour les montrer (recommandé) ?
4. **Quadrillage** léger aux graduations, comme le papier millimétré de l'exemple (recommandé), ou fond
   blanc ?
5. **Geste construire** : cinq boutons + toucher l'axe, ordre libre, traits dans le désordre jugés faux
   (recommandé) ; ou traits qui ne peuvent pas se croiser ?
6. **Moustaches** : toujours jusqu'au minimum et au maximum (programme de 3e) — les déciles (certains manuels
   de 2de) hors périmètre (recommandé) ?

## 8. Décisions (David, 2026-11-01, « je valide » les six recommandations)

1. Nom : ` ```boite-a-moustaches `, nouveau genre de `stat-chart`.
2. Deux formes : cinq valeurs par boîte, **et** `données:` (une boîte calculée par `describe.ts`).
3. Valeurs non écrites par défaut ; `valeurs: oui` les écrit.
4. Quadrillage léger aux graduations.
5. Construire : ordre libre, traits dans le désordre jugés faux (la correction le dit).
6. Moustaches au minimum et au maximum ; déciles hors périmètre (option `moustaches: déciles` possible plus
   tard).

## 9. Palier 1 : écrit (2026-11-01)

- Genre `boite-a-moustaches` de `stat-chart` : grammaire à part `parseBoxPlotContent`
  (`stat-chart-parser.ts`), scène `utils/boxplot-scene.ts`, écran `BoxPlotChart.svelte` (pris par
  `StatChart.svelte`), Typst (`stat-chart-typst.ts`, compilé avec le compilateur de prod), description
  accessible (`stat-chart-text.ts`). Liste, case choix, éditeur riche : génériques (aller-retour testé).
- Fiche à part `/aide-ecriture/blocs/boite-a-moustaches` (`boxPlotEntry`), qui sert de page de démo.
- Tests : `boite-a-moustaches.test.ts` 36 (32 rouges avant), composant 7 (7 rouges avant) ; suites
  stat-chart + catalogue 1 079 verts. `check:incremental` 0, `types:cliquet` 0, `lint:fast`, garde de doc OK.
- **Écarts au § 3-4, décidés en écrivant** : valeurs écrites **sous** la boîte (le nom est au-dessus) ; deux
  valeurs trop proches passent sur une rangée plus bas ; axe calculé « rond » (`scatterAxis` du nuage) ;
  `description:` et `taille:` acceptées, `couleur:` refusée ; deux boîtes sans nom refusées ; noms en double
  comparés sans la casse ; négatifs et virgule permis, fractions seulement dans `données:` ; `?` non géré
  (palier 2).
- Vu dans Chrome (prof local, port 5177) : les trois exemples justes, refus situés lisibles, thèmes sombre et
  clair. Téléphone non vu (la fenêtre ne se réduit pas) : à la vérification manuelle.
