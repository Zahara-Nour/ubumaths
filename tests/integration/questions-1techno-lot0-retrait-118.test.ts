/**
 * 1re techno, lot 0 : retrait de 1TECHNO-118 et de 1_TECHNO sur 2 modèles (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117140233_questions_1techno_lot0_retrait_118` : les modèles 1239554b et 79d69593
 * (1re spé, suite `u(n+1) = b·u(n) + c` à termes signés) perdent leur tag 1TECHNO-118 et le niveau
 * `1_TECHNO` ; f36ce3ff garde le point. Journal : docs/wip/questions-1techno-progress.md (§ 2.1, 7).
 *
 * Les modèles n'existent qu'en production. Le test fabrique l'état de la prod — copies minimales
 * portant les VRAIS identifiants, rangées sur le nœud du point 1TECHNO-118 (celui de 1SPE-377 en
 * prod), taguées 1SPE-377 et 1TECHNO-118 — puis rejoue la migration **depuis son fichier**, dans une
 * transaction annulée à la fin.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	statuts: Map<string, string>;
	/** Codes de points portés par chaque modèle, triés */
	points: Map<string, string[]>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117140233_questions_1techno_lot0_retrait_118.sql';
/** Le lot : les deux modèles qui perdent 1TECHNO-118. */
const LOT = ['1239554b-d442-4be6-8867-d9dc38311999', '79d69593-e815-496c-b429-637a1cd68b4d'];
/** Le modèle qui garde 1TECHNO-118. */
const GARDE = 'f36ce3ff-9ae5-435e-b6c2-affe0ad902ec';
const TOUS = [...LOT, GARDE];
const AVANT_POINTS = ['1SPE-377', '1TECHNO-118'];
/** Date de modification fabriquée : elle ne doit pas bouger (tags et niveaux ne sont pas du contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function sansTriggerDeDate(pg: Client, sql: string, params: unknown[]): Promise<void> {
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(sql, params);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

/** Pose l'état de la prod : 3 copies publiées, {1_SPE,1_TECHNO}, taguées 1SPE-377 et 1TECHNO-118. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: TOUS,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_SPE,1_TECHNO}', status = 'published',
		        classification_node_id = (select node_id from public.curriculum_points
		                                   where code = '1TECHNO-118' and archived_at is null)
		  where id = any($1::uuid[])`,
		[TOUS]
	);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select t.id, p.id from unnest($1::uuid[]) as t(id)
		   cross join public.curriculum_points p
		  where p.code = any($2::text[]) and p.archived_at is null`,
		[TOUS, AVANT_POINTS]
	);
	// Garde du décor : chaque copie porte bien les deux tags (sinon le test ne prouverait rien)
	const etat = await lireEtat(pg);
	for (const id of TOUS) {
		if (JSON.stringify(etat.points.get(id)) !== JSON.stringify(AVANT_POINTS)) {
			throw new Error(`décor faux : ${id} porte ${String(etat.points.get(id))}`);
		}
	}
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; grades: string[]; status: string; updated_at: Date }>(
		'select id, grades, status, updated_at from public.question_templates where id = any($1::uuid[])',
		[TOUS]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select t.template_id, p.code
		   from public.question_template_points t join public.curriculum_points p on p.id = t.point_id
		  where t.template_id = any($1::uuid[])
		  order by p.code`,
		[TOUS]
	);
	const points = new Map<string, string[]>(TOUS.map((id) => [id, []]));
	for (const r of t.rows) points.get(r.template_id)?.push(r.code);
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		points
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re techno lot 0 : retrait de 1TECHNO-118 sur 2 modèles (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		avant = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('le décor compte 3 modèles, tous {1_SPE,1_TECHNO}', () => {
		expect(avant.grades.size).toBe(3);
		expect(TOUS.map((id) => avant.grades.get(id))).toEqual(TOUS.map(() => ['1_SPE', '1_TECHNO']));
	});

	it('les 2 modèles du lot ne gardent que 1SPE-377 et le niveau 1_SPE', () => {
		expect(LOT.map((id) => apres.points.get(id))).toEqual([['1SPE-377'], ['1SPE-377']]);
		expect(LOT.map((id) => apres.grades.get(id))).toEqual([['1_SPE'], ['1_SPE']]);
	});

	it('le trigger de date est réactivé après la migration', async () => {
		await pg.query(readFileSync(MIGRATION, 'utf-8')).catch(() => undefined);
		const r = await pg.query<{ tgenabled: string }>(
			`select tgenabled from pg_trigger
			  where tgname = 'update_question_templates_updated_at'
			    and tgrelid = 'public.question_templates'::regclass`
		);
		expect(r.rows[0].tgenabled).toBe('O');
	});

	it('f36ce3ff garde 1TECHNO-118 et 1_TECHNO', () => {
		expect(apres.points.get(GARDE)).toEqual(AVANT_POINTS);
		expect(apres.grades.get(GARDE)).toEqual(['1_SPE', '1_TECHNO']);
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect([...apres.dates.values()]).toEqual(TOUS.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.points).toEqual(avant.points);
		expect(annule.grades).toEqual(avant.grades);
		expect([...annule.dates.values()]).toEqual(TOUS.map(() => AVANT));
	});
});

describe('1re techno lot 0 : les branches d’échec de la migration', () => {
	let pg: Client;
	let auteur: string;
	let eleve: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = (await TestData.profile().withRole('teacher').create()).id;
		// Créé hors transaction : la transaction du cas tient un verrou qui bloque le trigger de profil
		eleve = (await TestData.profile().withRole('student').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	async function enTransaction(corps: () => Promise<void>): Promise<void> {
		await pg.query('begin');
		try {
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('base sans les modèles (locale) : la migration et le rollback passent sans rien toucher', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [TOUS]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
			const r = await pg.query<{ n: string }>(
				'select count(*) as n from public.question_templates where id = any($1::uuid[])',
				[TOUS]
			);
			expect(Number(r.rows[0].n)).toBe(0);
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [LOT[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 1 modèle\(s\) sur 2/
			);
		});
	});

	it('un modèle sans 1_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[LOT[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 1_TECHNO absent : 1 sur 2 avec lui/
			);
		});
	});

	it('un modèle sans le tag 1TECHNO-118 fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where t.template_id = $1 and t.point_id = p.id and p.code = '1TECHNO-118'`,
				[LOT[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tag 1TECHNO-118 absent : 1 sur 2/
			);
		});
	});

	it('refuse si 1TECHNO-118 perdait son dernier modèle publié', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set status = 'draft' where id = $1`,
				[GARDE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/le point 1TECHNO-118 perdrait son dernier modèle publié/
			);
		});
	});

	it('une tentative d’élève sur le lot fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.skill_attempts (student_id, source, template_id, success) values ($1, 'auto', $2, true)`,
				[eleve, LOT[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/données d'élèves sur le lot : 1 tentative\(s\) ou carte\(s\)/
			);
		});
	});

	it('rollback refusé si un point 1TECHNO a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = '1TECHNO-118'`,
				[LOT[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : point 1TECHNO posé depuis la migration : 1239554b \(1TECHNO-118\)/
			);
		});
	});

	it('un autre niveau ajouté entre-temps (1_GEN) est conservé, au retrait comme au rollback', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_GEN'::text where id = $1`,
				[LOT[0]]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[LOT[0]]
			);
			expect(r.rows[0].grades).toEqual(['1_SPE', '1_GEN']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[LOT[0]]
			);
			expect(r2.rows[0].grades).toEqual(['1_SPE', '1_GEN', '1_TECHNO']);
		});
	});

	it('rollback refusé si 1_TECHNO a été reposé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[LOT[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1_TECHNO reposé depuis la migration : 1 sur 2 sans lui/
			);
		});
	});
});
