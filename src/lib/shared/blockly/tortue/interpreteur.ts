/**
 * Interpréteur des blocs tortue (ADR 0039) : parcourt l'état sérialisé d'un espace de travail
 * Blockly (`Blockly.serialization.workspaces.save`) et applique chaque bloc connu. Aucun code
 * n'est généré ni évalué : un bloc que l'interpréteur ne connaît pas est refusé.
 *
 * Sans dépendance à Blockly : s'exécute aussi bien dans le navigateur que sous Node (correction).
 */

import { arrondir, type Point, type Segment } from './segments';

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
	| { type: 'programme-illisible' };

export type ResultatTortue =
	| { ok: true; segments: Segment[]; tortue: EtatTortue; pas: number }
	| { ok: false; erreur: ErreurTortue; segments: Segment[]; tortue: EtatTortue; pas: number };

/** Bloc sérialisé, après vérification de forme. */
interface BlocLu {
	type: string;
	actif: boolean;
	champs: Record<string, unknown>;
	/** Entrées valeur ou instructions : le bloc posé, sinon l'ombre. */
	entrees: Record<string, BlocLu | undefined>;
	suivant: BlocLu | undefined;
	x: number;
	y: number;
}

// =============================================================================
// Constantes
// =============================================================================

/** Nombre maximal de pas (blocs exécutés et tours de boucle) avant l'arrêt. */
export const LIMITE_PAS = 10_000;

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

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

class ProgrammeIllisible extends Error {}

/** Lit un bloc sérialisé et ses descendants ; lève `ProgrammeIllisible` si la forme est fausse. */
function lireBloc(brut: unknown, profondeur: number): BlocLu {
	// Une pile de Blockly n'a pas de profondeur réaliste au-delà ; protège la pile d'appels
	if (!estObjet(brut) || typeof brut.type !== 'string' || profondeur > 2_000) {
		throw new ProgrammeIllisible();
	}

	const entrees: Record<string, BlocLu | undefined> = {};
	if (brut.inputs !== undefined) {
		if (!estObjet(brut.inputs)) throw new ProgrammeIllisible();
		for (const [nom, entree] of Object.entries(brut.inputs)) {
			if (!estObjet(entree)) throw new ProgrammeIllisible();
			const contenu = entree.block ?? entree.shadow;
			entrees[nom] = contenu === undefined ? undefined : lireBloc(contenu, profondeur + 1);
		}
	}

	let suivant: BlocLu | undefined;
	if (brut.next !== undefined) {
		if (!estObjet(brut.next)) throw new ProgrammeIllisible();
		suivant = brut.next.block === undefined ? undefined : lireBloc(brut.next.block, profondeur + 1);
	}

	const desactive =
		brut.enabled === false ||
		(Array.isArray(brut.disabledReasons) && brut.disabledReasons.length > 0);

	return {
		type: brut.type,
		actif: !desactive,
		champs: estObjet(brut.fields) ? brut.fields : {},
		entrees,
		suivant,
		x: typeof brut.x === 'number' ? brut.x : 0,
		y: typeof brut.y === 'number' ? brut.y : 0
	};
}

/** Lit les piles de l'espace de travail, triées de haut en bas (puis de gauche à droite). */
function lirePiles(etat: unknown): BlocLu[] {
	if (!estObjet(etat)) throw new ProgrammeIllisible();
	if (etat.blocks === undefined) return [];
	if (!estObjet(etat.blocks)) throw new ProgrammeIllisible();
	const blocs = etat.blocks.blocks;
	if (blocs === undefined) return [];
	if (!Array.isArray(blocs)) throw new ProgrammeIllisible();
	return blocs.map((bloc) => lireBloc(bloc, 0)).sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Premier bloc inconnu (instruction ou valeur) d'une pile, blocs désactivés compris. */
function premierBlocInconnu(
	bloc: BlocLu | undefined,
	attendu: 'instruction' | 'valeur'
): string | null {
	for (let courant = bloc; courant; courant = courant.suivant) {
		const connus = attendu === 'instruction' ? INSTRUCTIONS : VALEURS;
		if (!connus.has(courant.type)) return courant.type;
		for (const [nom, entree] of Object.entries(courant.entrees)) {
			const inconnu = premierBlocInconnu(entree, nom === 'DO' ? 'instruction' : 'valeur');
			if (inconnu) return inconnu;
		}
		if (attendu === 'valeur') return null;
	}
	return null;
}

/** Valeur numérique d'une entrée ; une entrée vide vaut 0, comme dans le code généré. */
function valeur(bloc: BlocLu | undefined): number {
	if (!bloc) return 0;
	const nombre = Number(bloc.champs.NUM);
	return Number.isFinite(nombre) ? nombre : 0;
}

function nombreDeTours(bloc: BlocLu): number {
	const brut =
		bloc.type === 'controls_repeat' ? Number(bloc.champs.TIMES) : valeur(bloc.entrees.TIMES);
	return Number.isFinite(brut) ? Math.max(0, Math.floor(brut)) : 0;
}

class TropLong extends Error {}

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
				pas: 0
			};
		}
	}

	const tortue = etatInitial();
	const segments: Segment[] = [];
	let pas = 0;

	function compterUnPas(): void {
		if (pas >= LIMITE_PAS) throw new TropLong();
		pas++;
	}

	function deplacer(distance: number): void {
		const radians = (tortue.cap * Math.PI) / 180;
		const de = { x: tortue.x, y: tortue.y };
		tortue.x = arrondir(tortue.x + distance * Math.cos(radians));
		tortue.y = arrondir(tortue.y + distance * Math.sin(radians));
		if (tortue.styloBaisse && (tortue.x !== de.x || tortue.y !== de.y)) {
			segments.push({ de, a: { x: tortue.x, y: tortue.y } });
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
					break;
				}
			}
		}
	}

	try {
		for (const pile of piles) executerPile(pile);
	} catch (erreur) {
		if (!(erreur instanceof TropLong)) throw erreur;
		return { ok: false, erreur: { type: 'trop-long' }, segments, tortue, pas };
	}

	return { ok: true, segments, tortue, pas };
}
