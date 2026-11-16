/**
 * Rejeu d'une fiche de mémoire (calcul pur, sans base)
 * ====================================================
 *
 * Chantier `fsrs`, PR 2 (phase 0 validée par David le 2026-11-16, docs/wip/fsrs-progress.md) :
 * les fiches écrites par l'ancien algorithme (difficulté bloquée à 10, stabilité 0 après un
 * premier échec…) repartent d'une fiche neuve et rejouent leur historique, dans l'ordre, avec
 * l'algorithme actuel (`FSRS.reviewCard(note, temps, date)`).
 *
 * Écrit : difficulté, stabilité, état, prochaine révision, historique (mêmes dates, notes et
 * temps ; écart et récupérabilité recalculés). Inchangés : dernière révision, nombre de
 * révisions. Une fiche sans historique, ou à l'historique illisible, n'est pas touchée.
 */

import { FSRS } from '../../src/lib/srs/fsrs';
import type { CardState, Grade, ReviewHistoryEntry } from '../../src/lib/srs/types';

// ============================================================================
// TYPES
// ============================================================================

/** Ligne `srs_card_stats` lue en base (colonnes utiles au rejeu) */
export interface FicheLue {
	id: string;
	user_id: string;
	card_reference_type: string;
	card_reference_id: string;
	difficulty: number;
	stability: number;
	state: string;
	last_review: string | null;
	next_review: string;
	total_reviews: number;
	review_history: unknown;
	updated_at: string;
}

/** Colonnes écrites par le rejeu */
export interface ValeursRejouees {
	difficulty: number;
	stability: number;
	state: CardState;
	next_review: string;
	review_history: ReviewHistoryEntry[];
}

export type ResultatRejeu =
	| { kind: 'sans-historique' }
	| { kind: 'refusee'; raison: string }
	| { kind: 'inchangee' }
	| { kind: 'rejouee'; apres: ValeursRejouees };

interface EntreeLue {
	date: string;
	instant: Date;
	grade: Grade;
	timeSpent?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Écart toléré dans l'historique (jsonb : flottants 64 bits) */
const EPSILON = 1e-9;
/**
 * Écart relatif toléré sur difficulté et stabilité : colonnes `real` (32 bits), que PostgREST
 * rend à 6 chiffres significatifs (`extra_float_digits = 0`) — écart jusqu'à 5e-6 en relatif.
 */
const EPSILON_REAL = 1e-5;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Entrée d'historique lisible, ou la raison du refus */
function lireEntree(valeur: unknown, rang: number): EntreeLue | string {
	if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) {
		return `entrée ${rang} : pas un objet`;
	}
	const entree = valeur as Record<string, unknown>;
	if ('before' in entree)
		return `entrée ${rang} : état « meilleur du jour » (before), à rejouer à la main`;
	const { date, grade, timeSpent } = entree;
	if (typeof date !== 'string' || Number.isNaN(new Date(date).getTime())) {
		return `entrée ${rang} : date illisible`;
	}
	if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 1 || grade > 4) {
		return `entrée ${rang} : note hors 1-4`;
	}
	if (timeSpent !== undefined && (typeof timeSpent !== 'number' || !Number.isFinite(timeSpent))) {
		return `entrée ${rang} : temps illisible`;
	}
	return { date, instant: new Date(date), grade: grade as Grade, timeSpent };
}

function egaux(a: number, b: number): boolean {
	return Math.abs(a - b) <= EPSILON;
}

/** Égaux à la précision d'une colonne `real` relue par PostgREST */
function egauxReal(lu: number, calcule: number): boolean {
	return Math.abs(lu - calcule) <= EPSILON_REAL * Math.max(1, Math.abs(calcule));
}

function memeInstant(a: string | null, b: string): boolean {
	return a !== null && new Date(a).getTime() === new Date(b).getTime();
}

/** L'historique rejoué porte-t-il déjà les valeurs de la fiche (rejeu déjà fait) ? */
function historiquesEgaux(lu: unknown[], rejoue: ReviewHistoryEntry[]): boolean {
	return rejoue.every((e, i) => {
		const l = lu[i] as Record<string, unknown>;
		return (
			typeof l.elapsedDays === 'number' &&
			typeof l.retrievability === 'number' &&
			egaux(l.elapsedDays, e.elapsedDays) &&
			egaux(l.retrievability, e.retrievability)
		);
	});
}

/** Rejoue une fiche ; ne lit ni n'écrit rien en base */
export function rejouerFiche(fiche: FicheLue, fsrs: FSRS = new FSRS()): ResultatRejeu {
	const historique = fiche.review_history;
	if (!Array.isArray(historique)) return { kind: 'refusee', raison: 'historique illisible' };
	if (historique.length === 0) return { kind: 'sans-historique' };

	const entrees: EntreeLue[] = [];
	for (const [i, valeur] of historique.entries()) {
		const lue = lireEntree(valeur, i + 1);
		if (typeof lue === 'string') return { kind: 'refusee', raison: lue };
		const precedente = entrees.at(-1);
		if (precedente && lue.instant < precedente.instant) {
			return { kind: 'refusee', raison: `entrée ${i + 1} : historique dans le désordre` };
		}
		entrees.push(lue);
	}

	if (fiche.total_reviews !== entrees.length) {
		return {
			kind: 'refusee',
			raison: `${fiche.total_reviews} révisions comptées, ${entrees.length} dans l'historique`
		};
	}
	if (!memeInstant(fiche.last_review, entrees[entrees.length - 1].date)) {
		return { kind: 'refusee', raison: 'dernière révision ≠ dernière date de l’historique' };
	}

	let card = fsrs.initCard(fiche.user_id, 'template', fiche.card_reference_id);
	for (const e of entrees) card = fsrs.reviewCard(card, e.grade, e.timeSpent, e.instant);

	// Mêmes dates (chaîne d'origine), pas de clé `timeSpent` vide
	const reviewHistory: ReviewHistoryEntry[] = card.reviewHistory.map((e, i) => {
		const { timeSpent, ...reste } = e;
		return { ...reste, date: entrees[i].date, ...(timeSpent === undefined ? {} : { timeSpent }) };
	});

	const apres: ValeursRejouees = {
		difficulty: card.difficulty,
		stability: card.stability,
		state: card.state,
		next_review: card.nextReview,
		review_history: reviewHistory
	};

	const dejaRejouee =
		egauxReal(fiche.difficulty, apres.difficulty) &&
		egauxReal(fiche.stability, apres.stability) &&
		fiche.state === apres.state &&
		memeInstant(fiche.next_review, apres.next_review) &&
		historiquesEgaux(historique, reviewHistory);
	return dejaRejouee ? { kind: 'inchangee' } : { kind: 'rejouee', apres };
}
