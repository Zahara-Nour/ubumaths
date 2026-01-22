# Snapping & Distance Guides - Specification Technique

> Ameliorations UX pour le whiteboard UbuMaths basees sur l'analyse de tldraw

---

## 1. Snapping aux Objets

### 1.1 Description

Le snapping permet aux elements de s'aligner automatiquement sur les autres elements du canvas lors du deplacement ou du redimensionnement. Quand un element s'approche d'un point d'alignement (< seuil), il "saute" sur cette position.

**Types de snap points:**

- **Coins** : 4 coins de chaque bounding box
- **Centre** : centre de chaque bounding box
- **Bords** : milieux des 4 cotes

### 1.2 Comment tldraw l'implemente

tldraw utilise un `SnapManager` avec deux sous-systemes:

```
SnapManager
├── BoundsSnaps  → Snap des bounds (coins, centres, bords)
└── HandleSnaps  → Snap des handles (endpoints d'arrows)
```

**Algorithme principal (`BoundsSnaps.snapTranslateShapes`):**

```typescript
// 1. Collecter les snap points de la selection
const selectionSnapPoints = getSnapPoints(selectedElements)
  .map(p => ({ x: p.x + dragDelta.x, y: p.y + dragDelta.y }))

// 2. Collecter les snap points des autres shapes visibles
const otherSnapPoints = getSnappableShapes()
  .flatMap(shape => getSnapPoints(shape))

// 3. Trouver le snap le plus proche sur chaque axe
const nearestX = findNearestSnap(selectionSnapPoints, otherSnapPoints, 'x', threshold)
const nearestY = findNearestSnap(selectionSnapPoints, otherSnapPoints, 'y', threshold)

// 4. Calculer le "nudge" (correction de position)
const nudge = { x: nearestX?.offset ?? 0, y: nearestY?.offset ?? 0 }

// 5. Appliquer le nudge au delta de deplacement
return { dragDelta: dragDelta.add(nudge), snapIndicators: [...] }
```

**Caracteristiques cles:**

- Seuil de snap adaptatif (10px / zoomLevel)
- Snap independant sur X et Y (peut snapper sur X sans snapper sur Y)
- Indicateurs visuels (lignes pointillees) montrant l'alignement

### 1.3 Plan d'implementation pour UbuMaths

#### Phase 1: Core - Module de snapping

**Nouveau fichier: `src/lib/whiteboard/core/snapping.ts`**

```typescript
// Types
export interface SnapPoint {
	id: string; // "{elementId}:{pointType}" ex: "shape-123:center"
	x: number;
	y: number;
	type: 'corner' | 'center' | 'edge';
}

export interface SnapResult {
	nudge: { x: number; y: number };
	indicators: SnapIndicator[];
}

export interface SnapIndicator {
	type: 'line';
	axis: 'x' | 'y';
	position: number;
	start: number;
	end: number;
}

// Configuration
export const SNAP_THRESHOLD = 10; // pixels (avant zoom)

/**
 * Extrait les snap points d'un element
 */
export function getElementSnapPoints(element: WhiteboardElement): SnapPoint[] {
	const bounds = getElementBounds(element);
	const { x, y, width, height } = bounds;

	return [
		// Coins
		{ id: `${element.id}:nw`, x, y, type: 'corner' },
		{ id: `${element.id}:ne`, x: x + width, y, type: 'corner' },
		{ id: `${element.id}:sw`, x, y: y + height, type: 'corner' },
		{ id: `${element.id}:se`, x: x + width, y: y + height, type: 'corner' },
		// Centre
		{ id: `${element.id}:center`, x: x + width / 2, y: y + height / 2, type: 'center' },
		// Milieux des bords
		{ id: `${element.id}:n`, x: x + width / 2, y, type: 'edge' },
		{ id: `${element.id}:s`, x: x + width / 2, y: y + height, type: 'edge' },
		{ id: `${element.id}:w`, x, y: y + height / 2, type: 'edge' },
		{ id: `${element.id}:e`, x: x + width, y: y + height / 2, type: 'edge' }
	];
}

/**
 * Trouve le snap le plus proche sur un axe
 */
function findNearestSnap(
	selectionPoints: SnapPoint[],
	otherPoints: SnapPoint[],
	axis: 'x' | 'y',
	threshold: number
): { offset: number; matches: SnapPoint[] } | null {
	let nearestOffset = threshold;
	let nearestMatches: SnapPoint[] = [];

	for (const selPoint of selectionPoints) {
		for (const otherPoint of otherPoints) {
			const diff = otherPoint[axis] - selPoint[axis];
			const absDiff = Math.abs(diff);

			if (absDiff < nearestOffset) {
				nearestOffset = absDiff;
				nearestMatches = [otherPoint];
			} else if (absDiff === nearestOffset) {
				nearestMatches.push(otherPoint);
			}
		}
	}

	if (nearestOffset >= threshold) return null;

	return {
		offset:
			nearestMatches[0][axis] -
			selectionPoints.find((p) => Math.abs(nearestMatches[0][axis] - p[axis]) < threshold)![axis],
		matches: nearestMatches
	};
}

/**
 * Calcule le snapping pour un deplacement
 */
export function calculateSnapForTranslate(
	selectedIds: Set<string>,
	elements: readonly WhiteboardElement[],
	dragDelta: { x: number; y: number },
	zoom: number
): SnapResult {
	const threshold = SNAP_THRESHOLD / zoom;

	// 1. Collecter les snap points de la selection (avec delta applique)
	const selectionPoints: SnapPoint[] = [];
	const otherPoints: SnapPoint[] = [];

	for (const element of elements) {
		const points = getElementSnapPoints(element);

		if (selectedIds.has(element.id)) {
			// Appliquer le delta aux points de la selection
			selectionPoints.push(
				...points.map((p) => ({
					...p,
					x: p.x + dragDelta.x,
					y: p.y + dragDelta.y
				}))
			);
		} else {
			otherPoints.push(...points);
		}
	}

	// 2. Trouver les snaps
	const snapX = findNearestSnap(selectionPoints, otherPoints, 'x', threshold);
	const snapY = findNearestSnap(selectionPoints, otherPoints, 'y', threshold);

	// 3. Construire le resultat
	const nudge = {
		x: snapX?.offset ?? 0,
		y: snapY?.offset ?? 0
	};

	// 4. Creer les indicateurs visuels
	const indicators: SnapIndicator[] = [];

	if (snapX) {
		// Ligne verticale d'alignement
		const allYs = [...selectionPoints, ...snapX.matches].map((p) => p.y);
		indicators.push({
			type: 'line',
			axis: 'x',
			position: snapX.matches[0].x,
			start: Math.min(...allYs) - 20,
			end: Math.max(...allYs) + 20
		});
	}

	if (snapY) {
		// Ligne horizontale d'alignement
		const allXs = [...selectionPoints, ...snapY.matches].map((p) => p.x);
		indicators.push({
			type: 'line',
			axis: 'y',
			position: snapY.matches[0].y,
			start: Math.min(...allXs) - 20,
			end: Math.max(...allXs) + 20
		});
	}

	return { nudge, indicators };
}
```

#### Phase 2: Integration dans le store

**Modifier: `src/lib/whiteboard/stores/whiteboard.svelte.ts`**

```typescript
// Ajouter l'etat pour les indicateurs de snap
let snapIndicators = $state<SnapIndicator[]>([]);

// Modifier setLivePositionBatch pour inclure le snapping
setLivePositionBatch(elementIds: string[], dx: number, dy: number, enableSnap: boolean = true): void {
  let finalDx = dx;
  let finalDy = dy;

  // Calculer le snapping si active
  if (enableSnap && currentPage) {
    const selectedSet = new Set(elementIds);
    const snapResult = calculateSnapForTranslate(
      selectedSet,
      currentPage.elements,
      { x: dx, y: dy },
      zoom
    );

    finalDx += snapResult.nudge.x;
    finalDy += snapResult.nudge.y;
    snapIndicators = snapResult.indicators;
  }

  // Reste de la logique existante avec finalDx, finalDy
  const newMap = new Map(livePositions);
  for (const id of elementIds) {
    newMap.set(id, { dx: finalDx, dy: finalDy });
  }
  livePositions = newMap;

  // ... recalcul des elbow arrows
}

// Nettoyer les indicateurs quand le drag se termine
clearAllLivePositions(): void {
  livePositions = new Map();
  snapIndicators = [];
  this.clearAllLiveElbowPoints();
}
```

#### Phase 3: Rendu des indicateurs

**Nouveau fichier: `src/lib/whiteboard/components/SnapIndicators.svelte`**

```svelte
<script lang="ts">
	import type { SnapIndicator } from '../core/snapping';

	interface Props {
		indicators: SnapIndicator[];
		scale: number;
	}

	let { indicators, scale }: Props = $props();

	const INDICATOR_COLOR = '#3b82f6'; // blue-500
</script>

<g class="snap-indicators" pointer-events="none">
	{#each indicators as indicator}
		{#if indicator.axis === 'x'}
			<!-- Ligne verticale -->
			<line
				x1={indicator.position}
				y1={indicator.start}
				x2={indicator.position}
				y2={indicator.end}
				stroke={INDICATOR_COLOR}
				stroke-width={1 / scale}
				stroke-dasharray={`${4 / scale} ${4 / scale}`}
			/>
			<!-- Points aux extremites -->
			<circle cx={indicator.position} cy={indicator.start} r={3 / scale} fill={INDICATOR_COLOR} />
			<circle cx={indicator.position} cy={indicator.end} r={3 / scale} fill={INDICATOR_COLOR} />
		{:else}
			<!-- Ligne horizontale -->
			<line
				x1={indicator.start}
				y1={indicator.position}
				x2={indicator.end}
				y2={indicator.position}
				stroke={INDICATOR_COLOR}
				stroke-width={1 / scale}
				stroke-dasharray={`${4 / scale} ${4 / scale}`}
			/>
			<circle cx={indicator.start} cy={indicator.position} r={3 / scale} fill={INDICATOR_COLOR} />
			<circle cx={indicator.end} cy={indicator.position} r={3 / scale} fill={INDICATOR_COLOR} />
		{/if}
	{/each}
</g>
```

**Modifier: `src/lib/whiteboard/components/WhiteboardCanvas.svelte`**

Ajouter le composant SnapIndicators dans le rendu SVG, apres SelectionLayer.

#### Phase 4: Option utilisateur

Ajouter une option dans la toolbar pour activer/desactiver le snapping (Shift pour toggle temporaire).

---

## 2. Distance Guides (Gap Snapping)

### 2.1 Description

Les distance guides montrent quand les espacements entre objets sont egaux. Cela permet d'aligner des objets avec un espacement uniforme.

**Exemple visuel:**

```
┌───┐    ┌───┐    ┌───┐
│ A │◄──►│ B │◄──►│ C │
└───┘    └───┘    └───┘
      50px    50px
         ═══════════
```

Quand l'espace A-B = espace B-C, des indicateurs apparaissent.

### 2.2 Comment tldraw l'implemente

tldraw detecte les "gaps" (espaces) entre shapes alignees:

```typescript
interface Gap {
	startNode: { id: string; pageBounds: Box };
	endNode: { id: string; pageBounds: Box };
	startEdge: [Vec, Vec]; // Bord droit du startNode
	endEdge: [Vec, Vec]; // Bord gauche du endNode
	length: number; // Distance entre les deux
	breadthIntersection: [number, number]; // Zone de chevauchement vertical
}
```

**Algorithme pour collecter les gaps horizontaux:**

```typescript
// 1. Trier les shapes par position X
const sortedShapes = shapes.sort((a, b) => a.bounds.minX - b.bounds.minX);

// 2. Pour chaque paire de shapes
for (let i = 0; i < sortedShapes.length; i++) {
	for (let j = i + 1; j < sortedShapes.length; j++) {
		const start = sortedShapes[i];
		const end = sortedShapes[j];

		// Verifier qu'il y a un espace entre eux
		if (start.bounds.maxX < end.bounds.minX) {
			// Verifier qu'ils se chevauchent verticalement
			if (rangesOverlap(start.bounds.minY, start.bounds.maxY, end.bounds.minY, end.bounds.maxY)) {
				gaps.push({
					startNode: start,
					endNode: end,
					length: end.bounds.minX - start.bounds.maxX
					// ...
				});
			}
		}
	}
}
```

**Types de gap snapping:**

1. **Gap Center** : Snapper au centre d'un gap existant
2. **Gap Duplicate** : Creer un gap de meme taille qu'un gap adjacent

### 2.3 Plan d'implementation pour UbuMaths

#### Extension du module snapping

**Ajouter a `src/lib/whiteboard/core/snapping.ts`:**

```typescript
// Types pour les gaps
export interface Gap {
	startElement: WhiteboardElement;
	endElement: WhiteboardElement;
	startEdge: { x: number; y1: number; y2: number };
	endEdge: { x: number; y1: number; y2: number };
	length: number;
	direction: 'horizontal' | 'vertical';
}

export interface GapSnapIndicator {
	type: 'gap';
	direction: 'horizontal' | 'vertical';
	gaps: Array<{
		startEdge: { x: number; y1: number; y2: number };
		endEdge: { x: number; y1: number; y2: number };
	}>;
}

/**
 * Detecte les gaps entre elements non-selectionnes
 */
function collectVisibleGaps(
	elements: readonly WhiteboardElement[],
	selectedIds: Set<string>
): { horizontal: Gap[]; vertical: Gap[] } {
	const horizontal: Gap[] = [];
	const vertical: Gap[] = [];

	// Filtrer les elements non-selectionnes
	const otherElements = elements.filter((e) => !selectedIds.has(e.id));

	// Trier par position X pour les gaps horizontaux
	const sortedByX = [...otherElements].sort((a, b) => {
		const boundsA = getElementBounds(a);
		const boundsB = getElementBounds(b);
		return boundsA.x - boundsB.x;
	});

	// Collecter les gaps horizontaux
	for (let i = 0; i < sortedByX.length; i++) {
		const start = sortedByX[i];
		const startBounds = getElementBounds(start);

		for (let j = i + 1; j < sortedByX.length; j++) {
			const end = sortedByX[j];
			const endBounds = getElementBounds(end);

			// Y a-t-il un espace entre eux?
			if (startBounds.x + startBounds.width < endBounds.x) {
				// Se chevauchent-ils verticalement?
				const yOverlap = rangesOverlap(
					startBounds.y,
					startBounds.y + startBounds.height,
					endBounds.y,
					endBounds.y + endBounds.height
				);

				if (yOverlap) {
					horizontal.push({
						startElement: start,
						endElement: end,
						startEdge: {
							x: startBounds.x + startBounds.width,
							y1: Math.max(startBounds.y, endBounds.y),
							y2: Math.min(startBounds.y + startBounds.height, endBounds.y + endBounds.height)
						},
						endEdge: {
							x: endBounds.x,
							y1: Math.max(startBounds.y, endBounds.y),
							y2: Math.min(startBounds.y + startBounds.height, endBounds.y + endBounds.height)
						},
						length: endBounds.x - (startBounds.x + startBounds.width),
						direction: 'horizontal'
					});
				}
			}
		}
	}

	// Meme logique pour les gaps verticaux (trier par Y)
	// ...

	return { horizontal, vertical };
}

/**
 * Trouve les snaps de gap (espacement egal)
 */
function findGapSnaps(
	selectionBounds: BoundingBox,
	gaps: Gap[],
	direction: 'horizontal' | 'vertical',
	threshold: number
): { nudge: number; indicators: GapSnapIndicator[] } | null {
	// Pour chaque gap existant, verifier si la selection peut creer un gap egal

	for (const gap of gaps) {
		if (direction === 'horizontal') {
			// Distance entre la selection et le startElement du gap
			const distToStart = selectionBounds.x - gap.startEdge.x;
			// Distance entre la selection et le endElement du gap
			const selectionRight = selectionBounds.x + selectionBounds.width;
			const distFromEnd = gap.endEdge.x - selectionRight;

			// Verifier si l'un des deux espaces est proche de gap.length
			if (Math.abs(distToStart - gap.length) < threshold) {
				return {
					nudge: gap.length - distToStart,
					indicators: [
						{
							type: 'gap',
							direction: 'horizontal',
							gaps: [
								{
									startEdge: gap.startEdge,
									endEdge: { x: selectionBounds.x, y1: gap.startEdge.y1, y2: gap.startEdge.y2 }
								},
								{ startEdge: gap.startEdge, endEdge: gap.endEdge }
							]
						}
					]
				};
			}
		}
	}

	return null;
}
```

#### Indicateurs visuels des gaps

**Ajouter a `SnapIndicators.svelte`:**

```svelte
{#each gapIndicators as indicator}
	{#if indicator.direction === 'horizontal'}
		{#each indicator.gaps as gap}
			<!-- Lignes des bords -->
			<line
				x1={gap.startEdge.x}
				y1={gap.startEdge.y1}
				x2={gap.startEdge.x}
				y2={gap.startEdge.y2}
				stroke={INDICATOR_COLOR}
				stroke-width={1 / scale}
			/>
			<line
				x1={gap.endEdge.x}
				y1={gap.endEdge.y1}
				x2={gap.endEdge.x}
				y2={gap.endEdge.y2}
				stroke={INDICATOR_COLOR}
				stroke-width={1 / scale}
			/>
			<!-- Ligne de distance avec fleches -->
			{@const midY = (gap.startEdge.y1 + gap.startEdge.y2) / 2}
			<line
				x1={gap.startEdge.x}
				y1={midY}
				x2={gap.endEdge.x}
				y2={midY}
				stroke={INDICATOR_COLOR}
				stroke-width={1 / scale}
			/>
			<!-- Fleches aux extremites -->
			<polygon points={arrowHead(gap.startEdge.x, midY, 'right', scale)} fill={INDICATOR_COLOR} />
			<polygon points={arrowHead(gap.endEdge.x, midY, 'left', scale)} fill={INDICATOR_COLOR} />
		{/each}
	{/if}
{/each}
```

---

## 3. Resume des fichiers a creer/modifier

### Nouveaux fichiers

| Fichier                                               | Description                         |
| ----------------------------------------------------- | ----------------------------------- |
| `src/lib/whiteboard/core/snapping.ts`                 | Logique de snapping (points + gaps) |
| `src/lib/whiteboard/components/SnapIndicators.svelte` | Rendu des lignes de snap            |
| `src/lib/whiteboard/core/snapping.test.ts`            | Tests unitaires                     |

### Fichiers a modifier

| Fichier                               | Modifications                                                   |
| ------------------------------------- | --------------------------------------------------------------- |
| `stores/whiteboard.svelte.ts`         | Ajouter `snapIndicators` state, modifier `setLivePositionBatch` |
| `components/WhiteboardCanvas.svelte`  | Ajouter `<SnapIndicators>`                                      |
| `components/WhiteboardToolbar.svelte` | Ajouter toggle snapping (optionnel)                             |

---

## 4. Comportement utilisateur

### Raccourcis clavier

| Touche           | Action                                                |
| ---------------- | ----------------------------------------------------- |
| (defaut)         | Snapping actif                                        |
| `Alt` (maintenu) | Desactive temporairement le snapping                  |
| `Shift`          | Contraint le mouvement horizontal/vertical (existant) |

### Feedback visuel

1. **Lignes de snap** : Lignes bleues pointillees quand alignement detecte
2. **Distance guides** : Doubles fleches montrant les espacements egaux
3. **Points de snap** : Petits cercles aux points d'alignement

---

## 5. Tests a ecrire

```typescript
describe('Snapping', () => {
	describe('Point snapping', () => {
		it('should snap to center when within threshold');
		it('should snap to corner when within threshold');
		it('should snap independently on X and Y axes');
		it('should not snap when beyond threshold');
		it('should adjust threshold based on zoom level');
	});

	describe('Gap snapping', () => {
		it('should detect horizontal gaps between shapes');
		it('should detect vertical gaps between shapes');
		it('should snap to equal spacing');
		it('should show gap indicators when snapping');
	});

	describe('Integration', () => {
		it('should apply snap nudge to live positions');
		it('should clear indicators when drag ends');
		it('should respect Alt key to disable snapping');
	});
});
```

---

## 6. Estimation d'effort

| Phase                          | Effort   |
| ------------------------------ | -------- |
| Phase 1: Core snapping module  | ~4h      |
| Phase 2: Integration store     | ~2h      |
| Phase 3: Composant indicateurs | ~2h      |
| Phase 4: Gap snapping          | ~4h      |
| Tests unitaires                | ~2h      |
| Tests integration              | ~2h      |
| **Total**                      | **~16h** |

---

## 7. Priorites

1. **MVP** : Point snapping (coins + centre) - utilisable immediatement
2. **V1** : Edge snapping + indicateurs visuels
3. **V2** : Gap snapping (espacements egaux)
