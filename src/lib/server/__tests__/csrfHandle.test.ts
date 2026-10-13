/**
 * Garde CSRF du hook (écart C7)
 * =============================
 *
 * Une écriture dont l'origine ne correspond pas à l'hôte est refusée en 403. Avant
 * 2026-10-13, le refus « origine différente du site » était levé DANS le `try` qui analyse l'URL :
 * le `catch` le rattrapait et le relevait en « origine illisible ». Même statut,
 * message trompeur pour qui lit les journaux.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { csrfHandle } from '../csrfHandle';

// ============================================================================
// HELPERS
// ============================================================================

function evenement(methode: string, entetes: Record<string, string>): RequestEvent {
	return {
		request: new Request('https://www.chiph.re/api/test', { method: methode, headers: entetes })
	} as unknown as RequestEvent;
}

async function refus(event: RequestEvent): Promise<{ status: number; message: string } | null> {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	try {
		await csrfHandle({ event, resolve });
		return null;
	} catch (e) {
		const err = e as { status: number; body: { message: string } };
		return { status: err.status, message: err.body.message };
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('csrfHandle', () => {
	it('une lecture passe sans contrôle', async () => {
		expect(await refus(evenement('GET', { origin: 'https://ailleurs.example' }))).toBeNull();
	});

	it('une écriture de même origine passe', async () => {
		const event = evenement('POST', { origin: 'https://www.chiph.re', host: 'www.chiph.re' });
		expect(await refus(event)).toBeNull();
	});

	it('une écriture d’une autre origine est refusée en « origine différente du site »', async () => {
		const event = evenement('POST', { origin: 'https://ailleurs.example', host: 'www.chiph.re' });
		expect(await refus(event)).toEqual({
			status: 403,
			message: 'Requête refusée : origine différente du site'
		});
	});

	it('une origine illisible est refusée en « origine illisible »', async () => {
		const event = evenement('POST', { origin: 'pas une url', host: 'www.chiph.re' });
		expect(await refus(event)).toEqual({
			status: 403,
			message: 'Requête refusée : origine illisible'
		});
	});

	it('une origine sans hôte est refusée', async () => {
		const event = evenement('POST', { origin: 'https://www.chiph.re' });
		expect(await refus(event)).toEqual({
			status: 403,
			message: 'Requête refusée : origine ou hôte absent'
		});
	});

	it('un appel interne sans origine ni hôte passe', async () => {
		expect(await refus(evenement('POST', {}))).toBeNull();
	});
});
