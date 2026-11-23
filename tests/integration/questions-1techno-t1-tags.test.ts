/**
 * 1re techno, lot T1 : tags 1TECHNO sur 15 modèles publiés (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117122739_questions_1techno_t1_tags` : 15 modèles déjà publiés et rangés (1re spé,
 * 2de) reçoivent un point 1TECHNO et le niveau `1_TECHNO` (ajouté, jamais affecté en bloc).
 * Journal : docs/wip/questions-1techno-progress.md (§ 3, 7, 8).
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

const MIGRATION = 'supabase/migrations/20261117122739_questions_1techno_t1_tags.sql';
/** Le lot : identifiant de la prod, niveaux relevés le 2026-11-17, point 1TECHNO visé. */
const LOT: [string, string[], string][] = [
	['051ff81f-69df-475a-89d6-6eca7a225efa', ['1_SPE'], '1TECHNO-011'],
	['2ffa6d80-d62d-4de5-87f1-fcbb3fea7438', ['2'], '1TECHNO-005'],
	['344a2248-3f01-4b9e-8bd7-6fcb8537221a', ['1_SPE'], '1TECHNO-008'],
	['3cacefc5-59a1-498e-a453-fc25369110f9', ['2'], '1TECHNO-004'],
	['45da9678-f16d-4168-9e19-aefcd4197edb', ['1_SPE'], '1TECHNO-032'],
	['536c01bb-8401-4f53-b8ca-faf9bf4c243d', ['1_SPE'], '1TECHNO-001'],
	['5d17692b-397d-4de1-8629-fe5c5a5cc73b', ['1_SPE'], '1TECHNO-009'],
	['63849c41-cd39-4bd0-98e9-acba106f231e', ['1_SPE'], '1TECHNO-108'],
	['aeb1389d-0805-4421-9b25-1fcb4e4f4670', ['1_SPE'], '1TECHNO-142'],
	['d2943133-ebf7-424d-946a-8fed6cfa76be', ['1_SPE'], '1TECHNO-046'],
	['da04078f-0afb-4ca3-910e-45cb480e3b48', ['2'], '1TECHNO-006'],
	['de42b303-0c6b-4e54-9c1e-61d8a5d4fd6b', ['1_SPE'], '1TECHNO-010'],
	['e4eaaf16-407c-4a8b-9ba0-a93f28312fd6', ['1_SPE'], '1TECHNO-120'],
	['f3100c29-23bc-4bfe-b353-20f59d07371e', ['1_SPE'], '1TECHNO-142'],
	['fb3b536c-1ead-4863-85b2-a6104d949d50', ['1_SPE'], '1TECHNO-106']
];
const ids = LOT.map(([id]) => id);
/** Points dont le modèle est rangé, en prod, sur une sous-notion fille du nœud du point. */
const SUR_SOUS_NOTION = new Set(['1TECHNO-004', '1TECHNO-005', '1TECHNO-120']);
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
		// En prod, 3 modèles sont rangés sur une sous-notion fille du nœud du point (branche
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
	// Garde du décor : les 3 copies sont bien sur une sous-notion (sinon le test ne prouverait rien)
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
	if (Number(r.rows[0].n) !== SUR_SOUS_NOTION.size) {
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

function niveaux(etat: Etat): string[][] {
	return ids.map((id) => etat.grades.get(id) ?? []);
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re techno T1 : tags 1TECHNO sur 15 modèles publiés (migration de données)', () => {
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

	it('le lot compte 15 modèles, tous présents, sans tag au départ', () => {
		expect(new Set(ids).size).toBe(15);
		expect(avant.grades.size).toBe(15);
		expect(avant.tags).toBe(0);
	});

	it('chaque modèle porte EXACTEMENT son point 1TECHNO visé', () => {
		expect(ids.map((id) => apres.points1t.get(id))).toEqual(LOT.map(([, , code]) => [code]));
		expect(apres.tags).toBe(15);
	});

	it('chaque modèle a ses niveaux d’avant, plus 1_TECHNO à la fin', () => {
		expect(niveaux(apres)).toEqual(LOT.map(([, grades]) => [...grades, '1_TECHNO']));
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration retire les tags et 1_TECHNO', () => {
		expect(annule.tags).toBe(0);
		expect(niveaux(annule)).toEqual(LOT.map(([, grades]) => grades));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('1re techno T1 : les branches d’échec de la migration', () => {
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
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 14 modèle\(s\) sur 15/
			);
		});
	});

	it('un modèle qui a déjà 1_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 1_TECHNO déjà présent : 14 sur 15 sans lui/
			);
		});
	});

	it('un modèle déjà tagué d’un point 1TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = '1TECHNO-011'`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point 1TECHNO : 051ff81f \(1TECHNO-011\)/
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
				/rollback : 1_TECHNO retiré depuis la migration : 14 sur 15 conformes/
			);
		});
	});
});
