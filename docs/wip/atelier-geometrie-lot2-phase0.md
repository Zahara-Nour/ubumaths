---
title: Atelier — la géométrie, lot 2 (constructions au clavier et mesures), phase 0
date: 2026-10-18
status: phase 0 du lot 2 VALIDÉE (2026-10-18) — L1-L8 tranchées (L2 en détail, les autres « je valide tes recos »)
---

# Atelier — la géométrie, lot 2 : constructions au clavier et mesures

Chapeau : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md) (G0-G7, lot 1 clos le
2026-10-18 : #1474, #1478, #1482, #1491). Journal : [atelier-geometrie-progress.md](atelier-geometrie-progress.md).
Doc système : [atelier.md](../systeme/atelier.md), [geometrie/README.md](../systeme/geometrie/README.md).

## Le but

Rendre faisable, **de bout en bout et au clavier**, le problème qui justifie la géométrie dans
l'atelier (cadrage, §« Pourquoi » du lot 1) :

> M glisse sur [AB] ; on mesure l'aire du rectangle AMNP → on la relève dans **Données** → on
> trace le nuage (AM ; aire) dans **Graphe** → on conjecture le maximum → on le démontre avec
> `f(x) = x(4 − x)`.

Et couvrir les constructions du collège et de la 2de : milieu, droites, parallèles,
perpendiculaires, cercles, intersections, longueurs, aires, angles.

Ce qui reste hors du lot 2 : la **souris** (lot 3 : barre d'outils, glisser), les
transformations, vecteurs, lieux (G7).

## Ce que le code offre déjà (relevé du 2026-10-18)

- `geometry-core/geometry/` a des **fonctions pures et exactes** (sans `Figure`) :
  `intersectLL`, `intersectLC`, `intersectCC`, `intersectLQ`, `intersectQQ`, `intersectLF`,
  `intersectFF` (`intersections.ts`), `projectOnLine`, `rotate` (`transformations.ts`), cercle
  circonscrit (`circumcircle.ts`), classification (`curve-nature.ts`, lot 1). L'arithmétique
  exacte est dans `compute/geo-arithmetic.ts`.
- L'atelier range déjà des **points** (coordonnées exactes) et des **courbes** par équation,
  projetés dans la vue Géométrie par `syncFigure`, à sens unique ; les curseurs sont partagés.
- Tout calcul qui cite un point est **refusé** aujourd'hui (P9 : « On ne calcule pas encore avec
  des points. ») : `AM`, `2A`, `A + 1`. Les écritures avec des points sont donc libres, sans rien
  casser.
- Un point n'existe qu'avec des **coordonnées** : pas de point libre sans repère avant la souris
  (lot 3). Le repère reste donc affiché au lot 2.

## Questions — toutes tranchées par David le 2026-10-18 (L1, L3-L8 : « je valide tes recos »)

### L1 — Qui calcule une construction ? (architecture)

- **(a) L'atelier**, avec les fonctions pures de `geometry-core` : `I = milieu(A, B)` a ses
  coordonnées exactes dans le modèle, comme un point tapé. La vue Géométrie reste une
  **projection** (décision figée n° 1, pont à sens unique inchangé). Une mesure (`AM`) se calcule
  dans l'atelier, donc vaut partout : console, Données, Graphe, liens, sauvegarde.
- **(b) La `Figure`** de la vue Géométrie calcule, et l'atelier relit ses valeurs : pont à double
  sens, et une mesure n'existe que si la vue est montée.

**Reco : (a).** (b) casse l'invariant 1 et rendrait le relevé (L6) dépendant d'une vue affichée.
Coût de (a) : réécrire dans l'atelier la composition des constructions (qui dépend de qui),
mais pas les calculs, qui existent.

### L2 — L'écriture d'une construction — ✅ tranchée par David (2026-10-18)

**Une seule écriture, celle du DSL de géométrie, plus cinq raccourcis de manuel.** Une ligne du
DSL se tape telle quelle dans l'atelier (`d = droite(A, B)`, `I = milieu(A, B)`,
`c = cercle(O, passant=A)`, `E = intersection(d, c, 1)`, `M = point_sur(s, 0.3)`…) : mêmes mots,
même ordre des arguments, arguments nommés compris. Aucun mot inventé.

**(a) Les cinq raccourcis** (oui) — chacun ne fait que traduire une forme du DSL :

| Raccourci           | Équivaut à             |
| ------------------- | ---------------------- |
| `A = (1 ; 2)`       | `A = point(1, 2)`      |
| `d = (AB)`          | `d = droite(A, B)`     |
| `s = [AB]`          | `s = segment(A, B)`    |
| `r = [AB)`          | `r = demidroite(A, B)` |
| `AM` dans un calcul | `distance(A, M)`       |

**Nommer** : par affectation, comme le DSL et comme le reste de l'atelier (`d = (AB)`, puis `d`
se réutilise). Une construction peut aussi s'écrire **sans nom, dans une autre**, comme le DSL le
permet déjà (`pente(segment(A, B))`) — raccourcis compris : `intersection((AB), c, 1)`. `=` pour
une construction, `:` pour une équation (lot 1, G5).

**Tapé seul, sans nom** (David, 2026-10-18) : c'est un **calcul**, comme `x² = 4` au lot 1 —
rien n'est créé ni dessiné, la console répond ce qu'elle sait : `(AB)` → `(AB) : y = 2x + 1`
(équation réduite), `[AB]` → `[AB] : segment de longueur √5`, `AM` → `√5`, `milieu(A, B)` →
`(2 ; 1)`. Pour garder : le nommer (`d = (AB)`) ou « Garder » sur la ligne (D5, nom automatique).

**(b) Quatre formes ajoutées au DSL lui-même** (oui), pour que tout ce qui se tape dans l'atelier
marche aussi dans une figure de cours ; rien de ce qui existe ne change de sens :

| Ajout                                                   | Pourquoi                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `cercle(O, 3)` (rayon en 2ᵉ argument, nombre ou valeur) | le DSL refuse aujourd'hui deux arguments positionnels (`builtins.ts`, `handleCercle`) |
| `parallele(P, d)`, `perpendiculaire(P, d)`              | « par P, parallèle à la droite d » ; le DSL ne connaît que `parallele(P, A, B)`       |
| `angle(A, B, C)`, en degrés                             | `mesure(A, B, C)` rend des radians ; `mesure` garde son sens                          |

`cercle(O, A)` avec un **point** en second reste refusé, avec l'aide du DSL (« écris
`cercle(O, passant=A)` ») : centre O passant par A, ou diamètre [OA] ? L'élève le dit.

**Virgule et point-virgule** (propre à l'atelier, à cause de sa virgule décimale ; une figure de
cours écrit `1.5` et n'a pas ce problème) : `;` sépare toujours ; `,` sépare aussi quand rien ne
peut être un décimal (`milieu(A, B)`, `point(1, 2)`) ; une ambiguïté (`point(1,5, 2)`) est refusée
avec l'aide « Sépare avec « ; » », comme pour `max` aujourd'hui.

**(c) Les accents** (oui) : l'atelier accepte les noms de construction avec et sans accent
(`parallèle` / `parallele`, `périmètre` / `perimetre`, `médiatrice` / `mediatrice`). Le DSL reste
sans accent.

**À vérifier dans le code avant de le promettre** : lire une ligne de construction avec le
lecteur même du DSL (`dsl/parser.ts`), après la traduction de la virgule décimale — garantie de lire
exactement comme lui. Le calcul reste celui de L1.

**`d = (AB)` tapé avant A et B** (David, 2026-10-18, option a, après la revue de la PR 1) : d
est **en attente** de ce qui manque ; quand A et B existent, le **type** tranche — deux points :
la droite (AB) ; deux valeurs : le produit ; un de chaque : refus avec la raison. Comme `[AB]`
(L8).

### L3 — Le catalogue du lot 2

Les mots du DSL pris en charge au lot 2 (et leurs raccourcis, L2) :

- **points** : `point(x, y)`, `milieu(A, B)`, `projection(A, axe=d)`, `intersection(…, k)`,
  `point_sur(…)` (L5) ;
- **lignes** : `droite(A, B)`, `segment(A, B)`, `demidroite(A, B)`, `parallele(P, d)` et
  `parallele(P, A, B)`, `perpendiculaire(P, d)` et `perpendiculaire(P, A, B)` ;
- **cercles** : `cercle(O, rayon=r)`, `cercle(O, r)` (ajout), `cercle(O, passant=A)`,
  `cercle(A, B, C)` ;
- **mesures** : celles de L4.

Un autre mot du DSL (bissectrice, médiatrice, polygones, transformations…) tapé dans l'atelier est
**refusé avec sa raison** (« médiatrice n'est pas encore dans l'atelier »), jamais lu de travers ;
ces mots arrivent sur demande, un par un, comme G7 le dit des autres familles.

**Reco : ce catalogue.**

### L4 — Les mesures et l'écriture `AM`

Une mesure est une **valeur** calculée (G1), sans curseur, citable partout. Mots du DSL (L2) :

| Écrit                        | Vaut                                               |
| ---------------------------- | -------------------------------------------------- |
| `AM` (raccourci, L2)         | la longueur AM, = `distance(A, M)`                 |
| `distance(A, d)`             | la distance de A à la droite d (forme du DSL)      |
| `aire(A, M, N, P)`           | l'aire du polygone AMNP (non croisé : sinon refus) |
| `perimetre(A, B, C)`         | le périmètre                                       |
| `angle(A, B, C)` (ajout, L2) | l'angle ABC en degrés, entre 0 et 180              |

- `AM` = longueur **seulement** quand A et M sont deux points de l'atelier ; sinon la lecture ne
  change pas (`ab` reste a·b). Un élève écrit `S = AM × MN` comme sur sa copie.
- Valeurs **exactes** d'abord (`AB = √5`).
- Une mesure se nomme comme une valeur (`S = aire(A, M, N, P)`) ; `AM` n'est pas un nom d'objet.

**À valider : ces mesures.**

### L5 — Point sur un objet, et intersections à plusieurs solutions

- `M = point_sur(s, 0.3)` (DSL ; `point_sur(s ; 0,3)` dans l'atelier) : M sur s, à la **position** 0,3 (0 = A, 1 = B pour un segment ; pour
  une droite, une abscisse le long de (AB) ; pour un cercle, un angle en degrés). La position est
  le second argument : un **nombre** (la carte de M a alors un curseur de position, comme une
  valeur) ou le **nom d'une valeur** (M suit son curseur : `t = 0,3` puis `M = point_sur(s ; t)`).
  Au lot 3, glisser M changera ce nombre.
- `intersection(d, c)` avec **deux** solutions : refus qui dit lesquelles écrire
  (« d et c se coupent en deux points : écris intersection(d, c, 1) ou intersection(d, c, 2). »).
  Les solutions sont numérotées comme le fait déjà `geometry-core` (`k`), pour qu'un point ne
  « saute » pas d'une branche à l'autre quand un curseur bouge. Aucune solution → le point est
  en attente, avec la raison (« d et c ne se coupent pas »), et réapparaît si un curseur les fait
  se couper.

**Reco : ces deux règles.**

### L6 — Le relevé : fermer la boucle vers Données et Graphe

Sans lui, le problème de l'aire s'arrête à la figure. Proposition : une commande

```
.relever AM ; S quand t va de 0 à 1 pas 0,05
```

qui fait varier la valeur `t` (ou la position d'un `point_sur`), calcule les deux expressions à
chaque pas, et crée **deux listes** (colonnes de Données) — que l'élève trace en nuage dans
Graphe comme aujourd'hui. Plafond : 200 pas (D8). L'atelier ne valide rien (décision 2) : il
relève, l'élève conjecture.

**Reco : oui**, mot-clé `.relever`, syntaxe à mots-clés comme les autres commandes
(`atelier-syntaxe.md`).

### L7 — Les cartes des constructions

Une carte dit ce qu'est l'objet et d'où il vient : `I = milieu(A, B)` puis `I(2 ; 1)` ;
`d = (AB)` puis « droite » ; `S = aire(A, M, N, P)` puis sa valeur. ⚠️ Le lot 4 de la refonte
de l'interface (session « modifs-fixes ») redessine les cartes des autres objets : **la mise en
page lui revient** ; le lot 2 ne fournit que le contenu (nature, valeur, construction).

**Reco : ce contenu, mise en page par le lot 4 de la refonte.**

### L8 — Dépendances et suppression

`I = milieu(A, B)` dépend de A et B : supprimer A met I **en attente** (D9) et la suppression
en cascade le propose, comme pour une fonction. Redéfinir A recalcule I. Une construction
circulaire (`A = milieu(A, B)`) est refusée.

**Reco : les règles existantes, étendues.**

## Découpage proposé (après validation)

1. **Modèle des constructions** (L1, L2, L3, L8) : lecture, calcul exact par les fonctions pures,
   dépendances, cartes (contenu), projection dans la vue Géométrie.
2. **Mesures** (L4) : `AM`, `aire`, `périmètre`, `angle`, dans Calcul et partout.
3. **`point_sur` et intersections** (L5).
4. **`.relever`** (L6) : le problème de l'aire de bout en bout, testé tel quel.

Chaque PR : tests d'abord, revue, vérification à l'écran, doc système.
