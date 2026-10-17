/**
 * Scission des points « tables » du cycle 2 : sens direct / opération à trou — (Supabase local requis)
 * ===================================================================================================
 *
 * Migration `20261017090000_scission_points_programme` : les cinq points « Connaitre dans les deux
 * sens les tables d'addition / de multiplication » (CP-018, CE1-026, CE1-027, CE2-020, CE2-021)
 * deviennent chacun deux points — le sens direct (le point d'origine, renommé) et l'opération à
 * trou (un point neuf, CP-073, CE1-090, CE1-091, CE2-084, CE2-085), rangé juste après son
 * origine. Libellés VALIDÉS par David.
 *
 * 1. Après les migrations (base locale) : les 10 libellés exacts, les codes, chaque point neuf
 *    copie le nœud, la rubrique, le genre, l'exigence et le régime de son origine, et l'ordre
 *    d'affichage reste une suite 1..N par grade, chaque point neuf juste après son origine.
 * 2. Dans une transaction annulée : le ROLLBACK écrit dans la migration ramène l'état d'avant
 *    (anciens libellés, anciens ordres, points neufs supprimés, ordre relatif des autres points
 *    inchangé), puis la migration rejouée depuis son fichier redonne EXACTEMENT l'état d'après.
 * 3. Les gardes : un usage déjà accroché à un des cinq points, un code neuf déjà pris, un libellé
 *    d'origine qui n'est plus celui attendu, un ordre d'affichage déjà troué → la migration
 *    refuse avec SON message. Le rollback refuse si un point neuf a reçu un usage (sa suppression
 *    effacerait en silence, par cascade, des données d'élèves).
 * 4. La structure du fichier : gardes et lock_timeout avant la première écriture, aucun contrôle
 *    de transaction — c'est ce qui garantit qu'un refus ne laisse rien derrière lui.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { extractRollback, TRANSACTION_CONTROL } from '../helpers/database/migration-rollback';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// TYPES
// ============================================================================

interface Split {
	origin: string;
	added: string;
	grade: 'CP' | 'CE1' | 'CE2';
	/** ordre d'affichage de l'origine AVANT la scission (mesuré en prod le 2026-10-11) */
	orderBefore: number;
	nameBefore: string;
	originName: string;
	addedName: string;
}

interface PointRow {
	id: string;
	code: string;
	grade: string;
	display_order: number;
	name: string;
	kind: string;
	exigence: string;
	regime_acquisition: string;
	rubrique: string | null;
	node_id: string | null;
	objective_id: string | null;
	rang: number | null;
	archived_at: Date | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261017090000_scission_points_programme.sql';

const ADDITION_BEFORE = "Connaitre dans les deux sens les tables d'addition.";
const MULTIPLICATION_BEFORE = 'Connaitre dans les deux sens les tables de multiplication.';
const ADDITION_DIRECT =
	"Connaître les tables d'addition : donner la somme de deux nombres (3 + 4 = ?).";
const ADDITION_MISSING =
	"Connaître les tables d'addition dans l'autre sens : trouver le terme manquant d'une addition (3 + ? = 7).";
const MULTIPLICATION_DIRECT =
	'Connaître les tables de multiplication : donner le produit de deux nombres (3 × 4 = ?).';
const MULTIPLICATION_MISSING =
	"Connaître les tables de multiplication dans l'autre sens : trouver le facteur manquant d'un produit (3 × ? = 12).";

const SPLITS: Split[] = [
	{
		origin: 'CP-018',
		added: 'CP-073',
		grade: 'CP',
		orderBefore: 19,
		nameBefore: ADDITION_BEFORE,
		originName: ADDITION_DIRECT,
		addedName: ADDITION_MISSING
	},
	{
		origin: 'CE1-026',
		added: 'CE1-090',
		grade: 'CE1',
		orderBefore: 26,
		nameBefore: ADDITION_BEFORE,
		originName: ADDITION_DIRECT,
		addedName: ADDITION_MISSING
	},
	{
		origin: 'CE1-027',
		added: 'CE1-091',
		grade: 'CE1',
		orderBefore: 27,
		nameBefore: MULTIPLICATION_BEFORE,
		originName: MULTIPLICATION_DIRECT,
		addedName: MULTIPLICATION_MISSING
	},
	{
		origin: 'CE2-020',
		added: 'CE2-084',
		grade: 'CE2',
		orderBefore: 20,
		nameBefore: ADDITION_BEFORE,
		originName: ADDITION_DIRECT,
		addedName: ADDITION_MISSING
	},
	{
		origin: 'CE2-021',
		added: 'CE2-085',
		grade: 'CE2',
		orderBefore: 21,
		nameBefore: MULTIPLICATION_BEFORE,
		originName: MULTIPLICATION_DIRECT,
		addedName: MULTIPLICATION_MISSING
	}
];
const ADDED_CODES = SPLITS.map((s) => s.added);
const GRADES = ['CP', 'CE1', 'CE2'] as const;
const COUNT_BEFORE: Record<string, number> = { CP: 72, CE1: 89, CE2: 83 };
const COUNT_AFTER: Record<string, number> = { CP: 73, CE1: 91, CE2: 85 };
/** Les attributs qu'un point neuf copie de son origine. */
const COPIED: (keyof PointRow)[] = [
	'grade',
	'node_id',
	'rubrique',
	'kind',
	'exigence',
	'regime_acquisition',
	'objective_id',
	'rang',
	'archived_at'
];
/** Première écriture sur une table publique (les tables temporaires ne comptent pas). */
const PUBLIC_WRITE = /\b(?:insert\s+into|update|delete\s+from|alter\s+table)\s+public\./i;
/** Un modèle rangé sur le nœud du point, pour lui poser un tag. */
const INSERT_TEMPLATE = `insert into public.question_templates
	(id, type, grades, theme, domain, level, variations, status, title, classification_node_id)
	values (gen_random_uuid(), 'numerical_exact', array['CE1'], 'copie', 'copie', 1, '[{}]'::jsonb,
	        'draft', 'modèle de test (scission tables)', $1) returning id`;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Les références d'automatismes posées sur les points en jeu : « code§grade référent », triées. */
async function readAutomatismes(pg: Client): Promise<string[]> {
	const r = await pg.query<{ ref: string }>(
		`select p.code || '§' || a.grade as ref
		   from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id
		  where p.code = any($1)`,
		[[...SPLITS.map((s) => s.origin), ...ADDED_CODES]]
	);
	return r.rows.map((row) => row.ref).sort();
}

async function readPoints(pg: Client): Promise<Map<string, PointRow>> {
	const r = await pg.query<PointRow>(
		`select id, code, grade, display_order, name, kind, exigence, regime_acquisition, rubrique,
		        node_id, objective_id, rang, archived_at
		   from public.curriculum_points where grade in ('CP', 'CE1', 'CE2')`
	);
	return new Map(r.rows.map((row) => [row.code, row]));
}

/** Les codes d'un grade, dans l'ordre d'affichage. */
function orderOf(points: Map<string, PointRow>, grade: string): string[] {
	return [...points.values()]
		.filter((p) => p.grade === grade)
		.sort((a, b) => a.display_order - b.display_order)
		.map((p) => p.code);
}

/** Tout ce qui compte d'un point, sauf son identifiant (un point recréé en change). */
function signature(p: PointRow): string {
	return [
		p.code,
		p.grade,
		p.display_order,
		p.name,
		p.kind,
		p.exigence,
		p.regime_acquisition,
		p.rubrique,
		p.node_id,
		p.objective_id,
		p.rang,
		p.archived_at?.toISOString() ?? null
	].join('§');
}

function signatures(points: Map<string, PointRow>): string[] {
	return [...points.values()].map(signature).sort();
}

function expectPermutation(points: Map<string, PointRow>, grade: string, count: number) {
	const orders = [...points.values()]
		.filter((p) => p.grade === grade)
		.map((p) => p.display_order)
		.sort((a, b) => a - b);
	expect(orders, grade).toEqual(Array.from({ length: count }, (_, i) => i + 1));
}

/** Le corps exécutable de la migration : tout ce qui suit le bloc de rollback, sans commentaires. */
function executableLines(): string[] {
	const sql = readFileSync(MIGRATION, 'utf-8');
	return sql
		.slice(sql.indexOf('-- ROLLBACK:END'))
		.split('\n')
		.filter((line) => !line.trim().startsWith('--'));
}

// ============================================================================
// SUITES
// ============================================================================

describe('Scission des points « tables » : l’état après les migrations (base locale)', () => {
	let points: Map<string, PointRow>;
	let automatismes: string[];

	beforeAll(async () => {
		const pg = await getPostgresClient();
		points = await readPoints(pg);
		automatismes = await readAutomatismes(pg);
	});

	it('la référence d’automatisme de 5e (addition à trou) vise CE2-084, plus CE2-020', () => {
		expect(automatismes).toEqual(['CE2-084§5']);
	});

	it('les 10 libellés validés, au caractère près', () => {
		for (const s of SPLITS) {
			expect(points.get(s.origin)?.name, s.origin).toBe(s.originName);
			expect(points.get(s.added)?.name, s.added).toBe(s.addedName);
		}
	});

	it('chaque point neuf copie le nœud, la rubrique, le genre, l’exigence et le régime de son origine', () => {
		for (const s of SPLITS) {
			const origin = points.get(s.origin);
			const added = points.get(s.added);
			expect(origin, s.origin).toBeDefined();
			expect(added, s.added).toBeDefined();
			if (!origin || !added) continue;
			expect(origin.grade).toBe(s.grade);
			expect(origin.node_id, s.origin).not.toBeNull();
			for (const column of COPIED) {
				expect(added[column], `${s.added}.${column}`).toEqual(origin[column]);
			}
		}
	});

	it('l’ordre d’affichage reste 1..N par grade, chaque point neuf juste après son origine', () => {
		for (const grade of GRADES) expectPermutation(points, grade, COUNT_AFTER[grade]);
		for (const s of SPLITS) {
			expect(points.get(s.added)?.display_order, s.added).toBe(
				(points.get(s.origin)?.display_order ?? -1) + 1
			);
		}
		// CE1 : 026, 090, 027, 091 se suivent (de même en CE2).
		const ce1 = orderOf(points, 'CE1');
		expect(ce1.slice(ce1.indexOf('CE1-026'), ce1.indexOf('CE1-026') + 5)).toEqual([
			'CE1-026',
			'CE1-090',
			'CE1-027',
			'CE1-091',
			'CE1-028'
		]);
	});

	it('plus aucun point ne porte l’ancien libellé « dans les deux sens »', () => {
		const left = [...points.values()].filter(
			(p) => p.name === ADDITION_BEFORE || p.name === MULTIPLICATION_BEFORE
		);
		expect(left.map((p) => p.code)).toEqual([]);
	});
});

describe('Scission des points « tables » : rollback, puis rejeu', () => {
	let pg: Client | undefined;
	let after: Map<string, PointRow>;
	let before: Map<string, PointRow>;
	let replayed: Map<string, PointRow>;
	let automatismesAfter: string[];
	let automatismesBefore: string[];
	let automatismesReplayed: string[];

	beforeAll(async () => {
		pg = await getPostgresClient();
		await pg.query('begin');
		after = await readPoints(pg);
		automatismesAfter = await readAutomatismes(pg);
		await pg.query(extractRollback(MIGRATION));
		before = await readPoints(pg);
		automatismesBefore = await readAutomatismes(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		replayed = await readPoints(pg);
		automatismesReplayed = await readAutomatismes(pg);
	}, 60_000);

	afterAll(async () => {
		await pg?.query('rollback');
	});

	it('le rollback supprime les cinq points neufs et rend aux origines leur libellé et leur ordre', () => {
		for (const s of SPLITS) {
			expect(before.has(s.added), s.added).toBe(false);
			expect(before.get(s.origin)?.name, s.origin).toBe(s.nameBefore);
			expect(before.get(s.origin)?.display_order, s.origin).toBe(s.orderBefore);
		}
		for (const grade of GRADES) expectPermutation(before, grade, COUNT_BEFORE[grade]);
	});

	it('le rollback garde l’ordre relatif de tous les autres points', () => {
		for (const grade of GRADES) {
			const withoutAdded = orderOf(after, grade).filter((c) => !ADDED_CODES.includes(c));
			expect(orderOf(before, grade), grade).toEqual(withoutAdded);
		}
	});

	it('le rollback ne touche que les libellés des cinq origines', () => {
		for (const [code, p] of before) {
			if (SPLITS.some((s) => s.origin === code)) continue;
			expect(p.name, code).toBe(after.get(code)?.name);
			expect(p.node_id, code).toBe(after.get(code)?.node_id);
		}
	});

	it('le rollback remet la référence d’automatisme de 5e sur CE2-020', () => {
		expect(automatismesAfter).toEqual(['CE2-084§5']);
		expect(automatismesBefore).toEqual(['CE2-020§5']);
	});

	it('la migration rejouée après le rollback redonne EXACTEMENT l’état d’après', () => {
		expect(signatures(replayed)).toEqual(signatures(after));
		expect(automatismesReplayed).toEqual(automatismesAfter);
	});
});

describe('Scission des points « tables » : chaque garde refuse avec son message', () => {
	let pg: Client | undefined;
	let studentId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		studentId = (await TestData.profile().withRole('student').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg?.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	/** Remet l'état d'avant (rollback), le perturbe, rejoue la migration : refus attendu. */
	async function replayAfter(
		perturb: (client: Client) => Promise<void>,
		expected: RegExp
	): Promise<void> {
		if (!pg) throw new Error('client pg non initialisé');
		await pg.query('begin');
		try {
			await pg.query(extractRollback(MIGRATION));
			await perturb(pg);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(expected);
		} finally {
			await pg.query('rollback');
		}
	}

	/** La migration est en place ; on perturbe, puis le rollback doit refuser. */
	async function rollbackAfter(
		perturb: (client: Client) => Promise<void>,
		expected: RegExp
	): Promise<void> {
		if (!pg) throw new Error('client pg non initialisé');
		await pg.query('begin');
		try {
			await perturb(pg);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(expected);
		} finally {
			await pg.query('rollback');
		}
	}

	async function pointId(client: Client, code: string): Promise<{ id: string; node: string }> {
		const r = await client.query<{ id: string; node_id: string }>(
			'select id, node_id from public.curriculum_points where code = $1',
			[code]
		);
		expect(r.rows, code).toHaveLength(1);
		return { id: r.rows[0].id, node: r.rows[0].node_id };
	}

	async function tag(client: Client, code: string): Promise<void> {
		const point = await pointId(client, code);
		const template = await client.query<{ id: string }>(INSERT_TEMPLATE, [point.node]);
		const tagged = await client.query(
			'insert into public.question_template_points (template_id, point_id) values ($1, $2)',
			[template.rows[0].id, point.id]
		);
		expect(tagged.rowCount).toBe(1);
	}

	it('un tag de modèle déjà posé sur un des cinq points → refus', async () => {
		await replayAfter(
			(client) => tag(client, 'CE1-027'),
			/usages déjà accrochés aux points à scinder : .*CE1-027/
		);
	}, 60_000);

	it('une référence d’automatisme déjà posée sur un des cinq points → refus', async () => {
		await replayAfter(async (client) => {
			const point = await pointId(client, 'CP-018');
			await client.query(
				"insert into public.curriculum_point_automatismes (point_id, grade) values ($1, '6')",
				[point.id]
			);
		}, /usages déjà accrochés aux points à scinder : .*CP-018/);
	}, 60_000);

	it('une AUTRE référence d’automatisme sur CE2-020 (que celle de 5e) → refus', async () => {
		await replayAfter(async (client) => {
			const point = await pointId(client, 'CE2-020');
			await client.query(
				"insert into public.curriculum_point_automatismes (point_id, grade) values ($1, '6')",
				[point.id]
			);
		}, /usages déjà accrochés aux points à scinder : CE2-020 /);
	}, 60_000);

	it('un tag de modèle sur CE2-020, en plus de la référence de 5e → refus', async () => {
		await replayAfter(
			(client) => tag(client, 'CE2-020'),
			/usages déjà accrochés aux points à scinder : CE2-020 /
		);
	}, 60_000);

	it('un code neuf déjà pris → refus', async () => {
		await replayAfter(async (client) => {
			await client.query(
				`insert into public.curriculum_points
				   (code, name, kind, exigence, regime_acquisition, rubrique, grade, display_order, node_id)
				 select 'CE2-085', 'point de test', kind, exigence, regime_acquisition, rubrique, grade,
				        999, node_id
				   from public.curriculum_points where code = 'CE2-001'`
			);
		}, /codes neufs déjà pris : CE2-085/);
	}, 60_000);

	it('un libellé d’origine qui n’est plus l’attendu (scission déjà faite à la main) → refus', async () => {
		await replayAfter(async (client) => {
			await client.query(
				"update public.curriculum_points set name = 'autre libellé' where code = 'CE2-020'"
			);
		}, /points d'origine absents ou modifiés : .*CE2-020/);
	}, 60_000);

	it('un ordre d’affichage déjà troué dans un grade → refus', async () => {
		await replayAfter(async (client) => {
			await client.query(
				"update public.curriculum_points set display_order = 500 where code = 'CP-072'"
			);
		}, /ordre d'affichage pas en 1\.\.N avant la scission : CP/);
	}, 60_000);

	it('rollback : un point neuf qui a reçu un tag → refus lisible (pas de cascade silencieuse)', async () => {
		await rollbackAfter(
			(client) => tag(client, 'CE1-091'),
			/rollback : usages accrochés aux points neufs : .*CE1-091/
		);
	}, 60_000);

	it('rollback : un état élève sur un point neuf → refus (la cascade l’effacerait)', async () => {
		await rollbackAfter(async (client) => {
			const point = await pointId(client, 'CP-073');
			// Une ligne d'état élève fabriquée (élève de test, annulée avec la transaction).
			await client.query(
				'insert into public.student_point_state (student_id, point_id) values ($1, $2)',
				[studentId, point.id]
			);
		}, /rollback : usages accrochés aux points neufs : .*CP-073/);
	}, 60_000);

	it('rollback : une AUTRE référence d’automatisme sur CE2-084 → refus', async () => {
		await rollbackAfter(async (client) => {
			const point = await pointId(client, 'CE2-084');
			await client.query(
				"insert into public.curriculum_point_automatismes (point_id, grade) values ($1, '6')",
				[point.id]
			);
		}, /rollback : usages accrochés aux points neufs : CE2-084 /);
	}, 60_000);

	it('rollback : un libellé changé depuis la migration → refus', async () => {
		await rollbackAfter(async (client) => {
			await client.query(
				"update public.curriculum_points set name = 'autre libellé' where code = 'CE1-090'"
			);
		}, /rollback : points de la scission absents ou modifiés : .*CE1-090/);
	}, 60_000);
});

describe('Scission des points « tables » : la structure du fichier', () => {
	it('aucun contrôle de transaction hors commentaires', () => {
		expect(executableLines().filter((line) => TRANSACTION_CONTROL.test(line))).toEqual([]);
	});

	it('lock_timeout et gardes précèdent la première écriture publique (migration et rollback)', () => {
		const lines = executableLines();
		const firstWrite = lines.findIndex((line) => PUBLIC_WRITE.test(line));
		const guards = lines.findIndex((line) => line.includes('do $garde$'));
		const lock = lines.findIndex((line) => line.includes("set local lock_timeout = '5s';"));
		expect(firstWrite).toBeGreaterThan(0);
		expect(guards).toBeGreaterThan(-1);
		expect(lock).toBeGreaterThan(-1);
		expect(guards).toBeLessThan(firstWrite);
		expect(lock).toBeLessThan(firstWrite);

		const rollback = extractRollback(MIGRATION).split('\n');
		const rbWrite = rollback.findIndex((l) => PUBLIC_WRITE.test(l));
		const rbGuard = rollback.findIndex((l) => l.includes('do $rb_garde$'));
		const rbLock = rollback.findIndex((l) => l.includes("set local lock_timeout = '5s';"));
		expect(rbGuard).toBeGreaterThan(-1);
		expect(rbLock).toBeGreaterThan(-1);
		expect(rbGuard).toBeLessThan(rbWrite);
		expect(rbLock).toBeLessThan(rbWrite);
	});
});
