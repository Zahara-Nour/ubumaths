/**
 * Travail après la réponse
 * ========================
 *
 * Certains envois ne doivent pas allonger la réponse : leur durée trahirait ce que la réponse
 * tait (« Mot de passe oublié » d'un enfant : chercher le parent, créer le jeton, appeler
 * Brevo). La tâche est lancée tout de suite, la réponse part sans l'attendre.
 *
 * Sur Vercel, `waitUntil` garde la fonction en vie jusqu'à la fin de la tâche. Ailleurs (dev,
 * tests), il ne fait rien : la tâche tourne quand même, sans garantie de finir si le processus
 * s'arrête.
 */
import { waitUntil } from '@vercel/functions';
import { createServerLogger } from '$lib/utils/logger';

// Constantes

const logger = createServerLogger('server/after-response');

// Functions

/** Laisse `task` finir après la réponse ; une erreur est journalisée, jamais remontée. */
export function runAfterResponse(task: Promise<unknown>, label: string): void {
	const guarded = task.catch((err: unknown) => {
		logger.error(`Tâche après la réponse en échec (${label}) :`, err);
	});
	waitUntil(guarded);
}
