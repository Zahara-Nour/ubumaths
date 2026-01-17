# Whiteboard - Documentation de Progression

## Etat actuel

**Phase completee** : Phase 11 - Route + Integration (WHITEBOARD COMPLETE)
**Date** : 2025-12-17
**Commit** : `e2683681`
**Statut** : ✅ IMPLEMENTATION TERMINEE

---

## Phase 11 : Route + Integration

### Fichiers crees

| Fichier                                             | Description                             |
| --------------------------------------------------- | --------------------------------------- |
| `src/routes/(protected)/whiteboard/+page.svelte`    | Page principale whiteboard              |
| `src/routes/(protected)/whiteboard/+page.server.ts` | Auth check (students, teachers, admins) |

### Tests crees

Aucun nouveau test (integration via tests existants)

**Total cumule : 532 tests (474 server + 58 client)**

### Fonctionnalites implementees

1. **Route protegee** : `/whiteboard` accessible uniquement aux utilisateurs authentifies
2. **Controle d'acces** : students, teachers, admins uniquement
3. **Layout responsive** : Hauteur 100vh - navbar
4. **SEO** : Titre et meta description en francais

### Quality Checks

- **Lint** : 0 erreurs whiteboard (12 erreurs pre-existantes dans autres fichiers)
- **TypeScript** : 0 erreurs whiteboard (erreurs pre-existantes liees aux types database)

---

## Phase 10 : Export (PNG, SVG, PDF)

### Fichiers crees

| Fichier                                             | Description                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| `src/lib/whiteboard/core/pdf-export.ts`             | Export PNG, SVG, PDF (jspdf)                      |
| `src/lib/whiteboard/components/ExportDialog.svelte` | Dialog options export (format, resolution, pages) |
| `src/lib/whiteboard/tests/export.test.ts`           | Tests export (47 tests)                           |

### Fichiers modifies

| Fichier                                                  | Modifications          |
| -------------------------------------------------------- | ---------------------- |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Bouton Export + Dialog |

### Dependances ajoutees

- `jspdf@3.0.4` - Generation PDF client-side (lazy loaded)

### Tests crees

| Fichier                                   | Tests    |
| ----------------------------------------- | -------- |
| `src/lib/whiteboard/tests/export.test.ts` | 47 tests |

**Total Phase 10 : 47 nouveaux tests**
**Total cumule : 532 tests**

### Fonctionnalites implementees

1. **Export PNG** : 1x, 2x, 3x resolution (choix utilisateur)
2. **Export SVG** : Export vectoriel
3. **Export PDF** : Multi-pages avec jspdf (lazy loaded)
4. **Selection pages** : Page courante, toutes, ou selection personnalisee
5. **Instruments inclus** : Option pour inclure/exclure instruments
6. **Indicateur progression** : Pour documents > 5 pages
7. **Bouton Export** : Dans toolbar, ouvre ExportDialog

### Decisions techniques

1. **jspdf lazy loading** : Charge uniquement si export PDF demande
2. **Resolution PNG** : Choix 1x/2x/3x (par defaut 2x)
3. **Canvas rendering** : SVG -> Canvas -> PNG pour haute qualite
4. **Memory management** : Canvas cleanup dans error handlers

### Security Review

- **Score** : Secure (apres corrections)
- **Reviewer** : code-reviewer agent (implicit security)
- **Issues corrigees** :
  - **XSS in foreignObject** : Remplace par native SVG text elements
  - **XSS image sources** : sanitizeImageSrc() rejette javascript:, http:, SVG data URLs
  - **Memory leaks** : Canvas cleanup (width=0, height=0) dans onerror
  - **Download timing** : setTimeout(1000ms) avant URL.revokeObjectURL
  - **Accessibility** : aria-label/describedby sur custom pages input
  - **French translations** : Tous messages d'erreur en francais

---

## Phase 9 : Stockage local + Google Drive

### Fichiers crees

| Fichier                                            | Description                                     |
| -------------------------------------------------- | ----------------------------------------------- |
| `src/lib/whiteboard/utils/file-operations.ts`      | Validation .ubw, serialization, download/upload |
| `src/lib/whiteboard/utils/sync-state.ts`           | Sync state management for Google Drive          |
| `src/lib/whiteboard/tests/file-operations.test.ts` | Tests file operations (56 tests)                |
| `src/lib/whiteboard/tests/google-drive.test.ts`    | Tests sync state management (47 tests)          |

### Fichiers modifies

| Fichier                                                  | Modifications                                        |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`         | File ops (save/load .ubw), sync state management     |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Section Fichier + boutons Nouveau/Sauvegarder/Ouvrir |

### Tests crees

| Fichier                                            | Tests    |
| -------------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/file-operations.test.ts` | 56 tests |
| `src/lib/whiteboard/tests/google-drive.test.ts`    | 47 tests |

**Total Phase 9 : 103 nouveaux tests**
**Total cumule : 485 tests**

### Fonctionnalites implementees

1. **File validation** : Zod schema validation pour .ubw files
2. **Filename generation** : Auto-generate from document title
3. **File download** : Blob + object URL pour telechargement local
4. **File upload** : FileReader API pour chargement fichier
5. **Sync state** : Types et helpers pour Google Drive sync status
6. **Auto-sync scheduling** : 5s debounce pour modifications
7. **Toolbar File section** : Nouveau, Sauvegarder, Ouvrir buttons
8. **Unsaved indicator** : Yellow dot quand modifications non sauvegardees
9. **Filename prompts** : Demande nom document au premier save
10. **Confirmation dialogs** : Warn before losing unsaved changes

### Decisions techniques

1. **Local file first** : Stockage local .ubw implemente en premier
2. **Google Drive deferred** : API Drive necessite changement scope OAuth (drive.readonly -> drive.file)
3. **Sync state preparation** : Infrastructure prete pour Drive integration future
4. **Filename validation** : Caracteres invalides (<>:"/\|?\*) rejetes

### Code Review

- **Score** : Good (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - DOM refs sans $state() (plain variables suffisent pour bind:this)
  - saveToFile() retourne maintenant result object avec success/error
  - Color picker utilise oninput au lieu de onchange (feedback immediat)
  - Filename validation ajoutee dans saveToFile()

---

## Phase 8 : Import images + PDF

### Fichiers crees

| Fichier                                           | Description                               |
| ------------------------------------------------- | ----------------------------------------- |
| `src/lib/whiteboard/utils/image-loader.ts`        | Validation, chargement, compression image |
| `src/lib/whiteboard/utils/pdf-loader.ts`          | Import PDF avec pdfjs-dist                |
| `src/lib/whiteboard/components/ImageLayer.svelte` | Couche SVG images (drag + resize)         |
| `src/lib/whiteboard/tests/image-import.test.ts`   | Tests import images (54 tests)            |
| `src/lib/whiteboard/tests/pdf-import.test.ts`     | Tests import PDF (42 tests)               |

### Fichiers modifies

| Fichier                                                  | Modifications                                          |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`         | Image ops (add, move, resize), background ops, PDF ops |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte`  | ImageLayer + image/PDF background rendering            |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Section Import + boutons Image/PDF                     |
| `src/lib/whiteboard/types/document.ts`                   | ImageElement, PageBackground types                     |

### Dependances ajoutees

- `pdfjs-dist@4.10.39` - Import PDF (lazy loaded)

### Tests crees

| Fichier                                         | Tests    |
| ----------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/image-import.test.ts` | 54 tests |
| `src/lib/whiteboard/tests/pdf-import.test.ts`   | 42 tests |

**Total Phase 8 : 96 nouveaux tests**
**Total cumule : 324 tests**

### Fonctionnalites implementees

1. **Image validation** : Types (PNG, JPG, SVG, WebP), taille max 5MB
2. **Image compression** : JPEG 80% qualite, max 2000px dimension
3. **Image storage** : Data URL (portable, inclus dans .ubw)
4. **PDF validation** : Type PDF, taille max 20MB
5. **PDF import** : pdfjs-dist lazy loaded, selection pages
6. **PDF as background** : Page annotable avec fond PDF
7. **Image manipulation** : Drag-to-move, 8 handles resize
8. **Toolbar section** : Import toggle, boutons Image/PDF
9. **Fit modes** : fit, fill, stretch pour backgrounds
10. **Auto-create pages** : Import PDF multi-pages cree toutes les pages

### Decisions techniques

1. **Data URL vs fichiers externes** : Data URL choisi pour portabilite
2. **Compression images** : JPEG avec 80% qualite, redimensionnement si >2000px
3. **PDF lazy loading** : pdfjs-dist charge uniquement si PDF importe
4. **PDF render scale** : 2x pour haute resolution

### Code Review

- **Score** : Good (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - `getSvgDimensions()` : validation format data URL, defensive array access
  - `getCanvasScale()` : validation viewBox, NaN checks, division by zero
  - `compressImage()` : cleanup canvas dans finally block pour GC

---

## Phase 7 : Multi-pages

### Fichiers crees

| Fichier                                               | Description                    |
| ----------------------------------------------------- | ------------------------------ |
| `src/lib/whiteboard/components/PageThumbnails.svelte` | Sidebar droite avec thumbnails |
| `src/lib/whiteboard/tests/multipage.test.ts`          | Tests multi-pages (46 tests)   |

### Fichiers modifies

| Fichier                                           | Modifications                                 |
| ------------------------------------------------- | --------------------------------------------- |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`  | reorderPages, sidebar state, currentPageIndex |
| `src/lib/whiteboard/components/Whiteboard.svelte` | PageThumbnails + PageUp/Down + layout sidebar |

### Tests crees

| Fichier                                      | Tests    |
| -------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/multipage.test.ts` | 46 tests |

**Total Phase 7 : 46 nouveaux tests**
**Total cumule : 228 tests**

### Fonctionnalites implementees

1. **Sidebar droite** : Thumbnails 100px wide avec ratio A4
2. **Toggle sidebar** : Bouton chevron pour afficher/masquer
3. **Navigation pages** : Click sur thumbnail pour changer page
4. **Add/Delete pages** : Boutons + et X avec confirmation suppression
5. **Drag & drop** : Reordonner pages par glisser-deposer
6. **Keyboard navigation** : Ctrl+Arrows pour reorder, Enter/Space pour select
7. **SVG preview** : Miniatures avec apercu simplifie des elements
8. **Raccourcis clavier** : PageUp/PageDown dans Whiteboard
9. **Layout responsive** : Canvas ajuste selon visibilite sidebar

### Code Review

- **Score** : Good (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - Keyboard reorder support (Ctrl+Arrow keys)
  - Window blur drag state cleanup via $effect
  - Defensive SVG checks (null guards)
  - ARIA attributes (role, aria-label, aria-current)
  - tabindex="0" pour focus keyboard

---

## Phase 6 : TextBlocks

### Fichiers crees

| Fichier                                               | Description                          |
| ----------------------------------------------------- | ------------------------------------ |
| `src/lib/whiteboard/components/TextBlock.svelte`      | Composant bloc texte VIEW/EDIT modes |
| `src/lib/whiteboard/components/TextBlockLayer.svelte` | Conteneur des blocs texte            |
| `src/lib/whiteboard/tests/textblock.test.ts`          | Tests TextBlock (42 tests)           |

### Fichiers modifies

| Fichier                                                  | Modifications                                |
| -------------------------------------------------------- | -------------------------------------------- |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`         | TextBlock ops (create, update, resize, move) |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte`  | Integration TextBlockLayer + text tool       |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Bouton outil Text (T)                        |
| `src/lib/whiteboard/components/Whiteboard.svelte`        | Raccourci T + contentEditable check          |

### Tests crees

| Fichier                                      | Tests    |
| -------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/textblock.test.ts` | 42 tests |

**Total Phase 6 : 42 nouveaux tests**
**Total cumule : 182 tests**

### Fonctionnalites implementees

1. **TextBlock component** : Bloc texte avec modes VIEW et EDIT
2. **Mode VIEW** : MarkdownRenderer avec double-clic pour editer
3. **Mode EDIT** : RichTextEditor avec support LaTeX (MathLive)
4. **Drag** : Deplacement des blocs par drag (mode VIEW uniquement)
5. **Resize** : 8 handles de redimensionnement avec contraintes min (150x50)
6. **Sortie edit** : Escape ou clic exterieur sauvegarde et sort
7. **Outil Text** : Bouton toolbar + raccourci T
8. **Focus auto** : Focus sur l'editeur en entrant mode edit

### Code Review

- **Score** : Good (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - `resizeAndMoveTextBlock()` combine pour eviter double history entries
  - Click-outside avec capture phase (sans delai 100ms)
  - Focus management auto sur contenteditable
  - ContentEditable check pour keyboard shortcuts

---

## Phase 5 : Instruments educatifs

### Fichiers crees

| Fichier                                                | Description                              |
| ------------------------------------------------------ | ---------------------------------------- |
| `src/lib/whiteboard/components/InstrumentLayer.svelte` | Couche SVG instruments (drag + rotation) |
| `src/lib/whiteboard/tests/instruments.test.ts`         | Tests etat instruments                   |

### Fichiers modifies

| Fichier                                                  | Modifications                                      |
| -------------------------------------------------------- | -------------------------------------------------- |
| `src/lib/whiteboard/types/document.ts`                   | InstrumentType, InstrumentState, factory functions |
| `src/lib/whiteboard/types/file-format.ts`                | Schema Zod validation instruments                  |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`         | 7 methodes instruments + getter                    |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte`  | Integration InstrumentLayer                        |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Section instruments toggle + boutons               |
| `src/lib/whiteboard/index.ts`                            | Exports instruments                                |

### Tests crees

| Fichier                                        | Tests    |
| ---------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/instruments.test.ts` | 23 tests |

**Total Phase 5 : 23 nouveaux tests**
**Total cumule : 198 tests**

### Fonctionnalites implementees

1. **Types instruments** : InstrumentType ('ruler', 'protractor', 'setSquare'), InstrumentState
2. **Constantes** : DEFAULT_INSTRUMENTS, INSTRUMENT_LABELS, createDefaultInstruments()
3. **Schema Zod** : Validation instruments dans file-format.ts
4. **Store methods** : toggleInstrument, showInstrument, hideInstrument, updateInstrumentPosition, updateInstrumentRotation, updateInstrument, resetInstruments
5. **InstrumentLayer** : Composant SVG avec drag-to-move et rotation handle
6. **Toolbar section** : Instruments toggle buttons avec indicateur visuel
7. **Reutilisation** : Ruler.svelte, Protractor.svelte, SetSquare.svelte existants

### Code Review

- **Score** : Excellent (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - Calcul rotation corrige (angle delta depuis start angle)
  - Error handling setPointerCapture avec try-catch
  - Constantes ROTATION_HANDLE_POSITIONS extraites
  - Champs dragState renommes pour clarte (startPointerX/Y)

---

## Phase 4 : Toolbar + Selection d'outils

### Fichiers crees

| Fichier                                                  | Description                 |
| -------------------------------------------------------- | --------------------------- |
| `src/lib/whiteboard/components/WhiteboardToolbar.svelte` | Toolbar horizontale en bas  |
| `src/lib/whiteboard/tests/toolbar.test.ts`               | Tests configuration toolbar |

### Fichiers modifies

| Fichier                                           | Modifications                          |
| ------------------------------------------------- | -------------------------------------- |
| `src/lib/whiteboard/components/Whiteboard.svelte` | Integration toolbar, suppression hints |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts`  | Ajout setColor, setStrokeWidth         |
| `src/lib/whiteboard/index.ts`                     | Export WhiteboardToolbar               |

### Tests crees

| Fichier                                    | Tests    |
| ------------------------------------------ | -------- |
| `src/lib/whiteboard/tests/toolbar.test.ts` | 27 tests |

**Total Phase 4 : 27 nouveaux tests**
**Total cumule : 175 tests**

### Fonctionnalites implementees

1. **Toolbar horizontale en bas** avec sections depliables animees
2. **Sections** : Dessin (pen, highlighter, eraser), Formes (line, rect, circle, arrow)
3. **Color picker** avec 6 presets + couleur custom
4. **Slider epaisseur** 1-20px avec preview visuel
5. **Actions** : Undo, Redo, Clear (avec confirmation)
6. **Accessibilite** : aria-labels, aria-pressed, aria-expanded, keyboard nav

### Code Review

- **Score** : Good (apres corrections)
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - Confirmation avant clear (protection perte donnees)
  - Direction chevrons corrigee (UX standard)
  - setColor() affecte uniquement l'outil courant (coherence)
  - aria-pressed sur boutons couleur
  - aria-label sur slider
  - Utilisation constante STROKE_WIDTH_MAX

---

## Phase 3 : Formes geometriques

### Fichiers crees

| Fichier                                   | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `src/lib/whiteboard/core/shapes.ts`       | Utilitaires creation/rendu des formes |
| `src/lib/whiteboard/tests/shapes.test.ts` | Tests formes geometriques             |

### Fichiers modifies

| Fichier                                                 | Modifications                            |
| ------------------------------------------------------- | ---------------------------------------- |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte` | Ajout dessin formes + preview pointilles |
| `src/lib/whiteboard/components/Whiteboard.svelte`       | Raccourcis clavier L, R, C, A            |
| `src/lib/whiteboard/index.ts`                           | Export module shapes                     |

### Tests crees

| Fichier                                   | Tests    |
| ----------------------------------------- | -------- |
| `src/lib/whiteboard/tests/shapes.test.ts` | 23 tests |

**Total Phase 3 : 23 nouveaux tests**
**Total cumule : 148 tests**

### Fonctionnalites implementees

1. **Outils de forme** : line, rectangle, circle, arrow
2. **Preview pointilles** pendant le dessin
3. **Arrow marker** pour les fleches (SVG marker)
4. **Validation formes** : lignes min 5px, rectangles/cercles dimensions non-zero
5. **Raccourcis clavier** : L (line), R (rectangle), C (circle), A (arrow)
6. **Rendu SVG** : line, rect, ellipse avec support inverted coordinates

### Code Review

- **Score** : Good
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - Null safety amelioree dans `finalizeShape()` (capture locale des points)
  - Validation differenciee : lignes/fleches 5px min, rectangles/cercles non-zero width ET height

---

## Phase 2 : Canvas + Dessin de base

### Fichiers crees

| Fichier                                                 | Description                              |
| ------------------------------------------------------- | ---------------------------------------- |
| `src/lib/whiteboard/core/stroke-smoothing.ts`           | Integration perfect-freehand + geometrie |
| `src/lib/whiteboard/components/WhiteboardCanvas.svelte` | Canvas SVG multi-couches                 |
| `src/lib/whiteboard/components/Whiteboard.svelte`       | Conteneur principal + raccourcis clavier |

### Tests crees

| Fichier                                             | Tests    |
| --------------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/stroke-smoothing.test.ts` | 23 tests |

**Total Phase 2 : 23 nouveaux tests**
**Total cumule : 125 tests**

### Fonctionnalites implementees

1. **Lissage des traits** avec perfect-freehand
2. **Canvas SVG 4 couches** : background, content, active-stroke, instruments
3. **Outils de dessin** : pen, highlighter, eraser
4. **Eraser par intersection** : suppression reelle des strokes (pas white overlay)
5. **Backgrounds** : plain, grid, ruled, dotted
6. **Raccourcis clavier** : P (pen), H (highlighter), E (eraser), Ctrl+Z (undo)
7. **Detection d'intersection** : bounding box + segment-to-segment

### Code Review

- **Score** : Good
- **Reviewer** : code-reviewer agent
- **Issues corrigees** :
  - Ajout `toolState` getter au store
  - Fix `isLoading` const -> let
  - Ajout try/finally pour release pointer capture
  - Ajout attributs accessibilite SVG (role, aria-label)
  - Suppression code mort (containerEl, scale, viewportOffset)

---

## Phase 1 : Foundation (Core + Store)

### Fichiers crees

| Fichier                                          | Description                                                 |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/whiteboard/types/document.ts`           | Types de base (Document, Page, Element) + factory functions |
| `src/lib/whiteboard/types/file-format.ts`        | Schema Zod pour validation .ubw                             |
| `src/lib/whiteboard/core/history.svelte.ts`      | Gestionnaire undo/redo (50 etats max)                       |
| `src/lib/whiteboard/core/serialization.ts`       | Serialisation/deserialisation JSON                          |
| `src/lib/whiteboard/stores/whiteboard.svelte.ts` | Store principal avec Svelte 5 runes                         |
| `src/lib/whiteboard/index.ts`                    | Exports publics du module                                   |

### Tests crees

| Fichier                                                    | Tests    |
| ---------------------------------------------------------- | -------- |
| `src/lib/whiteboard/tests/document.test.ts`                | 19 tests |
| `src/lib/whiteboard/tests/serialization.test.ts`           | 25 tests |
| `src/lib/whiteboard/tests/history.svelte.test.ts`          | 21 tests |
| `src/lib/whiteboard/tests/whiteboard-store.svelte.test.ts` | 37 tests |

**Total : 102 tests, tous passent**

### Dependances ajoutees

- `perfect-freehand@1.2.2` - Lissage des traits (sera utilise en Phase 2)

### Decisions prises

1. **Format fichier** : `.ubw` (JSON avec MIME type `application/vnd.ubumaths.whiteboard+json`)
2. **Formats de page** : A4, A4 Paysage, A3, A3 Paysage, 16:9, 4:3
3. **Historique** : 50 etats maximum (snapshots complets)
4. **Autosave** : localStorage avec delai de 1 minute

### Code Review

- **Score** : Excellent
- **Reviewer** : code-reviewer agent
- **Issues critiques** : Aucune
- **Suggestions appliquees** :
  - Documentation memoire dans history.svelte.ts
  - Verification environnement browser dans serialization.ts
  - TODO pour notification autosave en Phase 2

---

## Prochaines etapes

### ✅ IMPLEMENTATION COMPLETE

Toutes les phases sont terminees :

- Phase 1-11 implementees
- 532 tests passent (100%)
- 0 erreurs lint/TypeScript dans le code whiteboard
- Route `/whiteboard` accessible

### Ameliorations futures potentielles

1. **Google Drive integration** : Implementer sauvegarde cloud (necessite changement scope OAuth)
2. **Compas** : Ajouter instrument compas (via Compass.svelte existant)
3. **Touch support** : Gestes pinch-to-zoom pour tablettes
4. **Undo/Redo gesturel** : Swipe gauche/droite pour undo/redo

---

## Idees inspirees d'Excalidraw

> Analyse comparative realisee le 2026-01-17. Voir `docs/ref/excalidraw.md` pour la documentation technique d'Excalidraw.

### Contexte

Excalidraw est un editeur de diagrammes collaboratif avec style "hand-drawn". Notre whiteboard utilise SVG (vs Canvas pour Excalidraw) et Svelte 5 runes (vs Jotai). Ces differences architecturales rendent certaines idees d'Excalidraw non pertinentes pour notre cas.

### Idees NON retenues

| Idee                                  | Raison du rejet                                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Double Layer (Static/Interactive)** | Notre systeme "live transforms" (livePositions, liveRotations, liveResizes) resout deja ce probleme de performance. Le double layer est critique pour Canvas (redraw complet) mais pas pour SVG (mise a jour partielle native du DOM). |
| **Actions centralisees**              | Over-engineering. Le code actuel (~80 lignes de switch/case) est simple, lisible, et teste via le store. Utile pour 50+ actions, command palette, plugins - aucun de ces cas ne s'applique ici.                                        |
| **Frames**                            | Le multi-pages existant couvre 95% du besoin d'organisation. Les frames seraient utiles pour voir plusieurs zones cote a cote, mais ce cas d'usage est rare pour un whiteboard educatif.                                               |
| **BoundElements inverse**             | Optimisation prematuree. Le parcours O(n) actuel prend ~0.01ms pour 30 elements, ~2ms pour 5000. Imperceptible. La complexite ajoutee (coherence bidirectionnelle) > le gain.                                                          |
| **Conteneurs de texte**               | Les labels sur shapes + TextBlocks couvrent deja les besoins. Ajouter du texte "contenu" dans une forme ajouterait de la complexite pour un gain marginal.                                                                             |
| **History optimisee (deltas)**        | Les 50 snapshots actuels suffisent. Probleme de memoire uniquement pour documents avec beaucoup d'images - cas rare. Complexite elevee pour gain marginal.                                                                             |
| **Collaboration temps reel**          | Hors scope - pas d'objectif collaboratif.                                                                                                                                                                                              |
| **Style hand-drawn (roughjs)**        | Le style "propre" est plus adapte aux mathematiques.                                                                                                                                                                                   |

### Idees RETENUES

| Idee             | Description                                                                                                           | Effort | Impact |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| **Elbow arrows** | Fleches avec segments a 90°. Utile pour arbres de probabilite, organigrammes d'algorithmes, diagrammes hierarchiques. | Moyen  | Fort   |

### Plan d'implementation : Elbow Arrows

**Cas d'usage cibles** : Arbres de probabilite, organigrammes d'algorithmes

**Approche simplifiee** (vs Excalidraw) :

- Pas de routage automatique complexe (evitement d'obstacles)
- 1 a 2 coudes maximum (suffisant pour arbres)
- L'utilisateur choisit le type de coude (horizontal-first ou vertical-first)

**Etapes** :

1. **Types** : Ajouter `elbowed?: boolean` et `elbowDirection?: 'horizontal-first' | 'vertical-first'` a ArrowElement
2. **Rendu SVG** : Calculer le path avec coude(s) au lieu d'une ligne droite
3. **UI** : Toggle dans toolbar pour activer le mode elbow sur les fleches
4. **Bindings** : Adapter le calcul des endpoints pour les fleches coudees
5. **Labels** : Positionner le label au milieu du segment horizontal/vertical principal

**Schema** :

```
Horizontal-first:          Vertical-first:
    A                          A
    |                          |
    +-----> B                  |
                               +-----> B
```

### Conclusion

L'analyse comparative avec Excalidraw revele que le whiteboard UbuMaths est globalement bien concu. La plupart des patterns d'Excalidraw (double layer, actions centralisees, frames) repondent a des besoins differents.

**Une seule fonctionnalite retenue** : Elbow arrows, pour les diagrammes mathematiques (arbres de probabilite, algorithmes).

---

## Structure du module

```
src/lib/whiteboard/
├── components/
│   ├── Whiteboard.svelte
│   ├── WhiteboardCanvas.svelte
│   ├── WhiteboardToolbar.svelte
│   ├── ExportDialog.svelte          # NEW Phase 10
│   ├── InstrumentLayer.svelte
│   ├── ImageLayer.svelte
│   ├── PageThumbnails.svelte
│   ├── TextBlock.svelte
│   └── TextBlockLayer.svelte
├── core/
│   ├── history.svelte.ts
│   ├── pdf-export.ts                # NEW Phase 10
│   ├── serialization.ts
│   ├── shapes.ts
│   └── stroke-smoothing.ts
├── stores/
│   └── whiteboard.svelte.ts
├── tests/
│   ├── document.test.ts
│   ├── export.test.ts               # NEW Phase 10
│   ├── file-operations.test.ts
│   ├── google-drive.test.ts
│   ├── history.svelte.test.ts
│   ├── image-import.test.ts
│   ├── instruments.test.ts
│   ├── multipage.test.ts
│   ├── pdf-import.test.ts
│   ├── serialization.test.ts
│   ├── shapes.test.ts
│   ├── stroke-smoothing.test.ts
│   ├── textblock.test.ts
│   ├── toolbar.test.ts
│   └── whiteboard-store.svelte.test.ts
├── types/
│   ├── document.ts
│   └── file-format.ts
├── utils/
│   ├── file-operations.ts
│   ├── image-loader.ts
│   ├── pdf-loader.ts
│   └── sync-state.ts
└── index.ts
```
