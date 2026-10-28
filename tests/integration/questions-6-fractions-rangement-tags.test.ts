/**
 * Chantier « questions-6 », lot 4 « Fractions » : nœud et tag de 10 brouillons, 3 modèles de 5e passés en 6e (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261028140100_questions_6_fractions_rangement_tags` : les 10 brouillons de 6e créés
 * le 2026-10-28 par scripts/create-questions.ts (sans nœud ni tag) vont sur le nœud de leur point
 * (sous-notion, ou notion pour 6-137) et reçoivent ce point, un seul (ADR 0020) ; 3 modèles publiés
 * de 5e, déjà sur le nœud de 6-131, passent en 6e et reçoivent 6-131. Décisions de David
 * (journal docs/wip/questions-6-progress.md § 11).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, aux niveaux, nœud et statut relevés, sans tag — puis
 * rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers
 * de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
	grades: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261028140100_questions_6_fractions_rangement_tags.sql';
const SENS = 'Nombres et calculs > Fractions : sens et écritures';
const CALCULS = 'Nombres et calculs > Fractions : calculs';
const QUANTITE = `${CALCULS} > fraction d'une quantité`;
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant en prod, nœud et point attendus, état relevé le 2026-10-28. */
const LOT: { id: string; noeud: string; code: string; de5e?: true }[] = [
	{ id: '5077e030-ab90-4660-91a7-25cb48281445', noeud: `${SENS} > forme décimale`, code: '6-130' },
	{ id: 'c9c3a8a3-575a-4d8d-b278-cc22d348f274', noeud: QUANTITE, code: '6-131' },
	{
		id: '378aa770-4d92-4c21-aa2f-05d8f9cc4fb4',
		noeud: `${CALCULS} > multiplication`,
		code: '6-136'
	},
	{ id: 'afebbb91-4d08-46f0-8640-77fe4e6f4e62', noeud: `${SENS} > ordre`, code: '6-133' },
	{ id: '7ff1ac44-8099-472a-b688-a331f91be9c5', noeud: `${SENS} > ordre`, code: '6-203' },
	{ id: '83c835bb-5534-4b1a-afc2-2d3430622f9e', noeud: `${SENS} > ordre`, code: '6-134' },
	{ id: 'c360d588-3e4f-4ea5-8d27-1f671fe47bcd', noeud: `${SENS} > ordre`, code: '6-204' },
	{
		id: 'ddf5d292-d792-41d9-9136-2018e73cff9d',
		noeud: `${CALCULS} > addition et soustraction`,
		code: '6-205'
	},
	// 6-137 vit sur la NOTION (pas de sous-notion)
	{ id: '5cd25c2b-1def-492c-a81f-998255ea4f1d', noeud: CALCULS, code: '6-137' },
	{
		id: 'c99be374-4d52-4a9c-bcd4-03b71f45f717',
		noeud: `${CALCULS} > addition et soustraction`,
		code: '6-135'
	},
	// Publiés de 5e, déjà sur le nœud de 6-131
	{ id: '0be55013-6c7d-447b-98f4-bdfa574ad506', noeud: QUANTITE, code: '6-131', de5e: true },
	{ id: '9293eb9a-8b9a-43c1-b6bf-d2f71134dd44', noeud: QUANTITE, code: '6-131', de5e: true },
	{ id: '8ffdbdb1-4688-47d6-89c1-f3c33e147311', noeud: QUANTITE, code: '6-131', de5e: true }
];
const ids = LOT.map((m) => m.id);
const ids5e = LOT.filter((m) => m.de5e).map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger, taguer, changer de niveau ne touchent pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : brouillons en 6e sans nœud ; publiés de 5e sur le nœud de 6-131 ; aucun tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['6'] where id = any($1::uuid[])`,
		[ids]
	);
	await pg.query(
		`update public.question_templates set grades = array['5'], status = 'published', classification_node_id = $2
		  where id = any($1::uuid[])`,
		[ids5e, parChemin.get(QUANTITE)]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; grades: string[]; updated_at: Date }>(
		'select id, classification_node_id as node, grades, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades.join(',')])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 6e, lot 4 « Fractions » : nœud, niveau et tag (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur le nœud de son point', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§6§${m.code}`).sort());
	});

	it('les 13 modèles sont en 6e, les 3 de 5e compris', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map(() => '6'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(
			LOT.map((m) => (m.de5e ? QUANTITE : '∅'))
		);
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => (m.de5e ? '5' : '6')));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 6e, lot 4 « Fractions » : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 12 modèle\(s\) sur 13/
			);
		});
	});

	it('un brouillon rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles rangés ou déplacés depuis le relevé : 1/
			);
		});
	});

	it('un modèle de 5e déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids5e[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles rangés ou déplacés depuis le relevé : 1/
			);
		});
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['6'] where id = $1`, [
				ids5e[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un statut changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	it('un modèle de 5e tagué à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '6' and code = '6-131' and archived_at is null`,
				[ids5e[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà tagués depuis le relevé : 1 tag\(s\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '6' and code = '6-203' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
