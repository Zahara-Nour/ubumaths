/**
 * Atelier — la pile Annuler / Rétablir (lot 5 de la refonte)
 *
 * Une étape garde deux PHOTOS de l'atelier, avant et après le geste (phase 0
 * `docs/wip/atelier-annuler-retablir-phase0.md`, Q1 : des photos, pas des
 * opérations inverses). Ce module ne sait rien de l'atelier : une photo est
 * une chaîne, comparée telle quelle.
 *
 * Plafond (Q6) : 100 étapes et 5 Mo au total, la plus ancienne oubliée
 * au-delà — jamais la dernière, même plus grosse que le plafond.
 *
 * @module atelier/history-stack
 */

// =============================================================================
// Types
// =============================================================================

/** Une étape : ce que l'élève a fait, et l'atelier avant et après. */
export interface HistoryStep {
	readonly id: number;
	/** Pour l'infobulle et l'annonce : « supprimer f », « couleur de g »… */
	readonly label: string;
	readonly before: string;
	readonly after: string;
}

export interface HistoryLimits {
	readonly maxSteps: number;
	/** Somme des longueurs des photos des étapes annulables. */
	readonly maxChars: number;
}

// =============================================================================
// Constantes
// =============================================================================

export const DEFAULT_HISTORY_LIMITS: HistoryLimits = { maxSteps: 100, maxChars: 5_000_000 };

// =============================================================================
// Pile
// =============================================================================

export class HistoryStack {
	readonly #limits: HistoryLimits;
	#undo: HistoryStep[] = [];
	#redo: HistoryStep[] = [];
	#nextId = 1;
	/** Le geste continu en cours, et l'étape où ses écritures se fondent. */
	#openGesture: string | null = null;
	#openId: number | null = null;

	constructor(limits: HistoryLimits = DEFAULT_HISTORY_LIMITS) {
		this.#limits = limits;
	}

	/**
	 * Garder une étape ; rend son identifiant, ou `null` si elle n'a rien changé.
	 * Ce qui restait à rétablir est oublié, comme partout.
	 *
	 * `gesture` : la clé d'un geste continu (un curseur glissé, un champ tapé,
	 * PR 2). Tant que le geste n'est pas fermé (`seal`), ses écritures se fondent
	 * dans UNE étape — la photo d'avant reste celle du début du geste. Un geste
	 * revenu à son point de départ ne laisse rien.
	 */
	push(step: Omit<HistoryStep, 'id'>, gesture?: string): number | null {
		const top = this.#undo.at(-1);
		if (
			gesture !== undefined &&
			top !== undefined &&
			this.#openGesture === gesture &&
			top.id === this.#openId &&
			top.after === step.before
		) {
			this.#redo = [];
			if (top.before === step.after) {
				this.#undo.pop();
				this.#seal();
				return null;
			}
			const merged: HistoryStep = { ...top, after: step.after };
			this.#undo[this.#undo.length - 1] = merged;
			this.#trim();
			return merged.id;
		}
		this.#seal();
		if (step.before === step.after) return null;
		const kept: HistoryStep = { id: this.#nextId++, ...step };
		this.#undo.push(kept);
		this.#redo = [];
		this.#trim();
		if (gesture !== undefined) {
			this.#openGesture = gesture;
			this.#openId = kept.id;
		}
		return kept.id;
	}

	/** Fermer le geste en cours : la prochaine écriture fera une nouvelle étape. */
	seal(): void {
		this.#seal();
	}

	/** L'étape à défaire (l'appelant remet sa photo `before`), ou `null`. */
	undo(): HistoryStep | null {
		this.#seal();
		const step = this.#undo.pop();
		if (step === undefined) return null;
		this.#redo.push(step);
		return step;
	}

	/** L'étape à refaire (l'appelant remet sa photo `after`), ou `null`. */
	redo(): HistoryStep | null {
		this.#seal();
		const step = this.#redo.pop();
		if (step === undefined) return null;
		this.#undo.push(step);
		return step;
	}

	clear(): void {
		this.#undo = [];
		this.#redo = [];
		this.#seal();
	}

	#seal(): void {
		this.#openGesture = null;
		this.#openId = null;
	}

	get undoLabel(): string | null {
		return this.#undo.at(-1)?.label ?? null;
	}

	get redoLabel(): string | null {
		return this.#redo.at(-1)?.label ?? null;
	}

	/** Le nombre d'étapes annulables. */
	get size(): number {
		return this.#undo.length;
	}

	/** L'étape qu'Annuler défera : le toast d'une suppression vérifie que c'est la sienne. */
	get topId(): number | null {
		return this.#undo.at(-1)?.id ?? null;
	}

	/** Les plus anciennes d'abord, la dernière jamais. */
	#trim(): void {
		while (this.#undo.length > this.#limits.maxSteps) this.#undo.shift();
		while (this.#undo.length > 1 && this.#size() > this.#limits.maxChars) this.#undo.shift();
	}

	#size(): number {
		let total = 0;
		for (const step of this.#undo) total += step.before.length + step.after.length;
		return total;
	}
}
