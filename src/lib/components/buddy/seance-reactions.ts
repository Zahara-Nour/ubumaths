/**
 * Réactions du Palotin en séance (chantier `palotins`, partie C)
 * ===============================================================
 *
 * Décisions de David du 2026-11-11 (docs/wip/palotins-progress.md, C1 à C14) :
 *   - 5 réussites d'affilée → exclamation (banque `correct`) ;
 *   - 3 erreurs sur la même notion → encouragement (banque `incorrect`), sans
 *     indice ; une question sans notion n'y compte pas ;
 *   - au plus une réaction par séance, le premier déclencheur gagne ;
 *   - jamais pendant une question : la question suivante attend la fin du
 *     passage (~3 s) ; jamais sur la dernière (la fin de séance = le gain).
 *
 * La séance (Entraînement, révision) compte ; `PalotinPresence`, monté par le
 * layout racine pour un élève qui a un Palotin, joue le passage. Sans lui
 * (visiteur, prof, Palotin illisible), rien n'attend.
 */

// Types
export type SeanceReaction = 'streak' | 'struggle';

export interface SeanceAnswer {
	correct: boolean;
	/** Notion du modèle de questions (`classification_node_id`), `null` sinon */
	notionId: string | null;
}

type ReactionHandler = (reaction: SeanceReaction) => Promise<void>;

// Constantes
/** Réussites d'affilée pour l'exclamation */
export const STREAK_LENGTH = 5;
/** Erreurs sur une même notion pour l'encouragement */
export const STRUGGLE_COUNT = 3;
/** Durée de la réplique en séance (l'entrée et la sortie en plus) */
export const SEANCE_PASSAGE_DURATION = 3_000;

// Variables
/** Le Palotin prêt à passer en séance ; `null` = personne ne réagit */
let handler: ReactionHandler | null = null;

// Functions
/** Compte les réponses d'une séance ; rend la réaction à jouer, une fois au plus. */
export function createSeanceTracker() {
	let reacted = false;
	let streak = 0;
	const errorsByNotion = new Map<string, number>();

	return {
		record(answer: SeanceAnswer): SeanceReaction | null {
			if (reacted) return null;
			if (answer.correct) {
				streak += 1;
				if (streak < STREAK_LENGTH) return null;
				reacted = true;
				return 'streak';
			}
			streak = 0;
			if (answer.notionId === null) return null;
			const errors = (errorsByNotion.get(answer.notionId) ?? 0) + 1;
			errorsByNotion.set(answer.notionId, errors);
			if (errors < STRUGGLE_COUNT) return null;
			reacted = true;
			return 'struggle';
		}
	};
}

/** Le Palotin se déclare prêt à réagir ; rend de quoi se retirer. */
export function registerSeanceReactionHandler(next: ReactionHandler): () => void {
	handler = next;
	return () => {
		if (handler === next) handler = null;
	};
}

/** Joue une réaction ; la promesse se résout quand le Palotin est reparti. */
export function playSeanceReaction(reaction: SeanceReaction): Promise<void> {
	return handler ? handler(reaction) : Promise.resolve();
}

/**
 * Ce qu'une séance appelle après chaque réponse corrigée. `null` : rien à
 * jouer, la question suivante arrive comme d'habitude ; sinon la promesse se
 * résout quand elle peut arriver.
 */
export function createSeanceReactions() {
	const tracker = createSeanceTracker();
	return {
		afterAnswer(answer: SeanceAnswer & { isLast?: boolean }): Promise<void> | null {
			if (answer.isLast) return null;
			const reaction = tracker.record(answer);
			return reaction ? playSeanceReaction(reaction) : null;
		}
	};
}
