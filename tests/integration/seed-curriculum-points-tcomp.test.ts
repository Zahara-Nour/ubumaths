/**
 * Seed des points de Tle complémentaire + références — (Supabase local requis)
 * ===========================================================================
 *
 * Migration `20261009160000_seed_curriculum_points_tcomp` : les 129 points du
 * programme de mathématiques complémentaires de terminale (codes TCOMP-201…TCOMP-329,
 * grade 'T_COMP') et les références du grade 'T_COMP' : entretien des contenus repris
 * mot pour mot de la 2de et de la 1re (U5/V1), liste d'automatismes de 1re spé reprise
 * pour le cycle terminal (A1). VALIDÉS par David le 2026-10-08
 * (docs/wip/arbre-notions/seed-tcomp.md).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade 'T_COMP', l'ensemble exact des
 * références, et l'ancien seed Tle comp. (TCOMP-001…TCOMP-139, grade NULL) INTACT.
 * Lecture ANONYME (B6).
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
	grade: 'T_COMP';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-tcomp-points.json', 'utf-8'));

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

describe('Seed des points de Tle complémentaire (points + références)', () => {
	let anon: SupabaseClient;
	let allPoints: PointRow[];
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;
	let refRows: { point_id: string; grade: string }[];
	let pointsById: Map<string, PointRow>;

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Tous les points (la table dépasse largement 1 000 lignes) : on pagine.
		allPoints = [];
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
		// Le grade, pas le code : l'ancien seed occupe aussi des codes TCOMP-xxx (grade NULL).
		pointRows = allPoints.filter((p) => p.grade === 'T_COMP');

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
			.eq('grade', 'T_COMP');
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

	it('la fixture est bien celle du document validé (129 points, arbre .16)', () => {
		expect(fixture.version).toBe('2026-10-09.16'); // chemins de l'arbre nettoyé (20261012080000)
		expect(fixture.points).toHaveLength(129);
		expect(fixture.points.every((p) => p.grade === 'T_COMP')).toBe(true);
		expect(fixture.references.length).toBeGreaterThan(90);
	});

	it('les 129 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(129);
	});

	it('les références du grade T_COMP visent EXACTEMENT les cibles du document (liste de 1re comprise)', () => {
		const actual = refRows
			.map((r) => `${pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`}|${r.grade}`)
			.sort();
		const expected = fixture.references.map((r) => `${r.code}|${r.grade}`).sort();
		expect(actual).toEqual(expected);
		// Aucune référence ne vise l'ancien seed (grade NULL).
		expect(refRows.every((r) => pointsById.get(r.point_id)?.grade !== null)).toBe(true);
		// A1 : toute la liste de 1re spé (qui contient celle de 2de) est reprise.
		const refs1re: { references: { code: string }[] } = JSON.parse(
			readFileSync('tests/integration/fixtures/seed-1spe-points.json', 'utf-8')
		);
		const codes = new Set(actual.map((s) => s.split('|')[0]));
		expect(refs1re.references.filter((r) => !codes.has(r.code))).toEqual([]);
	});

	it('décisions E1, démonstrations possibles et D1 : kinds, exigences, régime', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);
		// E1 : les 10 Exemples d'algorithme sont des approfondissements.
		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos).toHaveLength(10);
		expect(algos.every((r) => r.exigence === 'approfondissement')).toBe(true);
		// Démonstrations « possibles » (décision David du 2026-10-04) : non exigibles.
		const demos = pointRows.filter((r) => r.kind === 'demonstration');
		expect(demos).toHaveLength(12);
		expect(demos.every((r) => r.exigence === 'approfondissement')).toBe(true);
		// D1 : déciles et rapport interdécile, seul contenu propre aux Thèmes d'étude.
		const d1 = pointRows.filter(
			(r) => r.kind === 'connaissance' && r.exigence === 'approfondissement'
		);
		expect(d1.map((r) => r.code)).toEqual(['TCOMP-202']);
		expect(pointRows.filter((r) => r.exigence === 'approfondissement')).toHaveLength(23);
	});

	it("l'ancien seed Tle comp. (TCOMP-001…TCOMP-139) est INTACT : grade NULL, rattaché à ses objectifs", () => {
		const anciens = allPoints.filter((p) => /^TCOMP-(0\d\d|1[0-3]\d)$/.test(p.code));
		expect(anciens).toHaveLength(139);
		expect(anciens.every((p) => p.grade === null && p.objective_id !== null)).toBe(true);
	});
});
