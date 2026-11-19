import { browser } from '$app/env';
import { switchMathFonts, type MathFontSet } from '#lib/utils/mathlive-fonts.ts';

/**
 * Réglage « Lecture facilitée »
 * =============================
 *
 * Chantier `lecture-facilitee` (phase 0 validée le 2026-11-19, D1 à D3) :
 * - le texte du contenu (`<main>`) passe en Luciole, lettres et lignes un peu plus
 *   espacées : règles `html.lecture-facilitee` de `app.css` ;
 * - les formules passent au jeu Luciole Math (`mathlive-fonts.ts`) ;
 * - menus et en-tête inchangés ; se cumule avec la taille du texte (`fontSize`).
 *
 * Éteint par défaut, gardé dans le navigateur sous `easyReading`. Si la police ne se
 * charge pas, le texte retombe sur la police habituelle (liste de repli du CSS).
 */

export const EASY_READING_CLASS = 'lecture-facilitee';
const STORAGE_KEY = 'easyReading';

export function createEasyReadingStore() {
	const stored = browser && readStored();
	let enabled = $state(stored);
	// Rien à faire éteint : le jeu KaTeX est celui du démarrage
	if (stored) updateDOM();

	function readStored(): boolean {
		try {
			return localStorage.getItem(STORAGE_KEY) === 'true';
		} catch {
			return false;
		}
	}

	function updateDOM() {
		if (!browser) return;
		document.documentElement.classList.toggle(EASY_READING_CLASS, enabled);
		void switchMathFonts(enabled ? 'luciole' : 'katex');
	}

	function toggle() {
		enabled = !enabled;
		updateDOM();
		try {
			localStorage.setItem(STORAGE_KEY, String(enabled));
		} catch {
			// Stockage bloqué (navigation privée) : le réglage vaut pour la page ouverte
		}
	}

	return {
		get enabled() {
			return enabled;
		},
		/** Jeu de polices des maths qui correspond au réglage */
		get mathFontSet(): MathFontSet {
			return enabled ? 'luciole' : 'katex';
		},
		toggle
	};
}

export const easyReading = createEasyReadingStore();
