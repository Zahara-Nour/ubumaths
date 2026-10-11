/**
 * Seed de l'arbre des notions — base de données (Supabase local requis)
 * =====================================================================
 *
 * Migration `20261008090000_seed_classification_nodes` : l'arbre validé par
 * David le 2026-10-07 (tour complet des programmes CP → Tle) écrit en base —
 * 19 branches, 136 notions, 537 sous-notions, SANS niveaux scolaires — étendu
 * par 20261008120000 (seed CM) : +Préalgorithmique, +calcul réfléchi,
 * +droite graduée, 2 renommages → 19 + 137 + 539 ; +ratio (seed cycle 4) → 540 ;
 * branche Logique restructurée (seed 2de, décision C2 : renommage et
 * déplacements, comptes inchangés) — version .15 (ADR 0020) ; puis NETTOYÉ de
 * ses facettes par 20261012080000 (audit tranché par David le 2026-10-09,
 * ADR 0020 § 3 précisé) — version .16 : 3 sous-notions créées, 6 re-parentées,
 * 63 nœuds renommés, 74 archivés → 19 + 134 + 472 nœuds ACTIFS. Un nœud
 * archivé reste en base (ADR 0019) : la copie figée les liste à part
 * (« archives »), et le test les compare aussi.
 *
 * La preuve est INTÉGRALE, pas un échantillon : l'ensemble exact des chemins
 * « branche > notion > sous-notion » du JSON source
 * (copie figée : tests/integration/fixtures/arbre-notions-seed.json) doit se
 * retrouver en base, et
 * rien d'autre sous les branches du seed. Les nœuds créés par les autres
 * suites (préfixe « itest- ») vivent sous leurs propres racines : on compare
 * seulement les arbres dont la racine est une branche du JSON.
 *
 * ⚠️ La copie figée, pas docs/wip/arbre-notions/arbre-notions.json : le JSON
 * de travail évolue en commit direct sur main (doc), sans CI, alors que la
 * base ne change qu'avec une migration. Le 2026-10-08, la version .15 du JSON
 * (branche Logique) a cassé ce test sur toutes les PR. À la migration qui
 * seede une nouvelle version, remplacer la copie dans le même commit.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface ArbreJson {
	version: string;
	branches: { nom: string; notions: { nom: string; sous_notions: string[] }[] }[];
	/** Nœuds archivés (version .16) : genre et chemin final. */
	archives: { kind: 'notion' | 'subnotion'; chemin: string }[];
}

interface NodeRow {
	id: string;
	kind: 'branch' | 'notion' | 'subnotion';
	parent_id: string | null;
	name: string;
	position: number;
	archived_at: string | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const arbre: ArbreJson = JSON.parse(
	readFileSync('tests/integration/fixtures/arbre-notions-seed.json', 'utf-8')
);

/** Tous les chemins attendus, préfixés par leur genre. */
function expectedPaths(): Set<string> {
	const paths = new Set<string>();
	for (const b of arbre.branches) {
		paths.add(`branch|${b.nom}`);
		for (const n of b.notions) {
			paths.add(`notion|${b.nom} > ${n.nom}`);
			for (const s of n.sous_notions) {
				paths.add(`subnotion|${b.nom} > ${n.nom} > ${s}`);
			}
		}
	}
	return paths;
}

// ============================================================================
// SUITE
// ============================================================================

describe("Seed de l'arbre des notions (classification_nodes)", () => {
	let anon: SupabaseClient;
	let rows: NodeRow[];

	beforeAll(async () => {
		anon = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		// Lecture ANONYME : l'arbre est public (PR 1) — le seed doit être visible
		// sans connexion. PostgREST plafonne à 1000 lignes par page : on pagine.
		rows = [];
		for (let from = 0; ; from += 1000) {
			const { data, error } = await anon
				.from('classification_nodes')
				.select('id, kind, parent_id, name, position, archived_at')
				.order('id')
				.range(from, from + 999);
			if (error) throw new Error(`lecture anon refusée : ${error.message}`);
			rows.push(...((data ?? []) as NodeRow[]));
			if (!data || data.length < 1000) break;
		}
	});

	it('le JSON source est bien la version attendue', () => {
		expect(arbre.version).toBe('2026-10-09.16');
		expect(arbre.branches).toHaveLength(19);
		expect(arbre.archives).toHaveLength(74);
	});

	it("l'arbre ACTIF correspond EXACTEMENT au JSON (625 chemins), les archivés à sa liste (74)", () => {
		const byId = new Map(rows.map((r) => [r.id, r]));
		const branchNames = new Set(arbre.branches.map((b) => b.nom));

		// Chemins réels de la base, restreints aux arbres dont la racine est une
		// branche du JSON (les nœuds « itest- » des autres suites sont ignorés).
		const actual = new Set<string>();
		const archived = new Set<string>();
		for (const r of rows) {
			let path = r.name;
			let root = r;
			while (root.parent_id) {
				const parent = byId.get(root.parent_id);
				if (!parent) throw new Error(`parent manquant pour ${r.name}`);
				path = `${parent.name} > ${path}`;
				root = parent;
			}
			if (!branchNames.has(root.name)) continue;
			(r.archived_at === null ? actual : archived).add(`${r.kind}|${path}`);
		}

		const expected = expectedPaths();
		// Comparaison par différences : les messages d'échec nomment les chemins.
		const missing = [...expected].filter((p) => !actual.has(p));
		const extra = [...actual].filter((p) => !expected.has(p));
		expect(missing, `chemins du JSON absents de la base`).toEqual([]);
		expect(extra, `chemins en base absents du JSON`).toEqual([]);
		expect(actual.size).toBe(19 + 134 + 472);
		expect([...archived].sort()).toEqual(arbre.archives.map((a) => `${a.kind}|${a.chemin}`).sort());
	});

	it("les positions suivent l'ordre du JSON (branches et notions actives)", () => {
		const branches = rows
			.filter((r) => r.kind === 'branch' && arbre.branches.some((b) => b.nom === r.name))
			.sort((a, b) => a.position - b.position)
			.map((r) => r.name);
		expect(branches).toEqual(arbre.branches.map((b) => b.nom));

		// Les notions actives de la première et de la dernière branche, dans l'ordre.
		for (const b of [arbre.branches[0], arbre.branches[18]]) {
			const branchRow = rows.find((r) => r.kind === 'branch' && r.name === b.nom);
			const notions = rows
				.filter(
					(r) => r.kind === 'notion' && r.parent_id === branchRow?.id && r.archived_at === null
				)
				.sort((a, b2) => a.position - b2.position)
				.map((r) => r.name);
			expect(notions, b.nom).toEqual(b.notions.map((n) => n.nom));
		}
	});
});
