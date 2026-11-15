/**
 * FSRS (Free Spaced Repetition Scheduler)
 * =======================================
 *
 * FSRS-6 tel que publié (open-spaced-repetition, « The Algorithm », FSRS-6),
 * vérifié contre l'implémentation de référence `ts-fsrs` (`fsrs-reference.test.ts`).
 *
 * Modèle DSR : difficulté D (1-10), stabilité S (jours), récupérabilité R.
 * L'écart entre deux révisions se compte en **jours civils à Paris** (entiers) :
 * 0 = même jour → formule court terme (`w[17]`, `w[18]`, `w[19]`).
 *
 * @example
 * ```typescript
 * const fsrs = new FSRS();
 * const card = fsrs.initCard(userId, 'template', templateId);
 * const updated = fsrs.reviewCard(card, Grade.GOOD);
 * ```
 */

import { DEFAULT_FSRS_PARAMS, DEFAULT_DESIRED_RETENTION, DEFAULT_MAXIMUM_INTERVAL } from './config';
import type { CardStats, Grade, CardState, ReviewHistoryEntry } from './types';

// Types
type CardInput = CardStats | Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'>;

// Constantes
const DAY_MS = 24 * 60 * 60 * 1000;
/** Bornes de la stabilité (celles de FSRS-6) */
const S_MIN = 0.001;
const S_MAX = 36500;
/** Jour civil des élèves (le même que `best-of-day.ts`) */
const PARIS_DAY = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

// Functions
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Numéro du jour civil à Paris (jours depuis l'époque) */
function parisDayNumber(date: Date): number {
	const [year, month, day] = PARIS_DAY.format(date).split('-').map(Number);
	return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Jours civils entiers entre deux instants, jamais négatif */
function civilDaysBetween(from: Date, to: Date): number {
	return Math.max(0, parisDayNumber(to) - parisDayNumber(from));
}

/**
 * FSRS Scheduler Class
 */
export class FSRS {
	/** Paramètres FSRS-6 (21 valeurs) */
	private w: number[];

	/** Rétention visée (0,7 - 0,97) */
	private desiredRetention: number;

	/** Exposant de la courbe d'oubli (−w[20]) */
	private decay: number;

	/** Facteur qui donne R = 0,9 quand t = S */
	private factor: number;

	/** Intervalle maximal en jours */
	private maxInterval: number;

	/**
	 * @param parameters - paramètres FSRS-6 (défaut : DEFAULT_FSRS_PARAMS)
	 * @param desiredRetention - rétention visée (défaut : 0,9)
	 * @param maximumInterval - intervalle maximal en jours (défaut : 36 500)
	 */
	constructor(
		parameters: number[] = DEFAULT_FSRS_PARAMS,
		desiredRetention: number = DEFAULT_DESIRED_RETENTION,
		maximumInterval: number = DEFAULT_MAXIMUM_INTERVAL
	) {
		if (parameters.length !== 21) {
			throw new Error('FSRS parameters must have exactly 21 values');
		}

		if (desiredRetention < 0.7 || desiredRetention > 0.97) {
			throw new Error('Desired retention must be between 0.7 and 0.97');
		}

		this.w = parameters;
		this.desiredRetention = desiredRetention;
		this.decay = -parameters[20];
		this.factor = Math.pow(0.9, 1 / this.decay) - 1;
		this.maxInterval = maximumInterval;
	}

	/**
	 * Fiche neuve
	 */
	initCard(
		userId: string,
		cardReferenceType: 'template' | 'custom',
		cardReferenceId: string
	): Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'> {
		const now = new Date().toISOString();

		return {
			userId,
			cardReferenceType,
			cardReferenceId,
			difficulty: 5, // fixée à la première révision (difficulté initiale de la note)
			stability: 0, // fixée à la première révision
			state: 'new',
			lastReview: null,
			nextReview: now, // due tout de suite
			totalReviews: 0,
			reviewHistory: []
		};
	}

	/** Courbe d'oubli FSRS-6 : R = (1 + facteur · t / S)^decay */
	private forgettingCurve(elapsedDays: number, stability: number): number {
		return Math.pow(1 + (this.factor * elapsedDays) / stability, this.decay);
	}

	/**
	 * Récupérabilité R (probabilité de se souvenir) à l'instant `now`, écart en jours décimaux
	 */
	calculateRetrievability(card: CardInput, now: Date = new Date()): number {
		if (!card.lastReview || card.stability <= 0) {
			return 1; // fiche neuve
		}

		const elapsedDays = Math.max(0, (now.getTime() - new Date(card.lastReview).getTime()) / DAY_MS);
		return clamp(this.forgettingCurve(elapsedDays, card.stability), 0, 1);
	}

	/** Stabilité initiale : w[note − 1] */
	private initialStability(grade: Grade): number {
		return clamp(this.w[grade - 1], S_MIN, S_MAX);
	}

	/** Difficulté initiale : w[4] − e^(w[5]·(note − 1)) + 1 */
	private initialDifficulty(grade: Grade): number {
		return this.w[4] - Math.exp(this.w[5] * (grade - 1)) + 1;
	}

	/**
	 * Difficulté après une révision : ΔD = −w[6]·(note − 3), amorti par (10 − D)/9,
	 * puis retour vers la difficulté initiale de « Facile » (poids w[7])
	 */
	private nextDifficulty(difficulty: number, grade: Grade): number {
		const delta = -this.w[6] * (grade - 3);
		const damped = difficulty + (delta * (10 - difficulty)) / 9;
		const reverted = this.w[7] * this.initialDifficulty(4) + (1 - this.w[7]) * damped;
		return clamp(reverted, 1, 10);
	}

	/** Stabilité après un rappel réussi (Difficile : ×w[15] ; Facile : ×w[16]) */
	private recallStability(d: number, s: number, r: number, grade: Grade): number {
		const hardPenalty = grade === 2 ? this.w[15] : 1;
		const easyBonus = grade === 4 ? this.w[16] : 1;
		const increase =
			Math.exp(this.w[8]) *
			(11 - d) *
			Math.pow(s, -this.w[9]) *
			(Math.exp((1 - r) * this.w[10]) - 1) *
			hardPenalty *
			easyBonus;
		return clamp(s * (1 + increase), S_MIN, S_MAX);
	}

	/** Stabilité après un oubli, plafonnée à S / e^(w[17]·w[18]) */
	private forgetStability(d: number, s: number, r: number): number {
		const afterFail =
			this.w[11] *
			Math.pow(d, -this.w[12]) *
			(Math.pow(s + 1, this.w[13]) - 1) *
			Math.exp((1 - r) * this.w[14]);
		const ceiling = s / Math.exp(this.w[17] * this.w[18]);
		return clamp(Math.min(afterFail, ceiling), S_MIN, S_MAX);
	}

	/** Stabilité après une révision le même jour (court terme) */
	private shortTermStability(s: number, grade: Grade): number {
		const increase = Math.pow(s, -this.w[19]) * Math.exp(this.w[17] * (grade - 3 + this.w[18]));
		const masked = grade >= 2 ? Math.max(increase, 1) : increase;
		return clamp(s * masked, S_MIN, S_MAX);
	}

	/**
	 * Intervalle en jours pour la rétention visée : I = S / facteur · (r^(1/decay) − 1)
	 */
	calculateInterval(stability: number): number {
		const interval =
			(stability / this.factor) * (Math.pow(this.desiredRetention, 1 / this.decay) - 1);

		return Math.max(1, Math.min(this.maxInterval, Math.round(interval)));
	}

	/**
	 * Révise une fiche — MÉTHODE PRINCIPALE
	 *
	 * @param card - fiche actuelle
	 * @param grade - note (1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
	 * @param timeSpent - temps passé (secondes, facultatif)
	 * @param now - instant de la révision (défaut : maintenant)
	 * @returns fiche mise à jour
	 */
	reviewCard(
		card: CardInput,
		grade: Grade,
		timeSpent?: number,
		now: Date = new Date()
	): Omit<CardStats, 'id' | 'createdAt' | 'updatedAt'> {
		const nowISO = now.toISOString();
		const lastReview = card.lastReview ? new Date(card.lastReview) : null;
		const isNew = lastReview === null || !(card.stability > 0);

		// Écart réel (historique) et écart en jours civils (algorithme)
		const elapsedDays = lastReview ? (now.getTime() - lastReview.getTime()) / DAY_MS : 0;
		const t = lastReview ? civilDaysBetween(lastReview, now) : 0;

		let newStability: number;
		let newDifficulty: number;
		let retrievability = 1;

		if (isNew) {
			newStability = this.initialStability(grade);
			newDifficulty = clamp(this.initialDifficulty(grade), 1, 10);
		} else {
			const s = clamp(card.stability, S_MIN, S_MAX);
			const d = clamp(Number.isFinite(card.difficulty) ? card.difficulty : 5, 1, 10);
			retrievability = this.forgettingCurve(t, s);

			if (t === 0) newStability = this.shortTermStability(s, grade);
			else if (grade === 1) newStability = this.forgetStability(d, s, retrievability);
			else newStability = this.recallStability(d, s, retrievability, grade);

			newDifficulty = this.nextDifficulty(d, grade);
		}

		// Échec → relearning ; neuve réussie → learning (une révision) ; sinon réussite → review
		let newState: CardState;
		if (grade === 1) newState = 'relearning';
		else if (card.state === 'new') newState = 'learning';
		else newState = 'review';

		const interval = this.calculateInterval(newStability);
		const nextReviewDate = new Date(now.getTime() + interval * DAY_MS);

		const historyEntry: ReviewHistoryEntry = {
			date: nowISO,
			grade,
			elapsedDays,
			retrievability,
			timeSpent
		};

		return {
			...card,
			difficulty: newDifficulty,
			stability: newStability,
			state: newState,
			lastReview: nowISO,
			nextReview: nextReviewDate.toISOString(),
			totalReviews: card.totalReviews + 1,
			reviewHistory: [...card.reviewHistory, historyEntry]
		};
	}

	/**
	 * Check if a card is due for review
	 *
	 * @param card - Card stats
	 * @returns True if card should be reviewed now
	 */
	isDue(card: CardStats): boolean {
		if (!card.nextReview) return true;
		return new Date(card.nextReview) <= new Date();
	}

	/**
	 * Get days until next review (negative if overdue)
	 *
	 * @param card - Card stats
	 * @returns Days until due (negative if overdue)
	 */
	getDaysUntilDue(card: CardStats): number {
		if (!card.nextReview) return 0;

		const now = Date.now();
		const nextReview = new Date(card.nextReview).getTime();
		const diffMs = nextReview - now;

		return diffMs / (1000 * 60 * 60 * 24);
	}

	/**
	 * Get configuration summary
	 *
	 * @returns Configuration object
	 */
	getConfig() {
		return {
			parameters: this.w,
			desiredRetention: this.desiredRetention,
			decay: this.decay,
			maxInterval: this.maxInterval
		};
	}
}

/**
 * Create a default FSRS instance
 *
 * @param desiredRetention - Target retention (default: 0.9)
 * @returns FSRS instance with default parameters
 */
export function createDefaultFSRS(desiredRetention?: number): FSRS {
	return new FSRS(DEFAULT_FSRS_PARAMS, desiredRetention);
}
