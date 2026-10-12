/**
 * `readApiErrorMessage` : le message d'une réponse d'API en échec, jamais le JSON brut.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readApiErrorMessage } from '$lib/utils/errors';

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('readApiErrorMessage', () => {
	it('rend le message d’une erreur SvelteKit `{ message }`', async () => {
		const response = jsonResponse({ message: 'Fiche introuvable' }, 404);
		expect(await readApiErrorMessage(response)).toBe('Fiche introuvable');
	});

	it('rend le champ `error` d’une réponse `json({ error })`', async () => {
		const response = jsonResponse({ error: 'Accès refusé' }, 403);
		expect(await readApiErrorMessage(response)).toBe('Accès refusé');
	});

	it('rend un texte de repli avec le statut quand le corps est illisible', async () => {
		const response = new Response('<html>Bad Gateway</html>', { status: 502 });
		expect(await readApiErrorMessage(response)).toBe('Erreur 502');
	});

	it('rend le texte de repli quand le JSON ne porte aucun message', async () => {
		const response = jsonResponse({ success: false }, 500);
		expect(await readApiErrorMessage(response)).toBe('Erreur 500');
	});
});
