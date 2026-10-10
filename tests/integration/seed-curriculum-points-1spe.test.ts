/**
 * Seed des points de 1re spécialité + références d'automatismes — (Supabase local requis)
 * =====================================================================================
 *
 * Migration `20261009080000_seed_curriculum_points_1spe` : les 165 points du
 * programme de spécialité de mathématiques de première (codes 1SPE-201…1SPE-365,
 * grade '1_SPE'), les références d'automatismes du grade '1_SPE' (lignes propres de
 * la 1re, liste de 2de reprise — C16 —, entretien du vocabulaire de 2de — V1 —, une
 * auto-référence), et la correction E1 des Exemples d'algorithme de 2de. VALIDÉS par
 * David le 2026-10-08 (docs/wip/arbre-notions/seed-1spe.md).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade '1_SPE', l'ensemble exact des
 * références, et l'ancien seed 1re spé (1SPE-001…1SPE-173, grade NULL) INTACT.
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
	grade: '1_SPE';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-1spe-points.json', 'utf-8'));

const BLOC_ALGO = 'Algorithmique et programmation > Notion de liste';

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

describe('Seed des points de 1re spécialité (points + références d’automatismes)', () => {
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
		// Le grade, pas le code : l'ancien seed occupe aussi des codes 1SPE-xxx (grade NULL).
		pointRows = allPoints.filter((p) => p.grade === '1_SPE');

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
			.eq('grade', '1_SPE');
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

	it('la fixture est bien celle du document validé (165 points, arbre .16)', () => {
		expect(fixture.version).toBe('2026-10-09.16'); // chemins de l'arbre nettoyé (20261012080000)
		expect(fixture.points).toHaveLength(165);
		expect(fixture.points.every((p) => p.grade === '1_SPE')).toBe(true);
		expect(fixture.references.length).toBeGreaterThan(80);
	});

	it('les 165 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(165);
	});

	it('les références du grade 1_SPE visent EXACTEMENT les cibles du document (liste de 2de comprise)', () => {
		const actual = refRows
			.map((r) => `${pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`}|${r.grade}`)
			.sort();
		const expected = fixture.references.map((r) => `${r.code}|${r.grade}`).sort();
		expect(actual).toEqual(expected);
		// Aucune référence ne vise l'ancien seed (grade NULL).
		expect(refRows.every((r) => pointsById.get(r.point_id)?.grade !== null)).toBe(true);
		// C16 : toute la liste de 2de est reprise.
		const refs2de: { references: { code: string }[] } = JSON.parse(
			readFileSync('tests/integration/fixtures/seed-2de-points.json', 'utf-8')
		);
		const codes = new Set(actual.map((s) => s.split('|')[0]));
		expect(refs2de.references.filter((r) => !codes.has(r.code))).toEqual([]);
	});

	it('décisions L1, L3 et E1 : kinds, exigences, régime', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);

		// L1 : le bloc Notion de liste en algorithme, attendu.
		const bloc = pointRows.filter((r) => r.rubrique === BLOC_ALGO);
		expect(bloc).toHaveLength(5);
		expect(bloc.every((r) => r.kind === 'algorithme' && r.exigence === 'attendu')).toBe(true);
		// E1 : les 12 Exemples d'algorithme hors bloc sont des approfondissements.
		const exemples = pointRows.filter((r) => r.kind === 'algorithme' && r.rubrique !== BLOC_ALGO);
		expect(exemples).toHaveLength(12);
		expect(exemples.every((r) => r.exigence === 'approfondissement')).toBe(true);
		// L3 : les 17 Approfondissements possibles sont des savoir-faire.
		const appro = pointRows.filter(
			(r) => r.exigence === 'approfondissement' && r.kind !== 'algorithme'
		);
		expect(appro).toHaveLength(17);
		expect(appro.every((r) => r.kind === 'savoir_faire')).toBe(true);
		expect(pointRows.filter((r) => r.kind === 'demonstration')).toHaveLength(12);
	});

	it("l'ancien seed 1re spé (1SPE-001…1SPE-173) est INTACT : grade NULL, rattaché à ses objectifs", () => {
		const anciens = allPoints.filter((p) => /^1SPE-(0\d\d|1[0-6]\d|17[0-3])$/.test(p.code));
		expect(anciens).toHaveLength(173);
		expect(anciens.every((p) => p.grade === null && p.objective_id !== null)).toBe(true);
	});
});
