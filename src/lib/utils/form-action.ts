/**
 * Appel manuel d'un form action SvelteKit
 * =======================================
 *
 * ⚠️ Un `fail()` répond en **HTTP 200**.
 *
 * SvelteKit sérialise le verdict dans le CORPS de la réponse
 * (`{ type: 'failure', status: 400, data }`) et laisse le statut HTTP à 200 —
 * cf. `action_json({ type: 'failure', … })`, appelé sans statut, dans
 * `@sveltejs/kit/src/runtime/server/page/actions.js`.
 *
 * Conséquence : `if (response.ok)` est TOUJOURS vrai, y compris sur un refus de
 * validation, un 404 ou une erreur serveur. Une page qui teste `response.ok`
 * annonce donc « succès » puis recharge des données inchangées. Payé en
 * production le 2026-09-16 : l'emploi du temps affichait « Créneau ajouté »
 * alors que le serveur refusait le jour, et rien n'était écrit.
 *
 * `use:enhance` lit bien le corps ; ce helper rend le même service aux appels
 * `fetch` manuels (ceux qui postent sans <form>, ou hors du cycle de la page).
 *
 * @module utils/form-action
 */

import { deserialize } from '$app/forms';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Verdict d'un form action, lu là où il se trouve VRAIMENT.
 */
export type ActionOutcome<T = Record<string, unknown>> =
	| { ok: true; data: T | undefined }
	| { ok: false; message: string };

// ============================================================================
// CONSTANTS
// ============================================================================

/** Message affiché quand l'action échoue sans rien dire d'exploitable. */
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue';

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Extrait un message lisible du `data` d'un `fail()`.
 *
 * Les actions renvoient soit `{ message }`, soit le `{ errors }` de
 * `validateFormData` (`Record<string, string[]>`) — dans ce cas on remonte la
 * première issue Zod, qui nomme le champ fautif.
 */
function extractMessage(data: unknown): string {
	if (!data || typeof data !== 'object') return DEFAULT_ERROR_MESSAGE;

	const { message, errors } = data as { message?: unknown; errors?: unknown };

	if (typeof message === 'string' && message.length > 0) return message;

	if (errors && typeof errors === 'object') {
		for (const issues of Object.values(errors as Record<string, unknown>)) {
			if (Array.isArray(issues) && typeof issues[0] === 'string' && issues[0].length > 0) {
				return issues[0];
			}
		}
	}

	return DEFAULT_ERROR_MESSAGE;
}

/**
 * Poste vers un form action et rend son verdict réel.
 *
 * @param action - Action ciblée, ex. `'?/createScheduleEntry'`
 * @param body - Données du formulaire
 * @returns `{ ok: true, data }` seulement si l'action a bien réussi
 *
 * @example
 * const outcome = await submitAction('?/createScheduleEntry', formData);
 * if (!outcome.ok) {
 *   toaster.error(outcome.message);
 *   return;
 * }
 */
export async function submitAction<T = Record<string, unknown>>(
	action: string,
	body: FormData
): Promise<ActionOutcome<T>> {
	let result;

	try {
		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});

		result = deserialize(await response.text());
	} catch (err) {
		// Réseau coupé, réponse illisible : l'action n'a rien confirmé.
		return { ok: false, message: err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE };
	}

	switch (result.type) {
		case 'success':
			return { ok: true, data: result.data as T | undefined };

		case 'failure':
			return { ok: false, message: extractMessage(result.data) };

		case 'error':
			return { ok: false, message: extractMessage(result.error) };

		// Une redirection (session expirée → /login) n'écrit rien : la traiter en
		// succès afficherait un badge vert sur une action jamais exécutée.
		case 'redirect':
			return { ok: false, message: 'Session expirée, reconnectez-vous' };
	}
}
