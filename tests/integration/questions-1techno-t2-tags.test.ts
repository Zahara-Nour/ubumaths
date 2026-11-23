/**
 * 1re techno, lot T2 : tags 1TECHNO sur 33 modèles publiés (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117131417_questions_1techno_t2_tags` : 33 modèles déjà publiés et rangés (1re spé,
 * 2de, 3e, terminale) reçoivent un point 1TECHNO et, s'il leur manque, le niveau `1_TECHNO` (ajouté,
 * jamais affecté en bloc ; 2 l'ont déjà). Journal : docs/wip/questions-1techno-progress.md (§ 9-11).
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
	/** Codes 1TECHNO portés par chaque modèle */
	points1t: Map<string, string[]>;
	/** Nombre total de tags du lot */
	tags: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117131417_questions_1techno_t2_tags.sql';
/** Le lot : identifiant de la prod, niveaux relevés le 2026-11-17 après la migration de questions-1gen
 *  (20261117124605 : 1_GEN ajouté à 6, retiré de 95ee57c8), point 1TECHNO visé. */
const LOT: [string, string[], string][] = [
	['03b3d9b3-2d38-4062-a70b-c9b31839444b', ['1_SPE'], '1TECHNO-076'],
	['21f42c7f-82bc-4204-b294-cb9658bcfd8e', ['1_SPE', '1_GEN'], '1TECHNO-089'],
	['286a68a8-49c1-4d7d-b845-452457e8dab8', ['1_SPE'], '1TECHNO-055'],
	['3020b065-2be5-4541-beda-1115718121c5', ['1_SPE'], '1TECHNO-068'],
	['3bd19f82-85f7-4828-8cac-2a2281642f86', ['1_SPE'], '1TECHNO-098'],
	['42bb2d66-4559-4a1b-8124-de6977fbb0b1', ['1_SPE', '1_GEN'], '1TECHNO-094'],
	['42c19a19-4533-4dc5-81a3-2dba70b5cdb4', ['2'], '1TECHNO-054'],
	['49fac266-f622-4ef5-8a2b-5638ca5a4c99', ['T_COMP'], '1TECHNO-083'],
	['4ce02817-c5b4-4500-9d0c-0bbf7be0a662', ['2'], '1TECHNO-007'],
	['4f8f420a-c93b-4d99-8fe2-acfac2d38cbe', ['1_SPE'], '1TECHNO-034'],
	['5397c20f-7b3a-4d56-b441-644607e0138a', ['1_SPE', '1_GEN', '1_TECHNO'], '1TECHNO-139'],
	['6ad254b4-69c3-49db-9541-fa921964cefc', ['3'], '1TECHNO-053'],
	['77498f1b-3625-4701-aa9c-f6132eb3b4ba', ['T_SPE', 'T_COMP'], '1TECHNO-100'],
	['7953dcfc-bedc-465e-9abe-b8db19647d7e', ['2'], '1TECHNO-102'],
	['8354a0e7-f707-48e0-ac3d-f43cc5b2e2fa', ['1_SPE'], '1TECHNO-096'],
	['8a384698-1367-4a12-a995-b6cd4df9cfe1', ['1_SPE'], '1TECHNO-060'],
	['8d46dd50-34ea-4504-b92f-d269a84f0179', ['2'], '1TECHNO-007'],
	['95ee57c8-4e16-4554-add5-cb8f72ee6f28', ['1_SPE', '1_TECHNO'], '1TECHNO-127'],
	['9c04693a-33f3-4c4c-bf1a-ff801b8b15c4', ['1_SPE'], '1TECHNO-098'],
	['9f072622-9ce5-4e76-b02e-a738bf6ea39a', ['1_SPE'], '1TECHNO-060'],
	['a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d', ['1_SPE'], '1TECHNO-129'],
	['a181f10b-1b9c-436c-8f8c-51cce68352db', ['1_SPE'], '1TECHNO-073'],
	['aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb', ['1_SPE', '1_GEN'], '1TECHNO-058'],
	['ad555cb1-c4a2-4390-ad14-6a626b39e0fb', ['1_SPE'], '1TECHNO-096'],
	['afe51ac4-8552-454e-b45e-46f0edbd9416', ['1_SPE', '1_GEN'], '1TECHNO-066'],
	['b7b0c27b-0c30-4297-b707-53f328d36f7a', ['1_SPE'], '1TECHNO-132'],
	['bc59d5ce-a696-4460-91a3-ad8614de25a7', ['1_SPE'], '1TECHNO-096'],
	['d1010214-1537-4b3d-9b99-1b3718a5d981', ['1_SPE'], '1TECHNO-047'],
	['d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', ['1_SPE', '1_GEN'], '1TECHNO-093'],
	['ddc60d24-ddce-473b-8e23-58af62ec8b78', ['2'], '1TECHNO-054'],
	['de73e71d-031b-4f9a-b3c9-a1cc6f970a0e', ['1_SPE'], '1TECHNO-055'],
	['e4784c78-13d5-49ac-b50b-b07efca03d19', ['2'], '1TECHNO-007'],
	['f2ed0ea0-e285-49fc-93df-9e388cc36eb0', ['1_SPE', '1_GEN'], '1TECHNO-093']
];
const ids = LOT.map(([id]) => id);
/** Un des 2 modèles qui ont déjà 1_TECHNO */
const DEJA_95EE = '95ee57c8-4e16-4554-add5-cb8f72ee6f28';
/** Points dont le modèle est rangé, en prod, sur une sous-notion fille du nœud du point. */
const SUR_SOUS_NOTION = new Set(['1TECHNO-007', '1TECHNO-054', '1TECHNO-058']);
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

/** Pose l'état de la prod : copies publiées, aux niveaux relevés, sur le nœud du point visé. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	for (const [id, grades, code] of LOT) {
		// En prod, 6 modèles (3 points) sont rangés sur une sous-notion fille du nœud du point (branche
		// « notion » du trigger des tags) ; les autres sur le nœud même du point.
		const noeud = SUR_SOUS_NOTION.has(code)
			? `(select n.id from public.classification_nodes n
			     join public.curriculum_points p on p.node_id = n.parent_id
			    where p.code = $3 and p.archived_at is null and n.archived_at is null
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
	// Garde du décor : les 6 copies sont bien sur une sous-notion (sinon le test ne prouverait rien)
	const r = await pg.query<{ n: string }>(
		`select count(*) as n
		   from unnest($1::uuid[], $2::text[]) as l(id, code)
		   join public.question_templates q on q.id = l.id
		   join public.classification_nodes n on n.id = q.classification_node_id
		   join public.curriculum_points p on p.code = l.code and p.archived_at is null
		  where n.kind = 'subnotion' and n.parent_id = p.node_id`,
		[
			LOT.filter(([, , code]) => SUR_SOUS_NOTION.has(code)).map(([id]) => id),
			LOT.filter(([, , code]) => SUR_SOUS_NOTION.has(code)).map(([, , code]) => code)
		]
	);
	if (Number(r.rows[0].n) !== LOT.filter(([, , code]) => SUR_SOUS_NOTION.has(code)).length) {
		throw new Error('décor faux : sous-notion introuvable sous le nœud d’un point');
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
		  where t.template_id = any($1::uuid[])`,
		[ids]
	);
	const points1t = new Map<string, string[]>(ids.map((id) => [id, []]));
	for (const r of t.rows) {
		if (r.grade === '1_TECHNO') points1t.get(r.template_id)?.push(r.code);
	}
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		points1t,
		tags: t.rows.length
	};
}

/** Niveaux attendus après la migration : `1_TECHNO` ajouté à la fin s'il manquait */
function avecTechno(grades: string[]): string[] {
	return grades.includes('1_TECHNO') ? grades : [...grades, '1_TECHNO'];
}

function niveaux(etat: Etat): string[][] {
	return ids.map((id) => etat.grades.get(id) ?? []);
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re techno T2 : tags 1TECHNO sur 33 modèles publiés (migration de données)', () => {
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

	it('le lot compte 33 modèles (24 points), tous présents, sans tag au départ', () => {
		expect(new Set(ids).size).toBe(33);
		expect(new Set(LOT.map(([, , code]) => code)).size).toBe(24);
		expect(avant.grades.size).toBe(33);
		expect(avant.tags).toBe(0);
	});

	it('chaque modèle porte EXACTEMENT son point 1TECHNO visé', () => {
		expect(ids.map((id) => apres.points1t.get(id))).toEqual(LOT.map(([, , code]) => [code]));
		expect(apres.tags).toBe(33);
	});

	it('chaque modèle a ses niveaux d’avant, plus 1_TECHNO à la fin s’il lui manquait', () => {
		expect(niveaux(apres)).toEqual(LOT.map(([, grades]) => avecTechno(grades)));
		// les 2 qui l'avaient déjà ne l'ont pas en double
		expect(LOT.filter(([, grades]) => grades.includes('1_TECHNO')).length).toBe(2);
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback retire les tags et 1_TECHNO, sauf là où il était déjà', () => {
		expect(annule.tags).toBe(0);
		expect(niveaux(annule)).toEqual(LOT.map(([, grades]) => grades));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('1re techno T2 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 32 modèle\(s\) sur 33/
			);
		});
	});

	it('un modèle qui a déjà 1_TECHNO, hors relevé, fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 1_TECHNO différent du relevé : 32 sur 33 conformes/
			);
		});
	});

	it('un modèle qui a perdu 1_TECHNO depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[DEJA_95EE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 1_TECHNO différent du relevé : 32 sur 33 conformes/
			);
		});
	});

	it('un modèle déjà tagué d’un point 1TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = '1TECHNO-076'`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point 1TECHNO : 03b3d9b3 \(1TECHNO-076\)/
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
			expect(r.rows[0].grades).toEqual(['1_SPE', '1_GEN', '1_TECHNO']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r2.rows[0].grades).toEqual(['1_SPE', '1_GEN']);
		});
	});

	it('rollback refusé si 1_TECHNO a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1_TECHNO retiré depuis la migration : 32 sur 33 conformes/
			);
		});
	});
});
