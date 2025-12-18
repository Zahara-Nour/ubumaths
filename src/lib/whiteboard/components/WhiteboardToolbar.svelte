<script lang="ts">
	/**
	 * WhiteboardToolbar - Horizontal bottom toolbar with popup menus
	 *
	 * Sections in popups:
	 * - Drawing: pen, highlighter, eraser, text
	 * - Shapes: line, rectangle, circle, arrow
	 * - Instruments: ruler, protractor, set square
	 * - Import: image, PDF
	 * - File: new, save, open, export
	 * - Color picker + stroke width slider
	 */

	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import type { Tool } from '../stores/whiteboard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Slider } from '$lib/components/ui/slider';
	import {
		Pen,
		Pencil,
		Highlighter,
		Eraser,
		Type,
		Minus,
		Square,
		Circle,
		MoveRight,
		Undo2,
		Redo2,
		Trash2,
		Ruler,
		Compass,
		Triangle,
		Image,
		FileText,
		Upload,
		Save,
		FolderOpen,
		FilePlus,
		Cloud,
		CloudOff,
		Loader2,
		Download,
		MousePointer2,
		Hand,
		ZoomIn,
		ZoomOut,
		Pentagon,
		Hexagon,
		Star
	} from 'lucide-svelte';
	import ExportDialog from './ExportDialog.svelte';
	import { getSyncStatusColor, getSyncStatusLabel } from '../utils/sync-state';
	import {
		INSTRUMENT_LABELS,
		STROKE_STYLE_LABELS,
		FILL_MODE_LABELS,
		type InstrumentType,
		type StrokeStyle,
		type FillMode
	} from '../types/document';
	import { importImageFile } from '../utils/image-loader';
	import { importPdfFile } from '../utils/pdf-loader';
	import { toaster } from '$lib/stores/toaster.svelte';

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Color presets for tools */
	const COLOR_PRESETS = [
		{ name: 'Noir', value: '#000000' },
		{ name: 'Bleu', value: '#2563eb' },
		{ name: 'Rouge', value: '#dc2626' },
		{ name: 'Vert', value: '#16a34a' },
		{ name: 'Orange', value: '#ea580c' },
		{ name: 'Violet', value: '#9333ea' }
	] as const;

	/** Stroke width constraints */
	const STROKE_WIDTH_MIN = 1;
	const STROKE_WIDTH_MAX = 20;

	/** Tool definitions with icons and shortcuts */
	const DRAWING_TOOLS: { id: Tool; icon: typeof Pen; shortcut: string; label: string }[] = [
		{ id: 'pen', icon: Pen, shortcut: 'P', label: 'Stylo (pression)' },
		{ id: 'marker', icon: Pencil, shortcut: 'M', label: 'Feutre' },
		{ id: 'highlighter', icon: Highlighter, shortcut: 'H', label: 'Surligneur' },
		{ id: 'eraser', icon: Eraser, shortcut: 'E', label: 'Gomme' },
		{ id: 'text', icon: Type, shortcut: 'T', label: 'Texte' }
	];

	const SHAPE_TOOLS: { id: Tool; icon: typeof Minus; shortcut: string; label: string }[] = [
		{ id: 'line', icon: Minus, shortcut: 'L', label: 'Ligne' },
		{ id: 'rectangle', icon: Square, shortcut: 'R', label: 'Rectangle' },
		{ id: 'circle', icon: Circle, shortcut: 'C', label: 'Cercle' },
		{ id: 'arrow', icon: MoveRight, shortcut: 'A', label: 'Flèche' },
		{ id: 'pentagon', icon: Pentagon, shortcut: '', label: 'Pentagone' },
		{ id: 'hexagon', icon: Hexagon, shortcut: '', label: 'Hexagone' },
		{ id: 'star', icon: Star, shortcut: '', label: 'Étoile' }
	];

	/** Instrument definitions with icons */
	const INSTRUMENT_TOOLS: { id: InstrumentType; icon: typeof Ruler; label: string }[] = [
		{ id: 'ruler', icon: Ruler, label: INSTRUMENT_LABELS.ruler },
		{ id: 'protractor', icon: Compass, label: INSTRUMENT_LABELS.protractor },
		{ id: 'setSquare', icon: Triangle, label: INSTRUMENT_LABELS.setSquare }
	];

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props {
		/** Current zoom level (1 = 100%) */
		zoomLevel?: number;
		/** Current zoom percentage for display */
		zoomPercent?: number;
		/** Callback to zoom in */
		onZoomIn?: () => void;
		/** Callback to zoom out */
		onZoomOut?: () => void;
		/** Callback to reset zoom to fit */
		onZoomToFit?: () => void;
	}

	let {
		zoomLevel: _zoomLevel = 1,
		zoomPercent = 100,
		onZoomIn,
		onZoomOut,
		onZoomToFit
	}: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Popover open states */
	let drawingPopoverOpen = $state(false);
	let shapesPopoverOpen = $state(false);
	let instrumentsPopoverOpen = $state(false);
	let importPopoverOpen = $state(false);
	let filePopoverOpen = $state(false);

	/** File input references (plain variables, no reactivity needed for bind:this) */
	let imageInputRef: HTMLInputElement | null = null;
	let pdfInputRef: HTMLInputElement | null = null;
	let ubwInputRef: HTMLInputElement | null = null;

	/** Import loading state */
	let isImporting = $state(false);

	/** Export dialog state */
	let exportDialogOpen = $state(false);

	/** Draggable stroke panel state (independent floating panel, not using Popover) */
	let strokePanelOpen = $state(false);
	let strokePanelPosition = $state({ x: 100, y: 100 });
	let isDraggingStrokePanel = $state(false);
	let strokePanelRef: HTMLDivElement | null = $state(null);

	/** Draggable fill panel state */
	let fillPanelOpen = $state(false);
	let fillPanelPosition = $state({ x: 150, y: 100 });
	let isDraggingFillPanel = $state(false);
	let fillPanelRef: HTMLDivElement | null = $state(null);

	/** Shared drag state */
	let dragStartPos = $state({ x: 0, y: 0 });
	let dragStartOffset = $state({ x: 0, y: 0 });

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let toolState = $derived(whiteboardStore.toolState);
	let canUndo = $derived(whiteboardStore.canUndo);
	let canRedo = $derived(whiteboardStore.canRedo);
	let currentColor = $derived(toolState.color);
	let currentStrokeWidth = $derived(toolState.strokeWidth);
	let currentOpacity = $derived(toolState.opacity);
	let currentStrokeStyle = $derived(toolState.strokeStyle);
	let currentCornerRadius = $derived(toolState.cornerRadius);
	let currentFillMode = $derived(toolState.fillMode);
	let currentFillColor = $derived(toolState.fillColor);
	let currentFillOpacity = $derived(toolState.fillOpacity);
	let instruments = $derived(whiteboardStore.instruments);
	let syncState = $derived(whiteboardStore.syncState);
	let hasUnsavedChanges = $derived(whiteboardStore.hasUnsavedChanges);

	/** Current drawing tool icon for the button */
	let currentDrawingTool = $derived(
		DRAWING_TOOLS.find((t) => t.id === toolState.toolType) || DRAWING_TOOLS[0]
	);

	/** Current shape tool icon for the button */
	let currentShapeTool = $derived(
		SHAPE_TOOLS.find((t) => t.id === toolState.toolType) || SHAPE_TOOLS[0]
	);

	/** Check if current tool is a drawing tool */
	let isDrawingToolActive = $derived(DRAWING_TOOLS.some((t) => t.id === toolState.toolType));

	/** Check if current tool is a shape tool */
	let isShapeToolActive = $derived(SHAPE_TOOLS.some((t) => t.id === toolState.toolType));

	/** Shape tools that support corner radius */
	const SHAPES_WITH_CORNERS = ['rectangle', 'pentagon', 'hexagon', 'star'] as const;

	/** Check if current shape tool supports corner radius */
	let isCornerRadiusToolActive = $derived(
		SHAPES_WITH_CORNERS.some((s) => s === toolState.toolType)
	);

	/** Check if selected shape supports corner radius */
	let hasSelectedShapeWithCorners = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_CORNERS.includes(el.shapeType as (typeof SHAPES_WITH_CORNERS)[number])
		)
	);

	/** Show corner radius slider when applicable shape tool active OR shape with corners is selected */
	let showCornerRadiusSlider = $derived(isCornerRadiusToolActive || hasSelectedShapeWithCorners);

	/** Shape tools that support fill (exclude line and arrow) */
	const SHAPES_WITH_FILL = ['rectangle', 'circle', 'pentagon', 'hexagon', 'star'] as const;

	/** Check if current shape tool supports fill */
	let isFillableToolActive = $derived(SHAPES_WITH_FILL.some((s) => s === toolState.toolType));

	/** Check if selected shape supports fill */
	let hasSelectedFillableShape = $derived(
		whiteboardStore.selectedElements.some(
			(el) =>
				el.type === 'shape' &&
				SHAPES_WITH_FILL.includes(el.shapeType as (typeof SHAPES_WITH_FILL)[number])
		)
	);

	/** Show fill selector when fillable shape tool active OR fillable shape is selected */
	let showFillSelector = $derived(isFillableToolActive || hasSelectedFillableShape);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleToolSelect(tool: Tool) {
		whiteboardStore.setTool(tool);
		// Close the relevant popover
		drawingPopoverOpen = false;
		shapesPopoverOpen = false;
	}

	function handleStrokeWidthChange(value: number[]) {
		if (value.length > 0) {
			whiteboardStore.setStrokeWidth(value[0]);
			// Apply to selected elements if any
			if (whiteboardStore.hasSelection) {
				whiteboardStore.updateSelectedStyles({ strokeWidth: value[0] });
			}
		}
	}

	function handleOpacityChange(value: number[]) {
		if (value.length > 0) {
			whiteboardStore.setOpacity(value[0]);
			// Apply to selected elements if any
			if (whiteboardStore.hasSelection) {
				whiteboardStore.updateSelectedStyles({ opacity: value[0] });
			}
		}
	}

	function handleStrokeStyleChange(style: StrokeStyle) {
		whiteboardStore.setStrokeStyle(style);
		// Apply to selected shapes if any
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ strokeStyle: style });
		}
	}

	function handleCornerRadiusChange(value: number[]) {
		if (value.length > 0) {
			whiteboardStore.setCornerRadius(value[0]);
			// Apply to selected shapes if any
			if (whiteboardStore.hasSelection) {
				whiteboardStore.updateSelectedStyles({ cornerRadius: value[0] });
			}
		}
	}

	function handleFillModeChange(mode: FillMode) {
		whiteboardStore.setFillMode(mode);
		// Apply to selected shapes if any
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fillMode: mode });
		}
	}

	function handleFillOpacityChange(value: number[]) {
		if (value.length > 0) {
			whiteboardStore.setFillOpacity(value[0]);
			// Apply to selected shapes if any
			if (whiteboardStore.hasSelection) {
				whiteboardStore.updateSelectedStyles({ fillOpacity: value[0] });
			}
		}
	}

	function handleFillColorChange(color: string) {
		whiteboardStore.setFillColor(color);
		// Apply to selected shapes if any
		if (whiteboardStore.hasSelection) {
			whiteboardStore.updateSelectedStyles({ fill: color });
		}
	}

	// ==========================================================================
	// Stroke Panel Drag Handlers
	// ==========================================================================

	function handleStrokePanelDragStart(e: PointerEvent) {
		e.preventDefault();
		isDraggingStrokePanel = true;
		dragStartPos = { x: e.clientX, y: e.clientY };
		dragStartOffset = { ...strokePanelPosition };

		// Add window listeners for drag
		window.addEventListener('pointermove', handleStrokePanelDragMove);
		window.addEventListener('pointerup', handleStrokePanelDragEnd);
	}

	function handleStrokePanelDragMove(e: PointerEvent) {
		if (!isDraggingStrokePanel) return;
		const dx = e.clientX - dragStartPos.x;
		const dy = e.clientY - dragStartPos.y;

		// Calculate new position with bounds checking
		const newX = dragStartOffset.x + dx;
		const newY = dragStartOffset.y + dy;

		// Keep panel within viewport
		const panelWidth = 256; // w-64 = 16rem = 256px
		const panelHeight = 350; // approximate height
		const maxX = window.innerWidth - panelWidth - 10;
		const maxY = window.innerHeight - panelHeight - 10;

		strokePanelPosition = {
			x: Math.max(10, Math.min(maxX, newX)),
			y: Math.max(10, Math.min(maxY, newY))
		};
	}

	function handleStrokePanelDragEnd() {
		isDraggingStrokePanel = false;
		window.removeEventListener('pointermove', handleStrokePanelDragMove);
		window.removeEventListener('pointerup', handleStrokePanelDragEnd);
	}

	function toggleStrokePanel(e: MouseEvent) {
		if (strokePanelOpen) {
			strokePanelOpen = false;
		} else {
			// Position panel near the button
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			strokePanelPosition = {
				x: rect.left,
				y: rect.top - 360 // Above the toolbar
			};
			strokePanelOpen = true;
		}
	}

	function closePanelsOnClickOutside(e: MouseEvent) {
		// Close stroke panel if clicking outside
		if (
			strokePanelOpen &&
			strokePanelRef &&
			!strokePanelRef.contains(e.target as Node) &&
			!(e.target as HTMLElement).closest('[data-stroke-panel-trigger]')
		) {
			strokePanelOpen = false;
		}
		// Close fill panel if clicking outside
		if (
			fillPanelOpen &&
			fillPanelRef &&
			!fillPanelRef.contains(e.target as Node) &&
			!(e.target as HTMLElement).closest('[data-fill-panel-trigger]')
		) {
			fillPanelOpen = false;
		}
	}

	// ==========================================================================
	// Fill Panel Drag Handlers
	// ==========================================================================

	function handleFillPanelDragStart(e: PointerEvent) {
		e.preventDefault();
		isDraggingFillPanel = true;
		dragStartPos = { x: e.clientX, y: e.clientY };
		dragStartOffset = { ...fillPanelPosition };

		window.addEventListener('pointermove', handleFillPanelDragMove);
		window.addEventListener('pointerup', handleFillPanelDragEnd);
	}

	function handleFillPanelDragMove(e: PointerEvent) {
		if (!isDraggingFillPanel) return;
		const dx = e.clientX - dragStartPos.x;
		const dy = e.clientY - dragStartPos.y;

		const newX = dragStartOffset.x + dx;
		const newY = dragStartOffset.y + dy;

		const panelWidth = 256;
		const panelHeight = 400;
		const maxX = window.innerWidth - panelWidth - 10;
		const maxY = window.innerHeight - panelHeight - 10;

		fillPanelPosition = {
			x: Math.max(10, Math.min(maxX, newX)),
			y: Math.max(10, Math.min(maxY, newY))
		};
	}

	function handleFillPanelDragEnd() {
		isDraggingFillPanel = false;
		window.removeEventListener('pointermove', handleFillPanelDragMove);
		window.removeEventListener('pointerup', handleFillPanelDragEnd);
	}

	function toggleFillPanel(e: MouseEvent) {
		if (fillPanelOpen) {
			fillPanelOpen = false;
		} else {
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			fillPanelPosition = {
				x: rect.left,
				y: rect.top - 420
			};
			fillPanelOpen = true;
		}
	}

	function handleUndo() {
		whiteboardStore.undo();
	}

	function handleRedo() {
		whiteboardStore.redo();
	}

	function handleClear() {
		const page = whiteboardStore.currentPage;
		if (page && page.elements.length > 0) {
			// Confirmation before destructive action
			if (confirm('Voulez-vous vraiment effacer tous les éléments de cette page ?')) {
				whiteboardStore.clearPage();
			}
		}
	}

	function handleInstrumentToggle(type: InstrumentType) {
		whiteboardStore.toggleInstrument(type);
	}

	function handleImageImportClick() {
		imageInputRef?.click();
		importPopoverOpen = false;
	}

	function handlePdfImportClick() {
		pdfInputRef?.click();
		importPopoverOpen = false;
	}

	async function handleImageFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		isImporting = true;
		try {
			const page = whiteboardStore.currentPage;
			if (!page) return;

			// Center the image on the page
			const position = {
				x: page.width / 2 - 200,
				y: page.height / 2 - 150
			};

			const result = await importImageFile(file, position);

			if (result.success && result.element) {
				whiteboardStore.addImage(
					result.element.position,
					result.element.width,
					result.element.height,
					result.element.src,
					result.element.originalFilename
				);
				toaster.success('Image importée');
			} else {
				toaster.error(result.error || "Erreur lors de l'import");
			}
		} catch (error) {
			console.error('Image import error:', error);
			toaster.error("Erreur lors de l'import de l'image");
		} finally {
			isImporting = false;
			// Reset input to allow re-selecting same file
			input.value = '';
		}
	}

	async function handlePdfFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		isImporting = true;
		try {
			const result = await importPdfFile(file, { fitMode: 'fit' });

			if (result.success && result.pages && result.pages.length > 0) {
				whiteboardStore.addPagesFromPdf(result.pages);
				toaster.success(`${result.pages.length} page(s) importée(s) du PDF`);
			} else {
				toaster.error(result.error || "Erreur lors de l'import du PDF");
			}
		} catch (error) {
			console.error('PDF import error:', error);
			toaster.error("Erreur lors de l'import du PDF");
		} finally {
			isImporting = false;
			// Reset input to allow re-selecting same file
			input.value = '';
		}
	}

	// ==========================================================================
	// File Operations Handlers
	// ==========================================================================

	function handleNewDocument() {
		if (hasUnsavedChanges) {
			if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?')) {
				return;
			}
		}

		// Ask for document title
		const title = prompt('Nom du nouveau document:', 'Sans titre');
		if (title === null) return; // User cancelled

		whiteboardStore.createNew(title || 'Sans titre');
		toaster.success('Nouveau document créé');
		filePopoverOpen = false;
	}

	function handleSaveDocument() {
		const doc = whiteboardStore.document;
		if (!doc) return;

		// If document has never been saved, ask for filename
		if (doc.title === 'Sans titre' || !doc.title) {
			const title = prompt('Nom du document:', doc.title || 'Sans titre');
			if (title === null) return; // User cancelled
			if (title) {
				whiteboardStore.setTitle(title);
			}
		}

		const result = whiteboardStore.saveToFile();
		if (result.success) {
			toaster.success('Document sauvegardé');
		} else {
			toaster.error(result.error || 'Erreur lors de la sauvegarde');
		}
		filePopoverOpen = false;
	}

	function handleOpenDocument() {
		ubwInputRef?.click();
		filePopoverOpen = false;
	}

	function handleExportClick() {
		exportDialogOpen = true;
		filePopoverOpen = false;
	}

	async function handleUbwFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (hasUnsavedChanges) {
			if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?')) {
				input.value = '';
				return;
			}
		}

		try {
			const result = await whiteboardStore.loadFromFile(file);

			if (result.success) {
				toaster.success('Document chargé');
			} else {
				toaster.error(result.error || 'Erreur lors du chargement');
			}
		} catch (error) {
			console.error('File load error:', error);
			toaster.error('Erreur lors du chargement du fichier');
		} finally {
			input.value = '';
		}
	}
</script>

<svelte:window onclick={closePanelsOnClickOutside} />

<div class="whiteboard-toolbar border-t border-border bg-muted/95 backdrop-blur-sm">
	<div class="flex items-center justify-between gap-2 px-3 py-2">
		<!-- Left: Tool menus -->
		<div class="flex items-center gap-1">
			<!-- Select Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'select' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('select')}
				title="Sélection (V)"
				aria-label="Outil de sélection"
				class={toolState.toolType === 'select' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<MousePointer2 class="h-4 w-4" />
			</Button>

			<!-- Pan Tool -->
			<Button
				type="button"
				variant={toolState.toolType === 'pan' ? 'default' : 'ghost'}
				size="sm"
				onclick={() => handleToolSelect('pan')}
				title="Déplacer la vue (Espace)"
				aria-label="Déplacer la vue"
				class={toolState.toolType === 'pan' ? 'ring-2 ring-primary ring-offset-1' : ''}
			>
				<Hand class="h-4 w-4" />
			</Button>

			<!-- Separator -->
			<div class="mx-1 h-6 w-px bg-border"></div>

			<!-- Drawing Tools Popover -->
			<Popover.Root bind:open={drawingPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors {isDrawingToolActive
								? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
								: 'hover:bg-accent'}"
							aria-label="Outils de dessin"
							title="Dessin"
						>
							<currentDrawingTool.icon class="h-4 w-4" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2" side="top" align="start">
					<div class="flex flex-col gap-1">
						{#each DRAWING_TOOLS as tool (tool.id)}
							<Button
								type="button"
								variant={toolState.toolType === tool.id ? 'secondary' : 'ghost'}
								size="sm"
								onclick={() => handleToolSelect(tool.id)}
								class="justify-start gap-2"
							>
								<tool.icon class="h-4 w-4" />
								<span>{tool.label}</span>
								<kbd class="ml-auto rounded bg-muted px-1.5 text-xs">{tool.shortcut}</kbd>
							</Button>
						{/each}
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- Shape Tools Popover -->
			<Popover.Root bind:open={shapesPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors {isShapeToolActive
								? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1'
								: 'hover:bg-accent'}"
							aria-label="Formes"
							title="Formes"
						>
							<currentShapeTool.icon class="h-4 w-4" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2" side="top" align="start">
					<div class="flex gap-1">
						{#each SHAPE_TOOLS as tool (tool.id)}
							<Button
								type="button"
								variant={toolState.toolType === tool.id ? 'secondary' : 'ghost'}
								size="icon"
								onclick={() => handleToolSelect(tool.id)}
								title={tool.label}
							>
								<tool.icon class="h-4 w-4" />
							</Button>
						{/each}
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- Instruments Popover -->
			<Popover.Root bind:open={instrumentsPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent"
							aria-label="Instruments"
							title="Instruments"
						>
							<Ruler class="h-4 w-4" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2" side="top" align="start">
					<div class="flex flex-col gap-1">
						{#if instruments}
							{#each INSTRUMENT_TOOLS as tool (tool.id)}
								<Button
									type="button"
									variant={instruments[tool.id].visible ? 'secondary' : 'ghost'}
									size="sm"
									onclick={() => handleInstrumentToggle(tool.id)}
									class="justify-start gap-2"
								>
									<tool.icon class="h-4 w-4" />
									<span>{tool.label}</span>
									{#if instruments[tool.id].visible}
										<span class="ml-auto h-2 w-2 rounded-full bg-primary"></span>
									{/if}
								</Button>
							{/each}
						{/if}
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- Import Popover -->
			<Popover.Root bind:open={importPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent"
							aria-label="Importer"
							title="Import"
							disabled={isImporting}
						>
							{#if isImporting}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else}
								<Upload class="h-4 w-4" />
							{/if}
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2" side="top" align="start">
					<div class="flex flex-col gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handleImageImportClick}
							disabled={isImporting}
							class="justify-start gap-2"
						>
							<Image class="h-4 w-4" />
							<span>Image (PNG, JPG, SVG)</span>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handlePdfImportClick}
							disabled={isImporting}
							class="justify-start gap-2"
						>
							<FileText class="h-4 w-4" />
							<span>PDF comme pages</span>
						</Button>
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- File Popover -->
			<Popover.Root bind:open={filePopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent"
							aria-label="Fichier"
							title="Fichier"
						>
							<Save class="h-4 w-4" />
							{#if hasUnsavedChanges}
								<span class="h-2 w-2 rounded-full bg-yellow-500"></span>
							{/if}
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-2" side="top" align="start">
					<div class="flex flex-col gap-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handleNewDocument}
							class="justify-start gap-2"
						>
							<FilePlus class="h-4 w-4" />
							<span>Nouveau</span>
							<kbd class="ml-auto rounded bg-muted px-1.5 text-xs">Ctrl+N</kbd>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handleSaveDocument}
							class="justify-start gap-2"
						>
							<Save class="h-4 w-4" />
							<span>Sauvegarder</span>
							{#if hasUnsavedChanges}
								<span class="h-2 w-2 rounded-full bg-yellow-500"></span>
							{/if}
							<kbd class="ml-auto rounded bg-muted px-1.5 text-xs">Ctrl+S</kbd>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handleOpenDocument}
							class="justify-start gap-2"
						>
							<FolderOpen class="h-4 w-4" />
							<span>Ouvrir</span>
							<kbd class="ml-auto rounded bg-muted px-1.5 text-xs">Ctrl+O</kbd>
						</Button>
						<div class="my-1 h-px bg-border"></div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onclick={handleExportClick}
							class="justify-start gap-2"
						>
							<Download class="h-4 w-4" />
							<span>Exporter</span>
							<kbd class="ml-auto rounded bg-muted px-1.5 text-xs">Ctrl+E</kbd>
						</Button>
						<div class="my-1 h-px bg-border"></div>
						<!-- Sync Status -->
						<div
							class="flex items-center gap-2 px-3 py-1.5 text-sm {getSyncStatusColor(syncState)}"
						>
							{#if syncState.status === 'syncing'}
								<Loader2 class="h-4 w-4 animate-spin" />
							{:else if syncState.status === 'disconnected'}
								<CloudOff class="h-4 w-4" />
							{:else}
								<Cloud class="h-4 w-4" />
							{/if}
							<span>{getSyncStatusLabel(syncState)}</span>
						</div>
					</div>
				</Popover.Content>
			</Popover.Root>

			<!-- Separator -->
			<div class="mx-2 h-6 w-px bg-border"></div>

			<!-- Stroke Properties Button (opens floating panel) -->
			<button
				type="button"
				class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent {strokePanelOpen
					? 'bg-secondary'
					: ''}"
				aria-label="Propriétés du trait"
				title="Trait"
				data-stroke-panel-trigger
				onclick={toggleStrokePanel}
			>
				<!-- Button shows a line preview with current color, width, and style -->
				<svg class="h-6 w-10" viewBox="0 0 40 24">
					<line
						x1="2"
						y1="12"
						x2="38"
						y2="12"
						stroke={currentColor}
						stroke-width={Math.max(Math.min(currentStrokeWidth, 6), 2)}
						stroke-linecap="round"
						stroke-dasharray={currentStrokeStyle === 'solid'
							? undefined
							: currentStrokeStyle === 'dashed'
								? '8 4'
								: currentStrokeStyle === 'dotted'
									? '1 4'
									: '8 3 2 3'}
						opacity={currentOpacity}
					/>
				</svg>
			</button>

			<!-- Fill Mode Button (opens floating panel, show when fillable shape tool active OR fillable shape is selected) -->
			{#if showFillSelector}
				<button
					type="button"
					class="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-accent {fillPanelOpen
						? 'bg-secondary'
						: ''}"
					aria-label="Mode de remplissage"
					title="Remplissage"
					data-fill-panel-trigger
					onclick={toggleFillPanel}
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20">
						{#if currentFillMode === 'none'}
							<rect
								x="2"
								y="2"
								width="16"
								height="16"
								rx="2"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							/>
						{:else if currentFillMode === 'solid'}
							<rect
								x="2"
								y="2"
								width="16"
								height="16"
								rx="2"
								fill={currentFillColor}
								stroke="currentColor"
								stroke-width="1.5"
								opacity={currentFillOpacity}
							/>
						{:else}
							<defs>
								<pattern
									id="toolbar-hatch"
									patternUnits="userSpaceOnUse"
									width="4"
									height="4"
									patternTransform="rotate(45)"
								>
									<line x1="0" y1="0" x2="0" y2="4" stroke={currentFillColor} stroke-width="1" />
								</pattern>
							</defs>
							<rect
								x="2"
								y="2"
								width="16"
								height="16"
								rx="2"
								fill="url(#toolbar-hatch)"
								stroke="currentColor"
								stroke-width="1.5"
								opacity={currentFillOpacity}
							/>
						{/if}
					</svg>
				</button>
			{/if}

			<!-- Separator -->
			<div class="mx-2 h-6 w-px bg-border"></div>

			<!-- Zoom Controls -->
			<div class="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onZoomOut}
					title="Zoom arrière (Ctrl+-)"
					aria-label="Zoom arrière"
				>
					<ZoomOut class="h-4 w-4" />
				</Button>
				<button
					type="button"
					onclick={onZoomToFit}
					class="min-w-[3.5rem] rounded-md px-2 py-1 text-xs font-medium hover:bg-accent"
					title="Ajuster à la fenêtre (Ctrl+0)"
					aria-label="Zoom: {zoomPercent}%"
				>
					{zoomPercent}%
				</button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={onZoomIn}
					title="Zoom avant (Ctrl++)"
					aria-label="Zoom avant"
				>
					<ZoomIn class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<!-- Right: Actions -->
		<div class="flex items-center gap-1">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleUndo}
				disabled={!canUndo}
				title="Annuler (Ctrl+Z)"
				aria-label="Annuler"
			>
				<Undo2 class="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleRedo}
				disabled={!canRedo}
				title="Rétablir (Ctrl+Shift+Z)"
				aria-label="Rétablir"
			>
				<Redo2 class="h-4 w-4" />
			</Button>
			<div class="mx-1 h-6 w-px bg-border"></div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleClear}
				title="Effacer tout"
				aria-label="Effacer tout"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	</div>
</div>

<!-- Floating Stroke Properties Panel -->
{#if strokePanelOpen}
	<div
		bind:this={strokePanelRef}
		class="fixed z-50 w-64 rounded-md border border-border bg-popover shadow-lg"
		style="left: {strokePanelPosition.x}px; top: {strokePanelPosition.y}px;"
		role="dialog"
		aria-label="Propriétés du trait"
	>
		<!-- Drag handle header -->
		<div
			class="flex cursor-move items-center justify-between rounded-t-md border-b border-border bg-muted/50 px-3 py-1.5"
			class:cursor-grabbing={isDraggingStrokePanel}
			onpointerdown={handleStrokePanelDragStart}
			role="button"
			tabindex="-1"
			aria-label="Déplacer le panneau"
		>
			<span class="text-xs font-medium text-muted-foreground">Trait</span>
			<svg class="h-3 w-3 text-muted-foreground/50" viewBox="0 0 12 12">
				<circle cx="3" cy="3" r="1" fill="currentColor" />
				<circle cx="9" cy="3" r="1" fill="currentColor" />
				<circle cx="3" cy="9" r="1" fill="currentColor" />
				<circle cx="9" cy="9" r="1" fill="currentColor" />
			</svg>
		</div>
		<div class="flex flex-col gap-3 p-3">
			<!-- Stroke color -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Couleur</span>
				<div class="grid grid-cols-6 gap-1.5">
					{#each COLOR_PRESETS as color (color.value)}
						<button
							type="button"
							onclick={() => {
								whiteboardStore.setColor(color.value);
								if (whiteboardStore.hasSelection) {
									whiteboardStore.updateSelectedStyles({ color: color.value });
								}
							}}
							class="h-7 w-7 rounded border-2 transition-transform hover:scale-110 {currentColor ===
							color.value
								? 'border-primary ring-1 ring-primary ring-offset-1'
								: 'border-border'}"
							style="background-color: {color.value}"
							title={color.name}
							aria-label="{color.name}{currentColor === color.value ? ' (sélectionné)' : ''}"
						></button>
					{/each}
				</div>
				<div class="mt-1.5 flex items-center gap-2">
					<input
						type="color"
						value={currentColor}
						oninput={(e) => {
							whiteboardStore.setColor(e.currentTarget.value);
							if (whiteboardStore.hasSelection) {
								whiteboardStore.updateSelectedStyles({ color: e.currentTarget.value });
							}
						}}
						class="h-7 w-7 cursor-pointer rounded border-0 p-0"
						aria-label="Couleur personnalisée"
					/>
					<span class="text-xs text-muted-foreground">Personnalisé</span>
				</div>
			</div>

			<!-- Stroke width -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Épaisseur</span>
				<div class="flex items-center gap-2">
					<Slider
						value={[currentStrokeWidth]}
						onValueChange={handleStrokeWidthChange}
						min={STROKE_WIDTH_MIN}
						max={STROKE_WIDTH_MAX}
						step={1}
						class="flex-1"
						aria-label="Épaisseur du trait: {currentStrokeWidth} pixels"
					/>
					<span class="min-w-[2.5rem] text-right text-xs text-muted-foreground"
						>{currentStrokeWidth}px</span
					>
				</div>
			</div>

			<!-- Opacity -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Opacité</span>
				<div class="flex items-center gap-2">
					<Slider
						value={[currentOpacity]}
						onValueChange={handleOpacityChange}
						min={0.1}
						max={1}
						step={0.1}
						class="flex-1"
						aria-label="Opacité: {Math.round(currentOpacity * 100)}%"
					/>
					<span class="min-w-[2.5rem] text-right text-xs text-muted-foreground"
						>{Math.round(currentOpacity * 100)}%</span
					>
				</div>
			</div>

			<!-- Stroke style -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Style de trait</span>
				<div class="flex flex-col gap-1">
					{#each Object.entries(STROKE_STYLE_LABELS) as [style, label] (style)}
						<Button
							type="button"
							variant={currentStrokeStyle === style ? 'secondary' : 'ghost'}
							size="sm"
							onclick={() => handleStrokeStyleChange(style as StrokeStyle)}
							class="justify-start gap-3"
						>
							<svg class="h-4 w-10" viewBox="0 0 40 8">
								<line
									x1="2"
									y1="4"
									x2="38"
									y2="4"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-dasharray={style === 'solid'
										? undefined
										: style === 'dashed'
											? '6 3'
											: style === 'dotted'
												? '2 3'
												: '6 2 2 2'}
								/>
							</svg>
							<span>{label}</span>
						</Button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Floating Fill Properties Panel -->
{#if fillPanelOpen}
	<div
		bind:this={fillPanelRef}
		class="fixed z-50 w-64 rounded-md border border-border bg-popover shadow-lg"
		style="left: {fillPanelPosition.x}px; top: {fillPanelPosition.y}px;"
		role="dialog"
		aria-label="Propriétés de remplissage"
	>
		<!-- Drag handle header -->
		<div
			class="flex cursor-move items-center justify-between rounded-t-md border-b border-border bg-muted/50 px-3 py-1.5"
			class:cursor-grabbing={isDraggingFillPanel}
			onpointerdown={handleFillPanelDragStart}
			role="button"
			tabindex="-1"
			aria-label="Déplacer le panneau"
		>
			<span class="text-xs font-medium text-muted-foreground">Remplissage</span>
			<svg class="h-3 w-3 text-muted-foreground/50" viewBox="0 0 12 12">
				<circle cx="3" cy="3" r="1" fill="currentColor" />
				<circle cx="9" cy="3" r="1" fill="currentColor" />
				<circle cx="3" cy="9" r="1" fill="currentColor" />
				<circle cx="9" cy="9" r="1" fill="currentColor" />
			</svg>
		</div>
		<div class="flex flex-col gap-3 p-3">
			<!-- Fill mode -->
			<div>
				<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Mode</span>
				<div class="flex flex-col gap-1">
					{#each Object.entries(FILL_MODE_LABELS) as [mode, label] (mode)}
						<Button
							type="button"
							variant={currentFillMode === mode ? 'secondary' : 'ghost'}
							size="sm"
							onclick={() => handleFillModeChange(mode as FillMode)}
							class="justify-start gap-3"
						>
							<svg class="h-5 w-5" viewBox="0 0 20 20">
								{#if mode === 'none'}
									<rect
										x="2"
										y="2"
										width="16"
										height="16"
										rx="2"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									/>
								{:else if mode === 'solid'}
									<rect
										x="2"
										y="2"
										width="16"
										height="16"
										rx="2"
										fill={currentFillColor}
										stroke="currentColor"
										stroke-width="1.5"
									/>
								{:else}
									<defs>
										<pattern
											id="fill-panel-hatch-{mode}"
											patternUnits="userSpaceOnUse"
											width="4"
											height="4"
											patternTransform="rotate(45)"
										>
											<line
												x1="0"
												y1="0"
												x2="0"
												y2="4"
												stroke={currentFillColor}
												stroke-width="1"
											/>
										</pattern>
									</defs>
									<rect
										x="2"
										y="2"
										width="16"
										height="16"
										rx="2"
										fill="url(#fill-panel-hatch-{mode})"
										stroke="currentColor"
										stroke-width="1.5"
									/>
								{/if}
							</svg>
							<span>{label}</span>
						</Button>
					{/each}
				</div>
			</div>

			<!-- Fill color and opacity (only when fill is not 'none') -->
			{#if currentFillMode !== 'none'}
				<div>
					<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Couleur</span>
					<div class="grid grid-cols-6 gap-1.5">
						{#each COLOR_PRESETS as color (color.value)}
							<button
								type="button"
								onclick={() => handleFillColorChange(color.value)}
								class="h-7 w-7 rounded border-2 transition-transform hover:scale-110 {currentFillColor ===
								color.value
									? 'border-primary ring-1 ring-primary ring-offset-1'
									: 'border-border'}"
								style="background-color: {color.value}"
								title={color.name}
								aria-label="{color.name}{currentFillColor === color.value ? ' (sélectionné)' : ''}"
							></button>
						{/each}
					</div>
					<div class="mt-1.5 flex items-center gap-2">
						<input
							type="color"
							value={currentFillColor}
							oninput={(e) => handleFillColorChange(e.currentTarget.value)}
							class="h-7 w-7 cursor-pointer rounded border-0 p-0"
							aria-label="Couleur de remplissage personnalisée"
						/>
						<span class="text-xs text-muted-foreground">Personnalisé</span>
					</div>
				</div>

				<div>
					<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Opacité</span>
					<div class="flex items-center gap-2">
						<Slider
							value={[currentFillOpacity]}
							onValueChange={handleFillOpacityChange}
							min={0.1}
							max={1}
							step={0.1}
							class="flex-1"
							aria-label="Opacité du remplissage: {Math.round(currentFillOpacity * 100)}%"
						/>
						<span class="min-w-[2.5rem] text-right text-xs text-muted-foreground"
							>{Math.round(currentFillOpacity * 100)}%</span
						>
					</div>
				</div>
			{/if}

			<!-- Corner radius slider (only for shapes with corners) -->
			{#if showCornerRadiusSlider}
				<div>
					<span class="mb-1.5 block text-xs font-medium text-muted-foreground">Arrondi</span>
					<div class="flex items-center gap-2">
						<Slider
							value={[currentCornerRadius]}
							onValueChange={handleCornerRadiusChange}
							min={0}
							max={50}
							step={1}
							class="flex-1"
							aria-label="Rayon des coins: {currentCornerRadius}px"
						/>
						<span class="min-w-[2.5rem] text-right text-xs text-muted-foreground"
							>{currentCornerRadius}px</span
						>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Hidden file inputs -->
<input
	bind:this={imageInputRef}
	type="file"
	accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
	onchange={handleImageFileSelect}
	class="hidden"
	aria-hidden="true"
/>

<input
	bind:this={pdfInputRef}
	type="file"
	accept="application/pdf"
	onchange={handlePdfFileSelect}
	class="hidden"
	aria-hidden="true"
/>

<input
	bind:this={ubwInputRef}
	type="file"
	accept=".ubw"
	onchange={handleUbwFileSelect}
	class="hidden"
	aria-hidden="true"
/>

<!-- Export Dialog -->
<ExportDialog bind:open={exportDialogOpen} />

<style>
	.whiteboard-toolbar {
		user-select: none;
	}
</style>
