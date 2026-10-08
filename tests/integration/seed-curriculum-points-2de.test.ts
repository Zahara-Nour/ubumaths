/**
 * Seed des points de 2de + références d'automatismes — (Supabase local requis)
 * ===========================================================================
 *
 * Migration `20261008235000_seed_curriculum_points_2de` : les 200 points du
 * programme de seconde générale et technologique (codes 2-201…2-400), les
 * références d'automatismes du grade '2' vers le parcours antérieur ET vers la
 * 2de elle-même (auto-références C13), et la restructuration C2 de la branche
 * Logique. VALIDÉS par David le 2026-10-08 (docs/wip/arbre-notions/seed-2de.md :
 * puces multi-parties, discutables 1-5, L1-L4).
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade '2', l'ensemble exact des
 * références, et l'ancien seed 2de (2-001…2-185, grade NULL) INTACT.
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
	grade: '2';
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
	kind: string;
	parent_id: string | null;
	name: string;
	position: number;
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-2de-points.json', 'utf-8'));

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

describe('Seed des points de 2de (points + références d’automatismes)', () => {
	let anon: SupabaseClient;
	let allPoints: PointRow[];
	let pointRows: PointRow[];
	let nodes: NodeRow[];
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
		// Le grade, pas le code : l'ancien seed occupe aussi des codes 2-xxx (grade NULL).
		pointRows = allPoints.filter((p) => p.grade === '2');

		nodes = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('classification_nodes')
				.select('id, kind, parent_id, name, position')
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
			.eq('grade', '2');
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

	it('la fixture est bien celle du document validé (200 points, arbre .15)', () => {
		expect(fixture.version).toBe('2026-10-07.15');
		expect(fixture.points).toHaveLength(200);
		expect(fixture.points.every((p) => p.grade === '2')).toBe(true);
		expect(fixture.references.length).toBeGreaterThan(50);
	});

	it('les 200 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(200);
	});

	it('les références d’automatismes du grade 2 visent EXACTEMENT les cibles du document', () => {
		const actual = refRows
			.map((r) => `${pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`}|${r.grade}`)
			.sort();
		const expected = fixture.references.map((r) => `${r.code}|${r.grade}`).sort();
		expect(actual).toEqual(expected);
		// Aucune référence ne vise l'ancien seed (grade NULL).
		expect(refRows.every((r) => pointsById.get(r.point_id)?.grade !== null)).toBe(true);
	});

	it('architecture cible et décisions L1-L3 : kinds, exigences, régime', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);

		// L1 : tout le bloc Algorithmique et programmation (2-218…2-234) en algorithme.
		const bloc = pointRows.filter((r) => r.display_order >= 18 && r.display_order <= 34);
		expect(bloc).toHaveLength(17);
		expect(bloc.every((r) => r.kind === 'algorithme')).toBe(true);
		// L2 : les 10 Exemples d'algorithme hors bloc, attendus.
		const exemples = pointRows
			.filter((r) => r.kind === 'algorithme' && (r.display_order < 18 || r.display_order > 34))
			.map((r) => r.code)
			.sort();
		expect(exemples).toEqual([
			'2-241',
			'2-242',
			'2-257',
			'2-283',
			'2-321',
			'2-322',
			'2-361',
			'2-362',
			'2-387',
			'2-388'
		]);
		expect(
			pointRows.filter((r) => r.kind === 'algorithme').every((r) => r.exigence === 'attendu')
		).toBe(true);
		// L3 : les 14 approfondissements sont des savoir-faire.
		const appro = pointRows.filter((r) => r.exigence === 'approfondissement');
		expect(appro).toHaveLength(14);
		expect(appro.every((r) => r.kind === 'savoir_faire')).toBe(true);
	});

	it("l'ancien seed 2de (2-001…2-185) est INTACT : grade NULL, rattaché à ses objectifs", () => {
		const anciens = allPoints.filter((p) => /^2-(0\d\d|1[0-7]\d|18[0-5])$/.test(p.code));
		expect(anciens).toHaveLength(185);
		expect(anciens.every((p) => p.grade === null && p.objective_id !== null)).toBe(true);
	});

	it('la branche Logique est restructurée (C2) : 4 notions, sous-notions à leur place', () => {
		const logique = nodes.find((n) => n.kind === 'branch' && n.name === 'Logique');
		expect(logique).toBeDefined();
		const notions = nodes
			.filter((n) => n.parent_id === logique?.id)
			.sort((a, b) => a.position - b.position);
		expect(notions.map((n) => n.name)).toEqual([
			'Proposition mathématique',
			'Implication et équivalence',
			'Quantificateurs et négation',
			'Raisonnements'
		]);
		const enfants = (nom: string) => {
			const notion = notions.find((n) => n.name === nom);
			return nodes
				.filter((n) => n.parent_id === notion?.id)
				.sort((a, b) => a.position - b.position)
				.map((n) => n.name);
		};
		expect(enfants('Proposition mathématique')).toEqual([
			'statut des lettres et des égalités',
			'et, ou, non'
		]);
		expect(enfants('Quantificateurs et négation')).toEqual([
			'pour tout, il existe',
			"négation d'une proposition"
		]);
		expect(enfants('Raisonnements')).toEqual([
			"par l'absurde",
			'par contraposée',
			'disjonction de cas',
			'par équivalence',
			'contre-exemple'
		]);
	});
});
