/**
 * Interpréteur des blocs tortue (ADR 0039) : parcourt l'état sérialisé d'un espace de travail
 * Blockly (`Blockly.serialization.workspaces.save`) et applique chaque bloc connu. Aucun code
 * n'est généré ni évalué : un bloc que l'interpréteur ne connaît pas est refusé.
 *
 * Sans dépendance à Blockly : s'exécute aussi bien dans le navigateur que sous Node (correction).
 */

import { arrondir, type Point, type Segment } from './segments';
import {
	lirePiles as lirePilesDe,
	premierBlocInconnu as premierBlocInconnuDe,
	type BlocLu,
	type BlocsConnus
} from '../lecture';

export type { BlocLu } from '../lecture';

// =============================================================================
// Types
// =============================================================================

export interface EtatTortue extends Point {
	/** Cap en degrés, entre 0 et 360 ; 0 = vers la droite, 90 = vers le haut. */
	cap: number;
	styloBaisse: boolean;
}

export type ErreurTortue =
	| { type: 'bloc-inconnu'; typeBloc: string }
	| { type: 'trop-long' }
	| { type: 'trop-loin' }
	| { type: 'programme-illisible' };

/** État après une instruction qui change la tortue (déplacement, virage, stylo) : sert à l'animation. */
export interface EtapeTortue {
	tortue: EtatTortue;
	/** Nombre de segments tracés après cette étape. */
	segments: number;
}

interface Trace {
	segments: Segment[];
	tortue: EtatTortue;
	etapes: EtapeTortue[];
	pas: number;
}

export type ResultatTortue = ({ ok: true } | { ok: false; erreur: ErreurTortue }) & Trace;

// =============================================================================
// Constantes
// =============================================================================

/** Nombre maximal de pas (blocs exécutés et tours de boucle) avant l'arrêt. */
export const LIMITE_PAS = 10_000;

/** Distance maximale au départ, en carreaux : au-delà, les nombres perdent leur précision. */
export const DISTANCE_MAX = 1_000_000;

/** Blocs d'instruction connus de l'interpréteur. */
const INSTRUCTIONS = new Set([
	'tortue_avancer',
	'tortue_reculer',
	'tortue_gauche',
	'tortue_droite',
	'tortue_lever_stylo',
	'tortue_baisser_stylo',
	'controls_repeat',
	'controls_repeat_ext'
]);

/** Blocs valeur connus de l'interpréteur. */
const VALEURS = new Set(['math_number']);

const MESSAGES: Record<ErreurTortue['type'], string> = {
	'bloc-inconnu': 'Ce bloc n’est pas pris en charge par la tortue.',
	'trop-long': `Programme arrêté après ${LIMITE_PAS.toLocaleString('fr-FR')} pas : il est trop long, ou ne s’arrête pas.`,
	'trop-loin': `La tortue est partie trop loin (plus de ${DISTANCE_MAX.toLocaleString('fr-FR')} carreaux du départ).`,
	'programme-illisible': 'Programme illisible.'
};

// =============================================================================
// Fonctions
// =============================================================================

export function messageErreurTortue(erreur: ErreurTortue): string {
	return MESSAGES[erreur.type];
}

function etatInitial(): EtatTortue {
	return { x: 0, y: 0, cap: 0, styloBaisse: true };
}

/** Blocs connus de la tortue, pour la lecture commune (`lecture.ts`). */
const CONNUS: BlocsConnus = { instructions: INSTRUCTIONS, valeurs: VALEURS };

/**
 * Lit les piles de l'espace de travail, triées de haut en bas (puis de gauche à droite) ; lève
 * une erreur si la forme est fausse. Un nombre posé seul est ignoré.
 */
export function lirePiles(etat: unknown): BlocLu[] {
	return lirePilesDe(etat, VALEURS);
}

/** Premier bloc inconnu de la tortue (instruction ou valeur) d'une pile, blocs désactivés compris. */
export function premierBlocInconnu(
	bloc: BlocLu | undefined,
	attendu: 'instruction' | 'valeur'
): string | null {
	return premierBlocInconnuDe(bloc, attendu, CONNUS);
}

/** Valeur numérique d'une entrée ; une entrée vide vaut 0, comme dans le code généré. */
export function valeur(bloc: BlocLu | undefined): number {
	if (!bloc) return 0;
	const nombre = Number(bloc.champs.NUM);
	return Number.isFinite(nombre) ? nombre : 0;
}

/** Nombre de tours d'une répétition : entier inférieur, jamais négatif. */
export function nombreDeTours(bloc: BlocLu): number {
	const brut =
		bloc.type === 'controls_repeat' ? Number(bloc.champs.TIMES) : valeur(bloc.entrees.TIMES);
	return Number.isFinite(brut) ? Math.max(0, Math.floor(brut)) : 0;
}

class TropLong extends Error {}
class TropLoin extends Error {}

/**
 * Exécute un programme tortue. Ne lève jamais : un état mal formé, un bloc inconnu ou un
 * programme trop long rendent une erreur (avec le tracé partiel dans le dernier cas).
 */
export function executerTortue(etat: unknown): ResultatTortue {
	let piles: BlocLu[];
	try {
		piles = lirePiles(etat);
	} catch {
		return {
			ok: false,
			erreur: { type: 'programme-illisible' },
			segments: [],
			tortue: etatInitial(),
			etapes: [],
			pas: 0
		};
	}

	for (const pile of piles) {
		const inconnu = premierBlocInconnu(pile, 'instruction');
		if (inconnu) {
			return {
				ok: false,
				erreur: { type: 'bloc-inconnu', typeBloc: inconnu },
				segments: [],
				tortue: etatInitial(),
				etapes: [],
				pas: 0
			};
		}
	}

	const tortue = etatInitial();
	const segments: Segment[] = [];
	const etapes: EtapeTortue[] = [];
	let pas = 0;

	function noterEtape(): void {
		etapes.push({ tortue: { ...tortue }, segments: segments.length });
	}

	function compterUnPas(): void {
		if (pas >= LIMITE_PAS) throw new TropLong();
		pas++;
	}

	function deplacer(distance: number): void {
		const radians = (tortue.cap * Math.PI) / 180;
		const de = { x: tortue.x, y: tortue.y };
		const x = arrondir(tortue.x + distance * Math.cos(radians));
		const y = arrondir(tortue.y + distance * Math.sin(radians));
		// Au-delà, Infinity puis NaN fausseraient le tracé ; la tortue reste où elle était
		if (!(Math.hypot(x, y) <= DISTANCE_MAX)) throw new TropLoin();
		tortue.x = x;
		tortue.y = y;
		if (tortue.styloBaisse && (x !== de.x || y !== de.y)) {
			segments.push({ de, a: { x, y } });
		}
	}

	function tourner(angle: number): void {
		tortue.cap = arrondir((((tortue.cap + angle) % 360) + 360) % 360) % 360;
	}

	function executerPile(bloc: BlocLu | undefined): void {
		for (let courant = bloc; courant; courant = courant.suivant) {
			if (!courant.actif) continue;
			compterUnPas();
			switch (courant.type) {
				case 'tortue_avancer':
					deplacer(valeur(courant.entrees.VALEUR));
					break;
				case 'tortue_reculer':
					deplacer(-valeur(courant.entrees.VALEUR));
					break;
				case 'tortue_gauche':
					tourner(valeur(courant.entrees.ANGLE));
					break;
				case 'tortue_droite':
					tourner(-valeur(courant.entrees.ANGLE));
					break;
				case 'tortue_lever_stylo':
					tortue.styloBaisse = false;
					break;
				case 'tortue_baisser_stylo':
					tortue.styloBaisse = true;
					break;
				case 'controls_repeat':
				case 'controls_repeat_ext': {
					const tours = nombreDeTours(courant);
					for (let i = 0; i < tours; i++) {
						// Un tour compte même vide : « répéter 10¹² fois (rien) » s'arrête
						compterUnPas();
						executerPile(courant.entrees.DO);
					}
					// La boucle ne note pas d'étape : ses instructions notent les leurs
					continue;
				}
			}
			noterEtape();
		}
	}

	try {
		for (const pile of piles) executerPile(pile);
	} catch (erreur) {
		const type =
			erreur instanceof TropLong
				? 'trop-long'
				: erreur instanceof TropLoin
					? 'trop-loin'
					: 'programme-illisible';
		return { ok: false, erreur: { type }, segments, tortue, etapes, pas };
	}

	return { ok: true, segments, tortue, etapes, pas };
}
