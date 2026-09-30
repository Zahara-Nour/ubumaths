/**
 * Minuteur du défilement automatique (autoSlide) d'un diaporama.
 *
 * Indépendant du DOM et du DeckStore : le Deck lui décrit, à chaque changement,
 * la diapositive courante (clé), sa durée, et l'état pause / vue d'ensemble.
 * Le minuteur tient une mémoire par diapositive (temps restant, terminée ou non)
 * et rappelle :
 * - `onexpire` quand le compte de la diapositive courante arrive à 0 ;
 * - `onrevisitfinished` quand on revient sur une diapositive déjà terminée
 *   (le Deck met alors en pause ; la reprise la relance pour sa durée complète).
 */

// Période de rafraîchissement du temps restant affiché (ms)
const TICK_MS = 100;
/** Raccourcir une diapositive en cours lui laisse au moins ce temps (ms) */
const MIN_REMAINING_AFTER_SHORTEN_MS = 1000;

export interface AutoSlideInput {
	/** Identifiant de la diapositive courante (ex. « h-v ») */
	key: string;
	/** Durée de la diapositive courante en ms (0 = pas de défilement) */
	duration: number;
	/** Deck en pause */
	paused: boolean;
	/** Deck en vue d'ensemble */
	overview: boolean;
}

export interface AutoSlideUpdateOptions {
	/**
	 * Le changement de diapositive vient de l'expiration du minuteur (et non de
	 * l'utilisateur) : une diapositive déjà terminée est rejouée, sans pause
	 */
	automatic?: boolean;
}

export interface AutoSlideTimerOptions {
	/** Le compte de la diapositive courante vient d'arriver à 0 */
	onexpire: () => void;
	/** Retour sur une diapositive déjà terminée : le deck doit se mettre en pause */
	onrevisitfinished: () => void;
}

export interface AutoSlideTimer {
	/** Temps restant de la diapositive courante (ms, 0 si pas de défilement) */
	readonly remaining: number;
	/** Durée de la diapositive courante (ms, 0 si pas de défilement) */
	readonly duration: number;
	/** Le compte avance-t-il en ce moment ? */
	readonly running: boolean;
	/** Décrit l'état courant du deck (idempotent) */
	update(input: AutoSlideInput, updateOptions?: AutoSlideUpdateOptions): void;
	/** Relance la diapositive courante pour sa durée complète */
	restartCurrent(): void;
	/** Arrête tout minuteur en cours */
	destroy(): void;
}

// Mémoire d'une diapositive déjà vue
interface Entry {
	remaining: number;
	/** Durée avec laquelle `remaining` a été calculé */
	duration: number;
	finished: boolean;
}

export function createAutoSlideTimer(options: AutoSlideTimerOptions): AutoSlideTimer {
	const memory = new Map<string, Entry>();
	let input: AutoSlideInput | null = null;
	let entry: Entry | null = null;
	// Instant du dernier « commit » du temps écoulé, null si le compte est arrêté
	let startedAt: number | null = null;
	let handle: ReturnType<typeof setTimeout> | null = null;

	// État exposé (réactif)
	let remaining = $state(0);
	let duration = $state(0);
	let running = $state(false);

	function publish(): void {
		remaining = entry ? entry.remaining : 0;
		duration = entry ? entry.duration : 0;
		running = startedAt !== null;
	}

	// Reporte le temps écoulé depuis `startedAt` dans l'entrée courante
	function commit(): void {
		if (!entry || startedAt === null) return;
		const now = Date.now();
		entry.remaining = Math.max(0, entry.remaining - (now - startedAt));
		startedAt = now;
	}

	function stop(): void {
		commit();
		startedAt = null;
		if (handle !== null) {
			clearTimeout(handle);
			handle = null;
		}
	}

	function schedule(): void {
		if (!entry) return;
		handle = setTimeout(onTick, Math.min(entry.remaining, TICK_MS));
	}

	function onTick(): void {
		handle = null;
		if (!entry || startedAt === null) return;
		commit();
		if (entry.remaining <= 0) {
			entry.remaining = 0;
			entry.finished = true;
			startedAt = null;
			publish();
			options.onexpire();
			return;
		}
		publish();
		schedule();
	}

	function startIfEligible(): void {
		if (!input || !entry || entry.finished || input.paused || input.overview) return;
		startedAt = Date.now();
		schedule();
	}

	/**
	 * Entrée mémoire de `key` pour la durée `newDuration`.
	 * Une durée qui a changé depuis le dernier calcul décale le temps restant
	 * du même écart. Raccourcir ne fait jamais expirer la diapositive sur-le-champ :
	 * il lui reste au moins `MIN_REMAINING_AFTER_SHORTEN_MS`, ou son temps restant
	 * s'il est déjà plus court. Durée 0 : pas de défilement, mémoire oubliée.
	 */
	function reconcile(key: string, newDuration: number): Entry | null {
		if (newDuration <= 0) {
			memory.delete(key);
			return null;
		}
		let e = memory.get(key);
		if (!e) {
			e = { remaining: newDuration, duration: newDuration, finished: false };
			memory.set(key, e);
		} else if (e.duration !== newDuration) {
			if (!e.finished) {
				const floor = Math.min(e.remaining, MIN_REMAINING_AFTER_SHORTEN_MS);
				e.remaining = Math.max(floor, e.remaining + newDuration - e.duration);
			}
			e.duration = newDuration;
		}
		return e;
	}

	function update(next: AutoSlideInput, updateOptions: AutoSlideUpdateOptions = {}): void {
		stop();

		const keyChanged = input === null || input.key !== next.key;
		const resumed = !keyChanged && input !== null && input.paused && !next.paused;

		entry = reconcile(next.key, next.duration);
		input = { ...next };

		if (entry?.finished) {
			if (keyChanged && updateOptions.automatic) {
				// Avance automatique sur une diapositive terminée : rejouée en entier
				entry.remaining = entry.duration;
				entry.finished = false;
			} else if (keyChanged) {
				// Retour sur une diapositive terminée : pause, pas d'avance immédiate
				publish();
				options.onrevisitfinished();
				return;
			}
			if (resumed) {
				// Reprise sur une diapositive terminée : durée complète
				entry.remaining = entry.duration;
				entry.finished = false;
			}
		}

		startIfEligible();
		publish();
	}

	function restartCurrent(): void {
		if (!input || !entry) return;
		stop();
		entry.remaining = entry.duration;
		entry.finished = false;
		startIfEligible();
		publish();
	}

	function destroy(): void {
		stop();
		startedAt = null;
		publish();
	}

	return {
		get remaining() {
			return remaining;
		},
		get duration() {
			return duration;
		},
		get running() {
			return running;
		},
		update,
		restartCurrent,
		destroy
	};
}
