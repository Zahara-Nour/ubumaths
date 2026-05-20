# Étude : ajouter un objet `angle` à geometry-core + instructions DSL associées

> Statut : **étude / exploration** — ne pas implémenter avant validation utilisateur.
> Cible : session dédiée pour produire un design doc + plan d'implémentation phasé.

## Contexte

Aujourd'hui, le DSL `geometry-core` dispose de **deux briques angle
distinctes** mais d'**aucun objet angle de premier ordre** :

### Brique 1 — mesure scalaire (existe)

- **`angle_vecteurs(u, v)`** : retourne un `BuiltinScalarResult` (=
  **mesure** scalaire en radians). C'est une fonction, pas un objet.
- **`rotation(P, angle, centre)`** : `angle` est un scalaire (en
  radians).

### Brique 2 — annotation visuelle (existe déjà — à ne pas réinventer)

Le type **`GeoAngleMark`** existe (`types/elements.ts:426-435`) et est
rendu sur les 4 surfaces (canvas, SVG, TikZ, Typst). C'est une
**annotation** qui référence 3 points :

```typescript
{ type: 'angleMark', p1Id, vertexId, p2Id,
  arcCount: 1 | 2 | 3,    // arcs simples/doubles/triples (hachures d'angles égaux)
  rightAngle: boolean,    // petit carré pour 90°
  label, ... }
```

Deux builtins DSL exposent cette annotation (`dsl/builtins.ts:2574-2630`) :

- **`marque_angle(P1, V, P2, arcs=1|2|3)`** : arc(s) avec étiquette.
- **`angle_droit(P1, V, P2)`** : petit carré.

Factory `figure.createAngleMark()`, type guard `isAngleMark`, branche
dans `compute-position.ts`, 265 lignes de tests dans
`figure-angle-mark.test.ts`. Utilisé en interne par `triangle_rectangle`,
`hauteur`, etc.

### Ce qui manque encore (cible de l'étude)

`GeoAngleMark` est **purement décoratif** : 3 références à des points
sans identité propre, sans mesure exposée, sans accesseurs, sans
composition possible. Aucun de ces usages n'est aujourd'hui possible :

```
α = angle(A, V, B)         // pas d'objet "angle" identifiable
m = mesure(α)              // pas d'accesseur mesure depuis l'objet
d = bissectrice(α)         // bissectrice() prend 3 points, pas un angle
transporte(α, V')          // pas de report d'angle
```

La différence est exactement la même qu'entre **`marque_segment(A, B,
marks=2)`** (annotation) et **`segment(A, B)`** (objet géométrique avec
milieu, longueur, accesseurs).

L'objet de cette étude : explorer la valeur, le coût et le design d'un
**angle de premier ordre** — analogue à `GeoSegment`, `GeoCircle`,
`GeoVector` — avec :

- une représentation interne (sommet + 2 directions ou 2 rayons).
- un rendu visuel (peut **réutiliser** le rendu de `GeoAngleMark` ou
  introduire un rendu spécifique).
- des accesseurs / opérations DSL (`mesure(α)`, `sommet(α)`,
  `bissectrice(α)`, transport d'angle, etc.).
- la possibilité d'être **source** d'une `bissectrice`, d'une
  `rotation`, d'un `lieu`, etc.

**Distinction critique** : on parle ici de l'**objet géométrique angle**
de premier ordre (avec identité, accesseurs, composition) ; pas de la
mesure scalaire (`angle_vecteurs`) ni de l'annotation visuelle
(`GeoAngleMark` / `marque_angle` / `angle_droit`) qui existent déjà.

## Objectif de l'étude

Produire un document `docs/wip/geometry/study-angle-object.md` qui répond
à ces questions :

1. **Valeur pédagogique** : en quoi un objet angle améliore l'expérience
   pour les enseignants/élèves par rapport à la situation actuelle ?
2. **Modélisation** : quelle est la meilleure représentation interne
   (sommet + 2 points / sommet + 2 vecteurs / sommet + 2 angles
   absolus) ? Quelle est la convention pour l'orientation (CCW vs
   CW, secteur intérieur vs extérieur) ?
3. **API DSL** : quelles instructions DSL ajouter, avec quelle syntaxe ?
4. **Rendu** : à quoi ressemble un angle dans le canvas, en TikZ, en
   Typst ? Quels paramètres de style (rayon d'arc, dash, opacity,
   marquage carré, hachures, étiquette) ?
5. **Composition** : comment les nouveaux builtins (`bissectrice(angle)`,
   etc.) s'articulent-ils avec les existants (`bissectrice(A, V, B)`) ?
6. **Réactivité** : comment l'angle se met-il à jour au drag des points
   sommet et côtés ? (Suivre les conventions `GeoVector`, `GeoSegment`.)
7. **Coût** : ordre de grandeur de l'effort (semaines-personne, fichiers
   touchés, risques de régression).

## Questions à investiguer

### 1. Modèles de représentation

Comparer 4 options :

- **Option A — triplet de points** : `GeoAngle { type: 'angle', vertexId,
point1Id, point2Id, orientation: 'direct' | 'indirect' | 'auto' }`.
  L'angle est défini par les 3 points ; l'arc va du côté `(V→point1)`
  au côté `(V→point2)`. **Structurellement identique à `GeoAngleMark`**
  - champs sémantiques (orientation, identité).
- **Option B — vertex + 2 vecteurs / segments** : `GeoAngle { vertexId,
side1Id, side2Id }` où `side1Id` et `side2Id` référencent des `GeoVector`
  ou `GeoSegment` qui partent du vertex. Plus composite, plus puissant.
- **Option C — vertex + 2 angles absolus** : `GeoAngle { vertexId,
startAngle: ScalarParam, endAngle: ScalarParam }`. Plus proche de
  `GeoArcByAngles`. Découpe les notions « rayons » et « angle ».
- **Option D — enrichir `GeoAngleMark` existant** : promouvoir
  `GeoAngleMark` au rang d'objet de premier ordre en lui ajoutant les
  champs manquants (identité sémantique, scalaire mesure exposé,
  orientation) et en branchant les accesseurs (`mesure(α)`,
  `bissectrice(α)`, etc.) directement sur ce type. **Chemin de plus
  petit impact** — pas de nouveau type, rendu déjà branché sur les 4
  surfaces, tests existants conservés.

Pour chaque option, étudier :

- Comment le drag d'un point côté propage-t-il ?
- Comment représenter un angle de 180° (côtés alignés) ou 360° (pleine
  rotation) ? Cas dégénérés ?
- Comment représenter un angle **orienté** (signé, sens de rotation) vs
  **non orienté** (mesure absolue dans `[0, π]`) ?
- Comment représenter un angle **saillant** (`< π`) vs **rentrant**
  (`> π`) ? Convention par défaut ?
- Comparaison avec d'autres outils éducatifs : GeoGebra utilise
  `Angle[A, B, C]` (triplet, orienté CCW par défaut) ; Cabri utilise une
  notion de « secteur angulaire » ; etc.
- **Spécifique D** : risque de surcharge sémantique (annotation +
  objet dans un même type) ; migration des 3 sites internes qui
  utilisent `createAngleMark` ; backward-compatibility avec
  `marque_angle` / `angle_droit`.

**Grille de tranchage** (pondérée) à produire dans l'étude :

| Critère                                    | Poids | A   | B   | C   | D   |
| ------------------------------------------ | ----- | --- | --- | --- | --- |
| Cohérence avec `GeoVector`/`GeoSegment`    | …     |     |     |     |     |
| Drag-friendliness                          | …     |     |     |     |     |
| Expressivité DSL                           | …     |     |     |     |     |
| Effort multi-rendu (canvas/SVG/TikZ/Typst) | …     |     |     |     |     |
| Risque de régression                       | …     |     |     |     |     |
| Couverture des cas dégénérés               | …     |     |     |     |     |
| Alignement standards éducatifs             | …     |     |     |     |     |

### 2. Instructions DSL à concevoir

**Constructeurs** :

- `angle(A, V, B)` : crée un objet angle de sommet V avec côtés A et B.
  Variantes pour orientation, mesure (saillant/rentrant).
- `angle(u, v)` ou `angle(seg1, seg2)` : variantes pour vecteurs/segments
  (si l'option B est retenue).
- `angle(droite1, droite2)` : angle entre deux droites sécantes (4
  possibles ; convention à définir).

**Accesseurs / opérations** :

- `mesure(angle)` ou `mesure_angle(angle)` : retourne le scalaire (en
  radians). Variante en degrés ?
- `sommet(angle)` : retourne le sommet (point).
- `bissectrice(angle)` : retourne la droite bissectrice — **complète
  l'instruction `bissectrice(A, V, B)` existante**. Différence : on peut
  alors composer `bissectrice(angle(A, V, B))` ou réutiliser un angle
  créé une fois.
- `image(P, rotation_angle(angle, centre))` ? Ou `rotation(angle)` qui
  utilise la mesure pour faire tourner ?

**Marquages spéciaux** (déjà supportés par `GeoAngleMark` —
réutiliser ou exposer différemment ?) :

- Comment indiquer qu'un angle est droit ? `GeoAngleMark.rightAngle:
boolean` existe. Faut-il l'activer automatiquement quand `|mesure −
π/2| < ε` ou rester explicite ?
- Comment indiquer une **paire d'angles égaux** (mêmes hachures) ?
  `GeoAngleMark.arcCount: 1 | 2 | 3` existe déjà (équivalent du
  `markCount` de `GeoSegmentMark`). Quelle API DSL exposer sur l'objet
  angle (`marque(α, arcs=2)` ? option de style sur `angle()` ?) ?

### 3. Rendu visuel

**Le rendu est déjà implémenté** pour `GeoAngleMark` sur les 4
surfaces :

- `rendering/svg-primitives.ts:731` : `angleMarkToSVG()` (arc + carré
  90° + label).
- `rendering/export-svg.ts` : 5 références.
- `rendering/export-tikz.ts` + `rendering/export-typst.ts` : branches
  dédiées.
- `rendering/rough-geometry.ts` : variante sketch mode.

**Questions pour l'étude** :

- Option D (enrichir `GeoAngleMark`) : aucun travail rendu
  supplémentaire, juste lire le code pour s'assurer qu'il couvre déjà
  les besoins.
- Options A/B/C (nouveau type `GeoAngle`) : faut-il **partager** la
  fonction de rendu (`angleMarkToSVG` qui prendrait `GeoAngleMark |
GeoAngle`) ou **dupliquer** ? Quelle stratégie évite la divergence ?
- Quels paramètres de style manquent aujourd'hui à `GeoAngleMark` et
  devraient être ajoutés (dash, opacity, arcRadius custom) ?

Cas spéciaux (déjà partiellement gérés par `GeoAngleMark`, à vérifier) :

- Angle droit : carré au lieu d'arc (✅ via `rightAngle: true`).
- Angle plat (180°) : ligne droite (pas d'arc visible). Comportement
  actuel ?
- Angle nul ou aigu très petit : visibilité. Comportement actuel ?
- Plusieurs angles au même sommet : rayons d'arc différents pour ne pas
  se chevaucher. Comportement actuel ?

### 4. Style et options

Auditer d'abord les options actuelles de `GeoAngleMark` (`arcCount`,
`rightAngle`, `label`, `color`, `style`, `labelOffset`) puis lister
ce qui manque pour un objet angle de premier ordre :

- `arcRadius` (math units ou pixels) : rayon de l'arc visible — déjà
  paramétrable ?
- `dash`, `opacity`, `strokeWidth` : à vérifier dans `style`.
- `marque` ou `forme` : `'arc' | 'carre' | 'hachure1' | 'hachure2' | …`
  Aujourd'hui split entre `arcCount` (1/2/3) et `rightAngle` (bool) —
  faut-il unifier en un seul champ ?
- `label` : auto (mesure en degrés/radians) | explicite ("α", "60°", "");
  position auto vs explicite. Aujourd'hui `label` est un string, pas
  d'interpolation de mesure auto — à ajouter ?
- `unite` : `'rad' | 'deg' | 'grad'` pour l'étiquette automatique.

### 5. Intégration avec l'existant

**Builtins concernés à étendre** :

- `bissectrice` : ajouter overload `bissectrice(angle) → droite`.
- `rotation` : actuellement `rotation(P, angle_scalaire, centre)` ;
  ajouter `rotation(P, angle_object)` qui utilise la mesure de l'objet ?
- `transporte` : nouveau builtin pour copier un angle à un autre sommet
  (équivalent du « report d'angle » au compas).

**Chorégraphies V1 à étendre** :

- `bissectrice @euclide` avec un argument `angle` au lieu de 3 points :
  même séquence d'animation mais en partant de l'objet angle.
- `transporte_angle @euclide` : nouvelle chorégraphie qui montre comment
  reporter un angle au compas (arc en V, ouverture, arc au nouveau
  sommet, intersection avec arc, droite).

### 6. Conventions et standards éducatifs

Étude comparative approfondie des outils de géométrie dynamique
concurrents. Pour chaque outil, documenter dans `study-angle-object.md`
un tableau structuré avec : **constructeurs**, **type d'objet** (objet
de premier ordre vs mesure vs annotation), **accesseurs**, **rendu
visuel** (arc, hachures, carré d'angle droit), **support des angles
orientés**, **composition** (passer un angle à `bissectrice`, etc.),
**API DSL ou écrite** si applicable.

Outils à étudier (ordre de priorité) :

#### GeoGebra (référence n°1 — logiciel le plus utilisé en France)

- **Commande `Angle[A, B, C]`** retourne un **nombre** (mesure scalaire)
  ET dessine simultanément l'arc visuel. Le « scalaire affiché »
  agit comme un proxy d'objet : il porte le style, la position
  d'étiquette, l'orientation. Pas d'objet `angle` séparé.
- **Variantes** : `Angle[u, v]` (vecteurs), `Angle[d1, d2]` (droites),
  `Angle[c]` (rotation autour d'un point), `Angle[polygone, n]`
  (n-ième angle d'un polygone).
- **Orientation** : par défaut CCW (sens direct) ; option « angle
  orienté » dans les préférences pour permettre angles négatifs.
- **Composition** : `Bissectrice[A, B, C]` prend des points (pas un
  angle objet) ; `Bissectrice[d1, d2]` prend deux droites (retourne
  un couple).
- **Rendu** : arc avec étiquette ; carré pour 90° (si « marquer angle
  droit » activé) ; hachures pour angles égaux (manuel).
- **Décisions de design intéressantes** : la fusion mesure + objet
  cache la complexité aux élèves. Trade-off : moins de pureté
  conceptuelle mais utilisation plus intuitive.
- **Référence** : <https://wiki.geogebra.org/en/Angle_Command>.

#### Cabri Géomètre / Cabri II Plus (référence historique française)

- Objet **secteur angulaire** distinct de la mesure. L'angle est créé
  par menu (sélection sommet + 2 côtés). C'est un objet géométrique
  identifiable, on peut lui appliquer un style.
- **Mesure** : commande séparée « mesurer un angle » qui produit un
  texte affiché.
- **Bissectrice** : commande dédiée prenant 3 points OU un angle déjà
  construit.
- **Marquage** : multiples styles d'arc (simple, double, triple, plein),
  carré pour 90°, couleur, épaisseur.
- **Orientation** : non orienté par défaut (mesure dans `[0°, 180°]`) ;
  outil séparé pour angle orienté.

#### CarMetal (gratuit, basé sur C.a.R., proche de Cabri)

- Modèle d'angle similaire à Cabri : objet « secteur ». Outils dédiés
  pour bissectrice, mesure, transport d'angle (« reporter un angle »).
- API JavaScript embarquée : `Angle("A", "V", "B")` crée un objet
  manipulable via scripting.
- Marquage : `setShowName`, `setArc`, options de hachures.

#### Desmos Geometry (nouveau venu, focus pédagogique 6e–4e)

- Interface principalement par boutons/menus (pas de DSL textuel
  utilisateur). Outil « marquer un angle » qui crée un arc + étiquette
  de mesure automatique.
- **Pas d'objet angle de premier ordre** : l'arc est purement
  décoratif, on ne peut pas le passer à une autre commande. La
  bissectrice est un outil séparé qui prend 3 points.
- **Mesures** : affichées en degrés par défaut, basculer en radians
  via préférences globales.
- **Orientation** : non orienté.
- **Référence** : <https://www.desmos.com/geometry>.

#### Desmos Graphing Calculator (calculateur graphique 2D, pas de

géométrie au sens construction)

- Pas d'objet angle. Les expressions trigonométriques sont des
  fonctions / scalaires. Mentionné pour distinguer de Desmos Geometry.

#### Sketchpad (Geometer's Sketchpad, historique nord-américain)

- Objet « angle marker » créé par menu (sélection 3 points). Distinct
  de la mesure (« Measure → Angle »).
- Le marker peut prendre un style, mais n'est pas composable avec
  d'autres commandes (la bissectrice prend toujours 3 points).
- Aujourd'hui largement remplacé par GeoGebra dans l'éducation.

#### Manim / Asymptote (outils de génération mathématique non-interactive)

- Manim : `Angle(line1, line2)` crée un VMobject angle (Python API).
  Objet de premier ordre, manipulable, composable.
- Asymptote : pas d'objet angle natif, mais bibliothèques tierces
  (`geometry.asy`) en proposent.
- Pertinent comme inspiration pour le rendu vectoriel (TikZ/Typst).

#### TikZ (LaTeX, cible d'export)

- Pas d'objet, mais syntaxe `pic { angle = A--V--B }` qui dessine un
  arc avec étiquette. Paramètres : `angle radius`, `angle eccentricity`,
  `pic text`. Très flexible visuellement.
- Comportement à reproduire pour l'export TikZ d'UbuMaths.

### 6 bis — Synthèse comparative

Le tableau suivant doit être produit dans `study-angle-object.md` :

| Outil                | Objet angle ?          | Constructeur            | Mesure        | Bissectrice via angle ? | Orientation        | Marquage                   |
| -------------------- | ---------------------- | ----------------------- | ------------- | ----------------------- | ------------------ | -------------------------- |
| GeoGebra             | non (scalaire affiché) | `Angle[A,B,C]`          | implicite     | non (prend 3 pts)       | CCW                | arc, 90°, hachures         |
| Cabri                | oui (secteur)          | menu                    | séparée       | oui                     | non orienté défaut | arc multi, 90°             |
| CarMetal             | oui                    | menu / `Angle()`        | séparée       | oui                     | configurable       | multi                      |
| Desmos Geom          | non                    | outil                   | implicite     | non                     | non orienté        | arc + label                |
| Sketchpad            | annotation             | menu                    | séparée       | non                     | non orienté        | arc, 90°                   |
| Manim                | oui                    | `Angle(l1, l2)`         | méthode       | composable              | configurable       | configurable               |
| TikZ                 | non (pic)              | `pic { angle=A--V--B }` | externe       | non                     | –                  | très flexible              |
| **UbuMaths (cible)** | **à décider**          | **à décider**           | `mesure(α)` ? | **oui (objectif)**      | **à décider**      | réutilise `GeoAngleMark` ? |

### 6 ter — Standard pédagogique français (à respecter)

- Nomenclature « angle AÔB » avec accent circonflexe sur la lettre
  centrale.
- Notation `\widehat{AOB}` en LaTeX/MathLive.
- Codes visuels : arc simple/double/triple pour signifier l'égalité de
  plusieurs angles dans une preuve (cf. `arcCount: 1 | 2 | 3` de
  `GeoAngleMark` existant — déjà aligné).
- Petit carré au sommet pour les angles droits.
- Unité par défaut : **degrés** au collège (6e–3e), radians au lycée.
  Trancher pour UbuMaths : auto-switch selon le niveau ? Option de
  l'utilisateur ? Paramètre global de la figure ?

### 7. Cas dégénérés et invariants

- Angle où le sommet est confondu avec un côté : interdit ? Mesure 0 ?
- Angle où les 2 côtés sont confondus : interdit ? Mesure 0 ?
- Angle où les 2 côtés sont opposés (alignés à 180°) : autorisé (angle
  plat) ? Quelle direction pour la bissectrice (ambiguë) ?
- Angle obtus / rentrant : convention d'orientation par défaut ?

## Contraintes architecturales (à respecter dans le design)

- **Pas de cast `as GeoXxx`** : utiliser des type guards (`isAngle`).
- **Pattern HANDLERS** : nouveaux builtins enregistrés via
  `HANDLERS.set('angle', handleAngle)` au top-level, jamais dans un
  switch.
- **Erreurs structurées** : `new DslRuntimeError({ summary, hint?, forms? }, line)`.
- **Réactivité** : tous les calculs intermédiaires via factory methods
  (`createScalarExpression`, `createComputedPoint`, etc.) pour que le
  drag se propage.
- **4 surfaces de rendu** : canvas + SVG + TikZ + Typst. Tout nouveau
  type `Geo*` doit être branché dans les 4 (cf. piège documenté pour
  `GeoOsculatingCircle`).
- **Branche dans `compute-position.ts`** pour calculer la position de
  référence de l'angle (sommet ? centre de l'arc ?).
- **Aucun import de `dsl/` depuis `graph/`** : maintenir la séparation.

## Fichiers à lire AVANT de produire le design doc

0. **`MEMORY.md` du projet** — entrées `geometry-core` (status,
   vectors, transformation-objects, courbe, parametric, intersection)
   pour le contexte module.
1. `src/lib/geometry-core/CLAUDE.md` — règles dures et patterns du
   module (HANDLERS Map, type guards, 4 surfaces de rendu, mutable-env
   pattern, etc.).
2. `src/lib/geometry-core/types/elements.ts` — sections :
   - `GeoAngleMark` (lignes 426-435) : **annotation existante, à
     comparer / étendre**.
   - `GeoSegmentMark` (lignes 437-444) : annotation parallèle pour
     segments, modèle de cohérence.
   - `GeoVector`, `GeoSegment`, `GeoArcByAngles` : conventions de
     modélisation d'objets géométriques composites.
3. `src/lib/geometry-core/dsl/builtins.ts` — sections :
   - `handleMarqueAngle` (ligne 2574) et `handleAngleDroit` (ligne 2607) : **builtins d'annotation existants**.
   - `handleAngleVecteurs` (ligne ~2059) : la fonction de mesure
     existante.
   - `handleBissectrice` (ligne ~4376) : le builtin actuel (à
     surcharger pour accepter un objet angle).
   - `handleVecteur` (ligne ~1994) : pour comparer un objet
     géométrique simple.
   - `handleSegment`, `handleCercle` : modèles d'objets composites.
4. `src/lib/geometry-core/graph/figure.ts` — sections :
   - `createAngleMark` (ligne 1961) : **factory existante**.
   - `createVector`, `createSegment`, `createArcByAngles` : pattern
     factory pour comparaison.
5. `src/lib/geometry-core/rendering/svg-primitives.ts:731` —
   `angleMarkToSVG` : **rendu existant** à inspecter pour comprendre
   ce qui est déjà géré (arc, carré 90°, label) et ce qui manque.
6. `src/lib/geometry-core/rendering/export-tikz.ts` +
   `export-typst.ts` — branches `angleMark` existantes ; piège
   documenté : tout nouveau type doit être branché dans **les 4
   surfaces** (cf. `GeoOsculatingCircle` oublié avant 2026-05-18).
7. `src/lib/geometry-core/graph/__tests__/figure-angle-mark.test.ts`
   (265 lignes) — tests existants à conserver / étendre.
8. `src/lib/constructions-v2/core/choreographies/bissectrice.ts` —
   chorégraphie actuelle, à étendre si on veut une variante prenant un
   objet angle.

## Exemples DSL cibles (entrée pour le design)

Pour cadrer l'étude, voici ce qu'on aimerait pouvoir écrire après
implémentation. Les options A/B/C/D doivent **toutes** supporter ces
usages (sinon les disqualifier) :

```text
# 1. Création + marquage automatique
A = (0; 0); B = (3; 0); C = (1; 2)
α = angle(B, A, C)                 # objet angle au sommet A

# 2. Mesure scalaire dérivée
m = mesure(α)                       # en radians par défaut
m_deg = mesure(α, unite="deg")      # en degrés

# 3. Composition avec bissectrice
d = bissectrice(α)                  # équivalent de bissectrice(B, A, C)

# 4. Marquage d'angles égaux (paire α / β avec mêmes hachures)
β = angle(D, E, F)
marque(α, arcs=2)
marque(β, arcs=2)

# 5. Réactivité au drag
# Si A, B ou C bouge → α se met à jour → m se met à jour →
# d (bissectrice) se met à jour → marquage suit le sommet A.

# 6. Bonus : angle entre deux droites
γ = angle(d1, d2)                   # 1 des 4 angles, convention à définir
```

## Méthode attendue pour la session d'étude

1. **Lire les fichiers ci-dessus** (1–2h de lecture / exploration), en
   accordant une attention particulière à `GeoAngleMark` (type +
   factory + handlers + rendu) pour bien mesurer ce qui existe déjà.
2. **Schématiser** les 4 options de représentation (A/B/C/D) avec
   leurs trade-offs sur 1 page chacune.
3. **Remplir la grille de tranchage pondérée** (voir section 1) et
   **proposer** une option recommandée avec justification.
4. **Lister les builtins DSL** à ajouter, avec signatures précises et
   exemples d'usage côté DSL (étendre les 6 exemples ci-dessus).
5. **Estimer l'effort** par sous-tâche en **nombre de fichiers
   touchés + lignes ajoutées** (pas en semaines) :
   - types/elements.ts (interface + type guard + union)
   - dsl/builtins.ts (handlers + HANDLERS.set + BUILTIN_NAMES)
   - graph/figure.ts (factory)
   - graph/compute-position.ts (branche)
   - rendering/svg-primitives.ts + export-{svg,tikz,typst}.ts (4
     surfaces — déjà partiellement faits pour `GeoAngleMark`)
   - tests (extension de `figure-angle-mark.test.ts` + nouveaux)
   - intégration constructions-v2, docs.
6. **Identifier les risques** :
   - Régression sur `marque_angle` / `angle_droit` / `bissectrice(A,
V, B)` existants (3 sites internes qui appellent
     `createAngleMark`).
   - Collision sémantique si Option D : annotation vs objet dans un
     même type.
   - Complexité du rendu multi-cible et duplication
     (`extendLineToViewport` est déjà triplée — éviter le même
     piège).
   - Cas dégénérés (180°, 0°, sommet confondu).
7. **Proposer un plan phasé** (V1 minimal → V2 enrichi → V3 polish)
   avec ce qui est livrable à chaque phase et ce qui est différé.

## Livrables attendus

- `docs/wip/geometry/study-angle-object.md` : document d'étude (5-10
  pages, mix de texte/schémas ASCII/tableaux comparatifs).
- Pas de code : c'est une étude.
- Validation utilisateur AVANT toute implémentation.

## Hors scope (à NE PAS aborder dans cette étude)

- Le report d'angle (« transporter un angle au compas »). Trop spécifique,
  à étudier séparément.
- Les angles 3D ou angles dièdres. UbuMaths est 2D.
- L'intégration avec `mathAST` (symbolique). À voir plus tard.
- L'animation par `constructions-v2` (sauf si pertinent pour valider que
  le design supporte les chorégraphies).
- Refactorer `angle_vecteurs` : il reste en parallèle (mesure scalaire
  utilisable indépendamment).
- **Supprimer `GeoAngleMark`** : même si l'Option D est retenue,
  l'annotation existante reste utilisable telle quelle (backward
  compatibility absolue pour `marque_angle` / `angle_droit`).

## Démarrage

Lire les 6 fichiers listés section "Fichiers à lire AVANT", puis ouvrir
`docs/wip/geometry/study-angle-object.md` (à créer) avec un plan
préliminaire des sections. Itérer en mode plan/explore pour collecter
toutes les références nécessaires avant d'écrire la première version.

Ne pas hésiter à utiliser l'agent `geometry-expert` (modèle Opus) pour
explorer le code et valider les patterns en place avant de finaliser le
design.
