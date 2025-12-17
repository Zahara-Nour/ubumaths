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
	type PageBackground,
	type WhiteboardElement,
	type TextBlockElement,
	type ImageElement,
	type PageFormatKey,
	type InstrumentType,
	type InstrumentState
} from '../types/document';
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
	type SyncState,
	type SyncStatus,
	AUTO_SYNC_DELAY
} from '../utils/sync-state';

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
export type ActionTool = 'select' | 'pan' | 'text' | 'image';

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
	let sidebarVisible = $state(true);

	// === Sync State ===
	let syncState = $state<SyncState>(createInitialSyncState());

	// === Autosave ===
	let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let autoSyncTimeout: ReturnType<typeof setTimeout> | null = null;

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

		// Mark sync state as modified and schedule auto-sync
		if (syncState.status !== 'disconnected') {
			syncState = markAsModified(syncState);
			scheduleAutoSync();
		}
	}

	function scheduleAutoSync(): void {
		if (!browser) return;
		if (!shouldAutoSync(syncState)) return;

		// Clear existing timeout
		if (autoSyncTimeout) {
			clearTimeout(autoSyncTimeout);
		}

		// Schedule auto-sync
		autoSyncTimeout = setTimeout(() => {
			// This will be called by UI to trigger actual sync
			// The store just marks it ready for sync
		}, AUTO_SYNC_DELAY);
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
		get sidebarVisible() {
			return sidebarVisible;
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

		// === TextBlock Operations ===

		/**
		 * Create a new text block at the given position
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
				markdownContent: ''
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
		setSyncSuccess(fileId: string): void {
			syncState = updateSyncStateAfterSync(syncState, fileId);
			hasUnsavedChanges = false;
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
				error: null
			};
		},

		/**
		 * Disconnect from Drive
		 */
		disconnectFromDrive(): void {
			syncState = createInitialSyncState();
			if (autoSyncTimeout) {
				clearTimeout(autoSyncTimeout);
				autoSyncTimeout = null;
			}
		},

		/**
		 * Check if auto-sync should be triggered
		 */
		shouldTriggerAutoSync(): boolean {
			return shouldAutoSync(syncState);
		},

		// === Cleanup ===

		/**
		 * Cleanup resources (call on component destroy)
		 */
		destroy(): void {
			if (autosaveTimeout) {
				clearTimeout(autosaveTimeout);
			}
			if (autoSyncTimeout) {
				clearTimeout(autoSyncTimeout);
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
