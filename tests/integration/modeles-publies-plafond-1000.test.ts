/**
 * Plus de 1000 modèles publiés : les pages doivent les voir TOUS (base locale requise)
 * ===================================================================================
 *
 * PostgREST plafonne une lecture à 1000 lignes (`max_rows`) et tronque en
 * SILENCE, sans erreur. Le 2026-11-04, la prod comptait 1912 modèles publiés :
 * `/automaths/test`, le panier et le catalogue n'en voyaient que 1000, et les
 * séries « Limites de fonctions » sautaient des catégories
 * (« Série : aucun modèle pour … »), jouées à 5 questions au lieu de 10.
 *
 * Décor : 1100 modèles publiés de plus que la base locale. Les routes sont
 * appelées avec un client ANONYME réel, comme un visiteur.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import type { Database } from '$lib/types/database';
import { load as chargerLaPageDeTest } from '../../src/routes/(public)/automaths/test/+page.server';
import { GET as lireTousLesModeles } from '../../src/routes/api/questions/templates/all/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

const THEME = 'Test plafond 1000';
const NB_MODELES = 1100;

/** Un visiteur : pas de session, pas de jeton. */
function clientAnonyme(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

/** Un modèle publié ; `level` distinct (index unique thème/domaine/sous-domaine/niveau) */
function modele(level: number) {
	return {
		type: 'fill_in_blanks',
		title: `Plafond 1000 — ${level}`,
		theme: THEME,
		domain: 'Plafond',
		level,
		grades: ['6'],
		status: 'published',
		// La contrainte `variations_minimum_one` exige au moins une variation.
		variations: [{ statement: 'Combien font $$1+1$$ ? ____', blanks: [{ expectedAnswer: '2' }] }]
	};
}

async function supprimerLeDecor() {
	const { error } = await service.from('question_templates').delete().eq('theme', THEME);
	expect(error, 'le décor n’a pas pu être retiré').toBeNull();
}

describe('plus de 1000 modèles publiés', () => {
	let attendus: Set<string>;
	let totalPublies: number;

	beforeAll(async () => {
		await supprimerLeDecor();
		const lignes = Array.from({ length: NB_MODELES }, (_, i) => modele(i + 1));
		const { data, error } = await service.from('question_templates').insert(lignes).select('id');
		expect(error, 'le décor n’a pas pu être posé').toBeNull();
		attendus = new Set((data ?? []).map((r) => r.id));
		expect(attendus.size).toBe(NB_MODELES);

		const { count, error: countError } = await service
			.from('question_templates')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'published');
		expect(countError).toBeNull();
		totalPublies = count ?? 0;
		expect(totalPublies, 'le décor ne dépasse pas le plafond').toBeGreaterThan(1000);
	}, 120_000);

	afterAll(supprimerLeDecor);

	it('la page de test reçoit tous les modèles publiés', async () => {
		const data = (await chargerLaPageDeTest({
			locals: { supabase: clientAnonyme() },
			url: new URL('http://localhost/automaths/test')
		} as never)) as { templates: Array<{ id: string }> };

		const ids = data.templates.map((t) => t.id);
		expect(ids, 'liste tronquée au plafond PostgREST').toHaveLength(totalPublies);
		expect(new Set(ids).size, 'un modèle lu deux fois').toBe(totalPublies);
		expect(ids.filter((id) => attendus.has(id))).toHaveLength(NB_MODELES);
	});

	it('l’API des modèles publiés les rend tous', async () => {
		const reponse = await lireTousLesModeles({
			locals: { supabase: clientAnonyme() }
		} as never);
		const { templates } = (await reponse.json()) as { templates: Array<{ id: string }> };

		expect(templates, 'liste tronquée au plafond PostgREST').toHaveLength(totalPublies);
		expect(new Set(templates.map((t) => t.id)).size).toBe(totalPublies);
	});
});
