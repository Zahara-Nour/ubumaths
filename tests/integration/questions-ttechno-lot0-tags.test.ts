/**
 * Tle techno, lot 0 : tags TTECHNO sur 30 modèles publiés (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117145436_questions_ttechno_lot0_tags` : 30 modèles déjà publiés et rangés (1re
 * spé, 2de, terminale) reçoivent un point TTECHNO et le niveau `T_TECHNO` (ajouté, jamais affecté
 * en bloc). Journal : docs/wip/questions-ttechno-progress.md (§ 9).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, aux niveaux relevés, rangées sur le nœud du point visé
 * (le trigger des tags l'exige) — puis rejoue la migration **depuis son fichier**, dans une
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
	/** Codes TTECHNO portés par chaque modèle */
	pointsTt: Map<string, string[]>;
	/** Codes non TTECHNO portés par chaque modèle (ne doivent pas bouger) */
	autresPoints: Map<string, string[]>;
	/** Nombre de tags TTECHNO du lot */
	tagsTt: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117145436_questions_ttechno_lot0_tags.sql';
/** Le lot : identifiant de la prod, niveaux relevés le 2026-11-17, point TTECHNO visé. */
const LOT: [string, string[], string][] = [
	['0718f490-bfdd-4a62-b78f-b15753c27d8a', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['07ebdcbe-dc7c-45cf-ad81-df70231719a2', ['T_SPE', 'T_COMP'], 'TTECHNO-059'],
	['0af4bf32-b97e-493d-bea4-917b6bbdf6f2', ['1_SPE', '1_TECHNO', '1_GEN'], 'TTECHNO-024'],
	['1048e462-5585-4cf1-8915-2c6d7bf95244', ['2'], 'TTECHNO-048'],
	['2c116f4d-d7ef-4d8c-8114-9f113a983c4c', ['1_SPE'], 'TTECHNO-056'],
	['373fc5b4-63af-409d-a1b9-1320ae9b3b75', ['1_SPE', '1_TECHNO', '1_GEN'], 'TTECHNO-024'],
	['44b32cad-1803-4ff2-a649-4c502610b43c', ['1_SPE'], 'TTECHNO-026'],
	['5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', ['1_SPE', '1_TECHNO'], 'TTECHNO-055'],
	['65e96f31-31fe-4c2b-b894-e689b998b849', ['1_SPE', '1_TECHNO', '1_GEN'], 'TTECHNO-024'],
	['69a05f98-9dd9-4ce5-b23e-5376e85fbbaf', ['1_SPE'], 'TTECHNO-056'],
	['6dd2f133-e203-4cf6-a422-6a0e716203f3', ['1_SPE', '1_TECHNO'], 'TTECHNO-056'],
	['6fbc355c-aca7-4e2e-8a55-78b3a5722e17', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['7201f3b2-bb5c-4963-a6a6-f64cdeb6f111', ['1_SPE'], 'TTECHNO-046'],
	['8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['96be181c-6cd4-43e9-9291-1cd526955408', ['T_SPE'], 'TTECHNO-066'],
	['a29488bc-0a0b-4ac8-a799-3d87f9b43d55', ['T_SPE'], 'TTECHNO-062'],
	['a4b9281f-3e12-4ae3-a4b7-3ac02043f491', ['T_SPE'], 'TTECHNO-063'],
	['a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47', ['T_SPE', 'T_COMP'], 'TTECHNO-064'],
	['a9c71276-30e3-406f-8082-248cce389824', ['1_SPE'], 'TTECHNO-056'],
	['ad555cb1-c4a2-4390-ad14-6a626b39e0fb', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['b0a94f05-cd9d-437d-8481-79f619d3d2ac', ['2'], 'TTECHNO-047'],
	['bc59d5ce-a696-4460-91a3-ad8614de25a7', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['dbee4649-3ab6-49f0-8a5e-5814ce15ba43', ['T_SPE', 'T_COMP'], 'TTECHNO-058'],
	['e2908d60-2360-453c-a6e2-5c0318d8b9b2', ['1_SPE'], 'TTECHNO-046'],
	['e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', ['1_SPE', '1_TECHNO'], 'TTECHNO-077'],
	['e56be9b5-5189-48a6-aca9-4f7781ddcc51', ['T_SPE'], 'TTECHNO-065'],
	['e7cfe442-6653-4f97-a74e-08b8853d3305', ['1_SPE'], 'TTECHNO-027'],
	['eafd17a1-6e78-4bf3-932c-da806ac9d889', ['1_SPE', '1_TECHNO'], 'TTECHNO-068'],
	['ecf4d46b-02d5-4fd1-86db-eac7b017a257', ['T_SPE'], 'TTECHNO-056'],
	['ef807ee9-f95b-469a-a6a8-4232e933b4c6', ['1_SPE'], 'TTECHNO-026']
];
const ids = LOT.map(([id]) => id);
/** Modèle rangé, en prod, sur une sous-notion fille du nœud de son point (branche « notion »
 *  du trigger des tags) ; les autres sont sur le nœud même du point. */
const SUR_SOUS_NOTION = new Set(['e4eaaf16-407c-4a8b-9ba0-a93f28312fd6']);
/** Tag d'un autre programme porté en prod (1TECHNO-120 sur e4eaaf16) : il ne doit pas bouger. */
const AUTRE_TAG: [string, string] = ['e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', '1TECHNO-120'];
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

/** Pose l'état de la prod : copies publiées, aux niveaux relevés, rangées comme en prod. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	for (const [id, grades, code] of LOT) {
		const noeud = SUR_SOUS_NOTION.has(id)
			? `(select n.id from public.classification_nodes n
			     join public.curriculum_points p on p.node_id = n.parent_id
			    where p.code = $3 and p.archived_at is null and n.archived_at is null
			      and n.kind = 'subnotion'
			    order by n.position limit 1)`
			: '(select node_id from public.curriculum_points where code = $3 and archived_at is null)';
		await sansTriggerDeDate(
			pg,
			`update public.question_templates
			    set grades = $2, status = 'published', classification_node_id = ${noeud}
			  where id = $1`,
			[id, grades, code]
		);
	}
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where code = $2 and archived_at is null`,
		AUTRE_TAG
	);
	// Garde du décor : chaque copie est rangée (sinon le trigger refuserait pour une autre raison),
	// et celle de SUR_SOUS_NOTION l'est bien sur une sous-notion du nœud de son point.
	const r = await pg.query<{ ranges: string; sous: string }>(
		`select count(q.classification_node_id) as ranges,
		        count(*) filter (where n.kind = 'subnotion' and n.parent_id = p.node_id) as sous
		   from unnest($1::uuid[], $2::text[]) as l(id, code)
		   join public.question_templates q on q.id = l.id
		   left join public.classification_nodes n on n.id = q.classification_node_id
		   join public.curriculum_points p on p.code = l.code and p.archived_at is null`,
		[ids, LOT.map(([, , code]) => code)]
	);
	if (Number(r.rows[0].ranges) !== LOT.length || Number(r.rows[0].sous) !== SUR_SOUS_NOTION.size) {
		throw new Error('décor faux : copie non rangée, ou sous-notion introuvable sous un point');
	}
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; grades: string[]; status: string; updated_at: Date }>(
		'select id, grades, status, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; code: string; grade: string }>(
		`select t.template_id, p.code, p.grade
		   from public.question_template_points t join public.curriculum_points p on p.id = t.point_id
		  where t.template_id = any($1::uuid[])
		  order by p.code`,
		[ids]
	);
	const pointsTt = new Map<string, string[]>(ids.map((id) => [id, []]));
	const autresPoints = new Map<string, string[]>(ids.map((id) => [id, []]));
	for (const r of t.rows) {
		(r.grade === 'T_TECHNO' ? pointsTt : autresPoints).get(r.template_id)?.push(r.code);
	}
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		pointsTt,
		autresPoints,
		tagsTt: t.rows.filter((r) => r.grade === 'T_TECHNO').length
	};
}

function niveaux(etat: Etat): string[][] {
	return ids.map((id) => etat.grades.get(id) ?? []);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Tle techno lot 0 : tags TTECHNO sur 30 modèles publiés (migration de données)', () => {
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

	it('le lot compte 30 modèles (17 points), tous présents, sans tag TTECHNO au départ', () => {
		expect(new Set(ids).size).toBe(30);
		expect(new Set(LOT.map(([, , code]) => code)).size).toBe(17);
		expect(avant.grades.size).toBe(30);
		expect(avant.tagsTt).toBe(0);
	});

	it('chaque modèle porte EXACTEMENT son point TTECHNO visé', () => {
		expect(ids.map((id) => apres.pointsTt.get(id))).toEqual(LOT.map(([, , code]) => [code]));
		expect(apres.tagsTt).toBe(30);
	});

	it('les tags des autres programmes ne bougent pas', () => {
		// le décor en porte un (sinon on comparerait du vide à du vide)
		expect(avant.autresPoints.get(AUTRE_TAG[0])).toEqual([AUTRE_TAG[1]]);
		expect(apres.autresPoints).toEqual(avant.autresPoints);
		expect(annule.autresPoints).toEqual(avant.autresPoints);
	});

	it('chaque modèle a ses niveaux d’avant, plus T_TECHNO à la fin', () => {
		expect(niveaux(apres)).toEqual(LOT.map(([, grades]) => [...grades, 'T_TECHNO']));
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback retire les tags TTECHNO et T_TECHNO', () => {
		expect(annule.tagsTt).toBe(0);
		expect(niveaux(annule)).toEqual(LOT.map(([, grades]) => grades));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Tle techno lot 0 : les branches d’échec de la migration', () => {
	let pg: Client;
	let auteur: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = (await TestData.profile().withRole('teacher').create()).id;
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
			// `db:seed-riche` copie les modèles de la prod : on les retire pour avoir vraiment une base
			// sans eux (annulé avec la transaction)
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const tags = await pg.query<{ n: string }>(
				'select count(*) as n from public.question_template_points where template_id = any($1::uuid[])',
				[ids]
			);
			expect(Number(tags.rows[0].n)).toBe(0);
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 29 modèle\(s\) sur 30/
			);
		});
	});

	it('un modèle qui a déjà T_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || 'T_TECHNO'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau T_TECHNO déjà présent : 29 sur 30 sans T_TECHNO/
			);
		});
	});

	it('un modèle déjà tagué d’un point TTECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = 'TTECHNO-068'`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point TTECHNO : 0718f490 \(TTECHNO-068\)/
			);
		});
	});

	it('un autre niveau ajouté entre-temps (1_GEN) est conservé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_GEN'::text where id = $1`,
				[ids[0]]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r.rows[0].grades).toEqual(['1_SPE', '1_TECHNO', '1_GEN', 'T_TECHNO']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r2.rows[0].grades).toEqual(['1_SPE', '1_TECHNO', '1_GEN']);
		});
	});

	it('un point TTECHNO archivé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where code = 'TTECHNO-068'`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points TTECHNO introuvables : 16 sur 17/
			);
		});
	});

	it('rollback refusé si un tag a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where t.template_id = $1 and t.point_id = p.id and p.code = 'TTECHNO-068'`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 29 sur 30 présents/
			);
		});
	});

	it('rollback refusé si T_TECHNO a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, 'T_TECHNO') where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : T_TECHNO retiré depuis la migration : 29 sur 30 conformes/
			);
		});
	});
});
