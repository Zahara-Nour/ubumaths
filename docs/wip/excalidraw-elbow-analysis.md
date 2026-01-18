# Analyse de l'algorithme Elbow Arrow d'Excalidraw

## Résumé des problèmes actuels UbuMaths

1. **Routage A\* traverse les rectangles** - Les flèches passent à travers ou le long des obstacles
2. **Hover highlight montre un L-shape** - Au lieu du chemin réellement rendu
3. **Hit-testing incorrect** - Ne correspond pas au chemin rendu
4. **Bindings non respectés** - La flèche ne sort pas du bon côté des shapes

---

## Architecture Excalidraw (elbowArrow.ts)

### 1. Types de données

```typescript
// Heading = [dx, dy] comme tuple numérique
type Heading = [1, 0] | [0, 1] | [-1, 0] | [0, -1];
// HEADING_RIGHT = [1, 0], HEADING_DOWN = [0, 1], etc.

// Points typés pour éviter confusion local/global
type GlobalPoint = [number, number] & { _brand: 'globalpoint' };
type LocalPoint = [number, number] & { _brand: 'localpoint' };

// Bounds = [minX, minY, maxX, maxY]
type Bounds = [number, number, number, number];
```

**UbuMaths utilise** : `Heading = 'up' | 'down' | 'left' | 'right'` (strings) et `Point = { x, y }` (objets).

### 2. Structure de la grille A\*

**Excalidraw** : Grille **NON-uniforme** basée sur les limites des AABBs :

```typescript
// calculateGrid() crée une grille à partir des frontières des bounding boxes
const horizontal = new Set<number>();
const vertical = new Set<number>();

aabbs.forEach((aabb) => {
	horizontal.add(aabb[0]); // minX
	horizontal.add(aabb[2]); // maxX
	vertical.add(aabb[1]); // minY
	vertical.add(aabb[3]); // maxY
});

// Résultat : les nœuds sont aux intersections des lignes de grille
// => Moins de nœuds, mais précis aux frontières des obstacles
```

**UbuMaths utilise** : Grille **uniforme** avec `gridSize` fixe (10px par défaut) :

```typescript
// Snap tous les points à la grille uniforme
function snapToGrid(point: Point, gridSize: number): Point {
	return {
		x: Math.round(point.x / gridSize) * gridSize,
		y: Math.round(point.y / gridSize) * gridSize
	};
}
```

**Problème** : La grille uniforme ne garantit pas que les frontières des obstacles sont représentées exactement.

### 3. AABBs Dynamiques (CRITIQUE)

**Excalidraw** génère des AABBs **dynamiques** pour les éléments source et destination :

```typescript
const generateDynamicAABBs = (
	startBounds: Bounds,
	endBounds: Bounds,
	commonBounds: Bounds,
	startOffset: [number, number, number, number],
	endOffset: [number, number, number, number]
	// ...
): Bounds[] => {
	// Les AABBs sont expandés différemment selon la direction de sortie (heading)
	// et peuvent se diviser si les bounds se chevauchent dans certaines configurations
};
```

L'offset est calculé selon le heading :

```typescript
const offsetFromHeading = (
	heading: Heading,
	head: number, // Expansion dans la direction du heading
	side: number // Expansion perpendiculaire
): [number, number, number, number] => {
	switch (heading) {
		case HEADING_UP:
			return [head, side, side, side];
		case HEADING_RIGHT:
			return [side, head, side, side];
		case HEADING_DOWN:
			return [side, side, head, side];
		case HEADING_LEFT:
			return [side, side, side, head];
	}
};
```

**UbuMaths utilise** : Expansion uniforme de tous les obstacles :

```typescript
const obstacles = rawObstacles.map((aabb) => expandAABB(aabb, cfg.obstacleGap));
```

**Problème** : L'expansion uniforme ne tient pas compte de la direction de sortie, ce qui cause des chemins qui longent les bords.

### 4. Système de "Dongles"

**Excalidraw** utilise des points intermédiaires appelés "dongles" :

```typescript
// Un dongle est un point de départ/arrivée sur le bord de l'AABB dynamique
const startDonglePosition = getDonglePosition(
	dynamicAABBs[0], // L'AABB dynamique du start
	startHeading, // La direction de sortie
	startGlobalPoint // Le point de connexion réel
);

const getDonglePosition = (bounds: Bounds, heading: Heading, p: GlobalPoint): GlobalPoint => {
	switch (heading) {
		case HEADING_UP:
			return [p[0], bounds[1]]; // Projette sur le bord supérieur
		case HEADING_RIGHT:
			return [bounds[2], p[1]]; // Projette sur le bord droit
		case HEADING_DOWN:
			return [p[0], bounds[3]]; // Projette sur le bord inférieur
		case HEADING_LEFT:
			return [bounds[0], p[1]]; // Projette sur le bord gauche
	}
};
```

Le routage A\* va du **startDongle** au **endDongle**, puis le chemin final inclut :

1. `startGlobalPoint` (point de connexion sur le shape)
2. Le chemin A\* (depuis dongle vers dongle)
3. `endGlobalPoint` (point de connexion sur le shape)

**UbuMaths** : Pas de concept de dongles. Le A\* démarre directement du point de connexion.

### 5. Calcul du Heading depuis un Shape

**Excalidraw** utilise `headingForPointFromElement()` qui :

1. Crée des "search cones" autour du centre de l'élément
2. Utilise `triangleIncludesPoint()` pour déterminer dans quel quadrant se trouve le point
3. Gère spécialement les diamonds (losanges)

```typescript
export const headingForPointFromElement = (
  element: ExcalidrawBindableElement,
  aabb: Bounds,
  p: GlobalPoint,
): Heading => {
  const midPoint = getCenterForBounds(aabb);

  // Scale corners to create search cones
  const SEARCH_CONE_MULTIPLIER = 2;
  const topLeft = pointScaleFromOrigin(pointFrom(aabb[0], aabb[1]), midPoint, SEARCH_CONE_MULTIPLIER);
  // ... autres corners

  // Utilise triangleIncludesPoint pour déterminer le heading
  return triangleIncludesPoint([topLeft, topRight, midPoint], p)
    ? HEADING_UP
    : triangleIncludesPoint([topRight, bottomRight, midPoint], p)
    ? HEADING_RIGHT
    // ...
};
```

**UbuMaths** utilise simplement la direction du vecteur entre centre et point :

```typescript
export function vectorToHeading(dx: number, dy: number): Heading {
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0 ? 'right' : 'left';
	} else {
		return dy > 0 ? 'down' : 'up';
	}
}
```

**Problème** : Cette méthode simpliste ne prend pas en compte la forme de l'élément ni la position exacte sur le bord.

### 6. Algorithme A\* avec pénalités

**Excalidraw** :

```typescript
const astar = (
	start: Node,
	end: Node,
	grid: Grid,
	startHeading: Heading,
	endHeading: Heading,
	aabbs: Bounds[]
) => {
	const bendMultiplier = m_dist(start.pos, end.pos); // Distance Manhattan

	while (open.size() > 0) {
		// ...
		for (const neighbor of neighbors) {
			// Vérifie l'intersection avec le point médian du segment
			const neighborHalfPoint = pointScaleFromOrigin(neighbor.pos, current.pos, 0.5);
			if (isAnyTrue(...aabbs.map((aabb) => pointInsideBounds(neighborHalfPoint, aabb)))) {
				continue; // REJETTE si le milieu du segment est dans un AABB
			}

			// Empêche le retour en arrière
			const reverseHeading = flipHeading(previousDirection);
			if (compareHeading(reverseHeading, neighborHeading)) {
				continue;
			}

			// Pénalité pour changement de direction
			const directionChange = previousDirection !== neighborHeading;
			const gScore =
				current.g +
				m_dist(neighbor.pos, current.pos) +
				(directionChange ? Math.pow(bendMultiplier, 3) : 0); // Pénalité CUBIQUE !

			// Estimation des virages restants
			neighbor.h = m_dist(end.pos, neighbor.pos) + estBendCount * Math.pow(bendMultiplier, 2); // Pénalité QUADRATIQUE
		}
	}
};
```

**UbuMaths** :

```typescript
// Pénalité linéaire pour les virages
if (heading !== node.heading) {
	if (areHeadingsPerpendicular(heading, node.heading)) {
		cost += gridSize * turnPenalty; // turnPenalty = 2 par défaut
	} else {
		cost += gridSize * turnPenalty * 10; // Retour arrière
	}
}
```

**Problème** : La pénalité linéaire n'est pas assez dissuasive. Excalidraw utilise des pénalités **cubiques** proportionnelles à la distance totale.

### 7. Validation des segments

**Excalidraw** vérifie le **point médian** de chaque segment :

```typescript
const neighborHalfPoint = pointScaleFromOrigin(neighbor.pos, current.pos, 0.5);
if (pointInsideBounds(neighborHalfPoint, aabb)) {
	continue; // Rejette
}
```

**UbuMaths** vérifie l'intersection segment-AABB complète :

```typescript
const segment = { p1: { x: current.x, y: current.y }, p2: { x: neighbor.x, y: neighbor.y } };
const intersectsObstacle = obstacles.some((o) => segmentIntersectsAABB(segment, o));
```

**Problème potentiel** : La méthode UbuMaths devrait fonctionner, mais comme les AABBs ne sont pas dynamiques selon le heading, les segments peuvent "longer" les bords.

---

## Flux de données Excalidraw

```
1. getElbowArrowData()
   ├── Calcule startGlobalPoint et endGlobalPoint depuis les bindings
   ├── Calcule startHeading et endHeading via getBindPointHeading()
   ├── Crée les startElementBounds et endElementBounds
   ├── Génère dynamicAABBs via generateDynamicAABBs()
   └── Calcule startDonglePosition et endDonglePosition

2. routeElbowArrow()
   ├── calculateGrid() - Crée la grille non-uniforme
   ├── pointToGridNode() - Trouve les nœuds start et end
   └── astar() - Trouve le chemin

3. Post-traitement
   ├── removeElbowArrowShortSegments() - Élimine segments < 1px
   ├── getElbowArrowCornerPoints() - Garde uniquement les coins
   └── normalizeArrowElementUpdate() - Convertit en coordonnées locales
```

---

## Différences critiques à corriger

| Aspect               | Excalidraw                             | UbuMaths                  | Correction                             |
| -------------------- | -------------------------------------- | ------------------------- | -------------------------------------- |
| **Grille**           | Non-uniforme, aux frontières des AABBs | Uniforme, gridSize fixe   | Implémenter grille dynamique           |
| **AABBs**            | Dynamiques selon heading               | Expansion uniforme        | Implémenter generateDynamicAABBs       |
| **Dongles**          | Points intermédiaires obligatoires     | Absent                    | Ajouter système de dongles             |
| **Heading calc**     | Search cones + triangleIncludesPoint   | Simple vectorToHeading    | Implémenter headingForPointFromElement |
| **Pénalité virages** | Cubique (bendMultiplier³)              | Linéaire (turnPenalty)    | Augmenter pénalité                     |
| **Validation**       | Point médian dans AABB                 | Intersection segment-AABB | Vérifier, peut être OK                 |
| **Normalisation**    | Global → Local via premier point       | Absent                    | Implémenter                            |

---

## Plan de correction recommandé

### Phase 1 : Types et structure

1. Convertir `Heading` de string vers tuple `[number, number]`
2. Ajouter distinction `GlobalPoint` / `LocalPoint` (ou garder objets mais séparer)
3. Adapter `Bounds` vers format `[minX, minY, maxX, maxY]`

### Phase 2 : Core routing

1. Implémenter `calculateGrid()` avec grille non-uniforme
2. Implémenter `generateDynamicAABBs()` avec offsets selon heading
3. Ajouter système de dongles (`getDonglePosition()`)
4. Adapter `astar()` avec pénalités cubiques

### Phase 3 : Headings et bindings

1. Implémenter `headingForPointFromElement()` avec search cones
2. Adapter `getHeadingForElbowArrowSnap()` pour le snap au binding

### Phase 4 : Post-traitement

1. `removeElbowArrowShortSegments()` - segment cleanup
2. `getElbowArrowCornerPoints()` - garde uniquement les coins
3. `normalizeArrowElementUpdate()` - conversion locale

### Phase 5 : Intégration

1. Mettre à jour hover highlight pour utiliser les vrais points calculés
2. Corriger hit-testing pour utiliser les points stockés
3. Tests de non-régression

---

## Décisions prises

1. **Migration des types** : ✅ Coller au maximum à Excalidraw (tuples pour Heading, format Bounds, etc.)

2. **Scope** : ✅ Commencer par rectangle → rectangle, puis étendre

3. **Tests** : ✅ Repartir sur des bases saines, réécrire les tests

---

## Plan d'implémentation

### Phase 1 : Refonte des types de base

**Fichiers à créer/modifier :**

- `src/lib/whiteboard/core/elbow-routing.ts` - Réécriture complète

**Types à aligner sur Excalidraw :**

```typescript
// Heading comme tuple [dx, dy]
export type Heading = [1, 0] | [0, 1] | [-1, 0] | [0, -1];
export const HEADING_RIGHT: Heading = [1, 0];
export const HEADING_DOWN: Heading = [0, 1];
export const HEADING_LEFT: Heading = [-1, 0];
export const HEADING_UP: Heading = [0, -1];

// Bounds comme tuple [minX, minY, maxX, maxY]
export type Bounds = [number, number, number, number];

// Points comme tuples pour le routage interne
type RoutingPoint = [number, number];
```

### Phase 2 : Core routing (copie adaptée d'Excalidraw)

**Fonctions à implémenter :**

1. `calculateGrid()` - Grille non-uniforme
2. `generateDynamicAABBs()` - AABBs avec offset selon heading
3. `getDonglePosition()` - Points intermédiaires
4. `astar()` - Avec pénalités cubiques
5. `offsetFromHeading()` - Calcul des offsets
6. `pointInsideBounds()` - Test point dans bounds

### Phase 3 : Headings et connexion aux shapes

**Fonctions à implémenter :**

1. `headingForPointFromElement()` - Search cones
2. `vectorToHeading()` - Vecteur vers heading
3. `compareHeading()` - Comparaison de headings
4. `flipHeading()` - Inverse un heading

### Phase 4 : Post-traitement et normalisation

**Fonctions à implémenter :**

1. `removeElbowArrowShortSegments()` - Cleanup
2. `getElbowArrowCornerPoints()` - Garde uniquement les coins
3. Conversion des points de routage vers le format UbuMaths `Point`

### Phase 5 : Intégration

**Fichiers à modifier :**

- `src/lib/whiteboard/core/binding.ts` - Adapter l'appel à routeElbowArrow
- `src/lib/whiteboard/core/binding-updates.ts` - Idem
- `src/lib/whiteboard/components/SelectionLayer.svelte` - Hover avec vrais points
- `src/lib/whiteboard/core/hit-testing.ts` - Hit-testing avec vrais points

### Phase 6 : Tests

**Fichier à créer :**

- `src/lib/whiteboard/core/elbow-routing.test.ts` - Nouveaux tests

**Cas de test :**

1. Deux rectangles côte à côte (horizontalement)
2. Deux rectangles l'un au-dessus de l'autre
3. Deux rectangles en diagonale
4. Rectangles qui se chevauchent partiellement
5. Flèche qui doit contourner un obstacle
6. Headings forcés (sortie par un côté spécifique)
