/**
 * Nettoyage de l'arbre des notions : les facettes disparaissent — (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261012080000_nettoyage_facettes_arbre` : l'audit des facettes ENTIÈREMENT
 * TRANCHÉ par David le 2026-10-09 (docs/wip/arbre-notions/audit-facettes.md ; ADR 0020 § 3
 * précisé — une notion n'a qu'un découpage, par contenu mathématique) et les rangements
 * corrigés du lot de l'étape 2 de C5 et du crible. Copie figée des opérations :
 * tests/integration/fixtures/nettoyage-facettes.json.
 *
 * 1. Après les migrations, l'arbre et les points sont dans l'état final (base locale).
 * 2. Les modèles et les exercices n'existent qu'en production. Dans une transaction annulée,
 *    le test exécute le ROLLBACK écrit dans la migration (l'arbre revient à la version .15),
 *    fabrique des copies des identifiants de la prod rangées par la #981 (rejouée depuis son
 *    fichier), puis REJOUE la migration depuis son fichier. La preuve est INTÉGRALE : chaque
 *    modèle et chaque rangement d'exercice est comparé à l'état attendu ; les dates de
 *    modification (modèles, points) et de création (doublons recréés) sont vérifiées.
 * 3. Les branches d'échec : chaque garde de la migration, et de son rollback, refuse avec SON
 *    message.
 * 4. La structure du fichier : aucun contrôle de transaction, et la résolution des chemins,
 *    les gardes et le lock_timeout précèdent la première écriture — c'est ce qui garantit
 *    qu'un refus ne laisse rien derrière lui.
 * 5. Le rollback ramène exactement l'état d'avant.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback, TRANSACTION_CONTROL } from '../helpers/database/migration-rollback';
import { nodeIdByPath, readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

/** Copie figée des opérations (clés en français : ce sont des données). */
interface CleanupFixture {
	arbre_avant: string;
	arbre_apres: string;
	noeuds: {
		crees: { parent: string; nom: string; chemin_final: string }[];
		reparentes: { avant: string; nouveau_parent: string; chemin_final: string }[];
		renommes: { avant: string; ancien_nom: string; nouveau_nom: string; chemin_final: string }[];
		archives: { avant: string; kind: string; chemin_final: string }[];
	};
	points: { code: string; avant: string; apres: string }[];
	modeles: { id: string; avant: string; apres: string }[];
	rangements: { exercice: string; avant: string; apres: string; principal: boolean }[];
	suppressions: {
		exercice: string;
		noeud: string;
		garde: string;
		garde_final: string;
		principal_transfere: boolean;
		position: number;
		garde_principal: boolean;
		garde_position: number;
		garde_position_finale: number;
		/** date de création du doublon, lue en production */
		created_at: string;
	}[];
	attendu_modeles: Record<string, string>;
	attendu_rangements: Record<string, { chemin: string; principal: boolean; position: number }[]>;
}

interface Classification981Fixture {
	modeles: { id: string }[];
	exercices: { id: string }[];
	exclus: string[];
}

interface State {
	/** chemin → genre et archivage, sous les branches de l'arbre (les racines « itest- » sont ignorées) */
	nodes: Map<string, { kind: string; archived: boolean }>;
	/** code → chemin, points de la nouvelle génération (grade non nul) */
	points: Map<string, string>;
	/** code → date de modification, pour les 125 points re-rattachés */
	pointDates: Map<string, string>;
	templates: Map<string, { path: string; updatedAt: string }>;
	/** exercice → rangements « position§principal§chemin », triés */
	classifications: Map<string, string[]>;
	/** « exercice§chemin » → date de création (texte exact, microsecondes comprises) */
	classificationDates: Map<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261012080000_nettoyage_facettes_arbre.sql';
const CLASSIFICATION_981 = 'supabase/migrations/20261011200000_rangements_modeles_exercices.sql';
const fixture: CleanupFixture = JSON.parse(
	readFileSync('tests/integration/fixtures/nettoyage-facettes.json', 'utf-8')
);
const fixture981: Classification981Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/rangements.json', 'utf-8')
);
const BRANCHES = new Set<string>(
	(
		JSON.parse(readFileSync('tests/integration/fixtures/arbre-notions-seed.json', 'utf-8')) as {
			branches: { nom: string }[];
		}
	).branches.map((b) => b.nom)
);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger n'est pas modifier). */
const BEFORE = '2026-01-02T03:04:05.000Z';
const TEMPLATE_IDS = fixture981.modeles.map((m) => m.id);
const EXERCISE_IDS = [...fixture981.exercices.map((e) => e.id), ...fixture981.exclus];
const POINT_CODES = fixture.points.map((p) => p.code);
/** Première écriture sur une table publique (les tables temporaires `_nf_*` ne comptent pas). */
const PUBLIC_WRITE = /\b(?:insert\s+into|update|delete\s+from|alter\s+table)\s+public\./i;
/** Un modèle de plus, hors des 1 005 copies, pour poser un contenu sur un nœud. */
const EXTRA_TEMPLATE = `insert into public.question_templates
	(id, type, grades, theme, domain, level, variations, status, title, classification_node_id)
	values (gen_random_uuid(), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb,
	        'draft', 'modèle de plus', $1)`;

// ============================================================================
// FONCTIONS
// ============================================================================

async function readState(pg: Client): Promise<State> {
	const paths = await readNodePaths(pg);
	const pathOf = (id: string | null) => (id ? (paths.get(id)?.path ?? '∅') : '∅');
	const nodes = new Map<string, { kind: string; archived: boolean }>();
	for (const node of paths.values()) {
		if (BRANCHES.has(node.root)) nodes.set(node.path, { kind: node.kind, archived: node.archived });
	}

	const p = await pg.query<{ code: string; node_id: string | null; updated_at: Date }>(
		'select code, node_id, updated_at from public.curriculum_points where grade is not null'
	);
	const points = new Map(p.rows.map((r) => [r.code, pathOf(r.node_id)]));
	const moved = new Set(POINT_CODES);
	const pointDates = new Map(
		p.rows.filter((r) => moved.has(r.code)).map((r) => [r.code, r.updated_at.toISOString()])
	);

	const q = await pg.query<{
		id: string;
		classification_node_id: string | null;
		updated_at: Date;
	}>(
		'select id, classification_node_id, updated_at from public.question_templates where id = any($1::uuid[])',
		[TEMPLATE_IDS]
	);
	const templates = new Map(
		q.rows.map((r) => [
			r.id,
			{ path: pathOf(r.classification_node_id), updatedAt: r.updated_at.toISOString() }
		])
	);

	const c = await pg.query<{
		exercise_id: string;
		node_id: string;
		is_primary: boolean;
		position: number;
		created_at: string;
	}>(
		`select exercise_id, node_id, is_primary, position, created_at::text as created_at
		   from public.exercise_classifications where exercise_id = any($1::uuid[])`,
		[EXERCISE_IDS]
	);
	const classifications = new Map<string, string[]>();
	const classificationDates = new Map<string, string>();
	for (const r of c.rows) {
		const list = classifications.get(r.exercise_id) ?? [];
		list.push(`${r.position}§${r.is_primary}§${pathOf(r.node_id)}`);
		classifications.set(r.exercise_id, list);
		classificationDates.set(`${r.exercise_id}§${pathOf(r.node_id)}`, r.created_at);
	}
	for (const list of classifications.values()) list.sort();

	return { nodes, points, pointDates, templates, classifications, classificationDates };
}

/**
 * La prod d'avant le nettoyage, dans la transaction ouverte : l'arbre .15 (rollback du
 * nettoyage), les copies des modèles et des exercices rangées par la #981 rejouée, puis ce que
 * la prod porte et qu'une base neuve n'a pas : une date de modification ancienne sur les 125
 * points, et la date de création de PRODUCTION des 4 doublons.
 */
async function prepareProdCopy(pg: Client, authorId: string): Promise<void> {
	await pg.query(extractRollback(MIGRATION));
	await insertProdCopies(pg, {
		templateIds: TEMPLATE_IDS,
		exerciseIds: EXERCISE_IDS,
		authorId,
		timestamp: BEFORE
	});
	await pg.query(readFileSync(CLASSIFICATION_981, 'utf-8'));

	await pg.query(
		'alter table public.curriculum_points disable trigger update_curriculum_points_updated_at'
	);
	const dated = await pg.query(
		'update public.curriculum_points set updated_at = $2 where grade is not null and code = any($1)',
		[POINT_CODES, BEFORE]
	);
	await pg.query(
		'alter table public.curriculum_points enable trigger update_curriculum_points_updated_at'
	);
	if (dated.rowCount !== POINT_CODES.length) {
		throw new Error(`points datés : ${dated.rowCount}/${POINT_CODES.length}`);
	}

	for (const s of fixture.suppressions) {
		const r = await pg.query(
			`update public.exercise_classifications set created_at = $3::timestamptz
			  where exercise_id = $1 and node_id = $2`,
			[s.exercice, await nodeIdByPath(pg, s.noeud), s.created_at]
		);
		if (r.rowCount !== 1) throw new Error(`doublon introuvable : ${s.exercice} § ${s.noeud}`);
	}
}

function expectedClassifications(exerciseId: string): string[] {
	return (fixture.attendu_rangements[exerciseId] ?? [])
		.map((r) => `${r.position}§${r.principal}§${r.chemin}`)
		.sort();
}

/** Le corps exécutable de la migration : tout ce qui suit le bloc de rollback, sans commentaires. */
function executableLines(): string[] {
	const sql = readFileSync(MIGRATION, 'utf-8');
	return sql
		.slice(sql.indexOf('-- ROLLBACK:END'))
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'));
}

async function triggerState(pg: Client, name: string): Promise<string[]> {
	const r = await pg.query<{ tgenabled: string }>(
		'select tgenabled from pg_trigger where tgname = $1',
		[name]
	);
	return r.rows.map((row) => row.tgenabled);
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// SUITES
// ============================================================================

describe("Nettoyage de l'arbre : l'état final après les migrations (base locale)", () => {
	let state: State;

	beforeAll(async () => {
		state = await readState(await getPostgresClient());
	});

	it("la fixture est l'état final consolidé (arbre .15 → .16)", () => {
		expect(fixture.arbre_avant).toBe('2026-10-07.15');
		expect(fixture.arbre_apres).toBe('2026-10-09.16');
		expect(fixture.noeuds.crees).toHaveLength(3);
		expect(fixture.noeuds.reparentes).toHaveLength(6);
		expect(fixture.noeuds.renommes).toHaveLength(63);
		expect(fixture.noeuds.archives).toHaveLength(74);
		expect(fixture.points).toHaveLength(125);
		expect(fixture.modeles).toHaveLength(234);
		expect(fixture.rangements).toHaveLength(49);
		expect(fixture.suppressions).toHaveLength(4);
	});

	it('les 3 sous-notions créées existent, actives', () => {
		const gaps = fixture.noeuds.crees.filter((c) => {
			const node = state.nodes.get(c.chemin_final);
			return !node || node.archived || node.kind !== 'subnotion';
		});
		expect(gaps).toEqual([]);
	});

	it('les 6 sous-notions re-parentées sont sous leur nouvelle notion, plus sous l’ancienne', () => {
		const gaps = fixture.noeuds.reparentes.filter((r) => {
			const node = state.nodes.get(r.chemin_final);
			return !node || node.archived || state.nodes.has(r.avant);
		});
		expect(gaps).toEqual([]);
	});

	it('les 63 nœuds renommés portent leur nouveau nom, plus l’ancien', () => {
		const gaps = fixture.noeuds.renommes.filter((r) => {
			const node = state.nodes.get(r.chemin_final);
			return !node || node.archived || state.nodes.has(r.avant);
		});
		expect(gaps).toEqual([]);
	});

	it('les 74 nœuds sont archivés, aucun n’est supprimé, et rien d’autre n’est archivé', () => {
		const gaps = fixture.noeuds.archives.filter((a) => {
			const node = state.nodes.get(a.chemin_final);
			return !node || !node.archived || node.kind !== a.kind;
		});
		expect(gaps).toEqual([]);
		const archived = [...state.nodes.entries()].filter(([, n]) => n.archived).map(([p]) => p);
		expect(archived.sort()).toEqual(fixture.noeuds.archives.map((a) => a.chemin_final).sort());
	});

	it('les 125 points re-rattachés sont sur leur nouveau nœud', () => {
		const gaps = fixture.points
			.map((p) => ({ code: p.code, expected: p.apres, actual: state.points.get(p.code) }))
			.filter((p) => p.expected !== p.actual);
		expect(gaps).toEqual([]);
	});

	it('aucun point ne reste sur un nœud archivé', async () => {
		const pg = await getPostgresClient();
		const r = await pg.query<{ n: string }>(
			`select count(*) as n from public.curriculum_points p
			   join public.classification_nodes c on c.id = p.node_id where c.archived_at is not null`
		);
		expect(Number(r.rows[0].n)).toBe(0);
	});
});

describe('Nettoyage : rejeu sur une copie de la prod (modèles et exercices)', () => {
	let pg: Client | undefined;
	/** La prod d'avant le nettoyage : arbre .15 (rollback), copies rangées par la #981. */
	let prodState: State;
	let after: State;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await prepareProdCopy(pg, teacher.id);
		prodState = await readState(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		after = await readState(pg);
	}, 120_000);

	afterAll(async () => {
		await pg?.query('rollback');
		await cleanupAllTestData();
	});

	it('le rollback ramène l’arbre .15 : sous-notions créées absentes, anciens noms, rien d’archivé', () => {
		expect(fixture.noeuds.crees.filter((c) => prodState.nodes.has(c.chemin_final))).toEqual([]);
		expect(
			fixture.noeuds.renommes.filter((r) => prodState.nodes.get(r.avant)?.archived !== false)
		).toEqual([]);
		expect(
			fixture.noeuds.reparentes.filter((r) => prodState.nodes.get(r.avant)?.archived !== false)
		).toEqual([]);
		expect(
			fixture.noeuds.archives.filter((a) => prodState.nodes.get(a.avant)?.archived !== false)
		).toEqual([]);
		expect([...prodState.nodes.values()].filter((n) => n.archived)).toEqual([]);
		expect(prodState.nodes.size).toBe(19 + 137 + 540);
	});

	it('le rollback remet chaque point re-rattaché sur son nœud d’avant', () => {
		const gaps = fixture.points.filter((p) => prodState.points.get(p.code) !== p.avant);
		expect(gaps).toEqual([]);
	});

	it('la copie de la prod est rangée comme par la #981 (modèles sur leur nœud de départ)', () => {
		expect(prodState.templates.size).toBe(1005);
		const gaps = fixture.modeles.filter((m) => prodState.templates.get(m.id)?.path !== m.avant);
		expect(gaps).toEqual([]);
	});

	it('chaque modèle (1 005) est EXACTEMENT dans le nœud attendu', () => {
		const gaps = TEMPLATE_IDS.map((id) => ({
			id,
			expected: fixture.attendu_modeles[id],
			actual: after.templates.get(id)?.path
		})).filter((g) => g.expected !== g.actual);
		expect(gaps).toEqual([]);
		expect(after.templates.size).toBe(1005);
	});

	it('chaque exercice a EXACTEMENT ses rangements attendus (principal et position compris)', () => {
		const gaps = fixture981.exercices
			.map((e) => ({
				id: e.id,
				expected: expectedClassifications(e.id),
				actual: after.classifications.get(e.id) ?? []
			}))
			.filter((g) => JSON.stringify(g.expected) !== JSON.stringify(g.actual));
		expect(gaps).toEqual([]);
		for (const id of fixture981.exclus) expect(after.classifications.get(id)).toBeUndefined();
	});

	it('les 4 doublons : le rangement gardé existe EN BASE, principal et en tête quand le principal est transféré', () => {
		const facetFinal = new Map(fixture.noeuds.archives.map((a) => [a.avant, a.chemin_final]));
		for (const s of fixture.suppressions) {
			const before = prodState.classifications.get(s.exercice) ?? [];
			expect(before, s.exercice).toContain(`${s.position}§${s.principal_transfere}§${s.noeud}`);
			expect(before, s.exercice).toContain(`${s.garde_position}§${s.garde_principal}§${s.garde}`);

			const final = after.classifications.get(s.exercice) ?? [];
			// Le doublon a disparu de la facette (archivée)…
			expect(final.some((r) => r.endsWith(`§${facetFinal.get(s.noeud)}`))).toBe(false);
			// … le rangement gardé est là, principal s'il l'était ou s'il hérite du principal,
			// et en tête (position du supprimé) quand il en hérite.
			const expectedPrimary = s.principal_transfere || s.garde_principal;
			expect(final, s.exercice).toContain(
				`${s.garde_position_finale}§${expectedPrimary}§${s.garde_final}`
			);
			if (s.principal_transfere) expect(s.garde_position_finale).toBe(s.position);
			expect(final.filter((r) => r.split('§')[1] === 'true')).toHaveLength(1);
		}
		expect(fixture.suppressions.filter((s) => s.principal_transfere)).toHaveLength(2);
	});

	it('plus aucun modèle ni rangement d’exercice sur un nœud archivé', () => {
		expect([...after.templates.values()].filter((t) => after.nodes.get(t.path)?.archived)).toEqual(
			[]
		);
		const onArchived = [...after.classifications.entries()].filter(([, list]) =>
			list.some((r) => after.nodes.get(r.split('§')[2])?.archived)
		);
		expect(onArchived).toEqual([]);
	});

	it('`updated_at` des 1 005 modèles est préservé, et le trigger de date est rétabli', async () => {
		if (!pg) throw new Error('client pg non initialisé');
		expect(after.templates.size).toBe(1005);
		expect([...after.templates.values()].every((t) => t.updatedAt === BEFORE)).toBe(true);
		expect(await triggerState(pg, 'update_question_templates_updated_at')).toEqual(['O']);
	});

	it('`updated_at` des 125 points re-rattachés est préservé, et le trigger de date est rétabli', async () => {
		if (!pg) throw new Error('client pg non initialisé');
		expect(after.pointDates.size).toBe(125);
		expect([...after.pointDates.values()].every((d) => d === BEFORE)).toBe(true);
		expect(await triggerState(pg, 'update_curriculum_points_updated_at')).toEqual(['O']);
	});

	it('le rollback, rejoué après la migration, ramène EXACTEMENT l’état d’avant', async () => {
		if (!pg) throw new Error('client pg non initialisé');
		await pg.query(extractRollback(MIGRATION));
		const restored = await readState(pg);
		expect([...restored.nodes.entries()].sort()).toEqual([...prodState.nodes.entries()].sort());
		expect([...restored.points.entries()].sort()).toEqual([...prodState.points.entries()].sort());
		expect([...restored.pointDates.entries()].sort()).toEqual(
			[...prodState.pointDates.entries()].sort()
		);
		expect([...restored.templates.entries()].sort()).toEqual(
			[...prodState.templates.entries()].sort()
		);
		expect([...restored.classifications.entries()].sort()).toEqual(
			[...prodState.classifications.entries()].sort()
		);
		expect([...restored.classificationDates.entries()].sort()).toEqual(
			[...prodState.classificationDates.entries()].sort()
		);
		// Les 4 doublons recréés portent leur date de création de PRODUCTION
		for (const s of fixture.suppressions) {
			const r = await pg.query<{ n: string }>(
				`select count(*) as n from public.exercise_classifications
				  where exercise_id = $1 and node_id = $2 and created_at = $3::timestamptz`,
				[s.exercice, await nodeIdByPath(pg, s.noeud), s.created_at]
			);
			expect(Number(r.rows[0].n), `${s.exercice} § ${s.noeud}`).toBe(1);
		}
		expect(await triggerState(pg, 'update_question_templates_updated_at')).toEqual(['O']);
		expect(await triggerState(pg, 'update_curriculum_points_updated_at')).toEqual(['O']);
	});
});

describe('Nettoyage : chaque garde refuse avec son message', () => {
	let pg: Client | undefined;
	let authorId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		authorId = (await TestData.profile().withRole('teacher').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg?.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	/**
	 * Prépare la copie de la prod, la perturbe, rejoue la migration : elle doit être refusée par
	 * la garde attendue (son message). Que ce refus ne laisse rien derrière lui tient à la
	 * structure du fichier (gardes avant toute écriture), vérifiée dans la suite suivante.
	 */
	async function replayAfter(
		perturbation: string,
		params: (client: Client) => Promise<unknown[]>,
		expected: RegExp
	) {
		if (!pg) throw new Error('client pg non initialisé');
		await pg.query('begin');
		try {
			await prepareProdCopy(pg, authorId);
			const touched = await pg.query(perturbation, await params(pg));
			expect(touched.rowCount).toBeGreaterThan(0);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(expected);
		} finally {
			await pg.query('rollback');
		}
	}

	/** Même chose pour le rollback : la migration passe, puis la perturbation, puis le rollback refuse. */
	async function rollbackAfter(
		perturbation: string,
		params: (client: Client) => Promise<unknown[]>,
		expected: RegExp
	) {
		if (!pg) throw new Error('client pg non initialisé');
		await pg.query('begin');
		try {
			await prepareProdCopy(pg, authorId);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const touched = await pg.query(perturbation, await params(pg));
			expect(touched.rowCount).toBeGreaterThan(0);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(expected);
		} finally {
			await pg.query('rollback');
		}
	}

	it('un nœud déjà renommé ne se résout plus : la résolution stricte refuse', async () => {
		const rename = fixture.noeuds.renommes[0];
		await replayAfter(
			'update public.classification_nodes set name = $2 where id = $1',
			async (client) => [await nodeIdByPath(client, rename.avant), rename.nouveau_nom],
			new RegExp(`chemins introuvables dans l'arbre : .*${escapeRegExp(rename.avant)}`)
		);
	}, 60_000);

	it('un nœud de départ introuvable (renommé ailleurs) : la résolution stricte refuse', async () => {
		const renamed = new Set(fixture.noeuds.renommes.map((r) => r.avant));
		const archived = new Set(fixture.noeuds.archives.map((a) => a.avant));
		const template = fixture.modeles.find(
			(m) => !renamed.has(m.avant) && !archived.has(m.avant) && m.avant.split(' > ').length === 3
		);
		if (!template) throw new Error('fixture : aucun nœud de départ hors renommages et archivages');
		await replayAfter(
			'update public.classification_nodes set name = $2 where id = $1',
			async (client) => [await nodeIdByPath(client, template.avant), 'nœud renommé ailleurs'],
			new RegExp(`chemins introuvables dans l'arbre : .*${escapeRegExp(template.avant)}`)
		);
	}, 60_000);

	it('état inattendu : une facette déjà archivée', async () => {
		const facet = fixture.noeuds.archives.find((a) => a.kind === 'subnotion');
		if (!facet) throw new Error('fixture : aucune sous-notion archivée');
		await replayAfter(
			'update public.classification_nodes set archived_at = now() where id = $1',
			async (client) => [await nodeIdByPath(client, facet.avant)],
			/état inattendu : 1 nœud\(s\) en jeu déjà archivé\(s\)/
		);
	}, 60_000);

	it('état inattendu : une sous-notion à créer existe déjà', async () => {
		const created = fixture.noeuds.crees[0];
		await replayAfter(
			`insert into public.classification_nodes (kind, parent_id, name, position)
			 values ('subnotion', $1, $2, 999)`,
			async (client) => [await nodeIdByPath(client, created.parent), created.nom],
			/état inattendu : 1 sous-notion\(s\) à créer existe\(nt\) déjà/
		);
	}, 60_000);

	it('état inattendu : un point qui n’est pas sur son nœud de départ', async () => {
		const p = fixture.points[0];
		await replayAfter(
			`update public.curriculum_points set node_id = (
			   select id from public.classification_nodes
			    where kind = 'notion' and archived_at is null and id <> $2 order by id limit 1)
			  where code = $1 and grade is not null`,
			async (client) => [p.code, await nodeIdByPath(client, p.avant)],
			/état inattendu : points présents 125\/125, sur leur nœud de départ 124\/125/
		);
	}, 60_000);

	it('TOUT ou RIEN : un modèle à déplacer manquant', async () => {
		await replayAfter(
			'delete from public.question_templates where id = $1',
			async () => [fixture.modeles[0].id],
			/identifiants partiellement présents : 233 modèle\(s\) sur 234/
		);
	}, 60_000);

	it('état inattendu : un modèle à déplacer qui n’est plus sur son nœud de départ', async () => {
		const template = fixture.modeles[0];
		await replayAfter(
			`update public.question_templates set classification_node_id = (
			   select id from public.classification_nodes
			    where kind = 'subnotion' and archived_at is null and id <> $2 order by id limit 1)
			  where id = $1`,
			async (client) => [template.id, await nodeIdByPath(client, template.avant)],
			/état inattendu : 1 modèle\(s\) hors de leur nœud de départ/
		);
	}, 60_000);

	it('TOUT ou RIEN : un des 51 exercices concernés manquant', async () => {
		await replayAfter(
			'delete from public.exercises where id = $1',
			async () => [fixture.rangements[0].exercice],
			/identifiants partiellement présents : 50 exercice\(s\) sur 51/
		);
	}, 60_000);

	it('état inattendu : les 51 exercices présents, mais un rangement à déplacer manquant', async () => {
		const r = fixture.rangements[0];
		await replayAfter(
			'delete from public.exercise_classifications where exercise_id = $1 and node_id = $2',
			async (client) => [r.exercice, await nodeIdByPath(client, r.avant)],
			/état inattendu : 52 rangement\(s\) d'exercice sur 53 dans l'état attendu/
		);
	}, 60_000);

	it('état inattendu : les 51 exercices présents, mais un rangement a perdu son principal', async () => {
		const r = fixture.rangements.find((x) => x.principal);
		if (!r) throw new Error('fixture : aucun rangement principal à déplacer');
		await replayAfter(
			`update public.exercise_classifications set is_primary = false
			  where exercise_id = $1 and node_id = $2`,
			async (client) => [r.exercice, await nodeIdByPath(client, r.avant)],
			/état inattendu : 52 rangement\(s\) d'exercice sur 53 dans l'état attendu/
		);
	}, 60_000);

	it('un modèle de plus, rangé sur une facette : la vérification finale refuse (rien ne reste sur un archivé)', async () => {
		const facet = fixture.noeuds.archives.find((a) => a.kind === 'subnotion');
		if (!facet) throw new Error('fixture : aucune sous-notion archivée');
		await replayAfter(
			EXTRA_TEMPLATE,
			async (client) => [await nodeIdByPath(client, facet.avant)],
			/contenus restés sur un nœud archivé : 1/
		);
	}, 60_000);

	it('rollback : une sous-notion créée qui a reçu un contenu depuis → refus lisible, pas l’erreur de clé étrangère', async () => {
		const created = fixture.noeuds.crees[0];
		await rollbackAfter(
			EXTRA_TEMPLATE,
			async (client) => [await nodeIdByPath(client, created.chemin_final)],
			new RegExp(
				`rollback : sous-notion\\(s\\) créée\\(s\\) non vide\\(s\\), à vider avant de rejouer le rollback : ` +
					`${escapeRegExp(created.chemin_final)} \\(points : 0, modèles : 1, `
			)
		);
	}, 60_000);

	it('rollback : un modèle rangé ailleurs depuis la migration → la vérification finale refuse', async () => {
		const createdPaths = new Set(fixture.noeuds.crees.map((c) => c.chemin_final));
		const template = fixture.modeles.find((m) => !createdPaths.has(m.apres));
		if (!template) throw new Error('fixture : aucun modèle hors des sous-notions créées');
		await rollbackAfter(
			`update public.question_templates set classification_node_id = (
			   select id from public.classification_nodes
			    where kind = 'subnotion' and archived_at is null and id <> all($2::uuid[]) order by id limit 1)
			  where id = $1`,
			async (client) => {
				const excluded: string[] = [];
				for (const path of [template.apres, ...createdPaths]) {
					excluded.push(await nodeIdByPath(client, path));
				}
				return [template.id, excluded];
			},
			/rollback : modèles revenus : 233\/234/
		);
	}, 60_000);
});

describe('Nettoyage : la structure du fichier (un refus ne laisse rien derrière lui)', () => {
	it('aucun contrôle de transaction hors commentaires : la migration se joue dans la transaction appelante', () => {
		expect(executableLines().filter((line) => TRANSACTION_CONTROL.test(line))).toEqual([]);
	});

	it('la résolution des chemins et les gardes précèdent la première écriture sur une table publique', () => {
		const lines = executableLines();
		const firstWrite = lines.findIndex((line) => PUBLIC_WRITE.test(line));
		const resolution = lines.findIndex((line) => line.includes('do $resolution$'));
		const guards = lines.findIndex((line) => line.includes('do $garde$'));
		expect(firstWrite).toBeGreaterThan(0);
		expect(resolution).toBeGreaterThan(-1);
		expect(guards).toBeGreaterThan(-1);
		expect(resolution).toBeLessThan(firstWrite);
		expect(guards).toBeLessThan(firstWrite);
	});

	it('le fichier pose un lock_timeout de 5 s avant sa première écriture (et le rollback aussi)', () => {
		const lines = executableLines();
		const firstWrite = lines.findIndex((line) => PUBLIC_WRITE.test(line));
		const lockTimeout = lines.findIndex((line) => line.includes("set local lock_timeout = '5s';"));
		expect(lockTimeout).toBeGreaterThan(-1);
		expect(lockTimeout).toBeLessThan(firstWrite);
		const rollback = extractRollback(MIGRATION).split('\n');
		const rollbackLock = rollback.findIndex((l) => l.includes("set local lock_timeout = '5s';"));
		const rollbackWrite = rollback.findIndex((l) => PUBLIC_WRITE.test(l));
		expect(rollbackLock).toBeGreaterThan(-1);
		expect(rollbackLock).toBeLessThan(rollbackWrite);
	});
});
