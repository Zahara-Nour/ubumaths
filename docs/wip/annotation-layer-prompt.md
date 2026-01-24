# Prompt : Implémentation Annotation Layer pour UbuMaths Whiteboard

## Contexte

Tu travailles sur UbuMaths, une application éducative de mathématiques en Svelte 5. Le whiteboard actuel utilise un rendu SVG multi-couches. Les TextBlocks (texte éditable) sont rendus en HTML overlay au-dessus du SVG, ce qui empêche de dessiner par-dessus.

**Objectif** : Ajouter une couche d'annotation SVG par-dessus TOUT (y compris les TextBlocks HTML) pour permettre de dessiner des annotations à main levée, des formes, et placer des tampons de correction.

## Architecture actuelle du whiteboard

```
Couches actuelles (bas → haut) :
├── SVG principal
│   ├── layer-background (grilles, fond)
│   ├── layer-content (strokes, shapes)
│   ├── layer-images
│   ├── layer-active-stroke
│   ├── layer-instruments (règle, rapporteur)
│   └── layer-selection
├── TextBlockLayer (HTML overlay, z-index ~100)
├── ShapeLabelLayer (HTML overlay)
└── 🆕 AnnotationLayer (SVG overlay, z-index 200) ← À CRÉER
```

## Fichiers clés à connaître

- `src/lib/whiteboard/stores/whiteboard.svelte.ts` - Store principal (~5000 lignes)
- `src/lib/whiteboard/components/WhiteboardCanvas.svelte` - Canvas SVG principal
- `src/lib/whiteboard/components/Whiteboard.svelte` - Composant parent
- `src/lib/whiteboard/types/document.ts` - Types TypeScript
- `src/lib/whiteboard/core/stroke-smoothing.ts` - Lissage strokes (perfect-freehand)
- `src/lib/whiteboard/core/rough-renderer.ts` - Rendu sketch (roughjs)
- `src/lib/whiteboard/core/shapes.ts` - Génération formes SVG
- `src/lib/whiteboard/core/hit-testing.ts` - Détection clics sur éléments

## Spécifications fonctionnelles

### Outils à implémenter

| Outil                    | Description                       | Code à réutiliser     |
| ------------------------ | --------------------------------- | --------------------- |
| Stylo (pen)              | Trait fin                         | `stroke-smoothing.ts` |
| Marqueur (marker)        | Trait épais                       | `stroke-smoothing.ts` |
| Surligneur (highlighter) | Trait transparent, blend multiply | `stroke-smoothing.ts` |
| Gomme (eraser)           | Efface par intersection           | `hit-testing.ts`      |
| Ligne                    | Ligne droite                      | `shapes.ts`           |
| Rectangle                | Rectangle                         | `shapes.ts`           |
| Cercle                   | Cercle/ellipse                    | `shapes.ts`           |
| Flèche                   | Flèche avec tête                  | `shapes.ts`           |
| Sélection                | Sélectionner/déplacer/modifier    | `hit-testing.ts`      |
| Tampons                  | Symboles prédéfinis               | Nouveau               |

### Tampons disponibles

```typescript
type StampType =
	| '✓'
	| '✗'
	| '?'
	| '!' // Correction
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F' // Lettres
	| '1'
	| '2'
	| '3'
	| '4'
	| '5'
	| '6' // Chiffres
	| '★'
	| '♥'
	| '👍'
	| '👎'
	| '💡'
	| '⚠️'; // Symboles
```

### Styles

- **Couleurs** : Même palette que le whiteboard existant
- **Épaisseurs** : Fin (2px), Moyen (4px), Épais (8px)
- **Rendu** : Toggle entre "sketch" (roughjs) et "propre" (SVG net)
- **Opacité** : Configurable

### Comportements

- **Position absolue** : Annotations NON liées aux éléments (ne suivent pas si on déplace)
- **Persistance** : Stockées dans `page.annotations[]`
- **Visibilité toggle** : Un bouton global pour masquer/afficher toutes les annotations
- **Export PDF** : Checkbox "Inclure les annotations" dans le dialogue d'export
- **Sélection complète** : Réutiliser SelectionLayer existant pour :
  - Sélectionner au clic
  - Déplacer (drag)
  - Resize (8 poignées : coins + côtés)
  - Rotation (poignée de rotation)
  - Sélection multiple (Shift+clic ou marquee)
- **Modification paramètres** :
  - Via toolbar : couleur, épaisseur (appliqués à la sélection)
  - Via menu contextuel (clic droit) : couleur, épaisseur, opacité, style trait, sketch/propre, supprimer
- **Undo/Redo** : Historique séparé ou intégré au whiteboard

### Raccourcis clavier

```
P = Stylo          M = Marqueur       H = Surligneur
E = Gomme          L = Ligne          R = Rectangle
C = Cercle         A = Flèche         V = Sélection
T = Ouvrir tampons S = Toggle sketch
1-9 = Couleurs     [ = Épaisseur -    ] = Épaisseur +
Ctrl+Z = Undo      Ctrl+Y = Redo      Ctrl+H = Toggle visibilité
Delete = Supprimer Ctrl+Shift+Del = Tout effacer
Escape = Quitter mode annotation
```

## Types TypeScript à ajouter

```typescript
// Dans src/lib/whiteboard/types/document.ts

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
	size: number;
	rotation: number;
}

export type AnnotationElement = AnnotationStroke | AnnotationShape | AnnotationStamp;

// Ajouter à WhiteboardPage existant :
// annotations: AnnotationElement[];

// Ajouter à WhiteboardDocument existant :
// annotationsVisible: boolean;
```

## Plan d'implémentation (phases)

### Phase 1 : Structure de base (4h)

1. Ajouter types TypeScript
2. Étendre WhiteboardPage et WhiteboardDocument
3. Créer AnnotationLayer.svelte vide
4. Intégrer dans Whiteboard.svelte avec bon z-index
5. Migration documents existants

### Phase 2 : Outils de dessin (5h)

1. Mode annotation toggle
2. Capture événements pointer
3. Implémenter pen/marker/highlighter avec perfect-freehand
4. Implémenter eraser
5. Undo/redo annotations

### Phase 3 : Formes (4h)

1. Ligne, rectangle, cercle, flèche
2. Mode sketch (roughjs) vs propre
3. Réutiliser rough-renderer.ts et shapes.ts

### Phase 4 : Tampons (4h)

1. Palette de tampons (StampPalette.svelte)
2. Placement au clic
3. Taille et couleur configurables

### Phase 5 : Sélection et manipulation (6h)

1. Hit-testing annotations (réutiliser hit-testing.ts)
2. Réutiliser SelectionLayer (bounding box, resize handles, rotation handle)
3. Déplacement, resize, rotation
4. Modification via toolbar (couleur, épaisseur)
5. Menu contextuel (opacité, style, sketch/propre, supprimer)
6. Sélection multiple (Shift+clic, marquee)

### Phase 6 : Toolbar et UI (4h)

1. AnnotationToolbar.svelte
2. Boutons outils avec icônes
3. Sélecteurs couleur/épaisseur
4. Toggles (sketch, visibilité)

### Phase 7 : Raccourcis clavier (2h)

1. Tous les raccourcis listés
2. Éviter conflits avec whiteboard

### Phase 8 : Export PDF (2h)

1. Checkbox dans ExportDialog
2. Inclure/exclure annotations du rendu

### Phase 9 : Tests et polish (4h)

1. Tests unitaires et intégration
2. Performance
3. Bug fixes

## Fichiers à créer

```
src/lib/whiteboard/components/
├── AnnotationLayer.svelte       # Overlay SVG principal
├── AnnotationToolbar.svelte     # Toolbar dédiée
├── AnnotationContextMenu.svelte # Menu contextuel (clic droit)
└── StampPalette.svelte          # Palette de tampons
```

## Contraintes techniques

1. **Svelte 5** : Utiliser les runes ($state, $derived, $effect, $props)
2. **TypeScript strict** : Pas de `any`, types explicites
3. **Réutilisation** : Maximiser la réutilisation du code existant
4. **Performance** : Attention au nombre d'annotations (optimiser si > 100)
5. **Accessibilité** : Raccourcis clavier, labels ARIA
6. **Mobile** : Supporter touch events (pointer events)

## Ordre de travail recommandé

1. Lis d'abord `src/lib/whiteboard/types/document.ts` pour comprendre les types existants
2. Lis `src/lib/whiteboard/stores/whiteboard.svelte.ts` pour comprendre le store
3. Lis `src/lib/whiteboard/core/stroke-smoothing.ts` pour comprendre le rendu strokes
4. Implémente phase par phase en suivant le TDD :
   - Propose les comportements
   - Attends validation
   - Écris les tests
   - Implémente
   - Vérifie que les tests passent

## Documentation de référence

- Plan détaillé : `docs/wip/annotation-layer-plan.md`
- CLAUDE.md du projet pour les conventions
- `docs/claude/` pour les patterns et best practices

---

**Commence par la Phase 1 : Structure de base.**

Lis les fichiers nécessaires, propose les types TypeScript à ajouter, et attends ma validation avant d'implémenter.
