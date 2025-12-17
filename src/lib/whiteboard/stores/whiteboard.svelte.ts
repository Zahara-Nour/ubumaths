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
	type WhiteboardDocument,
	type Page,
	type WhiteboardElement,
	type PageFormatKey,
	type InstrumentType,
	type InstrumentState
} from '../types/document';
import { createHistoryManager, type HistoryManager } from '../core/history.svelte';
import { serialize, deserialize } from '../core/serialization';

// =============================================================================
// Constants
// =============================================================================

/** LocalStorage key for autosave */
const AUTOSAVE_KEY = 'ubumaths-whiteboard-autosave';

/** Autosave delay in milliseconds (1 minute) */
const AUTOSAVE_DELAY_MS = 60_000;

// =============================================================================
// Tool Types
// =============================================================================

/** Drawing tools */
export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

/** Shape tools */
export type ShapeTool = 'line' | 'rectangle' | 'circle' | 'arrow';

/** Action tools */
export type ActionTool = 'select' | 'pan' | 'text';

/** Instrument tools */
export type InstrumentTool = 'ruler' | 'protractor' | 'compass' | 'set-square';

/** All tool types */
export type Tool = DrawingTool | ShapeTool | ActionTool | InstrumentTool;

/** Tool settings for drawing tools */
export interface ToolSettings {
	color: string;
	width: number;
	opacity: number;
}

/** Default settings per tool */
const DEFAULT_TOOL_SETTINGS: Record<DrawingTool, ToolSettings> = {
	pen: { color: '#000000', width: 2, opacity: 1 },
	highlighter: { color: '#ffff00', width: 20, opacity: 0.5 },
	eraser: { color: '#ffffff', width: 20, opacity: 1 }
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
	let toolSettings = $state<Record<DrawingTool, ToolSettings>>({ ...DEFAULT_TOOL_SETTINGS });

	// === UI State ===
	let hasUnsavedChanges = $state(false);
	const isLoading = $state(false);

	// === Autosave ===
	let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// === Derived State ===
	const currentPage = $derived(document?.pages[document.currentPageIndex] ?? null);
	const pageCount = $derived(document?.pages.length ?? 0);
	const canUndo = $derived(history?.canUndo ?? false);
	const canRedo = $derived(history?.canRedo ?? false);

	// Combined tool state for convenience
	const toolState = $derived.by(() => {
		const settings =
			currentTool in toolSettings
				? toolSettings[currentTool as DrawingTool]
				: { color: '#000000', width: 2, opacity: 1 };
		return {
			toolType: currentTool,
			color: settings.color,
			strokeWidth: settings.width,
			opacity: settings.opacity
		};
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
			localStorage.setItem(AUTOSAVE_KEY, json);
			console.debug('[Whiteboard] Autosaved to localStorage');
		} catch (error) {
			// Handle quota exceeded or other errors gracefully
			console.warn('[Whiteboard] Autosave failed:', error);
			// TODO Phase 2: Notify user if autosave fails due to quota
			// if (error instanceof DOMException && error.name === 'QuotaExceededError') {
			//     toaster.warning('Espace de stockage insuffisant');
			// }
		}
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
	}

	function updateCurrentPage(updater: (page: Page) => Page): void {
		if (!document || !currentPage) return;

		updateDocument((doc) => ({
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

		// === Document Operations ===

		/**
		 * Create a new empty document
		 */
		createNew(title: string = 'Sans titre', format: PageFormatKey = 'A4'): void {
			document = createEmptyDocument(title, format);
			history = createHistoryManager(document);
			hasUnsavedChanges = false;
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

			return { success: true };
		},

		/**
		 * Load from localStorage autosave if available
		 */
		loadFromAutosave(): boolean {
			if (!browser) return false;

			try {
				const saved = localStorage.getItem(AUTOSAVE_KEY);
				if (!saved) return false;

				const result = this.loadFromJson(saved);
				if (result.success) {
					console.debug('[Whiteboard] Restored from autosave');
					return true;
				}
			} catch (error) {
				console.warn('[Whiteboard] Failed to restore autosave:', error);
			}

			return false;
		},

		/**
		 * Clear autosave from localStorage
		 */
		clearAutosave(): void {
			if (!browser) return;
			localStorage.removeItem(AUTOSAVE_KEY);
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
		 */
		removeElement(elementId: string): void {
			updateCurrentPage((page) => ({
				...page,
				elements: page.elements.filter((e) => e.id !== elementId)
			}));
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

		// === Tool Operations ===

		/**
		 * Set the current tool
		 */
		setTool(tool: Tool): void {
			currentTool = tool;
		},

		/**
		 * Update settings for a drawing tool
		 */
		setToolSettings(tool: DrawingTool, settings: Partial<ToolSettings>): void {
			toolSettings = {
				...toolSettings,
				[tool]: { ...toolSettings[tool], ...settings }
			};
		},

		/**
		 * Get current tool settings (for drawing tools)
		 */
		getCurrentToolSettings(): ToolSettings | null {
			if (currentTool in toolSettings) {
				return toolSettings[currentTool as DrawingTool];
			}
			return null;
		},

		/**
		 * Set color for current drawing tool
		 */
		setColor(color: string): void {
			if (currentTool in toolSettings && currentTool !== 'eraser') {
				toolSettings = {
					...toolSettings,
					[currentTool as DrawingTool]: {
						...toolSettings[currentTool as DrawingTool],
						color
					}
				};
			}
		},

		/**
		 * Set stroke width for current tool
		 */
		setStrokeWidth(width: number): void {
			if (currentTool in toolSettings) {
				toolSettings = {
					...toolSettings,
					[currentTool as DrawingTool]: {
						...toolSettings[currentTool as DrawingTool],
						width
					}
				};
			}
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

		// === Cleanup ===

		/**
		 * Cleanup resources (call on component destroy)
		 */
		destroy(): void {
			if (autosaveTimeout) {
				clearTimeout(autosaveTimeout);
			}
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
