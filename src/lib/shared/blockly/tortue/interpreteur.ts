/**
 * Interpréteur des blocs tortue (ADR 0039) : parcourt l'état sérialisé d'un espace de travail
 * Blockly (`Blockly.serialization.workspaces.save`) et applique chaque bloc connu. Aucun code
 * n'est généré ni évalué : un bloc que l'interpréteur ne connaît pas est refusé.
 *
 * Niveaux (`niveau:` d'un bloc ```tortue) : sans niveau (`base`), les blocs tortue, les nombres et
 * les répétitions ; en 4e, en plus, les variables (`variables_set`, `variables_get`,
 * `math_change`), les opérations + − × ÷ dans les entrées et la répétition à nombre de tours
 * calculé (arrondi) ; en 3e, en plus, « si / sinon », comparaisons, ET / OU / NON, « répéter
 * jusqu'à ». Les blocs communs sont exécutés par le moteur des programmes de calcul
 * (`creerMoteur`), mêmes règles : variable jamais mise = 0, 20 variables au plus, noms réservés.
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
import {
	creerMoteur,
	DivisionParZero,
	preparerProgramme,
	TropGrand,
	TropLong,
	VARIABLES_MAX,
	verifierNomDeVariable
} from '../calcul/interpreteur';
import { ecrireSansExposant, toursEntiers } from '../nombres';

export type { BlocLu } from '../lecture';

// =============================================================================
// Types
// =============================================================================

export interface EtatTortue extends Point {
	/** Cap en degrés, entre 0 et 360 ; 0 = vers la droite, 90 = vers le haut. */
	cap: number;
	styloBaisse: boolean;
}

/** `base` : sans `niveau:` (blocs tortue, nombres, répétitions). */
export type NiveauTortue = 'base' | '4e' | '3e';

export type ErreurTortue =
	| { type: 'bloc-inconnu'; typeBloc: string }
	| { type: 'trop-long' }
	| { type: 'trop-loin' }
	| { type: 'division-par-zero' }
	| { type: 'tours-non-entier'; valeur: number }
	| { type: 'programme-illisible' }
	| { type: 'nom-de-variable'; nom: string }
	| { type: 'trop-de-variables' };

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

export const NIVEAUX_TORTUE: readonly NiveauTortue[] = ['base', '4e', '3e'];

/** Niveau où chaque bloc apparaît ; un niveau admet aussi les blocs des niveaux d'avant. */
const NIVEAU_DES_BLOCS: Readonly<Record<string, NiveauTortue>> = {
	tortue_avancer: 'base',
	tortue_reculer: 'base',
	tortue_gauche: 'base',
	tortue_droite: 'base',
	tortue_lever_stylo: 'base',
	tortue_baisser_stylo: 'base',
	controls_repeat: 'base',
	controls_repeat_ext: 'base',
	math_number: 'base',
	variables_set: '4e',
	variables_get: '4e',
	math_change: '4e',
	calcul_operation: '4e',
	calcul_si: '3e',
	calcul_si_sinon: '3e',
	logic_compare: '3e',
	logic_operation: '3e',
	logic_negate: '3e',
	calcul_repeter_jusqua: '3e'
};

/** Blocs d'instruction (les autres sont des valeurs : nombres, calculs, conditions). */
const INSTRUCTIONS: ReadonlySet<string> = new Set([
	'tortue_avancer',
	'tortue_reculer',
	'tortue_gauche',
	'tortue_droite',
	'tortue_lever_stylo',
	'tortue_baisser_stylo',
	'controls_repeat',
	'controls_repeat_ext',
	'variables_set',
	'math_change',
	'calcul_si',
	'calcul_si_sinon',
	'calcul_repeter_jusqua'
]);

/** Blocs valeur de tous les niveaux : une pile qui commence par l'un d'eux est ignorée. */
const VALEURS_TOUTES: ReadonlySet<string> = new Set(
	Object.keys(NIVEAU_DES_BLOCS).filter((type) => !INSTRUCTIONS.has(type))
);

/** Blocs valeur sans niveau. */
const VALEURS = new Set(['math_number']);

const MESSAGES: Record<
	Exclude<ErreurTortue['type'], 'nom-de-variable' | 'tours-non-entier'>,
	string
> = {
	'bloc-inconnu': 'Ce bloc n’est pas pris en charge par la tortue.',
	'trop-long': `Programme arrêté après ${LIMITE_PAS.toLocaleString('fr-FR')} pas : il est trop long, ou ne s’arrête pas.`,
	'trop-loin': `La tortue est partie trop loin (plus de ${DISTANCE_MAX.toLocaleString('fr-FR')} carreaux du départ).`,
	'division-par-zero': 'Division par zéro : on ne peut pas diviser par 0.',
	'programme-illisible': 'Programme illisible.',
	'trop-de-variables': `${VARIABLES_MAX} variables au plus.`
};

// =============================================================================
// Fonctions
// =============================================================================

export function messageErreurTortue(erreur: ErreurTortue): string {
	if (erreur.type === 'nom-de-variable') {
		return verifierNomDeVariable(erreur.nom) ?? `« ${erreur.nom} » : nom de variable refusé.`;
	}
	if (erreur.type === 'tours-non-entier') {
		const valeur = ecrireSansExposant(erreur.valeur).replace('-', '−');
		return `Répéter : le nombre de fois vaut ${valeur}, il faut un nombre entier (0, 1, 2…).`;
	}
	return MESSAGES[erreur.type];
}

/** Niveau où le bloc apparaît ; null pour un bloc inconnu de la tortue. */
export function niveauDuBlocTortue(type: string): NiveauTortue | null {
	return NIVEAU_DES_BLOCS[type] ?? null;
}

/** Le niveau `a` admet-il les blocs du niveau `b` ? */
export function niveauTortueAdmet(a: NiveauTortue, b: NiveauTortue): boolean {
	return NIVEAUX_TORTUE.indexOf(b) <= NIVEAUX_TORTUE.indexOf(a);
}

/** Blocs connus de la tortue au niveau donné. */
export function connusTortue(niveau: NiveauTortue): BlocsConnus {
	const admis = Object.keys(NIVEAU_DES_BLOCS).filter((type) =>
		niveauTortueAdmet(niveau, NIVEAU_DES_BLOCS[type])
	);
	return {
		instructions: new Set(admis.filter((type) => INSTRUCTIONS.has(type))),
		valeurs: new Set(admis.filter((type) => !INSTRUCTIONS.has(type)))
	};
}

/** Le bloc est-il une instruction de la tortue (tous niveaux) ? */
export function estInstructionTortue(type: string): boolean {
	return INSTRUCTIONS.has(type);
}

function etatInitial(): EtatTortue {
	return { x: 0, y: 0, cap: 0, styloBaisse: true };
}

/** Blocs connus de la tortue sans niveau, pour la lecture commune (`lecture.ts`). */
const CONNUS: BlocsConnus = connusTortue('base');

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

class TropLoin extends Error {}

/** Arrêt : le nombre de tours calculé d'une répétition n'est pas un entier ≥ 0. */
class ToursNonEntiers extends Error {
	constructor(readonly valeur: number) {
		super();
	}
}

/**
 * Tours d'une répétition à nombre calculé, à tous les niveaux : entier ≥ 0 (à l'arrondi du calcul
 * près), sinon arrêt — jamais arrondi en silence. Infini : la tortue partirait trop loin.
 */
function toursDeLaTortue(valeur: number): number {
	if (!Number.isFinite(valeur)) throw new TropGrand();
	const tours = toursEntiers(valeur);
	if (tours === null) throw new ToursNonEntiers(valeur);
	return tours;
}

/**
 * Exécute un programme tortue avec les blocs du niveau donné (sans niveau par défaut). Ne lève
 * jamais : un état mal formé, un bloc inconnu ou au-dessus du niveau, un nom de variable refusé,
 * une division par 0, un programme trop long ou une tortue partie trop loin rendent une erreur
 * (avec le tracé partiel dans les derniers cas).
 */
export function executerTortue(etat: unknown, niveau: NiveauTortue = 'base'): ResultatTortue {
	const prepare = preparerProgramme(
		etat,
		niveau === 'base' ? VALEURS : VALEURS_TOUTES,
		connusTortue(niveau)
	);
	if (!prepare.ok) {
		return {
			ok: false,
			erreur: prepare.erreur,
			segments: [],
			tortue: etatInitial(),
			etapes: [],
			pas: 0
		};
	}

	const tortue = etatInitial();
	const segments: Segment[] = [];
	const etapes: EtapeTortue[] = [];

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

	const moteur = creerMoteur(
		prepare.noms,
		{
			instruction(bloc, { evaluer }) {
				switch (bloc.type) {
					case 'tortue_avancer':
						deplacer(evaluer(bloc.entrees.VALEUR));
						break;
					case 'tortue_reculer':
						deplacer(-evaluer(bloc.entrees.VALEUR));
						break;
					case 'tortue_gauche':
						tourner(evaluer(bloc.entrees.ANGLE));
						break;
					case 'tortue_droite':
						tourner(-evaluer(bloc.entrees.ANGLE));
						break;
					case 'tortue_lever_stylo':
						tortue.styloBaisse = false;
						break;
					case 'tortue_baisser_stylo':
						tortue.styloBaisse = true;
						break;
					default:
						return false;
				}
				// Une étape par instruction tortue : les variables et les boucles n'en notent pas
				etapes.push({ tortue: { ...tortue }, segments: segments.length });
				return true;
			},
			toursCalcules: toursDeLaTortue
		},
		LIMITE_PAS
	);

	try {
		for (const pile of prepare.piles) moteur.executerPile(pile);
	} catch (erreur) {
		if (erreur instanceof ToursNonEntiers) {
			const err = { type: 'tours-non-entier' as const, valeur: erreur.valeur };
			return { ok: false, erreur: err, segments, tortue, etapes, pas: moteur.pas() };
		}
		const type =
			erreur instanceof TropLong
				? 'trop-long'
				: erreur instanceof TropLoin || erreur instanceof TropGrand
					? 'trop-loin'
					: erreur instanceof DivisionParZero
						? 'division-par-zero'
						: 'programme-illisible';
		return { ok: false, erreur: { type }, segments, tortue, etapes, pas: moteur.pas() };
	}

	return { ok: true, segments, tortue, etapes, pas: moteur.pas() };
}
