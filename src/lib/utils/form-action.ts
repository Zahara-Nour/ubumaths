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
 * validation. Une page qui teste `response.ok` annonce donc « succès » puis
 * recharge des données inchangées. Payé en production le 2026-09-16 : l'emploi
 * du temps affichait « Créneau ajouté » alors que le serveur refusait le jour,
 * et rien n'était écrit.
 *
 * Deux redirections à ne pas confondre :
 * - celle levée par l'ACTION revient elle aussi en 200, avec
 *   `{ type: 'redirect' }` dans le corps ;
 * - celle levée par `handle` (profil illisible → `/auth/login`, cf.
 *   `hooks.server.ts`) est un VRAI 3xx, que `fetch` suit jusqu'à une page HTML.
 *   `deserialize` jetterait alors `Unexpected token '<'` — le message même que
 *   cette redirection existe pour éviter.
 *
 * `use:enhance` gère tout cela ; ce helper rend le même service aux appels
 * `fetch` manuels (ceux qui postent sans <form>, ou hors du cycle de la page).
 *
 * @module utils/form-action
 */

import { deserialize } from '$app/forms';
import type { ActionResult } from '@sveltejs/kit';

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

/** Message affiché quand la session ne permet plus d'exécuter l'action. */
const SESSION_EXPIRED_MESSAGE = 'Session expirée, reconnectez-vous';

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Extrait un message lisible du `data` d'un `fail()`.
 *
 * Les actions renvoient soit `{ message }`, soit le `{ errors }` de
 * `validateFormData` (`Record<string, string[]>`) — dans ce cas on nomme le
 * champ fautif, sans quoi l'utilisateur lit une phrase hors contexte.
 */
function extractMessage(data: unknown): string {
	if (!data || typeof data !== 'object') return DEFAULT_ERROR_MESSAGE;

	const { message, errors } = data as { message?: unknown; errors?: unknown };

	if (typeof message === 'string' && message.length > 0) return message;

	if (errors && typeof errors === 'object') {
		for (const [field, issues] of Object.entries(errors as Record<string, unknown>)) {
			if (Array.isArray(issues) && typeof issues[0] === 'string' && issues[0].length > 0) {
				return `${field} : ${issues[0]}`;
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
	let result: ActionResult;

	try {
		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: {
				// `is_action_json_request` ne regarde QUE `accept` : sans cet en-tête,
				// on dépend du `*/*` par défaut de fetch. Qu'un wrapper ou un proxy
				// pose un `accept` en amont, et SvelteKit exécuterait l'action puis
				// rendrait la PAGE HTML — l'écriture aurait lieu, le helper la lirait
				// en échec. Le bug corrigé ici, mais à l'envers.
				accept: 'application/json',
				'x-sveltekit-action': 'true'
			}
		});

		// Redirection de `handle` (session/profil) suivie par fetch, ou réponse
		// d'un intermédiaire (502 d'un proxy) : ce n'est pas un ActionResult.
		if (response.redirected) {
			return { ok: false, message: SESSION_EXPIRED_MESSAGE };
		}

		if (!response.headers.get('content-type')?.includes('application/json')) {
			return { ok: false, message: DEFAULT_ERROR_MESSAGE };
		}

		result = deserialize(await response.text());
	} catch (err) {
		// Réseau coupé, corps illisible : l'action n'a rien confirmé. Le message
		// natif (« Failed to fetch », « Load failed ») n'est pas montrable.
		console.error('[submitAction] Réponse illisible :', err);
		return { ok: false, message: DEFAULT_ERROR_MESSAGE };
	}

	switch (result?.type) {
		case 'success':
			return { ok: true, data: result.data as T | undefined };

		case 'failure':
			return { ok: false, message: extractMessage(result.data) };

		case 'error':
			return { ok: false, message: extractMessage(result.error) };

		// Redirection levée par l'action : elle n'écrit rien, la traiter en succès
		// afficherait un badge vert sur une action jamais exécutée.
		case 'redirect':
			return { ok: false, message: SESSION_EXPIRED_MESSAGE };

		// Le type garantit l'exhaustivité, pas le runtime : le corps vient du
		// réseau. Sans ce défaut, un JSON étranger rendrait `undefined` et
		// l'appelant jetterait — l'échec redeviendrait muet.
		default:
			return { ok: false, message: DEFAULT_ERROR_MESSAGE };
	}
}
