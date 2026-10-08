/**
 * Seed des points de 1re enseignement scientifique + références — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261010160000_seed_curriculum_points_1gen` : les 44 points du programme de
 * mathématiques intégré à l'enseignement scientifique de 1re générale (« module
 * spécifique », codes 1GEN-001…044, grade '1_GEN') et les références du grade '1_GEN' :
 * lignes de la partie Automatismes (dont une auto-référence), liste de 2de reprise (C16),
 * entretien des contenus repris de 2de (U5/V1). VALIDÉS par David le 2026-10-08
 * (docs/wip/arbre-notions/seed-1gen.md). Pas d'ancien seed pour ce niveau.
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade '1_GEN', l'ensemble exact des
 * références. Lecture ANONYME (B6).
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
	grade: '1_GEN';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-1gen-points.json', 'utf-8'));

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

describe('Seed des points de 1re enseignement scientifique (points + références)', () => {
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
		pointRows = allPoints.filter((p) => p.grade === '1_GEN');

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
			.eq('grade', '1_GEN');
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

	it('la fixture est bien celle du document validé (44 points, arbre .15)', () => {
		expect(fixture.version).toBe('2026-10-07.15');
		expect(fixture.points).toHaveLength(44);
		expect(fixture.points.every((p) => p.grade === '1_GEN')).toBe(true);
		expect(fixture.references).toHaveLength(84);
	});

	it('les 44 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(44);
	});

	it('les références du grade 1_GEN visent EXACTEMENT les cibles du document (liste de 2de comprise)', () => {
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
		// Une seule auto-référence : le signe d'une expression factorisée du second degré.
		expect([...codes].filter((c) => c.startsWith('1GEN-'))).toEqual(['1GEN-027']);
		// C14 : jamais un point d'un programme parallèle.
		const grades = refRows.map((r) => pointsById.get(r.point_id)?.grade);
		expect(grades.filter((g) => g === '1_SPE' || g === '1_TECHNO')).toEqual([]);
		expect(actual).toHaveLength(84);
	});

	it('attributs : tout attendu, aucun algorithme, régime', () => {
		// Sans ce compte, les « every » passeraient sur une base vide.
		expect(pointRows).toHaveLength(44);
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);
		expect(pointRows.every((r) => r.exigence === 'attendu')).toBe(true);
		expect(pointRows.filter((r) => r.kind === 'algorithme')).toEqual([]);
	});
});
