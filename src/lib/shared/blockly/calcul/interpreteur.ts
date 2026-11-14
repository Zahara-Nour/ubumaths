/**
 * Interpréteur des programmes de calcul en blocs (5e, ADR 0039) : parcourt l'état sérialisé
 * d'un espace de travail Blockly et applique chaque bloc connu, pour un nombre de départ donné
 * (« nombre choisi »). Aucun code n'est généré ni évalué : un bloc inconnu est refusé.
 *
 * Blocs : `calcul_nombre_choisi` (le nombre de départ, lu seulement), `math_number`,
 * `calcul_operation` (+ − × ÷), `calcul_resultat` (l'unique variable, 0 au départ),
 * `calcul_mettre_resultat`, `calcul_afficher`, `controls_repeat(_ext)`.
 *
 * Sans dépendance à Blockly : s'exécute aussi bien dans le navigateur que sous Node (correction).
 */

import {
	lirePiles as lirePilesDe,
	nombreDeTours as nombreDeToursDe,
	premierBlocInconnu as premierBlocInconnuDe,
	valeurNombre,
	type BlocLu,
	type BlocsConnus
} from '../lecture';

// =============================================================================
// Types
// =============================================================================

export type OperationCalcul = 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE';

export type ErreurCalcul =
	| { type: 'bloc-inconnu'; typeBloc: string }
	| { type: 'trop-long' }
	| { type: 'division-par-zero' }
	| { type: 'nombre-trop-grand' }
	| { type: 'programme-illisible' };

interface Sortie {
	/** Nombres affichés, dans l'ordre. */
	affichages: number[];
	pas: number;
}

export type ResultatCalcul = ({ ok: true } | { ok: false; erreur: ErreurCalcul }) & Sortie;

// =============================================================================
// Constantes
// =============================================================================

/** Nombre maximal de pas (blocs exécutés et tours de boucle) avant l'arrêt. */
export const LIMITE_PAS_CALCUL = 10_000;

export const OPERATIONS_CALCUL: readonly OperationCalcul[] = ['ADD', 'MINUS', 'MULTIPLY', 'DIVIDE'];

/** Blocs d'instruction connus de l'interpréteur. */
const INSTRUCTIONS = new Set([
	'calcul_afficher',
	'calcul_mettre_resultat',
	'controls_repeat',
	'controls_repeat_ext'
]);

/** Blocs valeur connus de l'interpréteur. */
const VALEURS = new Set([
	'math_number',
	'calcul_nombre_choisi',
	'calcul_resultat',
	'calcul_operation'
]);

const CONNUS: BlocsConnus = { instructions: INSTRUCTIONS, valeurs: VALEURS };

const MESSAGES: Record<ErreurCalcul['type'], string> = {
	'bloc-inconnu': 'Ce bloc n’est pas pris en charge dans un programme de calcul.',
	'trop-long': `Programme arrêté après ${LIMITE_PAS_CALCUL.toLocaleString('fr-FR')} pas : il est trop long, ou ne s’arrête pas.`,
	'division-par-zero': 'Division par zéro : on ne peut pas diviser par 0.',
	'nombre-trop-grand': 'Un nombre est devenu trop grand pour être calculé.',
	'programme-illisible': 'Programme illisible.'
};

// =============================================================================
// Fonctions
// =============================================================================

export function messageErreurCalcul(erreur: ErreurCalcul): string {
	return MESSAGES[erreur.type];
}

/** Piles de l'espace de travail, de haut en bas ; un calcul posé seul est ignoré. */
export function lirePilesCalcul(etat: unknown): BlocLu[] {
	return lirePilesDe(etat, VALEURS);
}

/** Premier bloc inconnu d'une pile (instruction ou valeur), blocs désactivés compris. */
export function premierBlocInconnuCalcul(
	bloc: BlocLu | undefined,
	attendu: 'instruction' | 'valeur'
): string | null {
	return premierBlocInconnuDe(bloc, attendu, CONNUS);
}

/** Opération d'un bloc `calcul_operation` ; null si le champ est inconnu. */
export function operationDe(bloc: BlocLu): OperationCalcul | null {
	return OPERATIONS_CALCUL.find((op) => op === bloc.champs.OP) ?? null;
}

class TropLong extends Error {}
class DivisionParZero extends Error {}
class TropGrand extends Error {}
class Illisible extends Error {}

/**
 * Exécute un programme de calcul à partir d'un nombre. Ne lève jamais : un état mal formé, un
 * bloc inconnu, une division par zéro ou un programme trop long rendent une erreur (avec les
 * affichages déjà faits).
 */
export function executerCalcul(etat: unknown, nombre: number): ResultatCalcul {
	let piles: BlocLu[];
	try {
		piles = lirePilesCalcul(etat);
	} catch {
		return { ok: false, erreur: { type: 'programme-illisible' }, affichages: [], pas: 0 };
	}

	for (const pile of piles) {
		const inconnu = premierBlocInconnuCalcul(pile, 'instruction');
		if (inconnu) {
			return {
				ok: false,
				erreur: { type: 'bloc-inconnu', typeBloc: inconnu },
				affichages: [],
				pas: 0
			};
		}
	}

	const affichages: number[] = [];
	let resultat = 0;
	let pas = 0;

	function compterUnPas(): void {
		if (pas >= LIMITE_PAS_CALCUL) throw new TropLong();
		pas++;
	}

	function fini(n: number): number {
		if (!Number.isFinite(n)) throw new TropGrand();
		// −0 s'affiche 0
		return n === 0 ? 0 : n;
	}

	function evaluer(bloc: BlocLu | undefined): number {
		// Une entrée vide vaut 0, comme dans le code généré
		if (!bloc) return 0;
		switch (bloc.type) {
			case 'math_number':
				return valeurNombre(bloc);
			case 'calcul_nombre_choisi':
				return nombre;
			case 'calcul_resultat':
				return resultat;
			case 'calcul_operation': {
				const op = operationDe(bloc);
				if (op === null) throw new Illisible();
				const a = evaluer(bloc.entrees.A);
				const b = evaluer(bloc.entrees.B);
				if (op === 'ADD') return fini(a + b);
				if (op === 'MINUS') return fini(a - b);
				if (op === 'MULTIPLY') return fini(a * b);
				if (b === 0) throw new DivisionParZero();
				return fini(a / b);
			}
		}
		throw new Illisible();
	}

	function executerPile(bloc: BlocLu | undefined): void {
		for (let courant = bloc; courant; courant = courant.suivant) {
			if (!courant.actif) continue;
			compterUnPas();
			switch (courant.type) {
				case 'calcul_afficher':
					affichages.push(evaluer(courant.entrees.VALEUR));
					break;
				case 'calcul_mettre_resultat':
					resultat = evaluer(courant.entrees.VALEUR);
					break;
				case 'controls_repeat':
				case 'controls_repeat_ext': {
					const tours = nombreDeToursDe(courant, evaluer);
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
		const type =
			erreur instanceof TropLong
				? 'trop-long'
				: erreur instanceof DivisionParZero
					? 'division-par-zero'
					: erreur instanceof TropGrand
						? 'nombre-trop-grand'
						: 'programme-illisible';
		return { ok: false, erreur: { type }, affichages, pas };
	}

	return { ok: true, affichages, pas };
}
