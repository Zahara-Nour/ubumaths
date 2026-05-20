# Analyse comparative des outils de geometrie

> Etat des lieux complet pour le projet de geometrie dynamique ubumaths.
> Genere le 2026-04-23.

---

## Table des matieres

1. [Vue d'ensemble - Tableau comparatif](#1-vue-densemble)
2. [Outils internes ubumaths](#2-outils-internes-ubumaths)
   - [2.1 constructions/](#21-constructions)
   - [2.2 whiteboard/](#22-whiteboard)
   - [2.3 grapheur/](#23-grapheur)
3. [References externes](#3-references-externes)
   - [3.1 apigeom (candidat principal)](#31-apigeom)
   - [3.2 DGPad](#32-dgpad)
   - [3.3 MathGraph32](#33-mathgraph32)
   - [3.4 tldraw](#34-tldraw)
   - [3.5 Excalidraw](#35-excalidraw)
   - [3.6 InstrumenPoche](#36-instrumenpoche)
   - [3.7 OpenBoard](#37-openboard)
4. [Themes transversaux](#4-themes-transversaux)
   - [4.1 Rendu : SVG vs Canvas](#41-rendu-svg-vs-canvas)
   - [4.2 Architectures : OOP vs fonctionnel vs ECS](#42-architectures)
   - [4.3 Dependency graphs](#43-dependency-graphs)
   - [4.4 Systemes d'expressions](#44-systemes-dexpressions)
5. [Recommandations](#5-recommandations)
   - [5.1 Idees a reprendre par outil](#51-idees-a-reprendre-par-outil)
   - [5.2 Architecture proposee (geometry-core)](#52-architecture-proposee)
   - [5.3 Partage avec constructions/, whiteboard/, grapheur/](#53-partage-avec-les-modules-existants)
   - [5.4 Priorisation des fonctionnalites](#54-priorisation-des-fonctionnalites)

---

## 1. Vue d'ensemble

### Tableau comparatif

| Critere              |           constructions/           |           whiteboard/            |         grapheur/          |      apigeom      |         DGPad         |        MathGraph32         |        tldraw         |      Excalidraw       |   InstrumenPoche    |         OpenBoard         |
| -------------------- | :--------------------------------: | :------------------------------: | :------------------------: | :---------------: | :-------------------: | :------------------------: | :-------------------: | :-------------------: | :-----------------: | :-----------------------: |
| **Langage**          |            TS/Svelte 5             |           TS/Svelte 5            |        TS/Svelte 5         |    TypeScript     |      JavaScript       |         JavaScript         |      TypeScript       |      TypeScript       |     JavaScript      |         C++ (Qt)          |
| **LOC**              |                ~14K                |               ~12K               |            ~4K             |       ~37K        |         ~38K          |            ~30K            |         ~200K         |         ~150K         |         ~8K         |          ~200K+           |
| **Rendu**            |                SVG                 |          SVG (roughjs)           |            SVG             |        SVG        |       Canvas 2D       |            SVG             |        SVG+DOM        |      Canvas+SVG       |         SVG         |        Qt Graphics        |
| **Objets geo.**      |  Points, segments, arcs, cercles   | Lignes, rect., ellipses, fleches | Fonctions, points speciaux |     30+ types     |       36 types        |          42 types          |   Formes generiques   |   Formes generiques   |      22 types       |      Formes basiques      |
| **Instruments**      | Regle, compas, rapporteur, equerre |    Regle, rapporteur, equerre    |             -              |         -         |           -           | Regle, rapporteur, equerre |           -           |           -           |    6 instruments    | Regle, rapporteur, compas |
| **Drag interactif**  |           Non (playback)           |               Oui                |       Oui (pan/zoom)       |        Oui        |          Oui          |            Oui             |          Oui          |          Oui          |   Non (playback)    |            Oui            |
| **Dependency graph** |         Implicite (ordre)          |         Bindings fleches         |         Implicite          | Observer pattern  |  Parent/child lists   |           Manuel           |       Bindings        |       Bindings        |     Sequentiel      |             -             |
| **Expressions**      |          MathAST ($param)          |                -                 |      MathAST (LaTeX)       |      MathJS       |   Symbolique custom   |       Custom parser        |           -           |           -           |          -          |             -             |
| **Undo/redo**        |          Snapshot/restore          |       Full snapshots (50)        |            Non             |  JSON snapshots   | Lineaire (add/remove) |       Full snapshots       |      Delta-based      |      Delta-based      |  Non (reset only)   |        QUndoStack         |
| **Animations**       |         Timeline pas-a-pas         |               Non                |            Non             |   Slider-driven   |          Non          |    Macro frame-by-frame    |          Non          |          Non          |    Timeline XML     |            Non            |
| **Export**           |           JSON, IEP XML            |        .ubw, PDF, images         |          SVG, PNG          | JSON, LaTeX, HTML |    PNG, SVG, HTML     |    .mgj, SVG, TikZ, PDF    |    JSON snapshots     | .excalidraw, SVG, PNG | XML (lecture seule) |      .ubz, PDF, IWB       |
| **Collaboration**    |                Non                 |               Non                |            Non             |        Non        |          Non          |            Non             | WebSocket temps reel  | WebSocket temps reel  |         Non         |            Non            |
| **Mobile/tactile**   |                Non                 |               Oui                |            Oui             |        Oui        |      Oui (natif)      |          Partiel           |          Oui          |          Oui          |       Basique       |       Non (desktop)       |
| **Svelte 5 compat.** |               Natif                |              Natif               |           Natif            |     Adaptable     |  Rewrite necessaire   |     Rewrite necessaire     | React (wrap possible) | React (wrap possible) |  Wrapper possible   |      Non applicable       |

### Positionnement par cas d'usage

| Cas d'usage                     | Meilleure inspiration                    | Pourquoi                                     |
| ------------------------------- | ---------------------------------------- | -------------------------------------------- |
| Constructions animees pas-a-pas | **constructions/** + InstrumenPoche      | Timeline, instruments, pedagogie             |
| Figures interactives (drag)     | **apigeom** + DGPad                      | Dependency graph, objets geometriques riches |
| Outil de dessin libre           | **whiteboard/** + tldraw                 | Formes libres, roughjs, outils de dessin     |
| Figures statiques dans enonces  | **apigeom** (mode statique) + grapheur/  | API declarative, export SVG/LaTeX            |
| Validation de constructions     | **apigeom** (check/) + MathGraph32       | Fonctions de verification geometrique        |
| Librairie commune avec grapheur | **grapheur/** (viewport, bezier, colors) | Deja dans le projet, pur fonctionnel         |

---

## 2. Outils internes ubumaths

### 2.1 constructions/

**Fichiers** : `src/lib/constructions/` (~14 580 LOC)

#### A. Fonctionnalites

- **Objets** : Points, segments, arcs, cercles, textes, labels, marques, milieux
- **Instruments** : Regle (graduee), compas (avec vue 3D), rapporteur, equerre, crayon
- **Interactions** : Playback anime pas-a-pas, scrubbing timeline, sliders de parametres en temps reel
- **Expressions** : `$paramName`, `$objectId.x`, expressions mathematiques completes via MathAST
- **Import** : InstrumenPoche XML -> JSON ubumaths (converter.ts ~800 LOC)
- **Pas d'undo/redo** formel, mais snapshot/restore + navigation timeline

#### B. Choix techniques

| Aspect       | Choix                                                        | Evaluation                               |
| ------------ | ------------------------------------------------------------ | ---------------------------------------- |
| Rendu        | SVG declaratif (Svelte)                                      | Parfait pour constructions (<500 objets) |
| Architecture | Classe Engine reactive (Svelte 5) + utilitaires fonctionnels | Engine trop gros (2715 LOC)              |
| Etat         | SvelteMap/SvelteSet + $state/$derived                        | Reactif et performant                    |
| Coordonnees  | Pixels SVG (pas de systeme math)                             | Limitant pour geometrie                  |
| Types        | Zod schemas (33 schemas, 800+ LOC)                           | Excellent, runtime + compile-time        |
| Dependances  | Implicite par ordre de creation                              | Fragile, pas de detection de cycles      |
| Perf         | MAX_OBJECTS=500, recalcul O(n) complet                       | Suffisant pour les constructions         |

#### C. A retenir / A eviter

**A retenir** :

- Format JSON plat pour scripts (lisible, versionnable)
- Systeme d'expressions avec MathAST ($param, $obj.x)
- Pattern InstrumentRenderer extensible (register custom)
- Animations basees sur la progression (arcs partiels, segments progressifs)
- Validation Zod exhaustive a l'import

**A eviter** :

- Classe Engine monolithique (2715 lignes) -> decouvrir en managers
- Recalcul ordre-dependant sans graphe explicite
- Pas de systeme de coordonnees mathematiques (juste pixels)

---

### 2.2 whiteboard/

**Fichiers** : `src/lib/whiteboard/` (~12 000+ LOC)

#### A. Fonctionnalites

- **Objets** : Traits (pression), formes (rect, cercle, polygones, etoiles), fleches (sharp/curved/elbow avec A\* pathfinding), textes markdown+LaTeX, images, groupes
- **Instruments** : Regle, rapporteur, equerre (visuels)
- **Outils** : Stylo, marqueur, surligneur, gomme, selection, laser, texte, image
- **Interactions** : Dessin libre, drag/resize/rotate, snap (5 points + gap), selection marquee, annotation en couche separee
- **Import/Export** : .ubw (JSON valide Zod), PDF (import fond + export), images
- **Undo/redo** : Snapshots complets (max 50) + historique annotations separee

#### B. Choix techniques

| Aspect       | Choix                                           | Evaluation                                  |
| ------------ | ----------------------------------------------- | ------------------------------------------- |
| Rendu        | SVG + roughjs (style croquis)                   | Esthetique, mais pas geometriquement precis |
| Architecture | Types immutables + fonctionnel + Svelte 5 runes | Excellent pattern                           |
| Etat         | whiteboardStore singleton ($state)              | Bon pour module isole                       |
| Bindings     | Coordonnees normalisees (0-1) sur perimetre     | Excellent pour invariance de position       |
| Snap         | 5 points + gap detection (10px seuil)           | Bon, extensible pour geometrie              |
| A\* routing  | Fleches elbow avec pathfinding                  | Impressionnant mais specifique              |
| Perf         | Hit-testing lineaire O(n), pas d'index spatial  | Limitant si beaucoup d'objets               |
| Memoire      | Snapshots complets (pas de deltas)              | Consomme avec images                        |

#### C. A retenir / A eviter

**A retenir** :

- Systeme de binding normalise (coordonnees 0-1 relatives a la forme)
- Types immutables `readonly` partout (predictabilite)
- Snap-to-object avec seuil configurable
- Couche d'annotation separee de la couche dessin
- Validation Zod + migration de versions
- Labels markdown + LaTeX sur les formes

**A eviter** :

- Snapshots complets pour undo (preferer deltas)
- Hit-testing O(n) sans index spatial
- Roughjs si on veut de la precision geometrique

---

### 2.3 grapheur/

**Fichiers** : `src/lib/grapheur/` (~4 000 LOC)

#### A. Fonctionnalites

- **Objets** : Fonctions explicites y=f(x), points speciaux (racines, extrema, asymptotes), intersections
- **Interactions** : Pan, zoom (limites 1e-6 a 1e10), hover avec snap sur courbes et points speciaux
- **Expressions** : LaTeX -> AST via MathAST, detection variables libres pour sliders
- **Export** : SVG vectoriel, PNG (1x/2x/3x), localStorage avec Zod
- **Pas d'undo/redo**

#### B. Choix techniques

| Aspect       | Choix                                                     | Evaluation                          |
| ------------ | --------------------------------------------------------- | ----------------------------------- |
| Rendu        | SVG (paths Catmull-Rom -> Bezier)                         | Qualite vectorielle, export propre  |
| Architecture | Coeur fonctionnel pur + store Svelte 5                    | **Excellent pattern a generaliser** |
| Etat         | GrapheurStore classe + $state + persistence debouncee     | Robuste                             |
| Coordonnees  | Math <-> SVG bidirectionnel (y-flip)                      | **Reutilisable tel quel**           |
| Viewport     | panViewport, zoomViewport, getViewportMetrics             | **API propre, reutilisable**        |
| Perf         | 200 points/courbe, analyse lazy (pas pendant interaction) | Bon compromis                       |
| Couleurs     | Palette 8 couleurs, getNextColor intelligent              | Reutilisable                        |

#### C. A retenir / A eviter

**A retenir** (tout est bon, candidat #1 pour partage) :

- `CoordinateTransformer` (mathToSvg / svgToMath) -> partager avec geometry-core
- `panViewport()`, `zoomViewport()`, `createViewport()` -> librairie commune
- `curveToSVGPath()` (Catmull-Rom -> Bezier) -> courbes lisses en geometrie
- `getNextColor()`, `isValidColor()` -> palette commune
- `prepareSvgForExport()`, `exportAsPng()` -> export partage
- Architecture fonctionnel pur + store reactif

**A eviter** :

- Pas d'undo/redo (a ajouter)
- Limites de zoom hardcodees (rendre configurables)
- Pas de cache des resultats d'analyse

---

## 3. References externes

### 3.1 apigeom

**Candidat principal d'inspiration** | `extern/apigeom/` | ~37K LOC TypeScript | SVG | Par Remi Angot/Coopmaths

#### A. Fonctionnalites

**Objets geometriques (30+ types)** :

- Points : libres, milieux, barycentres, projections, intersections (LL/LC/CC), sur courbe/cercle/droite
- Lignes : Segment, Line, Ray, Circle, Arc, Polygon, Polyline
- Lignes derivees : Parallele, Perpendiculaire, Mediatrice, Bissectrice
- Transformations : Rotation, Reflexion, Homothetie, Translation (dynamiques via slider)
- Nombres dynamiques : Distance, Angle, AngleOriente, Aire, Perimetre, DynamicCalcul, DynamicExpr
- Textes : statiques, dynamiques, templates ($${variable}$$)
- Sliders : controles numeriques interactifs
- Graphes de fonctions, fractions visuelles, sous-reperes

**Outils (40+ modes)** : Machine a etats XState v5 gerant point, droite, segment, cercle, arc, polygone, parallele, perpendiculaire, mediatrice, bissectrice, rotation, reflexion, homothetie, translation, angle, texte, slider, grille, marques, etc.

**Interactions** : Construction click, drag, animation (sliders), mesure, edition, suppression, deplacer labels

**Export** : JSON (load/save), LaTeX/TikZ, HTML statique, TypST

**Undo/redo** : Piles JSON snapshots (stackUndo/stackRedo)

**Validation** : `check/` (20 fonctions) - checkPoint, checkDistance, checkAngle, checkParallel, etc.

#### B. Choix techniques

| Aspect           | Choix                                            | Evaluation                                   |
| ---------------- | ------------------------------------------------ | -------------------------------------------- |
| Rendu            | SVG pur (createElementNS)                        | Bon pour education, chaque objet = noeud DOM |
| Architecture     | OOP classes + Observer pattern                   | Hierarchy claire mais 155 fichiers           |
| Machine a etats  | XState v5 (uiMachine.ts = 168KB !)               | Puissant mais trop gros                      |
| Dependency graph | **Observer** : subscribe/notify/update explicite | **Pattern a adopter**                        |
| Coordonnees      | Math -> SVG (xToSx, yToSy) avec pixelsPerUnit    | Correct mais couplage Figure                 |
| Types            | TypeScript strict, generics create\<T\>()        | Bon                                          |
| Nettoyage        | remove() explicite avec cascade + null-setting   | Deterministe mais fragile                    |
| Perf             | Incremental SVG, label optimisation              | Correct pour 50-100 objets                   |

#### C. A retenir / A eviter

**A retenir** :

- **Observer pattern** pour dependency graph (subscribe/notify/update) -> simple, debuggable, extensible
- **API generique create\<T\>()** avec inference de type
- **Nombres dynamiques** decouplees (Distance, Angle comme objets, pas strings)
- **Systeme de validation** (check/) pour exercices interactifs
- **Modes statique/dynamique** (isDynamic flag)
- **Label auto-repositionnement** (optimizeLabels() anti-chevauchement)

**A eviter** :

- 155 fichiers separees (consolider par famille)
- uiMachine.ts de 168KB monolithique
- Undo/redo par serialisation JSON complete (preferer deltas)
- Comportement silencieux avec coords NaN (fail fast)
- Options objects avec 30+ champs optionnels (builder pattern)
- Pas de validation des dependances a la creation (post-hoc seulement)

---

### 3.2 DGPad

`extern/dgpad/` | ~38K LOC JavaScript | Canvas 2D | Geometrie dynamique

#### A. Fonctionnalites

- **36 types d'objets** : points (libres, lies, intersections), segments, droites, demi-droites, cercles, arcs, angles, vecteurs, lieux, coniques, expressions, listes, Blockly
- **37 constructeurs** (outils) + macros utilisateur
- **11 modes d'interaction** : construction, gomme, suppression, macro, proprietes, trace, magnetisme, dependances
- **Systeme d'expressions symboliques** avec derivation automatique (dx, dy, dt), variables x/y/z/t
- **Export** : PNG, SVG, HTML standalone, iBook plugin, base64, DGP source
- **Undo/redo** lineaire (ADD/REMOVE)
- **Support 3D** : projection isometrique optionnelle

#### B. Choix techniques

| Aspect           | Choix                                          | Evaluation                           |
| ---------------- | ---------------------------------------------- | ------------------------------------ |
| Rendu            | **Canvas 2D** (immediate mode)                 | Rapide pour interaction, bon tactile |
| Architecture     | OOP mixin ($U.extend) pre-ES6                  | Simple mais pas de vrai heritage     |
| Etat             | Construction object avec V[] + AO{} imperatifs | Pas reactif                          |
| Dependency graph | **Parent/child lists** + computeAll O(n)       | Correct, ordre-dependant             |
| Coordonnees      | Dual (canvas/math) avec CoordsSystem           | **Excellent pattern**                |
| Expressions      | **Symbolique custom** avec derivation auto     | Puissant et unique                   |
| Types            | String-based (runtime), pas de TypeScript      | Fragile                              |
| Mobile           | Touch-to-mouse conversion + pinch-zoom         | Bien fait                            |

#### C. A retenir / A eviter

**A retenir** :

- **Systeme dual de coordonnees** (px/py pour math->canvas, x/y pour canvas->math) avec Unit scale
- **Alpha parametre** pour points sur objets (0-1 segment, 0-2pi cercle) -> elegant
- **Macros utilisateur** (enregistrer et rejouer des constructions)
- **Derivation symbolique** automatique d'expressions
- **Mode dependance** (visualiser le graphe parent-enfant)
- Bonne gestion tactile native

**A eviter** :

- Mixins $U.extend (pas de vrai heritage, pas d'instanceof)
- Variables globales ($P, $L, $U, $APP_PATH)
- computeAll() O(n) sans dirty flags
- Types string sans validation
- Pas d'index spatial pour hit-testing

---

### 3.3 MathGraph32

`extern/mathgraph-main/` | ~30K LOC JavaScript (pre-ES6) | SVG | Par Yves Biton

#### A. Fonctionnalites

- **42 types d'objets** : le plus riche en objets (points, droites, cercles, arcs, polygones, surfaces, lieux, transformations, courbes, suites, courbes composees)
- **200+ outils** organises en classes Outil\*
- **Calcul avance** : matrices, nombres complexes, fonctions 1-3 variables, derivees, integrales, suites recursives
- **Modes** : Editeur complet (MtgApp) + Lecteur etudiant (MtgAppLecteur)
- **Export** : .mgj (binaire base64), PNG, JPG, SVG, TikZ, HTML
- **API programmatique** (addApi.js) pour creation de figures par code

#### B. Choix techniques

| Aspect        | Choix                                               | Evaluation                      |
| ------------- | --------------------------------------------------- | ------------------------------- |
| Rendu         | SVG DOM direct                                      | Bon pour education              |
| Architecture  | OOP prototype pre-ES6, 246 fichiers classe          | Extensible mais verbose         |
| Factory       | Type constant (Nat 64-bit flags) -> classe          | Rapide (bitwise) mais cryptique |
| Etat          | Mutation directe + recalcul manuel                  | Pas de reactivity               |
| Serialisation | **Binaire custom** DataInputStream/DataOutputStream | Compact mais indebugable        |
| Build         | Vite (moderne) avec code splitting                  | Bon choix                       |
| Tests         | Quasi inexistants (2 fichiers)                      | Problematique                   |

#### C. A retenir / A eviter

**A retenir** :

- **Separation editeur/lecteur** (MtgApp vs MtgAppLecteur) -> utile pour mode exercice vs mode creation
- **Richesse des objets calcul** (matrices, complexes, suites, derivees) -> reference pour expressions avancees
- **API programmatique** pour creation de figures -> bon pour generation d'exercices
- **Macro/animation** frame-by-frame -> reference pour constructions animees
- **Vite build** avec code splitting intelligent

**A eviter** :

- Prototype-based pre-ES6 (utiliser classes TS)
- Serialisation binaire custom (JSON + Zod)
- Mutations directes sans notification
- System de types Nat (bitwise 64-bit) -> discriminated unions TS
- Quasi-absence de tests

---

### 3.4 tldraw

`extern/tldraw/` | ~200K LOC TypeScript | SVG+DOM (React) | Dessin collaboratif

#### A. Fonctionnalites

- **Formes** : Geo (rect, ellipse, diamond, star, triangle, hexagon), fleches (arc/elbow), dessin libre, lignes, frames, notes, images, videos, embeds
- **Outils** : Select (15+ sous-etats), shape creation, hand, eraser, laser, zoom
- **Collaboration** : WebSocket temps reel, presence (curseurs, selections), offline support
- **Undo/redo** : Delta-based (RecordsDiff), batching, 3 modes capture (IMMEDIATELY/EVENTUALLY/NEVER)

#### B. Choix techniques

| Aspect       | Choix                                              | Evaluation                      |
| ------------ | -------------------------------------------------- | ------------------------------- |
| Rendu        | SVG+DOM (React), minimap WebGL                     | Flexible mais React-only        |
| Architecture | **ShapeUtil pattern** extensible                   | **Excellent**                   |
| Etat         | **Signals custom** (@tldraw/state: Atom, Computed) | Leger, precis, reactive         |
| Outils       | **StateNode hierarchique** (machine a etats)       | **Pattern parfait pour outils** |
| Validation   | @tldraw/validate + migrations schema               | Robuste                         |
| Undo/redo    | **Delta-based** (RecordsDiff)                      | **Meilleur pattern**            |
| Spatial      | **RBush** (R-tree) pour hit-testing                | **Performant O(log n)**         |
| Z-order      | Fractional indexing (collaboratif-safe)            | Elegant                         |
| Geometrie    | Vec, Mat, Box, Geometry2d (primitives)             | **Reutilisable directement**    |

#### C. A retenir / A eviter

**A retenir** (beaucoup de patterns d'excellence) :

- **ShapeUtil pattern** : chaque type geometrique = une classe avec getDefaultProps, getGeometry, component, indicator
- **StateNode hierarchique** : machine a etats pour outils (Idle -> Pointing -> Drawing -> ...)
- **Undo/redo delta-based** avec batching
- **RBush spatial index** pour hit-testing performant
- **Primitives geometriques** (Vec, Mat, Box, Geometry2d) -> reutilisables
- **Validation + migrations** depuis le debut
- **Fractional indexing** pour z-order

**A eviter** :

- Complexite du SelectTool (15+ etats) -> simplifier pour geometrie
- Systeme d'assets complet (CDN, R2) -> premature
- Custom signals library -> utiliser Svelte 5 runes
- Full multiplayer -> differible
- React dependency -> adapter pour Svelte 5

---

### 3.5 Excalidraw

`extern/excalidraw/` | ~150K LOC TypeScript | Canvas + SVG | Dessin style sketch

#### A. Fonctionnalites

- **Elements** : Rectangles, diamonds, ellipses, lignes, fleches (elbow), dessin libre (pression), texte, images, frames, embeds
- **Collaboration** : Temps reel avec versioning + versionNonce
- **Undo/redo** : Delta-based (HistoryDelta extends StoreDelta)
- **Export** : .excalidraw (JSON), SVG, PNG, clipboard

#### B. Choix techniques

| Aspect  | Choix                                               | Evaluation                     |
| ------- | --------------------------------------------------- | ------------------------------ |
| Rendu   | **Canvas 2D + RoughJS** (interactif) + SVG (export) | Dual performant                |
| Etat    | **Jotai atoms** + delta store                       | Fine-grained                   |
| Types   | **Branded types** (Radians, FontString, FileId)     | **Excellent pour type safety** |
| Bounds  | **WeakMap cache** + invalidation par version        | Performant                     |
| Z-order | **Fractional indexing**                             | Collaboratif-safe              |
| Collab  | version + versionNonce pour resolution de conflits  | Eprouve                        |

#### C. A retenir / A eviter

**A retenir** :

- **Branded types** (`Radians = number & { _brand: "radian" }`) -> zero-cost type safety
- **WeakMap pour cache** de bounds avec invalidation automatique
- **@excalidraw/math** (Vec, Point, angle) -> package reutilisable sans React
- **Dual rendering** Canvas (interactif) + SVG (export)
- **Element model immutable** avec version tracking
- Viewport culling pour performance

**A eviter** :

- RoughJS (style sketch != precision geometrique)
- React dependency profonde
- Jotai specifique React

---

### 3.6 InstrumenPoche

`extern/instrumenpoche-main/` | ~8K LOC JavaScript | SVG | Instruments geometriques virtuels

#### A. Fonctionnalites

- **6 instruments** : Compas (ecarter/lever/coucher/retourner), Regle (graduee, longueur variable), Equerre, Rapporteur, Requerre (regle+equerre combinee), Crayon
- **22 types d'objets** : points, segments, droites, demi-droites, cercles, arcs, angles, polygones, textes (MathJax), grilles, images
- **24 actions** : creation, instrument manipulation (translation, rotation, zoom), annotation, pause
- **Scripts XML declaratifs** avec timeline et tempo
- **Viewer uniquement** (pas d'edition, pas d'undo)

#### B. Choix techniques

| Aspect       | Choix                                         | Evaluation                    |
| ------------ | --------------------------------------------- | ----------------------------- |
| Rendu        | SVG DOM (createElementNS)                     | Simple, accessible            |
| Architecture | OOP prototype + heritage                      | Adequat pour viewer           |
| Scripts      | **XML declaratif** avec actions sequentielles | **Pedagogiquement excellent** |
| Animation    | setInterval(25ms) = 40fps                     | Fonctionnel                   |
| Integration  | **iepLoadPromise** (embedable, cross-domain)  | Bien pense                    |
| MathJax      | Integration pour texte LaTeX                  | Utile                         |

#### C. A retenir / A eviter

**A retenir** :

- **Paradigme instrument-based** (regle, compas physiques) -> authenticite pedagogique, proche de la pratique reelle des eleves
- **Scripts XML declaratifs** avec tempo -> modele deja importe dans constructions/ (converter.ts)
- **Pattern save initial/restore** (xinit, yinit sur chaque objet pour reset)
- **Separation construction/lecture** -> exercices interactifs vs demonstrations
- Controles timeline (play/pause/step/reset)

**A eviter** :

- Animations setInterval (preferer requestAnimationFrame)
- Pas d'undo/redo
- Timeline lineaire sans branchement conditionnel
- XML sans schema de validation (echec silencieux)

---

### 3.7 OpenBoard

`extern/OpenBoard/` | ~200K+ LOC C++ (Qt) | Qt Graphics View | Tableau blanc interactif

#### A. Fonctionnalites

- **Outils** : Stylo (pression), gomme, marqueur, selecteur, texte, capture, zoom, pointeur, ligne
- **Instruments** : Regle, rapporteur, compas, equerre, axes, loupe
- **Widgets** : 19+ applications web W3C embedees (calculatrice, horloge, carte, QR-code...)
- **Import/Export** : .ubz (SVG archive), PDF, HTML, IWB, images, video
- **Undo/redo** : QUndoStack avec commandes typees
- **Multi-ecran** : Vue controle + vue affichage

#### B. A retenir / A eviter

**A retenir** :

- **Pattern Command** pour undo/redo (chaque operation = QUndoCommand)
- **Z-layer system** detaille (12 couches : Background, Object, Drawing, Tool, etc.)
- **Separation controle/affichage** (presenter mode)
- **Persistence en arriere-plan** (thread dedie, non-bloquant)

**A eviter** :

- Stack C++/Qt (pas applicable au web)
- Multi-controller pattern verbose
- Widget W3C overkill pour notre usage
- Desktop-only

---

## 4. Themes transversaux

### 4.1 Rendu : SVG vs Canvas

| Aspect            | SVG                                                                          | Canvas 2D                      |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| **Qui l'utilise** | constructions/, whiteboard/, grapheur/, apigeom, MathGraph32, InstrumenPoche | DGPad, Excalidraw (interactif) |
| **Performance**   | DOM overhead, OK < 500 objets                                                | Immediat, OK > 1000 objets     |
| **Qualite**       | Vectoriel natif, zoom infini                                                 | Pixelise si pas gere           |
| **Interactivite** | Evenements natifs par element                                                | Hit-testing manuel             |
| **Export**        | Trivial (clone DOM)                                                          | Necessite conversion           |
| **Texte**         | Rendu natif + LaTeX                                                          | Complexe (mesure, rendu)       |
| **Accessibilite** | ARIA, role, semantique                                                       | Aucune                         |
| **Style**         | CSS, animations CSS                                                          | Programmatique                 |
| **Debugging**     | Inspecteur DOM                                                               | Opaque                         |

**Recommandation pour ubumaths** : **SVG** comme rendu principal.

- Les cas d'usage educatifs restent < 500 objets
- L'accessibilite et l'export sont critiques
- Le texte/LaTeX est omnipresent
- Le debugging est facilite
- Canvas uniquement si besoin de perf specifique (lieux de points, traceurs denses)

---

### 4.2 Architectures

| Pattern                             | Qui l'utilise                      | Forces                              | Faiblesses                          |
| ----------------------------------- | ---------------------------------- | ----------------------------------- | ----------------------------------- |
| **OOP classes + Observer**          | apigeom                            | Heritage clair, dependency tracking | Fichiers nombreux, update cascade   |
| **OOP prototype + mixins**          | DGPad, MathGraph32, InstrumenPoche | Simple, legacy                      | Pas de vrai heritage, pas type-safe |
| **Fonctionnel pur + Store reactif** | grapheur/                          | Testable, composable, Svelte natif  | Pas de dependency graph             |
| **Types immutables + fonctionnel**  | whiteboard/                        | Predictable, Svelte natif           | Pas de graphe de dependances        |
| **ShapeUtil + StateNode**           | tldraw                             | Extensible, machine a etats         | Complexite, React                   |
| **Elements immutables + Canvas**    | Excalidraw                         | Performance, collaboration          | React, pas geometrique              |

**Recommandation** : **Hybride** - Coeur fonctionnel pur (comme grapheur/) + Observer pattern pour dependency graph (comme apigeom) + Store Svelte 5 pour UI reactif.

---

### 4.3 Dependency graphs

| Outil              | Methode                                 | Avantages               | Limites                                                     |
| ------------------ | --------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| **apigeom**        | Observer (subscribe/notify/update)      | Explicite, debuggable   | Pas de dedup (observer appele N fois si N parents changent) |
| **DGPad**          | Parent/child lists + computeAll O(n)    | Simple, ordre implicite | Recalcul complet a chaque changement                        |
| **MathGraph32**    | References directes + recalcul manuel   | Controle total          | Oublis faciles, pas incremental                             |
| **tldraw**         | Bindings + signals reactifs             | Performant, automatique | Pas concu pour geometrie                                    |
| **constructions/** | Implicite par ordre de creation         | Simple                  | Fragile, pas de cycles                                      |
| **whiteboard/**    | Bindings normalises (fleches -> formes) | Position-independent    | Limite aux fleches                                          |

**Recommandation** : Adopter le pattern **Observer d'apigeom** avec ameliorations :

1. **Deduplication** : marquer dirty + batch update en fin de frame (pas de cascades multiples)
2. **Topological sort** : trier les objets par dependance pour garantir l'ordre
3. **Cycle detection** : verifier a la creation qu'on n'introduit pas de cycle
4. **Dirty flags** : ne recalculer que les objets dont un parent a change

---

### 4.4 Systemes d'expressions

| Outil              | Technologie                       | Capacites                                                    |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| **constructions/** | MathAST custom                    | $param, $obj.x, sin/cos/sqrt/pi, evaluation safe             |
| **grapheur/**      | MathAST (LaTeX -> AST)            | Fonctions completes, variables libres detectees              |
| **apigeom**        | MathJS                            | Expressions completes, templates $${var}$$                   |
| **DGPad**          | Symbolique custom                 | Variables x/y/z/t, **derivation automatique**                |
| **MathGraph32**    | Parser custom + mathjs (matrices) | Fonctions 1-3 var, complexes, matrices, derivees, integrales |

**Recommandation** : Reutiliser **MathAST** (deja dans le projet) comme base. Ajouter si besoin :

- Variables geometriques ($point.x, $distance.value)
- Derivation symbolique (inspirer de DGPad)
- Templates pour textes dynamiques (inspirer d'apigeom)

---

## 5. Recommandations

### 5.1 Idees a reprendre par outil

| Source             | Idee                                              | Priorite  | Complexite                  |
| ------------------ | ------------------------------------------------- | --------- | --------------------------- |
| **apigeom**        | Observer pattern (subscribe/notify)               | Haute     | Faible                      |
| **apigeom**        | API generique create\<T\>()                       | Haute     | Faible                      |
| **apigeom**        | Nombres dynamiques (Distance, Angle) comme objets | Haute     | Moyenne                     |
| **apigeom**        | Systeme de validation (check/)                    | Haute     | Moyenne                     |
| **apigeom**        | Label auto-repositionnement                       | Moyenne   | Moyenne                     |
| **tldraw**         | ShapeUtil pattern (behavior per type)             | Haute     | Moyenne                     |
| **tldraw**         | StateNode hierarchique pour outils                | Haute     | Moyenne                     |
| **tldraw**         | Undo/redo delta-based                             | Haute     | Moyenne                     |
| **tldraw**         | RBush spatial index                               | Moyenne   | Faible (lib externe)        |
| **tldraw**         | Primitives Vec, Mat, Box                          | Haute     | Faible (copier)             |
| **grapheur/**      | CoordinateTransformer                             | Haute     | Faible (extraire)           |
| **grapheur/**      | Viewport (pan/zoom/metrics)                       | Haute     | Faible (extraire)           |
| **grapheur/**      | Bezier curves (Catmull-Rom)                       | Moyenne   | Faible (extraire)           |
| **grapheur/**      | Export SVG/PNG pipeline                           | Moyenne   | Faible (extraire)           |
| **grapheur/**      | Color palette + getNextColor                      | Faible    | Faible (extraire)           |
| **Excalidraw**     | Branded types (Radians, etc.)                     | Haute     | Faible                      |
| **Excalidraw**     | WeakMap bounds cache                              | Moyenne   | Faible                      |
| **DGPad**          | Alpha parametre (points sur objets)               | Haute     | Moyenne                     |
| **DGPad**          | Dual coordinate system                            | Haute     | Faible (deja dans grapheur) |
| **DGPad**          | Macros utilisateur                                | Basse     | Haute                       |
| **constructions/** | Timeline animation + instruments                  | Deja fait | -                           |
| **constructions/** | Validation Zod des scripts                        | Haute     | Faible (etendre)            |
| **whiteboard/**    | Binding normalise (0-1)                           | Moyenne   | Faible                      |
| **whiteboard/**    | Types immutables readonly                         | Haute     | Faible                      |
| **InstrumenPoche** | Paradigme instruments physiques                   | Deja fait | -                           |

### 5.2 Architecture proposee (geometry-core)

```
src/lib/geometry-core/
├── types/
│   ├── primitives.ts        # Point, Vec, Mat, Box, Radians (branded)
│   ├── elements.ts          # GeoElement union type (GeoPoint, GeoLine, GeoCircle...)
│   ├── dynamic-numbers.ts   # Distance, Angle, Area, Expression
│   └── schemas.ts           # Zod schemas pour validation/serialisation
│
├── graph/
│   ├── observer.ts          # subscribe/notify/update (inspire apigeom)
│   ├── dependency-graph.ts  # Topological sort, cycle detection, dirty flags
│   └── construction.ts      # Collection d'objets + factory create<T>()
│
├── geometry/
│   ├── intersections.ts     # Line-line, line-circle, circle-circle
│   ├── transformations.ts   # Rotation, reflection, translation, homothety
│   ├── measurements.ts      # Distance, angle, area, perimeter
│   ├── projections.ts       # Point on line, point on circle (alpha param)
│   └── predicates.ts        # isParallel, isPerpendicular, isCollinear...
│
├── viewport/
│   ├── coordinate-system.ts # Math <-> SVG transformer (extrait de grapheur/)
│   ├── viewport.ts          # Pan, zoom, fit, metrics (extrait de grapheur/)
│   └── spatial-index.ts     # RBush wrapper pour hit-testing
│
├── rendering/
│   ├── svg-renderer.ts      # Element -> SVG (paths, shapes, labels)
│   ├── bezier.ts            # Catmull-Rom, curves (extrait de grapheur/)
│   └── labels.ts            # Auto-positioning, anti-overlap
│
├── history/
│   ├── delta.ts             # RecordsDiff (inspire tldraw)
│   ├── history-manager.ts   # Undo/redo stacks avec batching
│   └── snapshot.ts          # Serialisation/deserialisation
│
├── validation/
│   ├── check-point.ts       # Verification position (inspire apigeom check/)
│   ├── check-distance.ts    # Verification distances
│   ├── check-angle.ts       # Verification angles
│   └── check-construction.ts # Verification constructions completes
│
├── export/
│   ├── svg-export.ts        # Export SVG (extrait de grapheur/)
│   ├── png-export.ts        # Export PNG (extrait de grapheur/)
│   └── latex-export.ts      # Export LaTeX/TikZ (inspire apigeom)
│
└── tools/
    ├── tool-state.ts        # StateNode base (inspire tldraw)
    ├── point-tool.ts        # Outil creation de points
    ├── line-tool.ts         # Outil creation de lignes
    ├── circle-tool.ts       # Outil creation de cercles
    └── select-tool.ts       # Selection, drag, resize, rotate
```

**Principes architecturaux** :

1. **Coeur fonctionnel pur** : toutes les fonctions de calcul geometrique sont pures (pas de side effects)
2. **Observer pattern** pour le graphe de dependances (objets notifient leurs observeurs)
3. **Store Svelte 5** pour la couche reactive UI ($state, $derived)
4. **Types immutables** (readonly) avec branded types pour la surete
5. **Validation Zod** a chaque frontiere (import, edition utilisateur)
6. **Delta-based history** pour undo/redo performant

### 5.3 Partage avec les modules existants

```
src/lib/
├── geometry-core/          # NOUVEAU - librairie commune
│   ├── viewport/           # EXTRAIT de grapheur/ (100% reutilisable)
│   ├── rendering/          # EXTRAIT de grapheur/ (bezier, export)
│   └── ...
│
├── constructions/          # EXISTANT - consomme geometry-core
│   ├── core/engine.ts      # Utilise geometry-core/viewport + rendering
│   ├── instruments/        # Garde ses instruments specifiques
│   └── ...
│
├── whiteboard/             # EXISTANT - consomme geometry-core partiellement
│   ├── core/               # Garde son systeme de formes
│   ├── types/              # Pourrait utiliser geometry-core/types
│   └── ...
│
├── grapheur/               # EXISTANT - extrait ses parties communes
│   ├── evaluator.ts        # Garde (specifique aux fonctions)
│   ├── sampler.ts          # Garde (specifique aux fonctions)
│   ├── analysis.ts         # Garde (specifique aux fonctions)
│   └── ...                 # viewport, bezier, colors, export -> geometry-core
│
└── components/
    └── geometry/           # NOUVEAU - composants Svelte 5
        ├── GeometryCanvas.svelte
        ├── Toolbar.svelte
        └── PropertyPanel.svelte
```

**Migration progressive** :

1. Creer `geometry-core/viewport/` en extrayant de `grapheur/viewport.ts` + `grapheur/bezier.ts`
2. Faire pointer `grapheur/` vers `geometry-core/viewport/` (re-exports)
3. Faire pointer `constructions/` vers `geometry-core/viewport/` pour son CoordinateTransformer
4. Ajouter `geometry-core/graph/` (observer pattern)
5. Ajouter `geometry-core/geometry/` (calculs purs)
6. Construire les composants Svelte 5 par-dessus

### 5.4 Priorisation des fonctionnalites

#### Phase 1 : Fondations (geometry-core minimal)

| Fonctionnalite                                                  | Source d'inspiration       |
| --------------------------------------------------------------- | -------------------------- |
| Types de base (Point, Line, Circle, Polygon) avec branded types | Excalidraw + apigeom       |
| CoordinateTransformer + Viewport (pan/zoom)                     | grapheur/ (extraction)     |
| Dependency graph (observer + topological sort)                  | apigeom + ameliorations    |
| Rendu SVG basique (points, segments, cercles)                   | apigeom                    |
| Create\<T\>() factory                                           | apigeom                    |
| Zod schemas                                                     | constructions/ (extension) |

#### Phase 2 : Interactivite de base

| Fonctionnalite                                   | Source d'inspiration |
| ------------------------------------------------ | -------------------- |
| Tool state machine (point, line, circle, select) | tldraw (StateNode)   |
| Drag de points (avec update dependances)         | apigeom + DGPad      |
| Hit-testing (RBush spatial index)                | tldraw               |
| Snap-to (grille, points, intersections)          | whiteboard/ + tldraw |
| Undo/redo delta-based                            | tldraw               |

#### Phase 3 : Geometrie riche

| Fonctionnalite                                                | Source d'inspiration |
| ------------------------------------------------------------- | -------------------- |
| Intersections (LL, LC, CC)                                    | apigeom              |
| Transformations (rotation, symetrie, translation, homothetie) | apigeom + DGPad      |
| Points contraints (sur droite, sur cercle, alpha param)       | DGPad                |
| Nombres dynamiques (distance, angle, aire)                    | apigeom              |
| Labels auto-positionnes                                       | apigeom              |

#### Phase 4 : Cas d'usage specifiques

| Fonctionnalite                                          | Source d'inspiration            |
| ------------------------------------------------------- | ------------------------------- |
| Constructions animees (integration avec constructions/) | constructions/ + InstrumenPoche |
| Validation de figures (exercices interactifs)           | apigeom (check/)                |
| Export LaTeX/TikZ                                       | apigeom                         |
| Expressions dynamiques ($param, textes templates)       | constructions/ + apigeom        |
| Figures statiques pour enonces                          | apigeom (isDynamic=false)       |

#### Phase 5 : Avance

| Fonctionnalite                | Source d'inspiration |
| ----------------------------- | -------------------- |
| Lieux de points               | DGPad                |
| Graphes de fonctions integres | grapheur/            |
| Macros utilisateur            | DGPad                |
| Mode dessin libre             | whiteboard/          |
| Coniques                      | DGPad                |

---

## Annexe : Fichiers cles par projet

### Internes ubumaths

- `src/lib/constructions/core/engine.svelte.ts` (2715 LOC) - moteur principal
- `src/lib/constructions/schemas.ts` (800+ LOC) - schemas Zod
- `src/lib/constructions/converter.ts` (800+ LOC) - import IEP XML
- `src/lib/whiteboard/stores/whiteboard.svelte.ts` (2000+ LOC) - store principal
- `src/lib/whiteboard/types/document.ts` (894 LOC) - types elements
- `src/lib/whiteboard/core/elbow-routing.ts` (932 LOC) - routage fleches A\*
- `src/lib/grapheur/viewport.ts` - viewport et transformations
- `src/lib/grapheur/bezier.ts` - courbes Catmull-Rom -> Bezier
- `src/lib/grapheur/evaluator.ts` - evaluation d'expressions

### Externes

- `extern/apigeom/src/Figure.ts` (1744 LOC) - classe centrale
- `extern/apigeom/src/elements/Element2D.ts` - classe de base
- `extern/apigeom/src/uiMachine.ts` (168KB) - machine a etats XState
- `extern/apigeom/src/check/` (20 fichiers) - validation geometrique
- `extern/dgpad/scripts/Construction.js` (1797 LOC) - modele de donnees
- `extern/dgpad/scripts/CoordsSystem.js` (504 LOC) - coordonnees
- `extern/dgpad/scripts/Expression.js` (250 LOC) - expressions symboliques
- `extern/mathgraph-main/src/MtgAppBase.js` (3347 LOC) - app principale
- `extern/instrumenpoche-main/src/app/IepDoc.js` - controleur timeline
