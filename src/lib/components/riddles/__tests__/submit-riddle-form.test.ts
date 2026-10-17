/**
 * La réponse de l'action est au format de SvelteKit (`{ type, status, data }`) : le
 * succès doit se lire comme un succès, et le message d'un refus (Zod) doit arriver
 * jusqu'à la page. L'ancien code lisait `result.success` sur la réponse brute, qui
 * n'existe jamais : tout enregistrement réussi s'affichait en erreur.
 */
import { describe, it, expect, vi } from 'vitest';
import { buildRiddleFormBody, submitRiddleForm } from '../submit-riddle-form';

// `deserialize` dépend du runtime client de SvelteKit (décodeurs de transport) : on
// le remplace par une lecture JSON, `data` étant déjà décodé dans ces réponses.
vi.mock('$app/forms', () => ({
	deserialize: vi.fn((text: string) => JSON.parse(text))
}));

function actionResponse(payload: unknown): typeof fetch {
	return vi.fn(async () => new Response(JSON.stringify(payload))) as unknown as typeof fetch;
}

describe('submitRiddleForm', () => {
	it('lit un succès de l’action comme un succès (pas de clé `success` au premier niveau)', async () => {
		const fetcher = actionResponse({ type: 'success', status: 200, data: { success: true } });

		expect(await submitRiddleForm(new FormData(), fetcher)).toEqual({ ok: true });
	});

	it('remonte le message d’un refus', async () => {
		const fetcher = actionResponse({
			type: 'failure',
			status: 400,
			data: { message: 'La réponse attendue est vide' }
		});

		expect(await submitRiddleForm(new FormData(), fetcher)).toEqual({
			ok: false,
			message: 'La réponse attendue est vide'
		});
	});

	it('erreur sans message : message nul, la page garde son texte par défaut', async () => {
		const fetcher = actionResponse({ type: 'error', status: 500, error: { message: 'x' } });

		expect(await submitRiddleForm(new FormData(), fetcher)).toEqual({
			ok: false,
			message: null
		});
	});

	it('demande la réponse JSON de l’action', async () => {
		const fetcher = actionResponse({ type: 'success', status: 200, data: {} });

		await submitRiddleForm(new FormData(), fetcher);

		const init = vi.mocked(fetcher).mock.calls[0][1];
		expect(init).toMatchObject({
			method: 'POST',
			headers: { 'x-sveltekit-action': 'true' }
		});
	});
});

describe('buildRiddleFormBody', () => {
	const BASE = {
		title: 'Les trois portes',
		difficulty: 2 as const,
		statement: 'Énoncé',
		correction: 'La correction',
		status: 'draft' as const
	};

	it('validation à la main : answer part en "null", pas en "undefined"', () => {
		const body = buildRiddleFormBody({ ...BASE, answer: undefined });

		expect(body.get('answer')).toBe('null');
	});

	it('réponse attendue sérialisée en JSON', () => {
		const answer = { type: 'numerical' as const, value: 42 };

		expect(JSON.parse(String(buildRiddleFormBody({ ...BASE, answer }).get('answer')))).toEqual(
			answer
		);
	});

	it('genre et image vides : champs absents', () => {
		const body = buildRiddleFormBody({ ...BASE, genre: '', image_url: '' });

		expect(body.has('genre')).toBe(false);
		expect(body.has('image_url')).toBe(false);
	});
});
