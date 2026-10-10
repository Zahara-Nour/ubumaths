/**
 * Tags modèles → points neufs, et les règles de tag en base — (Supabase local requis)
 * ==================================================================================
 *
 * Migration `20261012160000_tags_modeles_points` (étape 2 de C5) : les 473 tags modèle → point
 * NEUF de l'état final consolidé (lot, crible et audit validés par David le 2026-10-09), et les
 * règles de tag posées en base (phase 0 et décision (a) validées le 2026-10-10). Copie figée des
 * tags : tests/integration/fixtures/tags-modeles-points.json.
 *
 * Un point NEUF porte un nœud de l'arbre (`node_id`) ; un ANCIEN point n'en a pas, et les règles
 * l'exemptent.
 *
 * 1. Règle 1 : un modèle se tague avec un point neuf de son nœud, ou de la notion de son nœud.
 * 2. (a) : un modèle sans nœud, un exercice sans rangement, ne reçoit pas de point neuf.
 * 3. Règle 2 : au plus un point neuf par programme et par modèle.
 * 4. Règle 2 en écritures simultanées : A tague et garde sa transaction, B attend, A valide, B est
 *    refusé.
 * 5. Exercices : règle 1 sur l'un de leurs nœuds ou sur leur notion, (a), et pas de règle 2.
 * 6. Les écritures qui casseraient un tag existant sont refusées : déplacer un modèle (ou lui
 *    retirer son nœud), re-rattacher un point (ou changer son programme), changer de notion une
 *    sous-notion, retirer ou déplacer le rangement d'un exercice. Supprimer un exercice reste
 *    possible.
 * 7. Rejeu sur une copie de la prod (les modèles n'existent qu'en production) : EXACTEMENT les
 *    473 tags, les anciens intacts ; chaque garde refuse avec son message.
 * 8. Le rollback écrit dans la migration ramène exactement l'état d'avant, et refuse un état
 *    inattendu.
 * Plus la structure du fichier : aucun contrôle de transaction, gardes avant toute écriture.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client, QueryResult } from 'pg';
import { connectPostgresClient, getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback, TRANSACTION_CONTROL } from '../helpers/database/migration-rollback';
import { readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

/** Copie figée des tags (clés en français : ce sont des données). */
interface TagsFixture {
	migration: string;
	comptes: { tags: number; modeles: number; par_programme: Record<string, number> };
	tags: { modele: string; point: string; programme: string }[];
}

/** Ce que la copie figée du nettoyage des facettes (#1002) sait des modèles. */
interface CleanupFixture {
	/** modèle → chemin de son nœud en production */
	attendu_modeles: Record<string, string>;
}

type PointLabel = 'onNotion' | 'onNotionTwin' | 'onNotionSpe' | 'onSub1' | 'onSub2' | 'onOther';

/** Le décor des comportements : une notion, deux de ses sous-notions, une autre notion. */
interface Decor {
	notion: string;
	sub1: string;
	sub2: string;
	other: string;
	/** Points neufs : trois sur la notion (deux de seconde, un de 1ʳᵉ spé), un par autre nœud. */
	points: Record<PointLabel, string>;
	/** Deux anciens points (sans nœud) */
	legacy: [string, string];
	authorId: string;
}

interface TagState {
	/** « modèle§code§programme » des tags de points neufs, triés */
	fresh: string[];
	/** « modèle§point » des anciens tags, triés */
	legacy: string[];
}

type Step = () => Promise<QueryResult>;

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261012160000_tags_modeles_points.sql';
const fixture: TagsFixture = JSON.parse(
	readFileSync('tests/integration/fixtures/tags-modeles-points.json', 'utf-8')
);
const cleanupFixture: CleanupFixture = JSON.parse(
	readFileSync('tests/integration/fixtures/nettoyage-facettes.json', 'utf-8')
);
const TEMPLATE_IDS = [...new Set(fixture.tags.map((t) => t.modele))];
const EXPECTED_FRESH = fixture.tags.map((t) => `${t.modele}§${t.point}§${t.programme}`).sort();
/** Préfixe unique à ce run : nœuds, points et modèles du décor le portent. */
const TAG = `itest-tags-${Date.now().toString(36)}`;
/** Date de création et de modification fabriquée des copies de la prod. */
const BEFORE = '2026-01-02T03:04:05.000Z';
/** Anciens tags posés sur chaque modèle copié (la prod en porte 1 026 sur ces 420 modèles). */
const LEGACY_PER_TEMPLATE = 2;
const CHECK_VIOLATION = '23514';
const TRIGGERS: Record<string, string> = {
	question_template_points_rules: 'question_template_points',
	question_templates_guard_point_tags: 'question_templates',
	curriculum_points_guard_tags: 'curriculum_points',
	classification_nodes_guard_point_tags: 'classification_nodes',
	exercise_curriculum_points_rules: 'exercise_curriculum_points',
	exercise_classifications_guard_point_tags: 'exercise_classifications'
};
const FUNCTIONS = [
	'question_template_points_check_rules',
	'question_templates_guard_point_tags',
	'curriculum_points_guard_tags',
	'classification_nodes_guard_point_tags',
	'exercise_curriculum_points_check_rules',
	'exercise_classifications_guard_point_tags'
];
/** Première écriture sur une table publique (les tables temporaires `_tg_*` ne comptent pas). */
const PUBLIC_WRITE = /\b(?:insert\s+into|update|delete\s+from|alter\s+table)\s+public\./i;
/** Première définition d'une règle. */
const DEFINITION = /^\s*create\s+(?:function|trigger)\b/i;
const TAG_TEMPLATE =
	'insert into public.question_template_points (template_id, point_id) values ($1, $2)';
const TAG_EXERCISE =
	'insert into public.exercise_curriculum_points (exercise_id, point_id) values ($1, $2)';

// Messages des règles (extraits)
const RULE1 = /ni sur le nœud du modèle \(« .* »\) ni sur sa notion/;
const TEMPLATE_WITHOUT_NODE = /Le modèle .* n'est rangé dans aucun nœud de l'arbre : rangez-le/;
const RULE2 = /Le modèle porte déjà le point .* du programme 2 : un modèle a au plus un point/;
const EXERCISE_RULE1 = /hors des nœuds de l'exercice .* et de leurs notions/;
const EXERCISE_WITHOUT_NODE = /L'exercice .* n'est rangé dans aucun nœud de l'arbre : rangez-le/;
const TEMPLATE_MOVED = /qui ne serait ni sur « .* » ni sur sa notion : retirez d'abord ce tag/;
const TEMPLATE_UNRANGED = /il ne peut pas perdre son rangement/;
const POINT_MOVED_TEMPLATE = /est tagué sur le modèle .*, dont il ne serait plus sur le nœud/;
const POINT_MOVED_EXERCISE = /est tagué sur l'exercice .*, qui n'est rangé ni sur son nouveau nœud/;
const POINT_UNRANGED = /il ne peut pas perdre son nœud/;
const POINT_REGRADED = /passerait au programme 2, dont le modèle .* porte déjà un point/;
const SUBNOTION_TEMPLATE = /changerait de notion alors que le modèle .*, rangé sur elle/;
const SUBNOTION_EXERCISE = /changerait de notion alors que l'exercice .*, rangé sur elle/;
const EXERCISE_UNCOVERED = /qui ne serait plus couvert par aucun de ses rangements/;

// ============================================================================
// FONCTIONS
// ============================================================================

async function insertNode(
	pg: Client,
	kind: string,
	label: string,
	parentId: string | null
): Promise<string> {
	const r = await pg.query<{ id: string }>(
		'insert into public.classification_nodes (kind, name, parent_id) values ($1, $2, $3) returning id',
		[kind, `${TAG} ${label}`, parentId]
	);
	return r.rows[0].id;
}

async function insertPoint(
	pg: Client,
	label: string,
	grade: string,
	nodeId: string
): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.curriculum_points (code, name, kind, grade, node_id)
		 values ($1, $2, 'savoir_faire', $3, $4) returning id`,
		[`${TAG}-${label}`, `${TAG} ${label}`, grade, nodeId]
	);
	return r.rows[0].id;
}

async function insertTemplate(pg: Client, nodeId: string | null): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.question_templates
		   (id, type, grades, theme, domain, level, variations, status, title, classification_node_id)
		 values (gen_random_uuid(), 'numerical_exact', array['2'], 'copie', 'copie', 1, '[{}]'::jsonb,
		         'draft', $1, $2)
		 returning id`,
		[TAG, nodeId]
	);
	return r.rows[0].id;
}

/** Un exercice rangé dans `nodeIds` (le premier rangement est le principal). */
async function insertExercise(pg: Client, authorId: string, nodeIds: string[]): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.exercises (id, created_by, category, title)
		 values (gen_random_uuid(), $1, 'application', $2) returning id`,
		[authorId, TAG]
	);
	const id = r.rows[0].id;
	for (const [position, nodeId] of nodeIds.entries()) {
		await pg.query(
			`insert into public.exercise_classifications (exercise_id, node_id, is_primary, position)
			 values ($1, $2, $3, $4)`,
			[id, nodeId, position === 0, position]
		);
	}
	return id;
}

async function createDecor(pg: Client, authorId: string): Promise<Decor> {
	const branch = await insertNode(pg, 'branch', 'branche', null);
	const notion = await insertNode(pg, 'notion', 'notion', branch);
	const sub1 = await insertNode(pg, 'subnotion', 'sous-notion 1', notion);
	const sub2 = await insertNode(pg, 'subnotion', 'sous-notion 2', notion);
	const other = await insertNode(pg, 'notion', 'autre notion', branch);
	const legacy = await pg.query<{ id: string }>(
		`select id from public.curriculum_points
		  where objective_id is not null and node_id is null and archived_at is null
		  order by code limit 2`
	);
	if (legacy.rows.length !== 2) throw new Error('décor : deux anciens points introuvables');
	return {
		notion,
		sub1,
		sub2,
		other,
		points: {
			onNotion: await insertPoint(pg, 'notion-a', '2', notion),
			onNotionTwin: await insertPoint(pg, 'notion-b', '2', notion),
			onNotionSpe: await insertPoint(pg, 'notion-spe', '1_SPE', notion),
			onSub1: await insertPoint(pg, 'sous-notion-1', '2', sub1),
			onSub2: await insertPoint(pg, 'sous-notion-2', '2', sub2),
			onOther: await insertPoint(pg, 'autre-notion', '2', other)
		},
		legacy: [legacy.rows[0].id, legacy.rows[1].id],
		authorId
	};
}

/**
 * Joue les étapes dans un point de sauvegarde, annulé ensuite : chaque essai repart du même
 * décor. Rend le nombre de lignes touchées par la DERNIÈRE étape.
 */
async function trial(pg: Client, steps: Step): Promise<number | null> {
	await pg.query('savepoint essai');
	try {
		return (await steps()).rowCount;
	} finally {
		await pg.query('rollback to savepoint essai');
	}
}

async function expectAccepted(pg: Client, steps: Step): Promise<void> {
	expect(await trial(pg, steps)).toBe(1);
}

async function expectRefused(pg: Client, steps: Step, message: RegExp): Promise<void> {
	await expect(trial(pg, steps)).rejects.toMatchObject({
		code: CHECK_VIOLATION,
		message: expect.stringMatching(message)
	});
}

/**
 * La prod d'avant la migration, dans la transaction ouverte : ni règles ni tags neufs (rollback
 * de la migration), les 420 modèles copiés sur leur nœud de PRODUCTION (copie figée du
 * nettoyage ; empreinte des 420 chemins comparée à la prod le 2026-10-10 : identique), et des
 * anciens tags sur chacun.
 */
async function prepareProdCopy(pg: Client, authorId: string): Promise<void> {
	await pg.query(extractRollback(MIGRATION));
	await insertProdCopies(pg, {
		templateIds: TEMPLATE_IDS,
		exerciseIds: [],
		authorId,
		timestamp: BEFORE
	});

	const idByPath = new Map(
		[...(await readNodePaths(pg))].map(([id, node]) => [node.path, id] as const)
	);
	const nodeIds = TEMPLATE_IDS.map((id) => {
		const nodeId = idByPath.get(cleanupFixture.attendu_modeles[id]);
		if (!nodeId) throw new Error(`nœud de production introuvable pour le modèle ${id}`);
		return nodeId;
	});
	const ranged = await pg.query(
		`update public.question_templates q set classification_node_id = v.node_id
		   from unnest($1::uuid[], $2::uuid[]) as v(id, node_id)
		  where q.id = v.id`,
		[TEMPLATE_IDS, nodeIds]
	);
	if (ranged.rowCount !== TEMPLATE_IDS.length) {
		throw new Error(`modèles rangés : ${ranged.rowCount}/${TEMPLATE_IDS.length}`);
	}

	const legacy = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select t.id, p.id
		   from unnest($1::uuid[]) as t(id)
		  cross join (select id from public.curriculum_points
		               where objective_id is not null and node_id is null and archived_at is null
		               order by code limit $2) p`,
		[TEMPLATE_IDS, LEGACY_PER_TEMPLATE]
	);
	if (legacy.rowCount !== TEMPLATE_IDS.length * LEGACY_PER_TEMPLATE) {
		throw new Error(`anciens tags posés : ${legacy.rowCount}`);
	}
}

async function readTags(pg: Client): Promise<TagState> {
	const r = await pg.query<{
		template_id: string;
		point_id: string;
		code: string;
		grade: string | null;
		node_id: string | null;
	}>(
		`select q.template_id, q.point_id, p.code, p.grade, p.node_id
		   from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id
		  where q.template_id = any($1::uuid[])`,
		[TEMPLATE_IDS]
	);
	return {
		fresh: r.rows
			.filter((row) => row.node_id !== null)
			.map((row) => `${row.template_id}§${row.code}§${row.grade}`)
			.sort(),
		legacy: r.rows
			.filter((row) => row.node_id === null)
			.map((row) => `${row.template_id}§${row.point_id}`)
			.sort()
	};
}

/** Triggers de règle présents : « nom§table§état » (état « O » = actif). */
async function ruleTriggers(pg: Client): Promise<string[]> {
	const r = await pg.query<{ tgname: string; tbl: string; tgenabled: string }>(
		`select tgname, tgrelid::regclass::text as tbl, tgenabled from pg_trigger
		  where not tgisinternal and tgname = any($1) order by tgname`,
		[Object.keys(TRIGGERS)]
	);
	return r.rows.map((row) => `${row.tgname}§${row.tbl}§${row.tgenabled}`);
}

async function ruleFunctions(pg: Client): Promise<string[]> {
	const r = await pg.query<{ proname: string }>(
		`select proname from pg_proc
		  where pronamespace = 'public'::regnamespace and proname = any($1) order by proname`,
		[FUNCTIONS]
	);
	return r.rows.map((row) => row.proname);
}

/** Le corps exécutable de la migration : tout ce qui suit le bloc de rollback, sans commentaires. */
function executableLines(): string[] {
	const sql = readFileSync(MIGRATION, 'utf-8');
	return sql
		.slice(sql.indexOf('-- ROLLBACK:END'))
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'));
}

/** Attend que la session `pid` soit bloquée sur un verrou consultatif (5 s au plus). */
async function waitForAdvisoryLock(observer: Client, pid: number): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const r = await observer.query<{ wait_event_type: string | null; wait_event: string | null }>(
			'select wait_event_type, wait_event from pg_stat_activity where pid = $1',
			[pid]
		);
		if (r.rows[0]?.wait_event_type === 'Lock' && r.rows[0]?.wait_event === 'advisory') return;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error(`la session ${pid} n'attend pas le verrou du modèle`);
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// SUITES
// ============================================================================

describe('Tags modèles → points neufs : la fixture, le fichier, l’état appliqué', () => {
	it('la fixture : 473 tags sur 420 modèles, au plus un point par programme et par modèle', () => {
		expect(fixture.migration).toBe(MIGRATION);
		expect(fixture.comptes).toEqual({
			tags: 473,
			modeles: 420,
			par_programme: { '1_SPE': 177, '2': 52, T_COMP: 65, T_EXP: 57, T_SPE: 122 }
		});
		expect(fixture.tags).toHaveLength(473);
		expect(TEMPLATE_IDS).toHaveLength(420);
		expect(new Set(fixture.tags.map((t) => `${t.modele}§${t.programme}`)).size).toBe(473);
		// Chaque modèle a son nœud de production dans la copie figée du nettoyage
		expect(TEMPLATE_IDS.filter((id) => !cleanupFixture.attendu_modeles[id])).toEqual([]);
	});

	it('aucun contrôle de transaction hors commentaires : la migration se joue dans la transaction appelante', () => {
		expect(executableLines().filter((line) => TRANSACTION_CONTROL.test(line))).toEqual([]);
	});

	it('les gardes précèdent toute écriture : les définitions des règles comme les tags', () => {
		const lines = executableLines();
		const guards = lines.findIndex((line) => line.includes('do $garde$'));
		const firstDefinition = lines.findIndex((line) => DEFINITION.test(line));
		const firstWrite = lines.findIndex((line) => PUBLIC_WRITE.test(line));
		expect(guards).toBeGreaterThan(-1);
		expect(firstDefinition).toBeGreaterThan(guards);
		expect(firstWrite).toBeGreaterThan(guards);
	});

	it('le fichier pose un lock_timeout de 5 s avant tout le reste (et le rollback aussi)', () => {
		const lines = executableLines();
		const lockTimeout = lines.findIndex((line) => line.includes("set local lock_timeout = '5s';"));
		expect(lockTimeout).toBeGreaterThan(-1);
		expect(lockTimeout).toBeLessThan(lines.findIndex((line) => DEFINITION.test(line)));
		expect(lockTimeout).toBeLessThan(lines.findIndex((line) => PUBLIC_WRITE.test(line)));
		const rollback = extractRollback(MIGRATION).split('\n');
		const rollbackLock = rollback.findIndex((l) => l.includes("set local lock_timeout = '5s';"));
		expect(rollbackLock).toBeGreaterThan(-1);
		expect(rollbackLock).toBeLessThan(rollback.findIndex((l) => PUBLIC_WRITE.test(l)));
	});

	it('les six triggers de règle sont posés, sur leur table, actifs', async () => {
		const expected = Object.entries(TRIGGERS)
			.map(([name, table]) => `${name}§${table}§O`)
			.sort();
		expect(await ruleTriggers(await getPostgresClient())).toEqual(expected);
	});

	it('les six fonctions : ni SECURITY DEFINER, search_path fixé, exécutables ni par anon, ni par authenticated, ni par PUBLIC', async () => {
		const pg = await getPostgresClient();
		const r = await pg.query<{
			proname: string;
			prosecdef: boolean;
			proconfig: string[] | null;
			anon: boolean;
			auth: boolean;
			everyone: boolean;
		}>(
			`select p.proname, p.prosecdef, p.proconfig,
			        has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
			        has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth,
			        exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
			                 where a.grantee = 0 and a.privilege_type = 'EXECUTE') as everyone
			   from pg_proc p
			  where p.pronamespace = 'public'::regnamespace and p.proname = any($1)
			  order by p.proname`,
			[FUNCTIONS]
		);
		expect(r.rows.map((row) => row.proname)).toEqual([...FUNCTIONS].sort());
		for (const row of r.rows) {
			expect(row, row.proname).toMatchObject({
				prosecdef: false,
				proconfig: ['search_path=public, pg_temp'],
				anon: false,
				auth: false,
				everyone: false
			});
		}
	});
});

describe('Règles de tag : les comportements (base locale, transaction annulée)', () => {
	let pg: Client | undefined;
	let d: Decor;

	function db(): Client {
		if (!pg) throw new Error('client pg non initialisé');
		return pg;
	}
	const accepted = (steps: Step) => expectAccepted(db(), steps);
	const refused = (steps: Step, message: RegExp) => expectRefused(db(), steps, message);
	const tagTemplate = (templateId: string, pointId: string) =>
		db().query(TAG_TEMPLATE, [templateId, pointId]);
	const tagExercise = (exerciseId: string, pointId: string) =>
		db().query(TAG_EXERCISE, [exerciseId, pointId]);
	const moveTemplate = (templateId: string, nodeId: string | null) =>
		db().query('update public.question_templates set classification_node_id = $2 where id = $1', [
			templateId,
			nodeId
		]);
	const movePoint = (pointId: string, nodeId: string | null) =>
		db().query('update public.curriculum_points set node_id = $2 where id = $1', [pointId, nodeId]);
	const reparent = (nodeId: string, parentId: string) =>
		db().query('update public.classification_nodes set parent_id = $2 where id = $1', [
			nodeId,
			parentId
		]);
	const template = (nodeId: string | null) => insertTemplate(db(), nodeId);
	const exercise = (nodeIds: string[]) => insertExercise(db(), d.authorId, nodeIds);

	beforeAll(async () => {
		await cleanupAllTestData();
		const author = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();
		await pg.query('begin');
		d = await createDecor(pg, author.id);
	});

	afterAll(async () => {
		await pg?.query('rollback');
		await cleanupAllTestData();
	});

	describe('1. Règle 1 : un point du nœud du modèle, ou de la notion de ce nœud', () => {
		it('modèle sur une sous-notion : un point de cette sous-notion est accepté', async () => {
			await accepted(async () => tagTemplate(await template(d.sub1), d.points.onSub1));
		});

		it('modèle sur une sous-notion : un point de sa notion est accepté', async () => {
			await accepted(async () => tagTemplate(await template(d.sub1), d.points.onNotion));
		});

		it('modèle sur une sous-notion : un point d’une sous-notion sœur est refusé', async () => {
			await refused(async () => tagTemplate(await template(d.sub1), d.points.onSub2), RULE1);
		});

		it('modèle sur une sous-notion : un point d’une autre notion est refusé', async () => {
			await refused(async () => tagTemplate(await template(d.sub1), d.points.onOther), RULE1);
		});

		it('modèle sur une notion : un point de cette notion est accepté', async () => {
			await accepted(async () => tagTemplate(await template(d.notion), d.points.onNotion));
		});

		it('modèle sur une notion : un point de l’une de ses sous-notions est refusé', async () => {
			await refused(async () => tagTemplate(await template(d.notion), d.points.onSub1), RULE1);
		});
	});

	describe('2. (a) : un modèle sans nœud ne reçoit pas de point neuf', () => {
		it('modèle sans nœud : un point neuf est refusé, il faut le ranger d’abord', async () => {
			await refused(
				async () => tagTemplate(await template(null), d.points.onNotion),
				TEMPLATE_WITHOUT_NODE
			);
		});

		it('modèle sans nœud : les anciens points (sans nœud) restent exemptés', async () => {
			await accepted(async () => {
				const t = await template(null);
				await tagTemplate(t, d.legacy[0]);
				return tagTemplate(t, d.legacy[1]);
			});
		});
	});

	describe('3. Règle 2 : au plus un point neuf par programme et par modèle', () => {
		it('un second point neuf du même programme est refusé', async () => {
			await refused(async () => {
				const t = await template(d.notion);
				await tagTemplate(t, d.points.onNotion);
				return tagTemplate(t, d.points.onNotionTwin);
			}, RULE2);
		});

		it('deux points neufs de programmes différents sont acceptés', async () => {
			await accepted(async () => {
				const t = await template(d.notion);
				await tagTemplate(t, d.points.onNotion);
				return tagTemplate(t, d.points.onNotionSpe);
			});
		});

		it('un ancien point s’ajoute à côté d’un point neuf', async () => {
			await accepted(async () => {
				const t = await template(d.notion);
				await tagTemplate(t, d.points.onNotion);
				return tagTemplate(t, d.legacy[0]);
			});
		});

		it('remplacer le point d’un tag par un autre du même programme reste possible', async () => {
			await accepted(async () => {
				const t = await template(d.notion);
				await tagTemplate(t, d.points.onNotion);
				return db().query(
					`update public.question_template_points set point_id = $3
					  where template_id = $1 and point_id = $2`,
					[t, d.points.onNotion, d.points.onNotionTwin]
				);
			});
		});

		it('retaguer le même point : refus d’unicité (déjà tagué), pas la règle 2', async () => {
			await expect(
				trial(db(), async () => {
					const t = await template(d.notion);
					await tagTemplate(t, d.points.onNotion);
					return tagTemplate(t, d.points.onNotion);
				})
			).rejects.toMatchObject({ code: '23505' });
		});
	});

	describe('5. Exercices : un point de l’un de leurs nœuds ou de leur notion, et pas de règle 2', () => {
		it('exercice rangé sur une sous-notion et une autre notion : un point de la notion de la sous-notion est accepté', async () => {
			await accepted(async () => tagExercise(await exercise([d.sub1, d.other]), d.points.onNotion));
		});

		it('… un point de l’autre notion est accepté', async () => {
			await accepted(async () => tagExercise(await exercise([d.sub1, d.other]), d.points.onOther));
		});

		it('… un point d’une sous-notion sœur est refusé', async () => {
			await refused(
				async () => tagExercise(await exercise([d.sub1, d.other]), d.points.onSub2),
				EXERCISE_RULE1
			);
		});

		it('(a) : un exercice sans rangement ne reçoit pas de point neuf', async () => {
			await refused(
				async () => tagExercise(await exercise([]), d.points.onNotion),
				EXERCISE_WITHOUT_NODE
			);
		});

		it('(a) : un exercice sans rangement reçoit toujours un ancien point', async () => {
			await accepted(async () => tagExercise(await exercise([]), d.legacy[0]));
		});

		it('pas de règle 2 : deux points neufs du même programme sur un exercice', async () => {
			await accepted(async () => {
				const e = await exercise([d.notion]);
				await tagExercise(e, d.points.onNotion);
				return tagExercise(e, d.points.onNotionTwin);
			});
		});
	});

	describe('6. Les écritures qui casseraient un tag existant sont refusées', () => {
		it('déplacer un modèle hors de son nœud et de sa notion : refusé', async () => {
			await refused(async () => {
				const t = await template(d.sub1);
				await tagTemplate(t, d.points.onNotion);
				return moveTemplate(t, d.other);
			}, TEMPLATE_MOVED);
		});

		it('déplacer un modèle sur une sous-notion sœur, son point étant sur la notion commune : accepté', async () => {
			await accepted(async () => {
				const t = await template(d.sub1);
				await tagTemplate(t, d.points.onNotion);
				return moveTemplate(t, d.sub2);
			});
		});

		it('déplacer un modèle dont le point est sur sa sous-notion : refusé', async () => {
			await refused(async () => {
				const t = await template(d.sub1);
				await tagTemplate(t, d.points.onSub1);
				return moveTemplate(t, d.sub2);
			}, TEMPLATE_MOVED);
		});

		it('retirer son nœud à un modèle tagué : refusé', async () => {
			await refused(async () => {
				const t = await template(d.sub1);
				await tagTemplate(t, d.points.onSub1);
				return moveTemplate(t, null);
			}, TEMPLATE_UNRANGED);
		});

		it('retirer son nœud à un modèle qui ne porte que des anciens points : accepté', async () => {
			await accepted(async () => {
				const t = await template(d.sub1);
				await tagTemplate(t, d.legacy[0]);
				return moveTemplate(t, null);
			});
		});

		it('re-rattacher un point tagué hors du nœud du modèle et de sa notion : refusé', async () => {
			await refused(async () => {
				await tagTemplate(await template(d.sub1), d.points.onSub1);
				return movePoint(d.points.onSub1, d.sub2);
			}, POINT_MOVED_TEMPLATE);
		});

		it('re-rattacher un point tagué sur la notion du modèle : accepté', async () => {
			await accepted(async () => {
				await tagTemplate(await template(d.sub1), d.points.onSub1);
				return movePoint(d.points.onSub1, d.notion);
			});
		});

		it('retirer son nœud à un point tagué : refusé', async () => {
			await refused(async () => {
				await tagTemplate(await template(d.sub1), d.points.onSub1);
				return movePoint(d.points.onSub1, null);
			}, POINT_UNRANGED);
		});

		it('changer le programme d’un point tagué vers un programme que le modèle porte déjà : refusé', async () => {
			await refused(async () => {
				const t = await template(d.notion);
				await tagTemplate(t, d.points.onNotion);
				await tagTemplate(t, d.points.onNotionSpe);
				return db().query("update public.curriculum_points set grade = '2' where id = $1", [
					d.points.onNotionSpe
				]);
			}, POINT_REGRADED);
		});

		it('re-rattacher un point tagué sur un exercice hors de ses rangements : refusé', async () => {
			await refused(async () => {
				await tagExercise(await exercise([d.sub1]), d.points.onSub1);
				return movePoint(d.points.onSub1, d.sub2);
			}, POINT_MOVED_EXERCISE);
		});

		it('changer de notion une sous-notion dont un modèle porte un point de l’ancienne notion : refusé', async () => {
			await refused(async () => {
				await tagTemplate(await template(d.sub1), d.points.onNotion);
				return reparent(d.sub1, d.other);
			}, SUBNOTION_TEMPLATE);
		});

		it('… le point étant sur la sous-notion elle-même : accepté', async () => {
			await accepted(async () => {
				await tagTemplate(await template(d.sub1), d.points.onSub1);
				return reparent(d.sub1, d.other);
			});
		});

		it('… dont un exercice porte un point de l’ancienne notion : refusé', async () => {
			await refused(async () => {
				await tagExercise(await exercise([d.sub1]), d.points.onNotion);
				return reparent(d.sub1, d.other);
			}, SUBNOTION_EXERCISE);
		});

		it('retirer le seul rangement qui couvre un point d’un exercice : refusé', async () => {
			await refused(async () => {
				const e = await exercise([d.sub1, d.other]);
				await tagExercise(e, d.points.onNotion);
				return db().query(
					'delete from public.exercise_classifications where exercise_id = $1 and node_id = $2',
					[e, d.sub1]
				);
			}, EXERCISE_UNCOVERED);
		});

		it('retirer un rangement quand un autre couvre encore le point : accepté', async () => {
			await accepted(async () => {
				const e = await exercise([d.sub1, d.sub2]);
				await tagExercise(e, d.points.onNotion);
				return db().query(
					'delete from public.exercise_classifications where exercise_id = $1 and node_id = $2',
					[e, d.sub1]
				);
			});
		});

		it('déplacer le rangement qui couvre un point d’un exercice : refusé', async () => {
			await refused(async () => {
				const e = await exercise([d.sub1]);
				await tagExercise(e, d.points.onNotion);
				return db().query(
					`update public.exercise_classifications set node_id = $3
					  where exercise_id = $1 and node_id = $2`,
					[e, d.sub1, d.other]
				);
			}, EXERCISE_UNCOVERED);
		});

		it('supprimer un exercice tagué reste possible : ses rangements et ses tags partent avec lui', async () => {
			await accepted(async () => {
				const e = await exercise([d.sub1]);
				await tagExercise(e, d.points.onNotion);
				return db().query('delete from public.exercises where id = $1', [e]);
			});
		});
	});
});

describe('4. Règle 2 en écritures simultanées : B attend A, puis est refusé', () => {
	let observer: Client | undefined;
	let a: Client | undefined;
	let b: Client | undefined;
	let templateId = '';
	let firstPoint = '';
	let secondPoint = '';

	beforeAll(async () => {
		observer = await connectPostgresClient();
		a = await connectPostgresClient();
		b = await connectPostgresClient();
		// Deux points neufs d'un même nœud et d'un même programme, posés par les migrations
		const pair = await observer.query<{ node_id: string; ids: string[] }>(
			`select node_id, (array_agg(id order by code))[1:2] as ids
			   from public.curriculum_points
			  where node_id is not null and archived_at is null
			  group by node_id, grade
			 having count(*) >= 2
			  order by node_id
			  limit 1`
		);
		if (pair.rows.length !== 1) {
			throw new Error('décor : aucun nœud ne porte deux points neufs d’un même programme');
		}
		[firstPoint, secondPoint] = pair.rows[0].ids;
		// Un modèle VALIDÉ (hors transaction) : les deux sessions doivent le voir
		templateId = await insertTemplate(observer, pair.rows[0].node_id);
	});

	afterAll(async () => {
		await a?.query('rollback').catch(() => undefined);
		await b?.query('rollback').catch(() => undefined);
		if (observer && templateId) {
			await observer.query('delete from public.question_template_points where template_id = $1', [
				templateId
			]);
			await observer.query('delete from public.question_templates where id = $1', [templateId]);
		}
		await Promise.all([observer?.end(), a?.end(), b?.end()]);
	});

	it('A tague et garde sa transaction ; B attend le verrou du modèle ; A valide ; B est refusé', async () => {
		if (!observer || !a || !b) throw new Error('connexions non initialisées');
		await a.query('begin');
		await a.query(TAG_TEMPLATE, [templateId, firstPoint]);

		await b.query('begin');
		const { rows } = await b.query<{ pid: number }>('select pg_backend_pid() as pid');
		const outcome = b.query(TAG_TEMPLATE, [templateId, secondPoint]).then(
			() => null,
			(e: unknown) => e
		);
		// B attend, sans avoir échoué ni abouti
		await waitForAdvisoryLock(observer, rows[0].pid);

		await a.query('commit');
		expect(await outcome).toMatchObject({
			code: CHECK_VIOLATION,
			message: expect.stringMatching(/un modèle a au plus un point par programme/)
		});
		await b.query('rollback');

		const tags = await observer.query<{ point_id: string }>(
			'select point_id from public.question_template_points where template_id = $1',
			[templateId]
		);
		expect(tags.rows.map((r) => r.point_id)).toEqual([firstPoint]);
	}, 30_000);
});

describe('7. Rejeu sur une copie de la prod : les 473 tags, et rien d’autre', () => {
	let pg: Client | undefined;
	let before: TagState;
	let triggersBefore: string[];
	let after: TagState;

	function db(): Client {
		if (!pg) throw new Error('client pg non initialisé');
		return pg;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await prepareProdCopy(pg, teacher.id);
		before = await readTags(pg);
		triggersBefore = await ruleTriggers(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		after = await readTags(pg);
	}, 120_000);

	afterAll(async () => {
		await pg?.query('rollback');
		await cleanupAllTestData();
	});

	it('avant : ni tag neuf ni règle, les anciens tags posés', () => {
		expect(before.fresh).toEqual([]);
		expect(before.legacy).toHaveLength(TEMPLATE_IDS.length * LEGACY_PER_TEMPLATE);
		expect(triggersBefore).toEqual([]);
	});

	it('après : EXACTEMENT les 473 tags de la fixture, chacun sur le point neuf de son programme', () => {
		expect(after.fresh).toEqual(EXPECTED_FRESH);
	});

	it('après : aucun autre tag de point neuf en base', async () => {
		const r = await db().query<{ n: string }>(
			`select count(*) as n from public.question_template_points q
			   join public.curriculum_points p on p.id = q.point_id where p.node_id is not null`
		);
		expect(Number(r.rows[0].n)).toBe(473);
	});

	it('après : les anciens tags sont intacts', () => {
		expect(after.legacy).toEqual(before.legacy);
	});

	it('après : les règles 1 et 2 tiennent pour chacun des 473 tags (vérifiées hors du fichier)', async () => {
		const r = await db().query<{
			template_id: string;
			code: string;
			grade: string;
			point_node: string;
			template_node: string | null;
			template_kind: string | null;
			template_parent: string | null;
		}>(
			`select q.template_id, p.code, p.grade, p.node_id as point_node,
			        t.classification_node_id as template_node, n.kind as template_kind,
			        n.parent_id as template_parent
			   from public.question_template_points q
			   join public.curriculum_points p on p.id = q.point_id
			   join public.question_templates t on t.id = q.template_id
			   left join public.classification_nodes n on n.id = t.classification_node_id
			  where p.node_id is not null`
		);
		expect(r.rows).toHaveLength(473);
		const outsideRule1 = r.rows.filter(
			(row) =>
				row.point_node !== row.template_node &&
				row.point_node !==
					(row.template_kind === 'subnotion' ? row.template_parent : row.template_node)
		);
		expect(outsideRule1).toEqual([]);
		const perProgramme = new Map<string, number>();
		for (const row of r.rows) {
			const key = `${row.template_id}§${row.grade}`;
			perProgramme.set(key, (perProgramme.get(key) ?? 0) + 1);
		}
		expect([...perProgramme.entries()].filter(([, n]) => n > 1)).toEqual([]);
	});

	it('après : les six triggers de règle sont posés et actifs', async () => {
		const expected = Object.entries(TRIGGERS)
			.map(([name, table]) => `${name}§${table}§O`)
			.sort();
		expect(await ruleTriggers(db())).toEqual(expected);
	});

	it('8. le rollback, rejoué après la migration, ramène EXACTEMENT l’état d’avant', async () => {
		await db().query(extractRollback(MIGRATION));
		expect(await readTags(db())).toEqual(before);
		expect(await ruleTriggers(db())).toEqual([]);
		expect(await ruleFunctions(db())).toEqual([]);
	});
});

describe('7 et 8. Rejeu : chaque garde refuse avec son message, le rollback aussi', () => {
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
	 * Prépare la copie de la prod, la perturbe, rejoue la migration : elle doit être refusée avec
	 * le message attendu. Que ce refus ne laisse rien derrière lui tient à la transaction et à la
	 * structure du fichier (gardes avant toute écriture), vérifiée plus haut.
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

	const first = fixture.tags[0];

	it('un tag de point neuf déjà présent : transfert refusé', async () => {
		await replayAfter(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, p.id from public.curriculum_points p where p.code = $2`,
			async () => [first.modele, first.point],
			/tags de points neufs déjà présents \(1\) : transfert refusé/
		);
	}, 60_000);

	it('un point neuf introuvable (son code a changé) : refusé, le point nommé', async () => {
		await replayAfter(
			"update public.curriculum_points set code = code || '-ailleurs' where code = $1",
			async () => [first.point],
			new RegExp(
				`points neufs introuvables \\(code, programme\\) : .*${escapeRegExp(
					`${first.point} (${first.programme})`
				)}`
			)
		);
	}, 60_000);

	it('TOUT ou RIEN : un des 420 modèles manquant', async () => {
		await replayAfter(
			'delete from public.question_templates where id = $1',
			async () => [first.modele],
			/identifiants partiellement présents : 419 modèle\(s\) sur 420/
		);
	}, 60_000);

	it('un modèle rangé ailleurs depuis : la règle 1 refuse son tag, et toute la migration échoue', async () => {
		await replayAfter(
			`update public.question_templates set classification_node_id = (
			   select n.id from public.classification_nodes n
			    where n.kind = 'notion' and n.archived_at is null and n.id <> all($2::uuid[])
			    order by n.id limit 1)
			  where id = $1`,
			async (client) => {
				const r = await client.query<{ node: string; notion: string }>(
					`select q.classification_node_id as node,
					        case when n.kind = 'subnotion' then n.parent_id else n.id end as notion
					   from public.question_templates q
					   join public.classification_nodes n on n.id = q.classification_node_id
					  where q.id = $1`,
					[first.modele]
				);
				return [first.modele, [r.rows[0].node, r.rows[0].notion]];
			},
			RULE1
		);
	}, 60_000);

	it('(a) : un modèle sans nœud depuis : son tag est refusé, et toute la migration échoue', async () => {
		await replayAfter(
			'update public.question_templates set classification_node_id = null where id = $1',
			async () => [first.modele],
			TEMPLATE_WITHOUT_NODE
		);
	}, 60_000);

	it('rollback : un des 473 tags retiré à la main depuis → refus, tout ou rien', async () => {
		await rollbackAfter(
			`delete from public.question_template_points q
			  using public.curriculum_points p
			  where p.id = q.point_id and q.template_id = $1 and p.code = $2`,
			async () => [first.modele, first.point],
			/rollback : 472 tag\(s\) de la migration présent\(s\) sur 473 \(tout ou rien\)/
		);
	}, 60_000);
});
