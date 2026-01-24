/**
 * Whiteboard Store
 *
 * Main state management for the whiteboard feature.
 * Uses Svelte 5 runes for reactive state.
 *
 * @module whiteboard/stores/whiteboard
 */

import { browser } from '$app/environment';
import {
	createEmptyDocument,
	createEmptyPage,
	createDefaultInstruments,
	PAGE_FORMATS,
	DEFAULT_START_ARROWHEAD,
	DEFAULT_END_ARROWHEAD,
	DEFAULT_STAMP_SIZE,
	type WhiteboardDocument,
	type Page,
	type PageBackground,
	type WhiteboardElement,
	type TextBlockElement,
	type ImageElement,
	type GroupElement,
	type PageFormatKey,
	type InstrumentType,
	type InstrumentState,
	type StrokeStyle,
	type FillMode,
	type ElbowDirection,
	type ArrowType,
	type ArrowWaypoint,
	type Arrowhead,
	type AnnotationStroke,
	type AnnotationShape,
	type AnnotationStamp,
	type AnnotationToolType,
	type AnnotationShapeType,
	type AnnotationStrokeToolType,
	type StampType
} from '../types/document';
import { getElementBounds } from '../core/hit-testing';
import { createHistoryManager, type HistoryManager } from '../core/history.svelte';
import { serialize, deserialize } from '../core/serialization';
import {
	downloadDocument,
	loadDocumentFromFile,
	generateFilename,
	prepareForSave,
	serializeDocument,
	isValidFilename,
	FILE_EXTENSION
} from '../utils/file-operations';
import {
	createInitialSyncState,
	updateSyncStateAfterSync,
	updateSyncStateOnError,
	updateSyncStateToSyncing,
	markAsModified,
	shouldAutoSync,
	updateAutosaveFileId,
	clearAutosaveFileId,
	type SyncState,
	type SyncStatus
} from '../utils/sync-state';
import { driveSyncService } from '../services/drive-sync';
import { updateBoundArrowsForShapes, clearBindingsForDeletedShapes } from '../core/binding-updates';
import {
	isBindableShape,
	isArrowElement,
	findBindingCandidate,
	createBindingAnchor,
	calculateBoundEndpoint
} from '../core/binding';
import { routeElbowArrow } from '../core/elbow-routing';
import { headingFromPoints, getHeadingForBindingPoint, flipHeading } from '../core/heading';
import {
	calculatePageExpansion,
	expandPageByDelta,
	isPageExpanded,
	getExportScaleFactor,
	getExpansionFactor,
	createExpandedPage,
	createResetPage
} from '../core/page-expansion';
import type { ShapeElement, ArrowElement, BindingAnchor, Point, Heading } from '../types/document';
import { createArrowPoints } from '../types/document';
import type { WhiteboardTemplate, TemplatePageData, TemplateFont } from '../types/templates';
import { calculateSnapForTranslate, type SnapIndicator } from '../core/snapping';
import {
	alignHorizontal,
	alignVertical,
	distributeHorizontal,
	distributeVertical,
	type HorizontalAlignment,
	type VerticalAlignment
} from '../core/alignment';

// =============================================================================
// Constants
// =============================================================================

/** LocalStorage key prefix for autosave (followed by document ID) */
const AUTOSAVE_KEY_PREFIX = 'ubumaths-whiteboard-autosave-';

/** LocalStorage key for autosave index (list of saved document IDs with metadata) */
const AUTOSAVE_INDEX_KEY = 'ubumaths-whiteboard-autosave-index';

/** Legacy autosave key (for migration) */
const LEGACY_AUTOSAVE_KEY = 'ubumaths-whiteboard-autosave';

/** LocalStorage key for sync state (Drive file/folder IDs) */
const SYNC_STATE_KEY = 'ubumaths-whiteboard-sync-state';

/** Autosave delay in milliseconds (1 minute) */
const AUTOSAVE_DELAY_MS = 60_000;

/** Maximum number of autosaves to keep */
const MAX_AUTOSAVES = 10;

/** Autosave index entry */
export interface AutosaveIndexEntry {
	id: string;
	title: string;
	updatedAt: string;
}

// =============================================================================
// Tool Types
// =============================================================================

/** Drawing tools */
export type DrawingTool = 'pen' | 'marker' | 'highlighter' | 'eraser';

/** Shape tools */
export type ShapeTool = 'line' | 'rectangle' | 'circle' | 'arrow' | 'pentagon' | 'hexagon' | 'star';

/** Tools with configurable settings (color, width) */
export type ConfigurableTool = DrawingTool | ShapeTool;

/** Action tools */
export type ActionTool = 'select' | 'pan' | 'text' | 'image' | 'laser';

/** Laser pointer modes */
export type LaserMode = 'pointer' | 'trail';

/** Point in laser trail with timestamp for fading */
export interface LaserTrailPoint {
	point: Point;
	timestamp: number;
}

// =============================================================================
// TextBlock Constants
// =============================================================================

/** Default dimensions for new text blocks */
export const DEFAULT_TEXT_BLOCK_WIDTH = 300;
export const DEFAULT_TEXT_BLOCK_HEIGHT = 100;

/** Minimum dimensions for text blocks */
export const MIN_TEXT_BLOCK_WIDTH = 150;
export const MIN_TEXT_BLOCK_HEIGHT = 50;

// =============================================================================
// Image Constants
// =============================================================================

/** Minimum dimensions for images */
export const MIN_IMAGE_WIDTH = 50;
export const MIN_IMAGE_HEIGHT = 50;

/** Instrument tools */
export type InstrumentTool = 'ruler' | 'protractor' | 'compass' | 'set-square';

/** All tool types */
export type Tool = DrawingTool | ShapeTool | ActionTool | InstrumentTool;

/** Tool settings for drawing tools */
export interface ToolSettings {
	color: string;
	width: number;
	opacity: number;
	strokeStyle: StrokeStyle;
	cornerRadius: number;
	fillMode: FillMode;
	fillColor: string;
	fillOpacity: number;
	/** For arrows: type of arrow (sharp, curved, elbow) */
	arrowType: ArrowType;
	/** @deprecated Use arrowType: 'elbow' instead - kept for backwards compatibility */
	elbowed: boolean;
	/** For arrows: direction of first segment */
	elbowDirection: ElbowDirection;
	/** For arrows: arrowhead style at start (null = none) */
	startArrowhead: Arrowhead | null;
	/** For arrows: arrowhead style at end (default: 'arrow') */
	endArrowhead: Arrowhead;
	/** Roughness level for roughjs (0 = clean, 1 = sketchy, 2 = very sketchy) */
	roughness: number;
}

/** Default color and width (shared across all configurable tools) */
const DEFAULT_COLOR = '#000000';
const DEFAULT_WIDTH = 2;

/** Default stroke style */
const DEFAULT_STROKE_STYLE: StrokeStyle = 'solid';

/** Default corner radius */
const DEFAULT_CORNER_RADIUS = 0;

/** Default fill mode (solid = same color as stroke) */
const DEFAULT_FILL_MODE: FillMode = 'solid';

/** Default fill color */
const DEFAULT_FILL_COLOR = '#000000';

/** Default fill opacity */
const DEFAULT_FILL_OPACITY = 1;

/** Default arrow type (sharp = straight line) */
const DEFAULT_ARROW_TYPE: ArrowType = 'sharp';

/** Default elbow mode (straight arrow) - deprecated, use DEFAULT_ARROW_TYPE */
const DEFAULT_ELBOWED = false;

/** Default elbow direction */
const DEFAULT_ELBOW_DIRECTION: ElbowDirection = 'horizontal-first';

/** Default roughness for roughjs (0 = clean, 1 = sketchy, 2 = very sketchy) */
const DEFAULT_ROUGHNESS = 1;

/** Default settings per tool (color/width are global, opacity is per-tool) */
const DEFAULT_TOOL_SETTINGS: Record<ConfigurableTool, ToolSettings> = {
	// Drawing tools (strokeStyle/cornerRadius/fill not used for freehand)
	pen: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none',
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	marker: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none',
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	highlighter: {
		color: '#facc15', // Yellow - typical highlighter color
		width: 20, // Wide stroke like a real highlighter
		opacity: 0.5,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none',
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	eraser: {
		color: '#ffffff',
		width: 20,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none',
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	// Shape tools (strokeStyle, cornerRadius, fillMode apply here)
	line: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none', // Lines don't have fill
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	rectangle: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	circle: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	arrow: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: 'none', // Arrows don't have fill
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	pentagon: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	hexagon: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	},
	star: {
		color: DEFAULT_COLOR,
		width: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION,
		startArrowhead: DEFAULT_START_ARROWHEAD,
		endArrowhead: DEFAULT_END_ARROWHEAD,
		roughness: DEFAULT_ROUGHNESS
	}
};

// =============================================================================
// Store Class
// =============================================================================

/**
 * Create the whiteboard store
 */
function createWhiteboardStore() {
	// === Document State ===
	let document = $state<WhiteboardDocument | null>(null);
	let history = $state<HistoryManager | null>(null);

	// === Tool State ===
	let currentTool = $state<Tool>('pen');
	let toolSettings = $state<Record<ConfigurableTool, ToolSettings>>({ ...DEFAULT_TOOL_SETTINGS });

	// === User Preferences (restored after deselection) ===
	let userPreferences = $state({
		color: DEFAULT_COLOR,
		strokeWidth: DEFAULT_WIDTH,
		opacity: 1,
		strokeStyle: DEFAULT_STROKE_STYLE as StrokeStyle,
		cornerRadius: DEFAULT_CORNER_RADIUS,
		fillMode: DEFAULT_FILL_MODE as FillMode,
		fillColor: DEFAULT_FILL_COLOR,
		fillOpacity: DEFAULT_FILL_OPACITY,
		arrowType: DEFAULT_ARROW_TYPE as ArrowType,
		elbowed: DEFAULT_ELBOWED,
		elbowDirection: DEFAULT_ELBOW_DIRECTION as ElbowDirection,
		startArrowhead: DEFAULT_START_ARROWHEAD as Arrowhead | null,
		endArrowhead: DEFAULT_END_ARROWHEAD as Arrowhead,
		roughness: DEFAULT_ROUGHNESS
	});

	// === UI State ===
	let hasUnsavedChanges = $state(false);
	const isLoading = $state(false);
	let sidebarVisible = $state(false);
	let fileDrawerVisible = $state(false);
	let stylePanelOpen = $state(false);
	let isAnnotationMode = $state(false);

	// === Annotation State ===
	let annotationTool = $state<AnnotationToolType>('annotation-pen');
	let annotationStyle = $state({
		color: '#ef4444', // Red default for annotations
		strokeWidth: 3,
		opacity: 1,
		strokeStyle: 'solid' as StrokeStyle,
		fillMode: 'none' as FillMode,
		fill: '#ef4444',
		sketch: false,
		stampType: '✓' as StampType,
		stampSize: DEFAULT_STAMP_SIZE,
		stampFill: undefined as string | undefined,
		stampFillOpacity: 1
	});
	let selectedAnnotationIds = $state<Set<string>>(new Set());

	// === Selection State ===
	let selectedIds = $state<Set<string>>(new Set());

	// === Clipboard State ===
	let clipboard = $state<WhiteboardElement[]>([]);

	// === Sync State ===
	let syncState = $state<SyncState>(createInitialSyncState());

	// === Template Preferences ===
	// Default font for new TextBlocks (set when applying a template with font preference)
	let defaultTextFont = $state<TemplateFont | undefined>(undefined);
	// Default template for new pages (set when user selects a template via PageThumbnails)
	let defaultTemplate = $state<TemplatePageData | null>(null);
	// New document template picker state
	let newDocumentPickerOpen = $state(false);
	let newDocumentTitle = $state('');
	// Pending class info for auto-save to Drive on document creation
	let pendingClassInfo = $state<{ joinCode: string; className: string } | null>(null);

	// === Laser Pointer State ===
	let laserMode = $state<LaserMode>('pointer');
	let laserActive = $state(false);
	let laserPosition = $state<Point | null>(null);
	let laserTrail = $state<LaserTrailPoint[]>([]);
	let laserFadeStartTime = $state<number | null>(null);

	// === Live Transform State (for smooth dragging/rotating without full re-render) ===
	let liveRotations = $state<Map<string, number>>(new Map());
	let liveResizes = $state<
		Map<string, { scaleX: number; scaleY: number; originX: number; originY: number }>
	>(new Map());
	let livePositions = $state<Map<string, { dx: number; dy: number }>>(new Map());
	let liveEndpoints = $state<Map<string, { endpoint: 'start' | 'end'; x: number; y: number }>>(
		new Map()
	);

	// === Live Waypoints State (for smooth dragging of curve control points) ===
	let liveWaypoints = $state<Map<string, ArrowWaypoint[]>>(new Map());

	// === Live Elbow Points State (for smooth elbow arrow re-routing during drag) ===
	let liveElbowPoints = $state<Map<string, readonly Point[]>>(new Map());

	// === Snapping State ===
	let snapIndicators = $state<SnapIndicator[]>([]);
	let snappingEnabled = $state(true);

	// === Autosave ===
	let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// === Derived State ===
	const currentPage = $derived(document?.pages[document.currentPageIndex] ?? null);
	const pageCount = $derived(document?.pages.length ?? 0);
	const canUndo = $derived(history?.canUndo ?? false);
	const canRedo = $derived(history?.canRedo ?? false);

	// Combined tool state for convenience
	// Use 'pen' as reference for shared settings when current tool is not configurable (e.g., select, pan)
	const toolState = $derived.by(() => {
		const settings =
			currentTool in toolSettings
				? toolSettings[currentTool as ConfigurableTool]
				: toolSettings.pen; // Use pen's settings as reference for non-configurable tools
		return {
			toolType: currentTool,
			color: settings.color,
			strokeWidth: settings.width,
			opacity: settings.opacity,
			strokeStyle: settings.strokeStyle,
			cornerRadius: settings.cornerRadius,
			fillMode: settings.fillMode,
			fillColor: settings.fillColor,
			fillOpacity: settings.fillOpacity,
			arrowType: settings.arrowType,
			elbowed: settings.elbowed,
			elbowDirection: settings.elbowDirection,
			startArrowhead: settings.startArrowhead,
			endArrowhead: settings.endArrowhead,
			roughness: userPreferences.roughness
		};
	});

	// Selection derived state
	const hasSelection = $derived(selectedIds.size > 0);
	const selectedElements = $derived.by(() => {
		if (!currentPage || selectedIds.size === 0) return [];
		return currentPage.elements.filter((el) => selectedIds.has(el.id));
	});

	// === Internal Methods ===

	function scheduleAutosave(): void {
		if (!browser) return;

		// Clear existing timeout
		if (autosaveTimeout) {
			clearTimeout(autosaveTimeout);
		}

		// Schedule new autosave
		autosaveTimeout = setTimeout(() => {
			saveToLocalStorage();
		}, AUTOSAVE_DELAY_MS);
	}

	function saveToLocalStorage(): void {
		if (!browser || !document) return;

		try {
			const json = serialize(document);
			const autosaveKey = AUTOSAVE_KEY_PREFIX + document.id;
			localStorage.setItem(autosaveKey, json);

			// Update autosave index
			updateAutosaveIndex(document.id, document.title, document.updatedAt);

			// Also save sync state if connected to Drive
			if (syncState.driveFileId) {
				const syncStateData = {
					driveFileId: syncState.driveFileId,
					driveFolderId: syncState.driveFolderId,
					autosaveFileId: syncState.autosaveFileId
				};
				localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(syncStateData));
			}

			console.debug('[Whiteboard] Autosaved to localStorage:', document.id);
		} catch (error) {
			// Handle quota exceeded or other errors gracefully
			console.warn('[Whiteboard] Autosave failed:', error);
		}
	}

	function getAutosaveIndex(): AutosaveIndexEntry[] {
		if (!browser) return [];
		try {
			const saved = localStorage.getItem(AUTOSAVE_INDEX_KEY);
			if (!saved) return [];
			return JSON.parse(saved) as AutosaveIndexEntry[];
		} catch {
			return [];
		}
	}

	function updateAutosaveIndex(id: string, title: string, updatedAt: string): void {
		if (!browser) return;

		let index = getAutosaveIndex();

		// Remove existing entry for this document
		index = index.filter((entry) => entry.id !== id);

		// Add new entry at the beginning
		index.unshift({ id, title, updatedAt });

		// Keep only MAX_AUTOSAVES entries
		if (index.length > MAX_AUTOSAVES) {
			const removed = index.splice(MAX_AUTOSAVES);
			// Clean up removed autosaves from localStorage
			for (const entry of removed) {
				localStorage.removeItem(AUTOSAVE_KEY_PREFIX + entry.id);
			}
		}

		localStorage.setItem(AUTOSAVE_INDEX_KEY, JSON.stringify(index));
	}

	function removeFromAutosaveIndex(id: string): void {
		if (!browser) return;

		const index = getAutosaveIndex().filter((entry) => entry.id !== id);
		localStorage.setItem(AUTOSAVE_INDEX_KEY, JSON.stringify(index));
		localStorage.removeItem(AUTOSAVE_KEY_PREFIX + id);
	}

	function loadSyncStateFromLocalStorage(): {
		driveFileId: string | null;
		driveFolderId: string | null;
		autosaveFileId: string | null;
	} | null {
		if (!browser) return null;

		try {
			const saved = localStorage.getItem(SYNC_STATE_KEY);
			if (!saved) return null;

			const data = JSON.parse(saved);
			if (data && typeof data.driveFileId === 'string') {
				return {
					driveFileId: data.driveFileId,
					driveFolderId: data.driveFolderId || null,
					autosaveFileId: data.autosaveFileId || null
				};
			}
		} catch {
			// Ignore parse errors
		}
		return null;
	}

	function clearSyncStateFromLocalStorage(): void {
		if (!browser) return;
		localStorage.removeItem(SYNC_STATE_KEY);
	}

	function updateDocument(updater: (doc: WhiteboardDocument) => WhiteboardDocument): void {
		if (!document) return;

		const updated = {
			...updater(document),
			updatedAt: new Date().toISOString()
		};

		document = updated;
		history?.push(updated);
		hasUnsavedChanges = true;
		scheduleAutosave();

		// Mark sync state as modified and schedule auto-sync
		if (syncState.status !== 'disconnected') {
			syncState = markAsModified(syncState);
			scheduleAutoSync();
		}
	}

	/**
	 * Update document without adding to history or triggering autosave.
	 * Used for live preview during drag operations (sliders, etc.)
	 */
	function updateDocumentLive(updater: (doc: WhiteboardDocument) => WhiteboardDocument): void {
		if (!document) return;
		document = updater(document);
	}

	function scheduleAutoSync(): void {
		if (!browser) return;
		if (!document) return;
		if (!shouldAutoSync(syncState)) return;

		// Use the drive sync service's debounced auto-sync
		// Auto-sync saves to a SEPARATE autosave file (not the original) to preserve user's manual saves
		driveSyncService.scheduleAutoSync(
			document,
			document.title || 'Sans titre',
			syncState.driveFileId || undefined, // Original file ID
			syncState.autosaveFileId || undefined, // Existing autosave file ID (to update instead of creating new)
			syncState.driveFolderId || undefined,
			(result) => {
				if (result.success && result.fileId) {
					// Store the autosave file ID for subsequent auto-syncs
					syncState = updateAutosaveFileId(syncState, result.fileId);
					// Keep status as modified (user hasn't manually saved yet)
					console.log('[Whiteboard] Auto-sync completed, autosave fileId:', result.fileId);
				} else if (!result.success && result.error) {
					syncState = updateSyncStateOnError(syncState, result.error);
				}
			}
		);
	}

	function updateCurrentPage(updater: (page: Page) => Page): void {
		if (!document || !currentPage) return;

		updateDocument((doc) => ({
			...doc,
			pages: doc.pages.map((p, i) => (i === doc.currentPageIndex ? updater(p) : p))
		}));
	}

	/**
	 * Update current page without history/autosave (for live preview)
	 */
	function updateCurrentPageLive(updater: (page: Page) => Page): void {
		if (!document || !currentPage) return;

		updateDocumentLive((doc) => ({
			...doc,
			pages: doc.pages.map((p, i) => (i === doc.currentPageIndex ? updater(p) : p))
		}));
	}

	// === Public API ===

	return {
		// === Getters ===
		get document() {
			return document;
		},
		get currentPage() {
			return currentPage;
		},
		get pageCount() {
			return pageCount;
		},
		get currentTool() {
			return currentTool;
		},
		get toolSettings() {
			return toolSettings;
		},
		get toolState() {
			return toolState;
		},
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		get isLoading() {
			return isLoading;
		},
		get canUndo() {
			return canUndo;
		},
		get canRedo() {
			return canRedo;
		},
		get instruments() {
			return document?.instruments ?? null;
		},
		get sidebarVisible() {
			return sidebarVisible;
		},
		get fileDrawerVisible() {
			return fileDrawerVisible;
		},
		get stylePanelOpen() {
			return stylePanelOpen;
		},
		get isAnnotationMode() {
			return isAnnotationMode;
		},
		get annotationTool() {
			return annotationTool;
		},
		get annotationStyle() {
			return annotationStyle;
		},
		get selectedAnnotationIds() {
			return selectedAnnotationIds;
		},
		get hasSelectedAnnotations() {
			return selectedAnnotationIds.size > 0;
		},
		get currentPageIndex() {
			return document?.currentPageIndex ?? 0;
		},
		get syncState() {
			return syncState;
		},
		get syncStatus(): SyncStatus {
			return syncState.status;
		},
		get defaultTextFont() {
			return defaultTextFont;
		},
		get defaultTemplate() {
			return defaultTemplate;
		},
		get newDocumentPickerOpen() {
			return newDocumentPickerOpen;
		},
		get newDocumentTitle() {
			return newDocumentTitle;
		},
		get pendingClassInfo() {
			return pendingClassInfo;
		},
		get selectedIds() {
			return selectedIds;
		},
		get selectedElements() {
			return selectedElements;
		},
		get hasSelection() {
			return hasSelection;
		},
		get hasClipboard() {
			return clipboard.length > 0;
		},
		get liveRotations() {
			return liveRotations;
		},
		get liveResizes() {
			return liveResizes;
		},
		get livePositions() {
			return livePositions;
		},

		/** Live endpoint positions for lines/arrows during drag */
		get liveEndpoints() {
			return liveEndpoints;
		},

		/** Live waypoints for curved arrows during drag */
		get liveWaypoints() {
			return liveWaypoints;
		},

		/** Live elbow points for elbow arrows during drag */
		get liveElbowPoints() {
			return liveElbowPoints;
		},

		/** Snap indicators for visual feedback during drag */
		get snapIndicators() {
			return snapIndicators;
		},

		/** Whether snapping is enabled */
		get snappingEnabled() {
			return snappingEnabled;
		},

		// === Document Operations ===

		/**
		 * Create a new empty document
		 * Immediately saves to localStorage so autosave is active
		 */
		createNew(title: string = 'Sans titre', format: PageFormatKey = 'A4'): void {
			document = createEmptyDocument(title, format);
			history = createHistoryManager(document);
			hasUnsavedChanges = false;
			selectedIds = new Set();
			// Reset sync state for new document
			syncState = createInitialSyncState();
			clearSyncStateFromLocalStorage();
			// Save immediately so autosave is active from the start
			saveToLocalStorage();
		},

		/**
		 * Load a document from JSON string
		 */
		loadFromJson(json: string): { success: boolean; error?: string } {
			const result = deserialize(json);

			if (!result.success || !result.document) {
				return { success: false, error: result.error };
			}

			document = result.document;
			history = createHistoryManager(document);
			hasUnsavedChanges = false;
			selectedIds = new Set();
			// Restore template preference from document if available
			defaultTemplate = result.document.defaultTemplate ?? null;

			return { success: true };
		},

		/**
		 * Load a pre-validated document object directly
		 * Used when loading from APIs that already return parsed documents
		 */
		loadDocument(doc: WhiteboardDocument): void {
			document = doc;
			history = createHistoryManager(document);
			hasUnsavedChanges = false;
			selectedIds = new Set();
			// Restore template preference from document if available
			defaultTemplate = doc.defaultTemplate ?? null;
		},

		/**
		 * Load from localStorage autosave if available
		 * First tries to load the most recent autosave, also handles legacy migration
		 * Also restores sync state (Drive file/folder IDs) if present
		 */
		loadFromAutosave(): boolean {
			if (!browser) return false;

			try {
				// First try legacy autosave (migration)
				const legacySaved = localStorage.getItem(LEGACY_AUTOSAVE_KEY);
				if (legacySaved) {
					const result = this.loadFromJson(legacySaved);
					if (result.success && document) {
						// Migrate to new system
						saveToLocalStorage();
						// Remove legacy autosave
						localStorage.removeItem(LEGACY_AUTOSAVE_KEY);
						console.debug('[Whiteboard] Migrated legacy autosave to new system');
						return true;
					}
				}

				// Try to load most recent autosave from index
				const index = getAutosaveIndex();
				if (index.length === 0) return false;

				const mostRecent = index[0];
				const saved = localStorage.getItem(AUTOSAVE_KEY_PREFIX + mostRecent.id);
				if (!saved) return false;

				const result = this.loadFromJson(saved);
				if (result.success) {
					// Also restore sync state if available
					const savedSyncState = loadSyncStateFromLocalStorage();
					if (savedSyncState && savedSyncState.driveFileId) {
						syncState = {
							status: 'synced',
							lastSyncAt: new Date().toISOString(),
							driveFileId: savedSyncState.driveFileId,
							driveFolderId: savedSyncState.driveFolderId,
							autosaveFileId: savedSyncState.autosaveFileId,
							error: null
						};
						console.debug('[Whiteboard] Restored sync state:', savedSyncState.driveFileId);
					}
					console.debug('[Whiteboard] Restored from autosave');
					return true;
				}
			} catch (error) {
				console.warn('[Whiteboard] Failed to restore autosave:', error);
			}

			return false;
		},

		/**
		 * Get list of available autosaves
		 */
		getAutosaveList(): AutosaveIndexEntry[] {
			return getAutosaveIndex();
		},

		/**
		 * Load a specific autosave by document ID
		 */
		loadAutosaveById(id: string): boolean {
			if (!browser) return false;

			try {
				const saved = localStorage.getItem(AUTOSAVE_KEY_PREFIX + id);
				if (!saved) return false;

				const result = this.loadFromJson(saved);
				if (result.success) {
					console.debug('[Whiteboard] Loaded autosave:', id);
					return true;
				}
			} catch (error) {
				console.warn('[Whiteboard] Failed to load autosave:', error);
			}

			return false;
		},

		/**
		 * Delete a specific autosave by document ID
		 */
		deleteAutosave(id: string): void {
			if (!browser) return;
			removeFromAutosaveIndex(id);
		},

		/**
		 * Clear autosave for current document from localStorage
		 */
		clearAutosave(): void {
			if (!browser || !document) return;
			removeFromAutosaveIndex(document.id);
			clearSyncStateFromLocalStorage();
		},

		/**
		 * Mark document as saved (clears unsaved flag)
		 */
		markAsSaved(): void {
			hasUnsavedChanges = false;
		},

		/**
		 * Update document title
		 */
		setTitle(title: string): void {
			updateDocument((doc) => ({ ...doc, title }));
		},

		// === Page Operations ===

		/**
		 * Add a new page
		 */
		addPage(format?: PageFormatKey): void {
			if (!document) return;

			// Use same format as current page if not specified
			const pageFormat =
				format ??
				(Object.keys(PAGE_FORMATS).find(
					(k) =>
						PAGE_FORMATS[k as PageFormatKey].width === currentPage?.width &&
						PAGE_FORMATS[k as PageFormatKey].height === currentPage?.height
				) as PageFormatKey) ??
				'A4';

			const newPage = createEmptyPage(pageFormat);

			updateDocument((doc) => ({
				...doc,
				pages: [...doc.pages, newPage],
				currentPageIndex: doc.pages.length // Go to new page
			}));
		},

		/**
		 * Add a new page from a template
		 * Deep clones the template's elements and background
		 */
		addPageFromTemplate(template: WhiteboardTemplate): void {
			if (!document) return;
			this.addPageFromPageData(template.pageData);
		},

		/**
		 * Add a new page from page data (template or customized)
		 * Deep clones the elements and background
		 * Also stores the font preference for new TextBlocks
		 */
		addPageFromPageData(pageData: TemplatePageData): void {
			if (!document) return;

			// Store font preference if specified
			if (pageData.font) {
				defaultTextFont = pageData.font;
			}

			// Deep clone elements via JSON to handle readonly arrays
			let clonedElements = JSON.parse(JSON.stringify(pageData.elements)) as WhiteboardElement[];

			// Apply template font to TextBlocks that don't have a fontFamily set
			if (pageData.font) {
				clonedElements = clonedElements.map((el) => {
					if (el.type === 'textblock' && !el.fontFamily) {
						return { ...el, fontFamily: pageData.font };
					}
					return el;
				});
			}

			// Create new page with content
			const newPage: Page = {
				id: crypto.randomUUID(),
				elements: clonedElements,
				background: JSON.parse(JSON.stringify(pageData.background)) as PageBackground,
				width: pageData.width,
				height: pageData.height
			};

			updateDocument((doc) => ({
				...doc,
				pages: [...doc.pages, newPage],
				currentPageIndex: doc.pages.length // Go to new page
			}));
		},

		/**
		 * Set the default template for new pages
		 * Called when user selects a template from PageThumbnails or TemplatePickerModal
		 */
		setDefaultTemplate(template: TemplatePageData | null): void {
			defaultTemplate = template;
			// Persist to document
			if (document) {
				document = { ...document, defaultTemplate: template ?? undefined };
				scheduleAutosave();
			}
		},

		/**
		 * Add a new page using the default template if set, otherwise blank page
		 * Used by the "+" button in the top bar
		 */
		addPageFromDefaultTemplate(): void {
			if (defaultTemplate) {
				this.addPageFromPageData(defaultTemplate);
			} else {
				this.addPage();
			}
		},

		/**
		 * Open the template picker for a new document
		 * @param title - Document title
		 * @param classInfo - Optional class info for auto-save to Drive
		 */
		openNewDocumentPicker(
			title: string,
			classInfo?: { joinCode: string; className: string }
		): void {
			newDocumentTitle = title;
			pendingClassInfo = classInfo || null;
			newDocumentPickerOpen = true;
		},

		/**
		 * Close the template picker for new document
		 */
		closeNewDocumentPicker(): void {
			newDocumentPickerOpen = false;
		},

		/**
		 * Get and clear pending class info (used after document creation)
		 * Returns the class info if set, then clears it
		 */
		getAndClearPendingClassInfo(): { joinCode: string; className: string } | null {
			const info = pendingClassInfo;
			pendingClassInfo = null;
			return info;
		},

		/**
		 * Set the new document picker open state (for bind:open)
		 */
		setNewDocumentPickerOpen(open: boolean): void {
			newDocumentPickerOpen = open;
		},

		/**
		 * Delete a page by index
		 */
		deletePage(index: number): void {
			if (!document || document.pages.length <= 1) return;
			if (index < 0 || index >= document.pages.length) return;

			updateDocument((doc) => {
				const newPages = doc.pages.filter((_, i) => i !== index);
				const newIndex = Math.min(doc.currentPageIndex, newPages.length - 1);
				return {
					...doc,
					pages: newPages,
					currentPageIndex: newIndex
				};
			});
		},

		/**
		 * Go to a specific page
		 */
		goToPage(index: number): void {
			if (!document) return;
			if (index < 0 || index >= document.pages.length) return;
			if (index === document.currentPageIndex) return; // No change

			// Clear selection when changing pages
			selectedIds = new Set();
			document = { ...document, currentPageIndex: index };
		},

		/**
		 * Go to next page
		 */
		nextPage(): void {
			if (!document) return;
			const next = document.currentPageIndex + 1;
			if (next < document.pages.length) {
				this.goToPage(next);
			}
		},

		/**
		 * Go to previous page
		 */
		previousPage(): void {
			if (!document) return;
			const prev = document.currentPageIndex - 1;
			if (prev >= 0) {
				this.goToPage(prev);
			}
		},

		/**
		 * Reorder pages by moving a page from one index to another
		 */
		reorderPages(fromIndex: number, toIndex: number): void {
			if (!document) return;
			if (fromIndex === toIndex) return;
			if (fromIndex < 0 || fromIndex >= document.pages.length) return;
			if (toIndex < 0 || toIndex >= document.pages.length) return;

			const currentIdx = document.currentPageIndex;

			// Calculate new current page index
			let newCurrentIdx = currentIdx;
			if (currentIdx === fromIndex) {
				// Current page was moved
				newCurrentIdx = toIndex;
			} else if (fromIndex < currentIdx && toIndex >= currentIdx) {
				// Page moved from before current to after current
				newCurrentIdx = currentIdx - 1;
			} else if (fromIndex > currentIdx && toIndex <= currentIdx) {
				// Page moved from after current to before current
				newCurrentIdx = currentIdx + 1;
			}

			updateDocument((doc) => {
				const newPages = [...doc.pages];
				const [movedPage] = newPages.splice(fromIndex, 1);
				newPages.splice(toIndex, 0, movedPage);
				return {
					...doc,
					pages: newPages,
					currentPageIndex: newCurrentIdx
				};
			});
		},

		// === Page Expansion Operations ===

		/**
		 * Check if the current page has been expanded from its original size
		 */
		isCurrentPageExpanded(): boolean {
			if (!currentPage) return false;
			return isPageExpanded(currentPage);
		},

		/**
		 * Get the expansion factor of the current page (1 = not expanded)
		 */
		getCurrentPageExpansionFactor(): number {
			if (!currentPage) return 1;
			return getExpansionFactor(currentPage);
		},

		/**
		 * Get the export scale factor for the current page (to fit content in original size)
		 */
		getCurrentPageExportScaleFactor(): number {
			if (!currentPage) return 1;
			return getExportScaleFactor(currentPage);
		},

		/**
		 * Check if the page should expand and expand it if necessary
		 * Called during drawing operations when cursor approaches the edge
		 * @param point - Current cursor/drawing position
		 * @returns true if expansion occurred
		 */
		checkAndExpandPage(point: Point): boolean {
			if (!currentPage) return false;

			const result = calculatePageExpansion(currentPage, point);
			if (!result.needsExpansion) return false;

			// Expand the page using updateCurrentPageLive for smooth drawing
			// (no history push during drawing - will be committed with the stroke)
			updateCurrentPageLive((page) => createExpandedPage(page, result.newWidth, result.newHeight));

			return true;
		},

		/**
		 * Expand the current page to specific dimensions
		 * Preserves original dimensions for export scaling
		 */
		expandPage(newWidth: number, newHeight: number): void {
			updateCurrentPage((page) => createExpandedPage(page, newWidth, newHeight));
		},

		/**
		 * Expand the page by a delta amount (for pan-based expansion)
		 * Uses progressive expansion, respects MAX_EXPANSION_FACTOR limit
		 * @param deltaX - Amount to expand horizontally (in page pixels)
		 * @param deltaY - Amount to expand vertically (in page pixels)
		 * @returns true if expansion occurred
		 */
		expandPageByDeltaAmount(deltaX: number, deltaY: number): boolean {
			if (!currentPage) return false;

			const result = expandPageByDelta(currentPage, deltaX, deltaY);
			if (!result) return false;

			// Use live update for smooth expansion during pan
			updateCurrentPageLive((page) => createExpandedPage(page, result.width, result.height));
			return true;
		},

		/**
		 * Reset the current page to its original dimensions
		 * Elements are not scaled - they remain in their expanded positions
		 */
		resetPageToOriginal(): void {
			if (!currentPage || !isPageExpanded(currentPage)) return;
			updateCurrentPage((page) => createResetPage(page));
		},

		// === UI Operations ===

		/**
		 * Toggle sidebar visibility
		 */
		toggleSidebar(): void {
			sidebarVisible = !sidebarVisible;
		},

		/**
		 * Set sidebar visibility
		 */
		setSidebarVisible(visible: boolean): void {
			sidebarVisible = visible;
		},

		/**
		 * Toggle file drawer visibility
		 */
		toggleFileDrawer(): void {
			fileDrawerVisible = !fileDrawerVisible;
		},

		/**
		 * Set file drawer visibility
		 */
		setFileDrawerVisible(visible: boolean): void {
			fileDrawerVisible = visible;
		},

		/**
		 * Toggle style panel visibility
		 */
		toggleStylePanel(): void {
			stylePanelOpen = !stylePanelOpen;
		},

		/**
		 * Set style panel visibility
		 */
		setStylePanelOpen(visible: boolean): void {
			stylePanelOpen = visible;
		},

		// === Annotation Mode ===

		/**
		 * Enter annotation mode
		 */
		enterAnnotationMode(): void {
			isAnnotationMode = true;
		},

		/**
		 * Exit annotation mode
		 */
		exitAnnotationMode(): void {
			isAnnotationMode = false;
		},

		/**
		 * Toggle annotation mode
		 */
		toggleAnnotationMode(): void {
			isAnnotationMode = !isAnnotationMode;
		},

		/**
		 * Toggle annotations visibility (document-wide)
		 */
		toggleAnnotationsVisible(): void {
			if (!document) return;
			const newValue = !(document.annotationsVisible ?? true);
			updateDocument((doc) => ({
				...doc,
				annotationsVisible: newValue
			}));
		},

		/**
		 * Set annotations visibility (document-wide)
		 */
		setAnnotationsVisible(visible: boolean): void {
			if (!document) return;
			updateDocument((doc) => ({
				...doc,
				annotationsVisible: visible
			}));
		},

		/**
		 * Set annotation tool
		 */
		setAnnotationTool(tool: AnnotationToolType): void {
			annotationTool = tool;
		},

		/**
		 * Set annotation style property
		 */
		setAnnotationStyleProperty<K extends keyof typeof annotationStyle>(
			key: K,
			value: (typeof annotationStyle)[K]
		): void {
			annotationStyle = { ...annotationStyle, [key]: value };

			// Also apply to selected annotations if any
			if (selectedAnnotationIds.size > 0) {
				if (key === 'color') {
					this.updateSelectedAnnotationsColor(value as string);
				} else if (key === 'strokeWidth') {
					this.updateSelectedAnnotationsStrokeWidth(value as number);
				} else if (key === 'opacity') {
					this.updateSelectedAnnotationsOpacity(value as number);
				}
			}
		},

		/**
		 * Add annotation stroke to current page
		 */
		addAnnotationStroke(points: Point[], toolType: AnnotationStrokeToolType): void {
			const stroke: AnnotationStroke = {
				id: crypto.randomUUID(),
				type: 'stroke',
				points: points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure })),
				width: annotationStyle.strokeWidth,
				color: annotationStyle.color,
				opacity: toolType === 'highlighter' ? 0.4 : annotationStyle.opacity,
				toolType,
				strokeStyle: annotationStyle.strokeStyle,
				sketch: annotationStyle.sketch,
				createdAt: Date.now()
			};

			updateCurrentPage((page) => ({
				...page,
				annotations: [...(page.annotations ?? []), stroke]
			}));
		},

		/**
		 * Add annotation shape to current page
		 */
		addAnnotationShape(start: Point, end: Point, shapeType: AnnotationShapeType): void {
			const shape: AnnotationShape = {
				id: crypto.randomUUID(),
				type: 'shape',
				shapeType,
				start: { x: start.x, y: start.y },
				end: { x: end.x, y: end.y },
				color: annotationStyle.color,
				strokeWidth: annotationStyle.strokeWidth,
				opacity: annotationStyle.opacity,
				strokeStyle: annotationStyle.strokeStyle,
				fillMode: annotationStyle.fillMode,
				fill: annotationStyle.fill,
				sketch: annotationStyle.sketch,
				createdAt: Date.now()
			};

			updateCurrentPage((page) => ({
				...page,
				annotations: [...(page.annotations ?? []), shape]
			}));
		},

		/**
		 * Add annotation stamp to current page
		 */
		addAnnotationStamp(position: Point): void {
			const stamp: AnnotationStamp = {
				id: crypto.randomUUID(),
				type: 'stamp',
				stampType: annotationStyle.stampType,
				position: { x: position.x, y: position.y },
				size: annotationStyle.stampSize,
				rotation: 0,
				color: annotationStyle.color,
				opacity: annotationStyle.opacity,
				fill: annotationStyle.stampFill,
				fillOpacity: annotationStyle.stampFillOpacity,
				sketch: false,
				createdAt: Date.now()
			};

			updateCurrentPage((page) => ({
				...page,
				annotations: [...(page.annotations ?? []), stamp]
			}));
		},

		/**
		 * Delete annotation by ID
		 */
		deleteAnnotation(annotationId: string): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).filter((a) => a.id !== annotationId)
			}));
		},

		/**
		 * Clear all annotations on current page
		 */
		clearAnnotations(): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: []
			}));
		},

		/**
		 * Select an annotation
		 */
		selectAnnotation(annotationId: string, addToSelection = false): void {
			if (addToSelection) {
				selectedAnnotationIds = new Set([...selectedAnnotationIds, annotationId]);
			} else {
				selectedAnnotationIds = new Set([annotationId]);
			}
		},

		/**
		 * Deselect an annotation
		 */
		deselectAnnotation(annotationId: string): void {
			const newSet = new Set(selectedAnnotationIds);
			newSet.delete(annotationId);
			selectedAnnotationIds = newSet;
		},

		/**
		 * Clear annotation selection
		 */
		clearAnnotationSelection(): void {
			selectedAnnotationIds = new Set();
		},

		/**
		 * Delete selected annotations
		 */
		deleteSelectedAnnotations(): void {
			if (selectedAnnotationIds.size === 0) return;

			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).filter((a) => !selectedAnnotationIds.has(a.id))
			}));

			selectedAnnotationIds = new Set();
		},

		/**
		 * Move annotation by delta
		 */
		moveAnnotation(annotationId: string, dx: number, dy: number): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) => {
					if (a.id !== annotationId) return a;

					if (a.type === 'stroke') {
						return {
							...a,
							points: a.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
						};
					} else if (a.type === 'shape') {
						return {
							...a,
							start: { x: a.start.x + dx, y: a.start.y + dy },
							end: { x: a.end.x + dx, y: a.end.y + dy }
						};
					} else if (a.type === 'stamp') {
						return {
							...a,
							position: { x: a.position.x + dx, y: a.position.y + dy }
						};
					}
					return a;
				})
			}));
		},

		/**
		 * Move all selected annotations by delta
		 */
		moveSelectedAnnotations(dx: number, dy: number): void {
			if (selectedAnnotationIds.size === 0) return;

			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) => {
					if (!selectedAnnotationIds.has(a.id)) return a;

					if (a.type === 'stroke') {
						return {
							...a,
							points: a.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }))
						};
					} else if (a.type === 'shape') {
						return {
							...a,
							start: { x: a.start.x + dx, y: a.start.y + dy },
							end: { x: a.end.x + dx, y: a.end.y + dy }
						};
					} else if (a.type === 'stamp') {
						return {
							...a,
							position: { x: a.position.x + dx, y: a.position.y + dy }
						};
					}
					return a;
				})
			}));
		},

		/**
		 * Update annotation color
		 */
		updateAnnotationColor(annotationId: string, color: string): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) =>
					a.id === annotationId ? { ...a, color } : a
				)
			}));
		},

		/**
		 * Update color for all selected annotations
		 */
		updateSelectedAnnotationsColor(color: string): void {
			if (selectedAnnotationIds.size === 0) return;

			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) =>
					selectedAnnotationIds.has(a.id) ? { ...a, color } : a
				)
			}));
		},

		/**
		 * Update stroke width for all selected annotations
		 */
		updateSelectedAnnotationsStrokeWidth(strokeWidth: number): void {
			if (selectedAnnotationIds.size === 0) return;

			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) => {
					if (!selectedAnnotationIds.has(a.id)) return a;

					if (a.type === 'stroke') {
						return { ...a, width: strokeWidth };
					} else if (a.type === 'shape') {
						return { ...a, strokeWidth };
					}
					return a;
				})
			}));
		},

		/**
		 * Update opacity for all selected annotations
		 */
		updateSelectedAnnotationsOpacity(opacity: number): void {
			if (selectedAnnotationIds.size === 0) return;

			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) =>
					selectedAnnotationIds.has(a.id) ? { ...a, opacity } : a
				)
			}));
		},

		/**
		 * Resize annotation shape by scaling from original bounding box
		 * Only works for shapes and stamps (not strokes)
		 */
		resizeAnnotation(
			annotationId: string,
			originalBBox: { minX: number; minY: number; maxX: number; maxY: number },
			newBBox: { minX: number; minY: number; maxX: number; maxY: number },
			originalValues?: {
				start?: Point;
				end?: Point;
				position?: Point;
				size?: number;
			}
		): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) => {
					if (a.id !== annotationId) return a;

					if (a.type === 'shape') {
						// Use original values if provided, otherwise use current
						const startX = originalValues?.start?.x ?? a.start.x;
						const startY = originalValues?.start?.y ?? a.start.y;
						const endX = originalValues?.end?.x ?? a.end.x;
						const endY = originalValues?.end?.y ?? a.end.y;

						// Scale shape start/end points relative to original bbox
						const origWidth = originalBBox.maxX - originalBBox.minX;
						const origHeight = originalBBox.maxY - originalBBox.minY;
						const newWidth = newBBox.maxX - newBBox.minX;
						const newHeight = newBBox.maxY - newBBox.minY;

						if (origWidth === 0 || origHeight === 0) return a;

						const scaleX = newWidth / origWidth;
						const scaleY = newHeight / origHeight;

						const newStart = {
							x: newBBox.minX + (startX - originalBBox.minX) * scaleX,
							y: newBBox.minY + (startY - originalBBox.minY) * scaleY
						};
						const newEnd = {
							x: newBBox.minX + (endX - originalBBox.minX) * scaleX,
							y: newBBox.minY + (endY - originalBBox.minY) * scaleY
						};

						return { ...a, start: newStart, end: newEnd };
					} else if (a.type === 'stamp') {
						// Use original size if provided
						const origSize = originalValues?.size ?? a.size;

						// For stamps, scale the size and move the position
						const origWidth = originalBBox.maxX - originalBBox.minX;
						const newWidth = newBBox.maxX - newBBox.minX;

						if (origWidth === 0) return a;

						const scale = newWidth / origWidth;
						const newSize = Math.max(16, Math.min(96, origSize * scale));

						// Center position in new bbox
						const newPosition = {
							x: (newBBox.minX + newBBox.maxX) / 2,
							y: (newBBox.minY + newBBox.maxY) / 2
						};

						return { ...a, size: newSize, position: newPosition };
					}

					return a;
				})
			}));
		},

		/**
		 * Rotate annotation (shapes and stamps only)
		 */
		rotateAnnotation(annotationId: string, rotation: number): void {
			updateCurrentPage((page) => ({
				...page,
				annotations: (page.annotations ?? []).map((a) => {
					if (a.id !== annotationId) return a;

					if (a.type === 'shape' || a.type === 'stamp') {
						// Normalize rotation to 0-360
						const normalizedRotation = ((rotation % 360) + 360) % 360;
						return { ...a, rotation: normalizedRotation };
					}

					return a;
				})
			}));
		},

		// === Element Operations ===

		/**
		 * Add an element to the current page
		 */
		addElement(element: WhiteboardElement): void {
			updateCurrentPage((page) => ({
				...page,
				elements: [...page.elements, element]
			}));
		},

		/**
		 * Remove an element by ID
		 * Clears any bindings from arrows that point to the deleted element
		 */
		removeElement(elementId: string): void {
			updateCurrentPage((page) => {
				// Clear bindings from arrows pointing to the deleted element
				const { updatedArrows, updatedElementIds } = clearBindingsForDeletedShapes(
					[elementId],
					page.elements
				);

				// Build a map for quick lookup of updated arrows
				const updatedArrowMap = new Map(updatedArrows.map((a) => [a.id, a]));

				// Filter out the deleted element and update affected arrows
				const newElements = page.elements
					.filter((e) => e.id !== elementId)
					.map((e) => (updatedElementIds.includes(e.id) ? updatedArrowMap.get(e.id)! : e));

				return { ...page, elements: newElements };
			});
		},

		/**
		 * Update an element by ID
		 */
		updateElement(elementId: string, updater: (el: WhiteboardElement) => WhiteboardElement): void {
			updateCurrentPage((page) => ({
				...page,
				elements: page.elements.map((e) => (e.id === elementId ? updater(e) : e))
			}));
		},

		/**
		 * Clear all elements from current page
		 */
		clearPage(): void {
			updateCurrentPage((page) => ({
				...page,
				elements: []
			}));
		},

		// === Selection Operations ===

		/**
		 * Select an element by ID
		 * @param id - Element ID to select
		 * @param addToSelection - If true, add to existing selection instead of replacing
		 */
		selectElement(id: string, addToSelection: boolean = false): void {
			if (addToSelection) {
				selectedIds = new Set([...selectedIds, id]);
			} else {
				selectedIds = new Set([id]);
			}
		},

		/**
		 * Select multiple elements by IDs (for marquee selection)
		 * @param ids - Array of element IDs to select
		 * @param addToSelection - If true, add to existing selection instead of replacing
		 */
		selectMultipleElements(ids: string[], addToSelection: boolean = false): void {
			if (ids.length === 0) return;
			if (addToSelection) {
				selectedIds = new Set([...selectedIds, ...ids]);
			} else {
				selectedIds = new Set(ids);
			}
		},

		/**
		 * Select all elements on the current page
		 */
		selectAll(): void {
			if (!currentPage || currentPage.elements.length === 0) return;
			selectedIds = new Set(currentPage.elements.map((el) => el.id));
		},

		/**
		 * Clear all selected elements and restore user preferences
		 */
		clearSelection(): void {
			const hadSelection = selectedIds.size > 0;
			selectedIds = new Set();
			// Restore user's preferred settings after deselection
			if (hadSelection) {
				this.restoreUserPreferences();
			}
		},

		/**
		 * Deselect a single element (remove from selection)
		 * Restores user preferences if this was the last selected element
		 * @param id - Element ID to deselect
		 */
		deselectElement(id: string): void {
			if (selectedIds.has(id)) {
				const newIds = new Set(selectedIds);
				newIds.delete(id);
				selectedIds = newIds;
				// Restore preferences if no more selection
				if (newIds.size === 0) {
					this.restoreUserPreferences();
				}
			}
		},

		/**
		 * Delete all selected elements from the current page
		 * Clears any bindings from arrows that point to deleted elements
		 * Supports undo via saveToHistory
		 */
		deleteSelected(): void {
			if (selectedIds.size === 0) return;

			const idsToDelete = new Set(selectedIds);
			updateCurrentPage((page) => {
				// Clear bindings from arrows pointing to deleted elements
				const { updatedArrows, updatedElementIds } = clearBindingsForDeletedShapes(
					Array.from(idsToDelete),
					page.elements
				);

				// Build a map for quick lookup of updated arrows
				const updatedArrowMap = new Map(updatedArrows.map((a) => [a.id, a]));

				// Filter out deleted elements and update affected arrows
				const newElements = page.elements
					.filter((e) => !idsToDelete.has(e.id))
					.map((e) => (updatedElementIds.includes(e.id) ? updatedArrowMap.get(e.id)! : e));

				return { ...page, elements: newElements };
			});

			// Clear selection after deletion
			selectedIds = new Set();
		},

		/**
		 * Copy selected elements to clipboard
		 * Creates deep copies of elements for later pasting
		 */
		copySelected(): void {
			if (selectedIds.size === 0 || !currentPage) return;

			// Deep copy selected elements
			const elementsToCopy = currentPage.elements.filter((el) => selectedIds.has(el.id));
			clipboard = elementsToCopy.map((el) => JSON.parse(JSON.stringify(el)));
		},

		/**
		 * Cut selected elements (copy then delete)
		 */
		cutSelected(): void {
			if (selectedIds.size === 0) return;

			this.copySelected();
			this.deleteSelected();
		},

		/**
		 * Paste elements from clipboard
		 * Creates new elements with new IDs and offset position
		 * @param offset - Offset from original position (default 20px)
		 */
		paste(offset: number = 20): void {
			if (clipboard.length === 0 || !currentPage) return;

			// Helper to offset an element recursively (for groups)
			const offsetElement = (el: WhiteboardElement, off: number): WhiteboardElement => {
				const newId = crypto.randomUUID();

				switch (el.type) {
					case 'stroke':
						return {
							...el,
							id: newId,
							points: el.points.map((p) => ({
								...p,
								x: p.x + off,
								y: p.y + off
							}))
						};
					case 'shape':
						return {
							...el,
							id: newId,
							start: { x: el.start.x + off, y: el.start.y + off },
							end: { x: el.end.x + off, y: el.end.y + off }
						};
					case 'image':
					case 'textblock':
						return {
							...el,
							id: newId,
							position: {
								x: el.position.x + off,
								y: el.position.y + off
							}
						};
					case 'group':
						return {
							...el,
							id: newId,
							children: el.children.map((child) => offsetElement(child, off))
						};
				}
			};

			// Create new elements with new IDs and offset
			const newElements: WhiteboardElement[] = clipboard.map((el) => offsetElement(el, offset));

			// Add all new elements
			updateCurrentPage((page) => ({
				...page,
				elements: [...page.elements, ...newElements]
			}));

			// Select the newly pasted elements
			selectedIds = new Set(newElements.map((el) => el.id));
		},

		// === Group Operations ===

		/**
		 * Group selected elements into a single group element.
		 * Requires 2+ elements selected. Nested groups are flattened.
		 */
		groupSelected(): void {
			if (selectedIds.size < 2 || !currentPage) return;

			// Get elements to group, preserving z-order
			const elementsToGroup: WhiteboardElement[] = [];
			for (const element of currentPage.elements) {
				if (selectedIds.has(element.id)) {
					// Flatten nested groups
					if (element.type === 'group') {
						elementsToGroup.push(...element.children);
					} else {
						elementsToGroup.push(element);
					}
				}
			}

			if (elementsToGroup.length < 2) return;

			const groupId = crypto.randomUUID();
			const group: GroupElement = {
				id: groupId,
				type: 'group',
				children: elementsToGroup
			};

			// Remove individual elements, add group at the position of the last selected element
			updateCurrentPage((page) => ({
				...page,
				elements: [...page.elements.filter((e) => !selectedIds.has(e.id)), group]
			}));

			// Select the new group
			selectedIds = new Set([groupId]);
		},

		/**
		 * Ungroup selected group(s) back to individual elements.
		 */
		ungroupSelected(): void {
			if (!currentPage) return;

			const groupsToUngroup = currentPage.elements.filter(
				(e) => selectedIds.has(e.id) && e.type === 'group'
			) as GroupElement[];

			if (groupsToUngroup.length === 0) return;

			const newElements: WhiteboardElement[] = [];
			const childIds: string[] = [];

			for (const group of groupsToUngroup) {
				newElements.push(...group.children);
				childIds.push(...group.children.map((c) => c.id));
			}

			updateCurrentPage((page) => ({
				...page,
				elements: [
					...page.elements.filter((e) => !(selectedIds.has(e.id) && e.type === 'group')),
					...newElements
				]
			}));

			// Select the ungrouped children
			selectedIds = new Set(childIds);
		},

		/**
		 * Check if any selected element is a group (for context menu)
		 */
		get hasSelectedGroups(): boolean {
			if (!currentPage) return false;
			return currentPage.elements.some((e) => selectedIds.has(e.id) && e.type === 'group');
		},

		/**
		 * Check if selection can be grouped (2+ elements)
		 */
		get canGroup(): boolean {
			return selectedIds.size >= 2;
		},

		/**
		 * Check if selection can be aligned (2+ elements)
		 */
		get canAlign(): boolean {
			return selectedIds.size >= 2;
		},

		/**
		 * Check if selection can be distributed (3+ elements)
		 */
		get canDistribute(): boolean {
			return selectedIds.size >= 3;
		},

		// =========================================================================
		// Alignment Operations
		// =========================================================================

		/**
		 * Align selected elements horizontally.
		 * @param alignment - 'left', 'center', or 'right'
		 */
		alignSelectedHorizontal(alignment: HorizontalAlignment): void {
			if (selectedIds.size < 2 || !currentPage) return;

			const selectedElements = currentPage.elements.filter((el) => selectedIds.has(el.id));
			const result = alignHorizontal(selectedElements, alignment);

			if (result.modifiedIds.length === 0) return;

			// Create a map of updated elements
			const updatedMap = new Map(result.updatedElements.map((el) => [el.id, el]));

			// Apply updates
			const updatedPage: Page = {
				...currentPage,
				elements: currentPage.elements.map((el) => updatedMap.get(el.id) ?? el)
			};

			updateDocument((doc) => ({
				...doc,
				pages: doc.pages.map((p) => (p.id === currentPage.id ? updatedPage : p))
			}));
		},

		/**
		 * Align selected elements vertically.
		 * @param alignment - 'top', 'center', or 'bottom'
		 */
		alignSelectedVertical(alignment: VerticalAlignment): void {
			if (selectedIds.size < 2 || !currentPage) return;

			const selectedElements = currentPage.elements.filter((el) => selectedIds.has(el.id));
			const result = alignVertical(selectedElements, alignment);

			if (result.modifiedIds.length === 0) return;

			// Create a map of updated elements
			const updatedMap = new Map(result.updatedElements.map((el) => [el.id, el]));

			// Apply updates
			const updatedPage: Page = {
				...currentPage,
				elements: currentPage.elements.map((el) => updatedMap.get(el.id) ?? el)
			};

			updateDocument((doc) => ({
				...doc,
				pages: doc.pages.map((p) => (p.id === currentPage.id ? updatedPage : p))
			}));
		},

		/**
		 * Distribute selected elements horizontally with equal spacing.
		 */
		distributeSelectedHorizontal(): void {
			if (selectedIds.size < 3 || !currentPage) return;

			const selectedElements = currentPage.elements.filter((el) => selectedIds.has(el.id));
			const result = distributeHorizontal(selectedElements);

			if (result.modifiedIds.length === 0) return;

			// Create a map of updated elements
			const updatedMap = new Map(result.updatedElements.map((el) => [el.id, el]));

			// Apply updates
			const updatedPage: Page = {
				...currentPage,
				elements: currentPage.elements.map((el) => updatedMap.get(el.id) ?? el)
			};

			updateDocument((doc) => ({
				...doc,
				pages: doc.pages.map((p) => (p.id === currentPage.id ? updatedPage : p))
			}));
		},

		/**
		 * Distribute selected elements vertically with equal spacing.
		 */
		distributeSelectedVertical(): void {
			if (selectedIds.size < 3 || !currentPage) return;

			const selectedElements = currentPage.elements.filter((el) => selectedIds.has(el.id));
			const result = distributeVertical(selectedElements);

			if (result.modifiedIds.length === 0) return;

			// Create a map of updated elements
			const updatedMap = new Map(result.updatedElements.map((el) => [el.id, el]));

			// Apply updates
			const updatedPage: Page = {
				...currentPage,
				elements: currentPage.elements.map((el) => updatedMap.get(el.id) ?? el)
			};

			updateDocument((doc) => ({
				...doc,
				pages: doc.pages.map((p) => (p.id === currentPage.id ? updatedPage : p))
			}));
		},

		/**
		 * Move elements by a delta
		 * Supports all element types: stroke, shape, image, textblock, group
		 * @param elementIdsOrDx - Either element IDs to move, or dx if no IDs specified
		 * @param dxOrDy - dx if elementIds provided, otherwise dy
		 * @param dyOptional - dy if elementIds provided
		 */
		moveElements(elementIdsOrDx: string[] | number, dxOrDy: number, dyOptional?: number): void {
			// Handle overloaded signature
			let idsToMove: Set<string>;
			let dx: number;
			let dy: number;

			if (Array.isArray(elementIdsOrDx)) {
				// Called as moveElements(elementIds, dx, dy)
				idsToMove = new Set(elementIdsOrDx);
				dx = dxOrDy;
				dy = dyOptional ?? 0;
			} else {
				// Called as moveElements(dx, dy) - use selected elements
				idsToMove = selectedIds;
				dx = elementIdsOrDx;
				dy = dxOrDy;
			}

			if (idsToMove.size === 0) return;

			// Helper to move an element recursively (for groups)
			const moveElement = (element: WhiteboardElement): WhiteboardElement => {
				switch (element.type) {
					case 'stroke':
						return {
							...element,
							points: element.points.map((p) => ({
								...p,
								x: p.x + dx,
								y: p.y + dy
							}))
						};
					case 'shape':
						return {
							...element,
							start: { x: element.start.x + dx, y: element.start.y + dy },
							end: { x: element.end.x + dx, y: element.end.y + dy }
						};
					case 'image':
					case 'textblock':
						return {
							...element,
							position: {
								x: element.position.x + dx,
								y: element.position.y + dy
							}
						};
					case 'group':
						return {
							...element,
							children: element.children.map(moveElement)
						};
				}
			};

			updateCurrentPage((page) => {
				// First pass: move the elements
				const movedElements = page.elements.map((element) => {
					if (!idsToMove.has(element.id)) return element;
					return moveElement(element);
				});

				// Second pass: update bound arrows
				// Identify which moved elements are bindable shapes
				const movedShapeIds: string[] = [];
				for (const id of idsToMove) {
					const element = movedElements.find((el) => el.id === id);
					if (
						element?.type === 'shape' &&
						isBindableShape(element as ShapeElement) &&
						!isArrowElement(element)
					) {
						movedShapeIds.push(id);
					}
				}

				// Update arrows bound to the moved shapes
				if (movedShapeIds.length > 0) {
					const { updatedArrows, updatedElementIds } = updateBoundArrowsForShapes(
						movedShapeIds,
						movedElements
					);

					if (updatedArrows.length > 0) {
						const updatedIds = new Set(updatedElementIds);
						return {
							...page,
							elements: movedElements.map((el) => {
								if (!updatedIds.has(el.id)) return el;
								const updated = updatedArrows.find((a) => a.id === el.id);
								return updated ?? el;
							})
						};
					}
				}

				return { ...page, elements: movedElements };
			});
		},

		/**
		 * Resize an element (shapes and images only)
		 * @param elementId - Element to resize
		 * @param handle - Which handle is being dragged ('n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw')
		 * @param dx - Horizontal delta in canvas coordinates
		 * @param dy - Vertical delta in canvas coordinates
		 */
		resizeElement(
			elementId: string,
			handle: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw',
			dx: number,
			dy: number,
			constrainAspectRatio: boolean = false
		): void {
			const MIN_SIZE = 50;

			// Helper functions for explicit handle direction checks
			const affectsLeft = (h: string) => h === 'nw' || h === 'w' || h === 'sw';
			const affectsRight = (h: string) => h === 'ne' || h === 'e' || h === 'se';
			const affectsTop = (h: string) => h === 'nw' || h === 'n' || h === 'ne';
			const affectsBottom = (h: string) => h === 'sw' || h === 's' || h === 'se';
			const isCornerHandle = (h: string) => h === 'nw' || h === 'ne' || h === 'sw' || h === 'se';

			updateCurrentPage((page) => {
				// First pass: resize the element
				const resizedElements = page.elements.map((element) => {
					if (element.id !== elementId) return element;

					if (element.type === 'shape') {
						// Shapes use start/end points. Handles are positioned on the bounding box.
						// We modify the bounding box, then map back to start/end preserving direction.
						const newStart = { ...element.start };
						const newEnd = { ...element.end };

						// Calculate current bounding box from start/end
						const minX = Math.min(newStart.x, newEnd.x);
						const maxX = Math.max(newStart.x, newEnd.x);
						const minY = Math.min(newStart.y, newEnd.y);
						const maxY = Math.max(newStart.y, newEnd.y);

						const currentWidth = maxX - minX;
						const currentHeight = maxY - minY;

						let left = minX,
							right = maxX,
							top = minY,
							bottom = maxY;

						// Adjust deltas to maintain aspect ratio if constrained
						let adjustedDx = dx;
						let adjustedDy = dy;
						if (constrainAspectRatio && currentWidth > 0 && currentHeight > 0) {
							const aspectRatio = currentWidth / currentHeight;
							if (isCornerHandle(handle)) {
								// For corner handles, use the larger delta and adjust the other
								if (Math.abs(dx) * currentHeight >= Math.abs(dy) * currentWidth) {
									// Width change is dominant
									adjustedDy = dx / aspectRatio;
									// Preserve sign based on handle direction
									if (affectsTop(handle) && affectsRight(handle))
										adjustedDy = -Math.abs(adjustedDy);
									if (affectsTop(handle) && affectsLeft(handle))
										adjustedDy = dx > 0 ? Math.abs(adjustedDy) : -Math.abs(adjustedDy);
									if (affectsBottom(handle) && affectsLeft(handle)) adjustedDy = -adjustedDy;
								} else {
									// Height change is dominant
									adjustedDx = dy * aspectRatio;
									// Preserve sign based on handle direction
									if (affectsLeft(handle) && affectsBottom(handle))
										adjustedDx = -Math.abs(adjustedDx);
									if (affectsLeft(handle) && affectsTop(handle))
										adjustedDx = dy > 0 ? Math.abs(adjustedDx) : -Math.abs(adjustedDx);
									if (affectsRight(handle) && affectsTop(handle)) adjustedDx = -adjustedDx;
								}
							} else {
								// Edge handles: adjust the perpendicular dimension proportionally
								if (handle === 'n' || handle === 's') {
									adjustedDx = dy * aspectRatio * (handle === 'n' ? -1 : 1);
								} else {
									adjustedDy = (dx / aspectRatio) * (handle === 'w' ? -1 : 1);
								}
							}
						}

						// Apply deltas to bounding box edges based on handle
						if (affectsLeft(handle)) left += adjustedDx;
						if (affectsRight(handle)) right += adjustedDx;
						if (affectsTop(handle)) top += adjustedDy;
						if (affectsBottom(handle)) bottom += adjustedDy;

						// For edge handles with aspect ratio, also expand in perpendicular direction (centered)
						if (
							constrainAspectRatio &&
							currentWidth > 0 &&
							currentHeight > 0 &&
							!isCornerHandle(handle)
						) {
							if (handle === 'n' || handle === 's') {
								const widthChange = Math.abs(adjustedDx);
								left -= widthChange / 2;
								right += widthChange / 2;
							} else {
								const heightChange = Math.abs(adjustedDy);
								top -= heightChange / 2;
								bottom += heightChange / 2;
							}
						}

						// Enforce minimum size
						if (right - left < MIN_SIZE) {
							if (affectsLeft(handle)) left = right - MIN_SIZE;
							else right = left + MIN_SIZE;
						}
						if (bottom - top < MIN_SIZE) {
							if (affectsTop(handle)) top = bottom - MIN_SIZE;
							else bottom = top + MIN_SIZE;
						}

						// Map bounding box back to start/end, preserving original direction
						// (shapes can be drawn in any direction, handles always align to bbox)
						if (element.start.x <= element.end.x) {
							newStart.x = left;
							newEnd.x = right;
						} else {
							newStart.x = right;
							newEnd.x = left;
						}
						if (element.start.y <= element.end.y) {
							newStart.y = top;
							newEnd.y = bottom;
						} else {
							newStart.y = bottom;
							newEnd.y = top;
						}

						return { ...element, start: newStart, end: newEnd };
					}

					if (element.type === 'stroke') {
						// Strokes use an array of points - we scale all points based on bounding box changes
						const { points } = element;
						if (points.length === 0) return element;

						// Calculate current bounding box
						let minX = points[0].x,
							maxX = points[0].x,
							minY = points[0].y,
							maxY = points[0].y;
						for (const p of points) {
							if (p.x < minX) minX = p.x;
							if (p.x > maxX) maxX = p.x;
							if (p.y < minY) minY = p.y;
							if (p.y > maxY) maxY = p.y;
						}

						const currentWidth = maxX - minX;
						const currentHeight = maxY - minY;

						// Handle degenerate cases (single point or line)
						if (currentWidth < 1 && currentHeight < 1) return element;

						let left = minX,
							right = maxX,
							top = minY,
							bottom = maxY;

						// Adjust deltas to maintain aspect ratio if constrained
						let adjustedDx = dx;
						let adjustedDy = dy;
						if (constrainAspectRatio && currentWidth > 0 && currentHeight > 0) {
							const aspectRatio = currentWidth / currentHeight;
							if (isCornerHandle(handle)) {
								if (Math.abs(dx) * currentHeight >= Math.abs(dy) * currentWidth) {
									adjustedDy = dx / aspectRatio;
									if (affectsTop(handle) && affectsRight(handle))
										adjustedDy = -Math.abs(adjustedDy);
									if (affectsTop(handle) && affectsLeft(handle))
										adjustedDy = dx > 0 ? Math.abs(adjustedDy) : -Math.abs(adjustedDy);
									if (affectsBottom(handle) && affectsLeft(handle)) adjustedDy = -adjustedDy;
								} else {
									adjustedDx = dy * aspectRatio;
									if (affectsLeft(handle) && affectsBottom(handle))
										adjustedDx = -Math.abs(adjustedDx);
									if (affectsLeft(handle) && affectsTop(handle))
										adjustedDx = dy > 0 ? Math.abs(adjustedDx) : -Math.abs(adjustedDx);
									if (affectsRight(handle) && affectsTop(handle)) adjustedDx = -adjustedDx;
								}
							} else {
								if (handle === 'n' || handle === 's') {
									adjustedDx = dy * aspectRatio * (handle === 'n' ? -1 : 1);
								} else {
									adjustedDy = (dx / aspectRatio) * (handle === 'w' ? -1 : 1);
								}
							}
						}

						// Apply deltas to bounding box edges based on handle
						if (affectsLeft(handle)) left += adjustedDx;
						if (affectsRight(handle)) right += adjustedDx;
						if (affectsTop(handle)) top += adjustedDy;
						if (affectsBottom(handle)) bottom += adjustedDy;

						// For edge handles with aspect ratio, also expand in perpendicular direction (centered)
						if (
							constrainAspectRatio &&
							currentWidth > 0 &&
							currentHeight > 0 &&
							!isCornerHandle(handle)
						) {
							if (handle === 'n' || handle === 's') {
								const widthChange = Math.abs(adjustedDx);
								left -= widthChange / 2;
								right += widthChange / 2;
							} else {
								const heightChange = Math.abs(adjustedDy);
								top -= heightChange / 2;
								bottom += heightChange / 2;
							}
						}

						// Enforce minimum size
						const newWidth = right - left;
						const newHeight = bottom - top;
						if (newWidth < MIN_SIZE || newHeight < MIN_SIZE) return element;

						// Calculate scale factors
						const scaleX = currentWidth > 0 ? newWidth / currentWidth : 1;
						const scaleY = currentHeight > 0 ? newHeight / currentHeight : 1;

						// Transform all points
						const newPoints = points.map((p) => ({
							x: left + (p.x - minX) * scaleX,
							y: top + (p.y - minY) * scaleY,
							pressure: p.pressure
						}));

						return { ...element, points: newPoints };
					}

					if (element.type === 'image') {
						// Images use position + width/height (simpler than shapes)
						let { x, y } = element.position;
						let { width, height } = element;
						const aspectRatio = width / height;

						// Adjust deltas to maintain aspect ratio if constrained
						let adjustedDx = dx;
						let adjustedDy = dy;
						if (constrainAspectRatio && width > 0 && height > 0) {
							if (isCornerHandle(handle)) {
								// For corner handles, use the larger delta and adjust the other
								if (Math.abs(dx) * height >= Math.abs(dy) * width) {
									adjustedDy = dx / aspectRatio;
									if (affectsTop(handle) && affectsRight(handle))
										adjustedDy = -Math.abs(adjustedDy);
									if (affectsTop(handle) && affectsLeft(handle))
										adjustedDy = dx > 0 ? Math.abs(adjustedDy) : -Math.abs(adjustedDy);
									if (affectsBottom(handle) && affectsLeft(handle)) adjustedDy = -adjustedDy;
								} else {
									adjustedDx = dy * aspectRatio;
									if (affectsLeft(handle) && affectsBottom(handle))
										adjustedDx = -Math.abs(adjustedDx);
									if (affectsLeft(handle) && affectsTop(handle))
										adjustedDx = dy > 0 ? Math.abs(adjustedDx) : -Math.abs(adjustedDx);
									if (affectsRight(handle) && affectsTop(handle)) adjustedDx = -adjustedDx;
								}
							} else {
								// Edge handles: adjust the perpendicular dimension proportionally
								if (handle === 'n' || handle === 's') {
									adjustedDx = dy * aspectRatio * (handle === 'n' ? -1 : 1);
								} else {
									adjustedDy = (dx / aspectRatio) * (handle === 'w' ? -1 : 1);
								}
							}
						}

						// Left handle: move x and shrink width
						if (affectsLeft(handle)) {
							const newWidth = width - adjustedDx;
							if (newWidth >= MIN_SIZE) {
								x += adjustedDx;
								width = newWidth;
							}
						}
						// Right handle: grow width
						if (affectsRight(handle)) {
							width = Math.max(MIN_SIZE, width + adjustedDx);
						}
						// Top handle: move y and shrink height
						if (affectsTop(handle)) {
							const newHeight = height - adjustedDy;
							if (newHeight >= MIN_SIZE) {
								y += adjustedDy;
								height = newHeight;
							}
						}
						// Bottom handle: grow height
						if (affectsBottom(handle)) {
							height = Math.max(MIN_SIZE, height + adjustedDy);
						}

						// For edge handles with aspect ratio, also expand in perpendicular direction (centered)
						if (constrainAspectRatio && !isCornerHandle(handle)) {
							if (handle === 'n' || handle === 's') {
								const widthChange = Math.abs(adjustedDx);
								x -= widthChange / 2;
								width += widthChange;
							} else {
								const heightChange = Math.abs(adjustedDy);
								y -= heightChange / 2;
								height += heightChange;
							}
						}

						return {
							...element,
							position: { x, y },
							width,
							height
						};
					}

					if (element.type === 'group') {
						// Groups: scale all children proportionally
						const bounds = getElementBounds(element);
						const currentWidth = bounds.width;
						const currentHeight = bounds.height;

						if (currentWidth < 1 || currentHeight < 1) return element;

						let left = bounds.x,
							right = bounds.x + bounds.width,
							top = bounds.y,
							bottom = bounds.y + bounds.height;

						// Adjust deltas to maintain aspect ratio if constrained (always for groups)
						let adjustedDx = dx;
						let adjustedDy = dy;
						const aspectRatio = currentWidth / currentHeight;

						// Always maintain aspect ratio for groups
						if (isCornerHandle(handle)) {
							if (Math.abs(dx) * currentHeight >= Math.abs(dy) * currentWidth) {
								adjustedDy = dx / aspectRatio;
								if (affectsTop(handle) && affectsRight(handle)) adjustedDy = -Math.abs(adjustedDy);
								if (affectsTop(handle) && affectsLeft(handle))
									adjustedDy = dx > 0 ? Math.abs(adjustedDy) : -Math.abs(adjustedDy);
								if (affectsBottom(handle) && affectsLeft(handle)) adjustedDy = -adjustedDy;
							} else {
								adjustedDx = dy * aspectRatio;
								if (affectsLeft(handle) && affectsBottom(handle))
									adjustedDx = -Math.abs(adjustedDx);
								if (affectsLeft(handle) && affectsTop(handle))
									adjustedDx = dy > 0 ? Math.abs(adjustedDx) : -Math.abs(adjustedDx);
								if (affectsRight(handle) && affectsTop(handle)) adjustedDx = -adjustedDx;
							}
						} else {
							if (handle === 'n' || handle === 's') {
								adjustedDx = dy * aspectRatio * (handle === 'n' ? -1 : 1);
							} else {
								adjustedDy = (dx / aspectRatio) * (handle === 'w' ? -1 : 1);
							}
						}

						// Apply deltas to bounding box edges based on handle
						if (affectsLeft(handle)) left += adjustedDx;
						if (affectsRight(handle)) right += adjustedDx;
						if (affectsTop(handle)) top += adjustedDy;
						if (affectsBottom(handle)) bottom += adjustedDy;

						// For edge handles, also expand in perpendicular direction (centered)
						if (!isCornerHandle(handle)) {
							if (handle === 'n' || handle === 's') {
								const widthChange = Math.abs(adjustedDx);
								left -= widthChange / 2;
								right += widthChange / 2;
							} else {
								const heightChange = Math.abs(adjustedDy);
								top -= heightChange / 2;
								bottom += heightChange / 2;
							}
						}

						// Enforce minimum size
						const newWidth = right - left;
						const newHeight = bottom - top;
						if (newWidth < MIN_SIZE || newHeight < MIN_SIZE) return element;

						// Calculate scale factors
						const scaleX = newWidth / currentWidth;
						const scaleY = newHeight / currentHeight;

						// Helper to scale a single element
						const scaleElement = (el: WhiteboardElement): WhiteboardElement => {
							switch (el.type) {
								case 'stroke':
									return {
										...el,
										points: el.points.map((p) => ({
											x: left + (p.x - bounds.x) * scaleX,
											y: top + (p.y - bounds.y) * scaleY,
											pressure: p.pressure
										})),
										width: el.width * Math.min(scaleX, scaleY)
									};
								case 'shape':
									return {
										...el,
										start: {
											x: left + (el.start.x - bounds.x) * scaleX,
											y: top + (el.start.y - bounds.y) * scaleY
										},
										end: {
											x: left + (el.end.x - bounds.x) * scaleX,
											y: top + (el.end.y - bounds.y) * scaleY
										},
										strokeWidth: el.strokeWidth * Math.min(scaleX, scaleY)
									};
								case 'image':
								case 'textblock':
									return {
										...el,
										position: {
											x: left + (el.position.x - bounds.x) * scaleX,
											y: top + (el.position.y - bounds.y) * scaleY
										},
										width: el.width * scaleX,
										height: el.height * scaleY
									};
								case 'group':
									return {
										...el,
										children: el.children.map(scaleElement)
									};
							}
						};

						return {
							...element,
							children: element.children.map(scaleElement)
						};
					}

					return element;
				});

				// Second pass: update bound arrows if this is a bindable shape
				const element = resizedElements.find((el) => el.id === elementId);
				if (
					element?.type === 'shape' &&
					isBindableShape(element as ShapeElement) &&
					!isArrowElement(element)
				) {
					const { updatedArrows, updatedElementIds } = updateBoundArrowsForShapes(
						[elementId],
						resizedElements
					);

					if (updatedArrows.length > 0) {
						const updatedIds = new Set(updatedElementIds);
						return {
							...page,
							elements: resizedElements.map((el) => {
								if (!updatedIds.has(el.id)) return el;
								const updated = updatedArrows.find((a) => a.id === el.id);
								return updated ?? el;
							})
						};
					}
				}

				return { ...page, elements: resizedElements };
			});
		},

		/**
		 * Rotate an element to a specific angle (in degrees)
		 * @param elementId - Element to rotate
		 * @param rotation - New rotation angle in degrees (0-360)
		 */
		rotateElement(elementId: string, rotation: number): void {
			// Normalize angle to 0-360
			let normalizedRotation = rotation % 360;
			if (normalizedRotation < 0) normalizedRotation += 360;

			updateCurrentPage((page) => {
				// First pass: rotate the element
				const rotatedElements = page.elements.map((element) => {
					if (element.id !== elementId) return element;

					// Shapes, strokes, and groups support rotation
					if (element.type === 'shape' || element.type === 'stroke' || element.type === 'group') {
						return { ...element, rotation: normalizedRotation };
					}

					return element;
				});

				// Second pass: update bound arrows if this is a bindable shape
				const element = rotatedElements.find((el) => el.id === elementId);
				if (
					element?.type === 'shape' &&
					isBindableShape(element as ShapeElement) &&
					!isArrowElement(element)
				) {
					const { updatedArrows, updatedElementIds } = updateBoundArrowsForShapes(
						[elementId],
						rotatedElements
					);

					if (updatedArrows.length > 0) {
						const updatedIds = new Set(updatedElementIds);
						return {
							...page,
							elements: rotatedElements.map((el) => {
								if (!updatedIds.has(el.id)) return el;
								const updated = updatedArrows.find((a) => a.id === el.id);
								return updated ?? el;
							})
						};
					}
				}

				return { ...page, elements: rotatedElements };
			});
		},

		/**
		 * Rotate all selected elements by a delta angle
		 * @param deltaAngle - Angle to add to current rotation (in degrees)
		 */
		rotateSelected(deltaAngle: number): void {
			if (selectedIds.size === 0) return;

			updateCurrentPage((page) => {
				// First pass: rotate the selected elements
				const rotatedElements = page.elements.map((element) => {
					if (!selectedIds.has(element.id)) return element;

					// Shapes, strokes, and groups support rotation
					if (element.type === 'shape' || element.type === 'stroke' || element.type === 'group') {
						const currentRotation = element.rotation ?? 0;
						let newRotation = (currentRotation + deltaAngle) % 360;
						if (newRotation < 0) newRotation += 360;
						return { ...element, rotation: newRotation };
					}

					return element;
				});

				// Second pass: update bound arrows for rotated bindable shapes
				const rotatedShapeIds: string[] = [];
				for (const id of selectedIds) {
					const element = rotatedElements.find((el) => el.id === id);
					if (
						element?.type === 'shape' &&
						isBindableShape(element as ShapeElement) &&
						!isArrowElement(element)
					) {
						rotatedShapeIds.push(id);
					}
				}

				if (rotatedShapeIds.length > 0) {
					const { updatedArrows, updatedElementIds } = updateBoundArrowsForShapes(
						rotatedShapeIds,
						rotatedElements
					);

					if (updatedArrows.length > 0) {
						const updatedIds = new Set(updatedElementIds);
						return {
							...page,
							elements: rotatedElements.map((el) => {
								if (!updatedIds.has(el.id)) return el;
								const updated = updatedArrows.find((a) => a.id === el.id);
								return updated ?? el;
							})
						};
					}
				}

				return { ...page, elements: rotatedElements };
			});
		},

		/**
		 * Set a live (preview) rotation for an element during drag.
		 * This doesn't update the actual element - use commitLiveRotation to apply.
		 * @param elementId - Element to set live rotation for
		 * @param rotation - Preview rotation angle in degrees
		 */
		setLiveRotation(elementId: string, rotation: number): void {
			// Normalize angle to 0-360
			let normalizedRotation = rotation % 360;
			if (normalizedRotation < 0) normalizedRotation += 360;

			// Create a new Map to trigger reactivity
			const newMap = new Map(liveRotations);
			newMap.set(elementId, normalizedRotation);
			liveRotations = newMap;

			// Recalculate elbow arrows bound to this shape
			this.recalculateLiveElbowArrowsForRotation(elementId, normalizedRotation);
		},

		/**
		 * Get the live rotation for an element (if any).
		 * @param elementId - Element to get live rotation for
		 * @returns Live rotation or undefined if none
		 */
		getLiveRotation(elementId: string): number | undefined {
			return liveRotations.get(elementId);
		},

		/**
		 * Commit the live rotation to the actual element and clear live state.
		 * @param elementId - Element to commit rotation for
		 */
		commitLiveRotation(elementId: string): void {
			const liveRotation = liveRotations.get(elementId);
			if (liveRotation === undefined) return;

			// Apply the rotation to the actual element
			this.rotateElement(elementId, liveRotation);

			// Clear the live rotation
			const newMap = new Map(liveRotations);
			newMap.delete(elementId);
			liveRotations = newMap;

			// Clear live elbow points (arrows are updated by rotateElement)
			this.clearAllLiveElbowPoints();
		},

		/**
		 * Clear live rotation without committing (e.g., on cancel).
		 * @param elementId - Element to clear live rotation for
		 */
		clearLiveRotation(elementId: string): void {
			if (!liveRotations.has(elementId)) return;

			const newMap = new Map(liveRotations);
			newMap.delete(elementId);
			liveRotations = newMap;

			// Clear live elbow points
			this.clearAllLiveElbowPoints();
		},

		/**
		 * Check if an element has a live rotation.
		 * @param elementId - Element to check
		 */
		hasLiveRotation(elementId: string): boolean {
			return liveRotations.has(elementId);
		},

		// === Live Resize Methods ===

		/**
		 * Set a live (preview) resize for an element during drag.
		 * This doesn't update the actual element - use commitLiveResize to apply.
		 * @param elementId - Element to set live resize for
		 * @param scaleX - Horizontal scale factor
		 * @param scaleY - Vertical scale factor
		 * @param originX - Transform origin X (fixed point during resize)
		 * @param originY - Transform origin Y (fixed point during resize)
		 */
		setLiveResize(
			elementId: string,
			scaleX: number,
			scaleY: number,
			originX: number,
			originY: number
		): void {
			const newMap = new Map(liveResizes);
			newMap.set(elementId, { scaleX, scaleY, originX, originY });
			liveResizes = newMap;

			// Recalculate elbow arrows bound to this shape
			this.recalculateLiveElbowArrowsForResize(elementId, scaleX, scaleY, originX, originY);
		},

		/**
		 * Get the live resize for an element (if any).
		 * @param elementId - Element to get live resize for
		 */
		getLiveResize(
			elementId: string
		): { scaleX: number; scaleY: number; originX: number; originY: number } | undefined {
			return liveResizes.get(elementId);
		},

		/**
		 * Commit the live resize to the actual element and clear live state.
		 * @param elementId - Element to commit resize for
		 * @param handle - The resize handle used
		 * @param totalDx - Total horizontal delta from start
		 * @param totalDy - Total vertical delta from start
		 * @param constrainAspectRatio - Whether to maintain aspect ratio
		 */
		commitLiveResize(
			elementId: string,
			handle: string,
			totalDx: number,
			totalDy: number,
			constrainAspectRatio: boolean
		): void {
			if (!liveResizes.has(elementId)) return;

			// Apply the resize to the actual element
			this.resizeElement(
				elementId,
				handle as Parameters<typeof this.resizeElement>[1],
				totalDx,
				totalDy,
				constrainAspectRatio
			);

			// Clear the live resize
			const newMap = new Map(liveResizes);
			newMap.delete(elementId);
			liveResizes = newMap;

			// Clear live elbow points (arrows are updated by resizeElement)
			this.clearAllLiveElbowPoints();
		},

		/**
		 * Clear live resize without committing (e.g., on cancel).
		 * @param elementId - Element to clear live resize for
		 */
		clearLiveResize(elementId: string): void {
			if (!liveResizes.has(elementId)) return;

			const newMap = new Map(liveResizes);
			newMap.delete(elementId);
			liveResizes = newMap;

			// Clear live elbow points
			this.clearAllLiveElbowPoints();
		},

		// === Live Position Methods ===

		/**
		 * Set a live (preview) position offset for an element during drag.
		 * This doesn't update the actual element - use commitLivePosition to apply.
		 * @param elementId - Element to set live position for
		 * @param dx - Horizontal offset from original position
		 * @param dy - Vertical offset from original position
		 */
		setLivePosition(elementId: string, dx: number, dy: number): void {
			const newMap = new Map(livePositions);
			newMap.set(elementId, { dx, dy });
			livePositions = newMap;
		},

		/**
		 * Set live position for multiple elements at once (for group dragging).
		 * Also recalculates elbow arrows bound to moved shapes in real-time.
		 * Applies snapping if enabled.
		 * @param elementIds - Elements to set live position for
		 * @param dx - Horizontal offset from original position
		 * @param dy - Vertical offset from original position
		 * @param zoom - Current zoom level (for snap threshold adjustment)
		 * @param disableSnap - If true, disable snapping for this call (snapping is opt-in via Alt key)
		 */
		setLivePositionBatch(
			elementIds: string[],
			dx: number,
			dy: number,
			zoom: number = 1,
			disableSnap: boolean = false
		): void {
			let finalDx = dx;
			let finalDy = dy;

			// Apply snapping if enabled and not disabled for this call
			if (snappingEnabled && !disableSnap && currentPage && elementIds.length > 0) {
				const selectedSet = new Set(elementIds);
				const snapResult = calculateSnapForTranslate(
					selectedSet,
					currentPage.elements,
					{ x: dx, y: dy },
					zoom
				);

				finalDx = dx + snapResult.nudge.x;
				finalDy = dy + snapResult.nudge.y;
				snapIndicators = snapResult.indicators;
			} else {
				// Clear snap indicators if snapping is disabled
				snapIndicators = [];
			}

			// Clamp dx/dy to keep elements within page bounds
			if (currentPage && elementIds.length > 0) {
				// Calculate combined bounding box of all selected elements
				let minX = Infinity,
					minY = Infinity,
					maxX = -Infinity,
					maxY = -Infinity;

				for (const id of elementIds) {
					const element = currentPage.elements.find((e) => e.id === id);
					if (element) {
						const bounds = getElementBounds(element);
						minX = Math.min(minX, bounds.x);
						minY = Math.min(minY, bounds.y);
						maxX = Math.max(maxX, bounds.x + bounds.width);
						maxY = Math.max(maxY, bounds.y + bounds.height);
					}
				}

				if (minX !== Infinity) {
					const pageW = currentPage.width;
					const pageH = currentPage.height;

					// Calculate how far we can move in each direction
					const maxDxRight = pageW - maxX;
					const maxDxLeft = -minX;
					const maxDyBottom = pageH - maxY;
					const maxDyTop = -minY;

					// Clamp dx/dy
					finalDx = Math.max(maxDxLeft, Math.min(maxDxRight, finalDx));
					finalDy = Math.max(maxDyTop, Math.min(maxDyBottom, finalDy));
				}
			}

			const newMap = new Map(livePositions);
			for (const id of elementIds) {
				newMap.set(id, { dx: finalDx, dy: finalDy });
			}
			livePositions = newMap;

			// Identify bindable shapes among the moved elements and recalculate elbow arrows
			if (currentPage) {
				const movedShapeIds: string[] = [];
				for (const id of elementIds) {
					const element = currentPage.elements.find((e) => e.id === id);
					if (
						element?.type === 'shape' &&
						isBindableShape(element as ShapeElement) &&
						!isArrowElement(element)
					) {
						movedShapeIds.push(id);
					}
				}

				if (movedShapeIds.length > 0) {
					this.recalculateLiveElbowArrows(movedShapeIds, finalDx, finalDy);
				}
			}
		},

		/**
		 * Commit the live position to the actual element and clear live state.
		 * @param elementId - Element to commit position for
		 */
		commitLivePosition(elementId: string): void {
			const livePos = livePositions.get(elementId);
			if (!livePos) return;

			// Find the element and update its position
			const element = currentPage?.elements.find((e) => e.id === elementId);
			if (!element) return;

			// Move the element by the offset
			this.moveElements([elementId], livePos.dx, livePos.dy);

			// Clear the live position
			const newMap = new Map(livePositions);
			newMap.delete(elementId);
			livePositions = newMap;
		},

		/**
		 * Commit live positions for multiple elements and clear live state.
		 * Also clears live elbow points used during the drag.
		 * @param elementIds - Elements to commit positions for
		 */
		commitLivePositionBatch(elementIds: string[]): void {
			// Get the offset from the first element (all should have the same offset)
			const firstPos = livePositions.get(elementIds[0]);
			if (!firstPos) return;

			// Move all elements by the offset
			this.moveElements(elementIds, firstPos.dx, firstPos.dy);

			// Clear all live positions
			const newMap = new Map(livePositions);
			for (const id of elementIds) {
				newMap.delete(id);
			}
			livePositions = newMap;

			// Clear live elbow points (the actual arrows are now updated by moveElements)
			this.clearAllLiveElbowPoints();
		},

		/**
		 * Clear live position without committing (e.g., on cancel).
		 * @param elementId - Element to clear live position for
		 */
		clearLivePosition(elementId: string): void {
			if (!livePositions.has(elementId)) return;

			const newMap = new Map(livePositions);
			newMap.delete(elementId);
			livePositions = newMap;
		},

		/**
		 * Clear all live positions (e.g., after commit or cancel).
		 * Also clears live elbow points and snap indicators.
		 */
		clearAllLivePositions(): void {
			if (livePositions.size === 0 && liveElbowPoints.size === 0 && snapIndicators.length === 0)
				return;
			livePositions = new Map();
			snapIndicators = [];
			this.clearAllLiveElbowPoints();
		},

		// === Live Elbow Points Methods (for elbow arrows during drag) ===

		/**
		 * Set live elbow points for an arrow during drag.
		 * @param arrowId - Arrow element ID
		 * @param points - Calculated elbow points
		 */
		setLiveElbowPoints(arrowId: string, points: readonly Point[]): void {
			const newMap = new Map(liveElbowPoints);
			newMap.set(arrowId, points);
			liveElbowPoints = newMap;
		},

		/**
		 * Clear live elbow points for an arrow (e.g., on commit or cancel).
		 * @param arrowId - Arrow element ID
		 */
		clearLiveElbowPoints(arrowId: string): void {
			if (!liveElbowPoints.has(arrowId)) return;
			const newMap = new Map(liveElbowPoints);
			newMap.delete(arrowId);
			liveElbowPoints = newMap;
		},

		/**
		 * Clear all live elbow points (e.g., after commit).
		 */
		clearAllLiveElbowPoints(): void {
			if (liveElbowPoints.size === 0) return;
			liveElbowPoints = new Map();
		},

		// === Snapping Methods ===

		/**
		 * Enable or disable snapping.
		 */
		setSnappingEnabled(enabled: boolean): void {
			snappingEnabled = enabled;
			if (!enabled) {
				snapIndicators = [];
			}
		},

		/**
		 * Toggle snapping on/off.
		 */
		toggleSnapping(): void {
			this.setSnappingEnabled(!snappingEnabled);
		},

		/**
		 * Clear snap indicators (e.g., when drag ends).
		 */
		clearSnapIndicators(): void {
			if (snapIndicators.length === 0) return;
			snapIndicators = [];
		},

		/**
		 * Recalculate elbow arrow paths for arrows bound to shapes being dragged.
		 * Stores the calculated points in liveElbowPoints for rendering.
		 * @param movedShapeIds - IDs of shapes being moved
		 * @param dx - Horizontal offset from original position
		 * @param dy - Vertical offset from original position
		 */
		recalculateLiveElbowArrows(movedShapeIds: string[], dx: number, dy: number): void {
			if (!currentPage || movedShapeIds.length === 0) return;

			const elements = currentPage.elements;
			const movedIdSet = new Set(movedShapeIds);

			// Build a map of all shapes for quick lookup
			const shapeMap = new Map<string, ShapeElement>();
			for (const element of elements) {
				if (element.type === 'shape') {
					shapeMap.set(element.id, element as ShapeElement);
				}
			}

			// Find all elbow arrows bound to the moved shapes
			const newElbowPoints = new Map<string, readonly Point[]>(liveElbowPoints);

			for (const element of elements) {
				if (element.type !== 'shape') continue;

				const shape = element as ShapeElement;
				if (shape.shapeType !== 'arrow') continue;

				const arrow = shape as ArrowElement;
				const effectiveArrowType = arrow.arrowType ?? (arrow.elbowed ? 'elbow' : 'sharp');
				if (effectiveArrowType !== 'elbow') continue;

				// Check if this arrow is bound to any moved shape
				const startBoundToMoved =
					arrow.startBinding && movedIdSet.has(arrow.startBinding.elementId);
				const endBoundToMoved = arrow.endBinding && movedIdSet.has(arrow.endBinding.elementId);

				if (!startBoundToMoved && !endBoundToMoved) continue;

				// Calculate new start/end positions accounting for drag offset
				let newStart = arrow.start;
				let newEnd = arrow.end;

				// Create adjusted shape copies for routing
				let startShape: ShapeElement | null = null;
				let endShape: ShapeElement | null = null;

				if (arrow.startBinding) {
					const boundShape = shapeMap.get(arrow.startBinding.elementId);
					if (boundShape) {
						// If this shape is being moved, apply offset
						if (movedIdSet.has(arrow.startBinding.elementId)) {
							startShape = {
								...boundShape,
								start: { x: boundShape.start.x + dx, y: boundShape.start.y + dy },
								end: { x: boundShape.end.x + dx, y: boundShape.end.y + dy }
							};
							newStart = { x: arrow.start.x + dx, y: arrow.start.y + dy };
						} else {
							startShape = boundShape;
						}
					}
				}

				if (arrow.endBinding) {
					const boundShape = shapeMap.get(arrow.endBinding.elementId);
					if (boundShape) {
						// If this shape is being moved, apply offset
						if (movedIdSet.has(arrow.endBinding.elementId)) {
							endShape = {
								...boundShape,
								start: { x: boundShape.start.x + dx, y: boundShape.start.y + dy },
								end: { x: boundShape.end.x + dx, y: boundShape.end.y + dy }
							};
							newEnd = { x: arrow.end.x + dx, y: arrow.end.y + dy };
						} else {
							endShape = boundShape;
						}
					}
				}

				// Calculate headings using search cones
				let startHeading: Heading = arrow.startHeading ?? headingFromPoints(newStart, newEnd);
				let endHeading: Heading = arrow.endHeading ?? headingFromPoints(newEnd, newStart);

				if (startShape) {
					startHeading = getHeadingForBindingPoint(startShape, newStart);
				}
				if (endShape) {
					endHeading = flipHeading(getHeadingForBindingPoint(endShape, newEnd));
				}

				// Route the elbow arrow
				const routeResult = routeElbowArrow(
					newStart,
					newEnd,
					startHeading,
					endHeading,
					startShape,
					endShape
				);

				newElbowPoints.set(arrow.id, routeResult.points);
			}

			liveElbowPoints = newElbowPoints;
		},

		/**
		 * Recalculate live elbow arrow paths when a shape is being resized.
		 * Similar to recalculateLiveElbowArrows but handles scale transforms.
		 * @param elementId - The shape being resized
		 * @param scaleX - Horizontal scale factor
		 * @param scaleY - Vertical scale factor
		 * @param originX - Transform origin X
		 * @param originY - Transform origin Y
		 */
		recalculateLiveElbowArrowsForResize(
			elementId: string,
			scaleX: number,
			scaleY: number,
			originX: number,
			originY: number
		): void {
			if (!currentPage) return;

			const elements = currentPage.elements;

			// Find the shape being resized
			const resizedElement = elements.find((e) => e.id === elementId);
			if (!resizedElement || resizedElement.type !== 'shape') return;
			if (!isBindableShape(resizedElement as ShapeElement)) return;

			const originalShape = resizedElement as ShapeElement;

			// Create a scaled version of the shape
			const scalePoint = (p: Point): Point => ({
				x: originX + (p.x - originX) * scaleX,
				y: originY + (p.y - originY) * scaleY
			});

			const scaledShape: ShapeElement = {
				...originalShape,
				start: scalePoint(originalShape.start),
				end: scalePoint(originalShape.end)
			};

			// Build a map of all shapes for quick lookup
			const shapeMap = new Map<string, ShapeElement>();
			for (const element of elements) {
				if (element.type === 'shape') {
					shapeMap.set(element.id, element as ShapeElement);
				}
			}

			// Find all elbow arrows bound to the resized shape
			const newElbowPoints = new Map<string, readonly Point[]>(liveElbowPoints);

			for (const element of elements) {
				if (element.type !== 'shape') continue;

				const shape = element as ShapeElement;
				if (shape.shapeType !== 'arrow') continue;

				const arrow = shape as ArrowElement;
				const effectiveArrowType = arrow.arrowType ?? (arrow.elbowed ? 'elbow' : 'sharp');
				if (effectiveArrowType !== 'elbow') continue;

				// Check if this arrow is bound to the resized shape
				const startBoundToResized = arrow.startBinding?.elementId === elementId;
				const endBoundToResized = arrow.endBinding?.elementId === elementId;

				if (!startBoundToResized && !endBoundToResized) continue;

				// Calculate new start/end positions
				let newStart = arrow.start;
				let newEnd = arrow.end;
				let startShape: ShapeElement | null = null;
				let endShape: ShapeElement | null = null;

				if (arrow.startBinding) {
					if (startBoundToResized) {
						startShape = scaledShape;
						// Recalculate binding position on the scaled shape
						newStart = calculateBoundEndpoint(arrow.startBinding, scaledShape, arrow.end);
					} else {
						const boundShape = shapeMap.get(arrow.startBinding.elementId);
						if (boundShape) startShape = boundShape;
					}
				}

				if (arrow.endBinding) {
					if (endBoundToResized) {
						endShape = scaledShape;
						// Recalculate binding position on the scaled shape
						newEnd = calculateBoundEndpoint(arrow.endBinding, scaledShape, arrow.start);
					} else {
						const boundShape = shapeMap.get(arrow.endBinding.elementId);
						if (boundShape) endShape = boundShape;
					}
				}

				// Calculate headings
				let startHeading: Heading = arrow.startHeading ?? headingFromPoints(newStart, newEnd);
				let endHeading: Heading = arrow.endHeading ?? headingFromPoints(newEnd, newStart);

				if (startShape) {
					startHeading = getHeadingForBindingPoint(startShape, newStart);
				}
				if (endShape) {
					endHeading = flipHeading(getHeadingForBindingPoint(endShape, newEnd));
				}

				// Route the elbow arrow
				const routeResult = routeElbowArrow(
					newStart,
					newEnd,
					startHeading,
					endHeading,
					startShape,
					endShape
				);

				newElbowPoints.set(arrow.id, routeResult.points);
			}

			liveElbowPoints = newElbowPoints;
		},

		/**
		 * Recalculate live elbow arrow paths when a shape is being rotated.
		 * @param elementId - The shape being rotated
		 * @param rotation - New rotation angle in degrees
		 */
		recalculateLiveElbowArrowsForRotation(elementId: string, rotation: number): void {
			if (!currentPage) return;

			const elements = currentPage.elements;

			// Find the shape being rotated
			const rotatedElement = elements.find((e) => e.id === elementId);
			if (!rotatedElement || rotatedElement.type !== 'shape') return;
			if (!isBindableShape(rotatedElement as ShapeElement)) return;

			const originalShape = rotatedElement as ShapeElement;

			// Create a rotated version of the shape
			const rotatedShape: ShapeElement = {
				...originalShape,
				rotation
			};

			// Build a map of all shapes for quick lookup
			const shapeMap = new Map<string, ShapeElement>();
			for (const element of elements) {
				if (element.type === 'shape') {
					shapeMap.set(element.id, element as ShapeElement);
				}
			}

			// Find all elbow arrows bound to the rotated shape
			const newElbowPoints = new Map<string, readonly Point[]>(liveElbowPoints);

			for (const element of elements) {
				if (element.type !== 'shape') continue;

				const shape = element as ShapeElement;
				if (shape.shapeType !== 'arrow') continue;

				const arrow = shape as ArrowElement;
				const effectiveArrowType = arrow.arrowType ?? (arrow.elbowed ? 'elbow' : 'sharp');
				if (effectiveArrowType !== 'elbow') continue;

				// Check if this arrow is bound to the rotated shape
				const startBoundToRotated = arrow.startBinding?.elementId === elementId;
				const endBoundToRotated = arrow.endBinding?.elementId === elementId;

				if (!startBoundToRotated && !endBoundToRotated) continue;

				// Calculate new start/end positions
				let newStart = arrow.start;
				let newEnd = arrow.end;
				let startShape: ShapeElement | null = null;
				let endShape: ShapeElement | null = null;

				if (arrow.startBinding) {
					if (startBoundToRotated) {
						startShape = rotatedShape;
						// Recalculate binding position on the rotated shape
						newStart = calculateBoundEndpoint(arrow.startBinding, rotatedShape, arrow.end);
					} else {
						const boundShape = shapeMap.get(arrow.startBinding.elementId);
						if (boundShape) startShape = boundShape;
					}
				}

				if (arrow.endBinding) {
					if (endBoundToRotated) {
						endShape = rotatedShape;
						// Recalculate binding position on the rotated shape
						newEnd = calculateBoundEndpoint(arrow.endBinding, rotatedShape, arrow.start);
					} else {
						const boundShape = shapeMap.get(arrow.endBinding.elementId);
						if (boundShape) endShape = boundShape;
					}
				}

				// Calculate headings
				let startHeading: Heading = arrow.startHeading ?? headingFromPoints(newStart, newEnd);
				let endHeading: Heading = arrow.endHeading ?? headingFromPoints(newEnd, newStart);

				if (startShape) {
					startHeading = getHeadingForBindingPoint(startShape, newStart);
				}
				if (endShape) {
					endHeading = flipHeading(getHeadingForBindingPoint(endShape, newEnd));
				}

				// Route the elbow arrow
				const routeResult = routeElbowArrow(
					newStart,
					newEnd,
					startHeading,
					endHeading,
					startShape,
					endShape
				);

				newElbowPoints.set(arrow.id, routeResult.points);
			}

			liveElbowPoints = newElbowPoints;
		},

		// === Live Endpoint Methods (for lines/arrows) ===

		/**
		 * Set a live (preview) endpoint position for a line/arrow during drag.
		 * This doesn't update the actual element - use commitLiveEndpoint to apply.
		 * @param elementId - Element to set live endpoint for
		 * @param endpoint - Which endpoint ('start' or 'end')
		 * @param x - New X coordinate
		 * @param y - New Y coordinate
		 */
		setLiveEndpoint(elementId: string, endpoint: 'start' | 'end', x: number, y: number): void {
			if (!currentPage) return;

			// Find the element to get its other endpoint for binding calculation
			const element = currentPage.elements.find((e) => e.id === elementId);
			if (!element || element.type !== 'shape') return;

			const shape = element as ShapeElement;
			if (shape.shapeType !== 'line' && shape.shapeType !== 'arrow') return;

			// Check for binding candidate at this position
			const excludeIds = new Set([elementId]);
			const candidate = findBindingCandidate({ x, y }, currentPage.elements, excludeIds);

			// Calculate snapped position if there's a binding candidate
			let snappedX = x;
			let snappedY = y;
			if (candidate) {
				const otherEndpoint = endpoint === 'start' ? shape.end : shape.start;
				const binding = createBindingAnchor(candidate.element, { x, y }, otherEndpoint);
				const snappedPos = calculateBoundEndpoint(binding, candidate.element, otherEndpoint);
				snappedX = snappedPos.x;
				snappedY = snappedPos.y;
			}

			// Store the snapped position
			const newMap = new Map(liveEndpoints);
			newMap.set(elementId, { endpoint, x: snappedX, y: snappedY });
			liveEndpoints = newMap;

			// Recalculate elbow arrow if this is an elbow arrow (uses snapped position)
			this.recalculateLiveElbowArrowForEndpoint(elementId, endpoint, snappedX, snappedY);
		},

		/**
		 * Recalculate live elbow arrow path when an endpoint is being dragged.
		 * @param elementId - The arrow element ID
		 * @param endpoint - Which endpoint is being dragged ('start' or 'end')
		 * @param x - New X coordinate
		 * @param y - New Y coordinate
		 */
		recalculateLiveElbowArrowForEndpoint(
			elementId: string,
			endpoint: 'start' | 'end',
			x: number,
			y: number
		): void {
			if (!currentPage) return;

			const elements = currentPage.elements;

			// Find the arrow element
			const element = elements.find((e) => e.id === elementId);
			if (!element || element.type !== 'shape') return;

			const shape = element as ShapeElement;
			if (shape.shapeType !== 'arrow') return;

			const arrow = shape as ArrowElement;
			const effectiveArrowType = arrow.arrowType ?? (arrow.elbowed ? 'elbow' : 'sharp');
			if (effectiveArrowType !== 'elbow') return;

			// Build a map of all shapes for quick lookup
			const shapeMap = new Map<string, ShapeElement>();
			for (const el of elements) {
				if (el.type === 'shape') {
					shapeMap.set(el.id, el as ShapeElement);
				}
			}

			// Position is already snapped by setLiveEndpoint, use directly
			const position = { x, y };

			// Check for binding candidate to get the shape for heading calculation
			const excludeIds = new Set([elementId]);
			const candidate = findBindingCandidate(position, elements, excludeIds);
			const candidateShape = candidate?.element ?? null;

			// Calculate new start/end positions
			const newStart = endpoint === 'start' ? position : arrow.start;
			const newEnd = endpoint === 'end' ? position : arrow.end;

			// Get bound shapes
			let startShape: ShapeElement | null = null;
			let endShape: ShapeElement | null = null;

			// For the dragged endpoint, use the candidate if found
			// For the non-dragged endpoint, use existing binding
			if (endpoint === 'start') {
				startShape = candidateShape;
				if (arrow.endBinding) {
					const boundShape = shapeMap.get(arrow.endBinding.elementId);
					if (boundShape) endShape = boundShape;
				}
			} else {
				endShape = candidateShape;
				if (arrow.startBinding) {
					const boundShape = shapeMap.get(arrow.startBinding.elementId);
					if (boundShape) startShape = boundShape;
				}
			}

			// Calculate headings
			let startHeading: Heading = arrow.startHeading ?? headingFromPoints(newStart, newEnd);
			let endHeading: Heading = arrow.endHeading ?? headingFromPoints(newEnd, newStart);

			if (startShape) {
				startHeading = getHeadingForBindingPoint(startShape, newStart);
			}
			if (endShape) {
				endHeading = flipHeading(getHeadingForBindingPoint(endShape, newEnd));
			}

			// Route the elbow arrow
			const routeResult = routeElbowArrow(
				newStart,
				newEnd,
				startHeading,
				endHeading,
				startShape,
				endShape
			);

			const newElbowPoints = new Map(liveElbowPoints);
			newElbowPoints.set(arrow.id, routeResult.points);
			liveElbowPoints = newElbowPoints;
		},

		/**
		 * Get the live endpoint for an element (if any).
		 * @param elementId - Element to get live endpoint for
		 */
		getLiveEndpoint(
			elementId: string
		): { endpoint: 'start' | 'end'; x: number; y: number } | undefined {
			return liveEndpoints.get(elementId);
		},

		/**
		 * Commit the live endpoint to the actual element and clear live state.
		 * Also handles binding detection and updates.
		 * @param elementId - Element to commit endpoint for
		 * @param endpoint - Which endpoint ('start' or 'end')
		 * @param x - Final X coordinate
		 * @param y - Final Y coordinate
		 */
		commitLiveEndpoint(elementId: string, endpoint: 'start' | 'end', x: number, y: number): void {
			// Clear the live endpoint first
			if (liveEndpoints.has(elementId)) {
				const newMap = new Map(liveEndpoints);
				newMap.delete(elementId);
				liveEndpoints = newMap;
			}

			// Update the element's endpoint
			this.updateElementEndpoint(elementId, endpoint, { x, y });

			// Clear live elbow points (arrow is updated by updateElementEndpoint)
			this.clearLiveElbowPoints(elementId);
		},

		/**
		 * Clear live endpoint without committing (e.g., on cancel).
		 * @param elementId - Element to clear live endpoint for
		 */
		clearLiveEndpoint(elementId: string): void {
			if (!liveEndpoints.has(elementId)) return;

			const newMap = new Map(liveEndpoints);
			newMap.delete(elementId);
			liveEndpoints = newMap;

			// Also clear live elbow points for this arrow
			this.clearLiveElbowPoints(elementId);
		},

		// =======================================================================
		// Waypoint Operations (for curved arrows)
		// =======================================================================

		/**
		 * Set live waypoints for an arrow during drag.
		 * This updates the visual preview without modifying the actual element.
		 * @param arrowId - Arrow element ID
		 * @param waypoints - Updated waypoints array
		 */
		setLiveWaypoints(arrowId: string, waypoints: ArrowWaypoint[]): void {
			const newMap = new Map(liveWaypoints);
			newMap.set(arrowId, waypoints);
			liveWaypoints = newMap;
		},

		/**
		 * Update a single waypoint position in the live state.
		 * @param arrowId - Arrow element ID
		 * @param waypointId - Waypoint ID to update
		 * @param position - New position
		 */
		setLiveWaypointPosition(arrowId: string, waypointId: string, position: Point): void {
			const page = currentPage;
			if (!page) return;

			// Find the arrow element
			const element = page.elements.find((e) => e.id === arrowId);
			if (!element || element.type !== 'shape') return;
			const arrow = element as ArrowElement;
			if (arrow.shapeType !== 'arrow' || arrow.arrowType !== 'curved') return;

			// Get current waypoints (from live state or from element)
			const currentWaypoints = liveWaypoints.get(arrowId) ?? [...(arrow.waypoints ?? [])];

			// Update the specific waypoint
			const updatedWaypoints = currentWaypoints.map((wp) =>
				wp.id === waypointId ? { ...wp, position } : wp
			);

			// Set live state
			const newMap = new Map(liveWaypoints);
			newMap.set(arrowId, updatedWaypoints);
			liveWaypoints = newMap;
		},

		/**
		 * Commit live waypoints to the actual element and clear live state.
		 * @param arrowId - Arrow element ID
		 */
		commitLiveWaypoints(arrowId: string): void {
			const waypoints = liveWaypoints.get(arrowId);
			if (!waypoints) return;

			// Clear live state
			const newMap = new Map(liveWaypoints);
			newMap.delete(arrowId);
			liveWaypoints = newMap;

			// Update the element
			this.updateElement(arrowId, (el) => {
				if (el.type !== 'shape') return el;
				const arrow = el as ArrowElement;
				if (arrow.shapeType !== 'arrow') return el;
				return { ...arrow, waypoints };
			});
		},

		/**
		 * Clear live waypoints without committing (e.g., on cancel).
		 * @param arrowId - Arrow element ID
		 */
		clearLiveWaypoints(arrowId: string): void {
			if (!liveWaypoints.has(arrowId)) return;

			const newMap = new Map(liveWaypoints);
			newMap.delete(arrowId);
			liveWaypoints = newMap;
		},

		/**
		 * Add a waypoint to an arrow at a specific index.
		 * @param arrowId - Arrow element ID
		 * @param position - Position for the new waypoint
		 * @param index - Index where to insert (if undefined, adds at end)
		 */
		addWaypointToArrow(arrowId: string, position: Point, index?: number): void {
			const page = currentPage;
			if (!page) return;

			const element = page.elements.find((e) => e.id === arrowId);
			if (!element || element.type !== 'shape') return;
			const arrow = element as ArrowElement;
			if (arrow.shapeType !== 'arrow') return;

			const newWaypoint: ArrowWaypoint = {
				id: crypto.randomUUID(),
				position
			};

			const currentWaypoints = [...(arrow.waypoints ?? [])];
			const insertIndex = index ?? currentWaypoints.length;
			currentWaypoints.splice(insertIndex, 0, newWaypoint);

			this.updateElement(arrowId, (el) => {
				if (el.type !== 'shape') return el;
				return { ...(el as ArrowElement), waypoints: currentWaypoints };
			});
		},

		/**
		 * Remove a waypoint from an arrow.
		 * @param arrowId - Arrow element ID
		 * @param waypointId - Waypoint ID to remove
		 */
		removeWaypointFromArrow(arrowId: string, waypointId: string): void {
			const page = currentPage;
			if (!page) return;

			const element = page.elements.find((e) => e.id === arrowId);
			if (!element || element.type !== 'shape') return;
			const arrow = element as ArrowElement;
			if (arrow.shapeType !== 'arrow' || !arrow.waypoints) return;

			const updatedWaypoints = arrow.waypoints.filter((wp) => wp.id !== waypointId);

			this.updateElement(arrowId, (el) => {
				if (el.type !== 'shape') return el;
				return { ...(el as ArrowElement), waypoints: updatedWaypoints };
			});
		},

		/**
		 * Update a single endpoint of a line/arrow element.
		 * Handles binding detection and updates bindings accordingly.
		 * @param elementId - Element to update
		 * @param endpoint - Which endpoint to update ('start' or 'end')
		 * @param position - New position for the endpoint
		 */
		updateElementEndpoint(elementId: string, endpoint: 'start' | 'end', position: Point): void {
			const page = currentPage;
			if (!page) return;

			const element = page.elements.find((e) => e.id === elementId);
			if (!element || element.type !== 'shape') return;

			const shape = element as ShapeElement;
			if (shape.shapeType !== 'line' && shape.shapeType !== 'arrow') return;

			// Check for binding at new position
			const excludeIds = new Set([elementId]);
			const candidate = findBindingCandidate(position, page.elements, excludeIds);

			// Calculate the other endpoint for binding direction
			const otherEndpoint = endpoint === 'start' ? shape.end : shape.start;

			// If it's an arrow, handle bindings
			if (shape.shapeType === 'arrow') {
				const arrow = shape as ArrowElement;
				let newBinding: BindingAnchor | null = null;
				let adjustedPosition = position;

				if (candidate) {
					// Create binding and snap to perimeter
					newBinding = createBindingAnchor(candidate.element, position, otherEndpoint);
					adjustedPosition = calculateBoundEndpoint(newBinding, candidate.element, otherEndpoint);
				}

				// Determine arrow type
				const effectiveArrowType = arrow.arrowType ?? (arrow.elbowed ? 'elbow' : 'sharp');

				// Calculate new start and end positions
				const newStart = endpoint === 'start' ? adjustedPosition : arrow.start;
				const newEnd = endpoint === 'end' ? adjustedPosition : arrow.end;

				// Calculate updated points based on arrow type
				let updatedPoints: readonly Point[];
				let updatedStartHeading: Heading | null = arrow.startHeading ?? null;
				let updatedEndHeading: Heading | null = arrow.endHeading ?? null;

				if (effectiveArrowType === 'elbow') {
					// For elbow arrows, recalculate the entire path using A* routing

					// Find bound shapes
					const startShape =
						endpoint === 'start' && candidate
							? candidate.element
							: arrow.startBinding
								? (page.elements.find(
										(e) => e.id === arrow.startBinding!.elementId && e.type === 'shape'
									) as ShapeElement | undefined)
								: undefined;
					const endShape =
						endpoint === 'end' && candidate
							? candidate.element
							: arrow.endBinding
								? (page.elements.find(
										(e) => e.id === arrow.endBinding!.elementId && e.type === 'shape'
									) as ShapeElement | undefined)
								: undefined;

					// Calculate headings using search cones (like Excalidraw)
					// The heading is determined by which side of the shape the actual point is on
					if (startShape) {
						updatedStartHeading = getHeadingForBindingPoint(startShape, newStart);
					}
					if (endShape) {
						// For end binding, flip the heading (arrow enters from opposite direction)
						updatedEndHeading = flipHeading(getHeadingForBindingPoint(endShape, newEnd));
					}

					// Ensure headings are never null for routing
					const effectiveStartHeading = updatedStartHeading ?? headingFromPoints(newStart, newEnd);
					const effectiveEndHeading = updatedEndHeading ?? headingFromPoints(newEnd, newStart);

					// Route the elbow arrow
					const routeResult = routeElbowArrow(
						newStart,
						newEnd,
						effectiveStartHeading,
						effectiveEndHeading,
						startShape ?? null,
						endShape ?? null
					);

					updatedPoints = routeResult.points;
				} else {
					// For non-elbow arrows, preserve intermediate points
					const intermediatePoints =
						arrow.points && arrow.points.length > 2 ? arrow.points.slice(1, -1) : [];
					updatedPoints = createArrowPoints(newStart, newEnd, intermediatePoints);
				}

				// Update the arrow with new endpoint, binding, and points
				this.updateElement(elementId, (el) => {
					if (el.type !== 'shape' || (el as ShapeElement).shapeType !== 'arrow') return el;
					const a = el as ArrowElement;
					return {
						...a,
						start: newStart,
						end: newEnd,
						points: updatedPoints,
						startBinding: endpoint === 'start' ? newBinding : a.startBinding,
						endBinding: endpoint === 'end' ? newBinding : a.endBinding,
						startHeading: effectiveArrowType === 'elbow' ? updatedStartHeading : a.startHeading,
						endHeading: effectiveArrowType === 'elbow' ? updatedEndHeading : a.endHeading
					};
				});
			} else {
				// For lines, just update the endpoint (no bindings)
				this.updateElement(elementId, (el) => {
					if (el.type !== 'shape') return el;
					const s = el as ShapeElement;
					if (endpoint === 'start') {
						return { ...s, start: position };
					} else {
						return { ...s, end: position };
					}
				});
			}
		},

		/**
		 * Commit current document state to history.
		 * Call this after a series of live updates (e.g., when slider drag ends).
		 */
		commitLiveChanges(): void {
			if (!document) return;
			history?.push(document);
			hasUnsavedChanges = true;
			scheduleAutosave();
			if (syncState.status !== 'disconnected') {
				syncState = markAsModified(syncState);
				scheduleAutoSync();
			}
		},

		/**
		 * Update style properties (color, strokeWidth, strokeStyle, cornerRadius) for selected elements
		 * Works with stroke, shape, and group elements (recursively updates group children)
		 * @param style - Properties to update
		 * @param live - If true, skip history/autosave for smooth live preview (default: false)
		 */
		updateSelectedStyles(
			style: {
				color?: string;
				strokeWidth?: number;
				opacity?: number;
				strokeStyle?: StrokeStyle;
				cornerRadius?: number;
				fillMode?: FillMode;
				fill?: string;
				fillOpacity?: number;
				elbowed?: boolean;
				elbowDirection?: ElbowDirection;
				startArrowhead?: Arrowhead | null;
				endArrowhead?: Arrowhead | null;
				roughness?: number;
			},
			live: boolean = false
		): void {
			if (selectedIds.size === 0) return;

			// Helper function to apply style to a single element
			const applyStyleToElement = (element: WhiteboardElement): WhiteboardElement => {
				switch (element.type) {
					case 'stroke':
						return {
							...element,
							...(style.color !== undefined && { color: style.color }),
							...(style.strokeWidth !== undefined && { width: style.strokeWidth }),
							...(style.opacity !== undefined && { opacity: style.opacity }),
							...(style.strokeStyle !== undefined && { strokeStyle: style.strokeStyle })
						};
					case 'shape': {
						const shapeEl = element as ShapeElement;
						const isArrow = shapeEl.shapeType === 'arrow';
						return {
							...element,
							...(style.color !== undefined && { color: style.color }),
							...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
							...(style.opacity !== undefined && { opacity: style.opacity }),
							...(style.strokeStyle !== undefined && { strokeStyle: style.strokeStyle }),
							...(style.cornerRadius !== undefined && { cornerRadius: style.cornerRadius }),
							...(style.fillMode !== undefined && { fillMode: style.fillMode }),
							...(style.fill !== undefined && { fill: style.fill }),
							...(style.fillOpacity !== undefined && { fillOpacity: style.fillOpacity }),
							// Roughjs properties
							...(style.roughness !== undefined && { roughness: style.roughness }),
							// Arrow properties (only for arrows)
							...(isArrow && style.elbowed !== undefined && { elbowed: style.elbowed }),
							...(isArrow &&
								style.elbowDirection !== undefined && { elbowDirection: style.elbowDirection }),
							...(isArrow &&
								style.startArrowhead !== undefined && { startArrowhead: style.startArrowhead }),
							...(isArrow &&
								style.endArrowhead !== undefined && { endArrowhead: style.endArrowhead })
						};
					}
					case 'group':
						// Recursively apply style to group children
						return {
							...element,
							children: element.children.map(applyStyleToElement)
						};
					default:
						return element;
				}
			};

			const updater = (page: Page) => ({
				...page,
				elements: page.elements.map((element) => {
					if (!selectedIds.has(element.id)) return element;
					return applyStyleToElement(element);
				})
			});

			if (live) {
				updateCurrentPageLive(updater);
			} else {
				updateCurrentPage(updater);
			}
		},

		// === Z-Order Operations ===

		/**
		 * Move elements to front (top of z-order)
		 * Preserves relative order among moved elements
		 * @param elementIds - IDs of elements to move to front
		 */
		bringToFront(elementIds: string[]): void {
			if (elementIds.length === 0) return;

			updateCurrentPage((page) => {
				const idsSet = new Set(elementIds);
				const elementsToMove = page.elements.filter((el) => idsSet.has(el.id));
				const remainingElements = page.elements.filter((el) => !idsSet.has(el.id));

				// If all elements are already at top, no change needed
				if (elementsToMove.length === 0) return page;

				return {
					...page,
					elements: [...remainingElements, ...elementsToMove]
				};
			});
		},

		/**
		 * Move elements to back (bottom of z-order)
		 * Preserves relative order among moved elements
		 * @param elementIds - IDs of elements to move to back
		 */
		sendToBack(elementIds: string[]): void {
			if (elementIds.length === 0) return;

			updateCurrentPage((page) => {
				const idsSet = new Set(elementIds);
				const elementsToMove = page.elements.filter((el) => idsSet.has(el.id));
				const remainingElements = page.elements.filter((el) => !idsSet.has(el.id));

				// If all elements are already at bottom, no change needed
				if (elementsToMove.length === 0) return page;

				return {
					...page,
					elements: [...elementsToMove, ...remainingElements]
				};
			});
		},

		/**
		 * Move elements one position forward (up in z-order)
		 * @param elementIds - IDs of elements to move forward
		 */
		bringForward(elementIds: string[]): void {
			if (elementIds.length === 0) return;

			updateCurrentPage((page) => {
				const idsSet = new Set(elementIds);
				const elements = [...page.elements];

				// Process from end to start to handle multiple elements correctly
				for (let i = elements.length - 2; i >= 0; i--) {
					if (idsSet.has(elements[i].id) && !idsSet.has(elements[i + 1].id)) {
						// Swap with next element
						[elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
					}
				}

				return { ...page, elements };
			});
		},

		/**
		 * Move elements one position backward (down in z-order)
		 * @param elementIds - IDs of elements to move backward
		 */
		sendBackward(elementIds: string[]): void {
			if (elementIds.length === 0) return;

			updateCurrentPage((page) => {
				const idsSet = new Set(elementIds);
				const elements = [...page.elements];

				// Process from start to end to handle multiple elements correctly
				for (let i = 1; i < elements.length; i++) {
					if (idsSet.has(elements[i].id) && !idsSet.has(elements[i - 1].id)) {
						// Swap with previous element
						[elements[i - 1], elements[i]] = [elements[i], elements[i - 1]];
					}
				}

				return { ...page, elements };
			});
		},

		// === TextBlock Operations ===

		/**
		 * Create a new text block at the given position
		 * Uses the default font from the current template if set
		 */
		createTextBlock(
			position: { x: number; y: number },
			width: number = DEFAULT_TEXT_BLOCK_WIDTH,
			height: number = DEFAULT_TEXT_BLOCK_HEIGHT
		): string {
			const element: TextBlockElement = {
				id: crypto.randomUUID(),
				type: 'textblock',
				position: { x: position.x, y: position.y },
				width: Math.max(width, MIN_TEXT_BLOCK_WIDTH),
				height: Math.max(height, MIN_TEXT_BLOCK_HEIGHT),
				markdownContent: '',
				// Apply default font from template if set
				...(defaultTextFont ? { fontFamily: defaultTextFont } : {})
			};

			this.addElement(element);
			return element.id;
		},

		/**
		 * Update text block content
		 */
		updateTextBlockContent(elementId: string, markdownContent: string): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'textblock') return el;
				return { ...el, markdownContent };
			});
		},

		/**
		 * Resize a text block
		 */
		resizeTextBlock(elementId: string, width: number, height: number): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'textblock') return el;
				return {
					...el,
					width: Math.max(width, MIN_TEXT_BLOCK_WIDTH),
					height: Math.max(height, MIN_TEXT_BLOCK_HEIGHT)
				};
			});
		},

		/**
		 * Move a text block to a new position
		 */
		moveTextBlock(elementId: string, position: { x: number; y: number }): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'textblock') return el;
				return { ...el, position };
			});
		},

		/**
		 * Resize and move a text block in a single operation
		 * Used during resize handles that affect both position and size
		 */
		resizeAndMoveTextBlock(
			elementId: string,
			width: number,
			height: number,
			position: { x: number; y: number }
		): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'textblock') return el;
				return {
					...el,
					width: Math.max(width, MIN_TEXT_BLOCK_WIDTH),
					height: Math.max(height, MIN_TEXT_BLOCK_HEIGHT),
					position
				};
			});
		},

		// === Shape Label Operations ===

		/**
		 * Update or add a label to a shape element
		 * @param elementId - The shape element ID
		 * @param labelMarkdown - The markdown content (empty string to remove)
		 */
		updateShapeLabel(elementId: string, labelMarkdown: string): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'shape') return el;
				// Remove label property if empty
				if (!labelMarkdown.trim()) {
					const { labelMarkdown: _, ...rest } = el;
					return rest as typeof el;
				}
				return { ...el, labelMarkdown };
			});
		},

		/**
		 * Remove label from a shape element
		 * @param elementId - The shape element ID
		 */
		removeShapeLabel(elementId: string): void {
			this.updateShapeLabel(elementId, '');
		},

		// === Image Operations ===

		/**
		 * Add an image element at the given position
		 */
		addImage(
			position: { x: number; y: number },
			width: number,
			height: number,
			src: string,
			originalFilename?: string
		): string {
			const element: ImageElement = {
				id: crypto.randomUUID(),
				type: 'image',
				position: { x: position.x, y: position.y },
				width: Math.max(width, MIN_IMAGE_WIDTH),
				height: Math.max(height, MIN_IMAGE_HEIGHT),
				src,
				originalFilename
			};

			this.addElement(element);
			return element.id;
		},

		/**
		 * Move an image element to a new position
		 */
		moveImage(elementId: string, position: { x: number; y: number }): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'image') return el;
				return { ...el, position };
			});
		},

		/**
		 * Resize an image element
		 */
		resizeImage(elementId: string, width: number, height: number): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'image') return el;
				return {
					...el,
					width: Math.max(width, MIN_IMAGE_WIDTH),
					height: Math.max(height, MIN_IMAGE_HEIGHT)
				};
			});
		},

		/**
		 * Resize and move an image in a single operation
		 */
		resizeAndMoveImage(
			elementId: string,
			width: number,
			height: number,
			position: { x: number; y: number }
		): void {
			this.updateElement(elementId, (el) => {
				if (el.type !== 'image') return el;
				return {
					...el,
					width: Math.max(width, MIN_IMAGE_WIDTH),
					height: Math.max(height, MIN_IMAGE_HEIGHT),
					position
				};
			});
		},

		/**
		 * Rotate an image element
		 */
		rotateImage(elementId: string, rotation: number): void {
			// Normalize rotation to 0-360 range
			const normalizedRotation = ((rotation % 360) + 360) % 360;
			this.updateElement(elementId, (el) => {
				if (el.type !== 'image') return el;
				return { ...el, rotation: normalizedRotation };
			});
		},

		// === Background Operations ===

		/**
		 * Set the background of the current page
		 */
		setPageBackground(background: PageBackground): void {
			updateCurrentPage((page) => ({
				...page,
				background
			}));
		},

		/**
		 * Clear the background (reset to plain white)
		 */
		clearPageBackground(): void {
			this.setPageBackground({
				type: 'plain',
				style: 'plain',
				color: '#ffffff'
			});
		},

		/**
		 * Set the format (dimensions) of the current page
		 */
		setPageFormat(format: PageFormatKey): void {
			const { width, height } = PAGE_FORMATS[format];
			updateCurrentPage((page) => ({
				...page,
				width,
				height
			}));
		},

		/**
		 * Get the current page format key (if it matches a predefined format)
		 */
		getCurrentPageFormat(): PageFormatKey | null {
			if (!currentPage) return null;
			for (const [key, value] of Object.entries(PAGE_FORMATS)) {
				if (value.width === currentPage.width && value.height === currentPage.height) {
					return key as PageFormatKey;
				}
			}
			return null; // Custom dimensions
		},

		// === PDF Import Operations ===

		/**
		 * Add pages from PDF import
		 */
		addPagesFromPdf(newPages: Page[]): void {
			if (!document || newPages.length === 0) return;

			updateDocument((doc) => ({
				...doc,
				pages: [...doc.pages, ...newPages],
				currentPageIndex: doc.pages.length // Go to first new page
			}));
		},

		/**
		 * Replace all pages with PDF pages (for opening a PDF as new document)
		 */
		replacePagesWithPdf(newPages: Page[], title?: string): void {
			if (!document || newPages.length === 0) return;

			updateDocument((doc) => ({
				...doc,
				title: title ?? doc.title,
				pages: newPages,
				currentPageIndex: 0
			}));
		},

		// === Tool Operations ===

		/**
		 * Set the current tool
		 */
		setTool(tool: Tool): void {
			currentTool = tool;
		},

		/**
		 * Update settings for a configurable tool (drawing or shape)
		 */
		setToolSettings(tool: ConfigurableTool, settings: Partial<ToolSettings>): void {
			toolSettings = {
				...toolSettings,
				[tool]: { ...toolSettings[tool], ...settings }
			};
		},

		/**
		 * Get current tool settings (for configurable tools)
		 */
		getCurrentToolSettings(): ToolSettings | null {
			if (currentTool in toolSettings) {
				return toolSettings[currentTool as ConfigurableTool];
			}
			return null;
		},

		/**
		 * Set color for configurable tools
		 * Highlighter has isolated settings (only updated when it's the current tool)
		 * Only saves to user preferences if no element is selected
		 */
		setColor(color: string): void {
			// Only save to preferences if no element is selected and not on highlighter
			if (selectedIds.size === 0 && currentTool !== 'highlighter') {
				userPreferences = { ...userPreferences, color };
			}
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				// Skip eraser (always white)
				if (tool === 'eraser') continue;
				// Highlighter has isolated settings - only update when it's the current tool
				if (tool === 'highlighter' && currentTool !== 'highlighter') continue;
				// Other tools don't get updated when highlighter is active
				if (tool !== 'highlighter' && currentTool === 'highlighter') continue;
				updatedSettings[tool] = { ...updatedSettings[tool], color };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set stroke width for configurable tools
		 * Highlighter has isolated settings (only updated when it's the current tool)
		 * Only saves to user preferences if no element is selected
		 */
		setStrokeWidth(width: number): void {
			// Only save to preferences if no element is selected and not on highlighter
			if (selectedIds.size === 0 && currentTool !== 'highlighter') {
				userPreferences = { ...userPreferences, strokeWidth: width };
			}
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				// Highlighter has isolated settings - only update when it's the current tool
				if (tool === 'highlighter' && currentTool !== 'highlighter') continue;
				// Other tools don't get updated when highlighter is active
				if (tool !== 'highlighter' && currentTool === 'highlighter') continue;
				updatedSettings[tool] = { ...updatedSettings[tool], width };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set opacity for configurable tools
		 * Highlighter has isolated settings (only updated when it's the current tool)
		 * Only saves to user preferences if no element is selected
		 */
		setOpacity(opacity: number): void {
			const clampedOpacity = Math.max(0.1, Math.min(1, opacity));
			// Only save to preferences if no element is selected and not on highlighter
			if (selectedIds.size === 0 && currentTool !== 'highlighter') {
				userPreferences = { ...userPreferences, opacity: clampedOpacity };
			}
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				// Skip eraser (always opaque)
				if (tool === 'eraser') continue;
				// Highlighter has isolated settings - only update when it's the current tool
				if (tool === 'highlighter' && currentTool !== 'highlighter') continue;
				// Other tools don't get updated when highlighter is active
				if (tool !== 'highlighter' && currentTool === 'highlighter') continue;
				updatedSettings[tool] = { ...updatedSettings[tool], opacity: clampedOpacity };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set stroke style for shape tools
		 * Only saves to user preferences if no element is selected
		 */
		setStrokeStyle(style: StrokeStyle): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, strokeStyle: style };
			}
			const updatedSettings = { ...toolSettings };
			// Apply to shape tools and pen (pen is used as reference for non-configurable tools)
			const toolsToUpdate: ConfigurableTool[] = [
				'pen',
				'line',
				'rectangle',
				'circle',
				'arrow',
				'pentagon',
				'hexagon',
				'star'
			];
			for (const tool of toolsToUpdate) {
				updatedSettings[tool] = { ...updatedSettings[tool], strokeStyle: style };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set corner radius for shape tools
		 * Only saves to user preferences if no element is selected
		 */
		setCornerRadius(radius: number): void {
			const clampedRadius = Math.max(0, Math.min(100, radius));
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, cornerRadius: clampedRadius };
			}
			const updatedSettings = { ...toolSettings };
			// Only apply to shape tools that support corner radius (not line/arrow)
			// Also update 'pen' as it's used as reference for non-configurable tools (select, pan)
			const toolsToUpdate: ConfigurableTool[] = ['pen', 'rectangle', 'pentagon', 'hexagon', 'star'];
			for (const tool of toolsToUpdate) {
				updatedSettings[tool] = { ...updatedSettings[tool], cornerRadius: clampedRadius };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set fill mode for shape tools (none, solid, hatched)
		 * Only saves to user preferences if no element is selected
		 */
		setFillMode(mode: FillMode): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, fillMode: mode };
			}
			const updatedSettings = { ...toolSettings };
			// Apply to shape tools that support fill (not line/arrow)
			// Also update 'pen' as it's used as reference for non-configurable tools (select, pan)
			const toolsToUpdate: ConfigurableTool[] = [
				'pen',
				'rectangle',
				'circle',
				'pentagon',
				'hexagon',
				'star'
			];
			for (const tool of toolsToUpdate) {
				updatedSettings[tool] = { ...updatedSettings[tool], fillMode: mode };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set fill opacity for shape tools
		 * Only saves to user preferences if no element is selected
		 */
		setFillOpacity(opacity: number): void {
			const clampedOpacity = Math.max(0, Math.min(1, opacity));
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, fillOpacity: clampedOpacity };
			}
			const updatedSettings = { ...toolSettings };
			// Apply to shape tools that support fill
			// Also update 'pen' as it's used as reference for non-configurable tools (select, pan)
			const toolsToUpdate: ConfigurableTool[] = [
				'pen',
				'rectangle',
				'circle',
				'pentagon',
				'hexagon',
				'star'
			];
			for (const tool of toolsToUpdate) {
				updatedSettings[tool] = { ...updatedSettings[tool], fillOpacity: clampedOpacity };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set fill color for shape tools
		 * Only saves to user preferences if no element is selected
		 */
		setFillColor(color: string): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, fillColor: color };
			}
			const updatedSettings = { ...toolSettings };
			// Apply to shape tools that support fill
			// Also update 'pen' as it's used as reference for non-configurable tools (select, pan)
			const toolsToUpdate: ConfigurableTool[] = [
				'pen',
				'rectangle',
				'circle',
				'pentagon',
				'hexagon',
				'star'
			];
			for (const tool of toolsToUpdate) {
				updatedSettings[tool] = { ...updatedSettings[tool], fillColor: color };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Set elbow mode for arrows
		 * Only saves to user preferences if no element is selected
		 */
		setElbowed(elbowed: boolean): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, elbowed };
			}
			// Only apply to arrow tool
			toolSettings = {
				...toolSettings,
				arrow: { ...toolSettings.arrow, elbowed }
			};
		},

		/**
		 * Set elbow direction for arrows
		 * Only saves to user preferences if no element is selected
		 */
		setElbowDirection(direction: ElbowDirection): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, elbowDirection: direction };
			}
			// Only apply to arrow tool
			toolSettings = {
				...toolSettings,
				arrow: { ...toolSettings.arrow, elbowDirection: direction }
			};
		},

		/**
		 * Set arrow type (sharp, curved, elbow)
		 * Only saves to user preferences if no element is selected
		 */
		setArrowType(type: ArrowType): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, arrowType: type };
			}
			// Also sync elbowed for backwards compatibility
			const elbowed = type === 'elbow';
			// Only apply to arrow tool
			toolSettings = {
				...toolSettings,
				arrow: { ...toolSettings.arrow, arrowType: type, elbowed }
			};
		},

		/**
		 * Set start arrowhead style
		 * Only saves to user preferences if no element is selected
		 */
		setStartArrowhead(arrowhead: Arrowhead | null): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, startArrowhead: arrowhead };
			}
			// Only apply to arrow tool
			toolSettings = {
				...toolSettings,
				arrow: { ...toolSettings.arrow, startArrowhead: arrowhead }
			};
		},

		/**
		 * Set end arrowhead style
		 * Only saves to user preferences if no element is selected
		 */
		setEndArrowhead(arrowhead: Arrowhead): void {
			// Only save to preferences if no element is selected
			if (selectedIds.size === 0) {
				userPreferences = { ...userPreferences, endArrowhead: arrowhead };
			}
			// Only apply to arrow tool
			toolSettings = {
				...toolSettings,
				arrow: { ...toolSettings.arrow, endArrowhead: arrowhead }
			};
		},

		/**
		 * Set roughness level for roughjs (0-2)
		 * This is a global setting that affects all new elements in sketch mode
		 */
		setRoughness(value: number): void {
			const clampedValue = Math.max(0, Math.min(2, value));
			// Always save to user preferences (global setting)
			userPreferences = { ...userPreferences, roughness: clampedValue };

			// Apply to ALL configurable tools
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				updatedSettings[tool] = { ...updatedSettings[tool], roughness: clampedValue };
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Sync toolbar display from element properties (temporary, doesn't save to preferences)
		 * Used when selecting an element to show its properties
		 */
		syncToolbarFromElement(element: {
			color: string;
			strokeWidth: number;
			opacity: number;
			strokeStyle?: StrokeStyle;
			cornerRadius?: number;
			fillMode?: FillMode;
			fill?: string;
			fillOpacity?: number;
			arrowType?: ArrowType;
			elbowed?: boolean;
			elbowDirection?: ElbowDirection;
			startArrowhead?: Arrowhead | null;
			endArrowhead?: Arrowhead | null;
			roughness?: number;
		}): void {
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				if (tool !== 'eraser') {
					const currentToolSettings = updatedSettings[tool];
					updatedSettings[tool] = {
						...currentToolSettings,
						color: element.color,
						width: element.strokeWidth,
						opacity: element.opacity,
						// Only update these if provided (shapes have them, strokes don't)
						strokeStyle: element.strokeStyle ?? currentToolSettings.strokeStyle,
						cornerRadius: element.cornerRadius ?? currentToolSettings.cornerRadius,
						fillMode: element.fillMode ?? currentToolSettings.fillMode,
						fillColor: element.fill ?? currentToolSettings.fillColor,
						fillOpacity: element.fillOpacity ?? currentToolSettings.fillOpacity,
						// Arrow type properties (only for arrows)
						arrowType: element.arrowType ?? currentToolSettings.arrowType,
						elbowed: element.elbowed ?? currentToolSettings.elbowed,
						elbowDirection: element.elbowDirection ?? currentToolSettings.elbowDirection,
						startArrowhead: element.startArrowhead ?? currentToolSettings.startArrowhead,
						endArrowhead: element.endArrowhead ?? currentToolSettings.endArrowhead,
						// Roughjs properties
						roughness: element.roughness ?? currentToolSettings.roughness
					};
				}
			}
			toolSettings = updatedSettings;
		},

		/**
		 * Restore toolbar to user's manually selected preferences
		 * Called when selection is cleared
		 * Note: highlighter keeps its own independent settings (color, width, opacity)
		 */
		restoreUserPreferences(): void {
			const updatedSettings = { ...toolSettings };
			for (const tool of Object.keys(updatedSettings) as ConfigurableTool[]) {
				// Skip eraser (has fixed settings) and highlighter (keeps its own color/width/opacity)
				if (tool === 'eraser') continue;
				if (tool === 'highlighter') {
					// Only restore non-visual settings for highlighter
					updatedSettings[tool] = {
						...updatedSettings[tool],
						strokeStyle: userPreferences.strokeStyle,
						cornerRadius: userPreferences.cornerRadius,
						fillMode: userPreferences.fillMode,
						fillColor: userPreferences.fillColor,
						fillOpacity: userPreferences.fillOpacity,
						arrowType: userPreferences.arrowType,
						elbowed: userPreferences.elbowed,
						elbowDirection: userPreferences.elbowDirection,
						startArrowhead: userPreferences.startArrowhead,
						endArrowhead: userPreferences.endArrowhead,
						roughness: userPreferences.roughness
					};
					continue;
				}
				updatedSettings[tool] = {
					...updatedSettings[tool],
					color: userPreferences.color,
					width: userPreferences.strokeWidth,
					opacity: userPreferences.opacity,
					strokeStyle: userPreferences.strokeStyle,
					cornerRadius: userPreferences.cornerRadius,
					fillMode: userPreferences.fillMode,
					fillColor: userPreferences.fillColor,
					fillOpacity: userPreferences.fillOpacity,
					arrowType: userPreferences.arrowType,
					elbowed: userPreferences.elbowed,
					elbowDirection: userPreferences.elbowDirection,
					startArrowhead: userPreferences.startArrowhead,
					endArrowhead: userPreferences.endArrowhead,
					roughness: userPreferences.roughness
				};
			}
			toolSettings = updatedSettings;
		},

		// === History Operations ===

		/**
		 * Undo last action
		 */
		undo(): void {
			const previous = history?.undo();
			if (previous) {
				document = previous;
				hasUnsavedChanges = true;
				scheduleAutosave();
			}
		},

		/**
		 * Redo last undone action
		 */
		redo(): void {
			const next = history?.redo();
			if (next) {
				document = next;
				hasUnsavedChanges = true;
				scheduleAutosave();
			}
		},

		// === Instrument Operations ===

		/**
		 * Toggle instrument visibility
		 */
		toggleInstrument(type: InstrumentType): void {
			if (!document) return;

			const current = document.instruments[type];
			updateDocument((doc) => ({
				...doc,
				instruments: {
					...doc.instruments,
					[type]: { ...current, visible: !current.visible }
				}
			}));
		},

		/**
		 * Show an instrument
		 */
		showInstrument(type: InstrumentType): void {
			if (!document || document.instruments[type].visible) return;
			this.toggleInstrument(type);
		},

		/**
		 * Hide an instrument
		 */
		hideInstrument(type: InstrumentType): void {
			if (!document || !document.instruments[type].visible) return;
			this.toggleInstrument(type);
		},

		/**
		 * Update instrument position
		 */
		updateInstrumentPosition(type: InstrumentType, x: number, y: number): void {
			if (!document) return;

			const current = document.instruments[type];
			updateDocument((doc) => ({
				...doc,
				instruments: {
					...doc.instruments,
					[type]: { ...current, x, y }
				}
			}));
		},

		/**
		 * Update instrument rotation
		 */
		updateInstrumentRotation(type: InstrumentType, rotation: number): void {
			if (!document) return;

			const current = document.instruments[type];
			updateDocument((doc) => ({
				...doc,
				instruments: {
					...doc.instruments,
					[type]: { ...current, rotation }
				}
			}));
		},

		/**
		 * Update full instrument state
		 */
		updateInstrument(type: InstrumentType, state: Partial<Omit<InstrumentState, 'type'>>): void {
			if (!document) return;

			const current = document.instruments[type];
			updateDocument((doc) => ({
				...doc,
				instruments: {
					...doc.instruments,
					[type]: { ...current, ...state }
				}
			}));
		},

		/**
		 * Reset instruments to default positions
		 */
		resetInstruments(): void {
			if (!document) return;

			updateDocument((doc) => ({
				...doc,
				instruments: createDefaultInstruments()
			}));
		},

		// === File Operations ===

		/**
		 * Save document to local file (.ubw)
		 */
		saveToFile(filename?: string): { success: boolean; error?: string } {
			if (!document) return { success: false, error: 'No document to save' };

			// Generate or validate filename
			let finalFilename = filename || generateFilename(document.title);

			// Ensure .ubw extension
			if (!finalFilename.endsWith(FILE_EXTENSION)) {
				finalFilename += FILE_EXTENSION;
			}

			// Validate filename
			if (!isValidFilename(finalFilename)) {
				return { success: false, error: 'Invalid filename' };
			}

			downloadDocument(document, { filename: finalFilename });
			hasUnsavedChanges = false;
			return { success: true };
		},

		/**
		 * Load document from local file
		 */
		async loadFromFile(file: File): Promise<{ success: boolean; error?: string }> {
			const result = await loadDocumentFromFile(file);

			if (!result.success || !result.document) {
				return { success: false, error: result.error };
			}

			document = result.document;
			history = createHistoryManager(document);
			hasUnsavedChanges = false;
			syncState = createInitialSyncState(); // Reset sync state
			clearSyncStateFromLocalStorage();

			return { success: true };
		},

		/**
		 * Get document as JSON string for external saving
		 */
		getDocumentJson(): string | null {
			if (!document) return null;
			return serializeDocument(prepareForSave(document));
		},

		/**
		 * Get suggested filename for current document
		 */
		getSuggestedFilename(): string {
			if (!document) return 'Sans_titre.ubw';
			return generateFilename(document.title);
		},

		// === Sync State Operations ===

		/**
		 * Set sync state to syncing
		 */
		setSyncing(): void {
			syncState = updateSyncStateToSyncing(syncState);
		},

		/**
		 * Update sync state after successful sync
		 */
		setSyncSuccess(fileId: string, modifiedTime?: string): void {
			syncState = updateSyncStateAfterSync(syncState, fileId, modifiedTime);
			hasUnsavedChanges = false;
			// Persist fileId to localStorage
			if (browser) {
				localStorage.setItem(
					SYNC_STATE_KEY,
					JSON.stringify({
						driveFileId: fileId,
						driveFolderId: syncState.driveFolderId
					})
				);
			}
		},

		/**
		 * Update sync state on error
		 */
		setSyncError(error: string): void {
			syncState = updateSyncStateOnError(syncState, error);
		},

		/**
		 * Connect to Drive (set initial connected state)
		 */
		connectToDrive(fileId?: string, folderId?: string): void {
			syncState = {
				status: fileId ? 'synced' : 'modified',
				lastSyncAt: fileId ? new Date().toISOString() : null,
				driveFileId: fileId || null,
				driveFolderId: folderId || null,
				autosaveFileId: null, // Reset autosave when connecting to a new file
				error: null
			};
			// Persist to localStorage if we have a fileId
			if (fileId && browser) {
				localStorage.setItem(
					SYNC_STATE_KEY,
					JSON.stringify({
						driveFileId: fileId,
						driveFolderId: folderId || null,
						autosaveFileId: null
					})
				);
			}
		},

		/**
		 * Disconnect from Drive
		 */
		disconnectFromDrive(): void {
			syncState = createInitialSyncState();
			clearSyncStateFromLocalStorage();
			driveSyncService.cancelAutoSync();
		},

		/**
		 * Check if auto-sync should be triggered
		 */
		shouldTriggerAutoSync(): boolean {
			return shouldAutoSync(syncState);
		},

		/**
		 * Delete autosave file from Drive and clear autosaveFileId
		 * Called after a successful manual save to clean up the autosave
		 */
		async deleteAutosaveIfExists(): Promise<void> {
			// Always cancel any pending autosave first to prevent race conditions
			// where the autosave fires after the file is deleted
			driveSyncService.cancelAutoSync();

			if (!syncState.driveFileId) return;

			try {
				const result = await driveSyncService.deleteAutosave(syncState.driveFileId);
				if (result.success && result.deleted) {
					console.log('[Whiteboard] Deleted autosave file:', result.deletedFileId);
				}
			} catch (error) {
				console.warn('[Whiteboard] Failed to delete autosave:', error);
			}

			// Clear autosaveFileId from state regardless of API result
			syncState = clearAutosaveFileId(syncState);

			// Update localStorage
			if (browser && syncState.driveFileId) {
				localStorage.setItem(
					SYNC_STATE_KEY,
					JSON.stringify({
						driveFileId: syncState.driveFileId,
						driveFolderId: syncState.driveFolderId,
						autosaveFileId: null
					})
				);
			}
		},

		/**
		 * Get autosaveFileId (for checking if autosave exists)
		 */
		get autosaveFileId(): string | null {
			return syncState.autosaveFileId;
		},

		/**
		 * Connect to Drive with an existing autosave
		 * Used when loading an autosave - keeps the document marked as 'modified'
		 * so the user knows they need to save manually
		 */
		connectToDriveWithAutosave(
			fileId: string,
			folderId: string | undefined,
			autosaveFileId: string
		): void {
			syncState = {
				status: 'modified', // Keep as modified since autosave differs from original
				lastSyncAt: null,
				driveFileId: fileId,
				driveFolderId: folderId || null,
				autosaveFileId: autosaveFileId, // Preserve autosave file ID
				error: null
			};
			// Persist to localStorage
			if (browser) {
				localStorage.setItem(
					SYNC_STATE_KEY,
					JSON.stringify({
						driveFileId: fileId,
						driveFolderId: folderId || null,
						autosaveFileId: autosaveFileId
					})
				);
			}
		},

		// === Laser Pointer ===

		/** Current laser mode */
		get laserMode(): LaserMode {
			return laserMode;
		},

		/** Whether laser is currently active (pointer down) */
		get laserActive(): boolean {
			return laserActive;
		},

		/** Current laser position */
		get laserPosition(): Point | null {
			return laserPosition;
		},

		/** Trail points with timestamps */
		get laserTrail(): LaserTrailPoint[] {
			return laserTrail;
		},

		/** Timestamp when fade animation should start (null = no fade yet) */
		get laserFadeStartTime(): number | null {
			return laserFadeStartTime;
		},

		/**
		 * Set laser mode (pointer or trail)
		 */
		setLaserMode(mode: LaserMode): void {
			laserMode = mode;
			// Clear trail when switching modes
			laserTrail = [];
			laserFadeStartTime = null;
		},

		/**
		 * Set laser active state
		 */
		setLaserActive(active: boolean): void {
			laserActive = active;
			if (!active) {
				laserPosition = null;
				// Start fade animation when releasing
				if (laserTrail.length > 0) {
					laserFadeStartTime = Date.now();
				}
			} else {
				// Reset fade when starting new trail
				laserFadeStartTime = null;
			}
		},

		/**
		 * Update laser position
		 */
		updateLaserPosition(point: Point): void {
			laserPosition = point;
			if (laserMode === 'trail' && laserActive) {
				laserTrail = [...laserTrail, { point, timestamp: Date.now() }];
			}
		},

		/**
		 * Clear old trail points beyond maxAge (in ms)
		 */
		clearOldTrailPoints(maxAge: number): void {
			const now = Date.now();
			laserTrail = laserTrail.filter((p) => now - p.timestamp < maxAge);
		},

		/**
		 * Clear all laser trail points
		 */
		clearLaserTrail(): void {
			laserTrail = [];
			laserFadeStartTime = null;
		},

		// === Cleanup ===

		/**
		 * Cleanup resources (call on component destroy)
		 */
		destroy(): void {
			if (autosaveTimeout) {
				clearTimeout(autosaveTimeout);
			}
			// Cancel any pending Drive auto-sync
			driveSyncService.cancelAutoSync();
			// Final save before destroy
			if (hasUnsavedChanges) {
				saveToLocalStorage();
			}
		}
	};
}

// =============================================================================
// Singleton Export
// =============================================================================

/** Global whiteboard store instance */
export const whiteboardStore = createWhiteboardStore();
