/**
 * Fin de l'ancienne forme : thème / domaine / sous-domaine et catégorie retirés, `items` — (Supabase local requis)
 * ===============================================================================================================
 *
 * Migration `20261104224856_automaths_fin_ancienne_forme` (ADR 0035, lot 4b du chantier
 * automaths-arbre). Le test lit l'état de la base locale APRÈS la migration (colonnes, index,
 * contrainte, sous-titre des modèles dans `resources`, verrou de série), puis, dans une
 * transaction annulée à la fin : joue le rollback écrit en commentaire, vérifie les refus TOUT ou
 * RIEN (ancienne ligne de série, de séance, modèle publié sans nœud) et rejoue la migration
 * depuis son fichier.
 *
 * L'accès par la vue (élève, anon, brouillons) reste prouvé par resources-view-search.test.ts ;
 * le lien de partage de cours par class-course-share-token.test.ts ; le verrou de série par
 * series-evaluations.test.ts (A7) — tous sur la colonne `items`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// TYPES
// ============================================================================

interface Chemin {
	branche: string;
	notion: string;
	sousNotion: string;
	notionId: string;
	sousNotionId: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261104224856_automaths_fin_ancienne_forme.sql';
/** Titre fabriqué : aucun modèle local ne le porte */
const TITRE = 'itest fin ancienne forme 4b';

// ============================================================================
// FONCTIONS
// ============================================================================

async function colonnes(pg: Client, table: string): Promise<string[]> {
	const r = await pg.query<{ column_name: string }>(
		`select column_name from information_schema.columns
		  where table_schema = 'public' and table_name = $1 order by column_name`,
		[table]
	);
	return r.rows.map((x) => x.column_name);
}

/** Une sous-notion non archivée et ses parents, lus dans l'arbre local */
async function lireChemin(pg: Client): Promise<Chemin> {
	const r = await pg.query<Chemin>(
		`select b.name as branche, n.name as notion, s.name as "sousNotion",
		        n.id as "notionId", s.id as "sousNotionId"
		   from public.classification_nodes s
		   join public.classification_nodes n on n.id = s.parent_id
		   join public.classification_nodes b on b.id = n.parent_id
		  where s.kind = 'subnotion' and s.archived_at is null and b.parent_id is null
		  order by s.name limit 1`
	);
	if (r.rows.length !== 1) throw new Error('arbre local vide : aucune sous-notion');
	return r.rows[0];
}

async function insererModele(
	pg: Client,
	auteur: string,
	noeud: string | null,
	status: 'published' | 'draft'
): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.question_templates (type, grades, classification_node_id, level, variations, status, title, created_by)
		 values ('numerical_exact', array['6'], $1, 1, '[{}]'::jsonb, $2, $3, $4) returning id`,
		[noeud, status, TITRE, auteur]
	);
	return r.rows[0].id;
}

async function sousTitre(pg: Client, id: string): Promise<string | null> {
	const r = await pg.query<{ subtitle: string | null }>(
		`select subtitle from public.resources where kind = 'question' and id = $1`,
		[id]
	);
	if (r.rows.length !== 1) throw new Error(`modèle ${id} absent de resources`);
	return r.rows[0].subtitle;
}

/** Joue `sql` dans un savepoint annulé ; rend le message d'erreur, ou « accepté » */
async function essayer(pg: Client, sql: string, params: unknown[] = []): Promise<string> {
	await pg.query('savepoint essai');
	const issue = await pg.query(sql, params).then(
		() => 'accepté',
		(e: unknown) => (e instanceof Error ? e.message : String(e))
	);
	await pg.query('rollback to savepoint essai');
	return issue;
}

// ============================================================================
// SUITE
// ============================================================================

describe("Fin de l'ancienne forme (lot 4b) : état de la base après la migration", () => {
	let pg: Client;
	let prof: string;
	let eleve: string;
	let chemin: Chemin;
	const modeles: Record<'sousNotion' | 'notion' | 'sansNoeud', string> = {
		sousNotion: '',
		notion: '',
		sansNoeud: ''
	};

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = (await TestData.profile().withRole('teacher').create()).id;
		eleve = (await TestData.profile().withRole('student').create()).id;
		pg = await getPostgresClient();
		await pg.query('begin');
		chemin = await lireChemin(pg);
		modeles.sousNotion = await insererModele(pg, prof, chemin.sousNotionId, 'published');
		modeles.notion = await insererModele(pg, prof, chemin.notionId, 'published');
		modeles.sansNoeud = await insererModele(pg, prof, null, 'draft');
	});

	afterAll(async () => {
		await pg?.query('rollback');
		await cleanupAllTestData();
	});

	it('les modèles n’ont plus de thème, domaine ni sous-domaine ; les tentatives plus de catégorie', async () => {
		const modele = await colonnes(pg, 'question_templates');
		expect(modele).not.toContain('theme');
		expect(modele).not.toContain('domain');
		expect(modele).not.toContain('subdomain');
		expect(modele).toContain('classification_node_id');
		expect(await colonnes(pg, 'evaluation_attempt_questions')).not.toContain('category_key');
	});

	it('les index de catégorie, dont l’index unique, ont disparu', async () => {
		const r = await pg.query<{ indexname: string }>(
			`select indexname from pg_indexes
			  where schemaname = 'public' and indexname = any($1::text[])`,
			[
				[
					'idx_question_templates_unique_category',
					'idx_question_templates_categories',
					'idx_question_templates_theme',
					'idx_question_templates_domain',
					'idx_question_templates_subdomain'
				]
			]
		);
		expect(r.rows).toEqual([]);
	});

	it('séries et séances portent `items`, plus `categories`', async () => {
		for (const table of ['series', 'test_sessions']) {
			const c = await colonnes(pg, table);
			expect(c).toContain('items');
			expect(c).not.toContain('categories');
		}
	});

	it('une série sans ligne reste refusée (contrainte renommée series_items_non_empty)', async () => {
		const issue = await essayer(
			pg,
			`insert into public.series (title, grade, items, created_by) values ('vide', '6', '[]'::jsonb, $1)`,
			[prof]
		);
		expect(issue).toContain('series_items_non_empty');
	});

	it('le verrou de série lit `items` : modifier les lignes d’une série commencée est refusé', async () => {
		const serie = await pg.query<{ id: string }>(
			`insert into public.series (title, grade, items, created_by) values ('verrou 4b', '6', $1::jsonb, $2) returning id`,
			[JSON.stringify([{ templateId: modeles.sousNotion, quantity: 2, delay: 10 }]), prof]
		);
		const ev = await pg.query<{ id: string }>(
			`insert into public.evaluations (series_id, form, created_by) values ($1, 'interactive', $2) returning id`,
			[serie.rows[0].id, prof]
		);
		await pg.query(
			`insert into public.test_sessions (user_id, mode, items, total_questions, evaluation_id)
			 values ($1, 'interactive', $2::jsonb, 2, $3)`,
			[
				eleve,
				JSON.stringify([{ templateId: modeles.sousNotion, quantity: 2, delay: 10 }]),
				ev.rows[0].id
			]
		);

		expect(
			await essayer(pg, `update public.series set items = $1::jsonb where id = $2`, [
				JSON.stringify([{ templateId: modeles.notion, quantity: 1, delay: 5 }]),
				serie.rows[0].id
			])
		).toContain('Série verrouillée');
		// Contenu inchangé (date seule) : accepté
		expect(
			await essayer(pg, `update public.series set updated_at = now() where id = $1`, [
				serie.rows[0].id
			])
		).toBe('accepté');
	});

	it('Q17 A : le sous-titre d’un modèle est son chemin dans l’arbre', async () => {
		expect(await sousTitre(pg, modeles.sousNotion)).toBe(
			`${chemin.branche} · ${chemin.notion} · ${chemin.sousNotion}`
		);
		expect(await sousTitre(pg, modeles.notion)).toBe(`${chemin.branche} · ${chemin.notion}`);
		expect(await sousTitre(pg, modeles.sansNoeud)).toBeNull();
	});

	it('la recherche trouve un modèle par son sous-titre (nom de la sous-notion)', async () => {
		const r = await pg.query<{ id: string }>(
			`select id from public.search_resources($1, array['question'], null, null, 50)`,
			[chemin.sousNotion]
		);
		expect(r.rows.map((x) => x.id)).toContain(modeles.sousNotion);
	});

	it('la vue reste en security_invoker (elle n’ouvre aucun accès)', async () => {
		const r = await pg.query<{ reloptions: string[] | null }>(
			`select reloptions from pg_class where oid = 'public.resources'::regclass`
		);
		expect(r.rows[0].reloptions).toContain('security_invoker=true');
	});

	describe('rollback puis migration rejouée (transaction annulée)', () => {
		let apresRollback: {
			modele: string[];
			series: string[];
			sousTitre: string | null;
			partage: string;
		};
		let refus: Record<'serie' | 'seance' | 'sansNoeud', string>;
		let apresRejeu: { modele: string[]; series: string[]; sousTitre: string | null };

		beforeAll(async () => {
			await pg.query('savepoint avant_rollback');
			await pg.query(extractRollback(MIGRATION));
			await pg.query(
				`update public.question_templates set theme = 'T', domain = 'D', subdomain = 'S' where id = $1`,
				[modeles.sousNotion]
			);
			apresRollback = {
				modele: await colonnes(pg, 'question_templates'),
				series: await colonnes(pg, 'series'),
				sousTitre: await sousTitre(pg, modeles.sousNotion),
				partage: (
					await pg.query<{ prosrc: string }>(
						`select prosrc from pg_proc where proname = 'get_class_course_by_share_token'`
					)
				).rows[0].prosrc
			};

			// La base locale porte des modèles publiés sans nœud laissés par d'autres suites : la
			// migration, TOUT ou RIEN, les refuserait. Repassés en brouillon (transaction annulée).
			await pg.query(
				`update public.question_templates set status = 'draft'
				  where status = 'published' and classification_node_id is null`
			);

			// Le verrou relit `categories` après le rollback
			await pg.query(`update public.series set categories = categories where title = 'verrou 4b'`);

			refus = {
				serie: await essayer(
					pg,
					`insert into public.series (title, grade, categories, created_by)
					 values ('ancienne', '6', '[{"category": {"theme": "T", "domain": "D", "level": 1}, "quantity": 1, "delay": 5}]'::jsonb, $1);
					 ${readFileSync(MIGRATION, 'utf-8')}`.replace('$1', `'${prof}'`)
				),
				seance: await essayer(
					pg,
					`insert into public.test_sessions (user_id, mode, categories, total_questions)
					 values ('${eleve}', 'interactive', '[{"category": "entiers/1", "quantity": 1}]'::jsonb, 1);
					 ${readFileSync(MIGRATION, 'utf-8')}`
				),
				sansNoeud: await essayer(
					pg,
					`update public.question_templates set status = 'published' where id = '${modeles.sansNoeud}';
					 ${readFileSync(MIGRATION, 'utf-8')}`
				)
			};

			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			apresRejeu = {
				modele: await colonnes(pg, 'question_templates'),
				series: await colonnes(pg, 'series'),
				sousTitre: await sousTitre(pg, modeles.sousNotion)
			};
			await pg.query('rollback to savepoint avant_rollback');
		});

		it('le rollback rend les colonnes (vides) et le nom `categories`, le sous-titre d’avant', () => {
			expect(apresRollback.modele).toEqual(
				expect.arrayContaining(['theme', 'domain', 'subdomain'])
			);
			expect(apresRollback.series).toContain('categories');
			expect(apresRollback.series).not.toContain('items');
			expect(apresRollback.sousTitre).toBe('T · D · S');
			// La fonction du cours partagé relit `categories` et rend de nouveau la clé `categories`
			expect(apresRollback.partage).toContain('s.categories as series_categories');
			expect(apresRollback.partage).toContain("'categories', sp.series_categories");
			expect(apresRollback.partage).not.toContain('s.items');
		});

		it('TOUT ou RIEN : une ancienne ligne de série ou de séance, un modèle publié sans nœud → refus', () => {
			expect(refus.serie).toContain("fin de l'ancienne forme refusée : 1 ligne(s) de série");
			expect(refus.seance).toContain('et 1 de séance');
			expect(refus.sansNoeud).toContain('1 modèle(s) publié(s) sans nœud');
		});

		it('rejouée après le rollback, la migration rend le même état', () => {
			expect(apresRejeu.modele).not.toContain('theme');
			expect(apresRejeu.series).toContain('items');
			expect(apresRejeu.sousTitre).toBe(
				`${chemin.branche} · ${chemin.notion} · ${chemin.sousNotion}`
			);
		});
	});
});
