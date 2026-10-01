/**
 * E19 — la page d'une évaluation ne charge AUCUN modèle : le serveur tire et
 * corrige, le navigateur ne reçoit que les questions publiques de la tentative.
 * Hors évaluation : les modèles publiés, comme avant.
 */
import { describe, it, expect, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { load } from '../+page.server';

function locals() {
	const order = vi.fn(async () => ({ data: [{ id: 'm1' }], error: null }));
	const eq = vi.fn(() => ({ order }));
	const select = vi.fn(() => ({ eq }));
	const from = vi.fn(() => ({ select }));
	return { from, supabase: { from } };
}

describe('/automaths/test — chargement', () => {
	it('évaluation (?assignment=) : aucun modèle, aucune lecture', async () => {
		const { from, supabase } = locals();
		const result = await load({
			locals: { supabase },
			url: new URL(
				'http://localhost/automaths/test?assignment=44444444-4444-4444-8444-444444444444'
			)
		} as never);
		expect(result).toEqual({ templates: [] });
		expect(from).not.toHaveBeenCalled();
	});

	it('entraînement libre : les modèles publiés', async () => {
		const { from, supabase } = locals();
		const result = await load({
			locals: { supabase },
			url: new URL('http://localhost/automaths/test?mode=interactive')
		} as never);
		expect(result).toEqual({ templates: [{ id: 'm1' }] });
		expect(from).toHaveBeenCalledWith('question_templates');
	});

	it('Q46 : lien de série SANS forme → redirection vers le panier, aucune lecture', async () => {
		const { from, supabase } = locals();
		const categories = encodeURIComponent('[{"a":1}]');
		const query = new URLSearchParams({ categories }).toString();

		const thrown = await load({
			locals: { supabase },
			url: new URL(`http://localhost/automaths/test?${query}`)
		} as never).catch((e: unknown) => e);

		expect(isRedirect(thrown)).toBe(true);
		const location = new URL((thrown as { location: string }).location, 'http://localhost');
		expect(location.pathname).toBe('/automaths/panier');
		expect(location.searchParams.get('categories')).toBe(categories);
		expect(from).not.toHaveBeenCalled();
	});
});
