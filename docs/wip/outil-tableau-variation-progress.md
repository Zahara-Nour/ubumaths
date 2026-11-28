---
title: Chantier outil-tableau-variation — outils 63 puis 59
date: 2026-11-28
status: outil 63 livré (#3286), outil 59 en phase 0
---

# Chantier `outil-tableau-variation`

## Reprendre ici

_Mis à jour le 2026-11-28, phase 0 de l'outil 59 écrite._

- **État** : outil 63 livré (#3286) ; outil 59 en phase 0 (§ Outil 59) · **Prochaine action** :
  tests rouges puis code, après le go de David · **En attente de David** : go sur les comportements
  C1 à C6 · **Pièges en cours** : `work-figure-editor.ts:36` (décalage possible, hors 59, non
  vérifié) · **Worktree / branche** : `../ubumaths-wt-outil-tableau-variation-59`,
  `feat/outil-tableau-variation-59`

Lot pris par `pnpm outils lancer` le 2026-11-28 ([outils-lots.md](outils-lots.md)) : 63, puis 59.

## Outil 59 — flèche cachée à côté d'une double barre

_Phase 0 écrite le 2026-11-28._

**Constat** (essai du parseur sur la branche) : `-inf,2: ?flèche` est refusé dès qu'un bout de la
flèche est la double barre, que les limites soient écrites (`2: ||, -inf, bottom, +inf, top`),
cachées (`||, ?-inf, bottom, ?+inf, top`) ou absentes (`||, , bottom, , top`, la forme de 1re).
Cause : `heightOf` (`variation-table-parser.ts:968`) rend « pas de hauteur » pour toute marque, alors
que le tableau affiché lit déjà le bon côté (`VariationTable.svelte`, `getArrowDirection` : limite
de gauche en arrivant sur la barre, limite de droite en repartant).

**Comportements** (exemple : homographique décroissante, valeur interdite 2) :

- **C1 nominal, 1re, sans limites** : `-inf: , top` · `2: ||, , bottom, , top` · `+inf: , bottom`,
  avec `-inf,2: ?flèche` et `2,+inf: ?flèche` → deux cases ↗/↘ ; réponses ↘ et ↘. Plus de refus.
- **C2 nominal, Tle, limites cachées** : `2: ||, ?-inf, bottom, ?+inf, top` + flèches cachées → quatre
  cases dans l'ordre de lecture (flèche de gauche, limite de gauche, limite de droite, flèche de
  droite, comme aujourd'hui pour les valeurs) ; la case de la limite qui touche une flèche cachée est
  dessinée **au milieu** (sa hauteur dirait la flèche).
- **C3 nominal, limites écrites** : `2: ||, -inf, bottom, +inf, top` + flèche cachée → accepté ; la
  limite qui touche la flèche cachée passe au milieu, comme une valeur aujourd'hui (le « −∞ » se lit
  encore : c'est le choix de l'auteur, comme pour une valeur écrite).
- **C4 limite, un seul côté** : `2: ||, left, -inf, bottom` → flèche cachée à gauche acceptée ; à
  droite (rien de ce côté, aucune flèche dessinée) → refus, message inchangé.
- **C5 limite, côtés indépendants** : cacher seulement la flèche de gauche ne touche pas la limite de
  droite ni la flèche de droite (dessinées comme avant).
- **C6 erreur** : marque `|h|` (zone interdite) ou `d` ; limite à la même hauteur des deux bouts
  (`-inf: 1, top` puis `||, 3, top, …`) → refus, message inchangé.

Hors outil : la correction montre le vrai tableau (inchangé). Ensuite, à comparer (David,
2026-11-24) : F7 b de Tle (74d73d4e, choix de quatre tableaux) et N1 de 1re (choix des variations) ;
c'est le travail de leurs chantiers, pas de celui-ci.

## Outil 63 — case choix et tableau à compléter dans la même variation

### Reproduction (2026-11-28)

Le vrai modèle N1 V0 de `idees-1re-variations` (homographique), tableau de signes à `?` remis
dans l'énoncé avant le choix, `blanks` = [numérateur, cellule vide, cellule vide, choix] :
`pnpm question:specs` → « Variation 1, case 3 (bloc choix) : aucune bonne réponse », 9 specs
rouges, tous les tirages de V0 et V1 en échec.

Formes qui **passent** : `blanks` qui omet les cellules du tableau ; tableau sans variables.

### Cause

`choiceCaseErrors` (`src/lib/questions/validators/choice-answer-count.ts`), appelé par
`validateTemplate` avant tout tirage, numérote les cases sur l'énoncé **non résolu**. Un tableau
dont le domaine porte `{{al}}` ne s'y lit pas : il compte pour **une** case au lieu de deux. Le
choix passe du rang 3 au rang 2 et lit la réponse d'une cellule (vide) → « aucune bonne réponse ».
Même fragilité dans l'éditeur (`withBlockCases` de `choice-case-editor.ts`) : `countsLikeResolved`
remplace les variables par `1`, le tableau reste illisible des deux côtés, les comptes
« concordent » à tort.

### Phase 0 (validée par David le 2026-11-28, « oui »)

- Nominal : numérateur + tableau de signes à `?` à variables + choix, `blanks` complet : le modèle
  s'enregistre et se tire ; « décroissante » juste, « croissante » faux.
- Limite : tableau à variables → les cases choix ne sont plus contrôlées à l'enregistrement, mais
  à chaque tirage (énoncé résolu) ; une réponse « 5 » pour deux choix reste refusée.
- Erreur : un choix sans bonne réponse garde « aucune bonne réponse », au bon numéro de case.
- Éditeur : pas de réalignement des cases avec un tel tableau.

### Correctif

`variationCasesUnresolved` (`assign-blank-indices.ts`) : un tableau à compléter qui porte `{{`
ou `<<expr:`. `choiceCaseErrors` saute alors le contrôle statique ; `countsLikeResolved`
(`choice-case-editor.ts`) rend `false`. Tests : `generation-tableau-signes.test.ts` (4, rouges
avant). Vrai modèle N1 V0/V1 (tableau remis dans l'énoncé, copie du script dans le scratchpad) :
`question:specs` 22/22, 500 tirages sur 500. Doc : `docs/systeme/questions.md`.

### Revue appliquée (2026-11-28)

- `choice-answer-count.ts` : avec un tableau à variables, seule la lecture de la bonne réponse
  est sautée ; un bloc choix mal écrit reste signalé, « Variation 1, case choix : … » (sans
  numéro, le rang n'est pas sûr).
- `figure-name-check.ts` : même garde, seules les cases d'avant le premier tableau sont lues
  (une case texte après le tableau était lue comme case maths).
- Tests : `generation-tableau-signes.test.ts` (bloc mal écrit) et `capital-pairs.test.ts`
  (nom de figure), tous deux rouges sans le correctif. Constat : un tableau dont seul le
  domaine porte `{{al}}` se lit sur l'énoncé brut ; ce sont les signes `?{{if:…}}` qui le
  rendent illisible.
