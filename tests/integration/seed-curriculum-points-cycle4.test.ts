/**
 * Seed des points du cycle 4 + références d'automatismes — (Supabase local requis)
 * ================================================================================
 *
 * Migration `20261008230000_seed_curriculum_points_cycle4` : les 226 points du
 * cycle 4 (106 en 5e, 69 en 4e, 51 en 3e) de l'Annexe 2 (arrêté du 18-02-2026,
 * BO n° 10 du 05-03-2026), la sous-notion « ratio » (décision David), et les
 * références d'automatismes de chaque grade vers le parcours antérieur — y
 * compris intra-cycle (4e → points 5e, 3e → points 4e/5e). VALIDÉS par David le
 * 2026-10-08 (docs/wip/arbre-notions/seed-cycle4.md, points 1-10 + C1 + C2).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre sous les codes 5-/4-/3-, et l'ensemble
 * exact des références (code cible × grade référent). Lecture ANONYME (B6).
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
	grade: '5' | '4' | '3';
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
	id: string;
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

const fixture: {
	version: string;
	points: FixturePoint[];
	references: { code: string; grade: string }[];
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-cycle4-points.json', 'utf-8'));

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

describe('Seed des points du cycle 4 (points + références d’automatismes)', () => {
	let anon: SupabaseClient;
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;
	let refRows: { point_id: string; grade: string }[];
	let pointsById: Map<string, PointRow>;

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Tous les points (la table dépasse largement 1 000 lignes) : on pagine.
		const allPoints: PointRow[] = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('curriculum_points')
				.select(
					'id, code, grade, display_order, name, kind, exigence, regime_acquisition, rubrique, node_id, objective_id, rang'
				)
				.order('id')
				.range(from, from + 999);
			if (error) throw new Error(`lecture anon des points refusée : ${error.message}`);
			allPoints.push(...((data ?? []) as PointRow[]));
			if (!data || data.length < 1000) break;
		}
		pointsById = new Map(allPoints.map((p) => [p.id, p]));
		pointRows = allPoints.filter((p) => /^[543]-\d{3}$/.test(p.code));

		const nodes: NodeRow[] = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('classification_nodes')
				.select('id, parent_id, name')
				.order('id')
				.range(from, from + 999);
			if (error) throw new Error(`lecture anon des nœuds refusée : ${error.message}`);
			nodes.push(...((data ?? []) as NodeRow[]));
			if (!data || data.length < 1000) break;
		}
		nodesById = new Map(nodes.map((n) => [n.id, n]));

		const { data: refs, error: refErr } = await anon
			.from('curriculum_point_automatismes')
			.select('point_id, grade')
			.in('grade', ['5', '4', '3']);
		if (refErr) throw new Error(`lecture anon des références refusée : ${refErr.message}`);
		refRows = (refs ?? []) as { point_id: string; grade: string }[];
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

	it('la fixture est bien celle du document validé (241 points après la passe)', () => {
		expect(fixture.version).toBe('2026-10-07.14');
		expect(fixture.points).toHaveLength(241);
		expect(fixture.points.filter((p) => p.grade === '5')).toHaveLength(114);
		expect(fixture.points.filter((p) => p.grade === '4')).toHaveLength(72);
		expect(fixture.points.filter((p) => p.grade === '3')).toHaveLength(55);
		expect(fixture.references.length).toBeGreaterThan(100);
	});

	it('les 241 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(241);
	});

	it('les références d’automatismes (5e, 4e, 3e) visent EXACTEMENT les cibles du document', () => {
		const actual = refRows
			.map((r) => `${pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`}|${r.grade}`)
			.sort();
		const expected = fixture.references.map((r) => `${r.code}|${r.grade}`).sort();
		expect(actual).toEqual(expected);
	});

	it('architecture cible : objective_id et rang NULL ; fluence, algorithme et demonstration conformes aux décisions', () => {
		expect(pointRows.length).toBeGreaterThan(0);
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);

		const fluents = pointRows.filter((r) => r.regime_acquisition === 'fluence');
		expect(fluents.map((r) => r.code).sort()).toEqual([
			'3-010',
			'3-011',
			'5-029',
			'5-030',
			'5-056'
		]);

		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos).toHaveLength(18);
		const demos = pointRows.filter((r) => r.kind === 'demonstration');
		expect(demos.map((r) => r.code).sort()).toEqual(['4-023', '5-040', '5-058', '5-065']);
	});

	it("l'arbre porte la sous-notion « ratio » sous Situations de proportionnalité", () => {
		const ratio = [...nodesById.values()].find(
			(n) =>
				n.name === 'ratio' &&
				n.parent_id &&
				nodesById.get(n.parent_id)?.name === 'Situations de proportionnalité'
		);
		expect(ratio).toBeDefined();
	});

	it('passe « puces et points » (cycle 4) : scissions, retraits, ordre d’affichage', () => {
		const byCode = new Map(pointRows.map((r) => [r.code, r]));
		expect(byCode.has('5-081')).toBe(false);
		expect(byCode.has('3-031')).toBe(false);
		// La partie qui garde le code est celle que visent les références existantes.
		expect(byCode.get('4-025')?.name).toBe(
			'Résoudre une équation du premier degré du type ax + b = cx + d.'
		);
		expect(pathOf(byCode.get('5-077')?.node_id ?? null)).toBe(
			'Statistiques > Représenter des données > courbes et repères'
		);
		expect(pathOf(byCode.get('3-053')?.node_id ?? null)).toBe(
			'Fonctions > Fonction carré > x² = k, x² < k'
		);
		expect(byCode.get('4-071')?.display_order).toBe((byCode.get('4-025')?.display_order ?? 0) + 1);
		for (const grade of ['5', '4', '3']) {
			const ordres = pointRows
				.filter((r) => r.grade === grade)
				.map((r) => r.display_order)
				.sort((a, b) => a - b);
			expect(ordres, grade).toEqual(ordres.map((_, i) => i + 1));
		}
	});
});
