# Plan : Consolidation de l'interface Whiteboard

> **Status: IMPLEMENTED (2026-01-23)**
>
> Toutes les phases ont été implémentées avec succès.

## Objectif

Simplifier l'interface du whiteboard en réduisant le nombre de zones de contrôles éparpillées et en rendant les panneaux déplaçables.

## État actuel (problèmes)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Top bar (titre, page, zoom, navigation, fullscreen)                 │
├─────────────────────────────────────────────────────────────────────┤
│ [↩][↪]  ← Undo/Redo flottants                                       │
│ ┌────────────┐                                         [Thumbnails] │
│ │StylePanel  │         CANVAS                          toggle →    │
│ │(flottant)  │                                                      │
│ └────────────┘                                                      │
│[FileDrawer]                                                         │
│  toggle ↑                                                           │
│              ┌───────────────────────────────────┐                  │
│              │       FloatingToolbar              │                  │
│              └───────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

**5 zones de contrôles distinctes** → confusion, superposition avec le canvas

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📁] Document.ubw  •  Page 2/5   [−][100%][+] [<][>] [📑] [⛶]      │
└─────────────────────────────────────────────────────────────────────┘
│                                                                     │
│                          CANVAS                                     │
│                     (espace maximisé)                               │
│                                                                     │
│    ┌─────────────────┐                                              │
│    │ StylePanel      │  ← draggable, s'ouvre depuis toolbar         │
│    │ (si ouvert)     │                                              │
│    └─────────────────┘                                              │
│                                                                     │
│         ┌────────────────────────────────────────────────┐          │
│         │ ⋮⋮ [↩][↪] │ outils │ formes │ [🎨]            │          │
│         └────────────────────────────────────────────────┘          │
│                    ↑ Toolbar unifiée draggable                      │
└─────────────────────────────────────────────────────────────────────┘
```

**2 zones principales** : Top bar minimaliste + Toolbar unifiée draggable

---

## Phase 1 : Top bar consolidée

### 1.1 Modifier la top bar

**Fichier** : `src/lib/whiteboard/components/Whiteboard.svelte`

Nouvelle structure :

```svelte
<header class="whiteboard-header">
	<!-- Gauche : FileDrawer + Document info -->
	<div class="flex items-center gap-2">
		<Button onclick={toggleFileDrawer} title="Fichiers (Ctrl+O)">
			<FolderOpen class="h-4 w-4" />
		</Button>
		<span class="flex items-center gap-1">
			{#if hasUnsavedChanges}
				<span class="h-2 w-2 rounded-full bg-orange-500"></span>
			{/if}
			<span class="max-w-48 truncate font-medium">{document?.title}</span>
		</span>
		<span class="text-muted-foreground">Page {currentPage}/{pageCount}</span>
	</div>

	<!-- Droite : Zoom + Navigation + Thumbnails + Fullscreen -->
	<div class="flex items-center gap-1">
		<Button onclick={zoomOut}><ZoomOut /></Button>
		<button onclick={zoomToFit}>{zoomPercent}%</button>
		<Button onclick={zoomIn}><ZoomIn /></Button>

		<Separator />

		<Button onclick={prevPage} disabled={!canGoPrev}><ChevronLeft /></Button>
		<Button onclick={nextPage} disabled={!canGoNext}><ChevronRight /></Button>

		<Separator />

		<Button onclick={toggleThumbnails} title="Miniatures">
			<PanelRight class="h-4 w-4" />
		</Button>
		<Button onclick={toggleFullscreen}>
			{#if isFullscreen}<Minimize2 />{:else}<Maximize2 />{/if}
		</Button>
	</div>
</header>
```

### 1.2 Supprimer les éléments déplacés

- Supprimer les boutons Undo/Redo flottants (seront dans toolbar)
- Supprimer le bouton FileDrawer flottant du `FileDrawer.svelte`
- Rendre le toggle Thumbnails contrôlé par la top bar

### 1.3 Modifier FileDrawer.svelte

- Supprimer le bouton toggle interne
- Exposer l'état `open` via le store ou props

### 1.4 Modifier PageThumbnails.svelte

- Rendre le panneau contrôlable depuis l'extérieur
- Ajouter état `visible` dans whiteboardStore ou props

---

## Phase 2 : Toolbar unifiée avec Undo/Redo

### 2.1 Modifier FloatingToolbar.svelte

Ajouter au début de la toolbar :

```svelte
<div class="floating-toolbar">
	<!-- Drag handle -->
	<div class="drag-handle cursor-grab" onpointerdown={startDrag}>
		<GripVertical class="h-4 w-4 text-muted-foreground" />
	</div>

	<!-- Undo/Redo -->
	<div class="flex items-center gap-0.5">
		<ToolButton
			icon={Undo2}
			label="Annuler"
			shortcut="Ctrl+Z"
			onclick={handleUndo}
			disabled={!canUndo}
		/>
		<ToolButton
			icon={Redo2}
			label="Rétablir"
			shortcut="Ctrl+Y"
			onclick={handleRedo}
			disabled={!canRedo}
		/>
	</div>

	<Separator />

	<!-- Outils existants... -->

	<Separator />

	<!-- Bouton Style (ouvre StylePanel) -->
	<ToolButton icon={Palette} label="Styles" active={stylePanelOpen} onclick={toggleStylePanel} />
</div>
```

### 2.2 Ajouter le drag pour la toolbar

```typescript
// State
let toolbarPosition = $state({ x: 0, y: 0 });
let isDragging = $state(false);
let dragStart = $state({ x: 0, y: 0 });

// Position par défaut : centrée en bas
let defaultPosition = $derived({
	x: (containerWidth - toolbarWidth) / 2,
	y: containerHeight - toolbarHeight - 16
});

// Handlers
function startDrag(e: PointerEvent) {
	isDragging = true;
	dragStart = { x: e.clientX - toolbarPosition.x, y: e.clientY - toolbarPosition.y };
	(e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onDrag(e: PointerEvent) {
	if (!isDragging) return;
	toolbarPosition = {
		x: e.clientX - dragStart.x,
		y: e.clientY - dragStart.y
	};
}

function endDrag() {
	isDragging = false;
	// Sauvegarder position dans localStorage
	saveToolbarPosition(toolbarPosition);
}

// Double-click pour reset position
function resetPosition() {
	toolbarPosition = { x: 0, y: 0 }; // 0,0 = position par défaut (centrée)
	localStorage.removeItem('whiteboard-toolbar-position');
}
```

### 2.3 CSS pour la toolbar draggable

```css
.floating-toolbar {
	position: absolute;
	/* Position dynamique */
	left: calc(50% + var(--offset-x, 0px));
	bottom: calc(16px - var(--offset-y, 0px));
	transform: translateX(-50%);

	/* Si position custom */
	&.custom-position {
		left: var(--pos-x);
		top: var(--pos-y);
		bottom: auto;
		transform: none;
	}
}

.drag-handle {
	cursor: grab;
	padding: 4px;
	border-radius: 4px;

	&:hover {
		background: hsl(var(--accent));
	}

	&:active {
		cursor: grabbing;
	}
}
```

---

## Phase 3 : StylePanel draggable

### 3.1 Créer DraggablePanel.svelte

Composant réutilisable pour les panneaux draggables :

```svelte
<!-- src/lib/whiteboard/components/DraggablePanel.svelte -->
<script lang="ts">
	interface Props {
		title: string;
		storageKey: string;
		defaultPosition?: { x: number; y: number };
		onClose?: () => void;
		children: Snippet;
	}

	let { title, storageKey, defaultPosition, onClose, children } = $props();

	let position = $state(loadPosition(storageKey) ?? defaultPosition ?? { x: 100, y: 100 });
	let isDragging = $state(false);

	// ... drag logic similar to toolbar
</script>

<div class="draggable-panel" style="left: {position.x}px; top: {position.y}px;">
	<header
		class="panel-header"
		onpointerdown={startDrag}
		onpointermove={onDrag}
		onpointerup={endDrag}
	>
		<GripVertical class="h-3 w-3" />
		<span class="text-sm font-medium">{title}</span>
		<button onclick={onClose} class="ml-auto">
			<X class="h-3 w-3" />
		</button>
	</header>

	<div class="panel-content">
		{@render children()}
	</div>
</div>

<style>
	.draggable-panel {
		position: absolute;
		z-index: 45;
		background: hsl(var(--background) / 0.95);
		backdrop-filter: blur(8px);
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 200px;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-bottom: 1px solid hsl(var(--border));
		cursor: grab;
		user-select: none;

		&:active {
			cursor: grabbing;
		}
	}

	.panel-content {
		padding: 12px;
		max-height: 60vh;
		overflow-y: auto;
	}
</style>
```

### 3.2 Refactoriser StylePanel.svelte

```svelte
<script lang="ts">
	import DraggablePanel from './DraggablePanel.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose } = $props();
</script>

{#if open}
	<DraggablePanel
		title="Styles"
		storageKey="whiteboard-style-panel"
		defaultPosition={{ x: 16, y: 100 }}
		{onClose}
	>
		<!-- Contenu existant du StylePanel (sections couleur, épaisseur, etc.) -->
		<StyleSection title="Couleur" collapsible={false}>
			<ColorPicker value={currentColor} onchange={handleColorChange} />
		</StyleSection>

		<!-- ... autres sections ... -->
	</DraggablePanel>
{/if}
```

### 3.3 Connecter StylePanel à la Toolbar

Dans `FloatingToolbar.svelte` ou `Whiteboard.svelte` :

```svelte
<script>
	let stylePanelOpen = $state(false);

	function toggleStylePanel() {
		stylePanelOpen = !stylePanelOpen;
	}
</script>

<!-- Dans la toolbar -->
<ToolButton icon={Palette} label="Styles" active={stylePanelOpen} onclick={toggleStylePanel} />

<!-- StylePanel conditionnel -->
<StylePanel open={stylePanelOpen} onClose={() => (stylePanelOpen = false)} />
```

---

## Phase 4 : Nettoyage et polish

### 4.1 Fichiers à supprimer/modifier

| Fichier                                  | Action                            |
| ---------------------------------------- | --------------------------------- |
| Boutons Undo/Redo dans Whiteboard.svelte | Supprimer (déplacés dans toolbar) |
| Bouton toggle dans FileDrawer.svelte     | Supprimer                         |
| Bouton toggle dans PageThumbnails.svelte | Modifier (contrôlé par parent)    |
| StylePanel.svelte                        | Refactoriser avec DraggablePanel  |

### 4.2 Persistence des positions

Sauvegarder dans localStorage :

- `whiteboard-toolbar-position` : `{ x: number, y: number } | null`
- `whiteboard-style-panel-position` : `{ x: number, y: number } | null`

### 4.3 Raccourcis clavier à ajouter/vérifier

| Raccourci             | Action                        |
| --------------------- | ----------------------------- |
| Ctrl+O                | Ouvrir FileDrawer             |
| Ctrl+Z                | Undo                          |
| Ctrl+Y / Ctrl+Shift+Z | Redo                          |
| Ctrl+P                | Toggle StylePanel             |
| Tab                   | Toggle Thumbnails (optionnel) |

### 4.4 Responsive

- Sur mobile (<768px) : Toolbar en bas fixe (non draggable)
- Sur tablette : Positions persistées, touch-friendly (44px min)

---

## Ordre d'implémentation

1. **Phase 1** : Top bar consolidée (~1h)

   - Modifier top bar
   - Déplacer FileDrawer toggle
   - Ajouter Thumbnails toggle

2. **Phase 2** : Toolbar unifiée (~2h)

   - Ajouter Undo/Redo à la toolbar
   - Ajouter bouton Style
   - Implémenter drag de la toolbar

3. **Phase 3** : StylePanel draggable (~2h)

   - Créer DraggablePanel
   - Refactoriser StylePanel
   - Connecter à la toolbar

4. **Phase 4** : Nettoyage (~1h)
   - Supprimer éléments obsolètes
   - Tester tous les raccourcis
   - Vérifier responsive

---

## Fichiers concernés

### À créer

- `src/lib/whiteboard/components/DraggablePanel.svelte`

### À modifier

- `src/lib/whiteboard/components/Whiteboard.svelte` (top bar, suppression undo/redo flottants)
- `src/lib/whiteboard/components/FloatingToolbar.svelte` (ajout undo/redo, drag, bouton style)
- `src/lib/whiteboard/components/StylePanel.svelte` (refactoriser avec DraggablePanel)
- `src/lib/whiteboard/components/FileDrawer.svelte` (supprimer bouton toggle)
- `src/lib/whiteboard/components/PageThumbnails.svelte` (contrôle externe)

### À supprimer

- Rien à supprimer complètement, mais nettoyage de code mort

---

## Prompt pour nouveau contexte

```
Implémente le plan de consolidation de l'interface whiteboard décrit dans
docs/wip/whiteboard-ui-consolidation.md

Objectif : Simplifier l'interface en consolidant les contrôles :
1. Top bar minimaliste avec FileDrawer et Thumbnails toggles
2. Toolbar unifiée draggable avec Undo/Redo intégrés
3. StylePanel draggable qui s'ouvre depuis la toolbar

Suis l'ordre d'implémentation du plan :
1. Phase 1 : Top bar consolidée
2. Phase 2 : Toolbar unifiée avec drag
3. Phase 3 : StylePanel draggable
4. Phase 4 : Nettoyage

Fichiers de référence :
- src/lib/whiteboard/components/Whiteboard.svelte
- src/lib/whiteboard/components/FloatingToolbar.svelte
- src/lib/whiteboard/components/StylePanel.svelte
```
