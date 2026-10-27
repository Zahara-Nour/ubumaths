/**
 * Bloc ```horloge — types
 * =======================
 *
 * Cadran à aiguilles pour lire l'heure (CP-046, CP-047, puis les minutes au
 * CE1 / CE2 ; phase 0 : `docs/wip/horloge-progress.md`) :
 *
 * ```horloge
 * heure: 8 h 30 ; 8 h 45
 * légendes: Départ ; Arrivée
 * chiffres: quarts
 * graduations: heures
 * ```
 *
 * Le nœud porte les heures lues et les réglages ; le dessin (angles, traits,
 * chiffres) est calculé par `utils/horloge-scene.ts`, partagé écran / PDF.
 *
 * @module ubumark/types/horloge
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/**
 * Taille d'un cadran, en cm : 4 cm par défaut, 3 cm dans un choix de QCM, 6 cm à
 * placer (une minute assez large pour le doigt)
 */
export const HORLOGE_SIZE_CM = { min: 2, max: 8, default: 4, choice: 3, placer: 6 } as const;

/** Nombre de cadrans d'un bloc (durées : départ, arrivée…) */
export const HORLOGE_MAX_CLOCKS = 4;

/** Longueur maximale d'une légende, en caractères */
export const HORLOGE_CAPTION_MAX = 40;

/** Message à l'élève (et dans le PDF) pour un bloc en erreur */
export const HORLOGE_UNAVAILABLE = 'Horloge indisponible';

/**
 * Nom accessible d'un cadran : il ne dit JAMAIS l'heure, sinon un lecteur
 * d'écran donnerait la réponse
 */
export const HORLOGE_ARIA_LABEL = 'Horloge à aiguilles';

export const HORLOGE_NUMBERS = ['tous', 'quarts', 'aucun'] as const;
export const HORLOGE_TICKS = ['minutes', 'heures', 'aucune'] as const;

export type HorlogeNumbers = (typeof HORLOGE_NUMBERS)[number];
export type HorlogeTicks = (typeof HORLOGE_TICKS)[number];

// ============================================================================
// NŒUD
// ============================================================================

/** Une heure affichée : heures de 0 à 23, minutes de 0 à 59 */
export interface HorlogeTime {
	hours: number;
	minutes: number;
}

export interface HorlogeSpec {
	/** 1 à 4 cadrans, dans l'ordre de la ligne `heure:` ; vide pour une horloge à placer */
	times: HorlogeTime[];
	/**
	 * Horloge à placer (`placer:`, une question) : l'heure où l'élève met les
	 * aiguilles ; le cadran est dessiné SANS aiguilles (chantier
	 * `docs/wip/reponses-a-placer-progress.md` § 13, 14)
	 */
	placer?: HorlogeTime;
	/** Une légende par cadran, ou null */
	captions: string[] | null;
	numbers: HorlogeNumbers;
	ticks: HorlogeTicks;
	/** false : la grande aiguille n'est pas dessinée (`minutes: cachées`) */
	minuteHand: boolean;
	/** true : couronne intérieure 13 à 24 (`cadran: 24`) */
	dial24: boolean;
	/** Taille donnée par `taille:` ; null = taille par défaut du contexte */
	sizeCm: number | null;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface HorlogeIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```horloge */
	line?: number;
}

export interface HorlogeNode extends BaseNode {
	type: 'horloge';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: HorlogeSpec | null;
	errors: HorlogeIssue[];
	/** Horloge à placer : sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface HorlogeBlockRange {
	startIndex: number;
	endIndex: number;
}
