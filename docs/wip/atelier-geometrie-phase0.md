---
title: Atelier — la géométrie (v2, phase 0)
date: 2026-10-18
status: phase 0 du lot 1 VALIDÉE (2026-10-18) ; G0-G7, comportements du lot 1 et Q1-Q5 décidés
---

# Atelier — la géométrie (v2)

Chapeau : [atelier-progress.md](atelier-progress.md). Cadrage : [atelier-recherche-eleve.md](../archive/wip/atelier-recherche-eleve.md)
(§6 la vue Figure, §8 la géométrie au collège, §9 décisions figées, §10 la v2). Doc système :
[atelier.md](../systeme/atelier.md). Moteur : [geometrie/README.md](../systeme/geometrie/README.md),
[dsl-builtins.md](../systeme/geometrie/dsl-builtins.md).

## Pourquoi

Le cadrage justifie l'atelier par le **changement de registre** : passer du numérique au graphique,
à l'algébrique, au géométrique, sans perdre l'objet. La géométrie apporte le cas le plus fort :

> M glisse sur [AB] ; on mesure l'aire du rectangle AMNP → on la relève dans **Données** → on trace
> le nuage (AM ; aire) dans **Graphe** → on conjecture le maximum → on le démontre dans **Calcul**
> avec `f(x) = x(4 − x)`.

Au collège, la figure est le registre **principal** : sans elle, l'atelier reste un outil de lycée.
En 2de, la géométrie repérée (droites `y = mx + p`, cercles, intersections) y trouve sa place.

**Ce qui ne change pas** : décision figée n° 3, **on ne fusionne pas le grapheur et
`geometry-core`** (le grapheur écrase un axe, la figure garde le cercle rond). Deux vues, deux
moteurs, un seul état : celui de l'atelier (décision n° 1).

## Décisions de David (2026-10-18, « ok pour tes recos »)

| #   | Décision                                                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0  | **La forme écrite donne le type, le type donne les actions.** `f(x) = 3x − 2` est une **fonction** (dériver, variations, tableau ; vue Graphe). `d : y = 3x − 2`, `C : x² + y² − 1 = 0`, `v : x = 2` sont des **courbes** (équations explicites ou implicites ; vue Figure). Une courbe ne va jamais dans Graphe. |
| G1  | **Les objets géométriques sont des objets de l'atelier** (carte, nom, URL), pas un état propre à la Figure. Deux types nouveaux seulement : **point** et **courbe**. Les **mesures** (`AM = distance(A, M)`, lot 2) sont des **valeurs** calculées, sans curseur : la seule exception à D3, à écrire.             |
| G2  | **Un geste qui crée écrit une ligne dans Calcul** (comme une action de carte) ; **un déplacement n'en écrit pas** (comme un curseur glissé) : seule la position finale entre dans la définition.                                                                                                                  |
| G3  | **Un point s'écrit `A = (1 ; 2)`** : les parenthèses le distinguent d'une liste (`L = 1 ; 2`). `A(1 ; 2)` (notation des manuels) n'est pas acceptée au lot 1.                                                                                                                                                     |
| G4  | **Le repère est un réglage de la vue Figure**, affiché par défaut dès qu'un objet de la figure a des coordonnées ou une équation, masqué pour une construction pure. Pas de sélecteur de niveau.                                                                                                                  |
| G5  | **Noms** : un seul espace de noms (D1), aucune convention de casse imposée. Une courbe se nomme avec « : » (`d : y = 3x − 2`). Affichage tel que tapé au lot 1 (pas de `(d)` ni de `𝒞` automatiques). **`y` devient réservé**, comme `x`, avec migration de l'état rangé.                                         |
| G6  | **Lots** : (1) la vue Figure, points par coordonnées, courbes par équations, curseurs partagés passés comme **vrais paramètres** à la Figure et au grapheur, 𝒞f dans la Figure sur demande — au clavier ; (2) les constructions au clavier et les mesures ; (3) la barre d'outils à la souris et le glisser.      |
| G7  | Vecteurs, transformations, lieux, angles : **hors v2**, ajoutés un par un sur demande.                                                                                                                                                                                                                            |

## Ce que l'analyse a mesuré (2026-10-18)

Sonde `runInput` sur un atelier neuf (le chemin de la vue Calcul), avant toute ligne de code :

| Saisie           | Aujourd'hui                                                                       | Conséquence pour la v2                                                                                            |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `y = 3x - 2`     | **crée une fonction nommée `y`**, tracée dans Graphe                              | réserver `y` (G5) change un comportement en production → **Q1, Q2**                                               |
| `y = 2`          | crée une valeur `y`, avec curseur                                                 | idem : un atelier rangé peut contenir une valeur `y` → **Q2**                                                     |
| `x = 2`          | refus : « « x » est réservé… »                                                    | la droite verticale `v : x = 2` ne prend rien à personne                                                          |
| `x^2 + y^2 = 1`  | calcul, répond **`false`**                                                        | voir « Constaté hors chantier »                                                                                   |
| `x^2 = 4`        | calcul, répond **`false`**                                                        | idem ; et confirme qu'une équation sans nom doit rester un calcul (G0)                                            |
| `d : y = 3x - 2` | calcul, répond `false` — **`:` est la division** (`6 : 3` → `2`)                  | lu aujourd'hui comme `d / y = 3x − 2`, une comparaison sans valeur : reprendre cette forme ne retire rien d'utile |
| `A = (1 ; 2)`    | refus : « Les couples (a ; b) ne sont pas encore pris en charge dans l'atelier. » | la porte existe (`decimal-comma.ts`) : le refus devient la lecture d'un point                                     |
| `L = 1 ; 2`      | liste `[1, 2]`                                                                    | inchangé                                                                                                          |
| `A(1 ; 2)`       | calcul, répond « Il manque « ) » »                                                | message trompeur, hors G3 ; à remplacer par l'aide « Écris A = (1 ; 2) » (comportement P5)                        |

Côté `geometry-core` (lu dans le code) :

- `courbe("…")` reconnaît déjà droite, conique ou courbe implicite d'après l'équation (marching
  squares) ; `courbe("x^2 - 1")` est `y = f(x)`.
- `Figure.moveSlider(id, valeur)` existe (`graph/figure.ts`) et ne recalcule que les descendants
  (`markDirty`) : un curseur de l'atelier peut piloter un curseur caché de la figure sans la
  reconstruire.
- `GeometryCanvas` **modifie la `Figure` lui-même** pendant un glisser (`movePoint`,
  `movePointOnCurve`…) et n'expose aucun rappel de déplacement : le retour figure → atelier (lot 3)
  demandera d'en ajouter un.
- Le grapheur reçoit aujourd'hui l'expression **entièrement substituée** (`plot-sync.ts`,
  `wantedFor`) : `a·x` lui arrive en `2x`, ses `parameters` sont vides. Le commentaire annonce déjà
  qu'il faudra en faire de vrais paramètres (D3).

## Le modèle proposé (lot 1)

- **`PointObject`** : `kind: 'point'`, `definition` = le couple tel qu'écrit (`(a ; 2a)`), coordonnées
  calculées par l'atelier (exactes d'abord, comme une valeur).
- **`CurveObject`** : `kind: 'curve'`, `definition` = l'équation telle qu'écrite (`y = 3x - 2`),
  sans le nom. Sa **nature** (droite, cercle, conique, courbe) se lit de la classification de
  `courbe()`, jamais d'une sortie texte reparsée (invariant 10).
- **`FunctionObject.inFigure`** (booléen, comme `plotted`) : 𝒞f montrée dans la Figure.
- **Pont `syncFigure`**, à sens unique au lot 1, idempotent (empreinte), sur le modèle de
  `syncPlots` : l'atelier pousse points, courbes, 𝒞f et curseurs ; une valeur citée devient un
  curseur **caché** de la figure, réglé par `moveSlider`. Rien ne remonte au lot 1.
- **Grapheur** : les valeurs citées deviennent de vrais paramètres (fin de la substitution), réglés
  de la même façon. Les deux vues lisent le même `a`, propriété de l'atelier.

## Lot 1 — comportements proposés

N = nominal, L = limite, E = erreur. Chaque ligne deviendra au moins un test, qui doit échouer
avant l'implémentation.

### 1. Écrire une courbe

| #     | Saisie (Calcul ou « + Objet »)            | Résultat attendu                                                                                                    |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| C1 N  | `d : y = 3x - 2`                          | courbe `d`, nature « droite », visible dans la Figure ; une ligne dans Calcul ; une carte « d : y = 3x − 2 »        |
| C2 N  | `C : x^2 + y^2 - 1 = 0`                   | courbe `C`, nature « cercle » ; `C : x^2 + y^2 = 1` donne la même courbe                                            |
| C3 N  | `v : x = 2`                               | droite verticale                                                                                                    |
| C4 N  | `C : x^2 + y^2 = a^2`, `a` absent         | courbe **en attente** de `a`, avec l'offre de curseur (D9) ; `a` créé → la courbe apparaît                          |
| C5 N  | `T : y = f'(2)(x - 2) + f(2)`             | la courbe cite `f` : elle suit `f` quand on la modifie                                                              |
| C6 L  | `C : x^2 + y^2 = -1`                      | courbe acceptée, **vide** : la carte dit « Aucun point ne vérifie cette équation. » (on ne valide pas, on constate) |
| C7 L  | `d : 2y = 6x - 4`                         | acceptée telle qu'écrite (pas de réécriture en forme réduite) ; même tracé que C1                                   |
| C8 E  | `d : 2 = 3`                               | refus : « Une équation de courbe contient x ou y. »                                                                 |
| C9 E  | `d : y < 2x`                              | refus : « Une courbe s'écrit avec « = ». Les régions ne sont pas encore prises en charge. »                         |
| C10 E | `d : y = 2x = 3`                          | refus : un seul « = »                                                                                               |
| C11 E | `d : y = 3[m] x`                          | refus (D4 : une grandeur à unité n'est pas traçable)                                                                |
| C12 E | `d : y = 3x` alors que `d` est une valeur | refus : « « d » est déjà une valeur. » (V62 : redéfinir garde le type)                                              |
| C13 E | `y : x = 2`, `x : y = 2`                  | refus : nom réservé                                                                                                 |
| C14 L | `x^2 = 4`, `y = 3x - 2` sans nom          | **pas** de courbe (G0) ; voir Q1 pour le message                                                                    |
| C15 L | `6 : 3`, `a : b` (a, b valeurs)           | **inchangé** : division. La forme courbe exige une lettre, « : », puis une équation qui contient x ou y             |

### 2. Écrire un point

| #    | Saisie            | Résultat attendu                                                                                   |
| ---- | ----------------- | -------------------------------------------------------------------------------------------------- |
| P1 N | `A = (1 ; 2)`     | point `A`, visible dans la Figure ; une ligne dans Calcul ; carte « A = (1 ; 2) »                  |
| P2 N | `M = (a ; 2a)`    | `M` suit le curseur `a` dans la Figure                                                             |
| P3 N | `B = (1,5 ; 2/3)` | virgule décimale et fraction acceptées, coordonnées exactes                                        |
| P4 N | `A` (calcul)      | répond `A(1 ; 2)`                                                                                  |
| P5 E | `A(1 ; 2)`        | refus avec l'aide : « Pour définir un point, écris A = (1 ; 2). » (au lieu de « Il manque « ) » ») |
| P6 E | `A = (1, 2)`      | refus : « Sépare les coordonnées avec « ; ». » (la virgule est décimale, même règle que `max`)     |
| P7 E | `A = (1 ; 2 ; 3)` | refus : « Un point du plan a deux coordonnées. »                                                   |
| P8 E | `A = (2[m] ; 1)`  | refus (D4)                                                                                         |
| P9 E | `A + 1`, `2A`     | refus : « On ne calcule pas encore avec des points. » (lot 2 : distances, milieux)                 |

### 3. La vue Figure

- **F1** Un onglet **Figure**, entre Graphe et Données (croquis du cadrage §6), présent dès le
  départ. Atelier sans objet de figure : la vue le dit (« Écris un point A = (1 ; 2) ou une courbe
  d : y = 3x − 2 »).
- **F2** Elle montre les points, les courbes et les fonctions marquées « dans la figure », dans un
  repère **orthonormé** (un seul `pixelsPerUnit`, jamais d'axe écrasé).
- **F3** Repère (G4) : affiché dès qu'un objet a des coordonnées ou une équation, ce qui est
  toujours le cas au lot 1 ; le réglage existe et se range hors `serialize()` comme `charts`.
- **F4** Au lot 1, **rien ne se glisse** dans la figure (pas de retour vers l'atelier) ; zoom et
  déplacement de la vue seulement. Un point bouge par son curseur ou sa carte.
- **F5** Un objet en erreur ou en attente n'est pas dessiné ; sa carte dit pourquoi (inchangé).

### 4. Les curseurs partagés

- **S1** `a = 2`, `f(x) = ax^2`, `C : x^2 + y^2 = a^2` : glisser `a` dans « Mes objets » change
  **en même temps** la parabole dans Graphe et le cercle dans Figure.
- **S2** Glisser `a` ne reconstruit pas la figure : seuls les descendants de `a` sont recalculés
  (`moveSlider`). Critère mesuré en PR : un atelier de 10 courbes dont 3 implicites reste fluide au
  glisser — chiffre posé à la première mesure, pas avant.
- **S3** Grapheur : `a` devient un vrai paramètre ; la courbe affichée est la même qu'avant
  (régression nulle sur `?f=`, tangente, aire, `f′`, restriction `sur`). Les tests existants de
  `plot-sync` et du grapheur passent sans modification de leurs attentes.
- **S4** Bornes et pas du curseur : ceux de la carte de `a`, partout.

### 5. 𝒞f dans la Figure

- **K1** Action de carte « Montrer dans la figure » sur une fonction (désactivée avec sa raison si la
  fonction n'est pas `ok`, invariant 9) ; elle écrit sa ligne dans Calcul (G2) et se rejoue.
- **K2** La restriction `sur [0 ; 2]` est respectée dans la figure comme dans Graphe.
- **K3** `f′` et `f⁻¹` ont la même action.

### 6. Sauvegarde, lien, migration

- **M1** Points, courbes et `inFigure` entrent dans `atelierShellSchema` (Zod), le lien `?a=`,
  l'export JSON et la fusion d'un atelier reçu (arrivant renommé, Q2 de la v1) ;
  `ATELIER_STATE_VERSION` incrémentée.
- **M2** Plafond proposé : **50 objets de figure** (points + courbes), pour qu'un atelier tienne
  dans une URL (esprit de D8) ; au-delà, refus avec la raison.
- **M3** Suppression en cascade : supprimer `a` propose de supprimer `M = (a ; 2a)` et
  `C : x² + y² = a²`, comme aujourd'hui pour une fonction.
- **M4** Ancien atelier qui contient un objet nommé `y` : voir **Q2**.

## Questions du lot 1 — tranchées par David (2026-10-18, « je valide tes recos »)

Décisions : **Q1 (a)** refus qui propose les deux écritures · **Q2 (a)** renommer à la migration et
le dire · **Q3** plafond de 50 objets de figure · **Q4** grapheur à vrais paramètres dans sa propre
PR, en dernier · **Q5** onglet Figure entre Graphe et Données. Les comportements du lot 1 (C, P, F,
S, K, M) sont validés avec elles.

**Q5 révisée** (David, 2026-10-18, « je suis tes recos », après lecture de la phase 0 de la refonte
de l'interface, qui nommait l'onglet « Géométrie ») : l'onglet s'appelle **Géométrie** (et non
Figure), et reste **entre Graphe et Données**. Le renommage passe dans la PR 3. Dans le code, la vue
garde ses identifiants (`FigureView`, `syncFigure`).

**Q6** (ajoutée par la revue de la PR 1, tranchée par David le 2026-10-18, « je te suis ») : `y`
hors définition, dans un calcul ou une commande (`2y + a`, `.dériver y`), **reste une lettre
libre**, comme avant. La réservation de `y` ne vaut que pour nommer un objet ; aucun objet ne
s'appelle `y`, donc aucun calcul ne peut le confondre avec un objet.

- **Q1 — `y = 3x - 2` tapé sans nom.** Aujourd'hui ça crée une fonction `y` tracée. Avec `y`
  réservé : (a) **refus qui propose les deux écritures** : « Pour une fonction, écris f(x) = 3x − 2 ;
  pour une droite, nomme-la : d : y = 3x − 2. » ; (b) créer une courbe nommée automatiquement.
  **Reco : (a)**, qui suit G0 (une équation ne devient courbe que nommée) et enseigne la
  différence fonction / courbe au moment où l'élève la rencontre.
- **Q2 — Les ateliers rangés qui ont une valeur ou une fonction `y`.** (a) Renommer à la migration
  (`y` → première lettre libre) et le dire à l'ouverture ; (b) les garder sous le nom `y`, en
  exception. **Reco : (a)**, comme la fusion d'un atelier reçu (arrivant renommé, jamais
  d'écrasement silencieux) ; (b) laisserait un nom réservé vivant, et chaque contrôle devrait le
  connaître.
- **Q3 — Plafond M2 (50 objets de figure).** À confirmer, ou à fixer après une mesure de taille
  d'URL.
- **Q4 — Le passage du grapheur aux vrais paramètres (S3)** touche une page en production qui
  marche. **Reco : sa propre PR, en dernier dans le lot 1**, pour qu'une régression du grapheur ne
  bloque pas la Figure (qui, elle, utilise `moveSlider` dès sa PR).
- **Q5 — Place de l'onglet Figure** : entre Graphe et Données (croquis du cadrage), ou en dernier
  pour ne pas déplacer Données que les élèves connaissent. **Reco : entre Graphe et Données**, les
  deux vues graphiques côte à côte.

## Découpage en PR proposé (lot 1)

1. **Modèle** : types `point` et `curve`, lecture (`<lettre> : <équation>`, couples), `y` réservé
   et migration (Q2), cartes, persistance / lien / fusion (M1-M3). Sans vue. Comportements C, P, M.
2. **Vue Figure et pont `syncFigure`** : points, courbes, curseurs cachés réglés par `moveSlider`,
   repère (F1-F5, S1, S2, S4).
3. **𝒞f dans la Figure** (K1-K3).
4. **Grapheur à vrais paramètres** (S3, Q4).

Chaque PR : tests d'abord (rouges), `code-reviewer`, doc système `atelier.md` à jour (vocabulaire :
**point**, **courbe**, **vue Figure**, à distinguer de **fonction**), `geometry-expert` pour ce qui
touche `geometry-core`. Pas de base, pas de RLS : l'atelier ne quitte pas le navigateur.

## Lots suivants (rappel, chacun sa phase 0)

- **Lot 2 — constructions au clavier et mesures** : `milieu`, `droite(A, B)`, `cercle(O, r)`,
  `intersection`, `point_sur` ; mesures `distance`, `aire` comme valeurs (G1) ; le problème de
  l'aire de bout en bout. Appartenance d'un point à une courbe : un calcul (vrai / faux), pas une
  validation.
- **Lot 3 — la souris** : barre d'outils, glisser d'un point (rappel de déplacement à ajouter dans
  `GeometryCanvas`), choix entre « l'atelier enregistre au relâcher » et « `geometry-core` déplace
  seul pendant le geste », **sur mesure**.

## Constaté hors chantier

- **Une équation à variable libre répond `false`** dans Calcul (`x^2 = 4`, `x^2 + y^2 = 1`,
  mesuré le 2026-10-18 par `runInput`). `atelier.md` annonce pourtant que le message d'une
  comparaison non évaluable « nomme la vraie cause (… variable sans valeur) ». Un élève qui tape
  l'équation à résoudre lit « faux ». À traiter à part (suggestion : « x n'a pas de valeur. Pour
  résoudre, écris .résoudre x^2 = 4 »), indépendamment de la v2.
