# Plan d'implémentation : Annotation Layer

## Objectif

Ajouter une couche d'annotation SVG par-dessus le whiteboard existant, permettant de dessiner des annotations (traits, formes, tampons) au-dessus des TextBlocks et autres éléments HTML.

## Spécifications

### Fonctionnalités

| Feature                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| **Overlay SVG**         | Couche SVG au-dessus de tout (z-index > TextBlockLayer)    |
| **Persistance**         | Annotations stockées dans `page.annotations[]`             |
| **Outils dessin**       | Réutiliser pen, marker, highlighter, eraser existants      |
| **Formes**              | Réutiliser line, rectangle, circle, arrow existants        |
| **Tampons**             | Symboles cliquables : ✓✗?! + ABCDEF + 123456 + ★♥👍👎💡⚠️ |
| **Sélection**           | Sélectionner, déplacer, modifier, supprimer annotations    |
| **Style sketch/propre** | Toggle entre rendu roughjs et rendu net                    |
| **Visibilité toggle**   | Bouton global pour masquer/afficher toutes les annotations |
| **Export PDF**          | Checkbox "Inclure annotations" dans dialogue d'export      |
| **Raccourcis**          | Complets (outils, couleurs, actions)                       |
| **Couleurs**            | Même palette que le whiteboard existant                    |

### Ce qui est réutilisé (pas de nouveau code)

- `perfect-freehand` + `stroke-smoothing.ts` pour les strokes
- `rough-renderer.ts` pour le mode sketch
- `shapes.ts` pour les formes géométriques
- Palette de couleurs existante
- Système de styles (épaisseur, opacité, strokeStyle)

### Ce qui est nouveau

- `AnnotationLayer.svelte` - composant overlay SVG
- `annotation-store.ts` ou extension de `whiteboard.svelte.ts`
- `AnnotationToolbar.svelte` - toolbar dédiée au mode annotation
- Types `AnnotationElement` dans `document.ts`
- Système de tampons (stamps)
- Logique de sélection/déplacement spécifique aux annotations

---

## Architecture

### Structure des couches (z-order)

```
┌─────────────────────────────────────┐
│  AnnotationLayer (SVG)        z:200 │ ← NOUVEAU - au-dessus de tout
├─────────────────────────────────────┤
│  TextBlockLayer (HTML)        z:100 │
│  ShapeLabelLayer (HTML)       z:100 │
├─────────────────────────────────────┤
│  SVG principal (content)      z:1   │
└─────────────────────────────────────┘
```

### Structure de données

```typescript
// Dans types/document.ts

export type StampType =
	| '✓'
	| '✗'
	| '?'
	| '!'
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6'
	| '★'
	| '♥'
	| '👍'
	| '👎'
	| '💡'
	| '⚠️';

export type AnnotationType = 'stroke' | 'shape' | 'stamp';

export interface AnnotationBase {
	id: string;
	type: AnnotationType;
	color: string;
	opacity: number;
	createdAt: number;
	sketch: boolean; // true = roughjs, false = propre
}

export interface AnnotationStroke extends AnnotationBase {
	type: 'stroke';
	points: Point[];
	width: number;
	toolType: 'pen' | 'marker' | 'highlighter';
	strokeStyle: 'solid' | 'dashed' | 'dotted';
}

export interface AnnotationShape extends AnnotationBase {
	type: 'shape';
	shapeType: 'line' | 'rectangle' | 'circle' | 'arrow';
	start: Point;
	end: Point;
	width: number;
	strokeStyle: 'solid' | 'dashed' | 'dotted';
	fillMode: FillMode;
}

export interface AnnotationStamp extends AnnotationBase {
	type: 'stamp';
	stampType: StampType;
	position: Point;
	size: number; // Taille du tampon (défaut: 32)
	rotation: number; // Rotation en degrés (défaut: 0)
}

export type AnnotationElement = AnnotationStroke | AnnotationShape | AnnotationStamp;

// Extension de WhiteboardPage
export interface WhiteboardPage {
	// ... existant
	annotations: AnnotationElement[]; // NOUVEAU
}

// Extension de WhiteboardDocument
export interface WhiteboardDocument {
	// ... existant
	annotationsVisible: boolean; // NOUVEAU - toggle global
}
```

### Raccourcis clavier

| Raccourci           | Action                               |
| ------------------- | ------------------------------------ |
| `P`                 | Outil Stylo                          |
| `M`                 | Outil Marqueur                       |
| `H`                 | Outil Surligneur                     |
| `E`                 | Outil Gomme                          |
| `L`                 | Outil Ligne                          |
| `R`                 | Outil Rectangle                      |
| `C`                 | Outil Cercle                         |
| `A`                 | Outil Flèche                         |
| `V`                 | Outil Sélection                      |
| `T`                 | Ouvrir palette Tampons               |
| `S`                 | Toggle Sketch/Propre                 |
| `1-9`               | Couleurs (même ordre que whiteboard) |
| `[`                 | Réduire épaisseur                    |
| `]`                 | Augmenter épaisseur                  |
| `Ctrl+Z`            | Annuler                              |
| `Ctrl+Y`            | Refaire                              |
| `Ctrl+H`            | Toggle visibilité annotations        |
| `Delete`            | Supprimer annotation sélectionnée    |
| `Ctrl+Shift+Delete` | Tout effacer                         |
| `Escape`            | Quitter mode annotation              |

---

## Phases d'implémentation

### Phase 1 : Structure de base (4h)

**Fichiers à créer/modifier :**

- `src/lib/whiteboard/types/document.ts` - Ajouter types AnnotationElement
- `src/lib/whiteboard/stores/whiteboard.svelte.ts` - Ajouter état annotations
- `src/lib/whiteboard/components/AnnotationLayer.svelte` - Composant overlay

**Tâches :**

1. Définir les types TypeScript pour les annotations
2. Ajouter `annotations: AnnotationElement[]` à WhiteboardPage
3. Ajouter `annotationsVisible: boolean` à WhiteboardDocument
4. Créer le composant AnnotationLayer.svelte vide avec bon z-index
5. Intégrer AnnotationLayer dans Whiteboard.svelte
6. Ajouter migrations pour les documents existants (annotations: [])

**Tests :**

- [ ] Le composant AnnotationLayer se monte correctement
- [ ] Le z-index est au-dessus de TextBlockLayer
- [ ] Les documents existants chargent sans erreur

---

### Phase 2 : Outils de dessin (5h)

**Fichiers à modifier :**

- `src/lib/whiteboard/components/AnnotationLayer.svelte`
- `src/lib/whiteboard/stores/whiteboard.svelte.ts`

**Tâches :**

1. Implémenter le mode annotation (toggle)
2. Capturer les événements pointer dans AnnotationLayer
3. Réutiliser `smoothStroke()` et `getStrokePath()` pour le rendu
4. Implémenter pen, marker, highlighter avec perfect-freehand
5. Implémenter eraser (suppression par intersection)
6. Ajouter/supprimer annotations dans le store
7. Implémenter undo/redo pour les annotations

**Tests :**

- [ ] Dessiner un trait avec pen
- [ ] Dessiner avec marker (plus épais)
- [ ] Dessiner avec highlighter (blend mode multiply)
- [ ] Effacer avec eraser
- [ ] Undo/redo fonctionnent

---

### Phase 3 : Formes (4h)

**Fichiers à modifier :**

- `src/lib/whiteboard/components/AnnotationLayer.svelte`
- `src/lib/whiteboard/core/annotation-shapes.ts` (nouveau, ou réutiliser shapes.ts)

**Tâches :**

1. Implémenter dessin de ligne (drag start → end)
2. Implémenter dessin de rectangle
3. Implémenter dessin de cercle/ellipse
4. Implémenter dessin de flèche (avec tête)
5. Ajouter le toggle sketch/propre pour les formes
6. Mode sketch : réutiliser rough-renderer.ts
7. Mode propre : rendu SVG simple

**Tests :**

- [ ] Dessiner ligne en mode sketch
- [ ] Dessiner ligne en mode propre
- [ ] Dessiner rectangle, cercle, flèche
- [ ] Toggle sketch/propre change le rendu

---

### Phase 4 : Tampons (4h)

**Fichiers à créer/modifier :**

- `src/lib/whiteboard/components/StampPalette.svelte` (nouveau)
- `src/lib/whiteboard/components/AnnotationLayer.svelte`

**Tâches :**

1. Créer la palette de tampons (popup/dropdown)
2. Organiser par catégories : Correction, Lettres, Chiffres, Symboles
3. Implémenter le placement de tampon au clic
4. Rendu SVG des tampons (texte ou path)
5. Permettre de changer la taille du tampon
6. Permettre de changer la couleur du tampon

**Tests :**

- [ ] Ouvrir la palette avec T
- [ ] Placer un tampon ✓
- [ ] Placer un tampon avec couleur différente
- [ ] Changer la taille du tampon

---

### Phase 5 : Sélection et manipulation (6h)

**Fichiers à modifier :**

- `src/lib/whiteboard/components/AnnotationLayer.svelte`
- `src/lib/whiteboard/components/AnnotationContextMenu.svelte` (nouveau)

**Décision architecturale : UI de sélection inline**

SelectionLayer.svelte n'est PAS réutilisé car :

1. **Types de données différents** : SelectionLayer attend `WhiteboardElement[]` avec des callbacks spécifiques (`liveResize`, `liveRotation`, `livePositions`) qui sont étroitement couplés au système d'éléments du whiteboard.
2. **Systèmes de coordonnées différents** : AnnotationLayer est un overlay SVG séparé avec son propre espace de coordonnées.
3. **Besoins plus simples** : Les annotations n'ont besoin que du resize/rotate basique, pas des fonctionnalités avancées de SelectionLayer (handles d'endpoints, waypoints, etc.).

**Ce qui EST réutilisé :**

- `calculateAngleFromCenter` et `normalizeAngle` depuis `core/hit-testing.ts`
- Les mêmes patterns visuels (couleurs, tailles de handles, curseurs)

**Tâches :**

1. Implémenter hit-testing pour annotations (réutiliser hit-testing.ts)
2. Implémenter UI de sélection inline dans AnnotationLayer :
   - Bounding box de sélection
   - 8 poignées de resize (coins + côtés)
   - Poignée de rotation
3. Implémenter le déplacement (drag)
4. Implémenter le resize (mise à l'échelle)
5. Implémenter la rotation
6. Implémenter la suppression (Delete)
7. Modifier via toolbar : couleur, épaisseur appliqués à la sélection
8. Menu contextuel (clic droit) pour options avancées :
   - Couleur (palette)
   - Épaisseur (fin/moyen/épais)
   - Opacité (slider)
   - Style trait (solide/pointillé)
   - Toggle sketch/propre
   - Supprimer
9. Sélection multiple (Shift+clic ou marquee)

**Tests :**

- [ ] Sélectionner une annotation au clic
- [ ] Déplacer une annotation
- [ ] Resize via poignées (coins et côtés)
- [ ] Rotation via poignée
- [ ] Supprimer avec Delete
- [ ] Changer couleur via toolbar
- [ ] Changer épaisseur via toolbar
- [ ] Ouvrir menu contextuel (clic droit)
- [ ] Modifier opacité via menu contextuel
- [ ] Sélection multiple avec Shift+clic

---

### Phase 6 : Toolbar et UI (4h)

**Fichiers à créer/modifier :**

- `src/lib/whiteboard/components/AnnotationToolbar.svelte` (nouveau)
- `src/lib/whiteboard/components/Whiteboard.svelte`

**Tâches :**

1. Créer la toolbar annotation (floating ou fixe)
2. Boutons pour chaque outil avec icônes
3. Sélecteur de couleur (même que whiteboard)
4. Sélecteur d'épaisseur
5. Toggle sketch/propre
6. Toggle visibilité (œil)
7. Bouton "Tout effacer"
8. Bouton "Quitter mode annotation"
9. Afficher l'outil actif

**Tests :**

- [ ] Toolbar s'affiche en mode annotation
- [ ] Changer d'outil via toolbar
- [ ] Changer couleur/épaisseur via toolbar
- [ ] Toggle visibilité fonctionne

---

### Phase 7 : Raccourcis clavier (2h)

**Fichiers à modifier :**

- `src/lib/whiteboard/components/AnnotationLayer.svelte`
- `src/lib/whiteboard/components/Whiteboard.svelte`

**Tâches :**

1. Implémenter tous les raccourcis listés
2. Éviter les conflits avec raccourcis whiteboard existants
3. Afficher les raccourcis dans les tooltips des boutons

**Tests :**

- [ ] P/M/H/E changent d'outil
- [ ] 1-9 changent de couleur
- [ ] Ctrl+Z/Y undo/redo
- [ ] Escape quitte le mode

---

### Phase 8 : Export PDF (2h)

**Fichiers à modifier :**

- `src/lib/whiteboard/components/ExportDialog.svelte`
- `src/lib/whiteboard/services/pdf-export.ts` (ou équivalent)

**Tâches :**

1. Ajouter checkbox "Inclure les annotations" dans ExportDialog
2. Modifier la logique d'export pour inclure/exclure AnnotationLayer
3. S'assurer que le SVG des annotations est bien capturé

**Tests :**

- [ ] Export PDF sans annotations (checkbox off)
- [ ] Export PDF avec annotations (checkbox on)
- [ ] Les annotations apparaissent correctement dans le PDF

---

### Phase 9 : Tests et polish (4h)

**Tâches :**

1. Tests unitaires pour les nouvelles fonctions
2. Tests d'intégration (dessiner, sélectionner, exporter)
3. Vérifier les performances avec beaucoup d'annotations
4. Vérifier le comportement multi-pages
5. Corriger les bugs trouvés
6. Nettoyer le code, ajouter commentaires

---

## Fichiers impactés (résumé)

### Nouveaux fichiers

- `src/lib/whiteboard/components/AnnotationLayer.svelte`
- `src/lib/whiteboard/components/AnnotationToolbar.svelte`
- `src/lib/whiteboard/components/AnnotationContextMenu.svelte`
- `src/lib/whiteboard/components/StampPalette.svelte`

### Fichiers modifiés

- `src/lib/whiteboard/types/document.ts` - Types annotations
- `src/lib/whiteboard/stores/whiteboard.svelte.ts` - État et actions
- `src/lib/whiteboard/components/Whiteboard.svelte` - Intégration
- `src/lib/whiteboard/components/ExportDialog.svelte` - Option export

### Fichiers réutilisés (pas de modification)

- `src/lib/whiteboard/core/stroke-smoothing.ts`
- `src/lib/whiteboard/core/rough-renderer.ts`
- `src/lib/whiteboard/core/shapes.ts`
- `src/lib/whiteboard/core/hit-testing.ts` (utilitaires `calculateAngleFromCenter`, `normalizeAngle`)

### Non réutilisé (voir Phase 5 pour justification)

- `src/lib/whiteboard/components/SelectionLayer.svelte` - Types incompatibles avec AnnotationElement

---

## Estimation totale

| Phase                               | Temps    |
| ----------------------------------- | -------- |
| Phase 1 : Structure de base         | 4h       |
| Phase 2 : Outils de dessin          | 5h       |
| Phase 3 : Formes                    | 4h       |
| Phase 4 : Tampons                   | 4h       |
| Phase 5 : Sélection et manipulation | 6h       |
| Phase 6 : Toolbar et UI             | 4h       |
| Phase 7 : Raccourcis clavier        | 2h       |
| Phase 8 : Export PDF                | 2h       |
| Phase 9 : Tests et polish           | 4h       |
| **Total**                           | **~35h** |
