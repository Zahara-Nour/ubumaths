# Excalidraw - Documentation Technique

> Documentation technique complete du code source Excalidraw utilise dans UbuMaths.
> Source: `extern/excalidraw/`

---

## Table des Matieres

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture du Monorepo](#architecture-du-monorepo)
3. [Packages Principaux](#packages-principaux)
4. [Systeme d'Elements](#systeme-delements)
5. [Gestion d'Etat](#gestion-detat)
6. [Systeme de Rendu](#systeme-de-rendu)
7. [Systeme d'Actions](#systeme-dactions)
8. [Persistance des Donnees](#persistance-des-donnees)
9. [Collaboration en Temps Reel](#collaboration-en-temps-reel)
10. [API Publique](#api-publique)
11. [Integration dans UbuMaths](#integration-dans-ubumaths)

---

## Vue d'Ensemble

Excalidraw est un editeur de diagrammes collaboratif open-source avec un style "dessine a la main". C'est une application React complete avec:

- Canvas infini avec zoom/pan
- Style hand-drawn (via roughjs)
- Collaboration temps reel (WebSocket + E2E encryption)
- Export PNG/SVG/JSON
- Bibliotheque de formes
- Support offline (PWA)

### Stack Technique

| Technologie    | Usage            |
| -------------- | ---------------- |
| React 19       | UI Components    |
| TypeScript 5.9 | Type safety      |
| Jotai          | State management |
| roughjs        | Rendu hand-drawn |
| Vite           | Build tool       |
| Socket.io      | Collaboration    |
| Web Crypto API | E2E encryption   |
| Canvas 2D API  | Rendu graphique  |

---

## Architecture du Monorepo

```
extern/excalidraw/
├── packages/                    # Packages npm publies
│   ├── excalidraw/             # @excalidraw/excalidraw - Composant React principal
│   ├── element/                # @excalidraw/element - Gestion des elements
│   ├── math/                   # @excalidraw/math - Utilitaires geometriques
│   ├── common/                 # @excalidraw/common - Utilitaires partages
│   └── utils/                  # @excalidraw/utils - Export utilities
├── excalidraw-app/             # Application web (excalidraw.com)
│   ├── collab/                 # Collaboration temps reel
│   ├── data/                   # Persistance (Firebase, localStorage)
│   └── components/             # Composants specifiques app
├── examples/                   # Exemples d'integration
│   ├── with-nextjs/           # Integration Next.js
│   └── with-script-in-browser/ # Integration vanilla JS
└── dev-docs/                   # Documentation Docusaurus
```

### Hierarchie des Dependances

```
@excalidraw/excalidraw
    ├── @excalidraw/element
    │       └── @excalidraw/math
    │       └── @excalidraw/common
    ├── @excalidraw/common
    └── @excalidraw/utils
            └── @excalidraw/element
```

---

## Packages Principaux

### @excalidraw/common

Utilitaires partages entre tous les packages.

**Fichiers cles:**

- `constants.ts` - Constantes globales (FONT_FAMILY, THEME, MIME_TYPES, etc.)
- `colors.ts` - Palette de couleurs et manipulation
- `utils.ts` - Fonctions utilitaires generiques
- `keys.ts` - Gestion clavier
- `editorInterface.ts` - Interface editeur (formFactor, desktopUIMode)

**Constantes importantes:**

```typescript
// Familles de polices
const FONT_FAMILY = {
	Virgil: 1,
	Helvetica: 2,
	Cascadia: 3,
	Excalifont: 5,
	Nunito: 6
	// ...
};

// Themes
const THEME = { LIGHT: 'light', DARK: 'dark' };

// Types MIME
const MIME_TYPES = {
	excalidraw: 'application/vnd.excalidraw+json',
	png: 'image/png',
	svg: 'image/svg+xml'
	// ...
};

// Outils disponibles
const TOOL_TYPE = {
	selection: 'selection',
	rectangle: 'rectangle',
	diamond: 'diamond',
	ellipse: 'ellipse',
	arrow: 'arrow',
	line: 'line',
	freedraw: 'freedraw',
	text: 'text',
	image: 'image',
	eraser: 'eraser',
	hand: 'hand',
	frame: 'frame',
	laser: 'laser'
	// ...
};
```

### @excalidraw/math

Bibliotheque de geometrie 2D.

**Modules:**

| Module         | Description                                        |
| -------------- | -------------------------------------------------- |
| `point.ts`     | Operations sur points (LocalPoint, GlobalPoint)    |
| `vector.ts`    | Vecteurs 2D (addition, normalisation, dot product) |
| `segment.ts`   | Segments de ligne                                  |
| `line.ts`      | Lignes infinies                                    |
| `curve.ts`     | Courbes de Bezier                                  |
| `ellipse.ts`   | Ellipses et cercles                                |
| `polygon.ts`   | Polygones                                          |
| `rectangle.ts` | Rectangles                                         |
| `triangle.ts`  | Triangles                                          |
| `angle.ts`     | Operations angulaires (Radians, Degrees)           |
| `range.ts`     | Intervalles numeriques                             |

**Types fondamentaux:**

```typescript
// Points types (branded types pour type-safety)
type LocalPoint = [number, number] & { _brand: 'local' };
type GlobalPoint = [number, number] & { _brand: 'global' };

// Angles
type Radians = number & { _brand: 'radians' };
type Degrees = number & { _brand: 'degrees' };

// Geometries
type Curve = [GlobalPoint, GlobalPoint, GlobalPoint, GlobalPoint];
type Ellipse = { center: GlobalPoint; halfWidth: number; halfHeight: number };
type Segment = [GlobalPoint, GlobalPoint];
```

### @excalidraw/element

Gestion complete des elements du canvas.

**Modules principaux:**

| Fichier                  | Responsabilite               |
| ------------------------ | ---------------------------- |
| `types.ts`               | Types d'elements (30+ types) |
| `newElement.ts`          | Creation d'elements          |
| `mutateElement.ts`       | Modification immutable       |
| `bounds.ts`              | Calcul des limites           |
| `collision.ts`           | Detection de collision       |
| `binding.ts`             | Liaison elements (arrows)    |
| `renderElement.ts`       | Rendu canvas individuel      |
| `Scene.ts`               | Gestion de scene             |
| `store.ts`               | Store des elements           |
| `transform.ts`           | Transformations geometriques |
| `linearElementEditor.ts` | Edition lignes/fleches       |
| `elbowArrow.ts`          | Fleches orthogonales         |
| `frame.ts`               | Gestion des frames           |
| `groups.ts`              | Groupement d'elements        |

### @excalidraw/excalidraw

Package principal - Composant React exportable.

**Structure:**

```
packages/excalidraw/
├── index.tsx              # Point d'entree, exports publics
├── components/
│   ├── App.tsx           # Composant principal (388KB!)
│   ├── Actions.tsx       # Panneau d'actions
│   ├── ColorPicker/      # Selecteur de couleurs
│   ├── Sidebar/          # Barre laterale
│   ├── main-menu/        # Menu principal
│   └── ...
├── actions/              # Systeme d'actions
├── renderer/             # Moteur de rendu
├── data/                 # Serialisation/deserialisation
├── hooks/                # React hooks
├── fonts/                # Police Excalifont
└── locales/              # i18n (60+ langues)
```

---

## Systeme d'Elements

### Hierarchie des Types

```typescript
// Type de base pour tous les elements
type _ExcalidrawElementBase = Readonly<{
	id: string; // UUID unique
	x: number; // Position X
	y: number; // Position Y
	width: number; // Largeur
	height: number; // Hauteur
	angle: Radians; // Rotation
	strokeColor: string; // Couleur trait
	backgroundColor: string; // Couleur fond
	fillStyle: FillStyle; // "hachure" | "cross-hatch" | "solid" | "zigzag"
	strokeWidth: number; // Epaisseur trait
	strokeStyle: StrokeStyle; // "solid" | "dashed" | "dotted"
	roughness: number; // Niveau hand-drawn (0-2)
	opacity: number; // Opacite (0-100)
	roundness: { type: RoundnessType; value?: number } | null;
	seed: number; // Seed pour roughjs (deterministe)
	version: number; // Version incrementale
	versionNonce: number; // Nonce pour reconciliation
	index: FractionalIndex | null; // Index fractionnaire (ordering)
	isDeleted: boolean; // Soft delete
	groupIds: readonly GroupId[]; // Groupes parents
	frameId: string | null; // Frame parent
	boundElements: readonly BoundElement[] | null;
	updated: number; // Timestamp modification
	link: string | null; // Hyperlink
	locked: boolean; // Verrouillage
	customData?: Record<string, any>;
}>;
```

### Types d'Elements

```typescript
// Formes generiques
type ExcalidrawGenericElement =
	| ExcalidrawSelectionElement // Selection temporaire
	| ExcalidrawRectangleElement // Rectangle
	| ExcalidrawDiamondElement // Losange
	| ExcalidrawEllipseElement; // Ellipse/Cercle

// Elements lineaires
type ExcalidrawLinearElement = _ExcalidrawElementBase & {
	type: 'line' | 'arrow';
	points: readonly LocalPoint[]; // Points du chemin
	startBinding: FixedPointBinding | null;
	endBinding: FixedPointBinding | null;
	startArrowhead: Arrowhead | null;
	endArrowhead: Arrowhead | null;
};

// Fleche avec coudes (elbow arrow)
type ExcalidrawElbowArrowElement = ExcalidrawArrowElement & {
	elbowed: true;
	fixedSegments: readonly FixedSegment[] | null;
};

// Texte
type ExcalidrawTextElement = _ExcalidrawElementBase & {
	type: 'text';
	text: string;
	fontSize: number;
	fontFamily: FontFamilyValues;
	textAlign: TextAlign;
	verticalAlign: VerticalAlign;
	containerId: string | null; // Si dans un container
	originalText: string;
	autoResize: boolean;
	lineHeight: number;
};

// Image
type ExcalidrawImageElement = _ExcalidrawElementBase & {
	type: 'image';
	fileId: FileId | null;
	status: 'pending' | 'saved' | 'error';
	scale: [number, number];
	crop: ImageCrop | null;
};

// Dessin libre
type ExcalidrawFreeDrawElement = _ExcalidrawElementBase & {
	type: 'freedraw';
	points: readonly LocalPoint[];
	pressures: readonly number[];
	simulatePressure: boolean;
};

// Frame
type ExcalidrawFrameElement = _ExcalidrawElementBase & {
	type: 'frame';
	name: string | null;
};

// iFrame/Embeddable
type ExcalidrawIframeElement = _ExcalidrawElementBase & {
	type: 'iframe';
};

// Union de tous les types
type ExcalidrawElement =
	| ExcalidrawGenericElement
	| ExcalidrawTextElement
	| ExcalidrawLinearElement
	| ExcalidrawArrowElement
	| ExcalidrawFreeDrawElement
	| ExcalidrawImageElement
	| ExcalidrawFrameElement
	| ExcalidrawMagicFrameElement
	| ExcalidrawIframeElement
	| ExcalidrawEmbeddableElement;
```

### Types de Pointes de Fleches

```typescript
type Arrowhead =
	| 'arrow' // Fleche standard
	| 'bar' // Barre |
	| 'circle' // Cercle plein
	| 'circle_outline' // Cercle vide
	| 'triangle' // Triangle plein
	| 'triangle_outline' // Triangle vide
	| 'diamond' // Losange plein
	| 'diamond_outline' // Losange vide
	| 'crowfoot_one' // Notation ERD: un
	| 'crowfoot_many' // Notation ERD: plusieurs
	| 'crowfoot_one_or_many'; // Notation ERD: un ou plusieurs
```

### Versioning et Reconciliation

Chaque element a un systeme de versioning pour la collaboration:

```typescript
{
	version: number; // Incremente a chaque modification
	versionNonce: number; // Nonce aleatoire pour departager les conflits
	index: FractionalIndex; // Index fractionnaire pour l'ordering
}
```

L'algorithme de reconciliation (`data/reconcile.ts`) utilise ces champs pour fusionner les modifications concurrentes.

### Creation d'Elements

```typescript
import { newElement, newTextElement, newLinearElement } from '@excalidraw/element';

// Rectangle
const rect = newElement({
	type: 'rectangle',
	x: 100,
	y: 100,
	width: 200,
	height: 100,
	strokeColor: '#000000',
	backgroundColor: '#ffffff'
});

// Texte
const text = newTextElement({
	x: 150,
	y: 150,
	text: 'Hello',
	fontSize: 20,
	fontFamily: FONT_FAMILY.Excalifont
});

// Fleche
const arrow = newLinearElement({
	type: 'arrow',
	x: 0,
	y: 0,
	points: [
		[0, 0],
		[100, 50]
	],
	startArrowhead: null,
	endArrowhead: 'arrow'
});
```

### Modification d'Elements

Les elements sont immutables. Utiliser `mutateElement` ou `newElementWith`:

```typescript
import { mutateElement, newElementWith } from '@excalidraw/element';

// Mutation in-place (pour performance pendant drag)
mutateElement(element, { x: element.x + 10 });

// Creation d'une copie modifiee (pour history)
const updated = newElementWith(element, { strokeColor: '#ff0000' });
```

---

## Gestion d'Etat

### AppState

L'etat principal de l'application:

```typescript
interface AppState {
	// Canvas
	zoom: Zoom;
	scrollX: number;
	scrollY: number;
	width: number;
	height: number;
	viewBackgroundColor: string;

	// Outil actif
	activeTool: {
		type: ToolType;
		customType: string | null;
		lastActiveTool: ActiveTool | null;
		locked: boolean;
		fromSelection: boolean;
	};

	// Selection
	selectedElementIds: { [id: string]: true };
	selectedGroupIds: { [groupId: string]: boolean };
	editingGroupId: GroupId | null;
	selectedLinearElement: LinearElementEditor | null;

	// Elements en cours
	newElement: ExcalidrawNonSelectionElement | null;
	resizingElement: ExcalidrawElement | null;
	editingTextElement: ExcalidrawElement | null;

	// UI
	theme: Theme;
	zenModeEnabled: boolean;
	viewModeEnabled: boolean;
	gridModeEnabled: boolean;
	gridSize: number;
	gridStep: number;
	openSidebar: { name: string; tab?: string } | null;
	openDialog: DialogState | null;

	// Collaboration
	collaborators: Map<SocketId, Collaborator>;
	userToFollow: UserToFollow | null;

	// Style courant (applique aux nouveaux elements)
	currentItemStrokeColor: string;
	currentItemBackgroundColor: string;
	currentItemFillStyle: FillStyle;
	currentItemStrokeWidth: number;
	currentItemFontFamily: FontFamilyValues;
	currentItemFontSize: number;
	// ...
}
```

### Jotai Integration

Excalidraw utilise Jotai pour la gestion d'etat locale:

```typescript
// packages/excalidraw/editor-jotai.ts
import { atom, createStore } from 'jotai';
import { createIsolation } from 'jotai-scope';

const jotai = createIsolation();

export { atom, useAtom, useSetAtom, useAtomValue, useStore };
export const EditorJotaiProvider = jotai.Provider;
export const editorJotaiStore = createStore();
```

L'isolation Jotai permet d'avoir plusieurs instances d'Excalidraw independantes.

### Scene Management

La classe `Scene` gere les elements du canvas:

```typescript
class Scene {
	// Elements
	private elements: readonly OrderedExcalidrawElement[] = [];
	private elementsMap: SceneElementsMap;
	private nonDeletedElements: readonly NonDeletedExcalidrawElement[] = [];

	// Cache de selection
	private selectedElementsCache: {
		selectedElementIds: AppState['selectedElementIds'] | null;
		elements: readonly NonDeletedExcalidrawElement[] | null;
	};

	// Methodes
	getElements(): readonly OrderedExcalidrawElement[];
	getElementsMapIncludingDeleted(): SceneElementsMap;
	getNonDeletedElements(): readonly NonDeletedExcalidrawElement[];
	getSelectedElements(opts: {
		selectedElementIds: AppState['selectedElementIds'];
	}): NonDeletedExcalidrawElement[];

	replaceAllElements(elements: ElementsMapOrArray): void;
	insertElement(element: ExcalidrawElement): void;
	insertElements(elements: ExcalidrawElement[]): void;

	// Callbacks
	onUpdate(callback: () => void): () => void;
}
```

---

## Systeme de Rendu

### Architecture Double Canvas

Excalidraw utilise deux canvas superposes:

1. **Static Canvas** - Elements statiques (formes, images)
2. **Interactive Canvas** - Elements interactifs (selection, curseurs, guides)

```
┌─────────────────────────────────────┐
│        Interactive Canvas           │  ← Curseurs, selection, guides
├─────────────────────────────────────┤
│          Static Canvas              │  ← Elements, images, grille
└─────────────────────────────────────┘
```

### Fichiers de Rendu

```
packages/excalidraw/renderer/
├── staticScene.ts         # Rendu des elements statiques
├── interactiveScene.ts    # Rendu des elements interactifs
├── staticSvgScene.ts      # Export SVG
├── renderSnaps.ts         # Lignes de snap
├── helpers.ts             # Fonctions utilitaires
└── animation.ts           # Animations
```

### Rendu Statique

```typescript
// renderer/staticScene.ts
export const renderStaticScene = ({
	canvas,
	rc, // RoughCanvas instance
	elements,
	visibleElements,
	scale,
	appState,
	renderConfig
}) => {
	// 1. Clear canvas
	// 2. Draw grid (if enabled)
	// 3. Draw elements (sorted by z-index)
	// 4. Draw frames
	// 5. Draw element links
};
```

### Rendu d'Element Individuel

```typescript
// packages/element/src/renderElement.ts
export const renderElement = (
	element: ExcalidrawElement,
	elementsMap: ElementsMap,
	rc: RoughCanvas,
	context: CanvasRenderingContext2D,
	renderConfig: RenderConfig,
	appState: StaticCanvasAppState
) => {
	switch (element.type) {
		case 'rectangle':
			// Dessine rectangle avec roughjs
			rc.rectangle(x, y, width, height, options);
			break;
		case 'ellipse':
			rc.ellipse(cx, cy, width, height, options);
			break;
		case 'text':
			// Rendu texte natif canvas
			context.fillText(text, x, y);
			break;
		// ...
	}
};
```

### roughjs Integration

```typescript
import rough from 'roughjs/bin/rough';

const rc = rough.canvas(canvas);

// Options roughjs pour style hand-drawn
const options = {
	seed: element.seed, // Deterministe
	roughness: element.roughness, // 0 (clean) to 2 (sketchy)
	strokeWidth: element.strokeWidth,
	stroke: element.strokeColor,
	fill: element.backgroundColor,
	fillStyle: element.fillStyle // "hachure", "solid", etc.
};
```

---

## Systeme d'Actions

### Structure d'une Action

```typescript
// actions/types.ts
interface Action<TData = any> {
	name: ActionName;
	label: string | ((elements, appState, app) => string);
	keywords?: string[]; // Pour recherche
	icon?: React.ReactNode;

	// Execution
	perform: (elements, appState, formData, app) => ActionResult;

	// Raccourcis clavier
	keyTest?: (event, appState, elements, app) => boolean;
	keyPriority?: number;

	// Conditions d'affichage
	predicate?: (elements, appState, appProps, app) => boolean;
	checked?: (appState) => boolean;

	// Tracking
	trackEvent: false | { category: string; action?: string };

	// View mode
	viewMode?: boolean;
}

type ActionResult =
	| {
			elements?: readonly ExcalidrawElement[] | null;
			appState?: Partial<AppState> | null;
			files?: BinaryFiles | null;
			captureUpdate: CaptureUpdateActionType;
	  }
	| false;
```

### Actions Disponibles

```typescript
type ActionName =
	// Clipboard
	| 'copy'
	| 'cut'
	| 'paste'
	| 'copyAsPng'
	| 'copyAsSvg'
	| 'copyText'

	// Z-order
	| 'sendBackward'
	| 'bringForward'
	| 'sendToBack'
	| 'bringToFront'

	// Style
	| 'copyStyles'
	| 'pasteStyles'
	| 'changeStrokeColor'
	| 'changeBackgroundColor'
	| 'changeFillStyle'
	| 'changeStrokeWidth'
	| 'changeStrokeStyle'
	| 'changeArrowhead'
	| 'changeArrowType'
	| 'changeOpacity'
	| 'changeFontSize'
	| 'changeFontFamily'
	| 'changeTextAlign'
	| 'changeVerticalAlign'
	| 'changeRoundness'

	// View
	| 'gridMode'
	| 'zenMode'
	| 'viewMode'
	| 'toggleTheme'
	| 'zoomIn'
	| 'zoomOut'
	| 'resetZoom'
	| 'zoomToFit'

	// Edit
	| 'selectAll'
	| 'deleteSelectedElements'
	| 'duplicateSelection'
	| 'group'
	| 'ungroup'
	| 'alignTop'
	| 'alignBottom'
	| 'alignLeft'
	| 'alignRight'
	| 'distributeHorizontally'
	| 'distributeVertically'
	| 'flipHorizontal'
	| 'flipVertical'

	// History
	| 'undo'
	| 'redo'

	// File
	| 'saveToActiveFile'
	| 'saveFileToDisk'
	| 'loadScene'
	| 'clearCanvas'
	| 'changeExportBackground'
	| 'changeExportScale';

// ...
```

### Exemple d'Action

```typescript
// actions/actionDeleteSelected.tsx
export const actionDeleteSelected = register({
	name: 'deleteSelectedElements',
	label: 'labels.delete',
	icon: TrashIcon,

	perform: (elements, appState, _, app) => {
		const selectedElements = getSelectedElements(elements, appState);

		if (!selectedElements.length) {
			return false;
		}

		const nextElements = elements.map((el) =>
			selectedElements.includes(el) ? newElementWith(el, { isDeleted: true }) : el
		);

		return {
			elements: nextElements,
			appState: {
				selectedElementIds: {},
				selectedGroupIds: {}
			},
			captureUpdate: CaptureUpdateAction.CAPTURE
		};
	},

	keyTest: (event) => event.key === KEYS.BACKSPACE || event.key === KEYS.DELETE,

	trackEvent: { category: 'element', action: 'delete' }
});
```

---

## Persistance des Donnees

### Format de Fichier .excalidraw

```typescript
// data/types.ts
interface ExportedDataState {
	type: 'excalidraw';
	version: 2;
	source: string; // URL d'origine
	elements: readonly ExcalidrawElement[];
	appState: Partial<AppState>;
	files?: BinaryFiles; // Images en base64
}
```

Exemple JSON:

```json
{
	"type": "excalidraw",
	"version": 2,
	"source": "https://excalidraw.com",
	"elements": [
		{
			"id": "abc123",
			"type": "rectangle",
			"x": 100,
			"y": 100,
			"width": 200,
			"height": 100,
			"strokeColor": "#000000",
			"backgroundColor": "#ffffff",
			"fillStyle": "solid",
			"strokeWidth": 2,
			"roughness": 1,
			"opacity": 100,
			"seed": 12345,
			"version": 1,
			"versionNonce": 67890
		}
	],
	"appState": {
		"viewBackgroundColor": "#ffffff",
		"gridSize": null
	}
}
```

### Serialisation

```typescript
// data/json.ts
export const serializeAsJSON = (
	elements: readonly ExcalidrawElement[],
	appState: Partial<AppState>,
	files: BinaryFiles,
	type: 'local' | 'database'
): string => {
	const data: ExportedDataState = {
		type: EXPORT_DATA_TYPES.excalidraw,
		version: VERSIONS.excalidraw,
		source: getExportSource(),
		elements,
		appState:
			type === 'local' ? cleanAppStateForExport(appState) : clearAppStateForDatabase(appState),
		files: type === 'local' ? filterOutDeletedFiles(elements, files) : undefined
	};
	return JSON.stringify(data, null, 2);
};
```

### Restauration

```typescript
// data/restore.ts
export const restoreElements = (
	elements: ImportedDataState['elements'],
	localElements: readonly ExcalidrawElement[] | null,
	opts?: { refreshDimensions?: boolean; repairBindings?: boolean }
): readonly ExcalidrawElement[] => {
	// 1. Valide et normalise chaque element
	// 2. Repare les bindings casses
	// 3. Synchronise les indices fractionnaires
	// 4. Rafraichit les dimensions texte
};
```

### Export Image

```typescript
// @excalidraw/utils/export.ts
export const exportToCanvas = async ({
	elements,
	appState,
	files,
	exportPadding,
	maxWidthOrHeight
}) => {
	// Retourne un HTMLCanvasElement
};

export const exportToBlob = async (opts) => {
	// Retourne un Blob (PNG ou SVG)
};

export const exportToSvg = async (opts) => {
	// Retourne un SVGSVGElement
};
```

---

## Collaboration en Temps Reel

### Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client A  │◄──────────────────►│   Server    │
└─────────────┘                    │  (Socket.io)│
                                   └──────┬──────┘
┌─────────────┐                           │
│   Client B  │◄──────────────────────────┘
└─────────────┘
```

### Portal (Client-side WebSocket)

```typescript
// excalidraw-app/collab/Portal.tsx
class Portal {
	socket: Socket | null = null;
	roomId: string | null = null;
	roomKey: string | null = null; // Cle E2E encryption
	broadcastedElementVersions: Map<string, number>;

	// Ouvrir connexion
	open(socket: Socket, id: string, key: string): Socket;

	// Fermer connexion
	close(): void;

	// Broadcast encrypted data
	async _broadcastSocketData(data: SocketUpdateData, volatile: boolean): void;

	// Broadcast scene changes
	broadcastScene(updateType: 'INIT' | 'UPDATE', elements, syncAll: boolean): Promise<void>;

	// Broadcast curseur
	broadcastMouseLocation(payload: { pointer; button }): void;

	// Broadcast idle status
	broadcastIdleChange(userState: UserIdleState): void;
}
```

### Types de Messages WebSocket

```typescript
type SocketUpdateDataSource = {
	INIT: {
		type: 'SCENE_INIT';
		payload: { elements: SyncableExcalidrawElement[] };
	};
	UPDATE: {
		type: 'SCENE_UPDATE';
		payload: { elements: SyncableExcalidrawElement[] };
	};
	MOUSE_LOCATION: {
		type: 'MOUSE_LOCATION';
		payload: {
			socketId: SocketId;
			pointer: { x: number; y: number };
			button: 'up' | 'down';
			selectedElementIds: Record<string, true>;
			username: string;
		};
	};
	IDLE_STATUS: {
		type: 'IDLE_STATUS';
		payload: {
			socketId: SocketId;
			userState: UserIdleState;
			username: string;
		};
	};
};
```

### Encryption E2E

```typescript
// data/encryption.ts
const ENCRYPTION_KEY_BITS = 128;

export const encryptData = async (
	key: string,
	data: Uint8Array
): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array }> => {
	const importedKey = await getImportedKey(key, 'encrypt');
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, importedKey, data);
	return { encryptedBuffer, iv };
};

export const decryptData = async (
	key: string,
	iv: Uint8Array,
	encrypted: ArrayBuffer
): Promise<ArrayBuffer> => {
	const importedKey = await getImportedKey(key, 'decrypt');
	return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, importedKey, encrypted);
};
```

### Reconciliation

```typescript
// data/reconcile.ts
export const reconcileElements = (
	localElements: readonly ExcalidrawElement[],
	remoteElements: readonly ExcalidrawElement[],
	localAppState: AppState
): readonly ExcalidrawElement[] => {
	// Pour chaque element:
	// 1. Si present seulement en remote -> ajouter
	// 2. Si present seulement en local -> garder
	// 3. Si present des deux cotes:
	//    - Prendre la version la plus recente
	//    - En cas d'egalite, utiliser versionNonce pour departager
};
```

---

## API Publique

### Composant Excalidraw

```tsx
import { Excalidraw } from '@excalidraw/excalidraw';

function MyApp() {
	const [excalidrawAPI, setExcalidrawAPI] = useState(null);

	return (
		<Excalidraw
			excalidrawAPI={(api) => setExcalidrawAPI(api)}
			initialData={{
				elements: [],
				appState: { viewBackgroundColor: '#ffffff' }
			}}
			onChange={(elements, appState, files) => {
				console.log('Scene changed');
			}}
			onPointerUpdate={(payload) => {
				console.log('Pointer:', payload.pointer);
			}}
			theme="light"
			langCode="fr-FR"
			viewModeEnabled={false}
			zenModeEnabled={false}
			gridModeEnabled={false}
			UIOptions={{
				canvasActions: {
					saveToActiveFile: false,
					loadScene: false
				}
			}}
			renderTopRightUI={() => <MyCustomButton />}
		>
			<MainMenu />
			<WelcomeScreen />
		</Excalidraw>
	);
}
```

### ExcalidrawImperativeAPI

```typescript
interface ExcalidrawImperativeAPI {
	// Scene
	updateScene(sceneData: SceneData): void;
	resetScene(): void;
	getSceneElements(): readonly ExcalidrawElement[];
	getSceneElementsIncludingDeleted(): readonly ExcalidrawElement[];

	// AppState
	getAppState(): AppState;

	// Files
	getFiles(): BinaryFiles;
	addFiles(files: BinaryFileData[]): void;

	// History
	history: {
		clear(): void;
	};

	// UI
	scrollToContent(target?: ExcalidrawElement | ExcalidrawElement[]): void;
	setActiveTool(tool: { type: ToolType }): void;
	setToast(toast: { message: string }): void;
	toggleSidebar(opts: { name: string; tab?: string }): void;

	// Curseur
	setCursor(cursor: string): void;
	resetCursor(): void;

	// Events
	onChange(callback: (elements, appState, files) => void): () => void;
	onPointerDown(callback: (activeTool, state, event) => void): () => void;
	onPointerUp(callback: (activeTool, state, event) => void): () => void;

	// Actions
	registerAction(action: Action): void;

	// Export
	refresh(): void;
}
```

### Export Functions

```typescript
import {
	exportToCanvas,
	exportToBlob,
	exportToSvg,
	exportToClipboard
} from '@excalidraw/excalidraw';

// Export en canvas
const canvas = await exportToCanvas({
	elements: api.getSceneElements(),
	appState: api.getAppState(),
	files: api.getFiles()
});

// Export en PNG blob
const blob = await exportToBlob({
	elements,
	appState,
	files,
	mimeType: 'image/png'
});

// Export en SVG
const svg = await exportToSvg({
	elements,
	appState,
	files
});
```

---

## Integration dans UbuMaths

### Emplacement

Le code source Excalidraw est dans `extern/excalidraw/` comme sous-module ou copie.

### Points d'Integration Potentiels

1. **Whiteboard Interactif**

   - Canvas de dessin pour cours de geometrie
   - Annotations sur exercices

2. **Diagrammes Mathematiques**

   - Graphes de fonctions annotes
   - Schemas geometriques
   - Arbres de probabilite

3. **Collaboration Eleve-Prof**
   - Partage de dessins en temps reel
   - Annotations sur le travail eleve

### Exemple d'Integration

```tsx
// src/lib/components/whiteboard/MathWhiteboard.svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw';

  let container: HTMLDivElement;
  let api: ExcalidrawImperativeAPI | null = null;

  onMount(async () => {
    const { Excalidraw } = await import('@excalidraw/excalidraw');
    // Render React component dans le container
  });

  export function getElements() {
    return api?.getSceneElements() ?? [];
  }

  export function setElements(elements: ExcalidrawElement[]) {
    api?.updateScene({ elements });
  }
</script>

<div bind:this={container} class="h-full w-full" />
```

### Configuration Recommandee

```typescript
const excalidrawConfig = {
	theme: 'light',
	langCode: 'fr-FR',
	gridModeEnabled: true,
	UIOptions: {
		canvasActions: {
			saveToActiveFile: false, // Gere par UbuMaths
			loadScene: false, // Gere par UbuMaths
			export: {
				saveFileToDisk: true
			}
		},
		tools: {
			image: true // Permettre images
		}
	}
};
```

---

## Ressources

### Documentation Officielle

- [docs.excalidraw.com](https://docs.excalidraw.com)
- [GitHub Excalidraw](https://github.com/excalidraw/excalidraw)

### Fichiers Cles a Connaitre

| Fichier                                       | Importance                       |
| --------------------------------------------- | -------------------------------- |
| `packages/excalidraw/index.tsx`               | Point d'entree, exports publics  |
| `packages/excalidraw/components/App.tsx`      | Composant principal (tres gros!) |
| `packages/element/src/types.ts`               | Types d'elements                 |
| `packages/common/src/constants.ts`            | Constantes globales              |
| `packages/excalidraw/data/json.ts`            | Serialisation                    |
| `packages/excalidraw/renderer/staticScene.ts` | Rendu canvas                     |

### Commandes de Developpement

```bash
cd extern/excalidraw

# Installation
yarn install

# Developpement
yarn start           # Lance excalidraw-app sur localhost:3000

# Tests
yarn test:app        # Tests unitaires
yarn test:typecheck  # Verification TypeScript

# Build
yarn build:packages  # Build tous les packages
```

---

_Documentation generee le 2026-01-17_
