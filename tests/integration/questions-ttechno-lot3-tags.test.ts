/**
 * Tle techno, lot 3 : tags TTECHNO sur 6 modèles publiés de 1re générale (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261118052320_questions_ttechno_lot3_tags` : 6 modèles déjà publiés et rangés,
 * écrits par `questions-1gen` (aˣ, taux moyen), reçoivent un point TTECHNO et le niveau `T_TECHNO`
 * (ajouté, jamais affecté en bloc). Journal : docs/wip/questions-ttechno-progress.md (§ 20).
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

const MIGRATION = 'supabase/migrations/20261118052320_questions_ttechno_lot3_tags.sql';
/** Le lot : identifiant de la prod, niveaux relevés le 2026-11-18, point TTECHNO visé. */
const LOT: [string, string[], string][] = [
	['065eea60-1d6d-4404-9015-f4624e661ab2', ['1_GEN'], 'TTECHNO-033'],
	['2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c', ['1_GEN'], 'TTECHNO-032'],
	['60971c9a-82e7-4ed5-a18a-7520b40c38b2', ['1_GEN'], 'TTECHNO-081'],
	['a439df84-9d32-4138-bbc1-cf846616e0ca', ['1_GEN'], 'TTECHNO-035'],
	['e4e65a69-2710-45d1-9592-1edd100d9067', ['1_GEN'], 'TTECHNO-031'],
	['f84e23a3-36c0-4cb0-801f-3807134f307d', ['1_GEN'], 'TTECHNO-038']
];
const ids = LOT.map(([id]) => id);
/** Modèles rangés, en prod, sur une sous-notion fille du nœud de leur point : aucun (les 6 sont
 *  sur le nœud même de leur point, relevé MCP du 2026-11-18). */
const SUR_SOUS_NOTION = new Set<string>();
/** Tags 1GEN portés en prod par les 6 modèles (posés par questions-1gen) : ils ne doivent pas bouger. */
const AUTRES_TAGS: [string, string][] = [
	['065eea60-1d6d-4404-9015-f4624e661ab2', '1GEN-035'],
	['2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c', '1GEN-034'],
	['60971c9a-82e7-4ed5-a18a-7520b40c38b2', '1GEN-033'],
	['a439df84-9d32-4138-bbc1-cf846616e0ca', '1GEN-037'],
	['e4e65a69-2710-45d1-9592-1edd100d9067', '1GEN-032'],
	['f84e23a3-36c0-4cb0-801f-3807134f307d', '1GEN-040']
];
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
	for (const tag of AUTRES_TAGS) {
		await pg.query(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, id from public.curriculum_points where code = $2 and archived_at is null`,
			tag
		);
	}
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

describe('Tle techno lot 3 : tags TTECHNO sur 6 modèles publiés de 1re générale (migration de données)', () => {
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

	it('le lot compte 6 modèles (6 points), tous présents, sans tag TTECHNO au départ', () => {
		expect(new Set(ids).size).toBe(6);
		expect(new Set(LOT.map(([, , code]) => code)).size).toBe(6);
		expect(avant.grades.size).toBe(6);
		expect(avant.tagsTt).toBe(0);
	});

	it('chaque modèle porte EXACTEMENT son point TTECHNO visé', () => {
		expect(ids.map((id) => apres.pointsTt.get(id))).toEqual(LOT.map(([, , code]) => [code]));
		expect(apres.tagsTt).toBe(6);
	});

	it('les tags des autres programmes ne bougent pas', () => {
		// le décor porte les 6 tags 1GEN (sinon on comparerait du vide à du vide)
		for (const [id, code] of AUTRES_TAGS) expect(avant.autresPoints.get(id)).toEqual([code]);
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

describe('Tle techno lot 3 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 5 modèle\(s\) sur 6/
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
				/niveau T_TECHNO déjà présent : 5 sur 6 sans T_TECHNO/
			);
		});
	});

	it('un modèle déjà tagué d’un point TTECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = 'TTECHNO-033'`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point TTECHNO : 065eea60 \(TTECHNO-033\)/
			);
		});
	});

	it('un autre niveau ajouté entre-temps (1_TECHNO) est conservé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[ids[0]]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r.rows[0].grades).toEqual(['1_GEN', '1_TECHNO', 'T_TECHNO']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r2.rows[0].grades).toEqual(['1_GEN', '1_TECHNO']);
		});
	});

	it('un point TTECHNO archivé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where code = 'TTECHNO-033'`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points TTECHNO introuvables : 5 sur 6/
			);
		});
	});

	it('rollback refusé si un tag a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where t.template_id = $1 and t.point_id = p.id and p.code = 'TTECHNO-033'`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 5 sur 6 présents/
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
				/rollback : T_TECHNO retiré depuis la migration : 5 sur 6 conformes/
			);
		});
	});
});
