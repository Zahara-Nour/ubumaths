/**
 * Aperçu d'un modèle (admin) — chargement serveur de la fiche du modèle
 * =======================================================================
 *
 * La fiche dit où le modèle est rangé et à quels points il est relié. Une lecture en échec
 * rend un message, JAMAIS « aucun point » : l'admin croirait le modèle sans point et en
 * poserait un. Le reste de l'aperçu (génération côté client) ne dépend pas de la fiche.
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';
import { createFakeSupabase, type Call } from '$lib/server/__tests__/helpers/fake-supabase';
import type { PageServerData } from '../$types';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];
type LoadResult = PageServerData;

// ============================================================================
// CONSTANTS
// ============================================================================

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '17a3c039-744d-4108-9b47-49f0183990b7';

const NODES = [
	{ id: 'b', kind: 'branch', parent_id: null, name: 'Nombres et calculs', archived_at: null },
	{
		id: 'n',
		kind: 'notion',
		parent_id: 'b',
		name: 'Entiers : addition et soustraction',
		archived_at: null
	},
	{ id: 's', kind: 'subnotion', parent_id: 'n', name: 'complément', archived_at: null }
];

function point(id: string, code: string, grade: string, nodeId: string) {
	return {
		id,
		code,
		name: `Point ${code}`,
		display_order: 1,
		rubrique: null,
		archived_at: null,
		node_id: nodeId,
		grade
	};
}

/** Comme en prod : la notion porte des points de CP et CE2, pas de CM1. */
const POINTS = [point('p-cp', 'CP-001', 'CP', 'n'), point('p-cm2', 'CM2-004', 'CM2', 's')];

const TEMPLATE = {
	id: TEMPLATE_ID,
	title: 'Trouver le complément',
	status: 'published',
	grades: ['CM1'],
	options: { constraints: { spacesFromFourDigits: true } },
	shared: null,
	variations: [{}],
	classification_node_id: 's'
};

// ============================================================================
// HELPERS
// ============================================================================

function idsIn(calls: Call[]): string[] {
	return (calls.find((c) => c.method === 'in')?.args[1] as string[]) ?? [];
}

interface Decor {
	template?: unknown;
	tags?: unknown[];
	points?: typeof POINTS;
	failOn?: string;
}

async function loadWith({ template = TEMPLATE, tags = [], points = POINTS, failOn }: Decor = {}) {
	const fake = createFakeSupabase((table, calls) => {
		if (table === failOn) return { data: null, error: { message: 'connexion perdue' } };
		switch (table) {
			case 'question_templates':
				return { data: template };
			case 'question_template_points':
				return { data: tags };
			case 'classification_nodes':
				return { data: NODES.filter((n) => idsIn(calls).includes(n.id)) };
			case 'curriculum_points':
				return { data: points.filter((p) => idsIn(calls).includes(p.node_id)) };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
	const event = {
		params: { id: TEMPLATE_ID },
		locals: { user: { id: ADMIN_ID }, profile: { role: 'admin' }, supabase: fake.client }
	} as unknown as LoadEvent;
	return (await load(event)) as LoadResult;
}

function sheetOf(result: LoadResult) {
	if (!result.factSheet.ok) throw new Error(`fiche en échec : ${result.factSheet.message}`);
	return result.factSheet.sheet;
}

// ============================================================================
// TESTS
// ============================================================================

describe('aperçu d’un modèle — fiche du modèle', () => {
	it('nominal : titre, statut, type, classe, chemin, réglages', async () => {
		const sheet = sheetOf(await loadWith({ points: [] }));
		expect(sheet.title).toBe('Trouver le complément');
		expect(sheet.statusLabel).toBe('Publié');
		expect(sheet.typeLabel).toBe('À trous');
		expect(sheet.grades).toEqual(['CM1']);
		expect(sheet.path?.map((n) => n.name)).toEqual([
			'Nombres et calculs',
			'Entiers : addition et soustraction',
			'complément'
		]);
		expect(sheet.settings).toEqual(['Espaces dès 4 chiffres (7 900, numération)']);
	});

	it('point posé : classe, code et nom', async () => {
		const tags = [{ point_id: 'p-cm2', curriculum_points: POINTS[1] }];
		const sheet = sheetOf(await loadWith({ tags }));
		expect(sheet.points).toEqual({
			state: 'tagged',
			points: [{ grade: 'CM2', code: 'CM2-004', name: 'Point CM2-004', archived: false }]
		});
	});

	it('sans point mais un point possible : « aucun », et combien sont à poser', async () => {
		const sheet = sheetOf(await loadWith());
		expect(sheet.points).toEqual({ state: 'none', availableCount: 1, fromGrade: 'CM1' });
	});

	it('sans point ni point possible (CP seulement sur la notion) : « aucun », à partir de CM1', async () => {
		const sheet = sheetOf(await loadWith({ points: [POINTS[0]] }));
		expect(sheet.points).toEqual({ state: 'none', availableCount: 0, fromGrade: 'CM1' });
	});

	it('modèle non rangé : pas de chemin, état « non rangé »', async () => {
		const sheet = sheetOf(
			await loadWith({ template: { ...TEMPLATE, classification_node_id: null } })
		);
		expect(sheet.path).toBeNull();
		expect(sheet.points).toEqual({ state: 'unranked' });
	});

	it('brouillon, QCM (choix dans la variation), question de cours', async () => {
		const sheet = sheetOf(
			await loadWith({
				template: {
					...TEMPLATE,
					status: 'draft',
					variations: [{ choices: [{ text: 'a' }, { text: 'b' }] }],
					options: { courseQuestion: true }
				}
			})
		);
		expect(sheet.statusLabel).toBe('Brouillon');
		expect(sheet.typeLabel).toBe('QCM');
		expect(sheet.courseQuestion).toBe(true);
		expect(sheet.settings).toEqual([]);
	});

	it.each(['question_template_points', 'classification_nodes', 'curriculum_points'])(
		'lecture de %s en échec : un message, jamais « aucun point »',
		async (table) => {
			const result = await loadWith({ failOn: table });
			expect(result.factSheet.ok).toBe(false);
			if (!result.factSheet.ok) expect(result.factSheet.message).toMatch(/connexion perdue/);
		}
	);

	it('modèle introuvable : 404', async () => {
		await expect(loadWith({ template: null })).rejects.toMatchObject({ status: 404 });
	});

	it('lecture du modèle en échec : un message dans la fiche, pas une 404', async () => {
		const result = await loadWith({ failOn: 'question_templates' });
		expect(result.factSheet.ok).toBe(false);
	});
});
