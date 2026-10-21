/**
 * Deck Programme — notion affichée sous chaque carte.
 *
 * La notion d'une carte est celle de l'arbre où se range le point que la carte
 * valide (point posé sur la notion ou sur une de ses sous-notions). Une carte
 * peut être rattachée à des points de PLUSIEURS référentiels (Terminale
 * spécialité `T_SPE` et maths complémentaires `T_COMP`) : l'élève ne voit que
 * la notion de SON niveau. Les tags des anciens points (thème → objectif) ne
 * comptent plus.
 */

import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const auth = vi.hoisted(() => ({ grade: null as string | null }));

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', grade: auth.grade }
	})
}));

import { load } from '../+page.server';
import type { PageServerData } from '../$types';

// Ce que rend VRAIMENT le load (ProgrammeData) : SvelteKit l'infère via un proxy
// sans l'annotation `PageServerLoad`, dont le type de retour admet `void`.
type Loaded = PageServerData;

function link(
	templateId: string,
	code: string,
	nodeId: string | null,
	grade: string | null,
	archived = false
) {
	return {
		template_id: templateId,
		curriculum_points: {
			code,
			node_id: nodeId,
			grade,
			archived_at: archived ? '2026-10-01T00:00:00Z' : null
		}
	};
}

/** Branche > deux notions ; la notion « Suites » a une sous-notion. */
const NODES = [
	{ id: 'branche', kind: 'branch', parent_id: null, name: 'Analyse', archived_at: null },
	{ id: 'n-comp', kind: 'notion', parent_id: 'branche', name: 'Suites', archived_at: null },
	{
		id: 'sn-comp',
		kind: 'subnotion',
		parent_id: 'n-comp',
		name: 'Arithmétiques',
		archived_at: null
	},
	{ id: 'n-spe', kind: 'notion', parent_id: 'branche', name: 'Limites', archived_at: null },
	{ id: 'n-seule', kind: 'notion', parent_id: 'branche', name: 'Dérivation', archived_at: null }
];

/**
 * Deux cartes :
 *  - `t-partagee` : un point T_COMP (code rangé en premier, sur une sous-notion)
 *    ET un point T_SPE — le cas visé ; plus un ancien point, jamais retenu ;
 *  - `t-seule` : un seul point, de T_COMP — non-régression.
 */
function supabaseFixture() {
	return createFakeSupabase((table) => {
		switch (table) {
			case 'srs_decks':
				return { data: { id: 'deck-1' } };
			case 'srs_cards':
				return {
					data: [
						{ id: 'c-partagee', template_id: 't-partagee' },
						{ id: 'c-seule', template_id: 't-seule' },
						{ id: 'c-archive', template_id: 't-archive' }
					]
				};
			case 'srs_card_stats':
				return { data: [] };
			case 'question_templates':
				return {
					data: [
						{ id: 't-partagee', subdomain: 'Partagée' },
						{ id: 't-seule', subdomain: 'Seule' },
						{ id: 't-archive', subdomain: 'Archivée' }
					]
				};
			case 'question_template_points':
				return {
					data: [
						link('t-partagee', '0-ancien', null, null),
						link('t-partagee', 'TCOMP-001', 'sn-comp', 'T_COMP'),
						link('t-seule', 'TCOMP-002', 'n-seule', 'T_COMP'),
						link('t-partagee', 'TSPE-005', 'n-spe', 'T_SPE'),
						link('t-archive', 'TSPE-009', 'n-seule', 'T_SPE', true)
					]
				};
			case 'classification_nodes':
				return { data: NODES };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
}

async function notionOf(grade: string | null, templateId: string) {
	auth.grade = grade;
	const fake = supabaseFixture();
	const data = (await load({ locals: { supabase: fake.client } } as never)) as Loaded;
	const card = data.sections.flatMap((s) => s.cards).find((c) => c.templateId === templateId);
	return { id: card?.notionId, name: card?.notionName, linkable: card?.notionLinkable };
}

describe('deck Programme — notion selon le niveau de l’élève', () => {
	it('carte partagée : l’élève de T_SPE voit la notion de son point T_SPE', async () => {
		expect(await notionOf('T_SPE', 't-partagee')).toEqual({
			id: 'n-spe',
			name: 'Limites',
			linkable: true
		});
	});

	it('point sur une sous-notion : la carte affiche sa notion', async () => {
		expect(await notionOf('T_COMP', 't-partagee')).toEqual({
			id: 'n-comp',
			name: 'Suites',
			linkable: true
		});
	});

	it('carte d’un seul niveau, autre que celui de l’élève : notion conservée', async () => {
		expect((await notionOf('T_SPE', 't-seule')).id).toBe('n-seule');
	});

	it('élève sans niveau : premier point neuf dans l’ordre des codes, jamais l’ancien', async () => {
		expect((await notionOf(null, 't-partagee')).id).toBe('n-comp');
	});

	// Le lien mène à la page de la notion, qui ne montre que les points actifs du
	// niveau de l'élève : sinon elle répondrait 404 (PR D, revue).
	it('notion d’un autre niveau : nom affiché, sans lien', async () => {
		expect(await notionOf('T_SPE', 't-seule')).toMatchObject({ id: 'n-seule', linkable: false });
	});

	it('élève sans niveau : sans lien', async () => {
		expect((await notionOf(null, 't-partagee')).linkable).toBe(false);
	});

	it('point archivé : sans lien', async () => {
		expect(await notionOf('T_SPE', 't-archive')).toMatchObject({ id: 'n-seule', linkable: false });
	});
});
