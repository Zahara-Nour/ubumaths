import { browser } from '$app/env';
import { z } from 'zod';

/**
 * Réglages de la forme « En classe »
 * ==================================
 *
 * Chantier `diaporama-reglages` (phase 0 validée le 2026-11-20) : réglés sur la
 * page d'attente ou dans le panneau ⚙ de la projection, gardés dans le
 * navigateur (rien en base). Stockage illisible ou bloqué : réglages par défaut,
 * les changements valent alors pour la page ouverte.
 */

// Types
export interface ClassroomSettings {
	/** « C'est parti ! » passe la projection en plein écran */
	fullscreenOnStart: boolean;
	/** Chaque question est suivie de sa correction */
	correctionAfterEach: boolean;
	/** Durée de chaque correction (s) */
	correctionSeconds: number;
	/** À 0, la question reste affichée en pause au lieu d'avancer */
	pauseAtEnd: boolean;
	/** Un son discret quand une nouvelle question apparaît */
	chime: boolean;
}

// Constantes
export const CLASSROOM_SETTINGS_KEY = 'classroomSettings';
export const CORRECTION_SECONDS_MIN = 5;
export const CORRECTION_SECONDS_MAX = 60;
export const CORRECTION_SECONDS_STEP = 5;

export const DEFAULT_CLASSROOM_SETTINGS: ClassroomSettings = {
	fullscreenOnStart: true,
	correctionAfterEach: false,
	correctionSeconds: 10,
	pauseAtEnd: false,
	chime: false
};

// Champ par champ : une valeur fausse redonne le défaut de ce champ seulement
const storedSchema = z.object({
	fullscreenOnStart: z.boolean().catch(DEFAULT_CLASSROOM_SETTINGS.fullscreenOnStart),
	correctionAfterEach: z.boolean().catch(DEFAULT_CLASSROOM_SETTINGS.correctionAfterEach),
	correctionSeconds: z
		.number()
		.min(0)
		.max(3600)
		.catch(DEFAULT_CLASSROOM_SETTINGS.correctionSeconds),
	pauseAtEnd: z.boolean().catch(DEFAULT_CLASSROOM_SETTINGS.pauseAtEnd),
	chime: z.boolean().catch(DEFAULT_CLASSROOM_SETTINGS.chime)
});

// Functions
/** Entre 5 et 60 s, arrondie au pas de 5 s inférieur */
export function clampCorrectionSeconds(seconds: number): number {
	const stepped = Math.floor(seconds / CORRECTION_SECONDS_STEP) * CORRECTION_SECONDS_STEP;
	return Math.min(CORRECTION_SECONDS_MAX, Math.max(CORRECTION_SECONDS_MIN, stepped));
}

function normalize(settings: ClassroomSettings): ClassroomSettings {
	return { ...settings, correctionSeconds: clampCorrectionSeconds(settings.correctionSeconds) };
}

function readStored(): ClassroomSettings {
	try {
		const raw = localStorage.getItem(CLASSROOM_SETTINGS_KEY);
		if (raw === null) return { ...DEFAULT_CLASSROOM_SETTINGS };
		const parsed = storedSchema.safeParse(JSON.parse(raw));
		return parsed.success ? normalize(parsed.data) : { ...DEFAULT_CLASSROOM_SETTINGS };
	} catch {
		// JSON illisible ou stockage bloqué (navigation privée)
		return { ...DEFAULT_CLASSROOM_SETTINGS };
	}
}

export function createClassroomSettingsStore() {
	let settings = $state<ClassroomSettings>(
		browser ? readStored() : { ...DEFAULT_CLASSROOM_SETTINGS }
	);

	function update(patch: Partial<ClassroomSettings>) {
		settings = normalize({ ...settings, ...patch });
		try {
			localStorage.setItem(CLASSROOM_SETTINGS_KEY, JSON.stringify(settings));
		} catch {
			// Stockage bloqué : les réglages valent pour la page ouverte
		}
	}

	return {
		get settings(): ClassroomSettings {
			return settings;
		},
		update
	};
}

export const classroomSettings = createClassroomSettingsStore();
