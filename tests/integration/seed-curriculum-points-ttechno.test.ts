/**
 * Seed des points de Tle technologique + références — (Supabase local requis)
 * ==========================================================================
 *
 * Migration `20261010120000_seed_curriculum_points_ttechno` : les 69 points du
 * programme de mathématiques de terminale de la voie technologique (codes
 * TTECHNO-001…069, grade 'T_TECHNO') et les références du grade 'T_TECHNO' : lignes de la
 * partie Automatismes de Tle (dont une auto-référence, l'indice de base 100 ; pas de
 * reprise de la liste de 1re, T4), entretien des contenus repris de 2de et de 1re techno
 * (U5/V1), dont tout le bloc Algorithmique. VALIDÉS par David le 2026-10-08
 * (docs/wip/arbre-notions/seed-ttechno.md). Pas d'ancien seed pour ce niveau.
 *
 * La preuve est INTÉGRALE : chaque point de la fixture avec TOUS ses attributs
 * (chemin du nœud compris), rien d'autre au grade 'T_TECHNO', l'ensemble exact des
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
	grade: 'T_TECHNO';
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
} = JSON.parse(readFileSync('tests/integration/fixtures/seed-ttechno-points.json', 'utf-8'));

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

describe('Seed des points de Tle technologique (points + références)', () => {
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
		pointRows = allPoints.filter((p) => p.grade === 'T_TECHNO');

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
			.eq('grade', 'T_TECHNO');
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

	it('la fixture est bien celle du document validé (69 points, arbre .15)', () => {
		expect(fixture.version).toBe('2026-10-07.15');
		expect(fixture.points).toHaveLength(69);
		expect(fixture.points.every((p) => p.grade === 'T_TECHNO')).toBe(true);
		expect(fixture.references).toHaveLength(89);
	});

	it('les 69 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(69);
	});

	it('les références du grade T_TECHNO visent EXACTEMENT les cibles du document', () => {
		const actual = refRows
			.map((r) => `${pointsById.get(r.point_id)?.code ?? `∅(${r.point_id})`}|${r.grade}`)
			.sort();
		const expected = fixture.references.map((r) => `${r.code}|${r.grade}`).sort();
		expect(actual).toEqual(expected);
		expect(actual).toHaveLength(89);
		// Aucune référence ne vise l'ancien seed (grade NULL).
		expect(refRows.every((r) => pointsById.get(r.point_id)?.grade !== null)).toBe(true);
		const codes = new Set(actual.map((s) => s.split('|')[0]));
		// Une seule auto-référence : l'indice de base 100.
		expect([...codes].filter((c) => c.startsWith('TTECHNO-'))).toEqual(['TTECHNO-015']);
		// Entretien : tout le bloc Algorithmique de 1re (1TECHNO-003…013) est référencé.
		const algo1re = Array.from(
			{ length: 11 },
			(_, i) => `1TECHNO-${String(i + 3).padStart(3, '0')}`
		);
		expect(algo1re.filter((c) => !codes.has(c))).toEqual([]);
		// T4 : la liste de 1re n'est pas reprise (l'équation produit nul, 2-267, en est absente).
		expect(codes.has('2-267')).toBe(false);
	});

	it('décisions T1 et T3 : série dans la rubrique, Situations algorithmiques en approfondissement', () => {
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
		expect(pointRows.every((r) => r.regime_acquisition === 'diversite')).toBe(true);
		// T3 : les 8 algorithmes, et eux seuls, sont des approfondissements.
		const algos = pointRows.filter((r) => r.kind === 'algorithme');
		expect(algos).toHaveLength(8);
		expect(algos.every((r) => r.exigence === 'approfondissement')).toBe(true);
		expect(
			pointRows.filter((r) => r.kind !== 'algorithme').every((r) => r.exigence === 'attendu')
		).toBe(true);
		// T1 : la série est dite dans la rubrique ; pas de bloc Algorithmique propre à la Tle.
		expect(
			pointRows.filter((r) => (r.rubrique ?? '').startsWith('Activités géométriques (série STD2A)'))
		).toHaveLength(14);
		expect(pointRows.some((r) => (r.rubrique ?? '').startsWith('Algorithmique'))).toBe(false);
	});
});
