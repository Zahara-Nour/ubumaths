/**
 * Atelier — la fin d'un geste continu (Annuler / Rétablir, lot 5 PR 2)
 *
 * Décision de David : « tout un glissé de curseur = une étape ». L'atelier fond
 * les écritures d'un geste dans une étape (`step(label, run, gesture)`) ; ce
 * module dit QUAND le geste est fini, pour un curseur bits-ui :
 *
 * - à la souris ou au doigt : au relâchement (`onValueCommit` du curseur) ;
 * - au clavier : au RELÂCHEMENT de la touche — une flèche tenue (répétition
 *   automatique) est un seul geste, deux appuis sont deux étapes. bits-ui
 *   appelle `onValueCommit` à chaque `keydown`, répétitions comprises : tant
 *   qu'une touche est enfoncée, il ne ferme rien ;
 * - quand le curseur perd le focus, par sûreté.
 *
 * ⚠️ `keydown` se branche en CAPTURE (`onkeydowncapture`) sur le conteneur du
 * curseur : bits-ui appelle `onValueCommit` dans le `keydown` du pouce, AVANT
 * qu'un gestionnaire ordinaire du conteneur ne l'apprenne — la première
 * répétition d'une flèche tenue fermait sinon le geste (mesuré).
 *
 * @module atelier/gesture
 */

export interface GestureHandlers {
	/** `onValueCommit` du curseur */
	readonly commit: () => void;
	readonly keydown: () => void;
	readonly keyup: () => void;
	readonly focusout: () => void;
}

/** Les gestionnaires d'un curseur : `end` ferme le geste (`atelier.endGesture`). */
export function gestureHandlers(end: () => void): GestureHandlers {
	let keyHeld = false;
	return {
		commit: () => {
			if (!keyHeld) end();
		},
		keydown: () => {
			keyHeld = true;
		},
		keyup: () => {
			keyHeld = false;
			end();
		},
		focusout: () => {
			keyHeld = false;
			end();
		}
	};
}
