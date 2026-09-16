import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';

// `deserialize` décode le `data` encodé en devalue. Le mock le remplace par un
// JSON.parse : le test porte sur la lecture du VERDICT, pas sur l'encodage.
vi.mock('$app/forms', () => ({
	deserialize: (text: string) => {
		const parsed = JSON.parse(text);
		return parsed.data ? { ...parsed, data: JSON.parse(parsed.data) } : parsed;
	}
}));

const { submitAction } = await import('../form-action');

/**
 * Construit la réponse qu'un form action SvelteKit rend VRAIMENT.
 *
 * Point clé : `fail()` répond en **HTTP 200**. Le statut d'échec ne vit que
 * dans le corps (`{ type: 'failure', status: 400 }`) — c'est pourquoi tester
 * `response.ok` affiche un échec comme un succès.
 * Cf. node_modules/@sveltejs/kit/src/runtime/server/page/actions.js
 */
function actionResponse(result: ActionResult, httpStatus = 200): Response {
	const body =
		'data' in result && result.data !== undefined
			? { ...result, data: JSON.stringify(result.data) }
			: result;

	return new Response(JSON.stringify(body), {
		status: httpStatus,
		headers: { 'content-type': 'application/json' }
	});
}

describe('submitAction', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('rend un succès quand l’action réussit', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({ type: 'success', status: 200, data: { message: 'Créneau créé' } })
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: true, data: { message: 'Créneau créé' } });
	});

	// Le bug de production : validation refusée, HTTP 200, la page annonçait
	// « succès » et rechargeait une grille inchangée.
	it('rend un échec sur un fail() de validation, malgré le HTTP 200', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({
				type: 'failure',
				status: 400,
				data: { errors: { day_of_week: ['Number must be less than or equal to 4'] } }
			})
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({
			ok: false,
			message: 'Number must be less than or equal to 4'
		});
	});

	it('préfère le message de l’action à ses erreurs de champ', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({ type: 'failure', status: 404, data: { message: 'Class not found' } })
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Class not found' });
	});

	it('rend un échec sur une erreur inattendue de l’action', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({ type: 'error', error: { message: 'Internal Error' } }, 500)
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Internal Error' });
	});

	// Une session expirée renvoie une redirection vers /login : ce n'est pas un
	// succès, et `response.ok` la prenait pour tel (fetch suit les redirections).
	it('rend un échec sur une redirection', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({ type: 'redirect', status: 303, location: '/login' })
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome.ok).toBe(false);
	});

	it('rend un échec quand le réseau tombe', async () => {
		fetchMock.mockRejectedValue(new Error('Failed to fetch'));

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Failed to fetch' });
	});

	it('poste en form action SvelteKit', async () => {
		fetchMock.mockResolvedValue(actionResponse({ type: 'success', status: 204 }));
		const body = new FormData();
		body.append('class_id', 'abc');

		await submitAction('?/createScheduleEntry', body);

		expect(fetchMock).toHaveBeenCalledWith('?/createScheduleEntry', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
	});
});
