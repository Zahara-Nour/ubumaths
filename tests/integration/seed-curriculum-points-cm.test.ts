/**
 * Seed des points de programme CM1-CM2 — base de données (Supabase local requis)
 * ==============================================================================
 *
 * Migration `20261008120000_seed_curriculum_points_cm` : le premier programme
 * écrit dans l'architecture points → nœuds (ADR 0020) — 130 points CM1 +
 * 116 points CM2 du BOENJS du 17 avril 2025, VALIDÉS par David le 2026-10-07
 * (docs/wip/arbre-notions/seed-cm.md), plus les ajustements d'arbre tranchés :
 * « arrondir » → « arrondis et ordres de grandeur », « moitié » → « double et
 * moitié », sous-notions « calcul réfléchi » (division) et « droite graduée »
 * (décimaux), notion « Préalgorithmique » en tête de la branche Algorithmique.
 *
 * La preuve est INTÉGRALE, pas un échantillon : chaque point de la fixture
 * (générée depuis le document validé) doit se retrouver en base avec TOUS ses
 * attributs — code, énoncé, kind, exigence, régime, rubrique, grade,
 * display_order ET le chemin complet de son nœud — et rien d'autre sous les
 * codes CM1-/CM2-. Lecture ANONYME (ouverture B6 : le référentiel est public).
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
	grade: 'CM1' | 'CM2';
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
	position: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const fixture: { version: string; points: FixturePoint[] } = JSON.parse(
	readFileSync('tests/integration/fixtures/seed-cm-points.json', 'utf-8')
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

describe('Seed des points CM1-CM2 (curriculum_points → classification_nodes)', () => {
	let anon: SupabaseClient;
	let pointRows: PointRow[];
	let nodesById: Map<string, NodeRow>;

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});

		// Les points du seed (246 < 1000 : une page suffit, mais on pagine quand même).
		pointRows = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('curriculum_points')
				.select(
					'code, grade, display_order, name, kind, exigence, regime_acquisition, rubrique, node_id, objective_id, rang'
				)
				.or('code.like.CM1-%,code.like.CM2-%')
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
				.select('id, kind, parent_id, name, position')
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

	it('la fixture est bien celle du document validé (262 points après la passe)', () => {
		expect(fixture.version).toBe('2026-10-07.13');
		expect(fixture.points).toHaveLength(262);
		expect(fixture.points.filter((p) => p.grade === 'CM1')).toHaveLength(138);
		expect(fixture.points.filter((p) => p.grade === 'CM2')).toHaveLength(124);
	});

	it('les 262 points sont en base, IDENTIQUES à la fixture, chemin du nœud compris', () => {
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
		expect(pointRows).toHaveLength(262);
	});

	it('architecture cible : objective_id NULL et rang NULL sur tout le seed', () => {
		// Garde anti-vacuité : un every() sur une liste vide serait vert pour rien.
		expect(pointRows.length).toBeGreaterThan(0);
		expect(pointRows.every((r) => r.objective_id === null)).toBe(true);
		expect(pointRows.every((r) => r.rang === null)).toBe(true);
	});

	it("les ajustements de l'arbre sont appliqués (renommages et créations)", () => {
		const names = new Map<string, NodeRow[]>();
		for (const n of nodesById.values()) {
			const list = names.get(n.name) ?? [];
			list.push(n);
			names.set(n.name, list);
		}
		const parentName = (n: NodeRow) =>
			n.parent_id ? (nodesById.get(n.parent_id)?.name ?? '∅') : '∅';

		// Renommages : le nouveau nom existe au bon endroit, l'ancien a disparu
		// de cette fratrie (les suites « itest- » peuvent créer des homonymes
		// ailleurs, on vérifie PAR PARENT).
		expect(
			(names.get('arrondis et ordres de grandeur') ?? []).some(
				(n) => parentName(n) === 'Décimaux : numération'
			)
		).toBe(true);
		expect(
			(names.get('arrondir') ?? []).some((n) => parentName(n) === 'Décimaux : numération')
		).toBe(false);
		expect(
			(names.get('double et moitié') ?? []).some((n) => parentName(n) === 'Décimaux : calculs')
		).toBe(true);
		expect((names.get('moitié') ?? []).some((n) => parentName(n) === 'Décimaux : calculs')).toBe(
			false
		);

		// Créations.
		expect(
			(names.get('calcul réfléchi') ?? []).some((n) => parentName(n) === 'Entiers : division')
		).toBe(true);
		expect(
			(names.get('droite graduée') ?? []).some((n) => parentName(n) === 'Décimaux : numération')
		).toBe(true);

		// Préalgorithmique : notion, EN TÊTE de la branche Algorithmique.
		const prealgo = (names.get('Préalgorithmique') ?? []).find(
			(n) => parentName(n) === 'Algorithmique'
		);
		expect(prealgo).toBeDefined();
		expect(prealgo!.kind).toBe('notion');
		const algoId = prealgo!.parent_id!;
		const notionsAlgo = [...nodesById.values()]
			.filter((n) => n.parent_id === algoId)
			.sort((a, b) => a.position - b.position)
			.map((n) => n.name);
		expect(notionsAlgo[0]).toBe('Préalgorithmique');
	});

	it('le régime suit la décision S5 : fluence = tout le calcul mental, rien d’autre', () => {
		const fluents = pointRows.filter((r) => r.regime_acquisition === 'fluence');
		expect(fluents).toHaveLength(33);
		expect(fluents.every((r) => (r.rubrique ?? '').endsWith('> Le calcul mental'))).toBe(true);
	});

	it('passe « puces et points » (cycle 3) : scissions, retraits, ordre d’affichage', () => {
		const byCode = new Map(pointRows.map((r) => [r.code, r]));
		expect(byCode.has('CM1-096')).toBe(false);
		expect(byCode.has('CM2-086')).toBe(false);
		expect(byCode.get('CM1-132')?.display_order).toBe(
			(byCode.get('CM1-034')?.display_order ?? 0) + 1
		);
		expect(byCode.get('CM2-125')?.display_order).toBe(
			(byCode.get('CM2-124')?.display_order ?? 0) + 1
		);
		expect(pathOf(byCode.get('CM2-120')?.node_id ?? null)).toBe(
			'Grandeurs et mesures > Aires > rectangle'
		);
		for (const grade of ['CM1', 'CM2']) {
			const ordres = pointRows
				.filter((r) => r.grade === grade)
				.map((r) => r.display_order)
				.sort((a, b) => a - b);
			expect(ordres, grade).toEqual(ordres.map((_, i) => i + 1));
		}
	});
});
