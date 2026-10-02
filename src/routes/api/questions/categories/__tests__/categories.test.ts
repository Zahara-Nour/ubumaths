/**
 * GET /api/questions/categories : en plus des trois listes plates (rétrocompatibles),
 * les triplets distincts { theme, domain, subdomain } qui permettent à l'éditeur
 * de filtrer Domaine par Thème et Sous-domaine par Thème + Domaine.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({
	requireRoles: vi.fn(async () => ({ user: { id: 'prof' }, profile: { role: 'teacher' } }))
}));

import { GET } from '../+server';

const ROWS = [
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
	{ theme: 'Fractions', domain: 'Définition', subdomain: 'Simplifier' },
	{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' },
	{ theme: 'Suites', domain: 'Arithmétiques', subdomain: null }
];

function call(rows: unknown[]) {
	const supabase = {
		from: () => ({ select: async () => ({ data: rows, error: null }) })
	};
	return GET({ locals: { supabase } } as never);
}

describe('GET /api/questions/categories', () => {
	it('garde les trois listes plates', async () => {
		const body = await (await call(ROWS)).json();
		expect(body.themes).toEqual(['Fractions', 'Suites']);
		expect(body.domains).toEqual(['Arithmétiques', 'Définition']);
		expect(body.subdomains).toEqual(['Récurrence', 'Simplifier']);
	});

	it('renvoie les triplets distincts, triés', async () => {
		const body = await (await call(ROWS)).json();
		expect(body.entries).toEqual([
			{ theme: 'Fractions', domain: 'Définition', subdomain: 'Simplifier' },
			{ theme: 'Suites', domain: 'Arithmétiques', subdomain: null },
			{ theme: 'Suites', domain: 'Définition', subdomain: 'Récurrence' }
		]);
	});
});
