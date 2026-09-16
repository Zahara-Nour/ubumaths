import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';

// `deserialize` décode le `data` encodé en devalue. Le mock le remplace par un
// JSON.parse : le test porte sur la lecture du VERDICT, pas sur l'encodage.
const invalidateAllMock = vi.fn();
const toasterWarning = vi.fn();

vi.mock('$app/navigation', () => ({
	invalidateAll: () => invalidateAllMock()
}));

vi.mock('$lib/stores/toaster.svelte', () => ({
	toaster: { warning: (m: string) => toasterWarning(m) }
}));

vi.mock('$app/forms', () => ({
	deserialize: (text: string) => {
		const parsed = JSON.parse(text);
		return parsed.data ? { ...parsed, data: JSON.parse(parsed.data) } : parsed;
	}
}));

const { submitAction, refreshPageData } = await import('../form-action');

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

/**
 * Ce que `fetch` rend quand il a SUIVI la redirection 303 de `handle` :
 * la page de login, en HTML, avec `redirected = true`.
 */
function followedLoginPage(): Response {
	const response = new Response('<!doctype html><html lang="fr">…</html>', {
		status: 200,
		headers: { 'content-type': 'text/html' }
	});
	Object.defineProperty(response, 'redirected', { value: true });
	return response;
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
			message: 'day_of_week : Number must be less than or equal to 4'
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

	// Une redirection levée par l'ACTION est un succès : elle a écrit, puis
	// renvoie ailleurs (la validation d'une énigme retourne à la liste). À ne pas
	// confondre avec la redirection de `handle`, couverte plus bas.
	it('rend un succès et la destination sur une redirection d’action', async () => {
		fetchMock.mockResolvedValue(
			actionResponse({ type: 'redirect', status: 303, location: '/dashboard/validations' })
		);

		const outcome = await submitAction('?/validate', new FormData());

		expect(outcome).toEqual({
			ok: true,
			data: undefined,
			redirect: '/dashboard/validations'
		});
	});

	// « Failed to fetch » (Chrome) / « Load failed » (Safari) ne se montrent pas à
	// une utilisatrice francophone.
	it('rend un échec en français quand le réseau tombe', async () => {
		fetchMock.mockRejectedValue(new Error('Failed to fetch'));

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Une erreur est survenue' });
	});

	// La panne la plus probable : `handle` ne peut plus lire le profil et redirige
	// en 303 vers /auth/login. `fetch` suit, et rend du HTML — `deserialize`
	// jetterait « Unexpected token '<' » sous les yeux de l'utilisatrice.
	it('rend un échec lisible quand fetch a suivi la redirection de session', async () => {
		fetchMock.mockResolvedValue(followedLoginPage());

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Session expirée, reconnectez-vous' });
	});

	it('rend un échec sur une réponse qui n’est pas du JSON', async () => {
		fetchMock.mockResolvedValue(
			new Response('<html>502 Bad Gateway</html>', {
				status: 502,
				headers: { 'content-type': 'text/html' }
			})
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Une erreur est survenue' });
	});

	// Un JSON valide qui n'est pas un ActionResult (page d'erreur d'un WAF, `null`) :
	// sans branche par défaut, le helper rendait `undefined` et l'appelant jetait —
	// l'échec redevenait muet.
	it.each([
		['un JSON étranger', '{"error":"blocked"}'],
		['un corps null', 'null']
	])('rend un échec sur %s', async (_label, body) => {
		fetchMock.mockResolvedValue(
			new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
		);

		const outcome = await submitAction('?/createScheduleEntry', new FormData());

		expect(outcome).toEqual({ ok: false, message: 'Une erreur est survenue' });
	});

	it('poste en form action SvelteKit', async () => {
		fetchMock.mockResolvedValue(actionResponse({ type: 'success', status: 204 }));
		const body = new FormData();
		body.append('class_id', 'abc');

		await submitAction('?/createScheduleEntry', body);

		expect(fetchMock).toHaveBeenCalledWith('?/createScheduleEntry', {
			method: 'POST',
			body,
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		});
	});
});

describe('refreshPageData', () => {
	beforeEach(() => {
		invalidateAllMock.mockReset();
		toasterWarning.mockReset();
	});

	it('recharge les données de la page', async () => {
		invalidateAllMock.mockResolvedValue(undefined);

		await refreshPageData();

		expect(invalidateAllMock).toHaveBeenCalledOnce();
	});

	// L'écriture a réussi ; c'est le rechargement qui tombe. Laissé nu, ce rejet
	// sautait le message de succès et la fermeture de la modale : l'écran se
	// figeait sans rien dire.
	it('avertit sans jeter quand le rechargement échoue', async () => {
		invalidateAllMock.mockRejectedValue(new Error('Failed to fetch'));

		await expect(refreshPageData()).resolves.toBeUndefined();
		expect(toasterWarning).toHaveBeenCalledWith(
			"Enregistré, mais l'affichage n'a pas pu être rafraîchi"
		);
	});
});
