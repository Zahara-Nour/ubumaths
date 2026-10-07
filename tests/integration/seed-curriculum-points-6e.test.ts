/**
 * Seed des points de la 6e + références d'automatismes — (Supabase local requis)
 * ==============================================================================
 *
 * Migration `20261008190000_seed_curriculum_points_6e` : les 97 points de la 6e
 * (95 « Connaissances et capacités attendues » + 2 lignes d'Automatismes au
 * contenu neuf, codes 6-101…6-197) et les 28 RÉFÉRENCES d'automatismes vers
 * les points CM1/CM2/CE1/CE2 (`curriculum_point_automatismes`, grade '6') —
 * VALIDÉS par David le 2026-10-08 (docs/wip/arbre-notions/seed-6e.md, A1-A4).
 * Premier grade à références (ADR 0020, règle des Automatismes de David).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture doit se retrouver en
 * base avec TOUS ses attributs (chemin du nœud compris), rien d'autre sous les
 * codes 6-1xx, ET l'ensemble exact des 28 références. L'ancien seed 2020
 * (6-001…6-095) doit rester INTACT (R5 = B). Lecture ANONYME (B6).
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
	grade: '6';
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

const fixture: { version: string; points: FixturePoint[]; references: string[] } = JSON.parse(
	readFileSync('tests/integration/fixtures/seed-6e-points.json', 'utf-8')
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

describe('Seed des points de la 6e (points + références d’automatismes)', () => {
	let anon: SupabaseClient;
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;
	let refRows: { point_id: string; grade: string }[];
	let pointsById: Map<string, PointRow>;

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Tous les points (nouveaux 6-1xx, anciens 6-0xx, cibles CM/cycle 2) : on
		// pagine, la table dépasse 1 000 lignes depuis les seeds CP → CM2.
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
		pointRows = allPoints.filter((p) => /^6-1\d{2}$/.test(p.code));

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
			.eq('grade', '6');
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

	it('la fixture est bien celle du document validé (97 points, 28 références)', () => {
		expect(fixture.version).toBe('2026-10-07.13');
		expect(fixture.points).toHaveLength(97);
		expect(fixture.references).toHaveLength(28);
		expect(new Set(fixture.references).size).toBe(28);
	});

	it('les 97 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(97);
	});

	it('les 28 références d’automatismes de la 6e visent EXACTEMENT les cibles du document', () => {
		const actualCodes = refRows
			.map((r) => pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`)
			.sort();
		expect(actualCodes).toEqual([...fixture.references].sort());
	});

	it('architecture cible : objective_id NULL, rang NULL, fluence = les 2 points d’Automatismes, kind algorithme = pensée informatique', () => {
		expect(pointRows.length).toBeGreaterThan(0);
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);

		const fluents = pointRows.filter((r) => r.regime_acquisition === 'fluence');
		expect(fluents.map((r) => r.code).sort()).toEqual(['6-144', '6-156']);
		expect(fluents.every((r) => (r.rubrique ?? '').endsWith('> Automatismes'))).toBe(true);

		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos.map((r) => r.code).sort()).toEqual(['6-194', '6-195', '6-196', '6-197']);
	});

	it("l'ancien seed 6e (2020) est INTACT : 95 points 6-0xx, toujours rattachés aux objectifs", () => {
		const anciens = [...pointsById.values()].filter((p) => /^6-0\d{2}$/.test(p.code));
		expect(anciens).toHaveLength(95);
		expect(anciens.every((p) => p.objective_id !== null)).toBe(true);
		expect(anciens.every((p) => p.grade === null && p.node_id === null)).toBe(true);
	});
});
