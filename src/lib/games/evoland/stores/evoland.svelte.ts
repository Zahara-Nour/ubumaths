/**
 * Evoland Game Store
 *
 * Svelte 5 reactive store for game state management.
 * Uses runes for reactivity and integrates with game logic.
 */

import type { ProgressionFlags, ProgressionState } from '../logic/progression';
import type { SaveSlot } from '../logic/save-system';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Game screen states.
 */
export type GameScreen = 'title' | 'playing' | 'paused' | 'dialog' | 'gameover' | 'victory';

/**
 * Dialog content for popup display.
 */
export interface DialogContent {
	readonly title: string;
	readonly message: string;
	readonly icon?: string;
	readonly onClose?: () => void;
}

/**
 * HUD display state.
 */
export interface HUDState {
	readonly hp: number;
	readonly maxHp: number;
	readonly gold: number;
	readonly keys: number;
	readonly xp: number;
	readonly level: number;
	readonly killCount: number;
	readonly showKillCounter: boolean;
}

/**
 * Game visual settings.
 */
export interface VisualSettings {
	readonly colorLevel: number; // 0-4
	readonly zoomLevel: number; // 1-3
	readonly scrolling: boolean;
	readonly mode2D: boolean;
}

// ============================================================================
// STORE CLASS
// ============================================================================

/**
 * Creates the Evoland game store with Svelte 5 runes.
 */
function createEvolandStore() {
	// ========================================================================
	// REACTIVE STATE
	// ========================================================================

	// Screen state
	let screen = $state<GameScreen>('title');
	let isPaused = $state(false);
	let isLoading = $state(true);

	// HUD state
	let hud = $state<HUDState>({
		hp: 3,
		maxHp: 3,
		gold: 0,
		keys: 0,
		xp: 0,
		level: 1,
		killCount: 0,
		showKillCounter: false
	});

	// Visual settings
	let visuals = $state<VisualSettings>({
		colorLevel: 0,
		zoomLevel: 1,
		scrolling: false,
		mode2D: false
	});

	// Progression flags (read-only from UI perspective)
	let flags = $state<Partial<ProgressionFlags>>({
		canSave: false,
		soundsEnabled: false,
		musicEnabled: false,
		titleScreenEnabled: false
	});

	// Dialog state
	let dialog = $state<DialogContent | null>(null);

	// Save slots
	let saveSlots = $state<SaveSlot[]>([]);

	// FPS display (debug)
	let fps = $state(0);

	// ========================================================================
	// DERIVED STATE
	// ========================================================================

	const canShowHUD = $derived(screen === 'playing' || screen === 'paused');
	const canShowDialog = $derived(dialog !== null);
	const canSaveGame = $derived(flags.canSave === true);
	const hpPercentage = $derived(hud.maxHp > 0 ? (hud.hp / hud.maxHp) * 100 : 0);
	const xpPercentage = $derived(Math.min(hud.xp, 100)); // 100 XP per level, capped at 100%

	// ========================================================================
	// ACTIONS
	// ========================================================================

	/**
	 * Start a new game.
	 */
	function startNewGame() {
		screen = 'playing';
		isPaused = false;
		isLoading = false;
		resetHUD();
	}

	/**
	 * Continue from last save.
	 */
	function continueGame() {
		screen = 'playing';
		isPaused = false;
	}

	/**
	 * Pause the game.
	 */
	function pauseGame() {
		if (screen === 'playing') {
			screen = 'paused';
			isPaused = true;
		}
	}

	/**
	 * Resume the game.
	 */
	function resumeGame() {
		if (screen === 'paused') {
			screen = 'playing';
			isPaused = false;
		}
	}

	/**
	 * Toggle pause state.
	 */
	function togglePause() {
		if (isPaused) {
			resumeGame();
		} else {
			pauseGame();
		}
	}

	/**
	 * Go to title screen.
	 */
	function goToTitle() {
		screen = 'title';
		isPaused = false;
	}

	/**
	 * Trigger game over.
	 */
	function gameOver() {
		screen = 'gameover';
		isPaused = true;
	}

	/**
	 * Trigger victory.
	 */
	function victory() {
		screen = 'victory';
		isPaused = true;
	}

	/**
	 * Show a dialog.
	 */
	function showDialog(content: DialogContent) {
		dialog = content;
		screen = 'dialog';
	}

	/**
	 * Close the dialog.
	 */
	function closeDialog() {
		const onClose = dialog?.onClose;
		dialog = null;
		screen = 'playing';
		if (onClose) onClose();
	}

	/**
	 * Update HUD from game state.
	 */
	function updateHUD(state: Partial<HUDState>) {
		hud = { ...hud, ...state };
	}

	/**
	 * Update visual settings from progression.
	 */
	function updateVisuals(settings: Partial<VisualSettings>) {
		visuals = { ...visuals, ...settings };
	}

	/**
	 * Update flags from progression.
	 */
	function updateFlags(newFlags: Partial<ProgressionFlags>) {
		flags = { ...flags, ...newFlags };
	}

	/**
	 * Update save slots.
	 */
	function updateSaveSlots(slots: SaveSlot[]) {
		saveSlots = slots;
	}

	/**
	 * Update FPS counter.
	 */
	function updateFPS(value: number) {
		fps = value;
	}

	/**
	 * Set loading state.
	 */
	function setLoading(value: boolean) {
		isLoading = value;
	}

	/**
	 * Reset HUD to initial values.
	 */
	function resetHUD() {
		hud = {
			hp: 3,
			maxHp: 3,
			gold: 0,
			keys: 0,
			xp: 0,
			level: 1,
			killCount: 0,
			showKillCounter: false
		};
	}

	/**
	 * Sync from progression state (used when loading).
	 */
	function syncFromProgression(state: ProgressionState) {
		hud = {
			hp: state.hp,
			maxHp: state.maxHp,
			gold: state.gold,
			keys: state.keys,
			xp: state.xp,
			level: state.level,
			killCount: state.killCount,
			showKillCounter: state.flags.dungeonKillCounter
		};

		visuals = {
			colorLevel: state.flags.colorLevel,
			zoomLevel: state.flags.zoomLevel,
			scrolling: state.flags.scrolling,
			mode2D: state.flags.mode2D
		};

		flags = { ...state.flags };
	}

	// ========================================================================
	// RETURN STORE
	// ========================================================================

	return {
		// State getters (reactive)
		get screen() {
			return screen;
		},
		get isPaused() {
			return isPaused;
		},
		get isLoading() {
			return isLoading;
		},
		get hud() {
			return hud;
		},
		get visuals() {
			return visuals;
		},
		get flags() {
			return flags;
		},
		get dialog() {
			return dialog;
		},
		get saveSlots() {
			return saveSlots;
		},
		get fps() {
			return fps;
		},

		// Derived getters
		get canShowHUD() {
			return canShowHUD;
		},
		get canShowDialog() {
			return canShowDialog;
		},
		get canSaveGame() {
			return canSaveGame;
		},
		get hpPercentage() {
			return hpPercentage;
		},
		get xpPercentage() {
			return xpPercentage;
		},

		// Actions
		startNewGame,
		continueGame,
		pauseGame,
		resumeGame,
		togglePause,
		goToTitle,
		gameOver,
		victory,
		showDialog,
		closeDialog,
		updateHUD,
		updateVisuals,
		updateFlags,
		updateSaveSlots,
		updateFPS,
		setLoading,
		resetHUD,
		syncFromProgression
	};
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global Evoland game store instance.
 */
export const evolandStore = createEvolandStore();
