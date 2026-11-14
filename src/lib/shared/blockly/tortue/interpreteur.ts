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

/** Distance maximale au départ, en carreaux : au-delà, les nombres perdent leur précision. */
export const DISTANCE_MAX = 1_000_000;

/** Imbrication maximale (entrées dans des entrées) : protège la pile d'appels. */
const IMBRICATION_MAX = 1_000;

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

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

class ProgrammeIllisible extends Error {}

/**
 * Lit une pile sérialisée (un bloc et ses suivants, par `next`) ; lève `ProgrammeIllisible` si
 * la forme est fausse. Les suivants sont lus en boucle : seule l'imbrication fait récursion.
 */
function lirePile(brut: unknown, imbrication: number): BlocLu {
	const blocs: BlocLu[] = [];
	let courant: unknown = brut;
	while (courant !== undefined) {
		const { bloc, suivant } = lireBloc(courant, imbrication);
		blocs.push(bloc);
		courant = suivant;
	}
	for (let i = 0; i < blocs.length - 1; i++) blocs[i].suivant = blocs[i + 1];
	return blocs[0];
}

/** Lit un bloc et ses entrées ; rend aussi le bloc suivant, encore brut. */
function lireBloc(brut: unknown, imbrication: number): { bloc: BlocLu; suivant: unknown } {
	if (!estObjet(brut) || typeof brut.type !== 'string' || imbrication > IMBRICATION_MAX) {
		throw new ProgrammeIllisible();
	}

	const entrees: Record<string, BlocLu | undefined> = {};
	if (brut.inputs !== undefined) {
		if (!estObjet(brut.inputs)) throw new ProgrammeIllisible();
		for (const [nom, entree] of Object.entries(brut.inputs)) {
			if (!estObjet(entree)) throw new ProgrammeIllisible();
			const contenu = entree.block ?? entree.shadow;
			entrees[nom] = contenu === undefined ? undefined : lirePile(contenu, imbrication + 1);
		}
	}

	let suivant: unknown;
	if (brut.next !== undefined) {
		if (!estObjet(brut.next)) throw new ProgrammeIllisible();
		suivant = brut.next.block;
	}

	const desactive =
		brut.enabled === false ||
		(Array.isArray(brut.disabledReasons) && brut.disabledReasons.length > 0);

	const bloc: BlocLu = {
		type: brut.type,
		actif: !desactive,
		champs: estObjet(brut.fields) ? brut.fields : {},
		entrees,
		suivant: undefined,
		x: typeof brut.x === 'number' ? brut.x : 0,
		y: typeof brut.y === 'number' ? brut.y : 0
	};
	return { bloc, suivant };
}

/** Lit les piles de l'espace de travail, triées de haut en bas (puis de gauche à droite). */
function lirePiles(etat: unknown): BlocLu[] {
	if (!estObjet(etat)) throw new ProgrammeIllisible();
	if (etat.blocks === undefined) return [];
	if (!estObjet(etat.blocks)) throw new ProgrammeIllisible();
	const blocs = etat.blocks.blocks;
	if (blocs === undefined) return [];
	if (!Array.isArray(blocs)) throw new ProgrammeIllisible();
	return (
		blocs
			.map((bloc) => lirePile(bloc, 0))
			// Un nombre posé seul dans l'espace de travail ne fait rien : ignoré, comme une pile vide
			.filter((pile) => !VALEURS.has(pile.type))
			.sort((a, b) => a.y - b.y || a.x - b.x)
	);
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
