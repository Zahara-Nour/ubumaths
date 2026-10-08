/**
 * Seed des points de programme du cycle 2 — base de données (Supabase local requis)
 * =================================================================================
 *
 * Migration `20261008150000_seed_curriculum_points_cycle2` : les 227 points du
 * cycle 2 (69 CP + 82 CE1 + 76 CE2) de l'Annexe 4 (arrêté du 22-10-2024,
 * BOENJS n° 41 du 31 octobre 2024), VALIDÉS par David le 2026-10-08
 * (docs/wip/arbre-notions/seed-cycle2.md). Aucun changement de l'arbre : les
 * points se rattachent à l'arbre 2026-10-07.13 tel quel. Puis la passe « puces et
 * points » (migration `20261011080000_passe_puces_points_cycle2`, validée le
 * 2026-10-08, docs/wip/arbre-notions/passe-cycle2.md) : 16 puces scindées (+17 points),
 * 9 points spécifiés → 244 points (72 CP + 89 CE1 + 83 CE2).
 *
 * La preuve est INTÉGRALE, pas un échantillon : chaque point de la fixture
 * (générée depuis le document validé) doit se retrouver en base avec TOUS ses
 * attributs — code, énoncé, kind, exigence, régime, rubrique, grade,
 * display_order ET le chemin complet de son nœud — et rien d'autre sous les
 * codes CP-/CE1-/CE2-. Lecture ANONYME (ouverture B6 : le référentiel est
 * public).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface FixturePoint {
	code: string;
	grade: 'CP' | 'CE1' | 'CE2';
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string;
	branche: string;
	notion: string;
	sous_notion: string | null;
}

interface PointRow {
	code: string;
	grade: string | null;
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string | null;
	node_id: string | null;
	objective_id: string | null;
	rang: number | null;
}

interface NodeRow {
	id: string;
	kind: string;
	parent_id: string | null;
	name: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const fixture: { version: string; points: FixturePoint[] } = JSON.parse(
	readFileSync('tests/integration/fixtures/seed-cycle2-points.json', 'utf-8')
);

/** Signature complète d'un point, chemin du nœud compris. */
function signature(p: {
	code: string;
	grade: string | null;
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string | null;
	path: string;
}): string {
	return [
		p.code,
		p.grade,
		p.display_order,
		p.name,
		p.kind,
		p.exigence,
		p.regime_acquisition,
		p.rubrique,
		p.path
	].join('§');
}

// ============================================================================
// SUITE
// ============================================================================

describe('Seed des points du cycle 2 (curriculum_points → classification_nodes)', () => {
	let anon: SupabaseClient;
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Les points du seed (227 < 1000 : une page suffit, mais on pagine quand même).
		pointRows = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('curriculum_points')
				.select(
					'code, grade, display_order, name, kind, exigence, regime_acquisition, rubrique, node_id, objective_id, rang'
				)
				.or('code.like.CP-%,code.like.CE1-%,code.like.CE2-%')
				.order('code')
				.range(from, from + 999);
			if (error) throw new Error(`lecture anon des points refusée : ${error.message}`);
			pointRows.push(...((data ?? []) as PointRow[]));
			if (!data || data.length < 1000) break;
		}

		// L'arbre entier, pour reconstruire les chemins.
		const nodes: NodeRow[] = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('classification_nodes')
				.select('id, kind, parent_id, name')
				.order('id')
				.range(from, from + 999);
			if (error) throw new Error(`lecture anon des nœuds refusée : ${error.message}`);
			nodes.push(...((data ?? []) as NodeRow[]));
			if (!data || data.length < 1000) break;
		}
		nodesById = new Map(nodes.map((n) => [n.id, n]));
	});

	function pathOf(nodeId: string | null): string {
		if (!nodeId) return '∅';
		const parts: string[] = [];
		for (
			let n = nodesById.get(nodeId);
			n;
			n = n.parent_id ? nodesById.get(n.parent_id) : undefined
		) {
			parts.unshift(n.name);
		}
		return parts.join(' > ');
	}

	it('la fixture est bien celle du document validé (244 points après la passe)', () => {
		expect(fixture.version).toBe('2026-10-07.13');
		expect(fixture.points).toHaveLength(244);
		expect(fixture.points.filter((p) => p.grade === 'CP')).toHaveLength(72);
		expect(fixture.points.filter((p) => p.grade === 'CE1')).toHaveLength(89);
		expect(fixture.points.filter((p) => p.grade === 'CE2')).toHaveLength(83);
	});

	it('les 244 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
		const expected = new Set(
			fixture.points.map((p) =>
				signature({
					...p,
					path: [p.branche, p.notion, ...(p.sous_notion ? [p.sous_notion] : [])].join(' > ')
				})
			)
		);
		const actual = new Set(pointRows.map((r) => signature({ ...r, path: pathOf(r.node_id) })));

		const missing = [...expected].filter((s) => !actual.has(s));
		const extra = [...actual].filter((s) => !expected.has(s));
		expect(missing, 'points du document absents ou altérés en base').toEqual([]);
		expect(extra, 'points en base absents du document').toEqual([]);
		expect(pointRows).toHaveLength(244);
	});

	it('architecture cible : objective_id NULL et rang NULL sur tout le seed', () => {
		// Garde anti-vacuité : un every() sur une liste vide serait vert pour rien.
		expect(pointRows.length).toBeGreaterThan(0);
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
	});

	it('le régime suit la décision : fluence = tout le calcul mental, rien d’autre', () => {
		const fluents = pointRows.filter((r) => r.regime_acquisition === 'fluence');
		expect(fluents).toHaveLength(34);
		expect(fluents.every((r) => (r.rubrique ?? '').endsWith('> Le calcul mental'))).toBe(true);
	});

	it('passe « puces et points » : scissions, spécifications, ordre d’affichage', () => {
		const byCode = new Map(pointRows.map((r) => [r.code, r]));
		// Les parties neuves existent, rangées juste après leur première partie.
		const after: [string, string][] = [
			['CP-070', 'CP-001'],
			['CP-071', 'CP-045'],
			['CE1-083', 'CE1-028'],
			['CE2-078', 'CE2-077'],
			['CE2-083', 'CE2-075']
		];
		for (const [neuf, avant] of after) {
			expect(byCode.get(neuf)?.display_order, neuf).toBe(
				(byCode.get(avant)?.display_order ?? 0) + 1
			);
		}
		expect(byCode.get('CE2-022')?.name).toBe(
			'Connaitre des faits multiplicatifs usuels : les doubles et les moitiés.'
		);
		expect(pathOf(byCode.get('CE2-078')?.node_id ?? null)).toBe(
			'Nombres et calculs > Entiers : multiplication > décomposition'
		);
		expect(byCode.get('CE1-052')?.kind).toBe('connaissance');
		expect(byCode.get('CP-039')?.name).toBe(
			'Utiliser le lexique associé aux masses : lourd, léger.'
		);
		// Dans chaque grade, l'ordre d'affichage est une permutation de 1..n.
		for (const grade of ['CP', 'CE1', 'CE2']) {
			const ordres = pointRows
				.filter((r) => r.grade === grade)
				.map((r) => r.display_order)
				.sort((a, b) => a - b);
			expect(ordres, grade).toEqual(ordres.map((_, i) => i + 1));
		}
	});
});
