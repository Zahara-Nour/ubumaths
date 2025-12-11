import { browser } from '$app/environment';

/**
 * Exercise Font Store
 * ===================
 *
 * Manages the font family used for displaying exercises.
 *
 * Features:
 * - Multiple font options including system, serif, sans-serif, and handwritten
 * - Persists to localStorage as 'exerciseFont'
 * - Applied via --exercise-font-family CSS variable
 */

export type ExerciseFontId =
	| 'system'
	| 'inter'
	| 'lora'
	| 'georgia'
	| 'times'
	| 'comic'
	| 'excalifont';

export interface ExerciseFontOption {
	id: ExerciseFontId;
	label: string;
	family: string;
	category: 'sans-serif' | 'serif' | 'handwritten';
}

export const FONT_OPTIONS: ExerciseFontOption[] = [
	{
		id: 'system',
		label: 'Systeme',
		family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		category: 'sans-serif'
	},
	{
		id: 'inter',
		label: 'Inter',
		family: '"Inter", sans-serif',
		category: 'sans-serif'
	},
	{
		id: 'lora',
		label: 'Lora',
		family: '"Lora", Georgia, serif',
		category: 'serif'
	},
	{
		id: 'georgia',
		label: 'Georgia',
		family: 'Georgia, "Times New Roman", serif',
		category: 'serif'
	},
	{
		id: 'times',
		label: 'Times',
		family: '"Times New Roman", Times, serif',
		category: 'serif'
	},
	{
		id: 'comic',
		label: 'Comic Sans',
		family: '"Comic Sans MS", "Comic Sans", cursive',
		category: 'sans-serif'
	},
	{
		id: 'excalifont',
		label: 'Excalifont',
		family: '"Excalifont", cursive',
		category: 'handwritten'
	}
];

const DEFAULT_FONT: ExerciseFontId = 'inter';
const STORAGE_KEY = 'exerciseFont';

function createExerciseFontStore() {
	let currentFontId = $state<ExerciseFontId>(DEFAULT_FONT);

	// Initialize from localStorage
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && FONT_OPTIONS.some((f) => f.id === stored)) {
			currentFontId = stored as ExerciseFontId;
		}
		updateDOM();
	}

	function updateDOM() {
		if (browser) {
			const font = FONT_OPTIONS.find((f) => f.id === currentFontId);
			if (font) {
				document.documentElement.style.setProperty('--exercise-font-family', font.family);
			}
		}
	}

	function setFont(fontId: ExerciseFontId) {
		if (FONT_OPTIONS.some((f) => f.id === fontId)) {
			currentFontId = fontId;
			updateDOM();
			if (browser) {
				localStorage.setItem(STORAGE_KEY, fontId);
			}
		}
	}

	function reset() {
		currentFontId = DEFAULT_FONT;
		updateDOM();
		if (browser) {
			localStorage.setItem(STORAGE_KEY, DEFAULT_FONT);
		}
	}

	return {
		get current() {
			return currentFontId;
		},
		get currentFont() {
			return FONT_OPTIONS.find((f) => f.id === currentFontId) ?? FONT_OPTIONS[0];
		},
		get options() {
			return FONT_OPTIONS;
		},
		setFont,
		reset
	};
}

export const exerciseFont = createExerciseFontStore();
