/**
 * Seed des points de Maths expertes — (Supabase local requis)
 * ==========================================================
 *
 * Migration `20261009200000_seed_curriculum_points_texp` : les 153 points du
 * programme de mathématiques expertes (codes TEXP-201…TEXP-353, grade 'T_EXP'),
 * reprise un pour un de l'ancien découpage. Aucune référence d'automatismes (A1 = non :
 * la liste de 1re est portée par la Tle spé, suivie en parallèle). VALIDÉS par David
 * le 2026-10-08 (docs/wip/arbre-notions/seed-texp.md).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade 'T_EXP', aucune référence, et
 * l'ancien seed (TEXP-001…TEXP-153, grade NULL) INTACT. Lecture ANONYME (B6).
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
	grade: 'T_EXP';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-texp-points.json', 'utf-8'));

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

describe('Seed des points de Maths expertes', () => {
	let anon: SupabaseClient;
	let allPoints: PointRow[];
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;
	let refRows: { point_id: string; grade: string }[];

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
		// Le grade, pas le code : l'ancien seed occupe aussi des codes TEXP-xxx (grade NULL).
		pointRows = allPoints.filter((p) => p.grade === 'T_EXP');

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
			.eq('grade', 'T_EXP');
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

	it('la fixture est bien celle du document validé (153 points, arbre .15)', () => {
		expect(fixture.version).toBe('2026-10-07.15');
		expect(fixture.points).toHaveLength(153);
		expect(fixture.points.every((p) => p.grade === 'T_EXP')).toBe(true);
		expect(fixture.references).toEqual([]);
	});

	it('les 153 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(153);
	});

	it('aucune référence d’automatismes au grade T_EXP (A1 = non)', () => {
		expect(refRows).toEqual([]);
	});

	it('décisions E1 et Problèmes possibles : kinds, exigences, régime', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);
		// E1 : les 4 Exemples d'algorithmes sont des approfondissements.
		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos).toHaveLength(4);
		expect(algos.every((r) => r.exigence === 'approfondissement')).toBe(true);
		// Problèmes possibles (décision David du 2026-10-04) : savoir-faire en approfondissement.
		const problemes = pointRows.filter(
			(r) => r.exigence === 'approfondissement' && r.kind !== 'algorithme'
		);
		expect(problemes).toHaveLength(28);
		expect(problemes.every((r) => r.kind === 'savoir_faire')).toBe(true);
		// Démonstrations (sans « possibles ») : attendues.
		const demos = pointRows.filter((r) => r.kind === 'demonstration');
		expect(demos).toHaveLength(16);
		expect(demos.every((r) => r.exigence === 'attendu')).toBe(true);
	});

	it("l'ancien seed Maths expertes (TEXP-001…TEXP-153) est INTACT : grade NULL, rattaché à ses objectifs", () => {
		const anciens = allPoints.filter((p) => /^TEXP-(0\d\d|1[0-4]\d|15[0-3])$/.test(p.code));
		expect(anciens).toHaveLength(153);
		expect(anciens.every((p) => p.grade === null && p.objective_id !== null)).toBe(true);
	});
});
