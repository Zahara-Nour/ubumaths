/**
 * Slide Annotation Store
 *
 * Manages annotation state for slides, shared between Deck and individual slides.
 * This allows the toolbar to be rendered at the Deck level (outside reveal.js transforms)
 * while slides can control the annotation state.
 */

export type SlideAnnotationToolType =
	| 'pen'
	| 'marker'
	| 'highlighter'
	| 'eraser'
	| 'line'
	| 'rectangle'
	| 'circle'
	| 'arrow';

export interface AnnotationStyle {
	color: string;
	strokeWidth: number;
	opacity: number;
}

interface SlideAnnotationState {
	/** Whether an annotatable slide is currently active */
	available: boolean;
	/** Whether annotation mode is enabled */
	enabled: boolean;
	/** Current tool */
	tool: SlideAnnotationToolType;
	/** Current style */
	style: AnnotationStyle;
	/** Whether undo is available */
	canUndo: boolean;
	/** Whether redo is available */
	canRedo: boolean;
}

// Callbacks registered by the active slide
let undoCallback: (() => void) | null = null;
let redoCallback: (() => void) | null = null;
let clearCallback: (() => void) | null = null;

function createSlideAnnotationStore() {
	const state = $state<SlideAnnotationState>({
		available: false,
		enabled: false,
		tool: 'pen',
		style: {
			color: '#ef4444',
			strokeWidth: 3,
			opacity: 1
		},
		canUndo: false,
		canRedo: false
	});

	return {
		// Getters
		get available() {
			return state.available;
		},
		get enabled() {
			return state.enabled;
		},
		get tool() {
			return state.tool;
		},
		get style() {
			return state.style;
		},
		get canUndo() {
			return state.canUndo;
		},
		get canRedo() {
			return state.canRedo;
		},

		// Actions for toolbar
		toggle() {
			state.enabled = !state.enabled;
		},
		setEnabled(enabled: boolean) {
			state.enabled = enabled;
		},
		setTool(tool: SlideAnnotationToolType) {
			state.tool = tool;
		},
		setStyle(style: AnnotationStyle) {
			state.style = style;
		},
		setStyleProperty<K extends keyof AnnotationStyle>(key: K, value: AnnotationStyle[K]) {
			state.style = { ...state.style, [key]: value };
		},
		undo() {
			undoCallback?.();
		},
		redo() {
			redoCallback?.();
		},
		clear() {
			clearCallback?.();
		},

		// Actions for slides
		setAvailable(available: boolean) {
			state.available = available;
			if (!available) {
				state.enabled = false;
			}
		},
		setUndoRedoState(canUndo: boolean, canRedo: boolean) {
			state.canUndo = canUndo;
			state.canRedo = canRedo;
		},
		registerCallbacks(callbacks: { undo?: () => void; redo?: () => void; clear?: () => void }) {
			undoCallback = callbacks.undo ?? null;
			redoCallback = callbacks.redo ?? null;
			clearCallback = callbacks.clear ?? null;
		},
		unregisterCallbacks() {
			undoCallback = null;
			redoCallback = null;
			clearCallback = null;
		}
	};
}

export const slideAnnotationStore = createSlideAnnotationStore();
