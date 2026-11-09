/**
 * Chantier « cours-suites » : nœud et tag des 30 questions de cours sur les suites, marqueur « question
 * de cours » sur les deux « Démontrer la somme… » (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261109224738_questions_1spe_cours_suites_rangement_tags` : les 30 brouillons
 * « Cours : … » créés le 2026-11-09 par scripts/create-questions.ts (sans nœud ni tag) vont sur le
 * nœud de leur point et reçoivent ce point, un seul (ADR 0020) ; les deux modèles publiés
 * « Démontrer la somme… » reçoivent `options.courseQuestion`. Phase 0 : journal
 * docs/wip/cours-suites-progress.md.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, sans nœud ni tag — puis rejoue la migration **depuis
 * son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent
 * actifs : chaque tag posé a passé la règle du nœud.
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
import { readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
	/** `options` des deux démonstrations, dans l'ordre de DEMONSTRATIONS */
	options: unknown[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261109224738_questions_1spe_cours_suites_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const SOMME_ARITHMETIQUE = 'Suites > Suites arithmétiques > somme des termes';
/** Le lot : identifiant créé en prod le 2026-11-09, nœud et point attendus. */
const LOT = [
	{
		id: '57129cb5-7c81-4e2c-b3a5-d55a12ea8b34',
		noeud: 'Suites > Généralités sur les suites > explicite ou par récurrence',
		code: '1SPE-211'
	}, // A1
	{
		id: 'cc4ceb8a-4757-4011-83bc-76a5fa1c9859',
		noeud: 'Suites > Généralités sur les suites > explicite ou par récurrence',
		code: '1SPE-368'
	}, // A2
	{
		id: '9f740496-6e16-4eb5-9205-08104ad1bb33',
		noeud: 'Suites > Généralités sur les suites > explicite ou par récurrence',
		code: '1SPE-368'
	}, // A3
	{
		id: 'a6932b68-3701-49e3-8e92-838051e48110',
		noeud: 'Suites > Généralités sur les suites > explicite ou par récurrence',
		code: '1SPE-212'
	}, // A4
	{
		id: 'cd169e7f-0d79-4893-82eb-68c7944bef7e',
		noeud: 'Suites > Suites arithmétiques > définition',
		code: '1SPE-213'
	}, // B5
	{
		id: '74333045-1969-4a61-85d2-6627e2956f3b',
		noeud: 'Suites > Suites arithmétiques > terme général',
		code: '1SPE-371'
	}, // B6
	{
		id: 'a9d3af96-8fe0-4571-a1f2-8922ae4aadf8',
		noeud: 'Suites > Suites arithmétiques > définition',
		code: '1SPE-213'
	}, // B7
	{
		id: '86db3cc4-5386-470f-9e49-a19792245c85',
		noeud: 'Suites > Suites arithmétiques > définition',
		code: '1SPE-213'
	}, // B8
	{
		id: '98962cae-001d-4b0a-af06-ea69703cf06d',
		noeud: 'Suites > Suites arithmétiques > définition',
		code: '1SPE-213'
	}, // B9
	{
		id: '24b7e5dc-4d78-4039-8e9e-24d4bffeed4d',
		noeud: 'Suites > Suites arithmétiques',
		code: '1SPE-228'
	}, // B10
	{
		id: '5dadd081-d6ba-4df6-be07-d42f4a27ade2',
		noeud: 'Suites > Suites arithmétiques',
		code: '1SPE-214'
	}, // B11
	{
		id: 'b0992067-bf43-4366-9869-4257a97266ae',
		noeud: 'Suites > Suites arithmétiques',
		code: '1SPE-372'
	}, // B12
	{
		id: '20ecab00-054c-4b8a-a68e-55755edafc03',
		noeud: 'Suites > Suites géométriques > définition',
		code: '1SPE-216'
	}, // C13
	{
		id: '5394f049-d2f5-4b46-a7e9-6e0c964c77f6',
		noeud: 'Suites > Suites géométriques > terme général',
		code: '1SPE-373'
	}, // C14
	{
		id: '6586e882-13d0-45f2-b445-a2fb20a5b701',
		noeud: 'Suites > Suites géométriques > définition',
		code: '1SPE-216'
	}, // C15
	{
		id: 'cd8ec0e7-d454-44ce-9139-9c4e0a7e9252',
		noeud: 'Suites > Suites géométriques',
		code: '1SPE-217'
	}, // C16
	{
		id: '93f113af-e4a5-4344-869d-94187669f345',
		noeud: 'Suites > Suites géométriques',
		code: '1SPE-229'
	}, // C17
	{
		id: '97088e3d-75fc-4936-bbf8-857227661b45',
		noeud: 'Suites > Suites géométriques',
		code: '1SPE-229'
	}, // C18
	{
		id: 'a43de156-28a4-4a65-90d9-97c5f2deee18',
		noeud: 'Suites > Suites géométriques > définition',
		code: '1SPE-216'
	}, // C19
	{
		id: '9bfe6c4c-a0b9-4590-9f3f-3115bc628741',
		noeud: 'Suites > Suites arithmétiques > somme des termes',
		code: '1SPE-215'
	}, // D20
	{
		id: '53facec2-c6a6-4d77-8880-74ca4d3d43df',
		noeud: 'Suites > Suites géométriques > somme des termes',
		code: '1SPE-218'
	}, // D21
	{
		id: 'e2743a04-3a87-4781-abae-4b402edb9b75',
		noeud: 'Suites > Suites arithmétiques > somme des termes',
		code: '1SPE-226'
	}, // D22a
	{
		id: '7f63ea6b-63dc-4123-a4dc-8cc6043d0942',
		noeud: 'Suites > Suites géométriques > somme des termes',
		code: '1SPE-227'
	}, // D22b
	{
		id: '252e85d9-3493-49b4-bc3b-6ca1462077e3',
		noeud: 'Suites > Suites arithmétiques > somme des termes',
		code: '1SPE-226'
	}, // D23
	{
		id: '9c19a6ab-ab08-4c50-b64e-6bbaa7f5cf08',
		noeud: 'Suites > Généralités sur les suites > sens de variation',
		code: '1SPE-219'
	}, // E26
	{
		id: '102fd5f2-5120-4aac-9217-2c383e4420e4',
		noeud: 'Suites > Généralités sur les suites > sens de variation',
		code: '1SPE-219'
	}, // E27
	{
		id: '947675fa-a17d-484c-94fa-c67f548816a6',
		noeud: 'Suites > Généralités sur les suites > sens de variation',
		code: '1SPE-219'
	}, // E28
	{
		id: '77cbab8d-affa-4240-89e3-c3ba81f3ec44',
		noeud: 'Suites > Généralités sur les suites > sens de variation',
		code: '1SPE-219'
	}, // E29
	{
		id: '43f277b2-0bbd-470f-93ce-357bc913e4f6',
		noeud: 'Suites > Limites de suites > définition',
		code: '1SPE-231'
	}, // F30
	{
		id: '958f5f05-e87d-443c-a976-da2072563c34',
		noeud: 'Suites > Limites de suites > définition',
		code: '1SPE-220'
	} // F31
];
/** « Démontrer la somme 1 + 2 + ⋯ + n » et « … 1 + q + ⋯ + qⁿ », publiés, `options` NULL en prod. */
const DEMONSTRATIONS = [
	'5fbb9a04-d4c3-4810-b717-075493df916b',
	'b554a47f-1b2e-4530-a979-44d785890adf'
];
const ids = LOT.map((m) => m.id);
const tousIds = [...ids, ...DEMONSTRATIONS];
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function cheminsVersIds(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
	return parChemin;
}

/** Pose l'état de la prod : les 30 brouillons sans nœud ni tag, les 2 démonstrations publiées. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: tousIds,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await cheminsVersIds(pg);
	await pg.query(
		`update public.question_templates set status = 'published', options = null, classification_node_id = $2
		  where id = any($1::uuid[])`,
		[DEMONSTRATIONS, parChemin.get(SOMME_ARITHMETIQUE)]
	);
	// Remettre la date fabriquée : la mise à jour ci-dessus l'a touchée (trigger).
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		'update public.question_templates set updated_at = $2::timestamptz where id = any($1::uuid[])',
		[DEMONSTRATIONS, AVANT]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[tousIds]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const o = await pg.query<{ id: string; options: unknown }>(
		'select id, options from public.question_templates where id = any($1::uuid[])',
		[DEMONSTRATIONS]
	);
	const g = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	const options = new Map(o.rows.map((r) => [r.id, r.options]));
	return {
		trigger: g.rows[0]?.tgenabled ?? '∅',
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		options: DEMONSTRATIONS.map((id) => options.get(id))
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Cours sur les suites : nœud, tag et marqueur (migration de données)', () => {
	let pg: Client;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('chaque modèle est EXACTEMENT sur le nœud prévu', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§1_SPE§${m.code}`).sort());
	});

	it('les deux démonstrations reçoivent le marqueur et gardent leur nœud', () => {
		expect(apres.options).toEqual([{ courseQuestion: true }, { courseQuestion: true }]);
		expect(DEMONSTRATIONS.map((id) => apres.noeuds.get(id))).toEqual([
			SOMME_ARITHMETIQUE,
			SOMME_ARITHMETIQUE
		]);
	});

	it('le trigger `updated_at` est de nouveau actif après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(tousIds.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect(annule.options).toEqual([null, null]);
		expect([...annule.dates.values()]).toEqual(tousIds.map(() => AVANT));
	});
});

describe('Cours sur les suites : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 29 modèle\(s\) sur 30/
			);
		});
	});

	it('TOUT ou RIEN : une démonstration manquante fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [DEMONSTRATIONS[1]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/démonstrations partiellement présentes : 1 modèle\(s\) sur 2/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = await cheminsVersIds(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle\(s\) déjà rangé\(s\) depuis le relevé : 1/
			);
		});
	});

	it('une démonstration repassée en brouillon fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				DEMONSTRATIONS[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/démonstration\(s\) changée\(s\) depuis le relevé \(statut ou marqueur\) : 1/
			);
		});
	});

	it('une démonstration déjà marquée à la main fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set options = '{"courseQuestion": false}' where id = $1`,
				[DEMONSTRATIONS[1]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/démonstration\(s\) changée\(s\) depuis le relevé \(statut ou marqueur\) : 1/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_SPE' and code = '1SPE-231' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('le rollback refuse si un tag a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[5]
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration/
			);
		});
	});
});
