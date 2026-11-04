/**
 * Chantier « questions-1spe-demonstrations », lot 5 (approfondissements, suites) : sous-notions,
 * nœud et tags (Supabase local requis)
 * ==================================================================================================
 *
 * Migration `20261103233226_questions_1spe_approfondissements_5_rangement_tags` : deux sous-notions
 * neuves (« sommes de termes » sous Généralités sur les suites, « emprunt » sous Modèles
 * d'évolution) ; les 4 brouillons du lot 5, créés le 2026-11-04 par scripts/create-questions.ts
 * (sans nœud ni tag), vont sur leur sous-notion et reçoivent leur point (1SPE-240, 241, 381, 242).
 * Décisions de David du 2026-11-04 (journal docs/wip/questions-1spe-demonstrations-progress.md
 * § 9 D3, § 10 D4).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en [1_SPE], sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud (point sur le nœud ou sa notion).
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
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261103233226_questions_1spe_approfondissements_5_rangement_tags.sql';
const NEUVES = [
	'Suites > Généralités sur les suites > sommes de termes',
	"Suites > Modèles d'évolution > emprunt"
];
/** Le lot : identifiant créé en prod le 2026-11-04, nœud et point attendus (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{
		id: '77a5b60b-d501-4648-b3a6-91443c2384b9',
		noeud: 'Suites > Généralités sur les suites > explicite ou par récurrence',
		points: ['1_SPE§1SPE-240']
	},
	{
		id: '96d19805-a14f-474d-aa4c-5309c7af0afd',
		noeud: 'Suites > Généralités sur les suites > sommes de termes',
		points: ['1_SPE§1SPE-241']
	},
	{
		id: '9eac8754-d19d-4d55-bcda-8c50d1bc09e7',
		noeud: 'Suites > Généralités sur les suites > sommes de termes',
		points: ['1_SPE§1SPE-381']
	},
	{
		id: '061e83b5-1d07-4edd-a87b-53bcb5ec0fd9',
		noeud: "Suites > Modèles d'évolution > emprunt",
		points: ['1_SPE§1SPE-242']
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle hors du lot, posé sur une sous-notion neuve pour éprouver la garde du rollback. */
const INTRUS = '00000000-0000-4000-8000-0000000001a5';

// ============================================================================
// FONCTIONS
// ============================================================================

async function cheminsActifs(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/**
 * La base de la CI (et une base locale à jour) porte déjà cette migration : les sous-notions
 * existent. On retrouve l'état d'avant par son rollback (sans les modèles, il ne touche qu'elles).
 */
async function defaireSiAppliquee(pg: Client): Promise<void> {
	if ((await cheminsActifs(pg)).has(NEUVES[0])) await pg.query(extractRollback(MIGRATION));
}

/** Pose l'état de la prod : les copies des modèles, en [1_SPE], sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await defaireSiAppliquee(pg);
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['1_SPE'], classification_node_id = null
		  where id = any($1::uuid[])`,
		[ids]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	const sousNotions: string[] = [];
	for (const [id, node] of await readNodePaths(pg)) {
		chemins.set(id, node.path);
		if (!node.archived && node.path.split(' > ').length === 3) sousNotions.push(node.path);
	}
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re spé, approfondissements lot 5 : sous-notions, nœud et tags (migration de données)', () => {
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

	it('les deux sous-notions neuves sont créées, une fois chacune, et rien d’autre', () => {
		for (const c of NEUVES) expect(avant.chemins).not.toContain(c);
		expect(apres.chemins).toEqual([...avant.chemins, ...NEUVES].sort());
	});

	it('chaque modèle est EXACTEMENT sur sa sous-notion', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.flatMap((m) => m.points.map((p) => `${m.id}§${p}`)).sort());
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud, sans tag, sans sous-notion neuve)', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(annule.chemins).toEqual(avant.chemins);
	});
});

describe('1re spé, approfondissements lot 5 : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration crée les sous-notions et passe', async () => {
		await enTransaction(async () => {
			await defaireSiAppliquee(pg);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const chemins = await cheminsActifs(pg);
			for (const c of NEUVES) expect(chemins.has(c)).toBe(true);
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 3 modèle\(s\) sur 4/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], chemins.get('Suites > Généralités sur les suites > explicite ou par récurrence')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('une sous-notion déjà créée à la main (autre casse) fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const notion = (await cheminsActifs(pg)).get("Suites > Modèles d'évolution");
			await pg.query(
				`insert into public.classification_nodes (kind, parent_id, name, position)
				 values ('subnotion', $1, 'Emprunt', 99)`,
				[notion]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/sous-notions déjà présentes : 1/
			);
		});
	});

	it('un point du lot archivé (1SPE-240) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = '1_SPE' and code = '1SPE-240' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('rollback refusé si une sous-notion neuve porte un modèle hors du lot', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await insertProdCopies(pg, {
				templateIds: [INTRUS],
				exerciseIds: [],
				authorId: auteur,
				timestamp: AVANT
			});
			const sn = (await cheminsActifs(pg)).get(NEUVES[0]);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[INTRUS, sn]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/une sous-notion neuve porte autre chose que les modèles du lot/
			);
		});
	});
});
