/**
 * Seed des points de Tle spécialité + références — (Supabase local requis)
 * =======================================================================
 *
 * Migration `20261009120000_seed_curriculum_points_tspe` : les 239 points du
 * programme de spécialité de mathématiques de terminale (codes TSPE-301…TSPE-539,
 * grade 'T_SPE') et les références du grade 'T_SPE' : entretien des contenus repris
 * mot pour mot de la 2de et de la 1re (U5/V1), liste d'automatismes de 1re spé
 * reprise pour le cycle terminal (A1). VALIDÉS par David le 2026-10-08
 * (docs/wip/arbre-notions/seed-tspe.md).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade 'T_SPE', l'ensemble exact des
 * références, et l'ancien seed Tle spé (TSPE-001…TSPE-262, grade NULL) INTACT.
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
	grade: 'T_SPE';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-tspe-points.json', 'utf-8'));

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

describe('Seed des points de Tle spécialité (points + références)', () => {
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
		// Le grade, pas le code : l'ancien seed occupe aussi des codes TSPE-xxx (grade NULL).
		pointRows = allPoints.filter((p) => p.grade === 'T_SPE');

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
			.eq('grade', 'T_SPE');
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

	it('la fixture est bien celle du document validé (239 points, arbre .15)', () => {
		expect(fixture.version).toBe('2026-10-07.15');
		expect(fixture.points).toHaveLength(239);
		expect(fixture.points.every((p) => p.grade === 'T_SPE')).toBe(true);
		expect(fixture.references.length).toBeGreaterThan(100);
	});

	it('les 239 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(239);
	});

	it('les références du grade T_SPE visent EXACTEMENT les cibles du document (liste de 1re comprise)', () => {
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

	it('décisions L3 et E1 : kinds, exigences, régime', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);
		// E1 : les 18 Exemples d'algorithme sont des approfondissements.
		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos).toHaveLength(18);
		expect(algos.every((r) => r.exigence === 'approfondissement')).toBe(true);
		// L3 : les 32 Approfondissements possibles sont des savoir-faire.
		const appro = pointRows.filter(
			(r) => r.exigence === 'approfondissement' && r.kind !== 'algorithme'
		);
		expect(appro).toHaveLength(32);
		expect(appro.every((r) => r.kind === 'savoir_faire')).toBe(true);
		expect(pointRows.filter((r) => r.kind === 'demonstration')).toHaveLength(18);
	});

	it("l'ancien seed Tle spé (TSPE-001…TSPE-262) est INTACT : grade NULL, rattaché à ses objectifs", () => {
		const anciens = allPoints.filter((p) => /^TSPE-(0\d\d|1\d\d|2[0-5]\d|26[0-2])$/.test(p.code));
		expect(anciens).toHaveLength(262);
		expect(anciens.every((p) => p.grade === null && p.objective_id !== null)).toBe(true);
	});
});
