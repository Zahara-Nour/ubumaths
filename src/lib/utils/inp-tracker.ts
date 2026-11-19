/**
 * Calcul de l'INP (Interaction to Next Paint) à partir des entrées `event`
 * de la Performance API, comme le navigateur le définit :
 *
 * - seuls les événements d'une interaction comptent (`interactionId` non nul) :
 *   survol, défilement… n'en ont pas ;
 * - une interaction (pointerdown + pointerup + click…) vaut la durée de son
 *   événement le plus lent ;
 * - l'INP est l'interaction la plus lente, en écartant la plus lente par
 *   tranche de 50 interactions (un gel isolé dans une longue visite ne fait
 *   pas l'INP).
 *
 * L'adresse retenue est celle de la page où l'interaction a COMMENCÉ (relevée
 * au pointerdown / keydown), pas celle du moment de l'envoi : un clic lent qui
 * mène à une autre page reste rattaché à la page du clic.
 */

// Types

/** Ce qu'on lit d'une entrée `event` (PerformanceEventTiming) */
export interface InteractionEntry {
	interactionId?: number;
	duration: number;
	name: string;
	startTime: number;
	target?: Element | null;
}

export interface InpResult {
	value: number;
	url: string;
	eventName: string;
	target: string | null;
}

interface Interaction {
	id: number;
	duration: number;
	eventName: string;
	target: string | null;
	url: string;
}

// Constantes

/** Interactions gardées en mémoire (les plus lentes) : assez pour 500 interactions */
const MAX_KEPT = 10;
/** Débuts d'interaction mémorisés pour retrouver l'adresse */
const MAX_STARTS = 50;
/** Marge (ms) entre l'horodatage de l'événement et le début de l'entrée (arrondis) */
const START_TOLERANCE = 1;
/** Longueur maximale de la description de la cible */
const MAX_TARGET_LENGTH = 80;

// Functions

/**
 * Décrit la cible d'une interaction : balise, `id` et `role`. Jamais
 * d'`aria-label` ni de texte : certains portent le nom d'un élève
 * (« Sélectionner l'élève … »), et `error_logs` ne doit pas en recevoir.
 */
export function describeTarget(target: Element | null | undefined): string | null {
	if (!target || typeof target.tagName !== 'string') return null;
	const id = target.getAttribute('id');
	const role = target.getAttribute('role');
	let description = target.tagName.toLowerCase();
	if (id) description += `#${id}`;
	if (role) description += `[role=${role}]`;
	return description.length > MAX_TARGET_LENGTH
		? `${description.slice(0, MAX_TARGET_LENGTH - 1)}…`
		: description;
}

export function createInpTracker() {
	/** Les interactions les plus lentes, de la plus lente à la moins lente */
	let slowest: Interaction[] = [];
	/** Interactions vues (toutes n'atteignent pas le seuil d'observation) */
	const seenIds = new Set<number>();
	/** Débuts d'interaction : instant (horloge des événements) et adresse */
	const starts: { time: number; url: string }[] = [];

	/** Adresse de la page au début de l'interaction qui commence à `startTime` */
	function urlAt(startTime: number, fallback: string): string {
		for (let i = starts.length - 1; i >= 0; i--) {
			if (starts[i].time <= startTime + START_TOLERANCE) return starts[i].url;
		}
		return fallback;
	}

	return {
		/** À appeler au pointerdown / keydown (phase de capture) */
		recordStart(time: number, url: string): void {
			starts.push({ time, url });
			if (starts.length > MAX_STARTS) starts.shift();
		},

		/** Ajoute des entrées `event` ; `currentUrl` sert si aucun début n'est connu */
		add(entries: InteractionEntry[], currentUrl: string): void {
			for (const entry of entries) {
				const id = entry.interactionId;
				if (!id) continue; // pas une interaction
				seenIds.add(id);
				const existing = slowest.find((interaction) => interaction.id === id);
				if (existing) {
					if (entry.duration > existing.duration) {
						existing.duration = entry.duration;
						existing.eventName = entry.name;
						existing.target = describeTarget(entry.target) ?? existing.target;
					}
				} else {
					slowest.push({
						id,
						duration: entry.duration,
						eventName: entry.name,
						target: describeTarget(entry.target),
						url: urlAt(entry.startTime, currentUrl)
					});
				}
			}
			slowest.sort((a, b) => b.duration - a.duration);
			slowest = slowest.slice(0, MAX_KEPT);
		},

		/**
		 * INP courant, ou `null` sans interaction.
		 * `interactionCount` = `performance.interactionCount` quand le navigateur
		 * le donne (il compte aussi les interactions rapides, non observées).
		 */
		current(interactionCount?: number): InpResult | null {
			if (slowest.length === 0) return null;
			const count = Math.max(interactionCount ?? 0, seenIds.size);
			const index = Math.min(Math.floor(count / 50), slowest.length - 1);
			const interaction = slowest[index];
			return {
				value: interaction.duration,
				url: interaction.url,
				eventName: interaction.eventName,
				target: interaction.target
			};
		}
	};
}
