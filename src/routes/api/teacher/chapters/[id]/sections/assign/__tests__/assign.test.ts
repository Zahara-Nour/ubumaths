/**
 * POST /api/teacher/chapters/[id]/sections/assign — codes de réponse
 *
 * Une ressource absente du chapitre (ou refusée par la RLS : zéro ligne) n'est
 * pas une panne du serveur : 404, et le plan restaure la ressource à sa place.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const assignToSection = vi.fn();

vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: vi.fn(async () => ({ user: { id: 'prof' } }))
}));
vi.mock('$lib/server/chapter-sections', () => ({
	assignToSection: (...args: unknown[]) => assignToSection(...args)
}));

const { POST } = await import('../+server');

const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const LIEN = '33333333-3333-4333-8333-333333333333';

type Event = Parameters<typeof POST>[0];

function appel(body: unknown): Event {
	return {
		locals: { supabase: {} },
		params: { id: CHAPITRE },
		request: new Request('http://localhost/x', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Event;
}

async function statut(event: Event): Promise<number> {
	try {
		const r = await POST(event);
		return r.status;
	} catch (e) {
		if (isHttpError(e)) return e.status;
		throw e;
	}
}

const corps = { sectionId: null, items: [{ kind: 'series', id: LIEN, sectionOrder: 0 }] };

beforeEach(() => assignToSection.mockReset());

describe('sections/assign', () => {
	it('accepte le type « series »', async () => {
		assignToSection.mockResolvedValue({ error: null });
		expect(await statut(appel(corps))).toBe(200);
		expect(assignToSection).toHaveBeenCalledWith(CHAPITRE, null, corps.items, {});
	});

	it('ressource absente ou refusée (zéro ligne) : 404', async () => {
		assignToSection.mockResolvedValue({ error: new Error('x'), notFound: true });
		expect(await statut(appel(corps))).toBe(404);
	});

	it('section d’un autre chapitre (23503) : 400', async () => {
		assignToSection.mockResolvedValue({ error: new Error('violates foreign key 23503') });
		expect(await statut(appel(corps))).toBe(400);
	});

	it('panne : 500', async () => {
		assignToSection.mockResolvedValue({ error: new Error('boom') });
		expect(await statut(appel(corps))).toBe(500);
	});
});
