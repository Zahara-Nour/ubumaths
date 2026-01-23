# Plan de refonte : Whiteboard Toolbar Flottante

## Objectif

Remplacer la toolbar horizontale actuelle par une interface moderne avec :

- Toolbar flottante centrée en bas
- Panel latéral pour les options de style
- UX optimisée pour tablette/tactile

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CANVAS                                 │
│                                                                     │
│  ┌────────────┐                                                     │
│  │ StylePanel │  ← Replié par défaut, s'ouvre sur sélection        │
│  │            │                                                     │
│  │ [Couleurs] │                                                     │
│  │ [Trait]    │                                                     │
│  │ [Opacité]  │                                                     │
│  │ [Fill]     │                                                     │
│  │ [Options]  │  ← Contextuelles selon type d'élément              │
│  └────────────┘                                                     │
│                                                                     │
│                                                                     │
│                 ┌───────────────────────────────┐                   │
│                 │  [Floating Toolbar]           │  ← Centrée        │
│                 └───────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Composants à créer/modifier

### 1. Nouveaux composants

| Composant                | Responsabilité                           |
| ------------------------ | ---------------------------------------- |
| `FloatingToolbar.svelte` | Toolbar flottante avec outils de dessin  |
| `StylePanel.svelte`      | Panel latéral avec options de style      |
| `ToolButton.svelte`      | Bouton d'outil réutilisable (avec états) |
| `ColorPicker.svelte`     | Sélecteur de couleur compact             |
| `StyleSection.svelte`    | Section repliable du StylePanel          |

### 2. Composants à modifier

| Composant                  | Modification                                 |
| -------------------------- | -------------------------------------------- |
| `Whiteboard.svelte`        | Layout grid, intégration nouveaux composants |
| `WhiteboardToolbar.svelte` | À supprimer ou renommer                      |

### 3. Composants inchangés

- `WhiteboardCanvas.svelte`
- `SelectionLayer.svelte`
- `InstrumentLayer.svelte`
- Tous les composants de rendu (shapes, strokes, etc.)

---

## Phase 1 : FloatingToolbar

### 1.1 Structure

```svelte
<!-- FloatingToolbar.svelte -->
<div class="floating-toolbar">
	<!-- Groupe 1: Actions -->
	<div class="tool-group">
		<ToolButton tool="select" icon={MousePointer2} shortcut="V" />
		<ToolButton tool="pan" icon={Hand} shortcut="Space" />
		<ToolButton tool="laser" icon={Crosshair} shortcut="Z" hasSubmenu />
	</div>

	<div class="separator" />

	<!-- Groupe 2: Dessin -->
	<div class="tool-group">
		<ToolButton tool="pen" icon={Pen} shortcut="P" />
		<ToolButton tool="marker" icon={Pencil} shortcut="M" />
		<ToolButton tool="highlighter" icon={Highlighter} shortcut="H" />
	</div>

	<div class="separator" />

	<!-- Groupe 3: Édition -->
	<div class="tool-group">
		<ToolButton tool="eraser" icon={Eraser} shortcut="E" />
		<ToolButton tool="text" icon={Type} shortcut="T" />
	</div>

	<div class="separator" />

	<!-- Groupe 4: Formes (avec popover) -->
	<div class="tool-group">
		<ShapesPopover />
		<InstrumentsPopover />
		<PageSettingsPopover />
	</div>
</div>
```

### 1.2 Styles CSS

```css
.floating-toolbar {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);

	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 8px;

	background: hsl(var(--background) / 0.95);
	backdrop-filter: blur(8px);
	border: 1px solid hsl(var(--border));
	border-radius: 12px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

	z-index: 50;
}

.tool-group {
	display: flex;
	gap: 2px;
}

.separator {
	width: 1px;
	height: 24px;
	background: hsl(var(--border));
	margin: 0 4px;
}
```

### 1.3 Props et état

```typescript
interface FloatingToolbarProps {
	class?: string;
}

// État géré via whiteboardStore (inchangé)
// - toolState.toolType
// - toolState.color
// - etc.
```

---

## Phase 2 : StylePanel

### 2.1 Structure

```svelte
<!-- StylePanel.svelte -->
<aside class="style-panel" class:collapsed={!isOpen}>
	<button class="toggle-btn" onclick={toggle}>
		{isOpen ? '◀' : '▶'}
	</button>

	{#if isOpen}
		<!-- Section Couleurs -->
		<StyleSection title="Couleur" defaultOpen>
			<ColorPicker bind:value={color} presets={COLOR_PRESETS} />
		</StyleSection>

		<!-- Section Trait -->
		<StyleSection title="Trait" defaultOpen>
			<StrokeWidthSlider bind:value={strokeWidth} />
			{#if showStrokeStyle}
				<StrokeStylePicker bind:value={strokeStyle} />
			{/if}
		</StyleSection>

		<!-- Section Opacité -->
		<StyleSection title="Opacité">
			<OpacitySlider bind:value={opacity} />
		</StyleSection>

		<!-- Sections conditionnelles -->
		{#if showFillOptions}
			<StyleSection title="Remplissage">
				<FillModePicker bind:value={fillMode} />
				{#if fillMode !== 'none'}
					<ColorPicker bind:value={fillColor} presets={COLOR_PRESETS} />
					<OpacitySlider bind:value={fillOpacity} />
				{/if}
			</StyleSection>
		{/if}

		{#if showCornerRadius}
			<StyleSection title="Coins">
				<CornerRadiusPicker bind:value={cornerRadius} />
			</StyleSection>
		{/if}

		{#if showArrowOptions}
			<StyleSection title="Flèche">
				<ArrowTypePicker bind:value={arrowType} />
				<ArrowheadPicker bind:startValue={startArrowhead} bind:endValue={endArrowhead} />
			</StyleSection>
		{/if}
	{/if}
</aside>
```

### 2.2 Styles CSS

```css
.style-panel {
	position: absolute;
	top: 16px;
	left: 16px;

	width: 220px;
	max-height: calc(100% - 100px); /* Espace pour toolbar */
	overflow-y: auto;

	background: hsl(var(--background) / 0.95);
	backdrop-filter: blur(8px);
	border: 1px solid hsl(var(--border));
	border-radius: 12px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

	z-index: 40;

	transition:
		width 0.2s ease,
		opacity 0.2s ease;
}

.style-panel.collapsed {
	width: 40px;
	overflow: hidden;
}

.toggle-btn {
	position: absolute;
	top: 8px;
	right: -12px;
	/* ... */
}
```

### 2.3 Comportement

| Événement            | Action                                |
| -------------------- | ------------------------------------- |
| Sélection d'élément  | Panel s'ouvre automatiquement         |
| Clic hors sélection  | Panel se ferme (optionnel)            |
| Clic sur toggle      | Bascule ouvert/fermé                  |
| Changement de valeur | Appliqué immédiatement à la sélection |

### 2.4 Visibilité des sections

```typescript
// Logique de visibilité (à déplacer depuis WhiteboardToolbar)
const showStrokeStyle = $derived(isShapeTool || (hasSelection && selectedHasShapes));

const showFillOptions = $derived(
	['rectangle', 'circle', 'triangle', 'pentagon', 'hexagon', 'star'].includes(toolType) ||
		(hasSelection && selectedHasFillableShapes)
);

const showCornerRadius = $derived(
	toolType === 'rectangle' || (hasSelection && selectedHasRectangles)
);

const showArrowOptions = $derived(toolType === 'arrow' || (hasSelection && selectedHasArrows));
```

---

## Phase 3 : Intégration dans Whiteboard.svelte

### 3.1 Nouveau layout

```svelte
<!-- Whiteboard.svelte -->
<div class="whiteboard-container">
	<!-- Top bar (simplifié - uniquement infos) -->
	<header class="whiteboard-header">
		<span class="doc-title">{document?.title}</span>
		<span class="page-info">Page {currentPage}/{pageCount}</span>
		{#if isPageExpanded}
			<button onclick={resetPage}>Étendue</button>
		{/if}
		<span class="zoom">{zoomPercent}%</span>
		<!-- Navigation pages, fullscreen -->
	</header>

	<!-- Canvas area (position: relative pour les éléments absolus) -->
	<main class="whiteboard-canvas-area">
		<WhiteboardCanvas ... />

		<!-- Nouveaux composants flottants -->
		<StylePanel />
		<FloatingToolbar />

		<!-- Existants -->
		<ContextMenu bind:this={contextMenuRef} />
	</main>
</div>
```

### 3.2 Styles layout

```css
.whiteboard-container {
	display: grid;
	grid-template-rows: auto 1fr;
	height: 100%;
}

.whiteboard-header {
	/* Barre simplifiée */
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 8px 16px;
	border-bottom: 1px solid hsl(var(--border));
	font-size: 12px;
}

.whiteboard-canvas-area {
	position: relative;
	overflow: hidden;
}
```

---

## Phase 4 : Responsive et tactile

### 4.1 Breakpoints

| Taille              | Comportement                              |
| ------------------- | ----------------------------------------- |
| Desktop (≥1024px)   | Panel ouvert par défaut, toolbar complète |
| Tablet (768-1023px) | Panel fermé par défaut, toolbar complète  |
| Mobile (<768px)     | Panel en bottom sheet, toolbar compacte   |

### 4.2 Adaptations tablette

```css
@media (max-width: 1023px) {
	.style-panel {
		/* Panel fermé par défaut */
		width: 40px;
	}

	.floating-toolbar {
		/* Boutons légèrement plus grands pour le tactile */
		padding: 8px 12px;
	}

	.floating-toolbar :global(button) {
		min-width: 44px;
		min-height: 44px;
	}
}
```

### 4.3 Gestes tactiles (futur)

- Swipe depuis la gauche → Ouvre le StylePanel
- Swipe vers la gauche sur le panel → Ferme le panel
- Long press sur outil → Affiche options (équivalent hover)

---

## Phase 5 : Migration des fonctionnalités

### 5.1 Checklist de migration depuis WhiteboardToolbar

- [ ] Sélection d'outil (select, pan, laser, pen, marker, highlighter, eraser, text)
- [ ] Sélection de forme (line, rectangle, circle, arrow, pentagon, hexagon, star)
- [ ] Mode laser (pointer, trail)
- [ ] Instruments (ruler, protractor, setSquare)
- [ ] Paramètres page (format, background, grid)
- [ ] Couleur (presets + picker)
- [ ] Épaisseur trait
- [ ] Style trait (solid, dashed, dotted)
- [ ] Opacité
- [ ] Remplissage (mode, couleur, opacité)
- [ ] Coins arrondis
- [ ] Type flèche (straight, curved, elbow)
- [ ] Direction coude (auto, horizontal, vertical)
- [ ] Pointes de flèche (start, end)
- [ ] Préréglages sloppiness (Architect, Artist, Cartoonist)

### 5.2 Fonctionnalités à conserver dans le header

- Titre du document
- Indicateur de modifications non sauvegardées
- Page actuelle / total
- Bouton "Étendue" (reset page)
- Zoom (affichage + boutons +/-)
- Navigation pages (< >)
- Fullscreen

### 5.3 À supprimer

- Affichage dimensions page (redondant avec popover)
- Nom de l'outil actif (visible par l'icône sélectionnée)
- Compteur de sélection (pas essentiel)

---

## Ordre d'implémentation recommandé

### Étape 1 : Composants de base (~2h)

1. Créer `ToolButton.svelte`
2. Créer `ColorPicker.svelte` (extraire de WhiteboardToolbar)
3. Créer `StyleSection.svelte`

### Étape 2 : FloatingToolbar (~3h)

1. Créer `FloatingToolbar.svelte` avec structure de base
2. Migrer les outils depuis WhiteboardToolbar
3. Migrer les popovers (shapes, instruments, page)
4. Tester la sélection d'outils

### Étape 3 : StylePanel (~4h)

1. Créer `StylePanel.svelte` avec toggle
2. Migrer les contrôles de couleur
3. Migrer les contrôles de trait
4. Migrer les contrôles d'opacité
5. Migrer les contrôles conditionnels (fill, corners, arrows)
6. Tester l'application des styles

### Étape 4 : Intégration (~2h)

1. Modifier le layout de `Whiteboard.svelte`
2. Simplifier le header
3. Supprimer l'ancienne toolbar
4. Tests d'intégration

### Étape 5 : Polish (~2h)

1. Animations et transitions
2. Responsive/tablette
3. Tests sur différentes tailles d'écran
4. Accessibilité (focus, aria-labels)

---

## Fichiers concernés

### À créer

```
src/lib/whiteboard/components/
├── FloatingToolbar.svelte      # Nouvelle toolbar
├── StylePanel.svelte           # Panel latéral
├── toolbar/
│   ├── ToolButton.svelte       # Bouton d'outil
│   ├── ColorPicker.svelte      # Sélecteur couleur
│   ├── StyleSection.svelte     # Section repliable
│   ├── ShapesPopover.svelte    # Popover formes (extrait)
│   ├── InstrumentsPopover.svelte
│   └── PageSettingsPopover.svelte
```

### À modifier

```
src/lib/whiteboard/components/
├── Whiteboard.svelte           # Layout
└── WhiteboardToolbar.svelte    # À supprimer après migration
```

### Inchangés

```
src/lib/whiteboard/
├── stores/whiteboard.svelte.ts # Aucun changement nécessaire
├── core/*                      # Aucun changement
└── types/*                     # Aucun changement
```

---

## Risques et mitigations

| Risque                   | Probabilité | Impact | Mitigation                                   |
| ------------------------ | ----------- | ------ | -------------------------------------------- |
| Régression fonctionnelle | Moyenne     | Élevé  | Tests manuels approfondis après chaque étape |
| Performance (re-renders) | Faible      | Moyen  | Utiliser $derived correctement               |
| Z-index conflicts        | Moyenne     | Faible | Définir une échelle z-index claire           |
| Accessibilité oubliée    | Moyenne     | Moyen  | Checklist a11y à chaque composant            |

---

## Critères de succès

- [ ] Toolbar ne déborde plus quelle que soit la sélection
- [ ] Tous les outils fonctionnent comme avant
- [ ] Tous les styles s'appliquent comme avant
- [ ] Fonctionne sur tablette (touch)
- [ ] Panel peut s'ouvrir/fermer
- [ ] Transitions fluides
- [ ] Pas de régression visuelle
- [ ] Build sans erreur TypeScript
